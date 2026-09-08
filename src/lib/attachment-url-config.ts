/**
 * Configuration for server-minted attachment URLs.
 *
 * Off unless `--enable-attachment-urls` is passed. When it is on, every setting
 * below is validated here, at startup: a half-configured signing feature that
 * fails per-request gives the operator a stream of unexplained fetch errors,
 * while a missing key discovered at startup names itself once, in the place
 * that can be fixed.
 */

import { readFileSync } from 'node:fs';

export interface AttachmentUrlConfig {
  /** Origin the minted URL points at, e.g. `http://m365-max-mcp:3000`. */
  readonly base: string;
  readonly key: string;
  readonly keyId: string;
  readonly ttlSeconds: number;
}

/** Fixed route the minted URL targets. The ticket travels in the query. */
export const ATTACHMENT_ROUTE = '/attachment';

/**
 * Default ticket lifetime. Two minutes: long enough for an agent to hand the
 * URL to a sidecar and for that sidecar to fetch it, short enough that a URL
 * captured from a transcript is dead by the time anyone reads the transcript.
 *
 * **This must not exceed the verifying sidecar's own max-TTL** (docglean's
 * `_MAX_TTL_S`, default 300), which refuses a signature whose expiry is further
 * out than that even when it otherwise verifies. Raising this past the sidecar's
 * limit produces a URL that this server considers valid and the sidecar refuses,
 * with no error text connecting the two.
 */
const DEFAULT_TTL_SECONDS = 120;

/**
 * Upper bound on the configurable TTL, set to the verifying sidecar's own
 * default max-TTL rather than to a round number.
 *
 * This was 3600, which made the documented maximum a value at which the feature
 * is 100% non-functional: docglean's `verify()` refuses any signature whose
 * expiry is further out than its `_MAX_TTL_S` (default 300) plus `_CLOCK_SKEW_S`
 * (5), so measured against a default-configured origin, 305 passes and 306 is
 * refused. Allowing a caller to configure twelve times that offered nothing but
 * a silent failure whose cause is in another codebase.
 *
 * A deployment that has raised the sidecar's own `_MAX_TTL_S` can raise this in
 * the same change; both sides have to agree, and the tighter of the two wins.
 */
const MAX_TTL_SECONDS = 300;

export class AttachmentUrlConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentUrlConfigError';
  }
}

/**
 * The exact character set Python's argument-less `str.strip()` removes.
 *
 * `String.prototype.trim()` is not the same set and the differences are both
 * reachable and silent. `trim()` removes U+FEFF (a BOM, which plenty of editors
 * write) and Python does not; Python removes U+001C-U+001F and U+0085 (NEL) and
 * `trim()` does not. Either way the two sides derive different key bytes from
 * the same file and every signature is refused with no diagnostic — and U+0085
 * slips past the control-character check below, since it is not < 0x20.
 */
const PYTHON_WHITESPACE = '\t\n\v\f\r   ' + '           ' + '    　';

function pythonStrip(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && PYTHON_WHITESPACE.includes(value[start])) start += 1;
  while (end > start && PYTHON_WHITESPACE.includes(value[end - 1])) end -= 1;
  return value.slice(start, end);
}

function readKey(env: Record<string, string | undefined>): string {
  const keyFile = env.MS365_MCP_ATTACHMENT_URL_KEY_FILE;
  if (keyFile) {
    try {
      // Stripped so a key file written with a trailing newline -- which every
      // ordinary editor and `echo` produces -- signs the same bytes the sidecar
      // reads, since docglean's `_KEY_FILE` strips too. `pythonStrip` rather
      // than `.trim()` because the two sets differ; see its docstring.
      return pythonStrip(readFileSync(keyFile, 'utf8'));
    } catch {
      // The path, never the contents: a read error carrying file bytes would
      // put the key in the log that reports the failure.
      throw new AttachmentUrlConfigError(
        `MS365_MCP_ATTACHMENT_URL_KEY_FILE could not be read: ${keyFile}`
      );
    }
  }
  return env.MS365_MCP_ATTACHMENT_URL_KEY ?? '';
}

/**
 * Build the config, or throw naming what is missing.
 *
 * Returns null only when the feature is switched off, so a caller that has
 * checked the flag can treat null as a bug rather than as "not configured".
 */
export function loadAttachmentUrlConfig(
  enabled: boolean,
  env: Record<string, string | undefined> = process.env
): AttachmentUrlConfig | null {
  if (!enabled) return null;

  const base = env.MS365_MCP_ATTACHMENT_URL_BASE ?? '';
  if (!base) {
    throw new AttachmentUrlConfigError(
      '--enable-attachment-urls requires MS365_MCP_ATTACHMENT_URL_BASE (the origin a ' +
        'document-conversion sidecar will fetch, e.g. http://m365-mcp:3000). This is ' +
        'deliberately not MS365_MCP_PUBLIC_URL: that one is browser-facing for OAuth, ' +
        'while this is reached server-to-server and is commonly a container address. ' +
        'With --attachment-port, name that port here, not the --http one: the route is ' +
        'not served on the MCP port at all in that mode.'
    );
  }
  let parsedBase: URL;
  try {
    parsedBase = new URL(base);
  } catch {
    throw new AttachmentUrlConfigError(
      `MS365_MCP_ATTACHMENT_URL_BASE is not a valid absolute URL: ${base}`
    );
  }
  if (parsedBase.protocol !== 'http:' && parsedBase.protocol !== 'https:') {
    throw new AttachmentUrlConfigError(
      `MS365_MCP_ATTACHMENT_URL_BASE must be http or https, got ${parsedBase.protocol}`
    );
  }
  // An IPv6 literal cannot be signed compatibly. WHATWG normalises some
  // literals into a different spelling than the one written (`[::ffff:127.0.0.1]`
  // becomes `::ffff:7f00:1`) while the verifier's Python preserves the original,
  // so the two canonical strings differ on the host line and every minted URL is
  // refused. Refused here, where the message can say so, rather than at the far
  // end as an unexplained `blocked_host` on every fetch. Use a hostname.
  if (parsedBase.hostname.startsWith('[')) {
    throw new AttachmentUrlConfigError(
      'MS365_MCP_ATTACHMENT_URL_BASE must not be an IPv6 literal: the URL signature ' +
        'covers the host, and this runtime and the verifying sidecar normalise IPv6 ' +
        'spellings differently, so every minted URL would be refused. Use a hostname ' +
        `(a container or service name) instead of ${parsedBase.hostname}.`
    );
  }
  if (parsedBase.search || parsedBase.hash) {
    // The query is signed, and the minted URL builds its own. A base carrying
    // one would either be dropped (confusing) or merged (ambiguous).
    throw new AttachmentUrlConfigError(
      'MS365_MCP_ATTACHMENT_URL_BASE must not carry a query string or fragment.'
    );
  }

  const key = readKey(env);
  if (!key) {
    throw new AttachmentUrlConfigError(
      '--enable-attachment-urls requires MS365_MCP_ATTACHMENT_URL_KEY or ' +
        'MS365_MCP_ATTACHMENT_URL_KEY_FILE -- the HMAC key shared with the sidecar that ' +
        'will verify the minted URL.'
    );
  }
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      // Offset only. The value is the secret and must not reach the message.
      throw new AttachmentUrlConfigError(
        `The attachment URL signing key contains a control character at offset ${index} ` +
          '(value not shown).'
      );
    }
  }

  const keyId = env.MS365_MCP_ATTACHMENT_URL_KEY_ID || '1';

  const ttlRaw = env.MS365_MCP_ATTACHMENT_URL_TTL_S;
  let ttlSeconds = DEFAULT_TTL_SECONDS;
  if (ttlRaw !== undefined && ttlRaw !== '') {
    // Rejects '12abc' and '' alike; Number() alone would accept whitespace and
    // parseInt alone would accept a trailing suffix.
    if (!/^\d+$/.test(ttlRaw)) {
      throw new AttachmentUrlConfigError(
        `MS365_MCP_ATTACHMENT_URL_TTL_S must be a positive integer, got ${JSON.stringify(ttlRaw)}`
      );
    }
    ttlSeconds = Number(ttlRaw);
    if (ttlSeconds <= 0 || ttlSeconds > MAX_TTL_SECONDS) {
      throw new AttachmentUrlConfigError(
        `MS365_MCP_ATTACHMENT_URL_TTL_S must be between 1 and ${MAX_TTL_SECONDS}, got ${ttlSeconds}`
      );
    }
  }

  return {
    base: parsedBase.origin,
    key,
    keyId,
    ttlSeconds,
  };
}

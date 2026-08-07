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

/** Upper bound on the configurable TTL. See the coupling note above. */
const MAX_TTL_SECONDS = 3600;

export class AttachmentUrlConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentUrlConfigError';
  }
}

function readKey(env: Record<string, string | undefined>): string {
  const keyFile = env.MS365_MCP_ATTACHMENT_URL_KEY_FILE;
  if (keyFile) {
    try {
      // `.trim()` so a key file written with a trailing newline -- which every
      // ordinary editor and `echo` produces -- signs the same bytes the sidecar
      // reads, since docglean's `_KEY_FILE` strips too. Without it the two
      // disagree silently and every signature is refused.
      return readFileSync(keyFile, 'utf8').trim();
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
        'while this is reached server-to-server and is commonly a container address.'
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

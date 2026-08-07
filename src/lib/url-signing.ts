/**
 * Mints the `dgk`/`dgx`/`dgs` query signature that a document-conversion
 * sidecar verifies before it will dial a private address.
 *
 * THIS FILE IS A PORT. Its counterpart is `signing.py` in docglean-mcp
 * (`canonical_string` / `sign_url`), which is the normative wire-format
 * reference. A signature this file mints is worthless unless it reproduces
 * that function byte for byte, so every deviation from the obvious JavaScript
 * spelling below exists because the obvious spelling disagrees with Python.
 * The three that matter:
 *
 *   1. `encodeURIComponent` leaves `!*'()` unescaped. Python's
 *      `quote(s, safe='')` escapes them -- its safe set is exactly
 *      `A-Za-z0-9_.-~`. A ticket containing any of those five characters
 *      would sign here and fail to verify there.
 *   2. `parse_qsl` turns `+` into a space *before* percent-decoding. A query
 *      value carrying a literal `+` therefore canonicalises as a space on the
 *      Python side, and must here too.
 *   3. Python sorts `(name, value)` tuples by code point. JavaScript's default
 *      string comparison is by UTF-16 code unit, which orders a supplementary
 *      character (surrogate pair, D800-DBFF) *below* U+E000-U+FFFF instead of
 *      above. `compareByCodePoint` below closes that.
 *
 * Residual, stated rather than hidden: on a *malformed* percent-escape the two
 * runtimes can disagree on how many U+FFFD replacement characters they emit,
 * because Python's `unquote(errors='replace')` and WHATWG's TextDecoder split
 * invalid UTF-8 into replacement characters by different rules. Nothing this
 * server mints can reach that case -- ticket ids are `[A-Za-z0-9_-]` and carry
 * no percent-escapes at all -- but a caller signing a hand-built URL with
 * broken escapes could, and it would present as a signature that verifies
 * locally and is refused by the sidecar.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Python's `urllib.parse.quote(s, safe='')` -- safe set is `A-Za-z0-9_.-~`. */
export function quoteAll(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((byte) => {
      const char = String.fromCharCode(byte);
      if (/[A-Za-z0-9_.\-~]/.test(char)) return char;
      return '%' + byte.toString(16).toUpperCase().padStart(2, '0');
    })
    .join('');
}

/**
 * Python's `unquote(s, errors='replace')` after `s.replace('+', ' ')`.
 *
 * Decodes percent-escapes to bytes and the surrounding literal text to UTF-8
 * bytes, then decodes the whole byte run once -- decoding each escape in
 * isolation would turn a legitimate multi-byte UTF-8 sequence (`%C3%A9`) into
 * two replacement characters.
 */
export function unquotePlus(value: string): string {
  const withSpaces = value.replace(/\+/g, ' ');
  const bytes: number[] = [];
  for (let i = 0; i < withSpaces.length; i += 1) {
    const char = withSpaces[i];
    if (char === '%' && /^[0-9A-Fa-f]{2}$/.test(withSpaces.slice(i + 1, i + 3))) {
      bytes.push(parseInt(withSpaces.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    // A stray `%` (or one followed by non-hex) is literal in Python too.
    for (const byte of new TextEncoder().encode(char)) bytes.push(byte);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
}

/** Code-point ordering, matching Python's `str` comparison. See note 3 above. */
export function compareByCodePoint(a: string, b: string): number {
  const left = Array.from(a);
  const right = Array.from(b);
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i += 1) {
    const diff = left[i].codePointAt(0)! - right[i].codePointAt(0)!;
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

/** The three reserved parameter names, matched exactly -- never by a `dg` prefix. */
const RESERVED_PARAMS = new Set(['dgk', 'dgx', 'dgs']);

/**
 * Python's `parse_qsl(query, keep_blank_values=True)`.
 *
 * Empty segments are skipped; a segment with no `=` yields an empty value
 * rather than being dropped.
 */
export function parseQsl(query: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const field of query.split('&')) {
    if (!field) continue;
    const eq = field.indexOf('=');
    const rawName = eq === -1 ? field : field.slice(0, eq);
    const rawValue = eq === -1 ? '' : field.slice(eq + 1);
    pairs.push([unquotePlus(rawName), unquotePlus(rawValue)]);
  }
  return pairs;
}

function canonicalQuery(query: string): string {
  const pairs = parseQsl(query).filter(([name]) => !RESERVED_PARAMS.has(name));
  pairs.sort((a, b) => compareByCodePoint(a[0], b[0]) || compareByCodePoint(a[1], b[1]));
  return pairs.map(([name, value]) => `${quoteAll(name)}=${quoteAll(value)}`).join('&');
}

/**
 * The `v1` canonical signing string. Mirror of docglean's `canonical_string`.
 *
 * `expiry` is signed as its own line rather than folded into the query, so the
 * same function serves minting (before `dgk`/`dgs` exist on the URL) and
 * verification (after they do).
 */
export function canonicalString(url: string, expiry: string): string {
  const parsed = new URL(url);
  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  // `URL.hostname` keeps the brackets off an IPv6 literal and is already
  // lowercased; `.port` is '' when the URL used the scheme default.
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port === '' ? (scheme === 'https' ? 443 : 80) : Number(parsed.port);
  const path = parsed.pathname === '' ? '/' : parsed.pathname;
  const query = canonicalQuery(parsed.search.replace(/^\?/, ''));
  return ['v1', scheme, host, String(port), path, query, expiry].join('\n');
}

/** base64url, `=` padding stripped -- matching docglean's `_digest`. */
export function digest(key: string, message: string): string {
  return createHmac('sha256', Buffer.from(key, 'utf8'))
    .update(Buffer.from(message, 'utf8'))
    .digest('base64url');
}

export interface SigningConfig {
  key: string;
  keyId: string;
  ttlSeconds: number;
}

/**
 * Append `dgk`/`dgx`/`dgs` to `url`.
 *
 * Any pre-existing reserved parameter is dropped rather than kept, so a caller
 * cannot smuggle a second `dgs` past the signature -- the same rule docglean's
 * `sign_url` follows.
 */
export function signUrl(url: string, config: SigningConfig, nowMs: number = Date.now()): string {
  const expiry = String(Math.floor(nowMs / 1000) + config.ttlSeconds);
  const signature = digest(config.key, canonicalString(url, expiry));
  const parsed = new URL(url);
  const kept = parseQsl(parsed.search.replace(/^\?/, '')).filter(
    ([name]) => !RESERVED_PARAMS.has(name)
  );
  kept.push(['dgk', config.keyId], ['dgx', expiry], ['dgs', signature]);
  parsed.search = kept.map(([name, value]) => `${quoteAll(name)}=${quoteAll(value)}`).join('&');
  return parsed.toString();
}

/** Constant-time compare of two ticket ids. Length is not itself a secret. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

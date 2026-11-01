/**
 * Fills in the Content-Type header Graph requires on a $batch sub-request that
 * carries a body.
 *
 * Graph rejects such a sub-request outright, and it is a batch-level validation
 * failure, so the outer call 400s and nothing in the batch runs - one forgotten
 * header loses all 20 requests. GET sub-requests need no header, so graph-batch
 * reads fine and then fails on the caller's first write (#677). The
 * single-request write tools all set the header themselves; this gives
 * graph-batch the same behaviour.
 *
 * Keyed on the body, not on a method allowlist, which is how the spec words it:
 * "When the body is supplied, a Content-Type header must be included". GET and
 * DELETE are skipped because OData forbids a body on either, so anything we
 * added would describe a payload Graph is about to reject for another reason.
 *
 * Deliberately not covered:
 *  - A bodyless write. Graph rejects those too and the docs answer them with an
 *    empty body, but fabricating one turns a batch Graph refuses into one that
 *    runs: a bodyless replyAll whose `comment` was meant to be there would send
 *    an empty reply-all, and accept/decline would respond for real. Losing the
 *    batch is the better failure, so the caller sends their own `body: {}`.
 *  - A string body (base64 or text/* as often as it is JSON, and typing it
 *    wrong swaps Graph's precise complaint for a parse error), a nested $batch
 *    (forbidden by OData, so there is nothing to recurse into) and any
 *    sub-request whose method we would have to guess.
 *
 * A header the caller set always wins, whatever its casing. Note that filling
 * one sub-request re-serializes the whole payload, so a batch that arrived as a
 * raw JSON string loses number literals JSON.parse cannot hold (above 2^53) and
 * duplicate keys. The signoff gate already does this whenever it is configured,
 * and any batch that arrived as an object was parsed by the transport long
 * before us.
 *
 * Sits at the outbound chokepoint (GraphClient.performRequest) after the
 * signoff gate: the gate has to judge the caller's own payload.
 */

import logger from '../logger.js';

type JsonObject = Record<string, unknown>;

const JSON_CONTENT_TYPE = 'application/json';
// OData: "A body MUST NOT be specified if the method is get or delete."
const NEVER_HAS_BODY = new Set(['GET', 'DELETE']);

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasContentType(headers: JsonObject): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');
}

/** The sub-request with the header filled in, or the entry untouched. */
function fillSubRequest(entry: unknown): unknown {
  if (!isPlainObject(entry)) return entry;

  // A body implies a write but not which verb, and guessing it is the judgment
  // call this module doesn't make.
  if (typeof entry.method !== 'string') return entry;
  if (NEVER_HAS_BODY.has(entry.method.toUpperCase())) return entry;

  // OData: a null body is "equivalent to not specifying the body name/value pair"
  if (!isPlainObject(entry.body)) return entry;

  // Extend the caller's own headers key rather than adding a lowercase one
  // beside it: Graph matches these names case-insensitively, so a second key
  // could take precedence over a `Headers` that carries If-Match or
  // workbook-session-id and quietly drop it.
  const headerKeys = Object.keys(entry).filter((key) => key.toLowerCase() === 'headers');
  if (headerKeys.length > 1) return entry;
  const headersKey = headerKeys[0] ?? 'headers';

  const headers = entry[headersKey];
  // Not something we can extend - leave it and let Graph report it
  if (headers !== undefined && !isPlainObject(headers)) return entry;
  if (headers && hasContentType(headers)) return entry;

  return { ...entry, [headersKey]: { ...headers, 'Content-Type': JSON_CONTENT_TYPE } };
}

/** Query-stripped, version-stripped path, so the /$batch check can be exact. */
function normalizePath(path: string): string {
  let clean = path.split('?')[0].replace(/^\/(?:v1\.0|beta)(?=\/)/, '');
  if (!clean.startsWith('/')) clean = `/${clean}`;
  // Matches the signoff gate's own normalization, so one cannot see a /$batch
  // the other misses.
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean;
}

function subRequestLabel(entry: unknown, index: number): string {
  const id = isPlainObject(entry) ? entry.id : undefined;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : `index ${index}`;
}

/**
 * Fill in the Content-Type on each write sub-request of an outgoing $batch
 * body. Returns the body to send, re-serialized only when something changed.
 * Anything that is not a JSON batch payload passes through untouched - this is
 * a convenience, not a gate, so a malformed body still reaches Graph and gets
 * Graph's own error.
 */
export function applyBatchContentType(
  method: string,
  path: string,
  body: string | Buffer | Uint8Array | undefined
): string | Buffer | Uint8Array | undefined {
  if (typeof body !== 'string') return body;
  if (method.toUpperCase() !== 'POST' || normalizePath(path) !== '/$batch') return body;

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return body;
  }
  if (!isPlainObject(payload) || !Array.isArray(payload.requests)) return body;

  const original = payload.requests;
  const requests = original.map(fillSubRequest);

  const filled = original
    .map((entry, index) => (requests[index] === entry ? undefined : subRequestLabel(entry, index)))
    .filter((label): label is string => label !== undefined);
  if (filled.length === 0) return body;

  logger.info(`Filled in missing $batch Content-Type for sub-request(s): ${filled.join(', ')}`);
  return JSON.stringify({ ...payload, requests });
}

// Log descriptions that carry operational metadata only. Tool parameters,
// request bodies, query strings and upstream error messages can hold the text
// of a user's mail, calendar or files; none of that belongs in a log file or a
// console stream that a platform collects. These helpers describe the shape
// of a value (keys, types, sizes) instead of its content.

const MAX_KEYS = 40;

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `string(${value.length})`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') return `object(${Object.keys(value as object).length} keys)`;
  return typeof value;
}

/** `{top: 10, filter: string(42), body: object(3 keys)}` — never the strings themselves. */
export function describeShape(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return describeValue(value);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const shown = entries.slice(0, MAX_KEYS).map(([k, v]) => `${k}: ${describeValue(v)}`);
  if (entries.length > MAX_KEYS) shown.push(`… +${entries.length - MAX_KEYS} more`);
  return `{${shown.join(', ')}}`;
}

/** Byte length of a value as it would be serialized, or -1 if it cannot be. */
export function serializedSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '');
  } catch {
    return -1;
  }
}

/** The URL or path without its query string, plus the names of the query parameters. */
export function describeUrl(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return url;
  const names = new Set<string>();
  for (const part of url.slice(q + 1).split('&')) {
    const name = part.split('=')[0];
    if (name) names.add(decodeURIComponent(name));
  }
  return `${url.slice(0, q)} [query: ${[...names].join(', ')}]`;
}

/** `GraphApiError status=400 code=BadRequest` — the message is left out: a Graph error echoes the request. */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const e = error as Error & {
    code?: string | number;
    status?: string | number;
    httpStatus?: number;
    graphErrorCode?: string;
  };
  const parts = [e.name || 'Error'];
  if (e.httpStatus !== undefined) parts.push(`status=${e.httpStatus}`);
  else if (e.status !== undefined) parts.push(`status=${e.status}`);
  if (e.graphErrorCode) parts.push(`code=${e.graphErrorCode}`);
  else if (e.code !== undefined) parts.push(`code=${e.code}`);
  return parts.join(' ');
}

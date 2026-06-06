import { createHash } from 'node:crypto';

const FORBIDDEN_KEY_PATTERNS = [
  /token/i,
  /authorization/i,
  /cookie/i,
  /secret/i,
  /password/i,
  /subject/i,
  /body/i,
  /content/i,
  /recipient/i,
  /toRecipients/i,
  /ccRecipients/i,
  /bccRecipients/i,
  /from/i,
  /sender/i,
  /displayName/i,
  /userPrincipalName/i,
  /mail/i,
  /email/i,
  /webUrl/i,
  /downloadUrl/i,
  /nextLink/i,
  /@odata\.nextLink/i,
  /fileName/i,
  /name/i,
];

const URL_PATTERN = /\b(?:https?:\/\/|www\.|[a-z][a-z0-9+.-]*:\/\/)[^\s"']+/gi;
const UPN_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const MAX_STRING = 300;
const MAX_ARRAY = 50;
const MAX_KEYS = 80;
const MAX_DEPTH = 6;

export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => nested !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(',')}}`;
}

export function sha256Hex(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function byteLength(value: unknown): number {
  return Buffer.byteLength(stableStringify(value), 'utf8');
}

export function sanitizeMessage(message: unknown): string {
  const text = String(message ?? '');
  const noUrls = text
    .replace(URL_PATTERN, '[redacted:url]')
    .replace(UPN_PATTERN, '[redacted:identity]');
  return noUrls.length > MAX_STRING ? `${noUrls.slice(0, MAX_STRING)}…` : noUrls;
}

function keyAllowed(key: string): boolean {
  if (key === 'id' || key === '@odata.id') return true;
  if (key === 'text') return false;
  return !FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function resultIdPrefix(resultId: string): string {
  return sha256Hex(resultId).slice(0, 12);
}

export function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[truncated:max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeMessage(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value.slice(0, MAX_ARRAY).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== 'object') return sanitizeMessage(value);

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) {
    if (!keyAllowed(key)) continue;
    output[key] = sanitizeValue(nested, depth + 1);
  }
  return output;
}

export function safeIdsPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map(safeIdsPayload);
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  if (typeof record.id === 'string' || typeof record.id === 'number') output.id = record.id;
  if (Array.isArray(record.value)) {
    output.value = record.value
      .map((item) => (typeof item === 'object' && item !== null ? safeIdsPayload(item) : undefined))
      .filter(Boolean);
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

export function sanitizeErrorCode(code: unknown, fallback = 'graph_item_failed'): string {
  return typeof code === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(code) ? code : fallback;
}

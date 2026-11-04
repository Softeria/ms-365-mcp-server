// An Accept header value a caller may set: printable ASCII (an RFC 9110 field value
// without obs-text), no leading or trailing space, bounded. It rules out CR, LF and NUL,
// so no second header can be smuggled in, while wildcards, lists and parameters
// (*/*, text/*, text/plain; charset=utf-8) stay valid. The empty string also matches:
// callers treat it as unset. Shared by every caller-settable Accept.
export const ACCEPT_VALUE_PATTERN = /^(?:[\x21-\x7E](?:[\x20-\x7E]*[\x21-\x7E])?)?$/;
export const ACCEPT_VALUE_MAX_LENGTH = 256;
export const ACCEPT_VALUE_ERROR = `Accept must be a printable header value of at most ${ACCEPT_VALUE_MAX_LENGTH} characters, e.g. text/vtt.`;

export function isAcceptValue(value: string): boolean {
  return value.length <= ACCEPT_VALUE_MAX_LENGTH && ACCEPT_VALUE_PATTERN.test(value);
}

// JSON-schema form of the same rule, for schemas published outside zod.
export const ACCEPT_VALUE_JSON_SCHEMA = {
  type: 'string',
  pattern: ACCEPT_VALUE_PATTERN.source,
  maxLength: ACCEPT_VALUE_MAX_LENGTH,
} as const;

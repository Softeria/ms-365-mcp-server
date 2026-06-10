/**
 * Opt-in redaction of sensitive material from log output.
 *
 * Error messages bubbled up from upstream libraries (MSAL, fetch, the Graph
 * SDK) routinely interpolate request URLs, Authorization headers, and token
 * payloads into their message strings. When those land in a log file or the
 * console they expose bearer/refresh tokens and user identifiers. Enabling
 * `MS365_MCP_REDACT_PII` runs each log message through the patterns below.
 *
 * Patterns are intentionally generic (JWTs, Bearer headers, OAuth token
 * fields, email addresses) — no jurisdiction-specific identifiers — so the
 * filter is useful to any operator without locale assumptions.
 */

interface RedactionPattern {
  pattern: RegExp;
  replacement: string;
}

// Ordered most-specific first. JWTs are matched before generic token fields so
// a `access_token=eyJ...` collapses to a single JWT marker rather than nesting.
const REDACTIONS: RedactionPattern[] = [
  // JSON Web Tokens (header.payload.signature) — access_token, id_token, etc.
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[REDACTED_JWT]',
  },
  // Authorization: Bearer <token>
  {
    pattern: /(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi,
    replacement: '$1[REDACTED]',
  },
  // OAuth token fields in query strings or JSON bodies:
  // refresh_token=..., "access_token": "...", client_secret=...
  // The \b keeps composite keys like `statusCode` from matching via a substring.
  {
    pattern:
      /(["']?\b(?:refresh_token|access_token|id_token|client_secret|assertion)["']?\s*[=:]\s*["']?)[A-Za-z0-9._~+/-]+=*/gi,
    replacement: '$1[REDACTED]',
  },
  // OAuth authorization codes, query-string form only (?code=... / &code=...).
  // `code:` in JSON or prose is an error/status code (ECONNRESET, AADSTS...),
  // which must stay readable for diagnostics.
  {
    pattern: /([?&]code=)[^&\s"']+/gi,
    replacement: '$1[REDACTED]',
  },
  // Email addresses / UPNs
  {
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: '[REDACTED_EMAIL]',
  },
];

/** Whether opt-in PII redaction is enabled via MS365_MCP_REDACT_PII=true|1. */
export function redactionEnabled(): boolean {
  const raw = process.env.MS365_MCP_REDACT_PII;
  return raw === 'true' || raw === '1';
}

/** Applies every redaction pattern to `input` and returns the scrubbed string. */
export function redactSensitive(input: string): string {
  let out = input;
  for (const { pattern, replacement } of REDACTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

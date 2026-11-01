/**
 * Redaction of sensitive material from log output. On by default.
 *
 * Error messages bubbled up from upstream libraries (MSAL, fetch, the Graph
 * SDK) routinely interpolate request URLs, Authorization headers, and token
 * payloads into their message strings. When those land in a log file or the
 * console they expose bearer/refresh tokens and user identifiers, and this
 * server necessarily handles live Graph bearer tokens with mail/calendar/
 * contacts read-write scopes. Every log message is run through the patterns
 * below unless an operator explicitly opts out with `MS365_MCP_REDACT_PII=false`.
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
];

// Email addresses / UPNs. Not a plain global regex: `[A-Za-z0-9._%+-]+@...` is
// quadratic on a long run of local-part characters with no `@`, and base64 of
// text (e.g. an attachment's contentBytes) is exactly such a run. Instead
// anchor on each `@`, walk the local part backwards once, and match the domain
// with a sticky regex, so the cost stays linear in the message length.
const EMAIL_LOCAL_CHAR = /[A-Za-z0-9._%+-]/;
const EMAIL_DOMAIN = /[A-Za-z0-9.-]+\.[A-Za-z]{2,}/y;

function redactEmails(input: string): string {
  let at = input.indexOf('@');
  if (at === -1) return input;
  let out = '';
  let copied = 0; // input[0, copied) is already in `out`
  while (at !== -1) {
    let start = at;
    while (start > copied && EMAIL_LOCAL_CHAR.test(input[start - 1])) start--;
    EMAIL_DOMAIN.lastIndex = at + 1;
    const domain = start < at ? EMAIL_DOMAIN.exec(input) : null;
    if (domain) {
      out += input.slice(copied, start) + '[REDACTED_EMAIL]';
      copied = at + 1 + domain[0].length;
      at = input.indexOf('@', copied);
    } else {
      at = input.indexOf('@', at + 1);
    }
  }
  return out + input.slice(copied);
}

/**
 * Whether PII/secret redaction is enabled. On by default; set
 * MS365_MCP_REDACT_PII=false|0 to opt out and get fully verbose logs.
 */
export function redactionEnabled(): boolean {
  const raw = process.env.MS365_MCP_REDACT_PII;
  if (raw === undefined) return true;
  return raw !== 'false' && raw !== '0';
}

/** Applies every redaction pattern to `input` and returns the scrubbed string. */
export function redactSensitive(input: string): string {
  let out = input;
  for (const { pattern, replacement } of REDACTIONS) {
    out = out.replace(pattern, replacement);
  }
  return redactEmails(out);
}

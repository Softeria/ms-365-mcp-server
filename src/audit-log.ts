import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Structured JSON audit log for tool invocations.
 *
 * Why a separate logger: the operational logger (`./logger.ts`) emits
 * human-friendly text and may incidentally include large tool params for
 * debugging. The audit log has a stricter, machine-parseable shape and a
 * narrower allowlist of fields — it is the artifact that satisfies the
 * "who accessed what, when" requirement of data-subject access requests
 * (DSARs) and audit trails under common privacy regimes (GDPR, HIPAA,
 * PIPEDA, SOC 2, etc.).
 *
 * PII boundaries:
 *  - `user_principal_name` is the *identity claim* from the bearer token and
 *    is required for the audit trail to be useful. It IS personal data.
 *  - `target_resource.id` points at the affected Graph resource but does
 *    not expose its contents (e.g. a message-id, not the message body).
 *  - `error_type` / `error_code` are recorded but raw error messages are NOT,
 *    because upstream library errors can incidentally include token fragments
 *    or query-string PII.
 *  - Tool `args` are recorded in sanitized form via `sanitizeArgs()`: bodies,
 *    attachment bytes, and free-text fields ("comment", "message", search
 *    queries) are replaced with the literal string "[redacted]"; long strings
 *    are truncated; large arrays are summarized. Graph response bodies are
 *    NEVER written here.
 *
 * Opt-out: set `MS365_MCP_AUDIT_LOG=false` to disable when audit is
 * collected through a separate sink (sidecar, OpenTelemetry, etc.).
 */

const logsDir =
  process.env.MS365_MCP_LOG_DIR || path.join(os.homedir(), '.ms-365-mcp-server', 'logs');

const FILE_MODE = 0o600;
const auditLogPath = path.join(logsDir, 'audit.log');

try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
  }
  if (fs.existsSync(auditLogPath)) {
    fs.chmodSync(auditLogPath, FILE_MODE);
  }
} catch {
  // Best-effort — log directory may be ephemeral (e.g. in containers); the
  // Console transport below still reaches the platform log collector.
}

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'ms-365-mcp-server',
    stream: 'audit',
  },
  transports: [
    new winston.transports.Console({
      // Route audit events to stderr so they don't collide with JSON-RPC on
      // stdout when this server runs in stdio mode. Container platforms
      // (Container Apps, App Service, Docker) capture both stdout and stderr
      // and forward to Log Analytics, so the production audit sink is
      // unaffected. Vitest sets `VITEST=true`; staying silent there avoids
      // polluting unrelated tests that exercise the real graph-tools module.
      stderrLevels: ['info'],
      silent:
        process.env.SILENT === 'true' ||
        process.env.SILENT === '1' ||
        process.env.VITEST === 'true',
    }),
    new winston.transports.File({
      filename: auditLogPath,
      options: { flags: 'a', mode: FILE_MODE },
    }),
  ],
});

export type AuditStatus = 'success' | 'error' | 'denied';

export interface AuditEvent {
  event: string;
  request_id: string;
  user_principal_name?: string;
  tool: string;
  http_method?: string;
  status: AuditStatus;
  duration_ms?: number;
  target_resource?: { type: string; id?: string };
  error_type?: string;
  error_code?: string | number;
  args?: Record<string, unknown>;
  account?: string;
}

/**
 * Sanitize tool arguments before they hit the audit log. Strips bodies,
 * attachment contents, and free-text comment / message fields; truncates long
 * strings; summarizes large arrays. Recursion is depth-bounded.
 *
 * Match runs against the lowercased key, so "Body", "BODY", and "body" all
 * redact. We err on the side of redaction: anything that could carry
 * mailbox content or user-supplied prose.
 */
const REDACT_KEYS = new Set([
  'body',
  'bodypreview',
  'content',
  'contentbytes',
  'comment',
  'note',
  'message',
  'searchquery',
]);

const MAX_STRING_LEN = 120;

export function sanitizeArgs(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LEN
      ? value.slice(0, MAX_STRING_LEN) + `…[${value.length - MAX_STRING_LEN} more]`
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (value.length > 5) return `[${value.length} items]`;
    return value.map((v) => sanitizeArgs(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitizeArgs(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function isAuditLogEnabled(): boolean {
  return process.env.MS365_MCP_AUDIT_LOG !== 'false';
}

export function auditLog(evt: AuditEvent): void {
  if (!isAuditLogEnabled()) return;
  auditLogger.info(evt);
}

/**
 * Decode a JWT payload (NO signature verification — that is the auth
 * middleware's job) and return a stable identity claim suitable for the
 * audit trail. Returns `undefined` when no usable claim is found or when
 * the token is malformed.
 *
 * Preference order: `upn` → `preferred_username` → `email` → `sub`.
 */
export function getUserIdentityForAudit(token?: string): string | undefined {
  if (!token) return undefined;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padNeeded = (4 - (b64.length % 4)) % 4;
    b64 = b64 + '='.repeat(padNeeded);
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')) as Record<
      string,
      unknown
    >;
    const candidate =
      (payload.upn as string | undefined) ||
      (payload.preferred_username as string | undefined) ||
      (payload.email as string | undefined) ||
      (payload.sub as string | undefined);
    return typeof candidate === 'string' ? candidate : undefined;
  } catch {
    return undefined;
  }
}

// Exported for tests.
export const __testing = { auditLogger, auditLogPath };

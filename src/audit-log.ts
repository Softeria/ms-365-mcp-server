/**
 * Audit logging for tool calls.
 *
 * Every Graph tool invocation produces one JSON line in a daily log file.
 * Default location: ~/.config/enabi-m365-mcp/audit/audit-YYYY-MM-DD.log
 * Override with MS365_MCP_AUDIT_LOG_DIR. Disable with MS365_MCP_AUDIT_DISABLED=1.
 *
 * The shape stays minimal so logs are cheap to ship to a central sink later.
 * Body content (mail bodies, attachments) is redacted; identifiers and
 * top-level scalars are kept so a reviewer can answer "what did Claude do?".
 *
 * Audit logging never throws — a failure to write must not break a tool call.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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

function sanitize(value: unknown, depth = 0): unknown {
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
    return value.map((v) => sanitize(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

function getAuditDir(): string {
  return (
    process.env.MS365_MCP_AUDIT_LOG_DIR ||
    path.join(os.homedir(), '.config', 'enabi-m365-mcp', 'audit')
  );
}

function getDailyLogPath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(getAuditDir(), `audit-${date}.log`);
}

let dirEnsured = false;
function ensureDir(): boolean {
  if (dirEnsured) return true;
  try {
    fs.mkdirSync(getAuditDir(), { recursive: true, mode: 0o700 });
    dirEnsured = true;
    return true;
  } catch {
    return false;
  }
}

export interface AuditEntry {
  tool: string;
  args: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  account?: string;
  error?: string;
}

export function audit(entry: AuditEntry): void {
  if (process.env.MS365_MCP_AUDIT_DISABLED === '1') return;
  try {
    if (!ensureDir()) return;
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        tool: entry.tool,
        account: entry.account,
        success: entry.success,
        duration_ms: entry.durationMs,
        ...(entry.error ? { error: entry.error.slice(0, 240) } : {}),
        args: sanitize(entry.args),
      }) + '\n';
    fs.appendFileSync(getDailyLogPath(), line, { mode: 0o600 });
  } catch {
    // Never let audit failure interrupt a tool call.
  }
}

import { createHash } from 'node:crypto';

/**
 * Audit logger: every Graph call emits one JSON line to stderr so an
 * operator (or a sidecar shipper) can reconstruct exactly which tool
 * reached which API with which scope, without ever seeing the payload
 * content or the raw account identifier.
 *
 * Writes to stderr on purpose — the MCP stdio transport uses stdout for
 * the protocol. Any stray write to stdout would corrupt the JSON-RPC
 * framing and brick the session.
 */

export interface AuditEntry {
  tool: string;
  method: string;
  path: string;
  scopes: string[];
  /** Raw account identifier (email, home account id, etc.). Will be hashed
   *  before emission. Pass null when no account context applies (e.g.
   *  pre-auth calls). */
  account: string | null;
  status: number;
  duration_ms: number;
}

interface EmittedEntry {
  ts: string;
  tool: string;
  method: string;
  path: string;
  scopes: string[];
  account: string;
  status: number;
  duration_ms: number;
}

export function hashAccount(raw: string): string {
  const canonical = raw.trim().toLowerCase();
  const digest = createHash('sha256').update(canonical).digest('hex');
  return `sha256:${digest}`;
}

export function auditLog(entry: AuditEntry): void {
  const emitted: EmittedEntry = {
    ts: new Date().toISOString(),
    tool: entry.tool,
    method: entry.method,
    path: entry.path,
    scopes: entry.scopes,
    account: entry.account === null ? 'none' : hashAccount(entry.account),
    status: entry.status,
    duration_ms: entry.duration_ms,
  };
  process.stderr.write(JSON.stringify(emitted) + '\n');
}

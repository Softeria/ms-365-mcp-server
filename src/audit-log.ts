import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Structured JSON audit log for tool invocations.
 *
 * The audit logger must never fail module import in serverless runtimes.
 * Vercel only allows reliable writes to /tmp, and the function bundle may not
 * allow creating a home-directory log tree. In that runtime we keep audit logs
 * on Console so Vercel's platform log collector captures them.
 */

const isServerless = process.env.VERCEL === '1';
const logsDir = process.env.MS365_MCP_LOG_DIR || path.join(os.homedir(), '.ms-365-mcp-server', 'logs');
const FILE_MODE = 0o600;
const auditLogPath = path.join(logsDir, 'audit.log');

let canUseFileTransport = !isServerless;

if (canUseFileTransport) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(auditLogPath)) {
      fs.chmodSync(auditLogPath, FILE_MODE);
    }
  } catch {
    canUseFileTransport = false;
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    stderrLevels: ['info'],
    silent:
      process.env.SILENT === 'true' ||
      process.env.SILENT === '1' ||
      process.env.VITEST === 'true',
  }),
];

if (canUseFileTransport) {
  transports.push(
    new winston.transports.File({
      filename: auditLogPath,
      options: { flags: 'a', mode: FILE_MODE },
    })
  );
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
  transports,
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
}

export function isAuditLogEnabled(): boolean {
  return process.env.MS365_MCP_AUDIT_LOG !== 'false';
}

export function auditLog(evt: AuditEvent): void {
  if (!isAuditLogEnabled()) return;
  auditLogger.info(evt);
}

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

export const __testing = { auditLogger, auditLogPath };

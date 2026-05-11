import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir =
  process.env.MS365_MCP_LOG_DIR || path.join(os.homedir(), '.ms-365-mcp-server', 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
} else {
  // Tighten permissions on a pre-existing log directory in case it was created
  // with a more permissive umask.
  try {
    fs.chmodSync(logsDir, 0o700);
  } catch {
    // Best-effort — on platforms that don't support chmod (e.g. Windows) this
    // is a no-op.
  }
}

// Restrict log file mode to owner-only (0o600). Log files may contain error
// messages from upstream libraries (MSAL, fetch, etc.) which can incidentally
// include token fragments or other sensitive material; on shared/multi-user
// systems the default umask may otherwise leave them world-readable.
const FILE_MODE = 0o600;

function ensureFileMode(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, FILE_MODE);
    }
  } catch {
    // Best-effort — chmod is unsupported on some platforms (e.g. Windows).
  }
}

const errorLogPath = path.join(logsDir, 'error.log');
const serverLogPath = path.join(logsDir, 'mcp-server.log');
ensureFileMode(errorLogPath);
ensureFileMode(serverLogPath);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: errorLogPath,
      level: 'error',
      options: { flags: 'a', mode: FILE_MODE },
    }),
    new winston.transports.File({
      filename: serverLogPath,
      options: { flags: 'a', mode: FILE_MODE },
    }),
  ],
});

export const enableConsoleLogging = (): void => {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      silent: process.env.SILENT === 'true' || process.env.SILENT === '1',
    })
  );
};

export default logger;

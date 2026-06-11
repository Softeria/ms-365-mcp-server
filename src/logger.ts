import winston from 'winston';
import fs from 'fs';
import os from 'os';
import { redactionEnabled, redactSensitive } from './lib/log-redactor.js';

const redactFormat = winston.format((info) => {
  if (!redactionEnabled()) return info;
  if (typeof info.message === 'string') {
    info.message = redactSensitive(info.message);
  }
  return info;
});

const isVercel = process.env.VERCEL === '1';

const logsDir = isVercel
  ? null
  : process.env.MS365_MCP_LOG_DIR || (os.homedir() ? os.homedir() + '/.ms-365-mcp-server/logs' : null);

if (logsDir && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
} else if (logsDir) {
  try {
    fs.chmodSync(logsDir, 0o700);
  } catch {
    // ignore
  }
}

const FILE_MODE = 0o600;

function ensureFileMode(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, FILE_MODE);
    }
  } catch {
    // ignore
  }
}

const transports: winston.transport[] = [];

if (logsDir) {
  const errorLogPath = logsDir + '/error.log';
  const serverLogPath = logsDir + '/mcp-server.log';
  ensureFileMode(errorLogPath);
  ensureFileMode(serverLogPath);

  transports.push(
    new winston.transports.File({
      filename: errorLogPath,
      level: 'error',
      options: { flags: 'a', mode: FILE_MODE },
    }),
    new winston.transports.File({
      filename: serverLogPath,
      options: { flags: 'a', mode: FILE_MODE },
    })
  );
}

if (isVercel) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        redactFormat(),
        winston.format.simple()
      ),
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports,
});

export const enableConsoleLogging = (): void => {
  const hasConsole = logger.transports.some(t => t instanceof winston.transports.Console);
  if (!hasConsole) {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          redactFormat(),
          winston.format.colorize(),
          winston.format.simple()
        ),
        silent: process.env.SILENT === 'true' || process.env.SILENT === '1',
      })
    );
  }
};

export default logger;

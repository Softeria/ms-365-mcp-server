import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Logger for MCP servers - must use stderr for console, not stdout
// stdout is reserved for MCP protocol JSON messages

// Determine log directory - use home directory to avoid permission issues
const logsDir = path.join(os.homedir(), '.ms365-mcp-server', 'logs');

// Create logs directory if it doesn't exist
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  // If we can't create log directory, continue without file logging
  console.error(`Warning: Could not create log directory at ${logsDir}:`, error);
}

const transports: winston.transport[] = [
  // Always log to stderr (stdout is used for MCP protocol)
  new winston.transports.Console({
    stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'],
    format: winston.format.simple(),
    silent: process.env.SILENT === 'true' || process.env.SILENT === '1',
  }),
];

// Add file transports if log directory was created successfully
if (fs.existsSync(logsDir)) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'mcp-server.log'),
    })
  );
}

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
  transports,
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

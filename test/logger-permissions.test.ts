import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('logger file permissions (CWE-532)', () => {
  let tmpDir: string;
  let prevLogDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-mcp-log-perm-'));
    prevLogDir = process.env.MS365_MCP_LOG_DIR;
    process.env.MS365_MCP_LOG_DIR = tmpDir;
    vi.resetModules();
  });

  afterEach(() => {
    if (prevLogDir === undefined) {
      delete process.env.MS365_MCP_LOG_DIR;
    } else {
      process.env.MS365_MCP_LOG_DIR = prevLogDir;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates log files with owner-only (0o600) permissions', async () => {
    // Skip on Windows where POSIX modes are not honored
    if (process.platform === 'win32') return;

    const mod = await import('../src/logger.ts');
    const logger = mod.default;

    logger.info('permission test message');
    logger.error('permission test error');

    // Wait for winston to flush.
    await new Promise((r) => setTimeout(r, 400));

    const serverLog = path.join(tmpDir, 'mcp-server.log');
    const errorLog = path.join(tmpDir, 'error.log');

    expect(fs.existsSync(serverLog)).toBe(true);
    expect(fs.existsSync(errorLog)).toBe(true);

    const serverMode = fs.statSync(serverLog).mode & 0o777;
    const errorMode = fs.statSync(errorLog).mode & 0o777;

    // Group/other bits must be cleared — file must not be readable by other users.
    expect(serverMode & 0o077).toBe(0);
    expect(errorMode & 0o077).toBe(0);

    // Directory should also be owner-only.
    const dirMode = fs.statSync(tmpDir).mode & 0o777;
    expect(dirMode & 0o077).toBe(0);
  });
});

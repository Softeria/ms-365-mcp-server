// The log files are bounded: each rotates at MS365_MCP_LOG_MAX_BYTES and at most
// MS365_MCP_LOG_MAX_FILES are kept, so a long-running container cannot fill its disk.
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-log-rotation-'));
process.env.MS365_MCP_LOG_DIR = logDir;
process.env.MS365_MCP_LOG_MAX_BYTES = '2048';
process.env.MS365_MCP_LOG_MAX_FILES = '3';

const serverFiles = () => fs.readdirSync(logDir).filter((f) => f.startsWith('mcp-server'));

describe('log rotation', () => {
  afterAll(() => {
    fs.rmSync(logDir, { recursive: true, force: true });
    delete process.env.MS365_MCP_LOG_MAX_BYTES;
    delete process.env.MS365_MCP_LOG_MAX_FILES;
  });

  it('rotates the server log at the configured size and keeps a bounded set', async () => {
    const { default: logger } = await import('../src/logger.js');
    const line = 'x'.repeat(200);
    // 100 lines of ~230 bytes = ~23 KB against a 2 KB cap: rotation must happen.
    for (let i = 0; i < 100; i++) logger.info(`${i} ${line}`);

    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const files = serverFiles();
      const total = files.reduce((n, f) => n + fs.statSync(path.join(logDir, f)).size, 0);
      if (files.length > 1 && total > 4000) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, 300));

    const files = serverFiles();
    expect(files.length).toBeGreaterThan(1);
    expect(files.length).toBeLessThanOrEqual(3);
    const total = files.reduce((n, f) => n + fs.statSync(path.join(logDir, f)).size, 0);
    // Three files of at most ~2 KB plus one line of slack each: far below the 23 KB written.
    expect(total).toBeLessThan(3 * (2048 + 300));
  });
});

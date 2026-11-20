// The diagnostic logs are bounded: they rotate at MS365_MCP_LOG_MAX_BYTES and at most
// MS365_MCP_LOG_MAX_FILES are kept, so a long-running container cannot fill its disk.
// (Size-based rotation; not an age-based expiry.) audit.log is the audit trail, so the
// server never rotates or trims it.
import { afterAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-log-rotation-'));
process.env.MS365_MCP_LOG_DIR = logDir;
process.env.MS365_MCP_LOG_MAX_BYTES = '2048';
process.env.MS365_MCP_LOG_MAX_FILES = '3';

const family = (stem: string) => fs.readdirSync(logDir).filter((f) => f.startsWith(stem));
const bytes = (files: string[]) =>
  files.reduce((n, f) => n + fs.statSync(path.join(logDir, f)).size, 0);
const lines = (files: string[]) =>
  files.flatMap((f) => fs.readFileSync(path.join(logDir, f), 'utf8').split('\n').filter(Boolean));

describe('log rotation', () => {
  afterAll(() => {
    fs.rmSync(logDir, { recursive: true, force: true });
    delete process.env.MS365_MCP_LOG_MAX_BYTES;
    delete process.env.MS365_MCP_LOG_MAX_FILES;
  });

  it('bounds mcp-server.log and error.log, keeping the newest lines, but never audit.log', async () => {
    const { default: logger } = await import('../src/logger.js');
    const { auditLog } = await import('../src/audit-log.js');
    const pad = 'x'.repeat(200);
    // ~23 KB per log against a 2 KB cap and 3 files.
    for (let i = 0; i < 100; i++) {
      logger.info(`line ${i} ${pad}`);
      logger.error(`err ${i} ${pad}`);
      auditLog({ event: 'tool.call', tool: `t${i}`, request_id: pad } as never);
    }
    for (const stem of ['mcp-server.log', 'error.log']) {
      const files = family(stem);
      expect(files.length, stem).toBe(3);
      expect(bytes(files), stem).toBeLessThanOrEqual(3 * 2048);
      const kept = lines(files);
      expect(kept.length, stem).toBeGreaterThan(10);
      // The newest line is in the live file, the oldest lines are gone.
      expect(fs.readFileSync(path.join(logDir, stem), 'utf8')).toContain(' 99 ');
      expect(kept.some((l) => l.includes(' 0 '))).toBe(false);
    }
    // One file with every record, written asynchronously by winston's File transport.
    await vi.waitFor(() => expect(lines(['audit.log'])).toHaveLength(100), { timeout: 5000 });
    expect(family('audit.log')).toEqual(['audit.log']);
  });
});

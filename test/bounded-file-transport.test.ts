// The bound holds on every path: oversized records are cut, and when the file
// cannot be rotated it is truncated, and when it cannot be truncated writing stops.
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BoundedFileTransport } from '../src/lib/bounded-file-transport.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bounded-'));
const put = (t: BoundedFileTransport, text: string) =>
  t.log({ [Symbol.for('message')]: text } as never, () => undefined);
const size = (f: string) => (fs.existsSync(f) ? fs.statSync(f).size : 0);

describe('BoundedFileTransport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cuts a record longer than the bound and says how much was dropped', () => {
    const f = path.join(dir, 'big.log');
    const t = new BoundedFileTransport({ filename: f, maxBytes: 1024, maxFiles: 2 });
    put(t, 'x'.repeat(20_000));
    expect(size(f)).toBeLessThanOrEqual(1024);
    expect(fs.readFileSync(f, 'utf8')).toMatch(/…\[\d+ bytes dropped\]\n$/);
  });

  it('truncates the live file when it cannot be renamed, so the bound still holds', () => {
    const f = path.join(dir, 'norename.log');
    const t = new BoundedFileTransport({ filename: f, maxBytes: 1024, maxFiles: 2 });
    const real = fs.renameSync;
    vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (String(from) === f) throw Object.assign(new Error('denied'), { code: 'EACCES' });
      return real(from, to);
    });
    for (let i = 0; i < 40; i++) put(t, `${i} ${'y'.repeat(490)}`);
    expect(size(f)).toBeLessThanOrEqual(1024);
    expect(fs.existsSync(`${f}.1`)).toBe(false);
    expect(fs.readFileSync(f, 'utf8')).toContain('39 ');
  });

  it('stops writing, saying so once on stderr and never throwing, when it can neither rename nor truncate', () => {
    const f = path.join(dir, 'stuck.log');
    const t = new BoundedFileTransport({ filename: f, maxBytes: 1024, maxFiles: 2 });
    const errors: string[] = [];
    const stderr = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.join(' '));
    });
    vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    });
    vi.spyOn(fs, 'truncateSync').mockImplementation(() => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    });
    expect(() => {
      for (let i = 0; i < 40; i++) put(t, `${i} ${'z'.repeat(490)}`);
    }).not.toThrow();
    expect(size(f)).toBeLessThanOrEqual(1024);
    expect(errors).toEqual(['[ms365-mcp] log file stuck.log cannot be bounded; writing stopped']);
    stderr.mockRestore();
  });

  it('keeps maxFiles files of at most maxBytes each in normal operation', () => {
    const f = path.join(dir, 'normal.log');
    const t = new BoundedFileTransport({ filename: f, maxBytes: 1024, maxFiles: 3 });
    for (let i = 0; i < 100; i++) put(t, `${i} ${'w'.repeat(200)}`);
    const files = fs.readdirSync(dir).filter((n) => n.startsWith('normal.log'));
    expect(files.sort()).toEqual(['normal.log', 'normal.log.1', 'normal.log.2']);
    for (const n of files) expect(size(path.join(dir, n))).toBeLessThanOrEqual(1024);
    expect(fs.readFileSync(f, 'utf8')).toContain('99 ');
  });

  it('never turns a log call into an exception, through the real logger', async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bounded-logger-'));
    process.env.MS365_MCP_LOG_DIR = logDir;
    process.env.MS365_MCP_LOG_MAX_BYTES = '1024';
    const { default: logger } = await import('../src/logger.js');
    vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    });
    vi.spyOn(fs, 'truncateSync').mockImplementation(() => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    });
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => {
      for (let i = 0; i < 40; i++) logger.info(`${i} ${'q'.repeat(490)}`);
    }).not.toThrow();
    expect(size(path.join(logDir, 'mcp-server.log'))).toBeLessThanOrEqual(1024);
    stderr.mockRestore();
    fs.rmSync(logDir, { recursive: true, force: true });
    delete process.env.MS365_MCP_LOG_MAX_BYTES;
  });
});

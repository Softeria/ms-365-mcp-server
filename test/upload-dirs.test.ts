import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertUploadDirsAbsolute, getUploadDirs, openUploadFile } from '../src/lib/upload-dirs.js';

describe('upload dirs', () => {
  let root: string;
  let allowed: string;
  let outside: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(path.join(tmpdir(), 'upload-dirs-')));
    allowed = path.join(root, 'allowed');
    outside = path.join(root, 'outside');
    mkdirSync(allowed);
    mkdirSync(outside);
    writeFileSync(path.join(allowed, 'report.pdf'), 'pdf-bytes');
    writeFileSync(path.join(outside, 'secret.txt'), 'secret');
  });

  afterEach(() => {
    delete process.env.MS365_MCP_UPLOAD_DIRS;
    rmSync(root, { recursive: true, force: true });
  });

  it('is empty when the variable is unset or blank', () => {
    expect(getUploadDirs()).toEqual([]);
    process.env.MS365_MCP_UPLOAD_DIRS = ' ';
    expect(getUploadDirs()).toEqual([]);
  });

  it('splits entries like PATH', () => {
    process.env.MS365_MCP_UPLOAD_DIRS = [allowed, ` ${outside} `, ''].join(path.delimiter);
    expect(getUploadDirs()).toEqual([allowed, outside]);
  });

  it('refuses to start on a relative entry', () => {
    process.env.MS365_MCP_UPLOAD_DIRS = [allowed, 'relative/dir'].join(path.delimiter);
    expect(() => assertUploadDirsAbsolute()).toThrow(/absolute paths, got: relative\/dir/);
    process.env.MS365_MCP_UPLOAD_DIRS = allowed;
    expect(() => assertUploadDirsAbsolute()).not.toThrow();
  });

  it('opens a file inside an allowed directory', async () => {
    const file = await openUploadFile(path.join(allowed, 'report.pdf'), [allowed]);
    try {
      expect(file.size).toBe(9);
      expect((await file.handle.readFile()).toString()).toBe('pdf-bytes');
    } finally {
      await file.handle.close();
    }
  });

  it('gives a missing file and a file outside the directories the same error', async () => {
    const missing = await openUploadFile(path.join(outside, 'nope.txt'), [allowed]).catch(
      (e: Error) => e.message
    );
    const real = await openUploadFile(path.join(outside, 'secret.txt'), [allowed]).catch(
      (e: Error) => e.message
    );
    expect(real).toMatch(/does not exist or is outside/);
    expect(missing).toBe(real);
  });

  it('refuses a path that climbs out with ..', async () => {
    await expect(
      openUploadFile(path.join(allowed, '..', 'outside', 'secret.txt'), [allowed])
    ).rejects.toThrow(/does not exist or is outside/);
  });

  it('refuses a sibling directory that shares the allowed prefix', async () => {
    const sibling = `${allowed}-other`;
    mkdirSync(sibling);
    writeFileSync(path.join(sibling, 'x.txt'), 'x');
    await expect(openUploadFile(path.join(sibling, 'x.txt'), [allowed])).rejects.toThrow(
      /does not exist or is outside/
    );
  });

  it('refuses a symlink inside the directory that points outside it', async () => {
    symlinkSync(path.join(outside, 'secret.txt'), path.join(allowed, 'link.txt'));
    await expect(openUploadFile(path.join(allowed, 'link.txt'), [allowed])).rejects.toThrow(
      /does not exist or is outside/
    );
  });

  it('refuses a file reached through a symlinked subdirectory that points outside', async () => {
    symlinkSync(outside, path.join(allowed, 'sub'));
    await expect(
      openUploadFile(path.join(allowed, 'sub', 'secret.txt'), [allowed])
    ).rejects.toThrow(/does not exist or is outside/);
  });

  it('ignores an allowed directory that does not exist', async () => {
    const file = await openUploadFile(path.join(allowed, 'report.pdf'), [
      path.join(root, 'missing'),
      allowed,
    ]);
    await file.handle.close();
    expect(file.size).toBe(9);
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a FIFO without waiting for a writer',
    async () => {
      execFileSync('mkfifo', [path.join(allowed, 'pipe')]);
      await expect(openUploadFile(path.join(allowed, 'pipe'), [allowed])).rejects.toThrow(
        /not a regular file/
      );
    }
  );

  it('follows an allowed directory that is itself a symlink', async () => {
    const alias = path.join(root, 'alias');
    symlinkSync(allowed, alias);
    const file = await openUploadFile(path.join(alias, 'report.pdf'), [alias]);
    await file.handle.close();
    expect(file.size).toBe(9);
  });

  it('refuses a relative path, a directory and the allowed directory itself', async () => {
    await expect(openUploadFile('report.pdf', [allowed])).rejects.toThrow(/absolute path/);
    mkdirSync(path.join(allowed, 'sub'));
    await expect(openUploadFile(path.join(allowed, 'sub'), [allowed])).rejects.toThrow(
      /not a regular file/
    );
    await expect(openUploadFile(allowed, [allowed])).rejects.toThrow(
      /does not exist or is outside/
    );
  });
});

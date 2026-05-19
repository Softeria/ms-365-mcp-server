import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CommandTokenCacheStorage,
  DefaultTokenCacheStorage,
  createTokenCacheStorage,
  type TokenCacheStorageKey,
  wrapCache,
} from '../src/token-cache-storage.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

type FakeChild = EventEmitter & {
  stdin: Writable;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
};

type SpawnHandler = (context: { args: string[]; stdin: string; child: FakeChild }) => void;

function createFakeSpawn(handler: SpawnHandler) {
  const calls: Array<{ command: string; args: string[]; stdin: string }> = [];

  const spawnCommand = vi.fn((command: string, args: string[]) => {
    let stdin = '';
    const child = new EventEmitter() as FakeChild;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = vi.fn((signal?: string | number) => {
      if (signal === 'SIGKILL') {
        child.emit('close', null, 'SIGKILL');
      }
      return true;
    });
    child.stdin = new Writable({
      write(chunk, _encoding, callback) {
        stdin += chunk.toString();
        callback();
      },
      final(callback) {
        calls.push({ command, args, stdin });
        handler({ args, stdin, child });
        callback();
      },
    });
    return child;
  });

  return { spawnCommand, calls };
}

function closeChild(child: FakeChild, exitCode = 0): void {
  child.stdout.end();
  child.stderr.end();
  child.emit('close', exitCode, null);
}

describe('token cache storage', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('provider selection', () => {
    it('uses default storage when no command is configured', async () => {
      const storage = await createTokenCacheStorage();

      expect(storage).toBeInstanceOf(DefaultTokenCacheStorage);
      expect(storage.description).toBe('default (keytar+file)');
    });

    it('rejects a whitespace-only command for local auth flows', async () => {
      vi.stubEnv('MS365_MCP_AUTH_CACHE_COMMAND', '   ');

      await expect(createTokenCacheStorage()).rejects.toThrow(/MS365_MCP_AUTH_CACHE_COMMAND/);
    });

    it('ignores invalid command configuration when command storage is disabled', async () => {
      vi.stubEnv('MS365_MCP_AUTH_CACHE_COMMAND', '   ');

      const storage = await createTokenCacheStorage({ allowCommandStorage: false });

      expect(storage).toBeInstanceOf(DefaultTokenCacheStorage);
    });

    it('rejects a missing command path for local auth flows', async () => {
      vi.stubEnv('MS365_MCP_AUTH_CACHE_COMMAND', path.join(os.tmpdir(), 'missing-ms365-cache'));

      await expect(createTokenCacheStorage()).rejects.toThrow(/does not exist/);
    });

    it('rejects a non-executable command path on POSIX', async () => {
      if (process.platform === 'win32') {
        return;
      }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-cache-test-'));
      const commandPath = path.join(dir, 'store');
      fs.writeFileSync(commandPath, '#!/bin/sh\nexit 0\n', { mode: 0o600 });
      vi.stubEnv('MS365_MCP_AUTH_CACHE_COMMAND', commandPath);

      await expect(createTokenCacheStorage()).rejects.toThrow(/executable file/);
    });
  });

  describe('command protocol', () => {
    it('loads present and missing values from the command protocol', async () => {
      const { spawnCommand } = createFakeSpawn(({ args, child }) => {
        if (args[1] === 'token-cache') {
          child.stdout.write(JSON.stringify({ found: true, value: 'stored-envelope' }));
        } else {
          child.stdout.write(JSON.stringify({ found: false }));
        }
        closeChild(child);
      });
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      await expect(storage.load('token-cache')).resolves.toBe('stored-envelope');
      await expect(storage.load('selected-account')).resolves.toBeUndefined();
    });

    it('treats empty stdout as a cache miss', async () => {
      const { spawnCommand } = createFakeSpawn(({ child }) => closeChild(child));
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      await expect(storage.load('token-cache')).resolves.toBeUndefined();
    });

    it('treats non-zero exits as storage errors, not misses', async () => {
      const { spawnCommand } = createFakeSpawn(({ child }) => closeChild(child, 2));
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      await expect(storage.load('token-cache')).rejects.toThrow(/exit 2/);
    });

    it('fails closed on invalid load JSON and malformed payloads', async () => {
      const invalidJson = createFakeSpawn(({ child }) => {
        child.stdout.write('not-json');
        closeChild(child);
      });
      const missingValue = createFakeSpawn(({ child }) => {
        child.stdout.write(JSON.stringify({ found: true }));
        closeChild(child);
      });

      await expect(
        new CommandTokenCacheStorage('/cache-wrapper', 1000, invalidJson.spawnCommand).load(
          'token-cache'
        )
      ).rejects.toThrow(/invalid JSON/);
      await expect(
        new CommandTokenCacheStorage('/cache-wrapper', 1000, missingValue.spawnCommand).load(
          'token-cache'
        )
      ).rejects.toThrow(/invalid load response/);
    });

    it('sends save values through stdin and waits for command exit', async () => {
      let deferredChild: FakeChild | undefined;
      let resolved = false;
      const value = 'x'.repeat(64 * 1024);
      const { spawnCommand, calls } = createFakeSpawn(({ child }) => {
        deferredChild = child;
      });
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      const promise = storage.save('token-cache', value).then(() => {
        resolved = true;
      });
      await Promise.resolve();

      expect(resolved).toBe(false);
      expect(calls[0].args).toEqual(['save', 'token-cache']);
      expect(JSON.parse(calls[0].stdin)).toEqual({ value });

      closeChild(deferredChild!);
      await promise;
      expect(resolved).toBe(true);
    });

    it('deletes by operation and key without stdin payload', async () => {
      const { spawnCommand, calls } = createFakeSpawn(({ child }) => closeChild(child));
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      await storage.delete('selected-account');

      expect(calls[0]).toMatchObject({
        args: ['delete', 'selected-account'],
        stdin: '',
      });
    });

    it('sanitizes command errors without echoing stdin or stdout payloads', async () => {
      const secretValue = wrapCache('secret-token-value');
      const longStderr = `adapter failed ${'x'.repeat(3000)}`;
      const { spawnCommand } = createFakeSpawn(({ child }) => {
        child.stdout.write(secretValue);
        child.stderr.write(longStderr);
        closeChild(child, 1);
      });
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      await expect(storage.save('token-cache', secretValue)).rejects.toThrow(/adapter failed/);
      await expect(storage.save('token-cache', secretValue)).rejects.not.toThrow(
        /secret-token-value/
      );
    });

    it('times out by sending SIGTERM then SIGKILL', async () => {
      vi.useFakeTimers();
      let childRef: FakeChild | undefined;
      const { spawnCommand } = createFakeSpawn(({ child }) => {
        childRef = child;
      });
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 10, spawnCommand);

      const assertion = expect(storage.load('token-cache')).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(1010);
      await assertion;

      expect(childRef?.kill).toHaveBeenCalledWith('SIGTERM');
      expect(childRef?.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('rejects unknown storage keys before spawning', async () => {
      const { spawnCommand } = createFakeSpawn(({ child }) => closeChild(child));
      const storage = new CommandTokenCacheStorage('/cache-wrapper', 1000, spawnCommand);

      await expect(storage.load('unknown' as TokenCacheStorageKey)).rejects.toThrow(/Unknown/);
      expect(spawnCommand).not.toHaveBeenCalled();
    });
  });
});

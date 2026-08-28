import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import logger from '../src/logger.js';
import {
  DefaultTokenCacheStorage,
  keytarEnabled,
  resetCacheKeyForTests,
} from '../src/token-cache-storage.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// keytar is a real dependency, so without this the suite would touch the developer's
// actual login keyring.
const keychain = new Map<string, string>();
const getPassword = vi.fn(async (service: string, account: string) => {
  return keychain.get(`${service}/${account}`) ?? null;
});
const setPassword = vi.fn(async (service: string, account: string, value: string) => {
  keychain.set(`${service}/${account}`, value);
});
const deletePassword = vi.fn(async (service: string, account: string) => {
  return keychain.delete(`${service}/${account}`);
});

vi.mock('keytar', () => ({
  default: { getPassword, setPassword, deletePassword },
}));

let tmpDir: string;
let cachePath: string;

beforeEach(() => {
  vi.clearAllMocks();
  keychain.clear();
  resetCacheKeyForTests();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-keytar-opt-out-'));
  cachePath = path.join(tmpDir, 'token-cache.json');
  vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', cachePath);
  vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', path.join(tmpDir, 'selected-account.json'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const keyFile = () => path.join(tmpDir, '.cache-key');

describe('keytarEnabled', () => {
  it('is on when the variable is unset', () => {
    expect(keytarEnabled()).toBe(true);
  });

  for (const value of ['0', 'false', 'no', 'FALSE', ' 0 ']) {
    it(`is off for ${JSON.stringify(value)}`, () => {
      vi.stubEnv('MS365_MCP_USE_KEYTAR', value);
      expect(keytarEnabled()).toBe(false);
    });
  }

  // Anything else keeps the credential store, so a typo cannot quietly move the key to
  // disk. Only the documented off values turn it off.
  for (const value of ['1', 'true', 'yes', '']) {
    it(`stays on for ${JSON.stringify(value)}`, () => {
      vi.stubEnv('MS365_MCP_USE_KEYTAR', value);
      expect(keytarEnabled()).toBe(true);
    });
  }
});

describe('DefaultTokenCacheStorage with keytar off', () => {
  it('never touches the credential store', async () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    const storage = new DefaultTokenCacheStorage();

    await storage.save('token-cache', '{"account":"a"}');
    await expect(storage.load('token-cache')).resolves.toBe('{"account":"a"}');
    await storage.delete('token-cache');

    expect(getPassword).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(deletePassword).not.toHaveBeenCalled();
  });

  it('puts the key in a file even where the credential store works', async () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    await new DefaultTokenCacheStorage().save('token-cache', '{"account":"a"}');

    expect(fs.existsSync(keyFile())).toBe(true);
    expect(keychain.size).toBe(0);
  });

  it('still uses the credential store by default', async () => {
    const storage = new DefaultTokenCacheStorage();
    await storage.save('token-cache', '{"account":"a"}');
    await expect(storage.load('token-cache')).resolves.toBe('{"account":"a"}');

    expect(setPassword).toHaveBeenCalled();
    expect(fs.existsSync(keyFile())).toBe(false);
  });
});

describe('opting out with a cache already encrypted under a keychain key', () => {
  // The flag would otherwise be a one-way trip: the cache cannot be decrypted without
  // the keychain, and assertOverwritable refuses to replace what it cannot read, so
  // every later start would fail to save. See #573.
  async function seedKeychainEncryptedCache() {
    const storage = new DefaultTokenCacheStorage();
    await storage.save('token-cache', '{"account":"seeded"}');
    expect(keychain.size).toBe(1);
    resetCacheKeyForTests();
  }

  it('re-authenticates instead of failing to save', async () => {
    await seedKeychainEncryptedCache();
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');

    const storage = new DefaultTokenCacheStorage();
    // Nothing on hand opens the old cache, so MSAL is told there is no session.
    await expect(storage.load('token-cache')).resolves.toBeUndefined();
    // The sign-in that follows must land rather than throw.
    await storage.save('token-cache', '{"account":"fresh"}');

    resetCacheKeyForTests();
    await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBe(
      '{"account":"fresh"}'
    );
    expect(fs.existsSync(keyFile())).toBe(true);
  });

  it('explains the replacement once, not once per overwritability check', async () => {
    await seedKeychainEncryptedCache();
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');

    await new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}');

    const warnings = vi
      .mocked(logger.warn)
      .mock.calls.filter(([message]) => String(message).includes('MS365_MCP_USE_KEYTAR is off'));
    expect(warnings).toHaveLength(1);
  });

  it('keeps refusing when the file is damaged rather than merely unreadable', async () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    fs.writeFileSync(cachePath, 'not json and not an envelope', { mode: 0o600 });

    await expect(new DefaultTokenCacheStorage().save('token-cache', '{"a":1}')).rejects.toThrow(
      /Refusing to overwrite/
    );
    expect(fs.readFileSync(cachePath, 'utf8')).toBe('not json and not an envelope');
  });

  it('still refuses when keytar is on and the keychain is simply unreachable', async () => {
    await seedKeychainEncryptedCache();
    keychain.clear();
    getPassword.mockRejectedValueOnce(new Error('keyring is locked'));

    await expect(
      new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}')
    ).rejects.toThrow(/Refusing to overwrite/);
  });
});

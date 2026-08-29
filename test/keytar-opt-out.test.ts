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

const readFromKeychain = async (service: string, account: string) =>
  keychain.get(`${service}/${account}`) ?? null;

let tmpDir: string;
let cachePath: string;

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks resets calls, not implementations, and this config sets neither
  // mockReset nor restoreMocks. Without this a test that makes getPassword reject leaks
  // that into every test after it.
  getPassword.mockImplementation(readFromKeychain);
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

// Forces readFileSync to fail with EISDIR. Preferred over chmod 000, which root ignores,
// so this holds in a container running as root the same as it does locally.
const makeKeyFileUnreadable = () => {
  fs.rmSync(keyFile(), { force: true });
  fs.mkdirSync(keyFile());
};

describe('keytarEnabled', () => {
  it('is on when the variable is unset', () => {
    expect(keytarEnabled()).toBe(true);
  });

  for (const value of ['0', 'false', 'no', 'off', 'FALSE', 'Off', ' 0 ']) {
    it(`is off for ${JSON.stringify(value)}`, () => {
      vi.stubEnv('MS365_MCP_USE_KEYTAR', value);
      expect(keytarEnabled()).toBe(false);
    });
  }

  // Anything else keeps the credential store, so a typo cannot quietly move the key to
  // disk. Only the documented off values turn it off.
  for (const value of ['1', 'true', 'yes', 'on', '']) {
    it(`stays on for ${JSON.stringify(value)}`, () => {
      vi.stubEnv('MS365_MCP_USE_KEYTAR', value);
      expect(keytarEnabled()).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  }

  // A switch that silently does nothing is worst precisely here, where it gets set
  // because keytar is already misbehaving.
  it('warns once about a value it does not understand, and keeps keytar on', () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', 'disabled');

    expect(keytarEnabled()).toBe(true);
    expect(keytarEnabled()).toBe(true);

    const warnings = vi
      .mocked(logger.warn)
      .mock.calls.filter(([m]) => String(m).includes('not a value this understands'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0][0]).toContain('"disabled"');
  });
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

  it('keeps refusing when the file is not a recognisable cache at all', async () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    fs.writeFileSync(cachePath, 'not json and not an envelope', { mode: 0o600 });

    await expect(new DefaultTokenCacheStorage().save('token-cache', '{"a":1}')).rejects.toThrow(
      /Refusing to overwrite/
    );
    expect(fs.readFileSync(cachePath, 'utf8')).toBe('not json and not an envelope');
  });

  // The branch above never sets noKeyMatched, so on its own it says nothing about the
  // escape. This one does: a well-formed envelope with a good key beside it, failing only
  // its authentication tag. Damage, not a missing key, and the refusal has to hold.
  it('keeps refusing a damaged envelope when the key file is present and fine', async () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    await new DefaultTokenCacheStorage().save('token-cache', '{"account":"seeded"}');
    resetCacheKeyForTests();

    const envelope = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const data = Buffer.from(envelope.data, 'base64');
    data[data.length - 1] ^= 0xff;
    envelope.data = data.toString('base64');
    const damaged = JSON.stringify(envelope);
    fs.writeFileSync(cachePath, damaged, { mode: 0o600 });

    await expect(
      new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}')
    ).rejects.toThrow(/Refusing to overwrite/);
    expect(fs.readFileSync(cachePath, 'utf8')).toBe(damaged);
  });

  it('still refuses when keytar is on and the keychain is locked', async () => {
    await seedKeychainEncryptedCache();
    // Left populated on purpose: clearing it would refuse via the empty-key path and the
    // rejection below would prove nothing.
    getPassword.mockRejectedValue(new Error('keyring is locked'));

    await expect(
      new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}')
    ).rejects.toThrow(/Refusing to overwrite/);
    expect(vi.mocked(logger.warn).mock.calls.map(([m]) => String(m))).toContainEqual(
      expect.stringContaining('Keychain access failed')
    );
  });
});

describe('opting out with a key file that exists but will not read', () => {
  // The escape must not read an unreadable key file as "there was never a key here".
  // Getting this wrong loses the cache and then, via persistCacheKey's replace path, the
  // key that would have opened it once the permissions were fixed.
  async function seedFileEncryptedCache() {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    await new DefaultTokenCacheStorage().save('token-cache', '{"account":"seeded"}');
    expect(fs.existsSync(keyFile())).toBe(true);
    resetCacheKeyForTests();
  }

  it('refuses to overwrite, and leaves both the cache and the key file alone', async () => {
    await seedFileEncryptedCache();
    const encryptedCache = fs.readFileSync(cachePath, 'utf8');
    const goodKey = fs.readFileSync(keyFile(), 'utf8');
    makeKeyFileUnreadable();

    await expect(
      new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}')
    ).rejects.toThrow(/Refusing to overwrite/);

    expect(fs.readFileSync(cachePath, 'utf8')).toBe(encryptedCache);

    // Recoverable: putting the real key back opens the original cache again.
    fs.rmSync(keyFile(), { recursive: true, force: true });
    fs.writeFileSync(keyFile(), goodKey, { mode: 0o600 });
    resetCacheKeyForTests();
    await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBe(
      '{"account":"seeded"}'
    );
  });

  it('says the key file is the problem rather than blaming a missing key', async () => {
    await seedFileEncryptedCache();
    makeKeyFileUnreadable();

    await expect(new DefaultTokenCacheStorage().save('token-cache', '{"a":1}')).rejects.toThrow();

    expect(vi.mocked(logger.warn).mock.calls.map(([m]) => String(m))).toContainEqual(
      expect.stringContaining('a key file is present but could not be read')
    );
  });

  it('still replaces the cache when the key file is genuinely gone', async () => {
    await seedFileEncryptedCache();
    fs.rmSync(keyFile());

    await new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}');

    resetCacheKeyForTests();
    await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBe(
      '{"account":"fresh"}'
    );
    expect(vi.mocked(logger.warn).mock.calls.map(([m]) => String(m))).toContainEqual(
      expect.stringContaining('no auth cache key on this machine')
    );
  });

  // The mirror case: read fine, definitively not a key. Nothing can have been encrypted
  // under it, so it counts as no key at all and the cache is replaced rather than stranded.
  it('replaces the cache when the key file is readable but not a key', async () => {
    await seedFileEncryptedCache();
    fs.writeFileSync(keyFile(), 'not a key', { mode: 0o600 });

    await new DefaultTokenCacheStorage().save('token-cache', '{"account":"fresh"}');

    resetCacheKeyForTests();
    await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBe(
      '{"account":"fresh"}'
    );
  });
});

// The save that does the damage is the one whose own cache is absent: assertOverwritable
// returns early without ever consulting the key, so only resolveEncryptionKey stands
// between an unreadable .cache-key and persistCacheKey deleting it - along with the
// sibling cache written under it, which nothing in this save ever looked at.
//
// The assertions match resolveEncryptionKey's wording specifically. persistCacheKey has a
// near-identical refusal guarding the same delete, and a looser match passes on either,
// which would leave the guard that actually runs here unpinned. That second one is a
// backstop for a key file appearing between the state read and the write, which is a race
// this test cannot stage.
describe('a sibling cache sharing an unreadable key file', () => {
  it('does not destroy the key when saving a cache that does not exist yet', async () => {
    vi.stubEnv('MS365_MCP_USE_KEYTAR', '0');
    const storage = new DefaultTokenCacheStorage();
    await storage.save('selected-account', '{"account":"kept"}');
    resetCacheKeyForTests();

    const goodKey = fs.readFileSync(keyFile(), 'utf8');
    makeKeyFileUnreadable();

    // token-cache has never been written, so its own overwritability check passes.
    await expect(
      new DefaultTokenCacheStorage().save('token-cache', '{"account":"new"}')
    ).rejects.toThrow(/minting over it would strand every cache encrypted under it/);

    // Putting the real key back must still open the sibling.
    fs.rmSync(keyFile(), { recursive: true, force: true });
    fs.writeFileSync(keyFile(), goodKey, { mode: 0o600 });
    resetCacheKeyForTests();
    await expect(new DefaultTokenCacheStorage().load('selected-account')).resolves.toBe(
      '{"account":"kept"}'
    );
  });
});

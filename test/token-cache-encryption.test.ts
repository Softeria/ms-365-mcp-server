import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encodeCacheKey,
  encryptCache,
  generateCacheKey,
  isEncryptedCache,
} from '../src/lib/cache-encryption.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// keytar is a real dependency here, so without this the suite would read and write the
// developer's actual login keyring.
const keychain = new Map<string, string>();
let keytarAvailable = true;
/** Reads fail while writes still work - a denied prompt rather than a dead keyring. */
let keytarReadFails = false;
/** Runs just after a successful setPassword, to stand in for a racing sibling process. */
let keychainSetHook: (() => void) | undefined;
const setPasswordCalls: Array<{ account: string; value: string }> = [];

vi.mock('keytar', () => ({
  default: {
    getPassword: vi.fn(async (service: string, account: string) => {
      if (!keytarAvailable) throw new Error('keychain unavailable');
      if (keytarReadFails) throw new Error('The user denied the keychain prompt.');
      return keychain.get(`${service}/${account}`) ?? null;
    }),
    setPassword: vi.fn(async (service: string, account: string, value: string) => {
      if (!keytarAvailable) throw new Error('The stub received bad data.');
      setPasswordCalls.push({ account, value });
      keychain.set(`${service}/${account}`, value);
      keychainSetHook?.();
    }),
    deletePassword: vi.fn(async (service: string, account: string) => {
      if (!keytarAvailable) throw new Error('keychain unavailable');
      return keychain.delete(`${service}/${account}`);
    }),
  },
}));

const { DefaultTokenCacheStorage, getCacheKeyPath, resetCacheKeyForTests, wrapCache, unwrapCache } =
  await import('../src/token-cache-storage.js');
const { default: logger } = await import('../src/logger.js');

const SERVICE = 'ms-365-mcp-server';

describe('encrypted token cache storage', () => {
  const originalPlatform = process.platform;
  let dir: string;
  let cachePath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-cache-enc-'));
    cachePath = path.join(dir, '.token-cache.json');
    keychain.clear();
    keytarAvailable = true;
    keytarReadFails = false;
    keychainSetHook = undefined;
    setPasswordCalls.length = 0;
    // The logger mock is created once for the file, so its calls accumulate across tests
    // unless each one starts from zero.
    vi.mocked(logger.warn).mockClear();
    vi.mocked(logger.info).mockClear();
    resetCacheKeyForTests();
    vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', cachePath);
    vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', path.join(dir, '.selected-account.json'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes ciphertext to disk and reads it back', async () => {
    const storage = new DefaultTokenCacheStorage();
    const value = wrapCache('{"RefreshToken":{"secret":"do-not-leak"}}');

    await storage.save('token-cache', value);

    const onDisk = fs.readFileSync(cachePath, 'utf8');
    expect(onDisk).not.toContain('do-not-leak');
    expect(isEncryptedCache(onDisk)).toBe(true);
    expect(await storage.load('token-cache')).toBe(value);
  });

  it('keeps only the key in the keychain, never the cache', async () => {
    const storage = new DefaultTokenCacheStorage();

    await storage.save('token-cache', wrapCache('{"RefreshToken":{}}'));

    expect([...keychain.keys()]).toEqual([`${SERVICE}/cache-key`]);
    expect(Buffer.from(keychain.get(`${SERVICE}/cache-key`)!, 'base64')).toHaveLength(32);
  });

  it('writes the cache file with owner-only permissions', async () => {
    if (process.platform === 'win32') return;
    const storage = new DefaultTokenCacheStorage();

    await storage.save('token-cache', wrapCache('secret'));

    expect(fs.statSync(cachePath).mode & 0o777).toBe(0o600);
  });

  describe('without a keychain', () => {
    beforeEach(() => {
      keytarAvailable = false;
    });

    it('falls back to a key file beside the cache and still round-trips', async () => {
      const storage = new DefaultTokenCacheStorage();
      const value = wrapCache('{"RefreshToken":{"secret":"do-not-leak"}}');

      await storage.save('token-cache', value);

      const keyPath = getCacheKeyPath();
      expect(keyPath).toBe(path.join(dir, '.cache-key'));
      expect(fs.readFileSync(cachePath, 'utf8')).not.toContain('do-not-leak');
      expect(await storage.load('token-cache')).toBe(value);
    });

    it('writes the key file with owner-only permissions', async () => {
      if (process.platform === 'win32') return;
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));

      expect(fs.statSync(getCacheKeyPath()).mode & 0o777).toBe(0o600);
    });

    it('reuses an existing key file across processes', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('first'));
      const key = fs.readFileSync(getCacheKeyPath(), 'utf8');

      resetCacheKeyForTests();
      const reloaded = await new DefaultTokenCacheStorage().load('token-cache');

      expect(unwrapCache(reloaded!).data).toBe('first');
      expect(fs.readFileSync(getCacheKeyPath(), 'utf8')).toBe(key);
    });
  });

  describe('recovery', () => {
    it('reports no cache when the key is gone, but leaves the file alone', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));

      keychain.clear();
      resetCacheKeyForTests();

      await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBeUndefined();
      expect(fs.existsSync(cachePath)).toBe(true);
    });

    it('does not trust a tampered cache, and still leaves the file alone', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      const envelope = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const data = Buffer.from(envelope.data, 'base64');
      data[0] ^= 0xff;
      fs.writeFileSync(cachePath, JSON.stringify({ ...envelope, data: data.toString('base64') }));
      resetCacheKeyForTests();

      await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBeUndefined();
      expect(fs.existsSync(cachePath)).toBe(true);
    });

    // The whole point of not deleting: a locked keyring is usually temporary, and the
    // cache has to survive it.
    it('recovers the cache once a temporarily unreadable keychain works again', async () => {
      const value = wrapCache('survives-a-locked-keyring');
      await new DefaultTokenCacheStorage().save('token-cache', value);

      keytarAvailable = false;
      resetCacheKeyForTests();
      await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBeUndefined();

      keytarAvailable = true;
      resetCacheKeyForTests();
      await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBe(value);
    });

    // Leaving the file in place achieves nothing on its own: the sign-in that follows
    // calls save() against the same path.
    it('refuses to overwrite a cache it could not decrypt', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('accounts-a-and-b'));
      const ciphertext = fs.readFileSync(cachePath, 'utf8');

      keytarAvailable = false;
      resetCacheKeyForTests();
      const storage = new DefaultTokenCacheStorage();
      await expect(storage.load('token-cache')).resolves.toBeUndefined();

      await expect(storage.save('token-cache', wrapCache('only-account-a'))).rejects.toThrow(
        /Refusing to overwrite/
      );
      expect(fs.readFileSync(cachePath, 'utf8')).toBe(ciphertext);
    });

    // The refusal is what makes the recovery real: once the key reads again the original
    // cache is still exactly where it was.
    it('still has the original cache after the keychain comes back', async () => {
      const original = wrapCache('accounts-a-and-b');
      await new DefaultTokenCacheStorage().save('token-cache', original);

      keytarAvailable = false;
      resetCacheKeyForTests();
      const blind = new DefaultTokenCacheStorage();
      await blind.load('token-cache');
      await expect(blind.save('token-cache', wrapCache('only-account-a'))).rejects.toThrow();

      keytarAvailable = true;
      resetCacheKeyForTests();
      await expect(new DefaultTokenCacheStorage().load('token-cache')).resolves.toBe(original);
    });

    it('only warns once however many refreshes are refused', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      keytarAvailable = false;
      resetCacheKeyForTests();

      const storage = new DefaultTokenCacheStorage();
      await storage.load('token-cache');
      for (let i = 0; i < 3; i += 1) {
        await expect(storage.save('token-cache', wrapCache(`refresh-${i}`))).rejects.toThrow();
      }

      const warnings = vi
        .mocked(logger.warn)
        .mock.calls.filter(([message]) => String(message).includes('Not persisting'));
      expect(warnings).toHaveLength(1);
    });

    // Anything not positively identified must be treated as worth keeping. These are the
    // cases that used to slip past a flag set during load and get overwritten.
    it('refuses to overwrite a cache it cannot read at all', async () => {
      if (process.platform === 'win32') return;
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      const ciphertext = fs.readFileSync(cachePath, 'utf8');
      fs.chmodSync(cachePath, 0o000);

      try {
        const storage = new DefaultTokenCacheStorage();
        await expect(storage.load('token-cache')).resolves.toBeUndefined();
        await expect(storage.save('token-cache', wrapCache('fresh'))).rejects.toThrow(
          /Refusing to overwrite/
        );
      } finally {
        fs.chmodSync(cachePath, 0o600);
      }
      expect(fs.readFileSync(cachePath, 'utf8')).toBe(ciphertext);
    });

    it('refuses to overwrite a truncated ciphertext rather than calling it plaintext', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      const truncated = fs.readFileSync(cachePath, 'utf8').slice(0, 40);
      fs.writeFileSync(cachePath, truncated);

      const storage = new DefaultTokenCacheStorage();
      // Not handed to MSAL as if it were the cache body, either.
      await expect(storage.load('token-cache')).resolves.toBeUndefined();
      await expect(storage.save('token-cache', wrapCache('fresh'))).rejects.toThrow(
        /Refusing to overwrite/
      );
      expect(fs.readFileSync(cachePath, 'utf8')).toBe(truncated);
    });

    it('still overwrites an empty file, which holds nothing to lose', async () => {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(cachePath, '');

      const storage = new DefaultTokenCacheStorage();
      const value = wrapCache('fresh');
      await expect(storage.save('token-cache', value)).resolves.toBeUndefined();
      expect(await storage.load('token-cache')).toBe(value);
    });

    // logout and login are both tools in one long-lived process, so a refusal that
    // outlives the file it was protecting silently swallows the re-login.
    it('stops refusing once the cache is deleted', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      keytarAvailable = false;
      resetCacheKeyForTests();

      const storage = new DefaultTokenCacheStorage();
      await storage.load('token-cache');
      await expect(storage.save('token-cache', wrapCache('blocked'))).rejects.toThrow();

      await storage.delete('token-cache');
      const afterLogin = wrapCache('signed-in-again');
      await expect(storage.save('token-cache', afterLogin)).resolves.toBeUndefined();
      expect(await storage.load('token-cache')).toBe(afterLogin);
    });

    it('stops refusing when the cache file is removed from underneath it', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      keytarAvailable = false;
      resetCacheKeyForTests();

      const storage = new DefaultTokenCacheStorage();
      await storage.load('token-cache');
      await expect(storage.save('token-cache', wrapCache('blocked'))).rejects.toThrow();

      // What the warning tells the user to do.
      fs.unlinkSync(cachePath);
      await expect(storage.save('token-cache', wrapCache('fresh'))).resolves.toBeUndefined();
    });

    it('stops refusing once a load can decrypt again', async () => {
      const original = wrapCache('secret');
      await new DefaultTokenCacheStorage().save('token-cache', original);
      keytarAvailable = false;
      resetCacheKeyForTests();

      const storage = new DefaultTokenCacheStorage();
      await storage.load('token-cache');
      await expect(storage.save('token-cache', wrapCache('blocked'))).rejects.toThrow();

      // Same process, keychain readable again: the next load clears the refusal.
      keytarAvailable = true;
      expect(await storage.load('token-cache')).toBe(original);
      await expect(storage.save('token-cache', wrapCache('rotated'))).resolves.toBeUndefined();
    });

    // A cache that has nothing to do with this key must still be writable.
    it('does not block the other storage key', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      keytarAvailable = false;
      resetCacheKeyForTests();

      const storage = new DefaultTokenCacheStorage();
      await storage.load('token-cache');
      const account = wrapCache('{"accountId":"x"}');

      await expect(storage.save('selected-account', account)).resolves.toBeUndefined();
      expect(await storage.load('selected-account')).toBe(account);
    });

    // A read failure is not proof the key is absent, so it must not be replaced. The
    // mint has to happen on a cache with no file yet, because a save over an existing
    // one is refused before it ever gets as far as needing a key.
    it('does not overwrite the stored key when the keychain cannot be read', async () => {
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));
      const original = keychain.get(`${SERVICE}/cache-key`);

      keytarReadFails = true;
      resetCacheKeyForTests();
      await new DefaultTokenCacheStorage().save('selected-account', wrapCache('{"a":1}'));

      expect(keychain.get(`${SERVICE}/cache-key`)).toBe(original);
      // The new key went to a file instead, so both are candidates afterwards.
      expect(fs.existsSync(getCacheKeyPath())).toBe(true);
    });

    // Desktop session and container against the same config dir end up with a key in
    // each home. Preferring the keychain key for writing meant the desktop re-encrypted
    // under a key the container cannot read: one forced login per alternation, forever.
    it('writes under the key both environments can read', async () => {
      // Desktop: token-cache under the keychain key.
      const onDesktop = wrapCache('written-on-desktop');
      await new DefaultTokenCacheStorage().save('token-cache', onDesktop);
      expect(keychain.has(`${SERVICE}/cache-key`)).toBe(true);

      // Keyring unreachable. token-cache is protected, but selected-account has no file
      // yet, so that save mints the second key. Both homes now hold one.
      keytarAvailable = false;
      resetCacheKeyForTests();
      const headless = new DefaultTokenCacheStorage();
      await expect(headless.save('token-cache', wrapCache('blocked'))).rejects.toThrow();
      await headless.save('selected-account', wrapCache('{"a":1}'));
      expect(fs.existsSync(getCacheKeyPath())).toBe(true);

      // Desktop back: reads under the keychain key, but must rewrite under the file key.
      keytarAvailable = true;
      resetCacheKeyForTests();
      const desktop = new DefaultTokenCacheStorage();
      expect(await desktop.load('token-cache')).toBe(onDesktop);
      const rewritten = wrapCache('rewritten-on-desktop');
      await desktop.save('token-cache', rewritten);

      // Which is what the headless side needs in order to read it at all.
      keytarAvailable = false;
      resetCacheKeyForTests();
      expect(await new DefaultTokenCacheStorage().load('token-cache')).toBe(rewritten);
    });
  });

  describe('concurrency', () => {
    // Two cache accesses in flight at once must not each mint a key: the loser's
    // ciphertext would be unreadable under the winner's key.
    it('mints one key for concurrent savers rather than one each', async () => {
      const storage = new DefaultTokenCacheStorage();
      const tokenValue = wrapCache('a');
      const accountValue = wrapCache('b');

      await Promise.all([
        storage.save('token-cache', tokenValue),
        storage.save('selected-account', accountValue),
      ]);

      expect(setPasswordCalls.filter((call) => call.account === 'cache-key')).toHaveLength(1);
      resetCacheKeyForTests();
      expect(await storage.load('token-cache')).toBe(tokenValue);
      expect(await storage.load('selected-account')).toBe(accountValue);
    });

    // The key file must never appear before its contents: a sibling reading it empty
    // would treat it as corrupt and replace the key it is about to encrypt under.
    it('never publishes a key file that is empty or partial', async () => {
      keytarAvailable = false;
      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));

      expect(fs.readFileSync(getCacheKeyPath(), 'utf8').trim()).toHaveLength(44);
      expect(fs.readdirSync(dir).filter((entry) => entry.endsWith('.tmp'))).toEqual([]);
    });

    it('adopts a valid key file rather than replacing it', async () => {
      keytarAvailable = false;
      const sibling = encodeCacheKey(generateCacheKey());
      fs.writeFileSync(getCacheKeyPath(), sibling, { mode: 0o600 });

      await new DefaultTokenCacheStorage().save('token-cache', wrapCache('secret'));

      expect(fs.readFileSync(getCacheKeyPath(), 'utf8')).toBe(sibling);
    });

    // A genuinely corrupt key file must not brick every save for the process lifetime.
    it('replaces a corrupt key file instead of failing forever', async () => {
      keytarAvailable = false;
      fs.writeFileSync(getCacheKeyPath(), 'not-a-key', { mode: 0o600 });

      const storage = new DefaultTokenCacheStorage();
      const value = wrapCache('secret');
      await expect(storage.save('token-cache', value)).resolves.toBeUndefined();

      resetCacheKeyForTests();
      expect(await storage.load('token-cache')).toBe(value);
    });

    // A stale memoized encryption key outliving its key state is unrecoverable: the cache
    // gets written under a key stored nowhere, and the refusal then makes that permanent.
    it('does not keep encrypting under a key the keychain no longer holds', async () => {
      const storage = new DefaultTokenCacheStorage();
      await storage.save('token-cache', wrapCache('ours'));

      // A sibling mints its own key, overwrites ours in the keychain, and rewrites the
      // cache under it.
      const sibling = generateCacheKey();
      keychain.set(`${SERVICE}/cache-key`, encodeCacheKey(sibling));
      const theirs = wrapCache('theirs');
      fs.writeFileSync(cachePath, encryptCache(theirs, sibling, 'token-cache'));

      // First load fails on our stale key state and resets it; the next one succeeds.
      await expect(storage.load('token-cache')).resolves.toBeUndefined();
      expect(await storage.load('token-cache')).toBe(theirs);

      // The save that follows must use the sibling's key, not our stale one.
      const rotated = wrapCache('rotated');
      await storage.save('token-cache', rotated);

      resetCacheKeyForTests();
      expect(await new DefaultTokenCacheStorage().load('token-cache')).toBe(rotated);
    });

    it('adopts the key a sibling process stored first', async () => {
      const sibling = encodeCacheKey(generateCacheKey());
      // The sibling lands its key right after ours, so our write-back sees theirs.
      keychainSetHook = () => {
        keychainSetHook = undefined;
        keychain.set(`${SERVICE}/cache-key`, sibling);
      };

      const value = wrapCache('secret');
      await new DefaultTokenCacheStorage().save('token-cache', value);

      // We encrypted under the adopted key, so the sibling's key is the only one needed.
      expect(keychain.get(`${SERVICE}/cache-key`)).toBe(sibling);
      resetCacheKeyForTests();
      expect(await new DefaultTokenCacheStorage().load('token-cache')).toBe(value);
    });
  });

  describe('migration from the previous format', () => {
    it('reads a plaintext cache and re-encrypts it on the next save', async () => {
      const legacy = wrapCache('{"RefreshToken":{"secret":"do-not-leak"}}');
      fs.writeFileSync(cachePath, legacy);
      const storage = new DefaultTokenCacheStorage();

      expect(await storage.load('token-cache')).toBe(legacy);

      await storage.save('token-cache', legacy);
      const onDisk = fs.readFileSync(cachePath, 'utf8');
      expect(isEncryptedCache(onDisk)).toBe(true);
      expect(onDisk).not.toContain('do-not-leak');
    });

    it('adopts a cache still living in the keychain, then clears that entry', async () => {
      const legacy = wrapCache('{"RefreshToken":{}}');
      keychain.set(`${SERVICE}/msal-token-cache`, legacy);
      const storage = new DefaultTokenCacheStorage();

      expect(await storage.load('token-cache')).toBe(legacy);

      await storage.save('token-cache', legacy);
      expect(keychain.has(`${SERVICE}/msal-token-cache`)).toBe(false);
      expect(isEncryptedCache(fs.readFileSync(cachePath, 'utf8'))).toBe(true);
    });

    it('prefers whichever of keychain and disk was written last', async () => {
      const older = JSON.stringify({ _cacheEnvelope: true, data: 'older', savedAt: 1000 });
      const newer = JSON.stringify({ _cacheEnvelope: true, data: 'newer', savedAt: 2000 });
      keychain.set(`${SERVICE}/msal-token-cache`, older);
      fs.writeFileSync(cachePath, newer);

      const loaded = await new DefaultTokenCacheStorage().load('token-cache');

      expect(unwrapCache(loaded!).data).toBe('newer');
    });
  });
});

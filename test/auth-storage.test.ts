import type { AccountInfo, Configuration } from '@azure/msal-node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthManager, { buildDiskCoherencyCachePlugin } from '../src/auth.js';
import { clearSecretsCache } from '../src/secrets.js';
import { shouldUseLocalAuthStorage } from '../src/startup-pinning.js';
import type { TokenCacheStorage } from '../src/token-cache-storage.js';
import { unwrapCache, wrapCache } from '../src/token-cache-storage.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const msalConfig: Configuration = {
  auth: {
    clientId: 'test-client',
    authority: 'https://login.microsoftonline.com/common',
  },
};

const account = {
  username: 'user@example.com',
  name: 'User',
  homeAccountId: 'account.home',
} as AccountInfo;

function createStorage(overrides: Partial<TokenCacheStorage> = {}): TokenCacheStorage {
  return {
    description: 'mock-storage',
    failClosed: true,
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAuth(storage: TokenCacheStorage, accounts: AccountInfo[] = [account]) {
  const tokenCache = {
    serialize: vi.fn().mockReturnValue('serialized-cache'),
    deserialize: vi.fn(),
    getAllAccounts: vi.fn().mockResolvedValue(accounts),
    removeAccount: vi.fn().mockResolvedValue(undefined),
  };
  const msalApp = {
    getTokenCache: vi.fn(() => tokenCache),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: 'silent-token',
      expiresOn: new Date(Date.now() + 60_000),
    }),
    acquireTokenByDeviceCode: vi.fn(),
    acquireTokenInteractive: vi.fn(),
  };
  const auth = new AuthManager(msalConfig, ['User.Read'], undefined, storage);

  Object.assign(auth as unknown as Record<string, unknown>, { msalApp });

  return { auth, msalApp, tokenCache };
}

describe('AuthManager token cache storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    clearSecretsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearSecretsCache();
  });

  it('loads token cache and selected-account metadata through storage', async () => {
    const storage = createStorage({
      load: vi
        .fn()
        .mockResolvedValueOnce(wrapCache('serialized-cache'))
        .mockResolvedValueOnce(wrapCache(JSON.stringify({ accountId: 'account.home' }))),
    });
    const { auth, tokenCache } = createAuth(storage);

    await auth.loadTokenCache();

    expect(storage.load).toHaveBeenNthCalledWith(1, 'token-cache');
    expect(storage.load).toHaveBeenNthCalledWith(2, 'selected-account');
    expect(tokenCache.deserialize).toHaveBeenCalledWith('serialized-cache');
    expect(auth.getSelectedAccountId()).toBe('account.home');
  });

  it('saves the MSAL cache after silent token refresh', async () => {
    const storage = createStorage();
    const { auth } = createAuth(storage);

    await auth.getToken();

    expect(storage.save).toHaveBeenCalledWith('token-cache', expect.any(String));
    const saved = vi.mocked(storage.save).mock.calls[0][1];
    expect(unwrapCache(saved).data).toBe('serialized-cache');
  });

  it('saves selected-account metadata on account selection', async () => {
    const storage = createStorage();
    const { auth } = createAuth(storage);

    await auth.selectAccount('user@example.com');

    expect(storage.save).toHaveBeenCalledWith('selected-account', expect.any(String));
    const saved = vi.mocked(storage.save).mock.calls[0][1];
    expect(JSON.parse(unwrapCache(saved).data)).toEqual({ accountId: 'account.home' });
  });

  it('deletes both storage keys on logout', async () => {
    const storage = createStorage();
    const { auth } = createAuth(storage);

    await auth.logout();

    expect(storage.delete).toHaveBeenCalledWith('token-cache');
    expect(storage.delete).toHaveBeenCalledWith('selected-account');
  });

  it('rethrows fail-closed storage errors', async () => {
    const storage = createStorage({
      load: vi.fn().mockRejectedValue(new Error('storage unavailable')),
    });
    const { auth } = createAuth(storage);

    await expect(auth.loadTokenCache()).rejects.toThrow(/storage unavailable/);
  });

  it('preserves best-effort default behavior for non-strict storage errors', async () => {
    const storage = createStorage({
      failClosed: false,
      load: vi.fn().mockRejectedValue(new Error('best-effort miss')),
    });
    const { auth } = createAuth(storage);

    await expect(auth.loadTokenCache()).resolves.toBeUndefined();
  });

  it('disables command storage when create() builds fallback storage', async () => {
    vi.stubEnv('MS365_MCP_AUTH_CACHE_COMMAND', '   ');

    const auth = await AuthManager.create(['User.Read']);

    const storage = (auth as unknown as { storage: TokenCacheStorage }).storage;
    expect(storage.description).toBe('default (keytar+file)');
  });
});

interface FakeTokenCacheContext {
  cacheHasChanged: boolean;
  tokenCache: {
    serialize: () => string;
    deserialize: (data: string) => void;
  };
}

function fakeContext(
  serialized: string,
  cacheHasChanged: boolean
): { context: FakeTokenCacheContext; deserialized: string[] } {
  const deserialized: string[] = [];
  return {
    deserialized,
    context: {
      cacheHasChanged,
      tokenCache: {
        serialize: () => serialized,
        deserialize: (data: string) => {
          deserialized.push(data);
        },
      },
    },
  };
}

describe('disk coherency cache plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps sibling processes coherent: A persists a rotation, B reloads it', async () => {
    // One shared cache "file" backing two independent processes.
    let diskRaw: string | undefined;
    const storage = createStorage({
      load: vi.fn(async () => diskRaw),
      save: vi.fn(async (_key: string, value: string) => {
        diskRaw = value;
      }),
    });

    // Process A refreshes and rotates the refresh token, MSAL marks the cache changed.
    const pluginA = buildDiskCoherencyCachePlugin(storage);
    const a = fakeContext('rotated-cache', true);
    await pluginA.afterCacheAccess!(a.context as never);
    expect(storage.save).toHaveBeenCalledWith('token-cache', expect.any(String));
    expect(unwrapCache(diskRaw!).data).toBe('rotated-cache');

    // Process B accesses its cache later and must pick up A's rotation from disk.
    const pluginB = buildDiskCoherencyCachePlugin(storage);
    const b = fakeContext('stale-cache', false);
    await pluginB.beforeCacheAccess!(b.context as never);
    expect(b.deserialized).toEqual(['rotated-cache']);
  });

  it('does not persist when MSAL reports the cache is unchanged', async () => {
    const storage = createStorage();
    const plugin = buildDiskCoherencyCachePlugin(storage);
    const { context } = fakeContext('unchanged-cache', false);

    await plugin.afterCacheAccess!(context as never);

    expect(storage.save).not.toHaveBeenCalled();
  });

  it('rethrows fail-closed reload errors', async () => {
    const storage = createStorage({
      failClosed: true,
      load: vi.fn().mockRejectedValue(new Error('storage unavailable')),
    });
    const plugin = buildDiskCoherencyCachePlugin(storage);
    const { context } = fakeContext('cache', false);

    await expect(plugin.beforeCacheAccess!(context as never)).rejects.toThrow(
      /storage unavailable/
    );
  });

  it('swallows best-effort reload errors for non-strict storage', async () => {
    const storage = createStorage({
      failClosed: false,
      load: vi.fn().mockRejectedValue(new Error('best-effort miss')),
    });
    const plugin = buildDiskCoherencyCachePlugin(storage);
    const { context, deserialized } = fakeContext('cache', false);

    await expect(plugin.beforeCacheAccess!(context as never)).resolves.toBeUndefined();
    expect(deserialized).toEqual([]);
  });
});

describe('HTTP startup local storage selection', () => {
  it('skips local storage for stateless HTTP graph requests', () => {
    expect(shouldUseLocalAuthStorage({ http: true })).toBe(false);
    expect(shouldUseLocalAuthStorage({ http: true, obo: true })).toBe(false);
  });

  it('uses local storage when HTTP auth tools or account commands are explicit', () => {
    expect(shouldUseLocalAuthStorage({ http: true, enableAuthTools: true })).toBe(true);
    expect(shouldUseLocalAuthStorage({ http: true, login: true })).toBe(true);
    expect(shouldUseLocalAuthStorage({ http: true, listAccounts: true })).toBe(true);
  });

  it('uses local storage for stdio/local auth flows', () => {
    expect(shouldUseLocalAuthStorage({})).toBe(true);
  });
});

import type { AccountInfo, Configuration } from '@azure/msal-node';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthManager from '../src/auth.js';
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

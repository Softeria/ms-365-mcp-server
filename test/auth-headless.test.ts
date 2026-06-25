import type { AccountInfo, Configuration } from '@azure/msal-node';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthManager, {
  getSelectedAccountPath,
  getTokenCachePath,
  type ExpectedAccountOptions,
} from '../src/auth.js';
import { clearSecretsCache } from '../src/secrets.js';
import { DefaultTokenCacheStorage, type TokenCacheStorage } from '../src/token-cache-storage.js';
import { wrapCache } from '../src/token-cache-storage.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/secrets.js', () => ({
  getSecrets: vi.fn().mockResolvedValue({
    clientId: 'test-client',
    tenantId: 'common',
    cloudType: undefined,
  }),
  clearSecretsCache: vi.fn(),
}));

vi.mock('../src/cloud-config.js', () => ({
  getCloudEndpoints: vi.fn(() => ({
    graphApi: 'https://graph.microsoft.com',
  })),
  getDefaultClientId: vi.fn(() => 'test-client'),
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
    failClosed: false,
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAuth(
  storage: TokenCacheStorage,
  accounts: AccountInfo[] = [account],
  expectedAccount?: ExpectedAccountOptions
) {
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
  const auth = new AuthManager(msalConfig, ['User.Read'], expectedAccount, storage);

  Object.assign(auth as unknown as Record<string, unknown>, { msalApp });

  return { auth, msalApp, tokenCache };
}

let tempDirs: string[] = [];

function writeTokenFile(token: string, expiresIn: number, mtimeMs: number): string {
  const dir = mkdtempSync(join(tmpdir(), 'ms365-token-'));
  tempDirs.push(dir);
  const tokenFile = join(dir, 'token.json');
  writeFileSync(tokenFile, JSON.stringify({ access_token: token, expires_in: expiresIn }));
  const mtime = new Date(mtimeMs);
  utimesSync(tokenFile, mtime, mtime);
  return tokenFile;
}

function resetTestState(): void {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  clearSecretsCache();
  tempDirs = [];
}

function cleanupTestState(): void {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearSecretsCache();
  for (const dir of tempDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  tempDirs = [];
}

describe('auth cache path resolution', () => {
  beforeEach(() => {
    resetTestState();
  });

  afterEach(() => {
    cleanupTestState();
  });

  describe('getTokenCachePath()', () => {
    it('uses HOME-based fallback when override and XDG_DATA_HOME are unset', () => {
      const home = join(tmpdir(), 'ms365-home');
      vi.stubEnv('HOME', home);
      vi.stubEnv('USERPROFILE', home);
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', '');
      vi.stubEnv('XDG_DATA_HOME', '');
      vi.spyOn(os, 'homedir').mockReturnValue(home);

      expect(getTokenCachePath()).toBe(
        join(home, '.local', 'share', 'ms-365-mcp-server', '.token-cache.json')
      );
    });

    it('uses XDG_DATA_HOME when token cache override is unset', () => {
      const home = join(tmpdir(), 'ms365-home');
      const xdgDataHome = join(tmpdir(), 'ms365-xdg');
      vi.stubEnv('HOME', home);
      vi.stubEnv('USERPROFILE', home);
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', '');
      vi.stubEnv('XDG_DATA_HOME', xdgDataHome);
      vi.spyOn(os, 'homedir').mockReturnValue(home);

      expect(getTokenCachePath()).toBe(
        join(xdgDataHome, 'ms-365-mcp-server', '.token-cache.json')
      );
    });

    it('uses explicit token cache override before XDG_DATA_HOME and HOME', () => {
      const home = join(tmpdir(), 'ms365-home');
      const xdgDataHome = join(tmpdir(), 'ms365-xdg');
      const overridePath = join(tmpdir(), 'explicit-token-cache.json');
      vi.stubEnv('HOME', home);
      vi.stubEnv('USERPROFILE', home);
      vi.stubEnv('XDG_DATA_HOME', xdgDataHome);
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', overridePath);
      vi.spyOn(os, 'homedir').mockReturnValue(home);

      expect(getTokenCachePath()).toBe(overridePath);
    });
  });

  describe('getSelectedAccountPath()', () => {
    it('uses HOME-based fallback when override and XDG_DATA_HOME are unset', () => {
      const home = join(tmpdir(), 'ms365-home');
      vi.stubEnv('HOME', home);
      vi.stubEnv('USERPROFILE', home);
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', '');
      vi.stubEnv('XDG_DATA_HOME', '');
      vi.spyOn(os, 'homedir').mockReturnValue(home);

      expect(getSelectedAccountPath()).toBe(
        join(home, '.local', 'share', 'ms-365-mcp-server', '.selected-account.json')
      );
    });

    it('uses XDG_DATA_HOME when selected account override is unset', () => {
      const home = join(tmpdir(), 'ms365-home');
      const xdgDataHome = join(tmpdir(), 'ms365-xdg');
      vi.stubEnv('HOME', home);
      vi.stubEnv('USERPROFILE', home);
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', '');
      vi.stubEnv('XDG_DATA_HOME', xdgDataHome);
      vi.spyOn(os, 'homedir').mockReturnValue(home);

      expect(getSelectedAccountPath()).toBe(
        join(xdgDataHome, 'ms-365-mcp-server', '.selected-account.json')
      );
    });

    it('uses explicit selected account override before XDG_DATA_HOME and HOME', () => {
      const home = join(tmpdir(), 'ms365-home');
      const xdgDataHome = join(tmpdir(), 'ms365-xdg');
      const overridePath = join(tmpdir(), 'explicit-selected-account.json');
      vi.stubEnv('HOME', home);
      vi.stubEnv('USERPROFILE', home);
      vi.stubEnv('XDG_DATA_HOME', xdgDataHome);
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', overridePath);
      vi.spyOn(os, 'homedir').mockReturnValue(home);

      expect(getSelectedAccountPath()).toBe(overridePath);
    });
  });
});

describe('--list-accounts and --verify-login with missing cache', () => {
  beforeEach(() => {
    resetTestState();
  });

  afterEach(() => {
    cleanupTestState();
  });

  it('listAccounts() returns empty array when cache is missing', async () => {
    const storage = new DefaultTokenCacheStorage();
    const loadSpy = vi.spyOn(storage, 'load').mockResolvedValue(undefined);
    const { auth } = createAuth(storage, []);

    await auth.loadTokenCache();
    const result = await auth.listAccounts();

    expect(loadSpy).toHaveBeenCalledWith('token-cache');
    expect(loadSpy).toHaveBeenCalledWith('selected-account');
    expect(result).toEqual([]);
  });

  it('testLogin() returns failure when no token is available', async () => {
    const storage = new DefaultTokenCacheStorage();
    const loadSpy = vi.spyOn(storage, 'load').mockResolvedValue(undefined);
    const { auth } = createAuth(storage, []);

    await auth.loadTokenCache();
    const result = await auth.testLogin();

    expect(loadSpy).toHaveBeenCalledWith('token-cache');
    expect(loadSpy).toHaveBeenCalledWith('selected-account');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Login failed: No valid token found/);
  });
});

describe('token file pre-authentication', () => {
  beforeEach(() => {
    resetTestState();
  });

  afterEach(() => {
    cleanupTestState();
  });

  it('valid token file is returned without calling MSAL', async () => {
    const tokenFile = writeTokenFile('file-token', 3600, Date.now());
    vi.stubEnv('MS365_MCP_TOKEN_FILE', tokenFile);
    const storage = createStorage();
    const { auth, msalApp } = createAuth(storage);

    const token = await auth.getToken();

    expect(token).toBe('file-token');
    expect(msalApp.acquireTokenSilent).not.toHaveBeenCalled();
  });

  it('expired token file falls back to MSAL silent flow', async () => {
    // Mirrors auth-storage.test.ts coverage for token-file mtime expiry in this headless suite.
    const tokenFile = writeTokenFile('file-token', 60, Date.now() - 120_000);
    vi.stubEnv('MS365_MCP_TOKEN_FILE', tokenFile);
    const storage = createStorage();
    const { auth, msalApp } = createAuth(storage);
    msalApp.acquireTokenSilent.mockResolvedValue({
      accessToken: 'silent-token',
      expiresOn: new Date(Date.now() + 60_000),
    });

    const token = await auth.getToken();

    expect(token).toBe('silent-token');
    expect(msalApp.acquireTokenSilent).toHaveBeenCalled();
  });
});

describe('device code stdout guard', () => {
  beforeEach(() => {
    resetTestState();
  });

  afterEach(() => {
    cleanupTestState();
  });

  it('device code message goes to stderr, not stdout', async () => {
    const storage = createStorage();
    const { auth, msalApp } = createAuth(storage);
    msalApp.acquireTokenByDeviceCode.mockImplementation(
      async (request: { deviceCodeCallback: (response: { message: string }) => void }) => {
        request.deviceCodeCallback({
          message: 'Go to https://microsoft.com/devicelogin and enter code ABCD1234',
        });
        return {
          accessToken: 'dc-token',
          expiresOn: new Date(Date.now() + 3600_000),
          account: null,
          scopes: ['User.Read'],
        };
      }
    );
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const token = await auth.acquireTokenByDeviceCode();

    expect(token).toBe('dc-token');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('ABCD1234'));
    expect(stdoutSpy).not.toHaveBeenCalledWith(expect.stringContaining('ABCD1234'));
  });
});

describe('--verify-login happy path with populated cache', () => {
  beforeEach(() => {
    resetTestState();
  });

  afterEach(() => {
    cleanupTestState();
  });

  it('testLogin() returns success when cache has an account and Graph API responds OK', async () => {
    const storage = createStorage({
      load: vi
        .fn()
        .mockResolvedValueOnce(wrapCache('serialized-cache'))
        .mockResolvedValueOnce(wrapCache(JSON.stringify({ accountId: 'account.home' }))),
    });
    const { auth, msalApp } = createAuth(storage, [account]);
    msalApp.acquireTokenSilent.mockResolvedValue({
      accessToken: 'valid-token',
      expiresOn: new Date(Date.now() + 60_000),
    });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        displayName: 'Test User',
        userPrincipalName: 'user@example.com',
      }),
    });
    vi.stubGlobal('fetch', fetch);

    await auth.loadTokenCache();
    const result = await auth.testLogin();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Login successful');
    expect(result.userData?.displayName).toBe('Test User');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1.0/me'),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })
    );
  });
});

import type { AccountInfo, Configuration } from '@azure/msal-node';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthManager, { type ExpectedAccountOptions } from '../src/auth.js';
import {
  getExpectedAccountInertWarning,
  shouldAssertExpectedAccountAtStartup,
} from '../src/startup-pinning.js';

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

const personal = {
  username: 'Personal@Example.com',
  name: 'Personal User',
  homeAccountId: 'personal.home',
} as AccountInfo;

const work = {
  username: 'work@example.com',
  name: 'Work User',
  homeAccountId: 'work.home',
} as AccountInfo;

function createAuth(accounts: AccountInfo[], expectedAccount?: ExpectedAccountOptions) {
  const tokenCache = {
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
  const auth = new AuthManager(msalConfig, ['User.Read'], expectedAccount);

  Object.assign(auth as unknown as Record<string, unknown>, {
    msalApp,
    saveTokenCache: vi.fn(),
    saveSelectedAccount: vi.fn(),
  });

  return { auth, msalApp, tokenCache };
}

describe('strict expected account pinning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves expected usernames case-insensitively', async () => {
    const { auth } = createAuth([personal, work], {
      expectedUsername: ' personal@example.com ',
    });

    const account = await auth.getCurrentAccount();

    expect(account?.homeAccountId).toBe('personal.home');
  });

  it('matches expected homeAccountId exactly', async () => {
    const { auth } = createAuth([personal, work], {
      expectedHomeAccountId: 'work.home',
    });

    const account = await auth.getCurrentAccount();

    expect(account?.username).toBe('work@example.com');
  });

  it('fails fast when no cached account matches the pin', async () => {
    const { auth } = createAuth([personal], {
      expectedUsername: 'missing@example.com',
    });

    await expect(auth.assertExpectedAccountAvailable()).rejects.toThrow(
      /Expected Microsoft account/
    );
  });

  it('fails when username and homeAccountId pins resolve to different accounts', async () => {
    const { auth } = createAuth([personal, work], {
      expectedUsername: 'personal@example.com',
      expectedHomeAccountId: 'work.home',
    });

    await expect(auth.assertExpectedAccountAvailable()).rejects.toThrow(/pins conflict/);
  });

  it('uses the pinned account for silent token acquisition', async () => {
    const { auth, msalApp } = createAuth([personal, work], {
      expectedUsername: 'work@example.com',
    });

    await auth.getToken();

    expect(msalApp.acquireTokenSilent).toHaveBeenCalledWith(
      expect.objectContaining({
        account: work,
      })
    );
  });

  it('rejects explicit account overrides that do not match the pin', async () => {
    const { auth } = createAuth([personal, work], {
      expectedUsername: 'work@example.com',
    });

    await expect(auth.getTokenForAccount('personal@example.com')).rejects.toThrow(
      /does not match expected Microsoft account/
    );
  });

  it('rejects select-account values that do not match the pin', async () => {
    const { auth } = createAuth([personal, work], {
      expectedUsername: 'work@example.com',
    });

    await expect(auth.selectAccount('personal@example.com')).rejects.toThrow(
      /does not match expected Microsoft account/
    );
    expect(
      (auth as unknown as { saveSelectedAccount: ReturnType<typeof vi.fn> }).saveSelectedAccount
    ).not.toHaveBeenCalled();
  });

  it('does not persist a mismatched device-code login account', async () => {
    const { auth, msalApp, tokenCache } = createAuth([personal], {
      expectedUsername: 'work@example.com',
    });
    msalApp.acquireTokenByDeviceCode.mockResolvedValue({
      accessToken: 'bad-token',
      expiresOn: new Date(Date.now() + 60_000),
      account: personal,
      scopes: ['User.Read'],
    });

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(/does not match expected/);

    expect(tokenCache.removeAccount).toHaveBeenCalledWith(personal);
    expect(
      (auth as unknown as { saveTokenCache: ReturnType<typeof vi.fn> }).saveTokenCache
    ).not.toHaveBeenCalled();
    expect(
      (auth as unknown as { saveSelectedAccount: ReturnType<typeof vi.fn> }).saveSelectedAccount
    ).not.toHaveBeenCalled();
    expect((auth as unknown as { accessToken: string | null }).accessToken).toBeNull();
  });

  it('rejects login responses that do not include an account', async () => {
    const { auth, msalApp, tokenCache } = createAuth([], {
      expectedUsername: 'work@example.com',
    });
    msalApp.acquireTokenByDeviceCode.mockResolvedValue({
      accessToken: 'bad-token',
      expiresOn: new Date(Date.now() + 60_000),
      account: null,
      scopes: ['User.Read'],
    });

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(/did not return an account/);

    expect(tokenCache.removeAccount).not.toHaveBeenCalled();
    expect(
      (auth as unknown as { saveTokenCache: ReturnType<typeof vi.fn> }).saveTokenCache
    ).not.toHaveBeenCalled();
  });

  it('collapses effective multi-account mode when a pin is configured', async () => {
    const { auth } = createAuth([personal, work], {
      expectedUsername: 'work@example.com',
    });

    await expect(auth.isMultiAccount()).resolves.toBe(false);
  });

  it('leaves BYOT token mode inert for account pinning', async () => {
    const { auth, tokenCache } = createAuth([personal, work], {
      expectedUsername: 'work@example.com',
    });
    Object.assign(auth as unknown as Record<string, unknown>, {
      oauthToken: 'byot-token',
      isOAuthMode: true,
    });

    // Account switching is refused in OAuth/BYOT mode (discussion #467), and the
    // pinning logic stays inert: the MSAL cache is never consulted.
    await expect(auth.getTokenForAccount('personal@example.com')).rejects.toThrow(
      /Cannot switch to account 'personal@example.com'/
    );
    await expect(auth.getTokenForAccount()).resolves.toBe('byot-token');
    expect(tokenCache.getAllAccounts).not.toHaveBeenCalled();
  });
});

describe('expected account startup behavior', () => {
  const pinnedAuth = {
    hasExpectedAccount: () => true,
    isOAuthModeEnabled: () => false,
  };

  it('asserts pinned local stdio startup', () => {
    expect(shouldAssertExpectedAccountAtStartup({}, pinnedAuth)).toBe(true);
  });

  it('skips startup assertion and warns in HTTP mode', () => {
    expect(shouldAssertExpectedAccountAtStartup({ http: true }, pinnedAuth)).toBe(false);
    expect(getExpectedAccountInertWarning({ http: true }, pinnedAuth)).toContain('--http');
  });

  it('skips startup assertion and warns in OBO mode', () => {
    expect(shouldAssertExpectedAccountAtStartup({ obo: true }, pinnedAuth)).toBe(false);
    expect(getExpectedAccountInertWarning({ obo: true }, pinnedAuth)).toContain('--obo');
  });

  it('skips startup assertion and warns in BYOT mode', () => {
    const byotAuth = {
      hasExpectedAccount: () => true,
      isOAuthModeEnabled: () => true,
    };

    expect(shouldAssertExpectedAccountAtStartup({}, byotAuth)).toBe(false);
    expect(getExpectedAccountInertWarning({}, byotAuth)).toContain('MS365_MCP_OAUTH_TOKEN');
  });

  it('skips startup assertion for local account management commands', () => {
    expect(shouldAssertExpectedAccountAtStartup({ login: true }, pinnedAuth)).toBe(false);
    expect(shouldAssertExpectedAccountAtStartup({ verifyLogin: true }, pinnedAuth)).toBe(false);
    expect(
      shouldAssertExpectedAccountAtStartup({ removeAccount: 'personal.home' }, pinnedAuth)
    ).toBe(false);
  });
});

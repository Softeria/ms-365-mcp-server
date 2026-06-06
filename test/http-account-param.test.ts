/**
 * Regression tests for discussion #467:
 * "account parameter ignored in HTTP mode — always returns data for authenticated user"
 *
 * In HTTP/OAuth mode the Graph token is the connecting client's bearer; MSAL-cached
 * accounts cannot serve those requests. Previously a provided `account` parameter was
 * silently ignored and the bearer user's data returned. Now:
 *  - an `account` that doesn't match the bearer identity is refused with a clear error
 *  - an `account` matching the bearer's own identity passes through
 *  - AuthManager.getTokenForAccount throws on an identifier in OAuth mode
 *  - stdio / --trust-proxy-auth account routing is unchanged
 */
import type { AccountInfo, Configuration } from '@azure/msal-node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';
import GraphClient from '../src/graph-client.js';
import AuthManager from '../src/auth.js';
import { requestContext } from '../src/request-context.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'GET',
        path: '/me/messages',
        description: 'List mail messages',
        parameters: [],
      },
    ],
  },
}));

function makeJwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${body}.signature`;
}

const mockSecrets = {
  clientId: 'test-client',
  tenantId: 'common',
  cloudType: 'global' as const,
};

describe('Discussion #467: account parameter in HTTP/OAuth mode', () => {
  let server: McpServer;
  let originalFetch: typeof global.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedHandler: ((...args: any[]) => any) | undefined;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '1.0.0' });
    originalFetch = global.fetch;
    capturedHandler = undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(server, 'tool').mockImplementation(((...args: any[]) => {
      const name = args[0];
      const handler = args[args.length - 1];
      if (name === 'list-mail-messages' && typeof handler === 'function') {
        capturedHandler = handler;
      }
    }) as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function setup(authManagerOverrides: Record<string, unknown> = {}) {
    const fetchSpy = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ value: [] }),
      headers: new Headers(),
    }));
    global.fetch = fetchSpy;

    const mockAuthManager = {
      isOAuthModeEnabled: vi.fn().mockReturnValue(false),
      getTokenForAccount: vi.fn().mockResolvedValue('msal-token'),
      getToken: vi.fn().mockResolvedValue(null),
      ...authManagerOverrides,
    };

    const graphClient = new GraphClient(mockAuthManager as any, mockSecrets);
    registerGraphTools(server, graphClient, false, undefined, false, mockAuthManager as any, true, [
      'user1@domain.com',
      'user2@domain.com',
    ]);
    expect(capturedHandler).toBeDefined();
    return { fetchSpy, mockAuthManager };
  }

  it('refuses account param that does not match the bearer identity', async () => {
    const { fetchSpy } = setup();
    const bearer = makeJwt({ upn: 'user1@domain.com' });

    const result = await requestContext.run({ accessToken: bearer }, () =>
      capturedHandler!({ account: 'user2@domain.com' })
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("'account' parameter is not supported");
    expect(result.content[0].text).toContain('user1@domain.com');
    // No Graph call was made with the wrong identity
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows account param that matches the bearer identity (case-insensitive)', async () => {
    const { fetchSpy } = setup();
    const bearer = makeJwt({ upn: 'User1@Domain.com' });

    const result = await requestContext.run({ accessToken: bearer }, () =>
      capturedHandler!({ account: 'user1@domain.com' })
    );

    expect(result.isError).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('refuses account param when the bearer identity cannot be determined (opaque token)', async () => {
    const { fetchSpy } = setup();

    const result = await requestContext.run({ accessToken: 'opaque-token' }, () =>
      capturedHandler!({ account: 'user2@domain.com' })
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("'account' parameter is not supported");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses mismatched account param in BYOT mode (no request context)', async () => {
    const byotToken = makeJwt({ upn: 'byot-user@domain.com' });
    const { fetchSpy } = setup({
      isOAuthModeEnabled: vi.fn().mockReturnValue(true),
      getToken: vi.fn().mockResolvedValue(byotToken),
    });

    const result = await capturedHandler!({ account: 'user2@domain.com' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("'account' parameter is not supported");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps MSAL account routing working without request context (stdio mode)', async () => {
    const { fetchSpy, mockAuthManager } = setup();

    const result = await capturedHandler!({ account: 'user2@domain.com' });

    expect(mockAuthManager.getTokenForAccount).toHaveBeenCalledWith('user2@domain.com');
    expect(result.isError).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalled();
  });
});

describe('Discussion #467: list-accounts tip in OAuth bearer mode', () => {
  it('explains that cached accounts are not reachable via the account parameter', async () => {
    const { registerAuthTools } = await import('../src/auth-tools.js');
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const mockAuthManager = {
      listAccounts: vi
        .fn()
        .mockResolvedValue([
          { username: 'cached@domain.com', name: 'Cached', homeAccountId: 'cached.home' },
        ]),
      getSelectedAccountId: vi.fn().mockReturnValue(null),
      hasExpectedAccount: vi.fn().mockReturnValue(false),
      isOAuthModeEnabled: vi.fn().mockReturnValue(true),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listAccountsHandler: ((...args: any[]) => any) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(server, 'tool').mockImplementation(((...args: any[]) => {
      const name = args[0];
      const handler = args[args.length - 1];
      if (name === 'list-accounts' && typeof handler === 'function') {
        listAccountsHandler = handler;
      }
    }) as any);

    registerAuthTools(server, mockAuthManager as any);
    expect(listAccountsHandler).toBeDefined();

    const result = await listAccountsHandler!({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.tip).toContain('HTTP/OAuth mode');
    expect(parsed.tip).not.toContain("'account' parameter in any tool call");
  });
});

describe('Discussion #467: AuthManager.getTokenForAccount in OAuth mode', () => {
  const msalConfig: Configuration = {
    auth: {
      clientId: 'test-client',
      authority: 'https://login.microsoftonline.com/common',
    },
  };

  function createAuth(accounts: AccountInfo[]) {
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
    };
    const auth = new AuthManager(msalConfig, ['User.Read']);
    Object.assign(auth as unknown as Record<string, unknown>, {
      msalApp,
      saveTokenCache: vi.fn(),
    });
    return auth;
  }

  it('throws when an identifier is provided in OAuth mode', async () => {
    const auth = createAuth([
      { username: 'cached@domain.com', homeAccountId: 'cached.home' } as AccountInfo,
    ]);
    await auth.setOAuthToken('bearer-token');

    await expect(auth.getTokenForAccount('cached@domain.com')).rejects.toThrow(
      /Cannot switch to account 'cached@domain.com'/
    );
  });

  it('still returns the bearer when no identifier is provided in OAuth mode', async () => {
    const auth = createAuth([]);
    await auth.setOAuthToken('bearer-token');

    await expect(auth.getTokenForAccount()).resolves.toBe('bearer-token');
  });
});

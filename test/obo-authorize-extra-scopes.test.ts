/**
 * Under --obo the MCP client requests only <clientId>/access_as_user on
 * /authorize, so no Graph scope is ever consented and the OBO exchange for
 * graph.microsoft.com/.default returns a token that can do nothing beyond
 * User.Read. --extra-scopes is the documented way to add Graph scopes to the
 * token request; /authorize must honour it in OBO mode so users consent to
 * them at sign-in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MicrosoftGraphServer from '../src/server.js';
import type AuthManager from '../src/auth.js';
import { clearSecretsCache } from '../src/secrets.js';

const expressMocks = vi.hoisted(() => {
  type Handler = (req: Record<string, unknown>, res: Record<string, unknown>) => unknown;
  const routes = new Map<string, Handler>();
  const app: Record<string, ReturnType<typeof vi.fn>> = {};
  app.set = vi.fn(() => app);
  app.use = vi.fn(() => app);
  app.get = vi.fn((path: string, handler: Handler) => {
    routes.set(`GET ${path}`, handler);
    return app;
  });
  app.post = vi.fn(() => app);
  app.listen = vi.fn((...args: unknown[]) => {
    const callback = args.find((arg): arg is () => void => typeof arg === 'function');
    const port = typeof args[0] === 'number' ? args[0] : 0;
    const address = typeof args[1] === 'string' ? args[1] : '::';
    callback?.();
    return {
      close: vi.fn(),
      closeIdleConnections: vi.fn(),
      once: vi.fn(),
      address: vi.fn(() => ({ address, family: address.includes(':') ? 'IPv6' : 'IPv4', port })),
    };
  });
  const express = Object.assign(
    vi.fn(() => app),
    {
      json: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
      urlencoded: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
    }
  );
  return { app, express, routes };
});

vi.mock('express', () => ({ default: expressMocks.express }));
vi.mock('@modelcontextprotocol/sdk/server/auth/router.js', () => ({
  mcpAuthRouter: vi.fn(() => (_req: unknown, _res: unknown, next?: () => void) => next?.()),
}));
vi.mock('../src/graph-tools.js', () => ({
  registerDiscoveryTools: vi.fn(),
  registerGraphTools: vi.fn(),
}));
vi.mock('../src/oauth-provider.js', () => ({ MicrosoftOAuthProvider: vi.fn() }));
vi.mock('../src/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

const CLIENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

async function authorizeScope(options: Record<string, unknown>): Promise<string[]> {
  const authManager = {
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
    listAccounts: async () => [],
    hasExpectedAccount: () => false,
  } as unknown as AuthManager;
  const server = new MicrosoftGraphServer(authManager, { http: '127.0.0.1:3000', ...options });
  await server.initialize('0.0.0-test');
  await server.start();
  const handler = expressMocks.routes.get('GET /authorize');
  if (!handler) throw new Error('/authorize not registered');
  let redirected = '';
  const req = {
    url: `/authorize?response_type=code&client_id=x&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&state=abcdefghij&scope=${encodeURIComponent(`${CLIENT_ID}/access_as_user`)}`,
    protocol: 'https',
    get: () => 'relay.example',
  };
  const res = {
    redirect: (url: string) => {
      redirected = url;
    },
    status: () => res,
    json: () => res,
  };
  await handler(req, res as unknown as Record<string, unknown>);
  return (new URL(redirected).searchParams.get('scope') ?? '').split(' ');
}

describe('/authorize honours --extra-scopes under --obo', () => {
  beforeEach(() => {
    clearSecretsCache();
    process.env.MS365_MCP_CLIENT_ID = CLIENT_ID;
    process.env.MS365_MCP_CLIENT_SECRET = 'secret';
    process.env.MS365_MCP_TENANT_ID = 'consumers';
  });

  afterEach(() => {
    delete process.env.MS365_MCP_CLIENT_ID;
    delete process.env.MS365_MCP_CLIENT_SECRET;
    delete process.env.MS365_MCP_TENANT_ID;
    expressMocks.routes.clear();
    vi.restoreAllMocks();
  });

  it('adds the extra Graph scopes to the client scope in OBO mode', async () => {
    const scopes = await authorizeScope({ obo: true, extraScopes: 'Mail.ReadWrite Mail.Send' });
    expect(scopes).toEqual(
      expect.arrayContaining([
        `${CLIENT_ID}/access_as_user`,
        'Mail.ReadWrite',
        'Mail.Send',
        'User.Read',
        'offline_access',
      ])
    );
  });

  it('leaves the client scope alone in OBO mode without --extra-scopes', async () => {
    const scopes = await authorizeScope({ obo: true });
    expect(scopes.sort()).toEqual(
      [`${CLIENT_ID}/access_as_user`, 'User.Read', 'offline_access'].sort()
    );
  });
});

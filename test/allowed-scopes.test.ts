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
    routes.set(path, handler);
    return app;
  });
  app.post = vi.fn(() => app);
  app.listen = vi.fn((...args: unknown[]) => {
    const callback = args.find((arg): arg is () => void => typeof arg === 'function');
    callback?.();
    return { close: vi.fn() };
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

const graphToolMocks = vi.hoisted(() => ({
  registerDiscoveryTools: vi.fn(),
  registerGraphTools: vi.fn(),
}));

vi.mock('express', () => ({
  default: expressMocks.express,
}));

vi.mock('@modelcontextprotocol/sdk/server/auth/router.js', () => ({
  mcpAuthRouter: vi.fn(() => (_req: unknown, _res: unknown, next?: () => void) => next?.()),
}));

vi.mock('../src/graph-tools.js', () => graphToolMocks);

vi.mock('../src/oauth-provider.js', () => ({
  MicrosoftOAuthProvider: vi.fn(),
}));

vi.mock('../src/logger.js', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  enableConsoleLogging: vi.fn(),
}));

function mockAuthManager(): AuthManager {
  return {
    isMultiAccount: vi.fn().mockResolvedValue(false),
    listAccounts: vi.fn().mockResolvedValue([]),
  } as unknown as AuthManager;
}

function mockRequest(path: string) {
  return {
    secure: false,
    protocol: 'http',
    url: path,
    get: vi.fn((header: string) =>
      header.toLowerCase() === 'host' ? 'localhost:3000' : undefined
    ),
  };
}

function mockResponse() {
  const res = {
    json: vi.fn(),
    redirect: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

async function startHttpServer(options: Record<string, unknown>) {
  const server = new MicrosoftGraphServer(mockAuthManager(), { http: true, ...options });
  await server.initialize('test');
  await server.start();
  return server;
}

describe('allowed scope HTTP behavior', () => {
  beforeEach(() => {
    expressMocks.routes.clear();
    graphToolMocks.registerDiscoveryTools.mockClear();
    graphToolMocks.registerGraphTools.mockClear();
    process.env.MS365_MCP_CLIENT_ID = 'test-client-id';
    process.env.MS365_MCP_TENANT_ID = 'test-tenant';
    delete process.env.MS365_MCP_CLIENT_SECRET;
    delete process.env.MS365_MCP_KEYVAULT_URL;
    clearSecretsCache();
  });

  afterEach(() => {
    delete process.env.MS365_MCP_CLIENT_ID;
    delete process.env.MS365_MCP_TENANT_ID;
    delete process.env.MS365_MCP_CLIENT_SECRET;
    delete process.env.MS365_MCP_KEYVAULT_URL;
    clearSecretsCache();
  });

  it('advertises effective scopes in OAuth metadata', async () => {
    await startHttpServer({ allowedScopes: 'Mail.Read Files.Read' });
    const handler = expressMocks.routes.get('/.well-known/oauth-authorization-server')!;
    const res = mockResponse();

    await handler(mockRequest('/.well-known/oauth-authorization-server'), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ scopes_supported: ['Files.Read', 'Mail.Read'] })
    );
  });

  it('preserves client-requested authorize scopes when no allowed scopes are set', async () => {
    await startHttpServer({ enabledTools: 'mail' });
    const handler = expressMocks.routes.get('/authorize')!;
    const res = mockResponse();

    await handler(
      mockRequest(
        '/authorize?response_type=code&redirect_uri=http://localhost:6274/oauth/callback&scope=Calendars.Read&state=abc'
      ),
      res
    );

    const redirectUrl = new URL(res.redirect.mock.calls[0][0]);
    const scopes = redirectUrl.searchParams.get('scope')!.split(' ');
    expect(scopes).toEqual(
      expect.arrayContaining(['Calendars.Read', 'User.Read', 'offline_access'])
    );
    expect(scopes).not.toContain('Mail.Read');
  });

  it('uses allowed-scope-filtered permissions in authorize redirects', async () => {
    await startHttpServer({ allowedScopes: 'Mail.Read' });
    const handler = expressMocks.routes.get('/authorize')!;
    const res = mockResponse();

    await handler(
      mockRequest(
        '/authorize?response_type=code&redirect_uri=http://localhost:6274/oauth/callback&scope=Calendars.Read&state=abc'
      ),
      res
    );

    const redirectUrl = new URL(res.redirect.mock.calls[0][0]);
    const scopes = redirectUrl.searchParams.get('scope')!.split(' ');
    expect(scopes).toEqual(expect.arrayContaining(['Mail.Read', 'User.Read', 'offline_access']));
    expect(scopes).not.toContain('Calendars.Read');
  });

  it('keeps OBO protected-resource metadata ahead of allowed scopes', async () => {
    process.env.MS365_MCP_CLIENT_SECRET = 'secret';
    clearSecretsCache();
    await startHttpServer({ allowedScopes: 'Mail.Read', obo: true });
    const handler = expressMocks.routes.get('/.well-known/oauth-protected-resource')!;
    const res = mockResponse();

    await handler(mockRequest('/.well-known/oauth-protected-resource'), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ scopes_supported: ['test-client-id/access_as_user'] })
    );
  });

  it('advertises OBO scope in authorization-server metadata', async () => {
    process.env.MS365_MCP_CLIENT_SECRET = 'secret';
    clearSecretsCache();
    await startHttpServer({ allowedScopes: 'Mail.Read', obo: true });
    const handler = expressMocks.routes.get('/.well-known/oauth-authorization-server')!;
    const res = mockResponse();

    await handler(mockRequest('/.well-known/oauth-authorization-server'), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ scopes_supported: ['test-client-id/access_as_user'] })
    );
  });

  it('passes allowed scopes to tool registration', () => {
    const server = new MicrosoftGraphServer(mockAuthManager(), {
      allowedScopes: 'Mail.Read',
      enabledTools: 'mail',
      http: true,
    });
    Object.assign(server, { graphClient: {}, version: 'test' });

    (server as unknown as { createMcpServer: () => unknown }).createMcpServer();

    expect(graphToolMocks.registerGraphTools).toHaveBeenCalledWith(
      expect.anything(),
      {},
      undefined,
      'mail',
      undefined,
      expect.anything(),
      false,
      [],
      'Mail.Read'
    );
  });
});

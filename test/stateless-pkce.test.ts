/**
 * Stateless two-leg PKCE (MS365_MCP_PKCE_SECRET).
 *
 * The in-memory pkceStore ties /authorize and /token to one process. A second
 * replica or a serverless function answering /token has no mapping, forwards
 * the client's verifier upstream against the server's challenge, and Entra
 * rejects the exchange. With the secret set the server verifier is derived
 * from the client's challenge, so ANY instance can complete the exchange.
 *
 * The first test drives /authorize on one server instance and /token on a
 * fresh one, which is exactly the multi-instance case.
 */
import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MicrosoftGraphServer, {
  PKCE_SECRET_MIN_LENGTH,
  deriveServerCodeVerifier,
  statelessPkceSecret,
} from '../src/server.js';
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
  app.post = vi.fn((path: string, handler: Handler) => {
    routes.set(`POST ${path}`, handler);
    return app;
  });
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

const SECRET = 'stateless-pkce-test-secret-with-at-least-32-characters';
const TOKEN_RESPONSE = { access_token: 'at', token_type: 'Bearer', expires_in: 3600 };

function mockAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: () => false,
    isMultiAccount: vi.fn().mockResolvedValue(false),
    listAccounts: vi.fn().mockResolvedValue([]),
  } as unknown as AuthManager;
}

function mockRequest(path: string, body?: Record<string, unknown>) {
  return {
    secure: false,
    protocol: 'http',
    url: path,
    body,
    method: body ? 'POST' : 'GET',
    get: vi.fn((header: string) =>
      header.toLowerCase() === 'host' ? 'localhost:3000' : undefined
    ),
  };
}

function mockResponse() {
  const res = { json: vi.fn(), redirect: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function challengeFor(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

describe('deriveServerCodeVerifier / statelessPkceSecret', () => {
  it('is deterministic, secret-dependent and a valid PKCE verifier', () => {
    const a = deriveServerCodeVerifier(SECRET, 'challenge-1');
    expect(deriveServerCodeVerifier(SECRET, 'challenge-1')).toBe(a);
    expect(deriveServerCodeVerifier(SECRET + 'x', 'challenge-1')).not.toBe(a);
    expect(deriveServerCodeVerifier(SECRET, 'challenge-2')).not.toBe(a);
    // RFC 7636: 43..128 chars of [A-Za-z0-9-._~]; base64url of a 32-byte HMAC is 43.
    expect(a).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
  });

  it('is off when unset or empty, and refuses a short secret', () => {
    expect(statelessPkceSecret({})).toBeUndefined();
    expect(statelessPkceSecret({ MS365_MCP_PKCE_SECRET: '' })).toBeUndefined();
    expect(() => statelessPkceSecret({ MS365_MCP_PKCE_SECRET: 'short' })).toThrow(
      new RegExp(`${PKCE_SECRET_MIN_LENGTH}`)
    );
    expect(statelessPkceSecret({ MS365_MCP_PKCE_SECRET: SECRET })).toBe(SECRET);
  });
});

describe('two-leg PKCE across two server instances', () => {
  const clientVerifier = 'client-side-code-verifier-for-the-mcp-client';
  const redirectUri = 'http://localhost:3118/callback';
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    expressMocks.routes.clear();
    process.env.MS365_MCP_CLIENT_ID = 'test-client-id';
    process.env.MS365_MCP_TENANT_ID = 'test-tenant';
    delete process.env.MS365_MCP_CLIENT_SECRET;
    delete process.env.MS365_MCP_KEYVAULT_URL;
    delete process.env.MS365_MCP_PKCE_SECRET;
    clearSecretsCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MS365_MCP_CLIENT_ID;
    delete process.env.MS365_MCP_TENANT_ID;
    delete process.env.MS365_MCP_PKCE_SECRET;
    clearSecretsCache();
    vi.restoreAllMocks();
  });

  /** Each call is a fresh process as far as the pkceStore is concerned. */
  async function freshInstance(): Promise<void> {
    expressMocks.routes.clear();
    const server = new MicrosoftGraphServer(mockAuthManager(), { http: true });
    await server.initialize('test');
    await server.start();
  }

  async function authorize(state: string): Promise<string> {
    const handler = expressMocks.routes.get('GET /authorize')!;
    const res = mockResponse();
    await handler(
      mockRequest(
        `/authorize?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${state}&code_challenge=${challengeFor(clientVerifier)}&code_challenge_method=S256`
      ),
      res
    );
    return new URL(res.redirect.mock.calls[0][0] as string).searchParams.get('code_challenge')!;
  }

  async function postToken(): Promise<URLSearchParams> {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(TOKEN_RESPONSE),
      json: async () => TOKEN_RESPONSE,
    } as Response);
    global.fetch = fetchMock;
    const handler = expressMocks.routes.get('POST /token')!;
    const res = mockResponse();
    await handler(
      mockRequest('/token', {
        grant_type: 'authorization_code',
        code: 'the-code',
        redirect_uri: redirectUri,
        code_verifier: clientVerifier,
      }),
      res
    );
    expect(res.json).toHaveBeenCalledWith(TOKEN_RESPONSE);
    return fetchMock.mock.calls[0][1].body as URLSearchParams;
  }

  it('with MS365_MCP_PKCE_SECRET, /token on a fresh instance sends the server verifier', async () => {
    process.env.MS365_MCP_PKCE_SECRET = SECRET;

    await freshInstance();
    const serverChallenge = await authorize('state-a');
    expect(serverChallenge).not.toBe(challengeFor(clientVerifier));
    expect(serverChallenge).toBe(
      challengeFor(deriveServerCodeVerifier(SECRET, challengeFor(clientVerifier)))
    );

    await freshInstance(); // a different replica / cold function answers /token
    const sent = await postToken();
    expect(challengeFor(sent.get('code_verifier')!)).toBe(serverChallenge);
  });

  it('without the secret, a fresh instance has no mapping and forwards the client verifier', async () => {
    // Documents the failure the secret fixes: Entra would reject this exchange
    // because the server registered its own challenge at /authorize.
    await freshInstance();
    const serverChallenge = await authorize('state-b');
    expect(serverChallenge).not.toBe(challengeFor(clientVerifier));

    await freshInstance();
    const sent = await postToken();
    expect(sent.get('code_verifier')).toBe(clientVerifier);
    expect(challengeFor(sent.get('code_verifier')!)).not.toBe(serverChallenge);
  });
});

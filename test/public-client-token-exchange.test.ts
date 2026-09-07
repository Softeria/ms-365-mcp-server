/**
 * Regression tests for GitHub issue #664:
 * "/token unconditionally sends client_secret even when redirect_uri is
 *  registered as a public client"
 *
 * One Entra app registration can hold both a Web redirect URI (confidential,
 * client_secret required) and a Mobile and desktop one (public, client_secret
 * forbidden). We can't tell which platform a redirect_uri was registered under,
 * so we send the secret and retry without it when Entra answers AADSTS700025.
 *
 * The reporter's retry then failed with AADSTS501481, which looks like a PKCE
 * mismatch. It was: /token consumed the two-leg PKCE mapping before the
 * exchange succeeded, so the retry sent the client's verifier upstream where
 * the server's challenge was registered.
 */
import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MicrosoftGraphServer from '../src/server.js';
import type AuthManager from '../src/auth.js';
import { clearSecretsCache } from '../src/secrets.js';
import { exchangeCodeForToken, refreshAccessToken } from '../src/lib/microsoft-auth.js';
import logger from '../src/logger.js';

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

vi.mock('express', () => ({
  default: expressMocks.express,
}));

vi.mock('@modelcontextprotocol/sdk/server/auth/router.js', () => ({
  mcpAuthRouter: vi.fn(() => (_req: unknown, _res: unknown, next?: () => void) => next?.()),
}));

vi.mock('../src/graph-tools.js', () => ({
  registerDiscoveryTools: vi.fn(),
  registerGraphTools: vi.fn(),
}));

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

const TOKEN_RESPONSE = {
  access_token: 'at',
  token_type: 'Bearer',
  scope: 'User.Read',
  expires_in: 3600,
  refresh_token: 'rt',
};

const PUBLIC_CLIENT_REJECTION = JSON.stringify({
  error: 'invalid_client',
  error_description:
    "AADSTS700025: Client is public so neither 'client_assertion' nor 'client_secret' should be presented.",
  error_codes: [700025],
  correlation_id: 'corr-700025',
});

function jsonResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  } as Response;
}

/** Form bodies of every upstream token call, in order. */
function sentParams(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams[] {
  return fetchMock.mock.calls.map((call) => call[1].body as URLSearchParams);
}

function challengeFor(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

describe('Issue #664: client_secret on a public-client redirect_uri', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.mocked(logger.info).mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('retries the code exchange without client_secret on AADSTS700025', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, PUBLIC_CLIENT_REJECTION))
      .mockResolvedValueOnce(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    const result = await exchangeCodeForToken(
      'code',
      'http://localhost:3118/callback',
      'client-id',
      'the-secret',
      'tenant-id',
      'verifier'
    );

    expect(result).toEqual(TOKEN_RESPONSE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [first, second] = sentParams(fetchMock);
    expect(first.get('client_secret')).toBe('the-secret');
    expect(second.get('client_secret')).toBeNull();
    // The retry must still carry everything else, or it trades AADSTS700025 for
    // an equally opaque PKCE failure.
    expect(second.get('code')).toBe('code');
    expect(second.get('code_verifier')).toBe('verifier');
    expect(second.get('redirect_uri')).toBe('http://localhost:3118/callback');
    // The first attempt's correlation_id is the only handle on it once the
    // retry answers, so it has to reach the log.
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.stringContaining('AADSTS700025'),
      expect.objectContaining({ correlation_id: 'corr-700025', status: 401 })
    );
  });

  it('retries the refresh without client_secret on AADSTS700025', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, PUBLIC_CLIENT_REJECTION))
      .mockResolvedValueOnce(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    const result = await refreshAccessToken('rt', 'client-id', 'the-secret', 'tenant-id');

    expect(result).toEqual(TOKEN_RESPONSE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [first, second] = sentParams(fetchMock);
    expect(first.get('client_secret')).toBe('the-secret');
    expect(second.get('client_secret')).toBeNull();
    expect(second.get('refresh_token')).toBe('rt');
  });

  it('does not retry other upstream errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        400,
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'AADSTS70008: The provided authorization code has expired.',
          error_codes: [70008],
        })
      )
    );
    global.fetch = fetchMock;

    await expect(
      exchangeCodeForToken('code', 'http://localhost/cb', 'client-id', 'the-secret')
    ).rejects.toMatchObject({ name: 'OAuthUpstreamError', body: { error_codes: [70008] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries only once when the retry is also rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, PUBLIC_CLIENT_REJECTION));
    global.fetch = fetchMock;

    await expect(
      exchangeCodeForToken('code', 'http://localhost/cb', 'client-id', 'the-secret')
    ).rejects.toMatchObject({ name: 'OAuthUpstreamError', status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces a malformed error_codes as an OAuth error, not a 500', async () => {
    // parseUpstreamOAuthError only vouches for `error`, so error_codes can be
    // anything. A TypeError here would escape as a bare server_error.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(401, JSON.stringify({ error: 'invalid_client', error_codes: 700025 }))
      );
    global.fetch = fetchMock;

    await expect(
      exchangeCodeForToken('code', 'http://localhost/cb', 'client-id', 'the-secret')
    ).rejects.toMatchObject({ name: 'OAuthUpstreamError', status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces AADSTS700025 when there is no secret to drop', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, PUBLIC_CLIENT_REJECTION));
    global.fetch = fetchMock;

    await expect(
      exchangeCodeForToken('code', 'http://localhost/cb', 'client-id', undefined)
    ).rejects.toMatchObject({ name: 'OAuthUpstreamError', status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function mockAuthManager(): AuthManager {
  return {
    isMultiAccount: vi.fn().mockResolvedValue(false),
    listAccounts: vi.fn().mockResolvedValue([]),
  } as unknown as AuthManager;
}

function mockRequest(path: string, body?: Record<string, unknown>) {
  return {
    secure: false,
    protocol: 'http',
    url: path,
    method: body ? 'POST' : 'GET',
    body,
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

describe('Issue #664: two-leg PKCE mapping survives a failed exchange', () => {
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
    clearSecretsCache();
  });

  async function startServer(clientSecret?: string): Promise<void> {
    if (clientSecret) {
      process.env.MS365_MCP_CLIENT_SECRET = clientSecret;
      clearSecretsCache();
    }
    const server = new MicrosoftGraphServer(mockAuthManager(), { http: true });
    await server.initialize('test');
    await server.start();
  }

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MS365_MCP_CLIENT_ID;
    delete process.env.MS365_MCP_TENANT_ID;
    delete process.env.MS365_MCP_CLIENT_SECRET;
    clearSecretsCache();
    vi.restoreAllMocks();
  });

  /** Runs the /authorize leg and returns the challenge we gave Microsoft. */
  async function authorize(state: string, verifier = clientVerifier): Promise<string> {
    return callAuthorize(
      `&state=${state}&code_challenge=${challengeFor(verifier)}&code_challenge_method=S256`
    );
  }

  /** The stateless variant: no state to key a mapping on (the Claude Code path). */
  async function authorizeWithoutState(verifier = clientVerifier): Promise<string> {
    return callAuthorize(`&code_challenge=${challengeFor(verifier)}&code_challenge_method=S256`);
  }

  async function callAuthorize(query: string): Promise<string> {
    const handler = expressMocks.routes.get('GET /authorize')!;
    const res = mockResponse();
    await handler(
      mockRequest(
        `/authorize?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}${query}`
      ),
      res
    );
    return new URL(res.redirect.mock.calls[0][0] as string).searchParams.get('code_challenge')!;
  }

  function postToken(verifier = clientVerifier) {
    const handler = expressMocks.routes.get('POST /token')!;
    const res = mockResponse();
    const done = handler(
      mockRequest('/token', {
        grant_type: 'authorization_code',
        code: 'the-code',
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
      res
    );
    return Promise.resolve(done).then(() => res);
  }

  it('still sends the server verifier when a first exchange failed', async () => {
    await startServer();
    const serverChallenge = await authorize('state-one');
    expect(serverChallenge).not.toBe(challengeFor(clientVerifier));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, PUBLIC_CLIENT_REJECTION))
      .mockResolvedValueOnce(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    const failed = await postToken();
    expect(failed.status).toHaveBeenCalledWith(400);

    const succeeded = await postToken();
    expect(succeeded.json).toHaveBeenCalledWith(TOKEN_RESPONSE);

    const [first, second] = sentParams(fetchMock);
    expect(challengeFor(first.get('code_verifier')!)).toBe(serverChallenge);
    expect(challengeFor(second.get('code_verifier')!)).toBe(serverChallenge);
  });

  it('keeps the server verifier across the secret-dropping retry', async () => {
    // The reporter's configuration: a secret is set for the confidential leg,
    // two-leg PKCE is active, and Entra answers 700025 on the public one. Both
    // upstream attempts have to carry the server verifier, not just the first.
    await startServer('the-secret');
    const serverChallenge = await authorize('state-mixed');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, PUBLIC_CLIENT_REJECTION))
      .mockResolvedValueOnce(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    const res = await postToken();

    expect(res.json).toHaveBeenCalledWith(TOKEN_RESPONSE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [first, second] = sentParams(fetchMock);
    expect(first.get('client_secret')).toBe('the-secret');
    expect(second.get('client_secret')).toBeNull();
    expect(challengeFor(first.get('code_verifier')!)).toBe(serverChallenge);
    expect(challengeFor(second.get('code_verifier')!)).toBe(serverChallenge);
  });

  it('uses the newest mapping when a client reuses one code_verifier', async () => {
    await startServer();
    await authorize('state-abandoned');
    const serverChallenge = await authorize('state-retried');

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    await postToken();

    const [sent] = sentParams(fetchMock);
    expect(challengeFor(sent.get('code_verifier')!)).toBe(serverChallenge);
  });

  it('still uses its mapping after a sign-in slower than the window', async () => {
    vi.useFakeTimers();
    try {
      await startServer();
      const serverChallenge = await authorize('state-slow');
      // Past the retention window on purpose: /token must not consult age at
      // all. createdAt is stamped at /authorize, so it measures the user's time
      // on the Microsoft login page, and a long MFA enrollment or consent prompt
      // still ends in a perfectly fresh authorization code.
      vi.advanceTimersByTime(61 * 60 * 1000);

      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
      global.fetch = fetchMock;

      await postToken();

      const [sent] = sentParams(fetchMock);
      expect(challengeFor(sent.get('code_verifier')!)).toBe(serverChallenge);
    } finally {
      vi.useRealTimers();
    }
  });

  it('survives another authorization arriving during a slow sign-in', async () => {
    const otherVerifier = 'a-second-client-verifier-from-another-user';
    vi.useFakeTimers();
    try {
      await startServer();
      const serverChallenge = await authorize('state-slow-busy');
      vi.advanceTimersByTime(30 * 60 * 1000);
      // Someone else signing in is what used to cost the slow user their
      // mapping: the sweep runs on every authorization, not just their own.
      await authorize('state-other-user', otherVerifier);

      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
      global.fetch = fetchMock;
      await postToken();

      const [sent] = sentParams(fetchMock);
      expect(challengeFor(sent.get('code_verifier')!)).toBe(serverChallenge);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still sweeps mappings past the retention window', async () => {
    const otherVerifier = 'a-second-client-verifier-from-another-user';
    vi.useFakeTimers();
    try {
      await startServer();
      await authorize('state-forgotten');
      vi.advanceTimersByTime(61 * 60 * 1000);
      await authorize('state-other-user', otherVerifier);

      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
      global.fetch = fetchMock;
      await postToken();

      const [sent] = sentParams(fetchMock);
      expect(sent.get('code_verifier')).toBe(clientVerifier);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a mapping stored while an earlier exchange was in flight', async () => {
    await startServer();
    await authorize('state-reused');

    let release: (() => void) | undefined;
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
        })
    );

    const pending = postToken();
    // Same state, so this replaces the entry under that key while the exchange
    // above is still awaiting upstream.
    const newChallenge = await authorize('state-reused');
    release!();
    await pending;

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;
    await postToken();

    const [sent] = sentParams(fetchMock);
    expect(challengeFor(sent.get('code_verifier')!)).toBe(newChallenge);
  });

  it('drops the mapping when a later authorization forwards the client challenge', async () => {
    await startServer();
    await authorize('state-two-leg');
    // The stateless path sends the client's own challenge upstream, so the
    // mapping from the earlier run would answer it with the wrong verifier.
    await authorizeWithoutState();

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;
    await postToken();

    const [sent] = sentParams(fetchMock);
    expect(sent.get('code_verifier')).toBe(clientVerifier);
  });

  it('drops the mapping once the exchange succeeds', async () => {
    await startServer();
    await authorize('state-two');

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    await postToken();
    await postToken();

    const [first, second] = sentParams(fetchMock);
    expect(first.get('code_verifier')).not.toBe(clientVerifier);
    expect(second.get('code_verifier')).toBe(clientVerifier);
  });
});

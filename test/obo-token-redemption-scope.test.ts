/**
 * Under --obo the client's token is for this app itself. Personal Microsoft
 * accounts (consumers authority) refuse to redeem an authorization code or a
 * refresh token for that audience unless the request carries `scope`:
 * AADSTS70011 "The provided request must include a 'scope' input parameter".
 * Both /token grants therefore send `<clientId>/access_as_user offline_access`
 * in OBO mode, and nothing outside it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exchangeCodeForToken, refreshAccessToken } from '../src/lib/microsoft-auth.js';

vi.mock('../src/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

const TOKEN_RESPONSE = {
  access_token: 'at',
  token_type: 'Bearer',
  scope: 'client-id/access_as_user',
  expires_in: 3600,
  refresh_token: 'rt',
};

function jsonResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  } as Response;
}

function sentParams(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams[] {
  return fetchMock.mock.calls.map((call) => call[1].body as URLSearchParams);
}

describe('token redemption scope (AADSTS70011 on personal accounts under --obo)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends scope on the code exchange when given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    await exchangeCodeForToken(
      'code',
      'https://claude.ai/api/mcp/auth_callback',
      'client-id',
      'the-secret',
      'consumers',
      'verifier',
      'global',
      'client-id/access_as_user offline_access'
    );

    const [params] = sentParams(fetchMock);
    expect(params.get('scope')).toBe('client-id/access_as_user offline_access');
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code_verifier')).toBe('verifier');
  });

  it('sends scope on the refresh when given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    await refreshAccessToken(
      'rt',
      'client-id',
      'the-secret',
      'consumers',
      'global',
      'client-id/access_as_user offline_access'
    );

    const [params] = sentParams(fetchMock);
    expect(params.get('scope')).toBe('client-id/access_as_user offline_access');
    expect(params.get('grant_type')).toBe('refresh_token');
  });

  it('leaves the request unchanged when no scope is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, JSON.stringify(TOKEN_RESPONSE)));
    global.fetch = fetchMock;

    await exchangeCodeForToken('code', 'http://localhost/cb', 'client-id', 'the-secret');
    await refreshAccessToken('rt', 'client-id', 'the-secret');

    for (const params of sentParams(fetchMock)) {
      expect(params.has('scope')).toBe(false);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import MicrosoftGraphServer from '../src/server.js';
import OboClient from '../src/obo-client.js';
import { clearSecretsCache } from '../src/secrets.js';
import type AuthManager from '../src/auth.js';
import type { CommandOptions } from '../src/cli.js';
import {
  isRejectedAssertion,
  oboAllowlistRefusal,
  readOboAllowlist,
} from '../src/lib/obo-access.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), verbose: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function jwt(claims: Record<string, unknown>): string {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'RS256', typ: 'JWT' })}.${b({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.sig`;
}

/** Shaped like msal-node's ServerError / InteractionRequiredAuthError. */
function msalError(errorCode: string, errorMessage: string): Error {
  return Object.assign(new Error(`${errorCode}: ${errorMessage}`), { errorCode, errorMessage });
}

describe('obo-access helpers', () => {
  it('reads comma- or space-separated allowlists, case-insensitively', () => {
    const a = readOboAllowlist({
      MS365_MCP_OBO_ALLOWED_TENANTS: `${TENANT_A.toUpperCase()}, ${TENANT_B}`,
      MS365_MCP_OBO_ALLOWED_USERS: 'u1 u2',
    });
    expect([...a.tenants]).toEqual([TENANT_A, TENANT_B]);
    expect([...a.users]).toEqual(['u1', 'u2']);
    expect(readOboAllowlist({}).tenants.size).toBe(0);
  });

  it('allows everyone when no list is set', () => {
    expect(oboAllowlistRefusal('opaque-token', readOboAllowlist({}))).toBeUndefined();
  });

  it('refuses other tenants, other users and non-JWT tokens when a list is set', () => {
    const tenants = readOboAllowlist({ MS365_MCP_OBO_ALLOWED_TENANTS: TENANT_A });
    expect(oboAllowlistRefusal(jwt({ tid: TENANT_A, oid: 'u1' }), tenants)).toBeUndefined();
    expect(oboAllowlistRefusal(jwt({ tid: TENANT_B, oid: 'u1' }), tenants)).toMatch(/tenant/);
    expect(oboAllowlistRefusal(jwt({ oid: 'u1' }), tenants)).toMatch(/tenant/);
    expect(oboAllowlistRefusal('not-a-jwt', tenants)).toMatch(/not a JWT/);
    const users = readOboAllowlist({ MS365_MCP_OBO_ALLOWED_USERS: 'U1' });
    expect(oboAllowlistRefusal(jwt({ tid: TENANT_B, oid: 'u1' }), users)).toBeUndefined();
    expect(oboAllowlistRefusal(jwt({ tid: TENANT_B, oid: 'u2' }), users)).toMatch(/not allowed/);
  });

  it('classifies Entra rejections of the assertion, and nothing else, as rejected', () => {
    expect(
      isRejectedAssertion(
        msalError('invalid_grant', 'AADSTS50013: Assertion failed signature validation.')
      )
    ).toBe(true);
    expect(isRejectedAssertion(msalError('interaction_required', 'AADSTS65001: consent'))).toBe(
      true
    );
    expect(
      isRejectedAssertion(new Error('AADSTS500133: Assertion is not within its valid time range.'))
    ).toBe(true);
    expect(
      isRejectedAssertion(
        msalError('invalid_client', 'AADSTS7000215: Invalid client secret provided.')
      )
    ).toBe(false);
    // A token issued for another app: errorCode invalid_client, but the assertion is at fault.
    expect(
      isRejectedAssertion(
        msalError(
          'invalid_client',
          'AADSTS5002723: Invalid JWT token. No certificate SHA-1 thumbprint, certificate SHA-256 thumbprint, nor keyId found in token header.'
        )
      )
    ).toBe(true);
    // Personal accounts answer a forged or expired assertion with the same code as an outage.
    expect(
      isRejectedAssertion(
        msalError('temporarily_unavailable', 'AADSTS70012: The request could not be completed.')
      )
    ).toBe(false);
    expect(isRejectedAssertion(msalError('network_error', 'getaddrinfo ENOTFOUND'))).toBe(false);
    expect(isRejectedAssertion(new Error('boom'))).toBe(false);
    expect(isRejectedAssertion(undefined)).toBe(false);
  });
});

async function freePort(): Promise<number> {
  const s: Server = await new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
  const { port } = s.address() as AddressInfo;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return port;
}

function fakeAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
    listAccounts: async () => [],
    getToken: async () => 'SERVER_OWN_TOKEN',
    getTokenForAccount: async () => 'SERVER_OWN_TOKEN',
    setOAuthToken: async () => {},
  } as unknown as AuthManager;
}

describe('--obo /mcp: 401 on a rejected assertion, 403 outside the allowlist (#696)', () => {
  const savedEnv = { ...process.env };
  let started: MicrosoftGraphServer[] = [];
  let port: number;

  async function start(env: Record<string, string> = {}): Promise<void> {
    Object.assign(process.env, env);
    clearSecretsCache();
    port = await freePort();
    const options: CommandOptions = { http: `127.0.0.1:${port}`, obo: true };
    const server = new MicrosoftGraphServer(fakeAuthManager(), options);
    await server.initialize('0.0.0-test');
    started.push(server);
    await server.start();
  }

  function listTools(token: string): Promise<Response> {
    return fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MS365_MCP_CLIENT_ID = '33333333-3333-3333-3333-333333333333';
    process.env.MS365_MCP_CLIENT_SECRET = 'secret';
    process.env.MS365_MCP_RATE_LIMIT_DISABLED = 'true';
    delete process.env.MS365_MCP_OBO_ALLOWED_TENANTS;
    delete process.env.MS365_MCP_OBO_ALLOWED_USERS;
  });

  afterEach(async () => {
    for (const server of started) await server.stop();
    started = [];
    vi.restoreAllMocks();
    process.env = { ...savedEnv };
    clearSecretsCache();
  });

  it('answers 401 with a WWW-Authenticate challenge when Entra rejects the assertion', async () => {
    vi.spyOn(OboClient.prototype, 'exchangeToken').mockRejectedValue(
      msalError('invalid_grant', 'AADSTS50013: Assertion failed signature validation.')
    );
    await start();
    const r = await listTools(jwt({ tid: TENANT_A, oid: 'u1' }));
    expect(r.status).toBe(401);
    expect(r.headers.get('www-authenticate')).toMatch(
      /^Bearer resource_metadata=".*\/\.well-known\/oauth-protected-resource", error="invalid_token"/
    );
    expect(await r.json()).toMatchObject({ error: 'invalid_token' });
  });

  it('answers 401 for a token issued for another app (AADSTS5002723 under invalid_client)', async () => {
    vi.spyOn(OboClient.prototype, 'exchangeToken').mockRejectedValue(
      msalError(
        'invalid_client',
        'AADSTS5002723: Invalid JWT token. No certificate SHA-1 thumbprint found.'
      )
    );
    await start();
    const r = await listTools(jwt({ tid: TENANT_A }));
    expect(r.status).toBe(401);
    expect(r.headers.get('www-authenticate')).toMatch(/error="invalid_token"/);
  });

  it('still answers 500 when the exchange fails for another reason', async () => {
    vi.spyOn(OboClient.prototype, 'exchangeToken').mockRejectedValue(
      msalError('invalid_client', 'AADSTS7000215: Invalid client secret provided.')
    );
    await start();
    expect((await listTools(jwt({ tid: TENANT_A }))).status).toBe(500);
  });

  it('refuses callers outside the allowlist with 403 before any exchange', async () => {
    const exchange = vi
      .spyOn(OboClient.prototype, 'exchangeToken')
      .mockImplementation(async () => 'GRAPH_TOKEN');
    await start({ MS365_MCP_OBO_ALLOWED_TENANTS: TENANT_A, MS365_MCP_OBO_ALLOWED_USERS: 'u1' });

    const otherTenant = await listTools(jwt({ tid: TENANT_B, oid: 'u1' }));
    expect(otherTenant.status).toBe(403);
    expect(await otherTenant.json()).toMatchObject({ error: 'access_denied' });
    expect((await listTools(jwt({ tid: TENANT_A, oid: 'u2' }))).status).toBe(403);
    expect(exchange).not.toHaveBeenCalled();

    const allowed = await listTools(jwt({ tid: TENANT_A, oid: 'u1' }));
    expect(allowed.status).toBe(200);
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it('lets everyone through to the exchange when no allowlist is set', async () => {
    const exchange = vi
      .spyOn(OboClient.prototype, 'exchangeToken')
      .mockImplementation(async () => 'GRAPH_TOKEN');
    await start();
    expect((await listTools(jwt({ tid: TENANT_B, oid: 'anyone' }))).status).toBe(200);
    expect(exchange).toHaveBeenCalledTimes(1);
  });
});

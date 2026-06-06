/**
 * OAuth-surface coverage for the real tenant delegated handlers.
 *
 * The D-10 coverage gate counts src/lib/oauth/tenant-handlers.ts
 * createAuthorizeHandler and createTenantTokenHandler lines directly. This file mounts those
 * handlers with in-memory deps so the gate covers the production branches
 * instead of only the PKCE simulator used by the cross-tenant store test.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../../src/lib/pkce-store/redis-store.js';
import type { AuthorizeHandlerConfig } from '../../../src/lib/oauth/tenant-handlers.js';
import type { TenantRow } from '../../../src/lib/tenant/tenant-row.js';
import type { Pool } from 'pg';
import { SessionStore } from '../../../src/lib/session-store.js';
import { newPkce } from '../../setup/pkce-fixture.js';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

interface Harness {
  url: string;
  close: () => Promise<void>;
  redis: MemoryRedisFacade;
  pkceStore: RedisPkceStore;
  tenant: TenantRow;
  mockAcquireByCode: ReturnType<typeof vi.fn>;
}

function makeTenant(overrides: Partial<TenantRow> = {}): TenantRow {
  const now = new Date();
  return {
    id: 'tenant-oauth-surface',
    mode: 'delegated',
    client_id: 'app-client-id',
    client_secret_ref: null,
    client_secret_resolved: 'tenant-secret',
    tenant_id: 'tenant-guid',
    cloud_type: 'global',
    redirect_uri_allowlist: ['http://localhost:3000/callback'],
    cors_origins: [],
    allowed_scopes: ['User.Read', 'Mail.Read'],
    enabled_tools: null,
    preset_version: 'essentials-v1',
    sharepoint_domain: null,
    rate_limits: null,
    wrapped_dek: null,
    slug: null,
    disabled_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

async function startApp(options: {
  tenant?: Partial<TenantRow>;
  msalClient?: unknown;
  authorizeConfig?: Partial<Omit<AuthorizeHandlerConfig, 'pkceStore'>>;
  pgPool?: Pool;
}): Promise<Harness> {
  const redis = new MemoryRedisFacade();
  const pkceStore = new RedisPkceStore(redis);
  const tenant = makeTenant(options.tenant);
  const mockAcquireByCode = vi.fn(async () => ({
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-server-side-only',
    expiresOn: new Date(Date.now() + 3600 * 1000),
    account: { homeAccountId: 'home-account-1' },
  }));
  const msalClient = options.msalClient ?? { acquireTokenByCode: mockAcquireByCode };
  const mockTenantPool = {
    acquire: vi.fn(async () => msalClient),
    getDekForTenant: vi.fn(() => Buffer.alloc(32, 7)),
  };

  const { createAuthorizeHandler, createTenantTokenHandler } =
    await import('../../../src/lib/oauth/tenant-handlers.js');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const loadTenantStub = (req: Request, _res: Response, next: NextFunction): void => {
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    next();
  };

  app.get(
    '/authorize',
    loadTenantStub,
    createAuthorizeHandler({ pkceStore, pgPool: options.pgPool, ...options.authorizeConfig })
  );
  app.post(
    '/token',
    loadTenantStub,
    createTenantTokenHandler({
      pkceStore,
      tenantPool: mockTenantPool,
      redis,
      pgPool: options.pgPool,
    })
  );

  return await new Promise<Harness>((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        redis,
        pkceStore,
        tenant,
        mockAcquireByCode,
        close: () =>
          new Promise<void>((resolve) => {
            server.close(() => {
              void redis.quit().finally(resolve);
            });
          }),
      });
    });
  });
}

function fakeDynamicClientPool(input: {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  grantTypes: string[];
}): Pool {
  const now = new Date();
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('select 1 from oauth_clients')) return { rows: [{ '?column?': 1 }] };
      if (sql.includes('from oauth_clients')) {
        return {
          rows: [
            {
              id: 'oauth-client-row-1',
              tenant_id: input.tenantId,
              client_id: input.clientId,
              client_name: 'Dynamic Client',
              redirect_uris: [input.redirectUri],
              grant_types: input.grantTypes,
              response_types: ['code'],
              token_endpoint_auth_method: 'none',
              created_at: now,
              updated_at: now,
              last_seen_at: null,
              disabled_at: null,
            },
          ],
        };
      }
      return { rows: [] };
    }),
  } as unknown as Pool;
}

async function seedPkce(
  harness: Harness,
  verifier: string,
  overrides: { clientId?: string; tokenScopes?: string[] } = {}
): Promise<void> {
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  await harness.pkceStore.put(harness.tenant.id, {
    state: 'state-1',
    clientCodeChallenge: challenge,
    clientCodeChallengeMethod: 'S256',
    serverCodeVerifier: 'server-verifier-xyz',
    clientId: overrides.clientId ?? harness.tenant.client_id,
    redirectUri: 'http://localhost:3000/callback',
    tenantId: harness.tenant.id,
    scopes: ['User.Read'],
    tokenScopes: overrides.tokenScopes,
    createdAt: Date.now(),
  });
}

describe('plan 06-05 — real delegated OAuth handlers', () => {
  let harness: Harness | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = undefined;
    }
    vi.restoreAllMocks();
  });

  it('/authorize happy path stores the client challenge and redirects to Microsoft', async () => {
    harness = await startApp({});
    const pkce = newPkce();
    const state = crypto.randomBytes(16).toString('base64url');

    const res = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
          state,
          client_id: harness.tenant.client_id,
        }),
      { redirect: 'manual' }
    );

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const redirect = new URL(location!);
    expect(redirect.origin).toBe('https://login.microsoftonline.com');
    expect(redirect.searchParams.get('client_id')).toBe(harness.tenant.client_id);
    expect(redirect.searchParams.get('code_challenge')).not.toBe(pkce.challenge);

    const entry = await harness.pkceStore.takeByChallenge(harness.tenant.id, pkce.challenge);
    expect(entry?.redirectUri).toBe('http://localhost:3000/callback');
    expect(entry?.clientCodeChallengeMethod).toBe('S256');
  });

  it('/authorize exact duplicate retry reuses the stored server challenge', async () => {
    harness = await startApp({});
    const pkce = newPkce();
    const params = new URLSearchParams({
      redirect_uri: 'http://localhost:3000/callback',
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      state: crypto.randomBytes(16).toString('base64url'),
      client_id: harness.tenant.client_id,
    });

    const first = await fetch(`${harness.url}/authorize?${params}`, { redirect: 'manual' });
    const second = await fetch(`${harness.url}/authorize?${params}`, { redirect: 'manual' });

    expect(first.status).toBe(302);
    expect(second.status).toBe(302);
    const firstRedirect = new URL(first.headers.get('location')!);
    const secondRedirect = new URL(second.headers.get('location')!);
    expect(secondRedirect.searchParams.get('code_challenge')).toBe(
      firstRedirect.searchParams.get('code_challenge')
    );

    const token = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-after-retry',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: pkce.verifier,
      }),
    });
    expect(token.status).toBe(200);
  });

  it('/authorize duplicate challenge with different state still fails closed', async () => {
    harness = await startApp({});
    const pkce = newPkce();
    const baseParams = {
      redirect_uri: 'http://localhost:3000/callback',
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      client_id: harness.tenant.client_id,
    };

    const first = await fetch(
      `${harness.url}/authorize?${new URLSearchParams({ ...baseParams, state: 'state-1' })}`,
      { redirect: 'manual' }
    );
    const second = await fetch(
      `${harness.url}/authorize?${new URLSearchParams({ ...baseParams, state: 'state-2' })}`,
      { redirect: 'manual' }
    );

    expect(first.status).toBe(302);
    expect(second.status).toBe(400);
    const body = (await second.json()) as { error: string };
    expect(body.error).toBe('pkce_challenge_collision');
  });

  it('/authorize honors static exact redirect allowlists outside production host policy', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      harness = await startApp({
        tenant: { redirect_uri_allowlist: ['https://hosted.example/callback'] },
        authorizeConfig: { publicUrlHost: 'mcp.example.com', extraAllowedHosts: [] },
      });
      const pkce = newPkce();

      const res = await fetch(
        `${harness.url}/authorize?` +
          new URLSearchParams({
            redirect_uri: 'https://hosted.example/callback',
            code_challenge: pkce.challenge,
            code_challenge_method: 'S256',
            client_id: harness.tenant.client_id,
          }),
        { redirect: 'manual' }
      );

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toBeTruthy();
      expect(new URL(location!).searchParams.get('redirect_uri')).toBe(
        'https://hosted.example/callback'
      );
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });

  it('/authorize rejects forbidden schemes, allowlist misses, and malformed challenges', async () => {
    harness = await startApp({});
    const pkce = newPkce();

    const badScheme = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'javascript:alert(1)',
          code_challenge: pkce.challenge,
          client_id: harness.tenant.client_id,
        }),
      { redirect: 'manual' }
    );
    expect(badScheme.status).toBe(400);

    const allowlistMiss = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:4000/not-allowed',
          code_challenge: pkce.challenge,
          client_id: harness.tenant.client_id,
        }),
      { redirect: 'manual' }
    );
    expect(allowlistMiss.status).toBe(400);

    const malformedChallenge = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: 'too-short',
          client_id: harness.tenant.client_id,
        }),
      { redirect: 'manual' }
    );
    expect(malformedChallenge.status).toBe(400);
    const body = (await malformedChallenge.json()) as { error: string };
    expect(body.error).toBe('invalid_code_challenge');
  });

  it('/token exchanges a valid PKCE entry and keeps refresh tokens server-side', async () => {
    harness = await startApp({});
    const pkce = newPkce();
    await seedPkce(harness, pkce.verifier);

    const res = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-1',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: pkce.verifier,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
    };
    expect(body.access_token).toBe('access-token-abc');
    expect(body.refresh_token).toEqual(expect.stringMatching(/^mcp_rt_/));
    expect(body.refresh_token).not.toContain('refresh-token-secret');
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBeGreaterThan(0);

    expect(harness.mockAcquireByCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'auth-code-1',
        redirectUri: 'http://localhost:3000/callback',
        codeVerifier: 'server-verifier-xyz',
        scopes: ['User.Read'],
      })
    );
  });

  it('/token rejects authorization-code exchanges missing bound client_id or redirect_uri', async () => {
    harness = await startApp({});

    const missingClientPkce = newPkce();
    await seedPkce(harness, missingClientPkce.verifier);
    const missingClient = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-missing-client',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: missingClientPkce.verifier,
      }),
    });
    expect(missingClient.status).toBe(400);
    expect(((await missingClient.json()) as { error: string }).error).toBe('invalid_request');

    const missingRedirectPkce = newPkce();
    await seedPkce(harness, missingRedirectPkce.verifier);
    const missingRedirect = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-missing-redirect',
        client_id: harness.tenant.client_id,
        code_verifier: missingRedirectPkce.verifier,
      }),
    });
    expect(missingRedirect.status).toBe(400);
    expect(((await missingRedirect.json()) as { error: string }).error).toBe('invalid_request');
    expect(harness.mockAcquireByCode).not.toHaveBeenCalled();
  });

  it('/authorize rejects offline_access for auth-code-only dynamic clients', async () => {
    const dynamicClientId = 'dynamic-auth-code-only-client';
    harness = await startApp({
      pgPool: fakeDynamicClientPool({
        tenantId: 'tenant-oauth-surface',
        clientId: dynamicClientId,
        redirectUri: 'http://localhost:3000/callback',
        grantTypes: ['authorization_code'],
      }),
    });
    const pkce = newPkce();

    const res = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
          client_id: dynamicClientId,
          scope: 'offline_access User.Read',
        }),
      { redirect: 'manual' }
    );

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('invalid_scope');
  });

  it('does not store upstream refresh material for auth-code-only dynamic clients', async () => {
    const dynamicClientId = 'dynamic-auth-code-only-client';
    harness = await startApp({
      pgPool: fakeDynamicClientPool({
        tenantId: 'tenant-oauth-surface',
        clientId: dynamicClientId,
        redirectUri: 'http://localhost:3000/callback',
        grantTypes: ['authorization_code'],
      }),
    });
    const pkce = newPkce();
    await seedPkce(harness, pkce.verifier, {
      clientId: dynamicClientId,
      tokenScopes: ['User.Read'],
    });

    const res = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-dynamic-no-refresh',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: dynamicClientId,
        code_verifier: pkce.verifier,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { refresh_token?: string };
    expect(body.refresh_token).toBeUndefined();
    const sessionStore = new SessionStore(harness.redis, Buffer.alloc(32, 7));
    const sessionRecord = await sessionStore.get(harness.tenant.id, 'access-token-abc');
    expect(sessionRecord?.refreshToken).toBeUndefined();
  });

  it('/token rotates opaque gateway refresh handles without exposing upstream refresh tokens', async () => {
    const mockAcquireByCode = vi.fn(async () => ({
      accessToken: 'access-token-initial',
      refreshToken: 'upstream-refresh-token-initial',
      expiresOn: new Date(Date.now() + 3600 * 1000),
      account: { homeAccountId: 'home-account-1' },
    }));
    const mockAcquireByRefreshToken = vi.fn(async () => ({
      accessToken: 'access-token-rotated',
      refreshToken: 'upstream-refresh-token-rotated',
      expiresOn: new Date(Date.now() + 3600 * 1000),
      account: { homeAccountId: 'home-account-1' },
    }));
    harness = await startApp({
      msalClient: {
        acquireTokenByCode: mockAcquireByCode,
        acquireTokenByRefreshToken: mockAcquireByRefreshToken,
      },
    });
    const pkce = newPkce();
    await seedPkce(harness, pkce.verifier);

    const codeRes = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-for-refresh',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: pkce.verifier,
      }),
    });
    expect(codeRes.status).toBe(200);
    const codeBody = (await codeRes.json()) as { refresh_token: string };
    expect(codeBody.refresh_token).toEqual(expect.stringMatching(/^mcp_rt_/));
    expect(JSON.stringify(codeBody)).not.toContain('upstream-refresh-token-initial');

    const refreshRes = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: codeBody.refresh_token,
        client_id: harness.tenant.client_id,
      }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshBody = (await refreshRes.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(refreshBody.access_token).toBe('access-token-rotated');
    expect(refreshBody.refresh_token).toEqual(expect.stringMatching(/^mcp_rt_/));
    expect(refreshBody.refresh_token).not.toBe(codeBody.refresh_token);
    expect(JSON.stringify(refreshBody)).not.toContain('upstream-refresh-token-rotated');
    expect(mockAcquireByRefreshToken).toHaveBeenCalledWith({
      refreshToken: 'upstream-refresh-token-initial',
      scopes: ['User.Read'],
    });
  });

  it('/token rejects refresh requests without a valid opaque gateway refresh handle', async () => {
    harness = await startApp({});

    const missing = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token' }),
    });
    expect(missing.status).toBe(400);
    const missingBody = (await missing.json()) as { error: string; error_description: string };
    expect(missingBody.error).toBe('invalid_request');
    expect(missingBody.error_description).toBe('refresh_token required');

    const invalid = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'mcp_rt_invalid',
        client_id: harness.tenant.client_id,
      }),
    });
    expect(invalid.status).toBe(400);
    const invalidBody = (await invalid.json()) as { error: string };
    expect(invalidBody.error).toBe('invalid_grant');
  });

  it('/token rejects refresh client mismatches and upstream refresh failures', async () => {
    harness = await startApp({});
    const pkce = newPkce();
    await seedPkce(harness, pkce.verifier);

    const codeRes = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-client-mismatch',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: pkce.verifier,
      }),
    });
    expect(codeRes.status).toBe(200);
    const codeBody = (await codeRes.json()) as { refresh_token: string };

    const mismatch = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: codeBody.refresh_token,
        client_id: 'wrong-client-id',
      }),
    });
    expect(mismatch.status).toBe(400);
    expect(((await mismatch.json()) as { error: string }).error).toBe('invalid_grant');
    await harness.close();
    harness = undefined;

    const mockAcquireByCode = vi.fn(async () => ({
      accessToken: 'access-token-before-upstream-failure',
      refreshToken: 'upstream-refresh-token-before-failure',
      expiresOn: new Date(Date.now() + 3600 * 1000),
      account: { homeAccountId: 'home-account-1' },
    }));
    const mockAcquireByRefreshToken = vi.fn(async () => null);
    harness = await startApp({
      msalClient: {
        acquireTokenByCode: mockAcquireByCode,
        acquireTokenByRefreshToken: mockAcquireByRefreshToken,
      },
    });
    const failingPkce = newPkce();
    await seedPkce(harness, failingPkce.verifier);
    const failingCodeRes = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-upstream-failure',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: failingPkce.verifier,
      }),
    });
    expect(failingCodeRes.status).toBe(200);
    const failingCodeBody = (await failingCodeRes.json()) as { refresh_token: string };

    const upstreamFailure = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: failingCodeBody.refresh_token,
        client_id: harness.tenant.client_id,
      }),
    });
    expect(upstreamFailure.status).toBe(400);
    expect(((await upstreamFailure.json()) as { error: string }).error).toBe('invalid_grant');
  });

  it('/token keeps PKCE retryable when required binding fields are missing', async () => {
    harness = await startApp({});
    const pkce = newPkce();
    await seedPkce(harness, pkce.verifier);

    const malformed = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-retryable',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: pkce.verifier,
      }),
    });
    expect(malformed.status).toBe(400);
    expect(((await malformed.json()) as { error: string }).error).toBe('invalid_request');

    const retry = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-retryable',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: pkce.verifier,
      }),
    });
    expect(retry.status).toBe(200);
    expect(harness.mockAcquireByCode).toHaveBeenCalledTimes(1);
  });

  it('/token rejects missing verifier, missing code, and PKCE misses before MSAL', async () => {
    harness = await startApp({});

    const missingVerifier = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: 'auth-code-1' }),
    });
    expect(missingVerifier.status).toBe(400);

    const missingCodePkce = newPkce();
    const missingCode = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code_verifier: missingCodePkce.verifier,
      }),
    });
    expect(missingCode.status).toBe(400);
    const missingCodeBody = (await missingCode.json()) as {
      error: string;
      error_description: string;
    };
    expect(missingCodeBody.error).toBe('invalid_request');
    expect(missingCodeBody.error_description).toBe('code required');

    const pkce = newPkce();
    const pkceMiss = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-1',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: pkce.verifier,
      }),
    });
    expect(pkceMiss.status).toBe(400);
    const body = (await pkceMiss.json()) as { error: string };
    expect(body.error).toBe('invalid_grant');
    expect(harness.mockAcquireByCode).not.toHaveBeenCalled();
  });

  it('/token handles non-delegated, empty, and thrown MSAL results', async () => {
    harness = await startApp({ msalClient: {} });
    const nonDelegatedPkce = newPkce();
    await seedPkce(harness, nonDelegatedPkce.verifier);
    const nonDelegated = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-1',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: nonDelegatedPkce.verifier,
      }),
    });
    expect(nonDelegated.status).toBe(500);
    await harness.close();
    harness = undefined;

    const emptyAcquire = vi.fn(async () => ({ expiresOn: new Date(Date.now() + 3600 * 1000) }));
    harness = await startApp({ msalClient: { acquireTokenByCode: emptyAcquire } });
    const emptyPkce = newPkce();
    await seedPkce(harness, emptyPkce.verifier);
    const emptyResult = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-2',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: emptyPkce.verifier,
      }),
    });
    expect(emptyResult.status).toBe(502);
    await harness.close();
    harness = undefined;

    const throwingAcquire = vi.fn(async () => {
      throw new Error('msal failed');
    });
    harness = await startApp({ msalClient: { acquireTokenByCode: throwingAcquire } });
    const throwingPkce = newPkce();
    await seedPkce(harness, throwingPkce.verifier);
    const thrown = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'auth-code-3',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: harness.tenant.client_id,
        code_verifier: throwingPkce.verifier,
      }),
    });
    expect(thrown.status).toBe(400);
  });
});

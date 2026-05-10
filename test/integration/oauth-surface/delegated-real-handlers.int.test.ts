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
import type { TenantRow } from '../../../src/lib/tenant/tenant-row.js';
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

  app.get('/authorize', loadTenantStub, createAuthorizeHandler({ pkceStore }));
  app.post(
    '/token',
    loadTenantStub,
    createTenantTokenHandler({
      pkceStore,
      tenantPool: mockTenantPool,
      redis,
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

async function seedPkce(harness: Harness, verifier: string): Promise<void> {
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  await harness.pkceStore.put(harness.tenant.id, {
    state: 'state-1',
    clientCodeChallenge: challenge,
    clientCodeChallengeMethod: 'S256',
    serverCodeVerifier: 'server-verifier-xyz',
    clientId: harness.tenant.client_id,
    redirectUri: 'http://localhost:3000/callback',
    tenantId: harness.tenant.id,
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

  it('/authorize rejects forbidden schemes, allowlist misses, and malformed challenges', async () => {
    harness = await startApp({});
    const pkce = newPkce();

    const badScheme = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'javascript:alert(1)',
          code_challenge: pkce.challenge,
        }),
      { redirect: 'manual' }
    );
    expect(badScheme.status).toBe(400);

    const allowlistMiss = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:4000/not-allowed',
          code_challenge: pkce.challenge,
        }),
      { redirect: 'manual' }
    );
    expect(allowlistMiss.status).toBe(400);

    const malformedChallenge = await fetch(
      `${harness.url}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: 'too-short',
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
    expect(body.refresh_token).toBeUndefined();
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBeGreaterThan(0);

    expect(harness.mockAcquireByCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'auth-code-1',
        redirectUri: 'http://localhost:3000/callback',
        codeVerifier: 'server-verifier-xyz',
        scopes: ['User.Read', 'Mail.Read'],
      })
    );
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
        code: 'auth-code-1',
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
        code: 'auth-code-2',
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
        code: 'auth-code-3',
        code_verifier: throwingPkce.verifier,
      }),
    });
    expect(thrown.status).toBe(400);
  });
});

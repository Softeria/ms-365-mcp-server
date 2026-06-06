/**
 * Plan 03-07 Task 2 — refresh-token migration: /token writes a SessionRecord
 * to the SessionStore; Graph 401 refresh path consults the store, performs
 * MSAL.acquireTokenByRefreshToken, rotates the session entry, and retries the
 * Graph call. No refresh token ever crosses an HTTP header.
 *
 * Coverage:
 *   Test 1: createTenantTokenHandler after successful MSAL acquireTokenByCode
 *           calls sessionStore.put with the (accessToken, refreshToken) pair;
 *           the HTTP response body does NOT contain refresh_token.
 *   Test 2: Graph 401 handler pulls the refresh token from sessionStore.get
 *           (NOT from a request header), calls acquireTokenByRefreshToken,
 *           rotates the session key on rt-rotation, retries Graph → 200.
 *   Test 3: TenantPool.getDekForTenant surfaces the per-tenant DEK for
 *           callers (server, graph-client) to build SessionStore instances.
 *   Test 4: sessionStore.put still records account metadata when MSAL returns
 *           no raw refreshToken.
 *   Test 5: Graph 401 refresh can use MSAL acquireTokenSilent when the raw
 *           refresh token is hidden inside MSAL's cache.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import { SessionStore } from '../../src/lib/session-store.js';
import { generateTenantDek } from '../../src/lib/crypto/dek.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const KEK = crypto.randomBytes(32);

function makeTenant(overrides: Partial<TenantRow> = {}): TenantRow {
  const { wrappedDek } = generateTenantDek(KEK);
  return {
    id: overrides.id ?? crypto.randomUUID(),
    mode: overrides.mode ?? 'delegated',
    client_id: overrides.client_id ?? 'app-client-id',
    client_secret_ref: overrides.client_secret_ref ?? null,
    client_secret_resolved: overrides.client_secret_resolved ?? 'super-secret',
    tenant_id: overrides.tenant_id ?? 'tenant-guid',
    cloud_type: overrides.cloud_type ?? 'global',
    redirect_uri_allowlist: overrides.redirect_uri_allowlist ?? ['http://localhost:3000/callback'],
    cors_origins: overrides.cors_origins ?? [],
    allowed_scopes: overrides.allowed_scopes ?? ['User.Read', 'Mail.Read'],
    enabled_tools: overrides.enabled_tools ?? null,
    wrapped_dek: overrides.wrapped_dek === undefined ? wrappedDek : overrides.wrapped_dek,
    slug: overrides.slug ?? null,
    disabled_at: overrides.disabled_at ?? null,
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
  };
}

interface Harness {
  url: string;
  redis: MemoryRedisFacade;
  tenant: TenantRow;
  pkceStore: RedisPkceStore;
  sessionStore: SessionStore;
  dek: Buffer;
  mockMsal: ReturnType<typeof vi.fn>;
  close: () => Promise<void>;
}

async function startApp(tenantOverrides: Partial<TenantRow> = {}): Promise<Harness> {
  const redis = new MemoryRedisFacade();
  const pkceStore = new RedisPkceStore(redis);
  const tenant = makeTenant(tenantOverrides);
  // Build the DEK the handlers will use by unwrapping the tenant's wrapped_dek.
  const { unwrapTenantDek } = await import('../../src/lib/crypto/dek.js');
  if (!tenant.wrapped_dek) throw new Error('tenant.wrapped_dek missing in harness');
  const dek = unwrapTenantDek(tenant.wrapped_dek, KEK);
  const sessionStore = new SessionStore(redis, dek);

  const mockMsal = vi.fn(async () => ({
    accessToken: 'access-AAA-initial',
    refreshToken: 'rt-initial-SECRET',
    idToken: 'id-token-xyz',
    expiresOn: new Date(Date.now() + 3600 * 1000),
    account: { homeAccountId: 'home-1', username: 'user@example.com' },
  }));

  const mockTenantPool = {
    acquire: vi.fn(async () => ({
      acquireTokenByCode: mockMsal,
      getTokenCache: () => ({
        serialize: () => 'serialized-msal-cache',
      }),
    })),
    buildCachePlugin: vi.fn(),
    evict: vi.fn(),
    getDekForTenant: vi.fn(() => dek),
  };

  const { createTenantTokenHandler } = await import('../../src/lib/oauth/tenant-handlers.js');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const loadTenantStub = (req: Request, _res: Response, next: NextFunction): void => {
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    if (!req.params) (req as Request & { params: Record<string, string> }).params = {};
    (req as Request & { params: Record<string, string> }).params.tenantId = '_';
    next();
  };

  app.post(
    '/token',
    loadTenantStub,
    createTenantTokenHandler({
      pkceStore,
      tenantPool: mockTenantPool as unknown as {
        acquire: (t: TenantRow) => Promise<unknown>;
        getDekForTenant: (tid: string) => Buffer;
      },
      redis,
    })
  );

  return await new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        redis,
        tenant,
        pkceStore,
        sessionStore,
        dek,
        mockMsal,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

async function doTokenExchange(h: Harness): Promise<Response> {
  // Seed PKCE entry — plan 03-08 keys PKCE Redis entries on the real tenant id.
  const clientVerifier = crypto.randomBytes(32).toString('base64url');
  const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');
  const serverVerifier = crypto.randomBytes(32).toString('base64url');

  await h.pkceStore.put(h.tenant.id, {
    state: 'abc',
    clientCodeChallenge: clientChallenge,
    clientCodeChallengeMethod: 'S256',
    serverCodeVerifier: serverVerifier,
    clientId: h.tenant.client_id,
    redirectUri: 'http://localhost:3000/callback',
    tenantId: h.tenant.id,
    createdAt: Date.now(),
  });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: 'auth-code-xyz',
    code_verifier: clientVerifier,
    redirect_uri: 'http://localhost:3000/callback',
    client_id: h.tenant.client_id,
  });

  return fetch(`${h.url}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

describe('plan 03-07 Task 2 — refresh-token server-side session migration', () => {
  let harness: Harness | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = undefined;
    }
  });

  // ── Test 1: /token writes SessionRecord + omits refresh_token from body ────
  it('Test 1: /token success writes a SessionRecord to SessionStore; body does NOT return refresh_token', async () => {
    harness = await startApp();
    const res = await doTokenExchange(harness);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.access_token).toBe('access-AAA-initial');
    expect(body.token_type).toBe('Bearer');
    // Hosted connectors receive only an opaque gateway refresh handle, never the upstream token.
    expect(body.refresh_token).toEqual(expect.stringMatching(/^mcp_rt_/));
    expect(body.refresh_token).not.toBe('rt-initial-SECRET');

    // Session persists to Redis (envelope-encrypted under mcp:session:*)
    const sessionKeys = await harness.redis.keys('mcp:session:*');
    expect(sessionKeys.length).toBe(1);
    // And retrievable via the store
    const record = await harness.sessionStore.get(harness.tenant.id, 'access-AAA-initial');
    expect(record?.refreshToken).toBe('rt-initial-SECRET');
    expect(record?.clientId).toBe(harness.tenant.client_id);
    expect(record?.accountHomeId).toBe('home-1');
    expect(record?.scopes).toEqual(['User.Read']);
    expect(record?.msalCache).toBe('serialized-msal-cache');
    expect(record?.graphAccessToken).toBe('access-AAA-initial');
  });

  // ── Test 2: 401 refresh path uses SessionStore, not request header ─────────
  it('Test 2: Graph 401 refresh consults SessionStore, calls MSAL.acquireTokenByRefreshToken, rotates session', async () => {
    harness = await startApp();
    // Seed a session directly (simulates a prior /token exchange)
    const oldAccess = 'access-OLD-abc';
    const oldRefresh = 'rt-OLD-SECRET';
    await harness.sessionStore.put(harness.tenant.id, oldAccess, {
      tenantId: harness.tenant.id,
      refreshToken: oldRefresh,
      accountHomeId: 'home-1',
      clientId: harness.tenant.client_id,
      scopes: harness.tenant.allowed_scopes,
      createdAt: Date.now(),
    });

    const mockAcquireByRt = vi.fn(async () => ({
      accessToken: 'access-NEW-xyz',
      refreshToken: 'rt-NEW-SECRET',
      expiresOn: new Date(Date.now() + 3600 * 1000),
      account: { homeAccountId: 'home-1' },
    }));
    const fakeMsal = { acquireTokenByRefreshToken: mockAcquireByRt };
    const mockTenantPool = {
      acquire: vi.fn(async () => fakeMsal),
      getDekForTenant: vi.fn(() => harness!.dek),
    };

    // Import the new helper that graph-client uses under the hood.
    const { refreshSessionAndRetry } = await import('../../src/graph-client.js');
    const result = await refreshSessionAndRetry({
      tenant: harness.tenant,
      oldAccessToken: oldAccess,
      tenantPool: mockTenantPool as never,
      redis: harness.redis,
    });

    // Called MSAL's refresh-by-rt path with the stored refresh token (NOT a header)
    expect(mockAcquireByRt).toHaveBeenCalledTimes(1);
    const call = mockAcquireByRt.mock.calls[0][0];
    expect(call.refreshToken).toBe(oldRefresh);
    expect(call.scopes).toEqual(harness.tenant.allowed_scopes);

    // Fresh access token returned
    expect(result.accessToken).toBe('access-NEW-xyz');

    // Client-facing session key remains stable; current Graph token rotates inside it.
    const oldSession = await harness.sessionStore.get(harness.tenant.id, oldAccess);
    expect(oldSession?.refreshToken).toBe('rt-NEW-SECRET');
    expect(oldSession?.graphAccessToken).toBe('access-NEW-xyz');
    const newSession = await harness.sessionStore.get(harness.tenant.id, 'access-NEW-xyz');
    expect(newSession).toBeNull();

    // No entries leak plaintext under mcp:session:*
    const keys = await harness.redis.keys('mcp:session:*');
    expect(keys.length).toBe(1);
    const raw = await harness.redis.get(keys[0]);
    expect(raw).not.toContain('rt-NEW-SECRET');
    expect(raw).not.toContain('rt-OLD-SECRET');
  });

  // ── Test 3: TenantPool.getDekForTenant works post-acquire ──────────────────
  it('Test 3: TenantPool.getDekForTenant returns the per-tenant DEK after acquire', async () => {
    const { TenantPool } = await import('../../src/lib/tenant/tenant-pool.js');
    const redis = new MemoryRedisFacade();
    const pool = new TenantPool(redis, KEK);
    const tenant = makeTenant({ mode: 'bearer' });
    // Pre-acquire so the pool has an entry
    await pool.acquire(tenant);
    const dek = pool.getDekForTenant(tenant.id);
    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);

    // Before acquire → throws
    const notInPool = makeTenant();
    expect(() => pool.getDekForTenant(notInPool.id)).toThrow(/no entry/i);

    await pool.drain();
  });

  // ── Test 4: no refresh token in MSAL response → account-backed session ────
  it('Test 4: MSAL acquire returning no refreshToken writes account-backed session', async () => {
    harness = await startApp();
    harness.mockMsal.mockImplementationOnce(async () => ({
      accessToken: 'access-no-rt',
      // refreshToken intentionally absent
      idToken: 'id',
      expiresOn: new Date(Date.now() + 3600 * 1000),
      account: { homeAccountId: 'home-1' },
    }));

    const res = await doTokenExchange(harness);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.access_token).toBe('access-no-rt');

    const keys = await harness.redis.keys('mcp:session:*');
    expect(keys.length).toBe(1);
    const record = await harness.sessionStore.get(harness.tenant.id, 'access-no-rt');
    expect(record?.refreshToken).toBeUndefined();
    expect(record?.accountHomeId).toBe('home-1');
    expect(record?.clientId).toBe(harness.tenant.client_id);
    expect(record?.graphAccessToken).toBe('access-no-rt');
  });

  it('Test 5: Graph 401 refresh uses acquireTokenSilent when refreshToken is cache-hidden', async () => {
    harness = await startApp();
    const oldAccess = 'access-OLD-cache-hidden';
    await harness.sessionStore.put(harness.tenant.id, oldAccess, {
      tenantId: harness.tenant.id,
      accountHomeId: 'home-1',
      msalCache: 'serialized-cache-before',
      clientId: harness.tenant.client_id,
      scopes: harness.tenant.allowed_scopes,
      createdAt: Date.now(),
    });

    const account = { homeAccountId: 'home-1', username: 'user@example.com' };
    const mockGetAccountByHomeId = vi.fn(async () => account);
    const mockDeserialize = vi.fn();
    const mockSerialize = vi.fn(() => 'serialized-cache-after');
    const mockAcquireSilent = vi.fn(async () => ({
      accessToken: 'access-SILENT-xyz',
      expiresOn: new Date(Date.now() + 3600 * 1000),
      account,
    }));
    const fakeMsal = {
      acquireTokenSilent: mockAcquireSilent,
      getTokenCache: () => ({
        getAccountByHomeId: mockGetAccountByHomeId,
        deserialize: mockDeserialize,
        serialize: mockSerialize,
      }),
    };
    const mockTenantPool = {
      acquire: vi.fn(async () => fakeMsal),
      getDekForTenant: vi.fn(() => harness!.dek),
    };

    const { refreshSessionAndRetry } = await import('../../src/graph-client.js');
    const result = await refreshSessionAndRetry({
      tenant: harness.tenant,
      oldAccessToken: oldAccess,
      tenantPool: mockTenantPool as never,
      redis: harness.redis,
    });

    expect(mockDeserialize).toHaveBeenCalledWith('serialized-cache-before');
    expect(mockGetAccountByHomeId).toHaveBeenCalledWith('home-1');
    expect(mockAcquireSilent).toHaveBeenCalledWith({
      account,
      scopes: harness.tenant.allowed_scopes,
      forceRefresh: true,
    });
    expect(result.accessToken).toBe('access-SILENT-xyz');
    const oldSession = await harness.sessionStore.get(harness.tenant.id, oldAccess);
    expect(oldSession?.graphAccessToken).toBe('access-SILENT-xyz');
    expect(oldSession?.msalCache).toBe('serialized-cache-after');
    const newSession = await harness.sessionStore.get(harness.tenant.id, 'access-SILENT-xyz');
    expect(newSession).toBeNull();
  });
});

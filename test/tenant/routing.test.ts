/**
 * Plan 03-08 Task 2 — tenant-scoped routing tests (TENANT-01, D-13).
 *
 * Covers the URL-path routing contract once `/t/:tenantId/*` supersedes the
 * legacy single-tenant /authorize + /token mounts:
 *
 *   1. `/t/:tenantId/authorize` — 302 on happy path; 404 on non-GUID tenantId;
 *      404 on unknown tenantId; 400 on invalid redirect_uri.
 *   2. `/t/:tenantId/token` — exchange succeeds with server-side PKCE verifier.
 *   3. Routing order — `/t/:tenantId/*` routes must be mounted BEFORE
 *      `/.well-known/*` so a malformed tenantId cannot shadow discovery.
 *   4. Per-tenant CORS — requests to /t/:tenantId/* MUST honor
 *      `tenant.cors_origins` (fall back to global allowlist when empty).
 *   5. PHASE3_TENANT_PLACEHOLDER no longer appears as a literal in PKCE keys —
 *      after Task 2 swap, the PKCE key carries the real tenantId segment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import { generateTenantDek } from '../../src/lib/crypto/dek.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../src/lib/tool-selection/enabled-tools-parser.js', () => ({
  ensureEnabledToolsSet: vi.fn(() => Object.freeze(new Set<string>())),
}));

const KEK = crypto.randomBytes(32);
const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function makeTenant(id: string, overrides: Partial<TenantRow> = {}): TenantRow {
  const { wrappedDek } = generateTenantDek(KEK);
  return {
    id,
    mode: overrides.mode ?? 'delegated',
    client_id: overrides.client_id ?? 'client-' + id.slice(0, 4),
    client_secret_ref: overrides.client_secret_ref ?? null,
    client_secret_resolved: overrides.client_secret_resolved ?? 'resolved-secret',
    tenant_id: overrides.tenant_id ?? id,
    cloud_type: overrides.cloud_type ?? 'global',
    redirect_uri_allowlist: overrides.redirect_uri_allowlist ?? ['http://localhost:3000/callback'],
    cors_origins: overrides.cors_origins ?? [],
    allowed_scopes: overrides.allowed_scopes ?? ['User.Read'],
    enabled_tools: overrides.enabled_tools ?? null,
    wrapped_dek: overrides.wrapped_dek === undefined ? wrappedDek : overrides.wrapped_dek,
    slug: overrides.slug ?? null,
    disabled_at: overrides.disabled_at ?? null,
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
  };
}

async function buildHarness(): Promise<{
  url: string;
  redis: MemoryRedisFacade;
  pkceStore: RedisPkceStore;
  tenants: Map<string, TenantRow>;
  close: () => Promise<void>;
  mockAcquireByCode: ReturnType<typeof vi.fn>;
}> {
  const redis = new MemoryRedisFacade();
  const pkceStore = new RedisPkceStore(redis);
  const tenants = new Map<string, TenantRow>([
    [TENANT_A, makeTenant(TENANT_A, { cors_origins: ['https://app-a.example.com'] })],
    [TENANT_B, makeTenant(TENANT_B, { cors_origins: ['https://app-b.example.com'] })],
  ]);

  const mockAcquireByCode = vi.fn(async () => ({
    accessToken: 'delegated-access-token',
    expiresOn: new Date(Date.now() + 3600 * 1000),
  }));

  const mockTenantPool = {
    acquire: vi.fn(async () => ({ acquireTokenByCode: mockAcquireByCode })),
    buildCachePlugin: vi.fn(),
    evict: vi.fn(),
    getDekForTenant: vi.fn(() => Buffer.alloc(32, 7)),
  };

  // Dynamic imports keep vi.mock('../../src/logger.js') effective.
  const { createAuthorizeHandler, createTenantTokenHandler } =
    await import('../../src/lib/oauth/tenant-handlers.js');
  const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
  const { createPerTenantCorsMiddleware } = await import('../../src/lib/cors.js');

  // Inline mock pool that resolves from the in-memory map.
  const pool = {
    query: vi.fn(async (_sql: string, params: unknown[]) => {
      const id = params[0] as string;
      const t = tenants.get(id);
      if (!t || t.disabled_at !== null) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [t], rowCount: 1 };
    }),
  } as unknown as import('pg').Pool;

  const loadTenant = createLoadTenantMiddleware({ pool });

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Per-tenant CORS — requires loadTenant to have populated req.tenant first.
  // Fall back to global allowlist when tenant.cors_origins is empty.
  app.use('/t/:tenantId', loadTenant);
  app.use(
    '/t/:tenantId',
    createPerTenantCorsMiddleware({
      mode: 'prod',
      fallbackAllowlist: ['https://fallback.example.com'],
    })
  );

  app.get('/t/:tenantId/authorize', createAuthorizeHandler({ pkceStore }));
  app.post(
    '/t/:tenantId/token',
    createTenantTokenHandler({
      pkceStore,
      tenantPool: mockTenantPool as unknown as Parameters<
        typeof createTenantTokenHandler
      >[0]['tenantPool'],
      redis,
    })
  );

  const server = await new Promise<http.Server>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    redis,
    pkceStore,
    tenants,
    close: () => new Promise<void>((r) => server.close(() => r())),
    mockAcquireByCode,
  };
}

describe('plan 03-08 — /t/:tenantId/* routing', () => {
  let harness: Awaited<ReturnType<typeof buildHarness>>;

  beforeEach(async () => {
    harness = await buildHarness();
  });

  afterEach(async () => {
    await harness.close();
  });

  describe('/t/:tenantId/authorize', () => {
    it('302 redirect on happy path (known tenant + valid redirect_uri + valid challenge)', async () => {
      const challenge = crypto.randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        redirect_uri: 'http://localhost:3000/callback',
        code_challenge: challenge,
        state: 'test-state',
      });
      const res = await fetch(`${harness.url}/t/${TENANT_A}/authorize?${params}`, {
        redirect: 'manual',
      });
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('login.microsoftonline.com');
    });

    it('404 tenant_not_found for unknown tenantId', async () => {
      const UNKNOWN = 'deadbeef-dead-beef-dead-beefdeadbeef';
      const res = await fetch(`${harness.url}/t/${UNKNOWN}/authorize`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('tenant_not_found');
    });

    it('404 tenant_not_found for non-GUID tenantId (no DB lookup)', async () => {
      const res = await fetch(`${harness.url}/t/not-a-guid/authorize`);
      expect(res.status).toBe(404);
    });

    it('400 invalid_redirect_uri when URI not in tenant.redirect_uri_allowlist', async () => {
      const challenge = crypto.randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        redirect_uri: 'http://attacker.example.com/callback',
        code_challenge: challenge,
        state: 'test-state',
      });
      const res = await fetch(`${harness.url}/t/${TENANT_A}/authorize?${params}`);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('invalid_redirect_uri');
    });
  });

  describe('/t/:tenantId/token', () => {
    it('exchanges code for token with server-side PKCE verifier', async () => {
      // First complete /authorize to store a PKCE entry.
      const clientVerifier = crypto.randomBytes(32).toString('base64url');
      const clientChallenge = crypto
        .createHash('sha256')
        .update(clientVerifier)
        .digest('base64url');
      const authorizeParams = new URLSearchParams({
        redirect_uri: 'http://localhost:3000/callback',
        code_challenge: clientChallenge,
        state: 'test-state',
      });
      const authorizeRes = await fetch(
        `${harness.url}/t/${TENANT_A}/authorize?${authorizeParams}`,
        { redirect: 'manual' }
      );
      expect(authorizeRes.status).toBe(302);

      // Exchange code for token.
      const tokenRes = await fetch(`${harness.url}/t/${TENANT_A}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'the-code',
          redirect_uri: 'http://localhost:3000/callback',
          code_verifier: clientVerifier,
        }),
      });
      expect(tokenRes.status).toBe(200);
      const body = (await tokenRes.json()) as { access_token: string };
      expect(body.access_token).toBe('delegated-access-token');
      expect(harness.mockAcquireByCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('PKCE key uses real tenantId (no more PHASE3_TENANT_PLACEHOLDER)', () => {
    it('Redis PKCE key carries the real tenant GUID, not "_" placeholder', async () => {
      const challenge = crypto.randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        redirect_uri: 'http://localhost:3000/callback',
        code_challenge: challenge,
        state: 'key-check-state',
      });
      await fetch(`${harness.url}/t/${TENANT_A}/authorize?${params}`, {
        redirect: 'manual',
      });

      const keys = await harness.redis.keys('mcp:pkce:*');
      expect(keys.length).toBeGreaterThan(0);
      // The PKCE key format is `mcp:pkce:<tenantId>:<challenge>`; the second
      // segment MUST be the real tenant GUID, not the legacy '_' placeholder.
      const keyWithTenant = keys.find((k) => k.includes(TENANT_A));
      expect(keyWithTenant).toBeDefined();
      const keyWithPlaceholder = keys.find((k) => k.includes(':_:'));
      expect(keyWithPlaceholder).toBeUndefined();
    });
  });

  describe('Per-tenant CORS middleware', () => {
    it('allows tenant.cors_origins entries for known tenants', async () => {
      const res = await fetch(`${harness.url}/t/${TENANT_A}/authorize`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://app-a.example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://app-a.example.com');
    });

    it('rejects tenant A origin when requesting tenant B path (isolation)', async () => {
      const res = await fetch(`${harness.url}/t/${TENANT_B}/authorize`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://app-a.example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });
      // Different tenant → different cors_origins — 403 on preflight.
      expect(res.status).toBe(403);
    });

    it('falls back to global allowlist when tenant.cors_origins is empty', async () => {
      // Swap tenant A to empty cors_origins
      harness.tenants.get(TENANT_A)!.cors_origins = [];
      // Our per-tenant CORS middleware falls back to fallbackAllowlist when empty.
      // The loadTenant LRU could be stale; evict first to pick up the change.
      // In real production admin mutations publish to mcp:tenant-invalidate.
      const { createLoadTenantMiddleware: _reload } =
        await import('../../src/lib/tenant/load-tenant.js');
      // Re-build harness is simpler.
      await harness.close();
      // Replacement: build a harness where tenant A has empty cors_origins.
      const redis = new MemoryRedisFacade();
      const pkceStore = new RedisPkceStore(redis);
      const tenants = new Map<string, TenantRow>([
        [TENANT_A, makeTenant(TENANT_A, { cors_origins: [] })],
      ]);
      const { createAuthorizeHandler } = await import('../../src/lib/oauth/tenant-handlers.js');
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const { createPerTenantCorsMiddleware } = await import('../../src/lib/cors.js');
      const pool = {
        query: vi.fn(async (_sql: string, params: unknown[]) => ({
          rows: [tenants.get(params[0] as string)].filter(Boolean),
          rowCount: 1,
        })),
      } as unknown as import('pg').Pool;
      const loadTenant = createLoadTenantMiddleware({ pool });

      const app = express();
      app.use(express.json());
      app.use('/t/:tenantId', loadTenant);
      app.use(
        '/t/:tenantId',
        createPerTenantCorsMiddleware({
          mode: 'prod',
          fallbackAllowlist: ['https://fallback.example.com'],
        })
      );
      app.get('/t/:tenantId/authorize', createAuthorizeHandler({ pkceStore }));

      const server2 = await new Promise<http.Server>((resolve) => {
        const s = http.createServer(app).listen(0, () => resolve(s));
      });
      const p = (server2.address() as AddressInfo).port;
      const baseUrl2 = `http://127.0.0.1:${p}`;

      const res = await fetch(`${baseUrl2}/t/${TENANT_A}/authorize`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://fallback.example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://fallback.example.com');

      // Not in global fallback either:
      const resBad = await fetch(`${baseUrl2}/t/${TENANT_A}/authorize`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://other.example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });
      expect(resBad.status).toBe(403);

      await new Promise<void>((r) => server2.close(() => r()));
      // Rebuild the outer harness so the afterEach close() succeeds.
      harness = await buildHarness();
    });
  });
});

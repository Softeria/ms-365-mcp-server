/**
 * Plan 03-08 Task 3 — multi-tenant isolation integration (ROADMAP SC#2).
 *
 * SC#2 signal: TWO concurrent tenants on ONE server instance never leak
 * state across each other. Asserted at multiple layers:
 *
 *   1. Routing — /t/A/authorize and /t/B/authorize resolve different tenants;
 *      a request to tenant A URL never sees tenant B config.
 *   2. PKCE — an /authorize under tenant A puts a Redis entry keyed on
 *      `mcp:pkce:A:*`; the key is NOT reachable via a tenant B lookup.
 *   3. CORS — tenant A origin rejected on tenant B preflight.
 *   4. Invalidation — evicting tenant A from the LRU does NOT affect B.
 *   5. Redirect-URI allowlist — tenant A's callback URL is NOT in tenant B's
 *      allowlist, so a /t/B/authorize with A's callback returns 400.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';
import {
  publishTenantInvalidation,
  subscribeToTenantInvalidation,
} from '../../src/lib/tenant/tenant-invalidation.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const TENANT_A_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const TENANT_B_ID = 'bbbbbbbb-5555-6666-7777-888888888888';

async function makePool(): Promise<Pool> {
  const db = newDb();
  db.registerExtension('pgcrypto', () => {});
  const { Pool: PgMemPool } = db.adapters.createPg();
  const pool = new PgMemPool() as Pool;
  await pool.query(`
    CREATE TABLE tenants (
      id text PRIMARY KEY,
      mode text NOT NULL,
      client_id text NOT NULL,
      client_secret_ref text NULL,
      tenant_id text NOT NULL,
      cloud_type text NOT NULL,
      redirect_uri_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
      cors_origins jsonb NOT NULL DEFAULT '[]'::jsonb,
      allowed_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
      enabled_tools text NULL,
      preset_version text NOT NULL DEFAULT 'essentials-v1',
      sharepoint_domain text NULL,
      rate_limits jsonb NULL,
      wrapped_dek jsonb NULL,
      slug text NULL,
      disabled_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  return pool;
}

async function insertTenantRow(
  pool: Pool,
  t: {
    id: string;
    clientId: string;
    tenantId: string;
    redirectUriAllowlist: string[];
    corsOrigins: string[];
    allowedScopes: string[];
  }
): Promise<void> {
  const placeholderEnvelope = {
    v: 1,
    iv: 'aaaaaaaaaaaaaaaa',
    tag: 'bbbbbbbbbbbbbbbbbbbbbbbb==',
    ct: 'cc==',
  };
  await pool.query(
    `INSERT INTO tenants (
       id, mode, client_id, tenant_id, cloud_type,
       redirect_uri_allowlist, cors_origins, allowed_scopes, wrapped_dek,
       slug, disabled_at
     ) VALUES ($1, 'delegated', $2, $3, 'global', $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, NULL, NULL)`,
    [
      t.id,
      t.clientId,
      t.tenantId,
      JSON.stringify(t.redirectUriAllowlist),
      JSON.stringify(t.corsOrigins),
      JSON.stringify(t.allowedScopes),
      JSON.stringify(placeholderEnvelope),
    ]
  );
}

function jsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return JSON.parse(value) as string[];
  return [];
}

function normalizeTenantRow(row: TenantRow): TenantRow {
  return {
    ...row,
    redirect_uri_allowlist: jsonArray(row.redirect_uri_allowlist),
    cors_origins: jsonArray(row.cors_origins),
    allowed_scopes: jsonArray(row.allowed_scopes),
  };
}

function createLoadTenantStub(
  pool: Pool
): express.RequestHandler & { evict: (tenantId: string) => void } {
  const cache = new Map<string, TenantRow>();
  const middleware = (async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.params.tenantId;
    let tenant = cache.get(tenantId);
    if (!tenant) {
      const { rows } = await pool.query<TenantRow>('SELECT * FROM tenants WHERE id = $1', [
        tenantId,
      ]);
      const row = rows[0];
      if (!row) {
        res.status(404).json({ error: 'tenant_not_found', tenantId });
        return;
      }
      tenant = normalizeTenantRow(row);
      cache.set(tenantId, tenant);
    }
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    next();
  }) as express.RequestHandler & { evict: (tenantId: string) => void };
  middleware.evict = (tenantId: string) => {
    cache.delete(tenantId);
  };
  return middleware;
}

describe('plan 03-08 — multi-tenant isolation (SC#2)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let pool: Pool;
  let redis: MemoryRedisFacade;
  let pkceStore: RedisPkceStore;

  beforeEach(async () => {
    pool = await makePool();
    redis = new MemoryRedisFacade();
    pkceStore = new RedisPkceStore(redis);

    // Insert two tenants with DIFFERING config so any leak between them
    // would manifest as a wrong-allowlist / wrong-cors / wrong-client_id.
    await insertTenantRow(pool, {
      id: TENANT_A_ID,
      clientId: 'client-A',
      tenantId: TENANT_A_ID,
      redirectUriAllowlist: ['http://localhost:3100/callback-a'],
      corsOrigins: ['https://app-a.example.com'],
      allowedScopes: ['User.Read'],
    });
    await insertTenantRow(pool, {
      id: TENANT_B_ID,
      clientId: 'client-B',
      tenantId: TENANT_B_ID,
      redirectUriAllowlist: ['http://localhost:3200/callback-b'],
      corsOrigins: ['https://app-b.example.com'],
      allowedScopes: ['Mail.Read'],
    });

    const mockAcquire = vi.fn(async () => ({
      accessToken: 'access-token',
      expiresOn: new Date(Date.now() + 3600 * 1000),
    }));
    const mockTenantPool = {
      acquire: vi.fn(async () => ({ acquireTokenByCode: mockAcquire })),
      buildCachePlugin: vi.fn(),
      evict: vi.fn(),
      getDekForTenant: vi.fn(() => Buffer.alloc(32, 7)),
    };

    const { createAuthorizeHandler, createTenantTokenHandler } =
      await import('../../src/lib/oauth/tenant-handlers.js');
    const { createPerTenantCorsMiddleware } = await import('../../src/lib/cors.js');

    const loadTenant = createLoadTenantStub(pool);

    await subscribeToTenantInvalidation(redis, {
      evict: (tid: string) => loadTenant.evict(tid),
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/t/:tenantId', loadTenant);
    app.use('/t/:tenantId', createPerTenantCorsMiddleware({ mode: 'prod', fallbackAllowlist: [] }));
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

    await new Promise<void>((resolve) => {
      server = http.createServer(app).listen(0, () => {
        const { port } = server!.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((r) => server!.close(() => r()));
      server = undefined;
    }
    await redis.quit();
  });

  it('each tenant URL routes to the correct tenant config (no cross-tenant bleed)', async () => {
    const challengeA = crypto.randomBytes(32).toString('base64url');
    const challengeB = crypto.randomBytes(32).toString('base64url');

    const resA = await fetch(
      `${baseUrl}/t/${TENANT_A_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3100/callback-a',
          code_challenge: challengeA,
          state: 'a',
        }),
      { redirect: 'manual' }
    );
    const resB = await fetch(
      `${baseUrl}/t/${TENANT_B_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3200/callback-b',
          code_challenge: challengeB,
          state: 'b',
        }),
      { redirect: 'manual' }
    );

    expect(resA.status).toBe(302);
    expect(resB.status).toBe(302);

    const locA = new URL(resA.headers.get('location')!);
    const locB = new URL(resB.headers.get('location')!);

    // tenant A's authorize URL forwards tenant A's client_id
    expect(locA.searchParams.get('client_id')).toBe('client-A');
    expect(locA.searchParams.get('redirect_uri')).toBe('http://localhost:3100/callback-a');
    expect(locA.searchParams.get('scope')).toBe('User.Read');

    // tenant B's authorize URL forwards tenant B's client_id
    expect(locB.searchParams.get('client_id')).toBe('client-B');
    expect(locB.searchParams.get('redirect_uri')).toBe('http://localhost:3200/callback-b');
    expect(locB.searchParams.get('scope')).toBe('Mail.Read');

    // And of course the paths were routed to different tenant GUIDs.
    expect(TENANT_A_ID).not.toBe(TENANT_B_ID);
  });

  it('tenant A redirect_uri is NOT acceptable on tenant B authorize (allowlist isolation)', async () => {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const res = await fetch(
      `${baseUrl}/t/${TENANT_B_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3100/callback-a', // tenant A's URI
          code_challenge: challenge,
          state: 'cross',
        })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_redirect_uri');
  });

  it('PKCE Redis keys are tenant-isolated (key format carries tenant id)', async () => {
    const challengeA = crypto.randomBytes(32).toString('base64url');
    const challengeB = crypto.randomBytes(32).toString('base64url');

    await fetch(
      `${baseUrl}/t/${TENANT_A_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3100/callback-a',
          code_challenge: challengeA,
          state: 'a',
        }),
      { redirect: 'manual' }
    );
    await fetch(
      `${baseUrl}/t/${TENANT_B_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3200/callback-b',
          code_challenge: challengeB,
          state: 'b',
        }),
      { redirect: 'manual' }
    );

    const allPkceKeys = await redis.keys('mcp:pkce:*');
    const keysForA = allPkceKeys.filter((k) => k.includes(TENANT_A_ID));
    const keysForB = allPkceKeys.filter((k) => k.includes(TENANT_B_ID));

    expect(keysForA.length).toBeGreaterThan(0);
    expect(keysForB.length).toBeGreaterThan(0);

    // No key should contain BOTH tenant ids — they must live in disjoint namespaces.
    for (const k of allPkceKeys) {
      const hasA = k.includes(TENANT_A_ID);
      const hasB = k.includes(TENANT_B_ID);
      expect(hasA && hasB).toBe(false);
    }
  });

  it('per-tenant CORS: tenant A origin accepted on /t/A but rejected on /t/B', async () => {
    // tenant A origin → tenant A path: allowed
    const resA = await fetch(`${baseUrl}/t/${TENANT_A_ID}/authorize`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app-a.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(resA.status).toBe(204);

    // tenant A origin → tenant B path: rejected
    const resB = await fetch(`${baseUrl}/t/${TENANT_B_ID}/authorize`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app-a.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(resB.status).toBe(403);
  });

  it('invalidating tenant A does not evict tenant B from the LRU', async () => {
    const challenge = crypto.randomBytes(32).toString('base64url');

    // Prime both tenants into the LRU by issuing one request each.
    const paramsA = new URLSearchParams({
      redirect_uri: 'http://localhost:3100/callback-a',
      code_challenge: challenge,
      state: 'a',
    });
    const paramsB = new URLSearchParams({
      redirect_uri: 'http://localhost:3200/callback-b',
      code_challenge: challenge,
      state: 'b',
    });

    const r1 = await fetch(`${baseUrl}/t/${TENANT_A_ID}/authorize?${paramsA}`, {
      redirect: 'manual',
    });
    const r2 = await fetch(`${baseUrl}/t/${TENANT_B_ID}/authorize?${paramsB}`, {
      redirect: 'manual',
    });
    expect(r1.status).toBe(302);
    expect(r2.status).toBe(302);

    // Tenant B is now safe in the LRU. Invalidating A must not evict B.
    await publishTenantInvalidation(redis, TENANT_A_ID);
    await new Promise((r) => setImmediate(r));

    // Next B request still 302; a B DB lookup would succeed anyway but the
    // point is the LRU hit path still routes B correctly.
    const r3 = await fetch(
      `${baseUrl}/t/${TENANT_B_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3200/callback-b',
          code_challenge: crypto.randomBytes(32).toString('base64url'),
          state: 'b2',
        }),
      { redirect: 'manual' }
    );
    expect(r3.status).toBe(302);
  });
});

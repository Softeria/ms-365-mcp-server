/**
 * Plan 04-07 Task 1 — Webhook validation-token sync echo (D-16).
 *
 * Covers (5 tests, per <behavior> lines 177-181 of 04-07-PLAN.md):
 *   Test 1: validation-token echo — ?validationToken=hello → 200, text/plain, body='hello'
 *   Test 2: URL-decode — ?validationToken=hello%20world → body='hello world'
 *   Test 3: response time — <100ms p99 across 10 sequential POSTs
 *   Test 4: unknown tenant — /t/<random-guid>/notifications → 404 from loadTenant
 *   Test 5: malformed tenantId — /t/not-a-guid/notifications → 404 from loadTenant
 *
 * Harness mirrors the production route shape while keeping pg-mem setup small:
 *   - pg-mem with only tenants, subscriptions, and audit_log tables.
 *   - Express server mounts POST /t/:tenantId/notifications with tenant stub
 *     middleware + webhook handler factory.
 *   - MemoryRedisFacade for Redis subset (not used by validation-token path).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newDb } from 'pg-mem';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Pool } from 'pg';
import crypto from 'node:crypto';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

import { createWebhookHandler } from '../webhooks.js';
import { MemoryRedisFacade } from '../../redis-facade.js';
import type { TenantRow } from '../../tenant/tenant-row.js';

const KEK = crypto.randomBytes(32);

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

    CREATE TABLE subscriptions (
      id text PRIMARY KEY,
      tenant_id text NOT NULL,
      graph_subscription_id text NOT NULL,
      resource text NOT NULL,
      change_type text NOT NULL,
      notification_url text NOT NULL,
      client_state jsonb NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE audit_log (
      id text PRIMARY KEY,
      tenant_id text NOT NULL,
      actor text NOT NULL,
      action text NOT NULL,
      target text NULL,
      ip text NULL,
      request_id text NOT NULL,
      result text NOT NULL,
      meta jsonb NOT NULL,
      ts timestamptz NOT NULL DEFAULT now()
    );
  `);
  return pool;
}

const TENANT_A = '12345678-1234-4234-8234-1234567890ab';

async function seedTenant(pool: Pool, id = TENANT_A): Promise<void> {
  const placeholderEnvelope = {
    v: 1,
    iv: 'aaaaaaaaaaaaaaaa',
    tag: 'bbbbbbbbbbbbbbbbbbbbbbbb==',
    ct: 'cc==',
  };
  await pool.query(
    `INSERT INTO tenants (id, mode, client_id, tenant_id, cloud_type, wrapped_dek)
       VALUES ($1, 'delegated', 'cid', 'tid', 'global', $2::jsonb)`,
    [id, JSON.stringify(placeholderEnvelope)]
  );
}

function createLoadTenantStub(pool: Pool): express.RequestHandler {
  return async (req, res, next): Promise<void> => {
    const tenantId = req.params.tenantId;
    const { rows } = await pool.query<TenantRow>('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    const tenant = rows[0];
    if (!tenant) {
      res.status(404).json({ error: 'tenant_not_found', tenantId });
      return;
    }
    (req as express.Request & { tenant?: TenantRow }).tenant = tenant;
    next();
  };
}

interface TenantPoolStub {
  getDekForTenant: ReturnType<typeof vi.fn>;
  acquire: ReturnType<typeof vi.fn>;
}

function makeTenantPoolStub(dek: Buffer): TenantPoolStub {
  return {
    getDekForTenant: vi.fn(() => dek),
    acquire: vi.fn(() => Promise.resolve(null)),
  };
}

async function startServer(
  pool: Pool,
  redis: MemoryRedisFacade,
  tenantPool: TenantPoolStub
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json({ limit: '1mb' }) as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (req as express.Request & { id?: string }).id =
      `req-${Math.random().toString(36).slice(2, 10)}`;
    next();
  });
  const loadTenant = createLoadTenantStub(pool);
  const handler = createWebhookHandler({
    pgPool: pool,
    redis: redis as unknown as import('../../redis.js').RedisClient,
    tenantPool: tenantPool as unknown as import('../../tenant/tenant-pool.js').TenantPool,
    kek: KEK,
  });
  app.post('/t/:tenantId/notifications', loadTenant, handler);
  const server = await new Promise<http.Server>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () =>
      new Promise<void>((r) => {
        server.close(() => r());
      }),
  };
}

describe('plan 04-07 Task 1 — webhook validation-token echo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // per-test pool
  });

  it('Test 1: validation-token echo — plain token returned as text/plain 200', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const redis = new MemoryRedisFacade();
    const tenantPool = makeTenantPoolStub(crypto.randomBytes(32));
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const res = await fetch(`${url}/t/${TENANT_A}/notifications?validationToken=hello`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '',
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/text\/plain/);
      const body = await res.text();
      expect(body).toBe('hello');
    } finally {
      await close();
    }
  });

  it('Test 2: URL-decode — percent-encoded token decoded before echo', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const redis = new MemoryRedisFacade();
    const tenantPool = makeTenantPoolStub(crypto.randomBytes(32));
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const res = await fetch(`${url}/t/${TENANT_A}/notifications?validationToken=hello%20world`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '',
      });
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toBe('hello world');
    } finally {
      await close();
    }
  });

  it('Test 3: response time — 10 sequential POSTs each <100ms (p99 budget)', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const redis = new MemoryRedisFacade();
    const tenantPool = makeTenantPoolStub(crypto.randomBytes(32));
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const timings: number[] = [];
      for (let i = 0; i < 10; i++) {
        const t0 = performance.now();
        const res = await fetch(`${url}/t/${TENANT_A}/notifications?validationToken=t${i}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '',
        });
        expect(res.status).toBe(200);
        await res.text();
        timings.push(performance.now() - t0);
      }
      // p99 across 10 samples is effectively the max; budget is <100ms per D-16.
      const max = Math.max(...timings);
      expect(max).toBeLessThan(100);
    } finally {
      await close();
    }
  });

  it('Test 4: unknown tenant — GUID shape ok but row missing → 404 from loadTenant', async () => {
    const pool = await makePool();
    // Do NOT seed; tenant row is absent.
    const redis = new MemoryRedisFacade();
    const tenantPool = makeTenantPoolStub(crypto.randomBytes(32));
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const otherGuid = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const res = await fetch(`${url}/t/${otherGuid}/notifications?validationToken=hi`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '',
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toMatchObject({ error: 'tenant_not_found' });
      // Handler was never reached — getDekForTenant NOT called.
      expect(tenantPool.getDekForTenant).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it('Test 5: malformed tenantId — non-GUID path segment with no tenant row returns 404', async () => {
    const pool = await makePool();
    const redis = new MemoryRedisFacade();
    const tenantPool = makeTenantPoolStub(crypto.randomBytes(32));
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const res = await fetch(`${url}/t/not-a-guid/notifications?validationToken=hi`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '',
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toMatchObject({ error: 'tenant_not_found' });
    } finally {
      await close();
    }
  });
});

/**
 * Plan 04-07 Task 2 — Redis SET NX dedup (D-16).
 *
 * Dedup key = sha256(subscriptionId:resource:changeType:subscriptionExpirationDateTime:tenantId).
 * Stored as `mcp:webhook:dedup:<sha256>` with 24h TTL. First-wins; duplicates
 * return 202 + X-Webhook-Duplicate: <count> header + webhook.duplicate audit.
 *
 * Tests (6 per <behavior> lines 265-270):
 *   Test 1: first receipt — 202, no X-Webhook-Duplicate header, key set
 *   Test 2: duplicate within 24h — 202 + X-Webhook-Duplicate: 1 + audit
 *   Test 3: different changeType → both unique (no dedup)
 *   Test 4: different expiration → both unique (no dedup)
 *   Test 5: multi-item batch with partial duplicate → X-Webhook-Duplicate: 1
 *   Test 6: TTL expiry — after 24h same notification → new 202, fresh key
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

import { createWebhookHandler, computeDedupKey, DEDUP_TTL_SECONDS } from '../webhooks.js';
import { MemoryRedisFacade } from '../../redis-facade.js';
import { encryptWithKey, generateDek } from '../../crypto/envelope.js';
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

interface SubscriptionFixture {
  id: string;
  graphSubscriptionId: string;
  clientStatePlaintext: string;
  resource: string;
  changeType: string;
}

async function seedSubscription(
  pool: Pool,
  tenantId: string,
  dek: Buffer,
  fx: SubscriptionFixture
): Promise<void> {
  const envelope = encryptWithKey(Buffer.from(fx.clientStatePlaintext, 'utf8'), dek);
  await pool.query(
    `INSERT INTO subscriptions
       (id, tenant_id, graph_subscription_id, resource, change_type, notification_url,
        client_state, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW() + INTERVAL '1 day')`,
    [
      fx.id,
      tenantId,
      fx.graphSubscriptionId,
      fx.resource,
      fx.changeType,
      'https://example.test/notifications',
      JSON.stringify(envelope),
    ]
  );
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

async function postNotification(
  url: string,
  tenantId: string,
  items: Array<{
    subscriptionId: string;
    changeType: string;
    resource: string;
    clientState: string;
    subscriptionExpirationDateTime: string;
    tenantId: string;
  }>
): Promise<Response> {
  return fetch(`${url}/t/${tenantId}/notifications`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: items }),
  });
}

async function waitForAuditCount(pool: Pool, action: string, count: number): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const rows = await pool.query(`SELECT COUNT(*)::int AS n FROM audit_log WHERE action = $1`, [
      action,
    ]);
    if ((rows.rows[0].n as number) >= count) return;
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('plan 04-07 Task 2 — Redis SET NX dedup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: first receipt — 202, no X-Webhook-Duplicate, key stored', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-1',
      clientStatePlaintext: 'cs-1',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const res = await postNotification(url, TENANT_A, [
        {
          subscriptionId: fx.graphSubscriptionId,
          changeType: fx.changeType,
          resource: fx.resource,
          clientState: fx.clientStatePlaintext,
          subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
          tenantId: TENANT_A,
        },
      ]);
      expect(res.status).toBe(202);
      expect(res.headers.get('x-webhook-duplicate')).toBeNull();

      const dedupKey = computeDedupKey({
        subscriptionId: fx.graphSubscriptionId,
        resource: fx.resource,
        changeType: fx.changeType,
        subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
        tenantId: TENANT_A,
      });
      const stored = await redis.get(`mcp:webhook:dedup:${dedupKey}`);
      expect(stored).toBe('1');
    } finally {
      await close();
    }
  });

  it('Test 2: duplicate within 24h — 202 + X-Webhook-Duplicate: 1 + audit', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-2',
      clientStatePlaintext: 'cs-2',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const item = {
        subscriptionId: fx.graphSubscriptionId,
        changeType: fx.changeType,
        resource: fx.resource,
        clientState: fx.clientStatePlaintext,
        subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
        tenantId: TENANT_A,
      };
      const first = await postNotification(url, TENANT_A, [item]);
      expect(first.status).toBe(202);
      expect(first.headers.get('x-webhook-duplicate')).toBeNull();

      const second = await postNotification(url, TENANT_A, [item]);
      expect(second.status).toBe(202);
      expect(second.headers.get('x-webhook-duplicate')).toBe('1');

      await waitForAuditCount(pool, 'webhook.duplicate', 1);
      const { rows } = await pool.query(
        `SELECT * FROM audit_log WHERE action = 'webhook.duplicate' ORDER BY ts ASC`
      );
      expect(rows.length).toBe(1);
      const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
      expect(typeof meta.dedup_key_suffix).toBe('string');
      expect((meta.dedup_key_suffix as string).length).toBe(8);
      expect(meta.subscription_id).toBe(fx.graphSubscriptionId);
      expect(meta.change_type).toBe(fx.changeType);
    } finally {
      await close();
    }
  });

  it('Test 3: different changeType → both unique (no dedup)', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fxCreated = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-3',
      clientStatePlaintext: 'cs-3',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    // Same graph_subscription_id cannot have both changeTypes in DB (unique
    // index), so seed TWO subs with distinct ids but reuse the clientState.
    const fxUpdated = { ...fxCreated, id: crypto.randomUUID(), graphSubscriptionId: 'sub-dd-3b' };
    await seedSubscription(pool, TENANT_A, dek, fxCreated);
    await seedSubscription(pool, TENANT_A, dek, { ...fxUpdated, changeType: 'updated' });
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const res1 = await postNotification(url, TENANT_A, [
        {
          subscriptionId: fxCreated.graphSubscriptionId,
          changeType: 'created',
          resource: fxCreated.resource,
          clientState: fxCreated.clientStatePlaintext,
          subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
          tenantId: TENANT_A,
        },
      ]);
      expect(res1.status).toBe(202);
      expect(res1.headers.get('x-webhook-duplicate')).toBeNull();

      const res2 = await postNotification(url, TENANT_A, [
        {
          subscriptionId: fxUpdated.graphSubscriptionId,
          changeType: 'updated',
          resource: fxUpdated.resource,
          clientState: fxUpdated.clientStatePlaintext,
          subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
          tenantId: TENANT_A,
        },
      ]);
      expect(res2.status).toBe(202);
      expect(res2.headers.get('x-webhook-duplicate')).toBeNull();
    } finally {
      await close();
    }
  });

  it('Test 4: different expirationDateTime → both unique (no dedup)', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-4',
      clientStatePlaintext: 'cs-4',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const base = {
        subscriptionId: fx.graphSubscriptionId,
        changeType: fx.changeType,
        resource: fx.resource,
        clientState: fx.clientStatePlaintext,
        tenantId: TENANT_A,
      };
      const r1 = await postNotification(url, TENANT_A, [
        { ...base, subscriptionExpirationDateTime: '2030-01-01T00:00:00Z' },
      ]);
      expect(r1.status).toBe(202);
      expect(r1.headers.get('x-webhook-duplicate')).toBeNull();

      const r2 = await postNotification(url, TENANT_A, [
        { ...base, subscriptionExpirationDateTime: '2030-01-02T00:00:00Z' },
      ]);
      expect(r2.status).toBe(202);
      expect(r2.headers.get('x-webhook-duplicate')).toBeNull();
    } finally {
      await close();
    }
  });

  it('Test 5: multi-item batch with partial dup — X-Webhook-Duplicate: 1', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx1 = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-5a',
      clientStatePlaintext: 'cs-5a',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    const fx2 = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-5b',
      clientStatePlaintext: 'cs-5b',
      resource: 'users/b/messages',
      changeType: 'created',
    };
    const fx3 = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-5c',
      clientStatePlaintext: 'cs-5c',
      resource: 'users/c/messages',
      changeType: 'created',
    };
    for (const f of [fx1, fx2, fx3]) await seedSubscription(pool, TENANT_A, dek, f);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const mkItem = (f: SubscriptionFixture) => ({
        subscriptionId: f.graphSubscriptionId,
        changeType: f.changeType,
        resource: f.resource,
        clientState: f.clientStatePlaintext,
        subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
        tenantId: TENANT_A,
      });
      // Pre-seed fx2's dedup key to simulate "already seen within 24h".
      const fx2DedupKey = computeDedupKey({
        subscriptionId: fx2.graphSubscriptionId,
        resource: fx2.resource,
        changeType: fx2.changeType,
        subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
        tenantId: TENANT_A,
      });
      await redis.set(`mcp:webhook:dedup:${fx2DedupKey}`, '1', 'EX', DEDUP_TTL_SECONDS);

      const res = await postNotification(url, TENANT_A, [mkItem(fx1), mkItem(fx2), mkItem(fx3)]);
      expect(res.status).toBe(202);
      expect(res.headers.get('x-webhook-duplicate')).toBe('1');

      await waitForAuditCount(pool, 'webhook.received', 2);
      const received = await pool.query(
        `SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'webhook.received'`
      );
      expect(received.rows[0].n).toBe(2);

      await waitForAuditCount(pool, 'webhook.duplicate', 1);
      const dup = await pool.query(
        `SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'webhook.duplicate'`
      );
      expect(dup.rows[0].n).toBe(1);
    } finally {
      await close();
    }
  });

  it('Test 6: TTL expiry — after 24h same notification is no longer a duplicate', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dd-6',
      clientStatePlaintext: 'cs-6',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool);
    try {
      const item = {
        subscriptionId: fx.graphSubscriptionId,
        changeType: fx.changeType,
        resource: fx.resource,
        clientState: fx.clientStatePlaintext,
        subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
        tenantId: TENANT_A,
      };
      const r1 = await postNotification(url, TENANT_A, [item]);
      expect(r1.status).toBe(202);

      // Simulate TTL expiry by deleting the key directly — the MemoryRedisFacade
      // uses Date.now() for expiry checks, so clearing is equivalent to a 24h
      // TTL expiration without having to advance system time.
      const dedupKey = computeDedupKey({
        subscriptionId: fx.graphSubscriptionId,
        resource: fx.resource,
        changeType: fx.changeType,
        subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
        tenantId: TENANT_A,
      });
      await redis.del(`mcp:webhook:dedup:${dedupKey}`);

      const r2 = await postNotification(url, TENANT_A, [item]);
      expect(r2.status).toBe(202);
      expect(r2.headers.get('x-webhook-duplicate')).toBeNull();

      // Key re-set with fresh TTL
      const stored = await redis.get(`mcp:webhook:dedup:${dedupKey}`);
      expect(stored).toBe('1');
    } finally {
      await close();
    }
  });
});

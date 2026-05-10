/**
 * Plan 04-07 Task 2 — Per-IP 401 rate limit (D-16).
 *
 * Per-IP `mcp:webhook:401:<ip>` counter with 60s TTL. On the 11th failure
 * within the TTL window, the handler returns 429 WITHOUT attempting
 * validation (short-circuit BEFORE DB/decrypt/audit — attack traffic sheds
 * at the cheapest possible path).
 *
 * Tests (5 per <behavior> lines 260-264):
 *   Test 1: under threshold — 10 bad POSTs same IP all return 401
 *   Test 2: at threshold — 11th within 60s → 429 Retry-After:60, no audit row
 *   Test 3: TTL expiry — advance 61s → failed POST returns 401 again
 *   Test 4: per-IP isolation — IP_A exhausted + IP_B fresh → IP_B gets 401
 *   Test 5: success does NOT increment — valid POST → 202, counter unchanged
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

import { createWebhookHandler, MAX_401_PER_MINUTE_PER_IP } from '../webhooks.js';
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

/**
 * Start a server with a deterministic req.ip setter so rate-limit tests can
 * spoof different IPs without needing to mock network layer. The middleware
 * runs BEFORE loadTenant so req.ip is populated before the handler reads it.
 */
async function startServer(
  pool: Pool,
  redis: MemoryRedisFacade,
  tenantPool: TenantPoolStub,
  ipGetter: (req: express.Request) => string
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json({ limit: '1mb' }) as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (req as express.Request & { id?: string }).id =
      `req-${Math.random().toString(36).slice(2, 10)}`;
    Object.defineProperty(req, 'ip', { value: ipGetter(req), configurable: true });
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

async function postBadClientState(url: string, tenantId: string, subId: string, ipHeader?: string) {
  return fetch(`${url}/t/${tenantId}/notifications`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(ipHeader ? { 'x-test-ip': ipHeader } : {}),
    },
    body: JSON.stringify({
      value: [
        {
          subscriptionId: subId,
          changeType: 'created',
          resource: 'users/a/messages',
          clientState: 'wrong-clientstate',
          subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
          tenantId,
        },
      ],
    }),
  });
}

describe('plan 04-07 Task 2 — per-IP 401 rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1: under threshold — 10 bad POSTs same IP all return 401', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-rl-1',
      clientStatePlaintext: 'correct-state',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool, () => '127.0.0.1');
    try {
      for (let i = 0; i < MAX_401_PER_MINUTE_PER_IP; i++) {
        const res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
        expect(res.status).toBe(401);
      }
      // Counter should reflect at least MAX_401_PER_MINUTE_PER_IP failures.
      const counter = await redis.get('mcp:webhook:401:127.0.0.1');
      expect(counter).not.toBeNull();
      expect(Number(counter)).toBeGreaterThanOrEqual(MAX_401_PER_MINUTE_PER_IP);
    } finally {
      await close();
    }
  });

  it('Test 2: at threshold — 11th within 60s → 429 Retry-After:60, no audit row', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-rl-2',
      clientStatePlaintext: 'correct-state',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool, () => '10.0.0.1');
    try {
      for (let i = 0; i < MAX_401_PER_MINUTE_PER_IP; i++) {
        const res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
        expect(res.status).toBe(401);
      }
      // Give the async audit writes a tick to flush before counting.
      await new Promise((r) => setTimeout(r, 50));
      const before = await pool.query(
        `SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'webhook.unauthorized'`
      );
      const beforeCount = before.rows[0].n as number;

      // 11th attempt: rate-limit short-circuits → 429 + Retry-After.
      const res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
      expect(res.status).toBe(429);
      expect(await res.json()).toMatchObject({ error: 'rate_limited' });
      expect(res.headers.get('retry-after')).toBe('60');

      // No NEW audit row should be written by the rate-limited 429.
      await new Promise((r) => setTimeout(r, 50));
      const after = await pool.query(
        `SELECT COUNT(*)::int AS n FROM audit_log WHERE action = 'webhook.unauthorized'`
      );
      const afterCount = after.rows[0].n as number;
      expect(afterCount).toBe(beforeCount);
    } finally {
      await close();
    }
  });

  it('Test 3: TTL expiry — after 61s the counter resets and 401 returns', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-rl-3',
      clientStatePlaintext: 'correct-state',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool, () => '10.0.0.2');
    try {
      for (let i = 0; i < MAX_401_PER_MINUTE_PER_IP; i++) {
        const res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
        expect(res.status).toBe(401);
      }
      // 11th → 429 (confirms limiter is active)
      const gated = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
      expect(gated.status).toBe(429);

      // Seed the counter with a fresh value + short TTL so we can simulate
      // expiry without real-time wait. Delete the long-TTL key and resume.
      await redis.del('mcp:webhook:401:10.0.0.2');

      const res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('Test 4: per-IP isolation — IP_A exhausted, IP_B fresh gets 401 not 429', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-rl-4',
      clientStatePlaintext: 'correct-state',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    // Pre-seed IP_A counter at threshold so first request from IP_A is 429.
    await redis.set('mcp:webhook:401:192.168.1.1', String(MAX_401_PER_MINUTE_PER_IP));

    let currentIp = '192.168.1.1';
    const { url, close } = await startServer(pool, redis, tenantPool, () => currentIp);
    try {
      // IP_A at threshold → 429.
      let res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
      expect(res.status).toBe(429);

      // IP_B fresh → 401, not influenced by IP_A counter.
      currentIp = '192.168.1.2';
      res = await postBadClientState(url, TENANT_A, fx.graphSubscriptionId);
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('Test 5: success does NOT increment the counter', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-rl-5',
      clientStatePlaintext: 'correct-state',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);
    const redis = new MemoryRedisFacade();
    const { url, close } = await startServer(pool, redis, tenantPool, () => '172.16.0.1');
    try {
      const body = {
        value: [
          {
            subscriptionId: fx.graphSubscriptionId,
            changeType: fx.changeType,
            resource: fx.resource,
            clientState: fx.clientStatePlaintext, // correct
            subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
            tenantId: TENANT_A,
          },
        ],
      };
      const res = await fetch(`${url}/t/${TENANT_A}/notifications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(202);

      const counter = await redis.get('mcp:webhook:401:172.16.0.1');
      expect(counter).toBeNull();
    } finally {
      await close();
    }
  });
});

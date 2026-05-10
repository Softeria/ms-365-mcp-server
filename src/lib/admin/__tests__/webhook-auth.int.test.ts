/**
 * Plan 04-07 Task 1 — Webhook clientState equality + 401 audit (D-16).
 *
 * Covers (8 tests, per <behavior> lines 182-189 of 04-07-PLAN.md):
 *   Test 1: clientState match → 202 + webhook.received audit row
 *   Test 2: clientState mismatch → 401 + webhook.unauthorized + suffix meta
 *   Test 3: unknown subscriptionId → 401 + audit (prevents enumeration)
 *   Test 4: case-sensitive equality — 'Secret-ABC' vs 'secret-abc' → 401
 *   Test 5: whitespace preserved — ' leading-space' vs 'leading-space' → 401
 *   Test 6: batched all-match → 202
 *   Test 7: batched partial mismatch → 401 on any mismatch
 *   Test 8: decrypt failure → 401 + decrypt_failed meta, no plaintext in logs
 *
 * Plaintext-scrub invariant (D-01 + D-16):
 *   Logger mock call history MUST NOT contain the plaintext 'secret-abc'
 *   string in any serialized form. Only 4-char suffix allowed.
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

import { createWebhookHandler } from '../webhooks.js';
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

function makeTenantPoolStub(dek: Buffer, options: { throwOnGet?: boolean } = {}): TenantPoolStub {
  return {
    getDekForTenant: vi.fn((_id: string) => {
      if (options.throwOnGet) throw new Error('TenantPool: no entry');
      return dek;
    }),
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

async function selectAuditRows(
  pool: Pool,
  action?: string
): Promise<
  Array<{
    id: string;
    tenant_id: string;
    actor: string;
    action: string;
    target: string | null;
    ip: string | null;
    request_id: string;
    result: string;
    meta: unknown;
  }>
> {
  const query = action
    ? `SELECT * FROM audit_log WHERE action = $1 ORDER BY ts ASC`
    : `SELECT * FROM audit_log ORDER BY ts ASC`;
  const params = action ? [action] : [];
  const { rows } = await pool.query(query, params);
  return rows;
}

function parseMeta(row: { meta: unknown }): Record<string, unknown> {
  if (typeof row.meta === 'string') return JSON.parse(row.meta);
  if (row.meta && typeof row.meta === 'object') return row.meta as Record<string, unknown>;
  return {};
}

/**
 * Poll briefly for audit rows to land. writeAuditStandalone is fire-and-forget
 * via `void` — the HTTP 401 response may land before the Postgres INSERT
 * resolves on a slow test machine. Short bounded poll keeps tests reliable
 * without inflating CI time.
 */
async function waitForAuditCount(pool: Pool, action: string, count: number): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const rows = await selectAuditRows(pool, action);
    if (rows.length >= count) return;
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('plan 04-07 Task 1 — webhook clientState equality + 401 audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: clientState match → 202 + webhook.received audit row', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-1',
      clientStatePlaintext: 'secret-abc',
      resource: 'users/alice/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: fx.graphSubscriptionId,
            changeType: fx.changeType,
            resource: fx.resource,
            clientState: 'secret-abc',
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

      await waitForAuditCount(pool, 'webhook.received', 1);
      const rows = await selectAuditRows(pool, 'webhook.received');
      expect(rows.length).toBe(1);
      expect(rows[0]!.actor).toBe('graph');
      expect(rows[0]!.target).toBe('sub-1');
    } finally {
      await close();
    }
  });

  it('Test 2: clientState mismatch → 401 + webhook.unauthorized + suffix meta', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-2',
      clientStatePlaintext: 'secret-abc',
      resource: 'users/alice/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: fx.graphSubscriptionId,
            changeType: fx.changeType,
            resource: fx.resource,
            clientState: 'wrong-rong',
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
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: 'unauthorized' });

      await waitForAuditCount(pool, 'webhook.unauthorized', 1);
      const rows = await selectAuditRows(pool, 'webhook.unauthorized');
      expect(rows.length).toBe(1);
      expect(rows[0]!.result).toBe('failure');
      const meta = parseMeta(rows[0]!);
      expect(meta.change_type).toBe('created');
      expect(meta.resource).toBe('users/alice/messages');
      // Last-4-chars suffix only — never full value.
      expect(meta.received_client_state_suffix).toBe('rong');

      // D-01 invariant: plaintext NEVER in logger calls.
      const joinedLogs = JSON.stringify(
        [loggerMock.info, loggerMock.warn, loggerMock.error, loggerMock.debug].flatMap(
          (m) => m.mock.calls
        )
      );
      expect(joinedLogs).not.toContain('secret-abc');
    } finally {
      await close();
    }
  });

  it('Test 3: unknown subscriptionId → 401 + audit (NOT 404, prevents enumeration)', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: 'nonexistent-sub-id',
            changeType: 'created',
            resource: 'users/me/messages',
            clientState: 'x',
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
      expect(res.status).toBe(401);

      await waitForAuditCount(pool, 'webhook.unauthorized', 1);
      const rows = await selectAuditRows(pool, 'webhook.unauthorized');
      expect(rows.length).toBe(1);
      const meta = parseMeta(rows[0]!);
      expect(meta.reason).toBe('unknown_subscription');
    } finally {
      await close();
    }
  });

  it('Test 4: case-sensitive equality — Secret-ABC vs secret-abc → 401', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-case',
      clientStatePlaintext: 'Secret-ABC',
      resource: 'users/alice/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: fx.graphSubscriptionId,
            changeType: fx.changeType,
            resource: fx.resource,
            clientState: 'secret-abc', // lower-case, MUST NOT match
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
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('Test 5: whitespace preserved — leading-space mismatch → 401', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-ws',
      clientStatePlaintext: ' leading-space',
      resource: 'users/alice/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, dek, fx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: fx.graphSubscriptionId,
            changeType: fx.changeType,
            resource: fx.resource,
            clientState: 'leading-space', // no leading space
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
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('Test 6: batched all-match → 202', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const fixtures: SubscriptionFixture[] = [
      {
        id: crypto.randomUUID(),
        graphSubscriptionId: 'sub-b1',
        clientStatePlaintext: 'state-1',
        resource: 'users/a/messages',
        changeType: 'created',
      },
      {
        id: crypto.randomUUID(),
        graphSubscriptionId: 'sub-b2',
        clientStatePlaintext: 'state-2',
        resource: 'users/b/messages',
        changeType: 'updated',
      },
      {
        id: crypto.randomUUID(),
        graphSubscriptionId: 'sub-b3',
        clientStatePlaintext: 'state-3',
        resource: 'users/c/messages',
        changeType: 'deleted',
      },
    ];
    for (const fx of fixtures) await seedSubscription(pool, TENANT_A, dek, fx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: fixtures.map((fx) => ({
          subscriptionId: fx.graphSubscriptionId,
          changeType: fx.changeType,
          resource: fx.resource,
          clientState: fx.clientStatePlaintext,
          subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
          tenantId: TENANT_A,
        })),
      };
      const res = await fetch(`${url}/t/${TENANT_A}/notifications`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(202);
    } finally {
      await close();
    }
  });

  it('Test 7: batched partial mismatch — 401 on any mismatch', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const dek = generateDek();
    const tenantPool = makeTenantPoolStub(dek);
    const okFx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-ok',
      clientStatePlaintext: 'state-good',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    const badFx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-bad',
      clientStatePlaintext: 'state-good-2',
      resource: 'users/b/messages',
      changeType: 'updated',
    };
    await seedSubscription(pool, TENANT_A, dek, okFx);
    await seedSubscription(pool, TENANT_A, dek, badFx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: okFx.graphSubscriptionId,
            changeType: okFx.changeType,
            resource: okFx.resource,
            clientState: 'state-good', // matches
            subscriptionExpirationDateTime: '2030-01-01T00:00:00Z',
            tenantId: TENANT_A,
          },
          {
            subscriptionId: badFx.graphSubscriptionId,
            changeType: badFx.changeType,
            resource: badFx.resource,
            clientState: 'wrong-suffix-ouch', // does NOT match
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
      expect(res.status).toBe(401);
      await waitForAuditCount(pool, 'webhook.unauthorized', 1);
      const rows = await selectAuditRows(pool, 'webhook.unauthorized');
      // Only the mismatched item produces a webhook.unauthorized row.
      expect(rows.length).toBe(1);
      expect(rows[0]!.target).toBe('sub-bad');
    } finally {
      await close();
    }
  });

  it('Test 8: decrypt failure — wrong DEK → 401 + decrypt_failed meta, no plaintext', async () => {
    const pool = await makePool();
    await seedTenant(pool);
    const correctDek = generateDek();
    const wrongDek = generateDek();
    // Seed with the correct DEK, but the tenantPool returns the wrong one.
    const tenantPool = makeTenantPoolStub(wrongDek);
    const fx = {
      id: crypto.randomUUID(),
      graphSubscriptionId: 'sub-dek-mismatch',
      clientStatePlaintext: 'secret-abc',
      resource: 'users/a/messages',
      changeType: 'created',
    };
    await seedSubscription(pool, TENANT_A, correctDek, fx);

    const { url, close } = await startServer(pool, new MemoryRedisFacade(), tenantPool);
    try {
      const body = {
        value: [
          {
            subscriptionId: fx.graphSubscriptionId,
            changeType: fx.changeType,
            resource: fx.resource,
            clientState: 'secret-abc',
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
      expect(res.status).toBe(401);

      await waitForAuditCount(pool, 'webhook.unauthorized', 1);
      const rows = await selectAuditRows(pool, 'webhook.unauthorized');
      expect(rows.length).toBeGreaterThan(0);
      const meta = parseMeta(rows[0]!);
      expect(meta.decrypt_failed).toBe(true);

      // Plaintext 'secret-abc' MUST NOT appear in any log call.
      const joinedLogs = JSON.stringify(
        [loggerMock.info, loggerMock.warn, loggerMock.error, loggerMock.debug].flatMap(
          (m) => m.mock.calls
        )
      );
      expect(joinedLogs).not.toContain('secret-abc');
    } finally {
      await close();
    }
  });
});

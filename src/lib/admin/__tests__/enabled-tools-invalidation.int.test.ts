/**
 * Plan 05-07 Task 2 — invalidation round-trip integration tests.
 *
 * Covers:
 *   - I1: PATCH succeeds → subscriber receives tenant GUID on
 *     `mcp:tool-selection-invalidate` channel within 100ms.
 *   - I2: Publish failure (Redis throws) → PATCH still returns 200 with
 *     pino warn captured; TTL fallback is the correctness anchor.
 *   - I3: Two consecutive PATCHes publish twice (idempotent + additive).
 *   - I4: publishToolSelectionInvalidation GUID guard rejects garbage
 *     before the pub/sub fabric sees it (defense-in-depth via the
 *     publisher side).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newDb } from 'pg-mem';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Pool } from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

vi.mock('../../../generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' },
      { alias: 'users.list', method: 'get', path: '/users' },
    ],
  },
}));

vi.mock('../../../presets/generated-index.js', () => {
  const ESSENTIALS = Object.freeze(new Set<string>(['mail.messages.send']));
  const DISCOVERY = Object.freeze(
    new Set<string>(['search-tools', 'get-tool-schema', 'execute-tool'])
  );
  return {
    DISCOVERY_V1_OPS: DISCOVERY,
    ESSENTIALS_V1_OPS: ESSENTIALS,
    PRESET_VERSIONS: new Map([
      ['essentials-v1', ESSENTIALS],
      ['discovery-v1', DISCOVERY],
    ]),
  };
});

let sharedPool: Pool | null = null;
vi.mock('../../postgres.js', async () => {
  return {
    scheduleAfterCommit: vi.fn(),
    withTransaction: async (fn: (client: unknown) => Promise<unknown>) => {
      if (!sharedPool) throw new Error('sharedPool not set in test');
      const client = await sharedPool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // best-effort
        }
        throw err;
      } finally {
        client.release();
      }
    },
    getPool: () => sharedPool,
  };
});

import { createTenantsRoutes } from '../tenants.js';
import { createEnabledToolsRoutes } from '../enabled-tools.js';
import { MemoryRedisFacade } from '../../redis-facade.js';
import { createCursorSecret } from '../cursor.js';
import {
  publishToolSelectionInvalidation,
  TOOL_SELECTION_INVALIDATE_CHANNEL,
} from '../../tool-selection/tool-selection-invalidation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'migrations');
const KEK = crypto.randomBytes(32);

function stripPgcryptoExtensionStmts(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !/\bextension\b.*\bpgcrypto\b/i.test(line))
    .join('\n');
}

async function makePool(): Promise<Pool> {
  const db = newDb();
  db.registerExtension('pgcrypto', () => {});
  const { Pool: PgMemPool } = db.adapters.createPg();
  const pool = new PgMemPool() as Pool;
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const up = stripPgcryptoExtensionStmts(
      (sql.split(/^--\s*Down Migration\s*$/m)[0] ?? '').replace(/^--\s*Up Migration\s*$/m, '')
    );
    await pool.query(up);
  }
  return pool;
}

interface AdminContext {
  actor: string;
  source: 'entra' | 'api-key';
  tenantScoped: string | null;
}

function makeTenantPoolStub() {
  return {
    evict: vi.fn(),
    invalidate: vi.fn(),
  };
}

async function startServer(
  pool: Pool,
  redis: MemoryRedisFacade,
  admin: AdminContext
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json({ limit: '20kb' }) as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (req as unknown as { admin?: AdminContext }).admin = admin;
    (req as express.Request & { id?: string }).id = `req-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    next();
  });
  const tp = makeTenantPoolStub();
  const deps = {
    pgPool: pool,
    redis,
    tenantPool: tp as unknown as import('../router.js').AdminRouterDeps['tenantPool'],
    kek: KEK,
    cursorSecret: createCursorSecret(),
    adminOrigins: [],
    entraConfig: { appClientId: 'x', groupId: 'g' },
  } as unknown as import('../router.js').AdminRouterDeps;

  app.use('/admin/tenants', createTenantsRoutes(deps));
  app.use('/admin/tenants', createEnabledToolsRoutes(deps));

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

async function doPost(url: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

async function doPatch(url: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

const VALID_BODY = {
  mode: 'delegated' as const,
  client_id: 'app-uuid',
  tenant_id: '11111111-2222-4333-8444-555555555555',
  cloud_type: 'global' as const,
  redirect_uri_allowlist: ['http://localhost:3000/callback'],
  cors_origins: ['http://localhost:3000'],
  allowed_scopes: ['User.Read'],
};

describe('plan 05-07 Task 2 — invalidation round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sharedPool = null;
  });

  it('I1: PATCH succeeds → subscriber receives tenant GUID within 100ms', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const redis = new MemoryRedisFacade();

    // Track publishes on the tool-selection channel
    const receivedTenantIds: string[] = [];
    redis.on('message', ((channel: string, message: string) => {
      if (channel === TOOL_SELECTION_INVALIDATE_CHANNEL) receivedTenantIds.push(message);
    }) as (...args: unknown[]) => void);
    await redis.subscribe(TOOL_SELECTION_INVALIDATE_CHANNEL);

    const { url, close } = await startServer(pool, redis, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const t0 = Date.now();
      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res.status).toBe(200);

      // Wait up to 100ms for the pub/sub hop
      for (let i = 0; i < 10 && receivedTenantIds.length === 0; i++) {
        await new Promise((r) => setTimeout(r, 10));
      }
      const elapsed = Date.now() - t0;
      expect(receivedTenantIds).toContain(id);
      expect(elapsed).toBeLessThan(1000); // Sanity — the wait loop caps at 100ms
    } finally {
      await close();
    }
  });

  it('I2: publish failure → PATCH still returns 200 + pino warn logged', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const redis = new MemoryRedisFacade();

    // Stub publish on THIS instance to throw. The handler must still respond
    // 200 and log via loggerMock.warn — pub/sub is best-effort because TTL
    // on per-tenant-bm25 is the correctness fallback.
    const origPublish = redis.publish.bind(redis);
    vi.spyOn(redis, 'publish').mockImplementation(async (channel: string, msg: string) => {
      if (channel === TOOL_SELECTION_INVALIDATE_CHANNEL) {
        throw new Error('simulated redis down');
      }
      return origPublish(channel, msg);
    });

    const { url, close } = await startServer(pool, redis, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res.status).toBe(200); // PATCH succeeded despite publish failure
      expect(res.body.enabled_tools).toBe('users.list');

      // Handler logged a warn about the publish failure
      const warnCalls = loggerMock.warn.mock.calls;
      const published = warnCalls.some((c) =>
        JSON.stringify(c).includes('publishToolSelectionInvalidation failed')
      );
      expect(published).toBe(true);
    } finally {
      await close();
    }
  });

  it('I3: two consecutive PATCHes publish twice (idempotent + additive)', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const redis = new MemoryRedisFacade();

    const receivedTenantIds: string[] = [];
    redis.on('message', ((channel: string, message: string) => {
      if (channel === TOOL_SELECTION_INVALIDATE_CHANNEL) receivedTenantIds.push(message);
    }) as (...args: unknown[]) => void);
    await redis.subscribe(TOOL_SELECTION_INVALIDATE_CHANNEL);

    const { url, close } = await startServer(pool, redis, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res1 = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res1.status).toBe(200);

      const res2 = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['mail.messages.send'],
      });
      expect(res2.status).toBe(200);

      // Wait for both publishes to land
      for (let i = 0; i < 20 && receivedTenantIds.length < 2; i++) {
        await new Promise((r) => setTimeout(r, 10));
      }

      expect(receivedTenantIds.filter((x) => x === id).length).toBe(2);
    } finally {
      await close();
    }
  });

  it('I4: publishToolSelectionInvalidation rejects non-GUID sender input', async () => {
    const redis = new MemoryRedisFacade();
    await expect(publishToolSelectionInvalidation(redis, 'not-a-guid')).rejects.toThrow(
      /invalid GUID/
    );
  });
});

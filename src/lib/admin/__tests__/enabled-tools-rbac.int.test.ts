/**
 * Plan 05-07 Task 2 — RBAC integration tests.
 *
 * Covers tenant-scoped vs global admin access matrix:
 *   - R1: Tenant-scoped admin (scope = tenantB) PATCH tenantA → 404.
 *   - R2: Tenant-scoped admin PATCH own tenant → 200.
 *   - R3: Global admin (tenantScoped=null) PATCH any tenant → 200.
 *   - R4: After successful PATCH, audit_log row captures actor verbatim.
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
      { alias: 'users.list', method: 'get', path: '/users' },
      { alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' },
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

/**
 * Start an express server whose admin stub is injected PER REQUEST by a
 * header — this lets each test drive a different admin identity against
 * the same server instance without restarting.
 */
async function startServerWithHeaderAdmin(
  pool: Pool,
  redis: MemoryRedisFacade
): Promise<{
  url: string;
  close: () => Promise<void>;
  setAdmin: (admin: AdminContext) => void;
}> {
  let currentAdmin: AdminContext = {
    actor: 'unset',
    source: 'entra',
    tenantScoped: null,
  };

  const app = express();
  app.use(express.json({ limit: '20kb' }) as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (req as unknown as { admin?: AdminContext }).admin = currentAdmin;
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
    setAdmin: (admin) => {
      currentAdmin = admin;
    },
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
  cloud_type: 'global' as const,
  redirect_uri_allowlist: ['http://localhost:3000/callback'],
  cors_origins: ['http://localhost:3000'],
  allowed_scopes: ['User.Read'],
};

describe('plan 05-07 Task 2 — enabled-tools RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sharedPool = null;
  });

  it('R1: tenant-scoped admin scoped to tenantB cannot PATCH tenantA → 404', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const server = await startServerWithHeaderAdmin(pool, new MemoryRedisFacade());
    try {
      // Create two tenants as a global admin
      server.setAdmin({ actor: 'global@example.com', source: 'entra', tenantScoped: null });
      const ca = await doPost(`${server.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'aaaaaaaa-1234-4234-8234-1234567890ab',
        slug: 'tenant-a',
      });
      expect(ca.status).toBe(201);
      const tenantA_id = ca.body.id;

      const cb = await doPost(`${server.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'bbbbbbbb-1234-4234-8234-1234567890ab',
        slug: 'tenant-b',
      });
      expect(cb.status).toBe(201);
      const tenantB_id = cb.body.id;

      // Switch to tenant-scoped admin bound to tenantB
      server.setAdmin({
        actor: 'scoped-b@example.com',
        source: 'api-key',
        tenantScoped: tenantB_id,
      });

      // Attempt cross-tenant PATCH on tenantA
      const res = await doPatch(`${server.url}/admin/tenants/${tenantA_id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res.status).toBe(404);
      expect(res.body.type).toContain('not_found');

      // Assert nothing changed on tenantA
      const { rows } = await pool.query(`SELECT enabled_tools FROM tenants WHERE id = $1`, [
        tenantA_id,
      ]);
      expect(rows[0].enabled_tools).toBeNull();
    } finally {
      await server.close();
    }
  });

  it('R2: tenant-scoped admin PATCHes own tenant → 200', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const server = await startServerWithHeaderAdmin(pool, new MemoryRedisFacade());
    try {
      server.setAdmin({ actor: 'global@example.com', source: 'entra', tenantScoped: null });
      const created = await doPost(`${server.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'bbbbbbbb-1234-4234-8234-1234567890ab',
        slug: 'tenant-b',
      });
      const tenantB_id = created.body.id;

      // Switch to tenant-scoped admin bound to this tenant
      server.setAdmin({
        actor: 'scoped-b@example.com',
        source: 'api-key',
        tenantScoped: tenantB_id,
      });

      const res = await doPatch(`${server.url}/admin/tenants/${tenantB_id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res.status).toBe(200);
      expect(res.body.enabled_tools).toBe('users.list');
    } finally {
      await server.close();
    }
  });

  it('R3: global admin PATCHes any tenant → 200', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const server = await startServerWithHeaderAdmin(pool, new MemoryRedisFacade());
    try {
      server.setAdmin({ actor: 'global@example.com', source: 'entra', tenantScoped: null });

      const ca = await doPost(`${server.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'aaaaaaaa-1234-4234-8234-1234567890ab',
        slug: 'tenant-a',
      });
      const cb = await doPost(`${server.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'bbbbbbbb-1234-4234-8234-1234567890ab',
        slug: 'tenant-b',
      });
      const tenantA_id = ca.body.id;
      const tenantB_id = cb.body.id;

      const resA = await doPatch(`${server.url}/admin/tenants/${tenantA_id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(resA.status).toBe(200);
      expect(resA.body.enabled_tools).toBe('users.list');

      const resB = await doPatch(`${server.url}/admin/tenants/${tenantB_id}/enabled-tools`, {
        add: ['mail.messages.send'],
      });
      expect(resB.status).toBe(200);
      expect(resB.body.enabled_tools).toBe('mail.messages.send');
    } finally {
      await server.close();
    }
  });

  it('R4: audit_log row captures admin.actor verbatim across scoped + global paths', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const server = await startServerWithHeaderAdmin(pool, new MemoryRedisFacade());
    try {
      server.setAdmin({ actor: 'global@example.com', source: 'entra', tenantScoped: null });

      const created = await doPost(`${server.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'bbbbbbbb-1234-4234-8234-1234567890ab',
        slug: 'tenant-b',
      });
      const tenantB_id = created.body.id;

      // Scoped admin PATCH
      server.setAdmin({
        actor: 'scoped-b@example.com',
        source: 'api-key',
        tenantScoped: tenantB_id,
      });
      const resScoped = await doPatch(`${server.url}/admin/tenants/${tenantB_id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(resScoped.status).toBe(200);

      // Global admin PATCH (different enabled-tools change)
      server.setAdmin({ actor: 'global@example.com', source: 'entra', tenantScoped: null });
      const resGlobal = await doPatch(`${server.url}/admin/tenants/${tenantB_id}/enabled-tools`, {
        add: ['mail.messages.send'],
      });
      expect(resGlobal.status).toBe(200);

      // Both audit rows captured with the correct actor
      const { rows } = await pool.query(
        `SELECT actor, meta FROM audit_log
         WHERE action = 'admin.tenant.enabled-tools-change'
         ORDER BY ts ASC`
      );
      expect(rows.length).toBe(2);
      expect(rows[0].actor).toBe('scoped-b@example.com');
      expect(rows[1].actor).toBe('global@example.com');
    } finally {
      await server.close();
    }
  });
});

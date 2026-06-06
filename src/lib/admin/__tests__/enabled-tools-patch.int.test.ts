/**
 * Plan 05-07 Task 1 — /admin/tenants/:id/enabled-tools PATCH integration tests.
 *
 * Covers:
 *   - Test 1: PATCH {add: ["users.list"]} succeeds; enabled_tools merged; audit row
 *   - Test 2: PATCH {remove: [...]} drops selector from existing set
 *   - Test 3: PATCH {set: "mail:*,preset:essentials-v1"} replaces whole string
 *   - Test 4: PATCH {set: ""} sets enabled_tools to NULL
 *   - Test 5: PATCH with two keys → 400 mutual-exclusion error
 *   - Test 6: PATCH {add: ["wunknown.op"]} → 400 unknown_selector + suggestions
 *   - Test 7: Invalid tenant GUID in path → 404
 *   - Test 8: Body size > 16KB → 400
 *   - Test 9: Audit meta includes before_length, after_length, operation
 *   - Test 10: Malformed JSON body → 400
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

// Mock the generated client + presets BEFORE importing the route module so
// validateSelectors resolves against a deterministic registry rather than the
// empty bootstrap stub.
vi.mock('../../../generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' },
      { alias: 'mail.messages.list', method: 'get', path: '/me/messages' },
      { alias: 'users.list', method: 'get', path: '/users' },
      { alias: 'users.read', method: 'get', path: '/users/{id}' },
      { alias: 'calendars.list', method: 'get', path: '/me/calendars' },
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
          // best-effort rollback
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

interface TenantPoolStub {
  evict: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}

function makeTenantPoolStub(): TenantPoolStub {
  return {
    evict: vi.fn(),
    invalidate: vi.fn(),
  };
}

async function startServer(
  pool: Pool,
  redis: MemoryRedisFacade,
  admin: AdminContext,
  tenantPool: TenantPoolStub
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json({ limit: '20kb' }) as unknown as express.RequestHandler);
  app.use(
    (
      err: Error & { type?: string; status?: number },
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
        res.status(400).type('application/problem+json').json({
          type: 'https://docs.ms365mcp/errors/bad_request',
          title: 'Bad Request',
          status: 400,
          detail: err.message,
        });
        return;
      }
      next(err);
    }
  );
  app.use((req, _res, next) => {
    (req as unknown as { admin?: AdminContext }).admin = admin;
    (req as express.Request & { id?: string }).id = `req-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    next();
  });
  const deps = {
    pgPool: pool,
    redis,
    tenantPool: tenantPool as unknown as import('../router.js').AdminRouterDeps['tenantPool'],
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

async function doPatch(
  url: string,
  body?: unknown,
  rawBody?: string
): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: rawBody !== undefined ? rawBody : JSON.stringify(body ?? {}),
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
  allowed_scopes: ['User.Read', 'Mail.Read'],
};

describe('plan 05-07 Task 1 — PATCH /admin/tenants/:id/enabled-tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sharedPool = null;
  });

  it('Test 1: PATCH {add: ["users.list"]} → 200; audit row "admin.tenant.enabled-tools-change" with operation=add', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const rateLimits = { request_per_min: 42, graph_points_per_min: 420 };
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        sharepoint_domain: 'contoso',
        rate_limits: rateLimits,
      });
      expect(created.status).toBe(201);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.enabled_tools).toBe('users.list');
      expect(res.body.sharepoint_domain).toBe('contoso');
      expect(res.body.rate_limits).toEqual(rateLimits);

      const { rows } = await pool.query(`SELECT enabled_tools FROM tenants WHERE id = $1`, [id]);
      expect(rows[0].enabled_tools).toBe('users.list');

      const { rows: auditRows } = await pool.query(
        "SELECT * FROM audit_log WHERE action = 'admin.tenant.enabled-tools-change'"
      );
      expect(auditRows.length).toBe(1);
      const meta =
        typeof auditRows[0].meta === 'string' ? JSON.parse(auditRows[0].meta) : auditRows[0].meta;
      expect(meta.operation).toBe('add');
      expect(meta.after_length).toBe('users.list'.length);
      expect(meta.before_length).toBe(0);
    } finally {
      await close();
    }
  });

  it('Test 2: PATCH {remove: ["mail.messages.send"]} against tenant with existing set → drops entry', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        enabled_tools: 'mail.messages.send,users.list',
      });
      expect(created.status).toBe(201);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        remove: ['mail.messages.send'],
      });
      expect(res.status).toBe(200);
      expect(res.body.enabled_tools).toBe('users.list');
    } finally {
      await close();
    }
  });

  it('Test 3: PATCH {set: "mail:*,preset:essentials-v1"} replaces enabled_tools entirely', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        enabled_tools: 'users.list',
      });
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        set: 'mail:*,preset:essentials-v1',
      });
      expect(res.status).toBe(200);
      expect(res.body.enabled_tools).toBe('mail:*,preset:essentials-v1');
    } finally {
      await close();
    }
  });

  it('Test 4: PATCH {set: ""} → enabled_tools set to NULL', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        enabled_tools: 'users.list',
      });
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, { set: '' });
      expect(res.status).toBe(200);
      expect(res.body.enabled_tools).toBeNull();

      const { rows } = await pool.query(`SELECT enabled_tools FROM tenants WHERE id = $1`, [id]);
      expect(rows[0].enabled_tools).toBeNull();
    } finally {
      await close();
    }
  });

  it('Test 5: PATCH {add: [], remove: ["x"]} → 400 mutual-exclusion error', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: [],
        remove: ['x'],
      });
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('bad_request');
      expect(String(res.body.detail ?? '')).toMatch(/exactly one/i);
    } finally {
      await close();
    }
  });

  it('Test 6: PATCH {add: ["wunknown.op"]} → 400 unknown_selector + suggestions', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['users.lst'], // typo of "users.list"
      });
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('unknown_selector');
      expect(res.body.invalid).toContain('users.lst');
      expect(res.body.suggestions).toBeDefined();
      expect(res.body.suggestions['users.lst']).toEqual(expect.arrayContaining(['users.list']));
    } finally {
      await close();
    }
  });

  it('Test 7: Invalid tenant GUID in path → 404', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const res = await doPatch(`${url}/admin/tenants/not-a-guid/enabled-tools`, {
        add: ['users.list'],
      });
      expect(res.status).toBe(404);
      expect(res.body.type).toContain('not_found');
    } finally {
      await close();
    }
  });

  it('Test 8: Body > 16KB via set → 400 from Zod max length', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      // 16385 chars of "a," (exceeds z.string().max(16384))
      const huge = 'a'.repeat(16385);
      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, { set: huge });
      expect(res.status).toBe(400);
    } finally {
      await close();
    }
  });

  it('Test 9: Audit meta includes before_length, after_length, operation', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        enabled_tools: 'users.list',
      });
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['users.read'],
      });
      expect(res.status).toBe(200);

      const { rows } = await pool.query(
        "SELECT meta FROM audit_log WHERE action = 'admin.tenant.enabled-tools-change'"
      );
      const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
      expect(meta.before_length).toBe('users.list'.length);
      expect(meta.after_length).toBe('users.list,users.read'.length);
      expect(meta.operation).toBe('add');
    } finally {
      await close();
    }
  });

  it('Test 10: Malformed JSON body → 400', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(
        `${url}/admin/tenants/${id}/enabled-tools`,
        undefined,
        '{invalid json'
      );
      expect(res.status).toBe(400);
    } finally {
      await close();
    }
  });
});

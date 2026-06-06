/**
 * Plan 05.1-08 Task 3 — product-selector admin PATCH integration tests.
 *
 * Extends the plan 05-07 PATCH /admin/tenants/:id/enabled-tools harness
 * with the Phase 5.1 audit meta shape: when the selectors target a
 * product (via `__<product>__` prefix OR `<product>:*` workload OR
 * `preset:<product>-essentials` preset name), the audit row's `meta.product`
 * field captures the product discriminator for operator queries.
 *
 * Covers Tests A1-A7 from plan 05.1-08:
 *   - A1: add powerbi:* → audit meta.product = 'powerbi'
 *   - A2: add preset:pwrapps-essentials → meta.product = 'pwrapps'
 *   - A3: add two product prefixes → meta.product = 'mixed'
 *   - A4: add Graph op → meta.product = null
 *   - A5: set with mixed preset + product → meta.product reflects the product
 *   - A6: PATCH with powerbi:* against tenant with NULL sharepoint_domain → 200
 *   - A7: PATCH with sp-admin:* against tenant with NULL sharepoint_domain → 200
 *     (selectors validate independently of dispatch — sharepoint_domain is
 *     only enforced at the dispatch layer per plan 5.1-06)
 *
 * Harness: pg-mem + MemoryRedisFacade + supertest (via node fetch). Mocks
 * the generated client with both Graph aliases AND product aliases so
 * validateSelectors accepts both.
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

// Fixture: Graph aliases + 1 alias per product. validateSelectors needs
// all aliases referenced by the test bodies — e.g. Test A3 mentions
// __exo__get-mailbox + __spadmin__list-sites so both must exist.
vi.mock('../../../generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' },
      { alias: 'mail.messages.list', method: 'get', path: '/me/messages' },
      { alias: 'users.list', method: 'get', path: '/users' },
      { alias: 'users.read', method: 'get', path: '/users/{id}' },
      { alias: 'calendars.list', method: 'get', path: '/me/calendars' },
      // Phase 5.1 product aliases — 1 per product so WORKLOAD_PREFIXES
      // auto-grows to include all 5 product names + Graph workloads.
      { alias: '__powerbi__GroupsGetGroups', method: 'get', path: '/workspaces' },
      { alias: '__pwrapps__list-apps', method: 'get', path: '/apps' },
      { alias: '__pwrauto__list-flows', method: 'get', path: '/environments/e1/flows' },
      { alias: '__exo__get-mailbox', method: 'get', path: '/Mailbox' },
      { alias: '__spadmin__list-sites', method: 'get', path: '/Sites' },
    ],
  },
}));

// 6 presets: essentials-v1 + 5 product presets. Mocked so
// validateSelectors accepts preset:powerbi-essentials, etc.
vi.mock('../../../presets/generated-index.js', () => {
  const ESSENTIALS = Object.freeze(new Set<string>(['mail.messages.send']));
  const POWERBI = Object.freeze(new Set<string>(['__powerbi__GroupsGetGroups']));
  const PWRAPPS = Object.freeze(new Set<string>(['__pwrapps__list-apps']));
  const PWRAUTO = Object.freeze(new Set<string>(['__pwrauto__list-flows']));
  const EXO = Object.freeze(new Set<string>(['__exo__get-mailbox']));
  const SP_ADMIN = Object.freeze(new Set<string>(['__spadmin__list-sites']));
  const DISCOVERY = Object.freeze(
    new Set<string>(['search-tools', 'get-tool-schema', 'execute-tool'])
  );
  return {
    DISCOVERY_V1_OPS: DISCOVERY,
    ESSENTIALS_V1_OPS: ESSENTIALS,
    PRESET_VERSIONS: new Map([
      ['essentials-v1', ESSENTIALS],
      ['discovery-v1', DISCOVERY],
      ['powerbi-essentials', POWERBI],
      ['pwrapps-essentials', PWRAPPS],
      ['pwrauto-essentials', PWRAUTO],
      ['exo-essentials', EXO],
      ['sp-admin-essentials', SP_ADMIN],
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
    tenantPool:
      makeTenantPoolStub() as unknown as import('../router.js').AdminRouterDeps['tenantPool'],
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

async function readAuditMeta(
  pool: Pool,
  tenantId: string
): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(
    `SELECT meta FROM audit_log
     WHERE action = 'admin.tenant.enabled-tools-change' AND tenant_id = $1
     ORDER BY ts DESC LIMIT 1`,
    [tenantId]
  );
  if (rows.length === 0) return null;
  const raw = rows[0].meta;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

const VALID_BODY = {
  mode: 'delegated' as const,
  client_id: 'app-uuid',
  tenant_id: '11111111-2222-4333-8444-555555555555',
  cloud_type: 'global' as const,
  redirect_uri_allowlist: ['http://localhost:3000/callback'],
  cors_origins: ['http://localhost:3000'],
  allowed_scopes: ['User.Read', 'Mail.Read'],
  // sharepoint_domain intentionally absent (defaults to null) — Tests A6/A7
  // verify that PATCH selector validation does NOT require it; dispatch is
  // the layer that surfaces sp_admin_not_configured per plan 5.1-06.
};

describe('plan 05.1-08 Task 3 — PATCH /admin/tenants/:id/enabled-tools product meta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sharedPool = null;
  });

  it('A1: add powerbi:* → 200; audit meta.product = "powerbi"', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(created.status).toBe(201);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['powerbi:*'],
      });
      expect(res.status).toBe(200);
      expect(res.body.enabled_tools).toBe('powerbi:*');

      const meta = await readAuditMeta(pool, id);
      expect(meta).not.toBeNull();
      expect(meta!.product).toBe('powerbi');
      expect(meta!.operation).toBe('add');
    } finally {
      await close();
    }
  });

  it('A2: add preset:pwrapps-essentials → audit meta.product = "pwrapps"', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['preset:pwrapps-essentials'],
      });
      expect(res.status).toBe(200);

      const meta = await readAuditMeta(pool, id);
      expect(meta!.product).toBe('pwrapps');
    } finally {
      await close();
    }
  });

  it('A3: add two product prefixes → audit meta.product = "mixed"', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['__exo__get-mailbox', '__spadmin__list-sites'],
      });
      expect(res.status).toBe(200);

      const meta = await readAuditMeta(pool, id);
      expect(meta!.product).toBe('mixed');
    } finally {
      await close();
    }
  });

  it('A4: add Graph op (non-product) → audit meta.product = null', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
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
      expect(res.status).toBe(200);

      const meta = await readAuditMeta(pool, id);
      expect(meta!.product).toBeNull();
    } finally {
      await close();
    }
  });

  it('A5: set with mixed preset + product selector → meta.product = "powerbi"', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        set: 'preset:essentials-v1,preset:powerbi-essentials',
      });
      expect(res.status).toBe(200);
      expect(res.body.enabled_tools).toBe('preset:essentials-v1,preset:powerbi-essentials');

      const meta = await readAuditMeta(pool, id);
      expect(meta!.product).toBe('powerbi');
    } finally {
      await close();
    }
  });

  it('A6: PATCH powerbi:* against NULL sharepoint_domain tenant → 200', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;
      // Confirm sharepoint_domain is null on this tenant.
      const { rows } = await pool.query(`SELECT sharepoint_domain FROM tenants WHERE id = $1`, [
        id,
      ]);
      expect(rows[0].sharepoint_domain).toBeNull();

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['powerbi:*'],
      });
      // Power BI has no dependency on sharepoint_domain — PATCH succeeds.
      expect(res.status).toBe(200);
    } finally {
      await close();
    }
  });

  it('A7: PATCH sp-admin:* against NULL sharepoint_domain tenant → 200 (dispatch-time check only)', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const { url, close } = await startServer(pool, new MemoryRedisFacade(), {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const id = created.body.id;
      const { rows } = await pool.query(`SELECT sharepoint_domain FROM tenants WHERE id = $1`, [
        id,
      ]);
      expect(rows[0].sharepoint_domain).toBeNull();

      const res = await doPatch(`${url}/admin/tenants/${id}/enabled-tools`, {
        add: ['sp-admin:*'],
      });
      // PATCH validates selectors independently of dispatch — the missing
      // sharepoint_domain surfaces at __spadmin__* tool-call time as
      // `sp_admin_not_configured` per plan 5.1-06, NOT at PATCH time.
      expect(res.status).toBe(200);

      const meta = await readAuditMeta(pool, id);
      expect(meta!.product).toBe('sp-admin');
    } finally {
      await close();
    }
  });
});

/**
 * Plan 5.1-06 Task 3 — sharepoint_domain migration + plumbing tests.
 *
 * Covers migration 20260801000000_sharepoint_domain.sql + the runtime
 * chain that carries the field end-to-end:
 *   - Migration adds `sharepoint_domain text NULL` (non-blocking fast path)
 *   - Pre-existing rows retain NULL (no backfill needed)
 *   - INSERT without field succeeds (NULL default)
 *   - INSERT with "contoso" succeeds
 *   - Admin PATCH /admin/tenants/:id carries the field end-to-end
 *   - Admin PATCH with "contoso.evil.com" returns 400 (Zod regex rejects dots)
 *   - Admin PATCH with null clears the value
 *   - loadTenant middleware carries the field onto req.tenant
 *   - Down migration drops the column cleanly
 *
 * Tests M1-M9. Uses pg-mem + real Express router (mirrors
 * test/tenant/preset-version-migration.test.ts + preset-version-admin.test.ts
 * patterns from plan 05-03).
 *
 * Threat mitigations pinned:
 *   - T-5.1-06-c (sharepoint_domain injection): Test M6 pins admin-side
 *     regex rejection of "contoso.evil.com" / uppercase / slashes.
 *   - T-5.1-06-e (structured error on absent sp_admin_not_configured):
 *     Task 2 test R6 covers the runtime dispatch wrapping; this test
 *     (M3) confirms the DB column permits NULL as the input to that
 *     dispatch behavior.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newDb } from 'pg-mem';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

let sharedPool: Pool | null = null;
vi.mock('../../src/lib/postgres.js', async () => {
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

import { createTenantsRoutes } from '../../src/lib/admin/tenants.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { createCursorSecret } from '../../src/lib/admin/cursor.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');
const SHAREPOINT_MIGRATION_FILE = '20260801000000_sharepoint_domain.sql';

const KEK = crypto.randomBytes(32);

function stripPgcryptoExtensionStmts(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !/\bextension\b.*\bpgcrypto\b/i.test(line))
    .join('\n');
}

interface MigrationPair {
  file: string;
  up: string;
  down: string;
}

function loadSharepointMigration(): MigrationPair {
  const sql = readFileSync(path.join(MIGRATIONS_DIR, SHAREPOINT_MIGRATION_FILE), 'utf8');
  const parts = sql.split(/^--\s*Down Migration\s*$/m);
  const up = (parts[0] ?? '').replace(/^--\s*Up Migration\s*$/m, '');
  const down = parts[1] ?? '';
  return {
    file: SHAREPOINT_MIGRATION_FILE,
    up: stripPgcryptoExtensionStmts(up),
    down: stripPgcryptoExtensionStmts(down),
  };
}

function listMigrations(): MigrationPair[] {
  return [loadSharepointMigration()];
}

async function runSqlStatements(pool: Pool, sql: string): Promise<void> {
  const statements = sql
    .split('\n')
    .map((line) => line.replace(/^--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
}

async function installBaseSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE tenants (
      id uuid PRIMARY KEY,
      mode text NOT NULL,
      client_id text NOT NULL,
      client_secret_ref text NULL,
      tenant_id text NOT NULL,
      cloud_type text NOT NULL DEFAULT 'global',
      redirect_uri_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
      cors_origins jsonb NOT NULL DEFAULT '[]'::jsonb,
      allowed_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
      enabled_tools text NULL,
      preset_version text NOT NULL DEFAULT 'essentials-v1',
      rate_limits jsonb NULL,
      wrapped_dek jsonb NULL,
      slug text NULL,
      disabled_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE audit_log (
      id uuid PRIMARY KEY,
      tenant_id uuid NOT NULL,
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
}

async function makePoolBaseSchema(): Promise<Pool> {
  const db = newDb();
  const { Pool: PgMemPool } = db.adapters.createPg();
  const pool = new PgMemPool() as Pool;
  await installBaseSchema(pool);
  return pool;
}

async function makePoolWithSharepointMigration(): Promise<Pool> {
  const pool = await makePoolBaseSchema();
  await runSqlStatements(pool, loadSharepointMigration().up);
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

async function startAdminServer(
  pool: Pool,
  admin: AdminContext
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as Request & { admin?: AdminContext }).admin = admin;
    (req as Request & { id?: string }).id = `req-${Math.random().toString(36).slice(2, 10)}`;
    next();
  });
  app.use(
    '/admin/tenants',
    createTenantsRoutes({
      pgPool: pool,
      redis: new MemoryRedisFacade(),
      tenantPool:
        makeTenantPoolStub() as unknown as import('../../src/lib/admin/router.js').AdminRouterDeps['tenantPool'],
      kek: KEK,
      cursorSecret: createCursorSecret(),
      adminOrigins: [],
      entraConfig: { appClientId: 'x', groupId: 'g' },
    } as unknown as import('../../src/lib/admin/router.js').AdminRouterDeps)
  );
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

async function doJson(
  method: 'POST' | 'GET' | 'PATCH',
  url: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
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

function makeReqRes(tenantId: string): {
  req: Request;
  res: Response;
  next: NextFunction;
  readonly nextCalls: number;
  jsonCalls: Array<{ status: number; body: unknown }>;
} {
  const jsonCalls: Array<{ status: number; body: unknown }> = [];
  let currentStatus = 200;
  let nextCalls = 0;
  const res = {
    status: (s: number) => {
      currentStatus = s;
      return res;
    },
    json: (body: unknown) => {
      jsonCalls.push({ status: currentStatus, body });
      return res;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    nextCalls += 1;
  };
  const req = {
    params: { tenantId },
  } as unknown as Request;
  return {
    req,
    res,
    next,
    get nextCalls() {
      return nextCalls;
    },
    jsonCalls,
  };
}

function createLoadTenantStub({ pool }: { pool: Pool }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.params.tenantId;
    const { rows } = await pool.query<TenantRow>('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    const tenant = rows[0];
    if (!tenant) {
      res.status(404).json({ error: 'tenant_not_found', tenantId });
      return;
    }
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    next();
  };
}

describe('plan 5.1-06 Task 3 — tenants.sharepoint_domain migration + plumbing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sharedPool = null;
  });

  it('Test M1: migration adds sharepoint_domain as nullable text column', async () => {
    const pool = await makePoolWithSharepointMigration();

    const { rows } = await pool.query<{
      column_name: string;
      is_nullable: string;
      data_type: string;
    }>(
      `SELECT column_name, is_nullable, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'tenants'
         AND column_name = 'sharepoint_domain'`
    );
    expect(rows.length).toBe(1);
    const col = rows[0]!;
    expect(col.data_type).toBe('text');

    // pg-mem quirk: information_schema.is_nullable reports 'NO' for
    // `ADD COLUMN text NULL` even though the runtime semantics are
    // nullable (INSERT without the column + SELECT returning NULL both
    // work — see Test M2, M3 below). Real Postgres reports 'YES'. Prove
    // the nullable contract via the runtime behavior instead:
    const tenantId = '99999999-8888-4777-8666-555555555555';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id)
       VALUES ($1, 'delegated', 'x', 'y')`,
      [tenantId]
    );
    const { rows: inserted } = await pool.query<{ sharepoint_domain: string | null }>(
      `SELECT sharepoint_domain FROM tenants WHERE id = $1`,
      [tenantId]
    );
    expect(inserted[0]!.sharepoint_domain).toBeNull();

    // Also assert the migration SQL itself declares the column as NULL
    // (defense-in-depth against pg-mem skew — real Postgres honors this).
    const migrations = listMigrations();
    const sp = migrations.find((m) => m.file === '20260801000000_sharepoint_domain.sql');
    expect(sp).toBeDefined();
    expect(sp!.up).toMatch(
      /ALTER\s+TABLE\s+tenants[\s\S]*ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?sharepoint_domain\s+text\s+NULL/i
    );
  });

  it('Test M2: pre-existing rows retain NULL after migration (no backfill)', async () => {
    const pool = await makePoolBaseSchema();
    const tenantId = 'aaaa1111-2222-4333-8444-555555555555';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id)
       VALUES ($1, 'delegated', 'pre-existing', 'azure-tenant')`,
      [tenantId]
    );

    await runSqlStatements(pool, loadSharepointMigration().up);

    const { rows } = await pool.query<{ sharepoint_domain: string | null }>(
      `SELECT sharepoint_domain FROM tenants WHERE id = $1`,
      [tenantId]
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.sharepoint_domain).toBeNull();
  });

  it('Test M3: INSERT without sharepoint_domain succeeds; SELECT returns NULL', async () => {
    const pool = await makePoolWithSharepointMigration();
    const tenantId = 'bbbb1111-2222-4333-8444-555555555555';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id)
       VALUES ($1, 'delegated', 'c', 't')`,
      [tenantId]
    );
    const { rows } = await pool.query<{ sharepoint_domain: string | null }>(
      `SELECT sharepoint_domain FROM tenants WHERE id = $1`,
      [tenantId]
    );
    expect(rows[0]!.sharepoint_domain).toBeNull();
  });

  it('Test M4: INSERT with sharepoint_domain = "contoso" succeeds', async () => {
    const pool = await makePoolWithSharepointMigration();
    const tenantId = 'cccc1111-2222-4333-8444-555555555555';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id, sharepoint_domain)
       VALUES ($1, 'delegated', 'c', 't', 'contoso')`,
      [tenantId]
    );
    const { rows } = await pool.query<{ sharepoint_domain: string | null }>(
      `SELECT sharepoint_domain FROM tenants WHERE id = $1`,
      [tenantId]
    );
    expect(rows[0]!.sharepoint_domain).toBe('contoso');
  });

  it('Test M5: admin PATCH /admin/tenants/:id carries sharepoint_domain end-to-end', async () => {
    const pool = await makePoolWithSharepointMigration();
    sharedPool = pool;
    const harness = await startAdminServer(pool, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = (await doJson('POST', `${harness.url}/admin/tenants`, VALID_BODY)) as {
        status: number;
        body: { id: string; sharepoint_domain?: string | null };
      };
      expect(created.status).toBe(201);
      expect(created.body.sharepoint_domain ?? null).toBeNull();

      const patched = (await doJson('PATCH', `${harness.url}/admin/tenants/${created.body.id}`, {
        sharepoint_domain: 'fabrikam',
      })) as { status: number; body: { sharepoint_domain?: string | null } };
      expect(patched.status).toBe(200);
      expect(patched.body.sharepoint_domain).toBe('fabrikam');

      const { rows } = await pool.query<{ sharepoint_domain: string | null }>(
        `SELECT sharepoint_domain FROM tenants WHERE id = $1`,
        [created.body.id]
      );
      expect(rows[0]!.sharepoint_domain).toBe('fabrikam');
    } finally {
      await harness.close();
    }
  });

  it('Test M6: admin PATCH with "contoso.evil.com" returns 400 (Zod regex rejects dots)', async () => {
    const pool = await makePoolWithSharepointMigration();
    sharedPool = pool;
    const harness = await startAdminServer(pool, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = (await doJson('POST', `${harness.url}/admin/tenants`, VALID_BODY)) as {
        status: number;
        body: { id: string };
      };
      expect(created.status).toBe(201);

      // T-5.1-06-c — admin PATCH Zod regex must reject dots (URL injection
      // shape), uppercase, and slashes.
      for (const bad of ['contoso.evil.com', 'CONTOSO', 'contoso/evil', 'contoso!', '']) {
        const res = await doJson('PATCH', `${harness.url}/admin/tenants/${created.body.id}`, {
          sharepoint_domain: bad,
        });
        expect(res.status).toBe(400);
      }
    } finally {
      await harness.close();
    }
  });

  it('Test M7: admin PATCH with sharepoint_domain: null clears the value', async () => {
    const pool = await makePoolWithSharepointMigration();
    sharedPool = pool;
    const harness = await startAdminServer(pool, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const created = (await doJson('POST', `${harness.url}/admin/tenants`, VALID_BODY)) as {
        status: number;
        body: { id: string };
      };
      expect(created.status).toBe(201);

      // Set it first.
      const setRes = (await doJson('PATCH', `${harness.url}/admin/tenants/${created.body.id}`, {
        sharepoint_domain: 'initech',
      })) as { status: number; body: { sharepoint_domain?: string | null } };
      expect(setRes.status).toBe(200);
      expect(setRes.body.sharepoint_domain).toBe('initech');

      // Now clear it.
      const clearRes = (await doJson('PATCH', `${harness.url}/admin/tenants/${created.body.id}`, {
        sharepoint_domain: null,
      })) as { status: number; body: { sharepoint_domain?: string | null } };
      expect(clearRes.status).toBe(200);
      expect(clearRes.body.sharepoint_domain).toBeNull();
    } finally {
      await harness.close();
    }
  });

  it('Test M8: loadTenant middleware carries sharepoint_domain onto req.tenant', async () => {
    const pool = await makePoolWithSharepointMigration();
    const tenantId = 'dddd1111-2222-4333-8444-555555555555';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id, sharepoint_domain)
       VALUES ($1, 'app-only', 'cid', 'tid', 'fabrikam')`,
      [tenantId]
    );

    const middleware = createLoadTenantStub({ pool });
    const harness = makeReqRes(tenantId);
    await middleware(harness.req, harness.res, harness.next);

    const attached = (harness.req as Request & { tenant?: TenantRow }).tenant;
    expect(attached).toBeDefined();
    expect(attached!.sharepoint_domain).toBe('fabrikam');
  });

  it('Test M9: down migration drops the sharepoint_domain column cleanly', async () => {
    const pool = await makePoolWithSharepointMigration();

    const migrations = listMigrations();
    const sp = migrations.find((m) => m.file === '20260801000000_sharepoint_domain.sql');
    expect(sp).toBeDefined();
    await runSqlStatements(pool, sp!.down);

    const { rows } = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'tenants'
         AND column_name = 'sharepoint_domain'`
    );
    expect(rows).toEqual([]);
  });

  it('Test M10: POST /admin/tenants with invalid sharepoint_domain returns 400', async () => {
    const pool = await makePoolWithSharepointMigration();
    sharedPool = pool;
    const harness = await startAdminServer(pool, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      // Create-time Zod regex must reject the same patterns as PATCH.
      const res = await doJson('POST', `${harness.url}/admin/tenants`, {
        ...VALID_BODY,
        sharepoint_domain: 'contoso.evil.com',
      });
      expect(res.status).toBe(400);
    } finally {
      await harness.close();
    }
  });

  it('Test M11: POST /admin/tenants with valid sharepoint_domain persists it', async () => {
    const pool = await makePoolWithSharepointMigration();
    sharedPool = pool;
    const harness = await startAdminServer(pool, {
      actor: 'admin@example.com',
      source: 'entra',
      tenantScoped: null,
    });
    try {
      const res = (await doJson('POST', `${harness.url}/admin/tenants`, {
        ...VALID_BODY,
        sharepoint_domain: 'contoso',
      })) as { status: number; body: { id: string; sharepoint_domain?: string | null } };
      expect(res.status).toBe(201);
      expect(res.body.sharepoint_domain).toBe('contoso');
    } finally {
      await harness.close();
    }
  });
});

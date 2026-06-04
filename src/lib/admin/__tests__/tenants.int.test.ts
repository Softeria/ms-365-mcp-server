/**
 * Plan 04-02 Task 1 — /admin/tenants CRUD integration tests.
 *
 * Covers (per behaviour block, 18 tests):
 *   - Test 1: POST create success — wrapped_dek persisted + audit row
 *   - Test 2: POST invalid GUID → 400
 *   - Test 3: POST invalid redirect_uri (javascript:) → 400 redacted
 *   - Test 4: POST slug uniqueness → 409
 *   - Test 5: POST RBAC — tenant-scoped admin cannot create → 403
 *   - Test 6: POST tenant immediately reachable via loadTenant
 *   - Test 7: GET list — wrapped_dek excluded from response
 *   - Test 8: GET list cursor pagination
 *   - Test 9: GET list include_disabled default false
 *   - Test 10: GET list tenant-scoped RBAC
 *   - Test 11: GET /:id — 200/404 paths
 *   - Test 12: PATCH partial update + audit + publishTenantInvalidation
 *   - Test 13: PATCH redirect_uri validation before DB write
 *   - Test 14: PATCH empty body → 400
 *   - Test 15: PATCH mode change permitted
 *   - Test 16: PATCH unknown tenant → 404
 *   - Test 17: PATCH tenant-scoped RBAC
 *   - Test 18: snake_case wire preservation
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

import { createTenantsRoutes, tenantRowToWire } from '../tenants.js';
import { createAdminRouter } from '../router.js';
import { fetchConsentedGraphDelegatedScopes } from '../scope-sync.js';
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

const TENANT_A = '12345678-1234-4234-8234-1234567890ab';
const TENANT_B = 'abcdef12-1234-4234-8234-1234567890ab';

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

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

async function startServer(
  pool: Pool,
  redis: MemoryRedisFacade,
  admin: AdminContext,
  tenantPool: TenantPoolStub,
  scopeSyncFetcher?: typeof import('../scope-sync.js').fetchConsentedGraphDelegatedScopes
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json() as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (req as unknown as { admin?: AdminContext }).admin = admin;
    (req as express.Request & { id?: string }).id = `req-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    next();
  });
  app.use(
    '/admin/tenants',
    createTenantsRoutes({
      pgPool: pool,
      redis,
      tenantPool: tenantPool as unknown as import('../router.js').AdminRouterDeps['tenantPool'],
      kek: KEK,
      cursorSecret: createCursorSecret(),
      adminOrigins: [],
      entraConfig: { appClientId: 'x', groupId: 'g' },
      scopeSyncFetcher,
    } as unknown as import('../router.js').AdminRouterDeps)
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

async function startAdminRouterServer(
  pool: Pool,
  redis: MemoryRedisFacade,
  tenantPool: TenantPoolStub,
  scopeSyncFetcher?: typeof import('../scope-sync.js').fetchConsentedGraphDelegatedScopes
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json() as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (req as express.Request & { id?: string }).id = `req-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    next();
  });
  app.use(
    '/admin',
    createAdminRouter({
      pgPool: pool,
      redis,
      tenantPool: tenantPool as unknown as import('../router.js').AdminRouterDeps['tenantPool'],
      kek: KEK,
      cursorSecret: createCursorSecret(),
      adminOrigins: [],
      entraConfig: { appClientId: 'admin-app-client-id', groupId: 'admin-group-id' },
      scopeSyncFetcher,
      verifyToken: async ({ token }) => {
        const [, payloadSegment] = token.split('.');
        return JSON.parse(
          Buffer.from(payloadSegment ?? '', 'base64url').toString('utf8')
        ) as import('jose').JWTPayload;
      },
      fetchImpl: async () =>
        new Response(JSON.stringify({ value: [{ id: 'admin-group-id' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    })
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

async function doPost(
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
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

async function doGet(url: string): Promise<{ status: number; body: any }> {
  const res = await fetch(url, { method: 'GET' });
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
  // Use localhost so validateRedirectUri's prod-mode policy accepts without
  // requiring MS365_MCP_PUBLIC_URL (tests run in arbitrary CI envs).
  redirect_uri_allowlist: ['http://localhost:3000/callback'],
  cors_origins: ['http://localhost:3000'],
  allowed_scopes: ['User.Read', 'Mail.Read'],
};

describe('plan 04-02 Task 1 — /admin/tenants CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sharedPool = null;
  });

  it('Test 1: POST create success — persists wrapped_dek + audit row; no wrapped_dek in response', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );

    try {
      const res = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe('string');
      expect(res.body.mode).toBe('delegated');
      expect(res.body.client_id).toBe('app-uuid');
      expect(res.body.tenant_id).toBe(VALID_BODY.tenant_id);
      expect(res.body.cloud_type).toBe('global');
      expect(res.body.redirect_uri_allowlist).toEqual(VALID_BODY.redirect_uri_allowlist);
      expect(res.body.cors_origins).toEqual(VALID_BODY.cors_origins);
      expect(res.body.allowed_scopes).toEqual(VALID_BODY.allowed_scopes);
      expect(res.body.enabled_tools).toBeNull();
      expect(res.body.slug).toBeNull();
      expect(res.body.disabled_at).toBeNull();
      expect(typeof res.body.created_at).toBe('string');
      expect(typeof res.body.updated_at).toBe('string');
      // critical: wrapped_dek MUST NOT appear in the response
      expect('wrapped_dek' in res.body).toBe(false);
      expect('wrappedDek' in res.body).toBe(false);

      // DB row exists with wrapped_dek populated
      const { rows } = await pool.query('SELECT id, wrapped_dek FROM tenants WHERE id = $1', [
        res.body.id,
      ]);
      expect(rows.length).toBe(1);
      const env =
        typeof rows[0].wrapped_dek === 'string'
          ? JSON.parse(rows[0].wrapped_dek)
          : rows[0].wrapped_dek;
      expect(env).not.toBeNull();
      expect(env.v).toBe(1);
      expect(typeof env.iv).toBe('string');
      expect(typeof env.tag).toBe('string');
      expect(typeof env.ct).toBe('string');

      // Audit log written
      const { rows: auditRows } = await pool.query(
        "SELECT * FROM audit_log WHERE action = 'admin.tenant.create'"
      );
      expect(auditRows.length).toBe(1);
      const meta =
        typeof auditRows[0].meta === 'string' ? JSON.parse(auditRows[0].meta) : auditRows[0].meta;
      expect(meta.tenantId).toBe(res.body.id);
      expect(meta.mode).toBe('delegated');
      expect(meta.cloudType).toBe('global');
      expect(meta.clientId).toBe('app-uuid');
      // wrapped_dek MUST NOT be in audit meta
      expect(JSON.stringify(meta)).not.toContain('wrapped_dek');
      expect(JSON.stringify(meta)).not.toContain(env.ct);

      // Logger MUST never have wrapped_dek or the ciphertext
      const allLogCalls = JSON.stringify([
        loggerMock.info.mock.calls,
        loggerMock.warn.mock.calls,
        loggerMock.error.mock.calls,
        loggerMock.debug.mock.calls,
      ]);
      expect(allLogCalls).not.toContain(env.ct);
      expect(allLogCalls.toLowerCase()).not.toContain('wrapped_dek');
      expect(allLogCalls.toLowerCase()).not.toContain('wrappeddek');
    } finally {
      await close();
    }
  });

  it('Test 2: POST invalid GUID → 400 problem+json', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const res = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: 'not-a-guid',
      });
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('bad_request');
    } finally {
      await close();
    }
  });

  it('Test 3: POST invalid redirect_uri — javascript: scheme rejected + redacted', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const res = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        redirect_uri_allowlist: ['javascript:alert(1)'],
      });
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('invalid_redirect_uri');
      // attacker input MUST NOT be echoed back
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('javascript:alert(1)');
      expect(bodyStr).not.toContain('javascript');
    } finally {
      await close();
    }
  });

  it('Test 4: POST slug uniqueness — two with same slug → 409', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const first = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        slug: 'acme',
      });
      expect(first.status).toBe(201);

      const second = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '22222222-3333-4333-8444-555555555555',
        slug: 'acme',
      });
      expect(second.status).toBe(409);
      expect(second.body.type).toContain('conflict');
    } finally {
      await close();
    }
  });

  it('Test 5: POST tenant-scoped admin cannot create → 403', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'scoped@example.com',
        source: 'api-key',
        tenantScoped: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      tp
    );
    try {
      const res = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(res.status).toBe(403);
      expect(res.body.type).toContain('forbidden');
    } finally {
      await close();
    }
  });

  it('Test 6: POST → row immediately readable via loadTenant-style query (SC#1)', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const post = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(post.status).toBe(201);
      const newId = post.body.id;

      // Replicate the loadTenant SELECT — it must find the row without a restart.
      const { rows } = await pool.query(
        `SELECT id, mode, client_id, client_secret_ref, tenant_id, cloud_type,
          redirect_uri_allowlist, cors_origins, allowed_scopes, enabled_tools,
          wrapped_dek, slug, disabled_at, created_at, updated_at
         FROM tenants
         WHERE id = $1 AND disabled_at IS NULL`,
        [newId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe(newId);
      // wrapped_dek populated → loadTenant + TenantPool.acquire will work
      const env =
        typeof rows[0].wrapped_dek === 'string'
          ? JSON.parse(rows[0].wrapped_dek)
          : rows[0].wrapped_dek;
      expect(env).not.toBeNull();
      expect(env.v).toBe(1);
    } finally {
      await close();
    }
  });

  it('Test 7: GET list — rows are TenantWireRow; no wrapped_dek or client_secret plaintext', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      await doPost(`${url}/admin/tenants`, VALID_BODY);
      await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '22222222-3333-4333-8444-555555555555',
      });
      await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '33333333-3333-4333-8444-555555555555',
      });

      const list = await doGet(`${url}/admin/tenants?limit=10`);
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body.data)).toBe(true);
      expect(list.body.data.length).toBe(3);
      expect(list.body).toHaveProperty('next_cursor');
      expect(list.body).toHaveProperty('has_more');

      for (const row of list.body.data) {
        // Must have snake_case core fields
        expect(Object.keys(row)).toEqual(
          expect.arrayContaining([
            'id',
            'mode',
            'client_id',
            'tenant_id',
            'cloud_type',
            'redirect_uri_allowlist',
            'cors_origins',
            'allowed_scopes',
            'enabled_tools',
            'slug',
            'disabled_at',
            'created_at',
            'updated_at',
          ])
        );
        // Must NEVER include wrapped_dek
        expect(Object.keys(row).includes('wrapped_dek')).toBe(false);
        expect(Object.keys(row).includes('wrappedDek')).toBe(false);
      }
    } finally {
      await close();
    }
  });

  it('Test 8: GET list cursor pagination over 25 rows', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      for (let i = 0; i < 25; i++) {
        const hex = i.toString(16).padStart(2, '0');
        await doPost(`${url}/admin/tenants`, {
          ...VALID_BODY,
          tenant_id: `111111${hex}-2222-4333-8444-555555555555`,
          slug: `slug-${i}`,
        });
      }

      const page1 = await doGet(`${url}/admin/tenants?limit=10`);
      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(10);
      expect(page1.body.has_more).toBe(true);
      expect(typeof page1.body.next_cursor).toBe('string');

      const page2 = await doGet(
        `${url}/admin/tenants?cursor=${encodeURIComponent(page1.body.next_cursor)}&limit=10`
      );
      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(10);
      expect(page2.body.has_more).toBe(true);

      const page3 = await doGet(
        `${url}/admin/tenants?cursor=${encodeURIComponent(page2.body.next_cursor)}&limit=10`
      );
      expect(page3.status).toBe(200);
      expect(page3.body.data.length).toBe(5);
      expect(page3.body.has_more).toBe(false);
      expect(page3.body.next_cursor).toBeNull();
    } finally {
      await close();
    }
  });

  it('Test 9: GET list include_disabled default false; toggled true shows row', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(created.status).toBe(201);

      // Directly disable via DB to simulate post-disable state
      await pool.query(`UPDATE tenants SET disabled_at = NOW() WHERE id = $1`, [created.body.id]);

      const listDefault = await doGet(`${url}/admin/tenants`);
      expect(listDefault.status).toBe(200);
      expect(listDefault.body.data.length).toBe(0);

      const listAll = await doGet(`${url}/admin/tenants?include_disabled=true`);
      expect(listAll.status).toBe(200);
      expect(listAll.body.data.length).toBe(1);
      expect(listAll.body.data[0].disabled_at).not.toBeNull();
    } finally {
      await close();
    }
  });

  it('Test 10: GET list tenant-scoped RBAC — only own row visible', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const global = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'g@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    let tenantAId: string;
    try {
      const a = await doPost(`${global.url}/admin/tenants`, VALID_BODY);
      await doPost(`${global.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '22222222-3333-4333-8444-555555555555',
      });
      await doPost(`${global.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '33333333-3333-4333-8444-555555555555',
      });
      tenantAId = a.body.id;
    } finally {
      await global.close();
    }

    const scoped = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 's@example.com',
        source: 'api-key',
        tenantScoped: tenantAId!,
      },
      tp
    );
    try {
      const list = await doGet(`${scoped.url}/admin/tenants?limit=10`);
      expect(list.status).toBe(200);
      expect(list.body.data.length).toBe(1);
      expect(list.body.data[0].id).toBe(tenantAId);
    } finally {
      await scoped.close();
    }
  });

  it('Test 11: GET /:id — 200 for own; 404 for missing; 404 for cross-tenant scoped', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const global = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'g@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    let idA: string;
    let idB: string;
    try {
      const a = await doPost(`${global.url}/admin/tenants`, VALID_BODY);
      const b = await doPost(`${global.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '22222222-3333-4333-8444-555555555555',
      });
      idA = a.body.id;
      idB = b.body.id;
    } finally {
      await global.close();
    }

    // Global admin: 200 both; 404 missing
    const globalAgain = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'g@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      expect((await doGet(`${globalAgain.url}/admin/tenants/${idA}`)).status).toBe(200);
      expect(
        (await doGet(`${globalAgain.url}/admin/tenants/99999999-9999-4999-8999-999999999999`))
          .status
      ).toBe(404);
    } finally {
      await globalAgain.close();
    }

    // Scoped to A: 200 for A; 404 for B (no-info-leak per D-13)
    const scoped = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 's@example.com',
        source: 'api-key',
        tenantScoped: idA!,
      },
      tp
    );
    try {
      expect((await doGet(`${scoped.url}/admin/tenants/${idA}`)).status).toBe(200);
      const cross = await doGet(`${scoped.url}/admin/tenants/${idB}`);
      expect(cross.status).toBe(404);
    } finally {
      await scoped.close();
    }
  });

  it('Test 12: PATCH partial update → audit action + publishTenantInvalidation', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const redis = new MemoryRedisFacade();

    // Track invalidation publishes
    const publishedTenantIds: string[] = [];
    redis.on('message', ((channel: string, message: string) => {
      if (channel === 'mcp:tenant-invalidate') publishedTenantIds.push(message);
    }) as (...args: unknown[]) => void);
    await redis.subscribe('mcp:tenant-invalidate');

    const { url, close } = await startServer(
      pool,
      redis,
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(created.status).toBe(201);
      const id = created.body.id;
      const originalUpdatedAt = created.body.updated_at;

      await new Promise((r) => setTimeout(r, 5)); // ensure updated_at advances

      const res = await doPatch(`${url}/admin/tenants/${id}`, {
        cors_origins: ['https://new.example.com'],
      });
      expect(res.status).toBe(200);
      expect(res.body.cors_origins).toEqual(['https://new.example.com']);
      expect(res.body.mode).toBe('delegated'); // unchanged
      expect(res.body.updated_at).not.toBe(originalUpdatedAt);

      // Audit row
      const { rows: auditRows } = await pool.query(
        "SELECT * FROM audit_log WHERE action = 'admin.tenant.update'"
      );
      expect(auditRows.length).toBe(1);
      const meta =
        typeof auditRows[0].meta === 'string' ? JSON.parse(auditRows[0].meta) : auditRows[0].meta;
      expect(meta.tenantId).toBe(id);
      expect(meta.fieldsChanged).toEqual(expect.arrayContaining(['cors_origins']));

      // Cross-replica invalidation: tenant ID published
      await new Promise((r) => setTimeout(r, 20));
      expect(publishedTenantIds).toContain(id);

      // Local LRU: tenantPool.invalidate OR evict called
      const called = tp.invalidate.mock.calls.length + tp.evict.mock.calls.length;
      expect(called).toBeGreaterThanOrEqual(1);
    } finally {
      await close();
    }
  });

  it('Test 13: PATCH redirect_uri validation rejects javascript: before DB write', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(created.status).toBe(201);
      const before = await pool.query(`SELECT redirect_uri_allowlist FROM tenants WHERE id = $1`, [
        created.body.id,
      ]);

      const res = await doPatch(`${url}/admin/tenants/${created.body.id}`, {
        redirect_uri_allowlist: ['https://ok.example.com', 'javascript:alert'],
      });
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('invalid_redirect_uri');

      // DB unchanged
      const after = await pool.query(`SELECT redirect_uri_allowlist FROM tenants WHERE id = $1`, [
        created.body.id,
      ]);
      expect(after.rows[0].redirect_uri_allowlist).toEqual(before.rows[0].redirect_uri_allowlist);
    } finally {
      await close();
    }
  });

  it('Test 14: PATCH empty body → 400 empty_patch', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const res = await doPatch(`${url}/admin/tenants/${created.body.id}`, {});
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('empty_patch');
    } finally {
      await close();
    }
  });

  it('Test 15: PATCH mode change (delegated → bearer) permitted', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const res = await doPatch(`${url}/admin/tenants/${created.body.id}`, { mode: 'bearer' });
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('bearer');

      // wrapped_dek remains intact so switch back is lossless
      const { rows } = await pool.query('SELECT wrapped_dek FROM tenants WHERE id = $1', [
        created.body.id,
      ]);
      expect(rows[0].wrapped_dek).not.toBeNull();
    } finally {
      await close();
    }
  });

  it('Test 16: PATCH unknown tenant → 404', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const res = await doPatch(`${url}/admin/tenants/99999999-9999-4999-8999-999999999999`, {
        cors_origins: ['https://x.example.com'],
      });
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });

  it('Test 17: PATCH tenant-scoped RBAC — own OK, other returns 404', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const global = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'g@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    let idA: string;
    let idB: string;
    try {
      const a = await doPost(`${global.url}/admin/tenants`, VALID_BODY);
      const b = await doPost(`${global.url}/admin/tenants`, {
        ...VALID_BODY,
        tenant_id: '22222222-3333-4333-8444-555555555555',
      });
      idA = a.body.id;
      idB = b.body.id;
    } finally {
      await global.close();
    }

    const scoped = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 's@example.com',
        source: 'api-key',
        tenantScoped: idA!,
      },
      tp
    );
    try {
      const own = await doPatch(`${scoped.url}/admin/tenants/${idA}`, {
        cors_origins: ['https://z.example.com'],
      });
      expect(own.status).toBe(200);

      const cross = await doPatch(`${scoped.url}/admin/tenants/${idB}`, {
        cors_origins: ['https://z.example.com'],
      });
      expect(cross.status).toBe(404);
    } finally {
      await scoped.close();
    }
  });

  it('Test 19: POST /:id/sync-scopes dry-run previews without DB write or cache invalidation', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const redis = new MemoryRedisFacade();
    const publishedTenantIds: string[] = [];
    redis.on('message', ((channel: string, message: string) => {
      if (channel === 'mcp:tenant-invalidate') publishedTenantIds.push(message);
    }) as (...args: unknown[]) => void);
    await redis.subscribe('mcp:tenant-invalidate');

    const { url, close } = await startServer(
      pool,
      redis,
      { actor: 'admin@example.com', source: 'api-key', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        allowed_scopes: [
          'User.Read',
          'https://analysis.windows.net/powerbi/api/Dashboard.Read.All',
        ],
      });
      const res = await doPost(`${url}/admin/tenants/${created.body.id}/sync-scopes`, {
        dry_run: true,
        graph_scopes: ['Mail.Read', 'Files.Read.All'],
      });

      expect(res.status).toBe(200);
      expect(res.body.dry_run).toBe(true);
      expect(res.body.next_allowed_scopes).toEqual([
        'Files.Read.All',
        'Mail.Read',
        'https://analysis.windows.net/powerbi/api/Dashboard.Read.All',
      ]);
      const { rows } = await pool.query('SELECT allowed_scopes FROM tenants WHERE id = $1', [
        created.body.id,
      ]);
      const stored =
        typeof rows[0].allowed_scopes === 'string'
          ? JSON.parse(rows[0].allowed_scopes)
          : rows[0].allowed_scopes;
      expect(stored).toEqual([
        'User.Read',
        'https://analysis.windows.net/powerbi/api/Dashboard.Read.All',
      ]);
      expect(tp.invalidate).not.toHaveBeenCalled();
      expect(tp.evict).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 20));
      expect(publishedTenantIds).toEqual([]);
    } finally {
      await close();
    }
  });

  it('Test 20: POST /:id/sync-scopes applies DB update and invalidates tenant metadata cache without token/session revocation', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const redis = new MemoryRedisFacade();
    const publishedTenantIds: string[] = [];
    redis.on('message', ((channel: string, message: string) => {
      if (channel === 'mcp:tenant-invalidate') publishedTenantIds.push(message);
    }) as (...args: unknown[]) => void);
    await redis.subscribe('mcp:tenant-invalidate');

    const fetcher = vi.fn(async () => ['Mail.Read', 'User.Read']);
    const { url, close } = await startServer(
      pool,
      redis,
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp,
      fetcher
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const res = await doPost(
        `${url}/admin/tenants/${created.body.id}/sync-scopes`,
        {},
        { Authorization: 'Bearer admin-token-for-test' }
      );

      expect(res.status).toBe(200);
      expect(res.body.allowed_scopes).toEqual(['Mail.Read', 'User.Read']);
      expect(fetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantDirectoryId: VALID_BODY.tenant_id,
          clientId: VALID_BODY.client_id,
          cloudType: 'global',
          adminBearerToken: 'admin-token-for-test',
        })
      );

      const { rows } = await pool.query('SELECT allowed_scopes FROM tenants WHERE id = $1', [
        created.body.id,
      ]);
      const stored =
        typeof rows[0].allowed_scopes === 'string'
          ? JSON.parse(rows[0].allowed_scopes)
          : rows[0].allowed_scopes;
      expect(stored).toEqual(['Mail.Read', 'User.Read']);
      const called = tp.invalidate.mock.calls.length + tp.evict.mock.calls.length;
      expect(called).toBeGreaterThanOrEqual(1);
      await new Promise((r) => setTimeout(r, 20));
      expect(publishedTenantIds).toContain(created.body.id);

      const { rows: auditRows } = await pool.query(
        "SELECT * FROM audit_log WHERE action = 'admin.tenant.sync-scopes'"
      );
      const meta =
        typeof auditRows[0].meta === 'string' ? JSON.parse(auditRows[0].meta) : auditRows[0].meta;
      expect(meta.sessionInvalidation).toBe(false);
    } finally {
      await close();
    }
  });

  it('Test 21: POST /:id/sync-scopes preserves non-Graph/product scopes unless replace_all is explicit', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'api-key', tenantScoped: null },
      tp
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, {
        ...VALID_BODY,
        allowed_scopes: ['User.Read', 'https://graph.microsoft.com/custom-product-scope'],
      });

      const preserve = await doPost(`${url}/admin/tenants/${created.body.id}/sync-scopes`, {
        graph_scopes: ['Mail.Read'],
      });
      expect(preserve.status).toBe(200);
      expect(preserve.body.allowed_scopes).toEqual([
        'Mail.Read',
        'https://graph.microsoft.com/custom-product-scope',
      ]);

      const replace = await doPost(`${url}/admin/tenants/${created.body.id}/sync-scopes`, {
        replace_all: true,
        graph_scopes: ['Files.Read.All'],
      });
      expect(replace.status).toBe(200);
      expect(replace.body.allowed_scopes).toEqual(['Files.Read.All']);
    } finally {
      await close();
    }
  });

  it('Test 22: POST /:id/sync-scopes enforces RBAC and returns 404 for cross-tenant scoped admin', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const global = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'g@example.com', source: 'entra', tenantScoped: null },
      tp
    );
    let idA: string;
    let idB: string;
    try {
      idA = (await doPost(`${global.url}/admin/tenants`, VALID_BODY)).body.id;
      idB = (
        await doPost(`${global.url}/admin/tenants`, {
          ...VALID_BODY,
          tenant_id: '22222222-3333-4333-8444-555555555555',
        })
      ).body.id;
    } finally {
      await global.close();
    }

    const scoped = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 's@example.com', source: 'api-key', tenantScoped: idA! },
      tp
    );
    try {
      const cross = await doPost(`${scoped.url}/admin/tenants/${idB}/sync-scopes`, {
        graph_scopes: ['Mail.Read'],
      });
      expect(cross.status).toBe(404);
    } finally {
      await scoped.close();
    }
  });

  it('Test 23: POST /:id/sync-scopes handles unavailable Graph fetch without DB write', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const fetcher = vi.fn(async () => {
      throw new Error('Graph unavailable');
    });
    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      { actor: 'admin@example.com', source: 'entra', tenantScoped: null },
      tp,
      fetcher
    );
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY);
      const res = await doPost(
        `${url}/admin/tenants/${created.body.id}/sync-scopes`,
        {},
        { Authorization: 'Bearer admin-token-for-test' }
      );
      expect(res.status).toBe(502);
      expect(res.body.type).toContain('scope_sync_unavailable');
      const { rows } = await pool.query('SELECT allowed_scopes FROM tenants WHERE id = $1', [
        created.body.id,
      ]);
      const stored =
        typeof rows[0].allowed_scopes === 'string'
          ? JSON.parse(rows[0].allowed_scopes)
          : rows[0].allowed_scopes;
      expect(stored).toEqual(VALID_BODY.allowed_scopes);
      expect(tp.invalidate).not.toHaveBeenCalled();
      expect(tp.evict).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it('Test 24: live Graph scope sync rejects admin bearer tenant mismatch before Graph fetch', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ value: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
    );

    await expect(
      fetchConsentedGraphDelegatedScopes({
        tenantDirectoryId: VALID_BODY.tenant_id,
        clientId: VALID_BODY.client_id,
        cloudType: 'global',
        adminBearerToken: makeJwt({ tid: '22222222-3333-4333-8444-555555555555' }),
        fetchImpl,
      })
    ).rejects.toThrow(/tenant mismatch/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('Test 25: live Graph scope sync rejects off-host nextLink before sending bearer', async () => {
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request) =>
        new Response(
          JSON.stringify({
            value: [{ id: 'client-sp-id', appId: VALID_BODY.client_id }],
            '@odata.nextLink': 'https://evil.example.com/v1.0/servicePrincipals?$skiptoken=leak',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    );

    await expect(
      fetchConsentedGraphDelegatedScopes({
        tenantDirectoryId: VALID_BODY.tenant_id,
        clientId: VALID_BODY.client_id,
        cloudType: 'global',
        adminBearerToken: makeJwt({ tid: VALID_BODY.tenant_id }),
        fetchImpl,
      })
    ).rejects.toThrow(/off-host nextLink/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('https://graph.microsoft.com/v1.0/');
  });

  it('Test 26: admin router rejects unauthenticated POST /admin/tenants/:id/sync-scopes', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const { url, close } = await startAdminRouterServer(pool, new MemoryRedisFacade(), tp);
    try {
      const res = await doPost(
        `${url}/admin/tenants/99999999-9999-4999-8999-999999999999/sync-scopes`,
        { graph_scopes: ['Mail.Read'] }
      );
      expect(res.status).toBe(401);
      expect(res.body.type).toContain('unauthorized');
    } finally {
      await close();
    }
  });

  it('Test 27: admin router authenticates bearer before mounted sync-scopes route', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();
    const redis = new MemoryRedisFacade();
    const fetcher = vi.fn(async () => ['Mail.Read']);
    const token = makeJwt({
      tid: VALID_BODY.tenant_id,
      aud: 'admin-app-client-id',
      upn: 'admin@example.com',
      oid: 'admin-oid',
    });
    const { url, close } = await startAdminRouterServer(pool, redis, tp, fetcher);
    try {
      const created = await doPost(`${url}/admin/tenants`, VALID_BODY, {
        Authorization: `Bearer ${token}`,
      });
      expect(created.status).toBe(201);

      const synced = await doPost(
        `${url}/admin/tenants/${created.body.id}/sync-scopes`,
        {},
        { Authorization: `Bearer ${token}` }
      );
      expect(synced.status).toBe(200);
      expect(synced.body.allowed_scopes).toEqual(['Mail.Read']);
      expect(fetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantDirectoryId: VALID_BODY.tenant_id,
          adminBearerToken: token,
        })
      );
    } finally {
      await close();
    }
  });

  it('Test 18: snake_case wire preservation — response keys match schema', async () => {
    const pool = await makePool();
    sharedPool = pool;
    const tp = makeTenantPoolStub();

    const { url, close } = await startServer(
      pool,
      new MemoryRedisFacade(),
      {
        actor: 'admin@example.com',
        source: 'entra',
        tenantScoped: null,
      },
      tp
    );
    try {
      const res = await doPost(`${url}/admin/tenants`, VALID_BODY);
      expect(res.status).toBe(201);
      const expectedKeys = [
        'id',
        'mode',
        'client_id',
        'client_secret_ref',
        'tenant_id',
        'cloud_type',
        'redirect_uri_allowlist',
        'cors_origins',
        'allowed_scopes',
        'enabled_tools',
        'slug',
        'disabled_at',
        'created_at',
        'updated_at',
      ];
      for (const k of expectedKeys) {
        expect(k in res.body).toBe(true);
      }
      // None of the camelCase variants should be present
      expect('clientId' in res.body).toBe(false);
      expect('tenantId' in res.body).toBe(false);
      expect('redirectUriAllowlist' in res.body).toBe(false);
      expect('disabledAt' in res.body).toBe(false);
    } finally {
      await close();
    }
  });
});

// Ensure helper is imported — catches accidental removal
void tenantRowToWire;
void TENANT_A;
void TENANT_B;

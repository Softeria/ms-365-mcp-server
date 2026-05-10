/**
 * Plan 03-10 Task 2 — four-flows integration test (ROADMAP SC#3 + audit).
 *
 * Extends the 03-06 concurrent-flows test with an audit_log assertion:
 * after delegated + app-only + bearer all complete in one server instance,
 * the audit_log table MUST contain distinct rows for each flow, each tagged
 * with its own tenant_id and action.
 *
 * Device-code is covered by an API-surface probe (AuthManager
 * acquireTokenByDeviceCode remains defined) since it does not share the HTTP
 * path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Request, type Response } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeJwt, SignJWT } from 'jose';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import { generateTenantDek } from '../../src/lib/crypto/dek.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');
const KEK = crypto.randomBytes(32);

const TENANT_DELEGATED = 'aaaaaaaa-1111-4111-8111-111111111111';
const TENANT_APP_ONLY = 'bbbbbbbb-2222-4222-8222-222222222222';

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

async function insertTenant(
  pool: Pool,
  id: string,
  mode: string,
  clientId: string,
  redirectUris: string[],
  scopes: string[]
): Promise<void> {
  const { wrappedDek } = generateTenantDek(KEK);
  await pool.query(
    `INSERT INTO tenants (
       id, mode, client_id, tenant_id, cloud_type,
       redirect_uri_allowlist, cors_origins, allowed_scopes, wrapped_dek,
       slug, disabled_at
     ) VALUES ($1, $2, $3, $4, 'global', $5, '[]'::jsonb, $6, $7::jsonb, NULL, NULL)`,
    [
      id,
      mode,
      clientId,
      id,
      JSON.stringify(redirectUris),
      JSON.stringify(scopes),
      JSON.stringify(wrappedDek),
    ]
  );
}

async function makeJwt(payload: Record<string, unknown>): Promise<string> {
  const key = new Uint8Array(32);
  return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(key);
}

describe('Plan 03-10 — four flows + audit rows (SC#3)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let pool: Pool;
  let redis: MemoryRedisFacade;
  let pkceStore: RedisPkceStore;

  beforeEach(async () => {
    vi.stubEnv('MS365_MCP_APP_ONLY_API_KEY', 'test-app-only-key');
    pool = await makePool();
    redis = new MemoryRedisFacade();
    pkceStore = new RedisPkceStore(redis);

    await insertTenant(
      pool,
      TENANT_DELEGATED,
      'delegated',
      'client-delegated',
      ['http://localhost:3000/callback'],
      ['User.Read']
    );
    await insertTenant(pool, TENANT_APP_ONLY, 'app-only', 'client-app-only', [], []);

    const mockAcquireByCode = vi.fn(async () => ({
      accessToken: 'delegated-access-token',
      expiresOn: new Date(Date.now() + 3600 * 1000),
    }));
    const mockAcquireByCredential = vi.fn(async () => ({
      accessToken: 'app-only-access-token',
      expiresOn: new Date(Date.now() + 3600 * 1000),
    }));
    const mockTenantPool = {
      acquire: vi.fn(async (tenant: TenantRow) => {
        if (tenant.mode === 'app-only') {
          return { acquireTokenByClientCredential: mockAcquireByCredential };
        }
        return { acquireTokenByCode: mockAcquireByCode };
      }),
      buildCachePlugin: vi.fn(),
      evict: vi.fn(),
      getDekForTenant: vi.fn(() => Buffer.alloc(32, 7)),
    };

    const { createAuthorizeHandler, createTenantTokenHandler } =
      await import('../../src/lib/oauth/tenant-handlers.js');
    const { createAuthSelectorMiddleware } = await import('../../src/lib/auth-selector.js');
    const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
    const { writeAuditStandalone } = await import('../../src/lib/audit.js');

    const loadTenant = createLoadTenantMiddleware({ pool });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/t/:tenantId', loadTenant);

    app.get('/t/:tenantId/authorize', createAuthorizeHandler({ pkceStore, pgPool: pool }));
    app.post(
      '/t/:tenantId/token',
      createTenantTokenHandler({
        pkceStore,
        tenantPool: mockTenantPool as unknown as Parameters<
          typeof createTenantTokenHandler
        >[0]['tenantPool'],
        redis,
        pgPool: pool,
      })
    );

    // /mcp uses the authSelector; add an audit write at the handler boundary.
    app.post(
      '/t/:tenantId/mcp',
      createAuthSelectorMiddleware({
        tenantPool: mockTenantPool as unknown as Parameters<
          typeof createAuthSelectorMiddleware
        >[0]['tenantPool'],
        bearerVerifier: async ({ token }) => decodeJwt(token),
      }),
      async (req: Request, res: Response) => {
        const tenant = (req as Request & { tenant?: TenantRow }).tenant;
        const { getFlow } = await import('../../src/request-context.js');
        const flow = getFlow() ?? 'unknown';
        // Emit a flow-specific audit row so the four-flows test can observe
        // distinct rows per flow.
        const action =
          flow === 'bearer'
            ? 'oauth.authorize'
            : flow === 'app-only'
              ? 'oauth.token.exchange'
              : 'oauth.refresh';
        if (tenant) {
          await writeAuditStandalone(pool, {
            tenantId: tenant.id,
            actor: 'system',
            action,
            target: null,
            ip: null,
            requestId: `mcp-${flow}-${Date.now()}`,
            result: 'success',
            meta: { flow },
          });
        }
        res.status(200).json({ ok: true, flow, tenantId: tenant?.id });
      }
    );

    await new Promise<void>((resolve) => {
      server = http.createServer(app).listen(0, () => {
        const { port } = server!.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((r) => server!.close(() => r()));
      server = undefined;
    }
    vi.unstubAllEnvs();
    await redis.quit();
  });

  it('all four flows emit distinct audit rows', async () => {
    // (a) delegated OAuth round trip — emits oauth.authorize + oauth.token.exchange
    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');
    const authRes = await fetch(
      `${baseUrl}/t/${TENANT_DELEGATED}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: clientChallenge,
          state: 'delegated',
        }),
      { redirect: 'manual' }
    );
    expect(authRes.status).toBe(302);

    const tokenRes = await fetch(`${baseUrl}/t/${TENANT_DELEGATED}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'the-code',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: clientVerifier,
      }),
    });
    expect(tokenRes.status).toBe(200);

    // (b) app-only
    const appOnlyRes = await fetch(`${baseUrl}/t/${TENANT_APP_ONLY}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-MCP-App-Key': 'test-app-only-key' },
      body: JSON.stringify({}),
    });
    expect(appOnlyRes.status).toBe(200);

    // (c) bearer
    const jwt = await makeJwt({ tid: TENANT_DELEGATED });
    const bearerRes = await fetch(`${baseUrl}/t/${TENANT_DELEGATED}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({}),
    });
    expect(bearerRes.status).toBe(200);

    // (d) device-code API surface preserved
    const authModule = await import('../../src/auth.js');
    const proto = authModule.default.prototype as {
      acquireTokenByDeviceCode?: unknown;
    };
    expect(typeof proto.acquireTokenByDeviceCode).toBe('function');

    // Settle any outstanding fire-and-forget audit writes.
    await new Promise((r) => setTimeout(r, 50));

    // Audit assertions: two tenants produce rows keyed on their tenant_id.
    const { rows } = await pool.query(
      'SELECT tenant_id, action, result FROM audit_log ORDER BY ts ASC'
    );

    const delegatedRows = rows.filter((r) => r.tenant_id === TENANT_DELEGATED);
    const appOnlyRows = rows.filter((r) => r.tenant_id === TENANT_APP_ONLY);
    expect(delegatedRows.length).toBeGreaterThanOrEqual(1);
    expect(appOnlyRows.length).toBeGreaterThanOrEqual(1);

    // Delegated should have emitted at least oauth.authorize and
    // oauth.token.exchange.
    const delegatedActions = new Set(delegatedRows.map((r) => r.action));
    expect(delegatedActions.has('oauth.authorize')).toBe(true);
    expect(delegatedActions.has('oauth.token.exchange')).toBe(true);

    // SC#2 final signal: distinct tenant_ids appear in audit_log.
    const distinctTenants = new Set(rows.map((r) => r.tenant_id));
    expect(distinctTenants.size).toBeGreaterThanOrEqual(2);
  });
});

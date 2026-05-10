/**
 * Plan 03-10 Task 2 — tenant disable cascade (ROADMAP SC#4 end-to-end).
 *
 * Full flow:
 *   1. INSERT an active tenant.
 *   2. Prime the loadTenant LRU by issuing one /t/:tenantId/authorize call.
 *   3. Invoke bin/disable-tenant.mjs — cascading disabled_at, wrapped_dek=NULL,
 *      Redis cache keys purged, tenantPool eviction.
 *   4. Publish 'mcp:tenant-invalidate' (simulates the Phase 4 admin bus).
 *   5. Assert: audit_log contains a 'tenant.disable' row AND a subsequent
 *      /t/:tenantId/authorize returns 404.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import { generateTenantDek } from '../../src/lib/crypto/dek.js';
import { TenantPool } from '../../src/lib/tenant/tenant-pool.js';
// @ts-expect-error — .mjs import has no types; rely on runtime export shape.
import { main as disableTenantMain } from '../../bin/disable-tenant.mjs';
import {
  publishTenantInvalidation,
  subscribeToTenantInvalidation,
} from '../../src/lib/tenant/tenant-invalidation.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');
const KEK = crypto.randomBytes(32);

const TENANT_ID = 'deadbeef-dead-4eef-beef-deadbeefdead';

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

function withTransactionFactory(pool: Pool) {
  return async function withTransaction<T>(
    fn: (c: { query: Pool['query'] }) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await fn(client);
      await client.query('COMMIT');
      return r;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // best-effort
      }
      throw e;
    } finally {
      client.release();
    }
  };
}

describe('Plan 03-10 — tenant disable cascade (SC#4)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let pool: Pool;
  let redis: MemoryRedisFacade;
  let tenantPool: TenantPool;

  beforeEach(async () => {
    pool = await makePool();
    redis = new MemoryRedisFacade();
    tenantPool = new TenantPool(redis, KEK);

    const { wrappedDek } = generateTenantDek(KEK);
    await pool.query(
      `INSERT INTO tenants (
         id, mode, client_id, tenant_id, cloud_type,
         redirect_uri_allowlist, cors_origins, allowed_scopes, wrapped_dek,
         slug, disabled_at
       ) VALUES ($1, 'delegated', 'cid', $2, 'global', $3, '[]'::jsonb, $4, $5::jsonb, NULL, NULL)`,
      [
        TENANT_ID,
        TENANT_ID,
        JSON.stringify(['http://localhost:3000/callback']),
        JSON.stringify(['User.Read']),
        JSON.stringify(wrappedDek),
      ]
    );
    await pool.query(
      `INSERT INTO api_keys (id, tenant_id, name, key_hash, display_suffix)
         VALUES ('k-1', $1, 'default', 'h1', 'sfx1')`,
      [TENANT_ID]
    );

    const pkceStore = new RedisPkceStore(redis);

    const { createAuthorizeHandler } = await import('../../src/lib/oauth/tenant-handlers.js');
    const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');

    const loadTenant = createLoadTenantMiddleware({ pool });

    // Subscribe to tenant invalidation — publishes evict the LRU entry.
    await subscribeToTenantInvalidation(redis, {
      evict: (tid: string) => loadTenant.evict(tid),
    });

    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use('/t/:tenantId', loadTenant);
    app.get('/t/:tenantId/authorize', createAuthorizeHandler({ pkceStore, pgPool: pool }));

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
    await tenantPool.drain();
    await redis.quit();
  });

  it('disable cascade emits audit row + subsequent request returns 404', async () => {
    // Step 1: prime the LRU with one request.
    const challenge = crypto.randomBytes(32).toString('base64url');
    const primeRes = await fetch(
      `${baseUrl}/t/${TENANT_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: challenge,
          state: 'a',
        }),
      { redirect: 'manual' }
    );
    expect(primeRes.status).toBe(302);

    // Step 2: seed some cache keys + PKCE keys so the cleanup has work.
    await redis.set(`mcp:cache:${TENANT_ID}:cid:userA:sh`, '{}', 'EX', 3600);
    await redis.set(`mcp:pkce:${TENANT_ID}:abc`, '{}', 'EX', 600);

    // Step 3: run disable-tenant.mjs.
    const result = await disableTenantMain([TENANT_ID], {
      postgres: {
        getPool: () => pool,
        withTransaction: withTransactionFactory(pool),
      },
      redis: { getRedis: () => redis },
      tenantPool,
    });
    expect(result.disabled).toBe(TENANT_ID);

    // Step 4: publish invalidation so the loadTenant LRU evicts its cached row.
    await publishTenantInvalidation(redis, TENANT_ID);
    await new Promise((r) => setImmediate(r));
    // Allow a small tick for audit writes + eviction propagation.
    await new Promise((r) => setTimeout(r, 50));

    // Step 5a: audit_log contains a tenant.disable row for this tenant.
    const { rows: auditRows } = await pool.query(
      "SELECT tenant_id, action, actor, result FROM audit_log WHERE action = 'tenant.disable'"
    );
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(auditRows[0].tenant_id).toBe(TENANT_ID);
    expect(auditRows[0].actor).toBe('cli');
    expect(auditRows[0].result).toBe('success');

    // Step 5b: subsequent /t/:tenantId/authorize returns 404.
    const next = await fetch(
      `${baseUrl}/t/${TENANT_ID}/authorize?` +
        new URLSearchParams({
          redirect_uri: 'http://localhost:3000/callback',
          code_challenge: crypto.randomBytes(32).toString('base64url'),
          state: 'a2',
        })
    );
    expect(next.status).toBe(404);
  });
});

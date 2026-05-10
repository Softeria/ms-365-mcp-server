/**
 * Plan 05-03 Task 2 — loadTenant middleware carries preset_version.
 *
 * The middleware SELECT list was extended to include preset_version. This
 * test stages a row in pg-mem, hits the middleware, and asserts req.tenant
 * carries the field so Plan 05-04 (dispatch guard) can resolve it.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { newDb } from 'pg-mem';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../src/lib/tool-selection/enabled-tools-parser.js', () => ({
  ensureEnabledToolsSet: vi.fn(() => Object.freeze(new Set<string>())),
}));

import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';
import { createLoadTenantMiddleware } from '../../src/lib/tenant/load-tenant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

function stripPgcryptoExtensionStmts(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !/\bextension\b.*\bpgcrypto\b/i.test(line))
    .join('\n');
}

async function makePoolWithMigrations(): Promise<Pool> {
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

function makeReqRes(tenantId: string): {
  req: Request;
  res: Response;
  next: NextFunction;
  nextCalls: number;
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
  } as unknown as {
    req: Request;
    res: Response;
    next: NextFunction;
    nextCalls: number;
    jsonCalls: Array<{ status: number; body: unknown }>;
  };
}

describe('plan 05-03 task 2 — loadTenant carries preset_version', () => {
  it('populates req.tenant.preset_version on cache miss (default essentials-v1)', async () => {
    const pool = await makePoolWithMigrations();
    const tenantId = 'ccccdddd-1111-4222-8333-444455556666';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id)
       VALUES ($1, 'delegated', 'c', 't')`,
      [tenantId]
    );

    const middleware = createLoadTenantMiddleware({ pool });
    const harness = makeReqRes(tenantId);
    await middleware(harness.req, harness.res, harness.next);

    const attached = (harness.req as Request & { tenant?: TenantRow }).tenant;
    expect(attached).toBeDefined();
    expect(attached!.preset_version).toBe('essentials-v1');
  });

  it('populates req.tenant.preset_version with an explicit non-default value', async () => {
    const pool = await makePoolWithMigrations();
    const tenantId = 'deadbeef-1111-4222-8333-444455556666';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id, preset_version)
       VALUES ($1, 'app-only', 'cid', 'tid', 'essentials-v2')`,
      [tenantId]
    );

    const middleware = createLoadTenantMiddleware({ pool });
    const harness = makeReqRes(tenantId);
    await middleware(harness.req, harness.res, harness.next);

    const attached = (harness.req as Request & { tenant?: TenantRow }).tenant;
    expect(attached).toBeDefined();
    expect(attached!.preset_version).toBe('essentials-v2');
  });
});

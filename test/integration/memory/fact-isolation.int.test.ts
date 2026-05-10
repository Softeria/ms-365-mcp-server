/**
 * Phase 7 Plan 07-05 - SECUR-08 fact isolation integration.
 *
 * Repeats the fact service/admin isolation checks under the integration gate
 * so Phase 7 has bookmark, recipe, and fact memory coverage.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { __setPoolForTesting } from '../../../src/lib/postgres.js';
import { forgetFact, listFactsForAdmin, recordFact } from '../../../src/lib/memory/facts.js';
import { createMemoryFactRoutes } from '../../../src/lib/admin/memory-facts.js';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makePool(): Pool {
  const db = newDb();
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });
  const { Pool: PgMemPool } = db.adapters.createPg();
  return new PgMemPool() as Pool;
}

async function installSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE tenants (
      id uuid PRIMARY KEY
    );

    CREATE TABLE tenant_facts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      scope text NOT NULL,
      content text NOT NULL,
      content_tsv text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
}

interface HttpResult {
  status: number;
  body: unknown;
}

async function startFactAdminServer(
  redis: MemoryRedisFacade
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json() as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (
      req as unknown as {
        admin?: { actor: string; source: 'entra'; tenantScoped: string | null };
      }
    ).admin = { actor: 'admin@example.com', source: 'entra', tenantScoped: null };
    (req as express.Request & { id?: string }).id = 'req-fact-admin-int';
    next();
  });
  app.use('/admin/tenants', createMemoryFactRoutes({ redis } as never));
  const server = await new Promise<http.Server>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function doJson(method: string, url: string): Promise<HttpResult> {
  const res = await fetch(url, { method });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // plain text response
  }
  return { status: res.status, body: parsed };
}

describe('Phase 7 Plan 07-05 Task 2 - fact tenant isolation', () => {
  let pool: Pool;
  let redis: MemoryRedisFacade;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
    redis = new MemoryRedisFacade();
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await redis.quit();
    await pool.end();
  });

  it('tenant A cannot recall or delete tenant B facts by id', async () => {
    const factA = await recordFact(TENANT_A, {
      scope: 'preferences',
      content: 'Tenant A prefers concise summaries.',
    });
    const factB = await recordFact(TENANT_B, {
      scope: 'preferences',
      content: 'Tenant B prefers detailed summaries.',
    });

    const listA = await listFactsForAdmin(TENANT_A, { scope: 'preferences' });
    expect(listA.facts).toHaveLength(1);
    expect(listA.facts[0]).toMatchObject({
      id: factA.id,
      content: 'Tenant A prefers concise summaries.',
    });
    expect(JSON.stringify(listA)).not.toContain(factB.id);
    expect(JSON.stringify(listA)).not.toContain('Tenant B');

    await expect(forgetFact(TENANT_A, factB.id)).resolves.toEqual({ deleted: false });
    expect((await listFactsForAdmin(TENANT_A)).facts).toHaveLength(1);
    expect((await listFactsForAdmin(TENANT_B)).facts).toHaveLength(1);
  });

  it('admin DELETE /:id/facts/:factId returns 404 for cross-tenant ids', async () => {
    const factA = await recordFact(TENANT_A, {
      scope: 'preferences',
      content: 'Tenant A private preference.',
    });
    await recordFact(TENANT_B, {
      scope: 'preferences',
      content: 'Tenant B private preference.',
    });

    const { url, close } = await startFactAdminServer(redis);
    try {
      const denied = await doJson('DELETE', `${url}/admin/tenants/${TENANT_B}/facts/${factA.id}`);
      expect(denied.status).toBe(404);

      const result = await doJson('DELETE', `${url}/admin/tenants/${TENANT_A}/facts/${factA.id}`);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ deleted: true });
    } finally {
      await close();
    }
  });
});

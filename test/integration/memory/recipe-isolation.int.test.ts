/**
 * Phase 7 Plan 07-04 — SECUR-08 recipe isolation integration.
 *
 * Covers admin bulk writes/deletes plus same-name tenant isolation against the
 * public recipe service API. The `.int.test.ts` suffix keeps this behind
 * MS365_MCP_INTEGRATION=1 in the phase verification map.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { __setPoolForTesting } from '../../../src/lib/postgres.js';
import { deleteRecipe, listRecipes, saveRecipe } from '../../../src/lib/memory/recipes.js';
import { createMemoryRecipeRoutes } from '../../../src/lib/admin/memory-recipes.js';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';
import { AGENTIC_EVENTS_CHANNEL } from '../../../src/lib/mcp-notifications/events.js';

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

    CREATE TABLE tenant_tool_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      name text NOT NULL,
      alias text NOT NULL,
      params jsonb NOT NULL DEFAULT '{}'::jsonb,
      note text,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_tenant_tool_recipes_unique_tenant_name
      ON tenant_tool_recipes (tenant_id, name)
      WHERE owner_subject IS NULL;

    CREATE UNIQUE INDEX idx_tenant_tool_recipes_unique_owner_name
      ON tenant_tool_recipes (tenant_id, owner_subject, name)
      WHERE owner_subject IS NOT NULL;
  `);
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
}

interface HttpResult {
  status: number;
  body: unknown;
}

async function startRecipeAdminServer(
  redis: MemoryRedisFacade,
  tenantScoped: string | null = null
): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json() as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (
      req as unknown as {
        admin?: { actor: string; source: 'entra'; tenantScoped: string | null };
      }
    ).admin = { actor: 'admin@example.com', source: 'entra', tenantScoped };
    (req as express.Request & { id?: string }).id = 'req-recipe-admin';
    next();
  });
  app.use('/admin/tenants', createMemoryRecipeRoutes({ redis } as never));
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

async function doJson(method: string, url: string, body?: unknown): Promise<HttpResult> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // plain text response
  }
  return { status: res.status, body: parsed };
}

async function collectRecipeEvents(
  redis: MemoryRedisFacade,
  fn: () => Promise<void>
): Promise<Array<{ type: string; uris?: string[] }>> {
  const events: Array<{ type: string; uris?: string[] }> = [];
  redis.on('message', (channel, message) => {
    if (channel === AGENTIC_EVENTS_CHANNEL) {
      events.push(JSON.parse(message) as { type: string; uris?: string[] });
    }
  });
  await redis.subscribe(AGENTIC_EVENTS_CHANNEL);
  await fn();
  return events;
}

describe('Phase 7 Plan 07-04 Task 3 — recipe tenant isolation', () => {
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

  it('POST /:id/recipes bulk inserts recipe rows for the route tenant', async () => {
    const { url, close } = await startRecipeAdminServer(redis);
    try {
      const events = await collectRecipeEvents(redis, async () => {
        const result = await doJson('POST', `${url}/admin/tenants/${TENANT_A}/recipes`, [
          {
            name: 'morning inbox',
            alias: 'me.messages.ListMessages',
            params: { top: 10 },
            note: 'admin seed',
          },
        ]);

        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({
          recipes: [
            {
              name: 'morning inbox',
              alias: 'me.messages.ListMessages',
              params: { top: 10 },
              note: 'admin seed',
            },
          ],
        });
      });

      expect(await listRecipes(TENANT_A)).toHaveLength(1);
      expect(await listRecipes(TENANT_B)).toEqual([]);
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'resources/updated',
          uris: expect.arrayContaining([
            `m365://tenant/${TENANT_A}/recipes.json`,
            `mcp://tenant/${TENANT_A}/recipes.json`,
          ]),
        })
      );
    } finally {
      await close();
    }
  });

  it('DELETE /:id/recipes/:recipeId deletes only a row owned by the route tenant', async () => {
    const recipeA = await saveRecipe(TENANT_A, {
      name: 'same name',
      alias: 'me.sendMail',
      params: { subject: 'A' },
    });
    await saveRecipe(TENANT_B, {
      name: 'same name',
      alias: 'me.sendMail',
      params: { subject: 'B' },
    });
    const { url, close } = await startRecipeAdminServer(redis);
    try {
      const denied = await doJson(
        'DELETE',
        `${url}/admin/tenants/${TENANT_B}/recipes/${recipeA.id}`
      );
      expect(denied.status).toBe(200);
      expect(denied.body).toEqual({ deleted: false });

      const result = await doJson(
        'DELETE',
        `${url}/admin/tenants/${TENANT_A}/recipes/${recipeA.id}`
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ deleted: true });
      expect(await listRecipes(TENANT_A)).toEqual([]);
      expect(await listRecipes(TENANT_B)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it('same-name recipe rows do not leak across tenant list/delete operations', async () => {
    const recipeA = await saveRecipe(TENANT_A, {
      name: 'daily summary',
      alias: 'me.messages.ListMessages',
      params: { top: 5 },
    });
    const recipeB = await saveRecipe(TENANT_B, {
      name: 'daily summary',
      alias: 'me.messages.ListMessages',
      params: { top: 50 },
    });

    const listA = await listRecipes(TENANT_A);
    const listB = await listRecipes(TENANT_B);

    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(1);
    expect(listA[0]).toMatchObject({ id: recipeA.id, params: { top: 5 } });
    expect(listB[0]).toMatchObject({ id: recipeB.id, params: { top: 50 } });

    await expect(deleteRecipe(TENANT_A, recipeB.id)).resolves.toEqual({ deleted: false });
    expect(await listRecipes(TENANT_A)).toHaveLength(1);
    expect(await listRecipes(TENANT_B)).toHaveLength(1);
  });
});

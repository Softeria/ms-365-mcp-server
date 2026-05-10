/**
 * Phase 7 Plan 07-04 — recipe memory service contract.
 *
 * These tests pin SECUR-08 for recipes: every persistence operation is
 * scoped by the explicit caller tenant id, including same-name rows across
 * tenants.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { __setPoolForTesting } from '../../../src/lib/postgres.js';
import {
  getRecipeByName,
  listRecipes,
  mergeRecipeParams,
  saveRecipe,
} from '../../../src/lib/memory/recipes.js';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';
import { AGENTIC_EVENTS_CHANNEL } from '../../../src/lib/mcp-notifications/events.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

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
      name text NOT NULL,
      alias text NOT NULL,
      params jsonb NOT NULL DEFAULT '{}'::jsonb,
      note text,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, name)
    );

    CREATE INDEX idx_tenant_tool_recipes_tenant
      ON tenant_tool_recipes (tenant_id);
  `);
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
}

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const registered = (
    server as unknown as {
      _registeredTools: Record<
        string,
        { handler: (args: unknown, extra: unknown) => Promise<CallToolResult> }
      >;
    }
  )._registeredTools;
  const tool = registered[name];
  if (!tool || typeof tool.handler !== 'function') {
    throw new Error(`tool "${name}" not registered on test McpServer`);
  }
  return tool.handler(args, { requestId: 'test' });
}

async function loadRecipeTools(
  poolForDynamicModules: Pool,
  executeToolAlias = vi.fn(async () => ({
    content: [{ type: 'text' as const, text: JSON.stringify({ ok: true }) }],
  }))
): Promise<{
  registerRecipeTools: typeof import('../../../src/lib/memory/recipe-tools.js').registerRecipeTools;
  executeToolAlias: typeof executeToolAlias;
  requestContext: typeof import('../../../src/request-context.js').requestContext;
}> {
  vi.doMock('../../../src/graph-tools.js', () => ({
    executeToolAlias,
  }));
  const [module, requestContextModule, postgresModule] = await Promise.all([
    import('../../../src/lib/memory/recipe-tools.js'),
    import('../../../src/request-context.js'),
    import('../../../src/lib/postgres.js'),
  ]);
  postgresModule.__setPoolForTesting(poolForDynamicModules);
  return {
    registerRecipeTools: module.registerRecipeTools,
    executeToolAlias,
    requestContext: requestContextModule.requestContext,
  };
}

async function collectRecipePublishEvents(
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

describe('Phase 7 Plan 07-04 Task 1 — recipe service', () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await pool.end();
  });

  it('saveRecipe inserts and updates on (tenant_id, name)', async () => {
    const first = await saveRecipe(TENANT_A, {
      name: 'morning inbox',
      alias: 'me.mailFolders.messages.ListMessages',
      params: { mailFolderId: 'inbox', top: 10 },
      note: 'initial',
    });
    const updated = await saveRecipe(TENANT_A, {
      name: 'morning inbox',
      alias: 'me.mailFolders.messages.ListMessages',
      params: { mailFolderId: 'inbox', top: 25 },
      note: 'updated',
    });

    expect(updated.id).toBe(first.id);
    expect(updated).toMatchObject({
      name: 'morning inbox',
      alias: 'me.mailFolders.messages.ListMessages',
      params: { mailFolderId: 'inbox', top: 25 },
      note: 'updated',
    });

    const { rows } = await pool.query(
      `SELECT tenant_id, name, alias, params, note FROM tenant_tool_recipes WHERE tenant_id = $1`,
      [TENANT_A]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT_A,
      name: 'morning inbox',
      alias: 'me.mailFolders.messages.ListMessages',
      params: { mailFolderId: 'inbox', top: 25 },
      note: 'updated',
    });
  });

  it('listRecipes returns only caller tenant rows and supports a text filter', async () => {
    await saveRecipe(TENANT_A, {
      name: 'morning inbox',
      alias: 'me.messages.ListMessages',
      params: { top: 10 },
      note: 'tenant A',
    });
    await saveRecipe(TENANT_B, {
      name: 'morning inbox',
      alias: 'me.messages.ListMessages',
      params: { top: 99 },
      note: 'tenant B',
    });
    await saveRecipe(TENANT_A, {
      name: 'send status',
      alias: 'me.sendMail',
      params: { body: { saveToSentItems: true } },
      note: 'weekly status',
    });

    const allA = await listRecipes(TENANT_A);
    expect(allA.map((recipe) => recipe.name).sort()).toEqual(['morning inbox', 'send status']);
    expect(allA.every((recipe) => !('tenantId' in recipe))).toBe(true);

    const filtered = await listRecipes(TENANT_A, 'status');
    expect(filtered.map((recipe) => recipe.name)).toEqual(['send status']);
  });

  it('getRecipeByName returns null for another tenant recipe with the same name', async () => {
    await saveRecipe(TENANT_B, {
      name: 'shared name',
      alias: 'me.sendMail',
      params: { subject: 'tenant B only' },
    });

    await expect(getRecipeByName(TENANT_A, 'shared name')).resolves.toBeNull();
    await expect(getRecipeByName(TENANT_B, 'shared name')).resolves.toMatchObject({
      name: 'shared name',
      params: { subject: 'tenant B only' },
    });
  });

  it('mergeRecipeParams gives paramOverrides precedence over saved params', () => {
    expect(mergeRecipeParams({ a: 1, b: 2 }, { b: 9 })).toEqual({ a: 1, b: 9 });
  });
});

describe('Phase 7 Plan 07-04 Task 2 — recipe MCP tools', () => {
  let pool: Pool;
  let redis: MemoryRedisFacade;
  let server: McpServer;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
    redis = new MemoryRedisFacade();
    server = new McpServer({ name: 'recipe-test', version: '0.0.0' });
  });

  afterEach(async () => {
    vi.doUnmock('../../../src/graph-tools.js');
    vi.resetModules();
    __setPoolForTesting(null);
    await redis.quit();
    await pool.end();
  });

  it('save-recipe requires name, alias, and params', async () => {
    const { registerRecipeTools, requestContext } = await loadRecipeTools(pool);
    registerRecipeTools(server, { redis, graphClient: {} as never });

    const missingParams = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'save-recipe', {
        name: 'morning inbox',
        alias: 'me.messages.ListMessages',
      })
    );
    expect(missingParams.isError).toBe(true);
    expect(JSON.parse(missingParams.content[0].text)).toMatchObject({ error: 'invalid_recipe' });
  });

  it('list-recipes accepts an optional filter and returns caller tenant recipes', async () => {
    const { registerRecipeTools, requestContext } = await loadRecipeTools(pool);
    registerRecipeTools(server, { redis, graphClient: {} as never });
    await saveRecipe(TENANT_A, {
      name: 'morning inbox',
      alias: 'me.messages.ListMessages',
      params: { top: 10 },
    });
    await saveRecipe(TENANT_A, {
      name: 'send status',
      alias: 'me.sendMail',
      params: { subject: 'weekly' },
    });

    const result = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'list-recipes', { filter: 'status' })
    );

    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text) as { recipes: Array<{ name: string }> };
    expect(body.recipes.map((recipe) => recipe.name)).toEqual(['send status']);
  });

  it('run-recipe merges paramOverrides, calls executeToolAlias, and marks last_run_at', async () => {
    const executeToolAlias = vi.fn(async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify({ dispatched: true }) }],
    }));
    const { registerRecipeTools, requestContext } = await loadRecipeTools(pool, executeToolAlias);
    const graphClient = { graphRequest: vi.fn() };
    const authManager = { acquireToken: vi.fn() };
    registerRecipeTools(server, {
      redis,
      graphClient: graphClient as never,
      authManager: authManager as never,
      readOnly: false,
      orgMode: true,
    });
    await saveRecipe(TENANT_A, {
      name: 'morning inbox',
      alias: 'me.messages.ListMessages',
      params: { top: 10, select: 'subject' },
    });

    const events = await collectRecipePublishEvents(redis, async () => {
      const result = await requestContext.run({ tenantId: TENANT_A }, () =>
        callTool(server, 'run-recipe', {
          name: 'morning inbox',
          paramOverrides: { top: 25 },
        })
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual({ dispatched: true });
    });

    expect(executeToolAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'me.messages.ListMessages',
        parameters: { top: 25, select: 'subject' },
        graphClient,
        authManager,
        readOnly: false,
        orgMode: true,
      })
    );
    await expect(getRecipeByName(TENANT_A, 'morning inbox')).resolves.toMatchObject({
      lastRunAt: expect.any(String),
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'resources/updated',
        uris: expect.arrayContaining([
          `m365://tenant/${TENANT_A}/recipes.json`,
          `mcp://tenant/${TENANT_A}/recipes.json`,
        ]),
      })
    );
  });

  it('run-recipe returns an MCP error envelope for an unknown tenant-owned recipe', async () => {
    const executeToolAlias = vi.fn();
    const { registerRecipeTools, requestContext } = await loadRecipeTools(pool, executeToolAlias);
    registerRecipeTools(server, { redis, graphClient: {} as never });
    await saveRecipe(TENANT_B, {
      name: 'shared name',
      alias: 'me.sendMail',
      params: { subject: 'tenant B' },
    });

    const result = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'run-recipe', { name: 'shared name' })
    );

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({ error: 'recipe_not_found' });
    expect(result.content[0].text).not.toContain(TENANT_B);
    expect(executeToolAlias).not.toHaveBeenCalled();
  });
});

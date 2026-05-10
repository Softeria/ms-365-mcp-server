/**
 * Phase 7 Plan 07-05 - fact memory service contract.
 *
 * Facts are tenant-owned durable notes. These tests pin the default
 * Postgres full-text recall path and the optional pgvector gate without
 * requiring the vector extension in unit tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { __setPoolForTesting } from '../../../src/lib/postgres.js';
import {
  __resetFactPgvectorAvailabilityForTesting,
  forgetFact,
  isPgvectorRecallEnabled,
  listFactsForAdmin,
  recallFacts,
  recordFact,
} from '../../../src/lib/memory/facts.js';
import { requestContext } from '../../../src/request-context.js';
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

function makeQuerySpy(rows: unknown[] = []) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const pool = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return { rows };
    }),
  };
  return { pool: pool as unknown as Pool, queries };
}

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface HttpResult {
  status: number;
  body: unknown;
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

async function loadFactTools(): Promise<{
  registerFactTools: typeof import('../../../src/lib/memory/fact-tools.js').registerFactTools;
}> {
  const module = await import('../../../src/lib/memory/fact-tools.js');
  return { registerFactTools: module.registerFactTools };
}

async function collectFactEvents(
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

async function startFactAdminServer(
  redis: MemoryRedisFacade,
  tenantScoped: string | null = null
): Promise<{ url: string; close: () => Promise<void> }> {
  const { createMemoryFactRoutes } = await import('../../../src/lib/admin/memory-facts.js');
  const app = express();
  app.use(express.json() as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (
      req as unknown as {
        admin?: { actor: string; source: 'entra'; tenantScoped: string | null };
      }
    ).admin = { actor: 'admin@example.com', source: 'entra', tenantScoped };
    (req as express.Request & { id?: string }).id = 'req-fact-admin';
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

describe('Phase 7 Plan 07-05 Task 1 - fact service', () => {
  let pool: Pool;
  const originalPgvectorEnv = process.env.MS365_MCP_PGVECTOR_ENABLED;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
    __resetFactPgvectorAvailabilityForTesting();
    delete process.env.MS365_MCP_PGVECTOR_ENABLED;
  });

  afterEach(async () => {
    process.env.MS365_MCP_PGVECTOR_ENABLED = originalPgvectorEnv;
    __resetFactPgvectorAvailabilityForTesting();
    __setPoolForTesting(null);
    await pool.end();
  });

  it('recordFact inserts a fact row for the caller tenant', async () => {
    const fact = await recordFact(TENANT_A, {
      scope: 'mailbox',
      content: 'Use concise executive summaries for weekly inbox triage.',
    });

    expect(fact).toMatchObject({
      scope: 'mailbox',
      content: 'Use concise executive summaries for weekly inbox triage.',
    });

    const { rows } = await pool.query(
      `SELECT tenant_id, scope, content FROM tenant_facts WHERE tenant_id = $1`,
      [TENANT_A]
    );
    expect(rows).toEqual([
      {
        tenant_id: TENANT_A,
        scope: 'mailbox',
        content: 'Use concise executive summaries for weekly inbox triage.',
      },
    ]);
  });

  it('recallFacts filters by tenant and scope, then ranks by Postgres full-text when query is present', async () => {
    const { pool: spyPool, queries } = makeQuerySpy([
      {
        id: crypto.randomUUID(),
        scope: 'mailbox',
        content: 'Weekly inbox triage prefers concise executive summaries.',
        created_at: new Date('2026-04-25T10:00:00Z'),
        updated_at: new Date('2026-04-25T10:00:00Z'),
        score: 0.75,
      },
    ]);
    __setPoolForTesting(spyPool);

    const recalled = await recallFacts(TENANT_A, {
      scope: 'mailbox',
      query: 'weekly summaries',
      limit: 3,
    });

    expect(recalled).toHaveLength(1);
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain('WHERE tenant_id = $1');
    expect(queries[0].sql).toContain('AND scope = $2');
    expect(queries[0].sql).toMatch(
      /ts_rank_cd\(content_tsv,\s*plainto_tsquery\('english', \$3\)\) AS score/
    );
    expect(queries[0].sql).toMatch(
      /ORDER BY ts_rank_cd\(content_tsv,\s*plainto_tsquery\('english', \$3\)\) DESC,\s*updated_at DESC/
    );
    expect(queries[0].params).toEqual([TENANT_A, 'mailbox', 'weekly summaries', 3]);
  });

  it('recallFacts with no query orders by updated_at DESC', async () => {
    const { pool: spyPool, queries } = makeQuerySpy([]);
    __setPoolForTesting(spyPool);

    await recallFacts(TENANT_A, { limit: 500 });

    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain('WHERE tenant_id = $1');
    expect(queries[0].sql).toMatch(/ORDER BY updated_at DESC,\s*created_at DESC/);
    expect(queries[0].params).toEqual([TENANT_A, 50]);
  });

  it('forgetFact deletes only when the id belongs to that tenant', async () => {
    const factA = await recordFact(TENANT_A, {
      scope: 'preferences',
      content: 'Tenant A prefers short messages.',
    });
    await recordFact(TENANT_B, {
      scope: 'preferences',
      content: 'Tenant B prefers detailed messages.',
    });

    await expect(forgetFact(TENANT_B, factA.id)).resolves.toEqual({ deleted: false });
    await expect(forgetFact(TENANT_A, factA.id)).resolves.toEqual({ deleted: true });

    const { rows } = await pool.query(
      `SELECT tenant_id, content FROM tenant_facts ORDER BY tenant_id`
    );
    expect(rows).toEqual([
      {
        tenant_id: TENANT_B,
        content: 'Tenant B prefers detailed messages.',
      },
    ]);
  });

  it('listFactsForAdmin cursor follows updated_at DESC, id DESC ordering', async () => {
    await pool.query(
      `INSERT INTO tenant_facts (id, tenant_id, scope, content, created_at, updated_at)
       VALUES
         ($1, $4, 'preferences', 'newest low id', $7, $7),
         ($2, $4, 'preferences', 'older high id', $6, $6),
         ($3, $4, 'preferences', 'oldest middle id', $5, $5)`,
      [
        '00000000-0000-4000-8000-000000000001',
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
        '11111111-1111-4111-8111-111111111112',
        TENANT_A,
        new Date('2026-04-25T10:00:00Z'),
        new Date('2026-04-25T11:00:00Z'),
        new Date('2026-04-25T12:00:00Z'),
      ]
    );

    const page1 = await listFactsForAdmin(TENANT_A, { limit: 1 });
    expect(page1.facts.map((fact) => fact.content)).toEqual(['newest low id']);
    expect(page1.nextCursor).toEqual(expect.any(String));

    const page2 = await listFactsForAdmin(TENANT_A, { limit: 1, cursor: page1.nextCursor! });
    expect(page2.facts.map((fact) => fact.content)).toEqual(['older high id']);
    expect(page2.nextCursor).toEqual(expect.any(String));

    const page3 = await listFactsForAdmin(TENANT_A, { limit: 1, cursor: page2.nextCursor! });
    expect(page3.facts.map((fact) => fact.content)).toEqual(['oldest middle id']);
    expect(page3.nextCursor).toBeNull();
  });

  it('pgvector recall is not selected unless env, query embedding, and schema availability all pass', async () => {
    const vectorRows = [
      {
        id: crypto.randomUUID(),
        scope: 'preferences',
        content: 'Prefer concise summaries.',
        created_at: new Date('2026-04-25T10:00:00Z'),
        updated_at: new Date('2026-04-25T10:00:00Z'),
        score: 0.91,
      },
    ];
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const poolWithGate = {
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        if (sql.includes('pg_available_extensions')) {
          return { rows: [{ extension_available: true, column_available: true }] };
        }
        return { rows: vectorRows };
      }),
    } as unknown as Pool;

    __setPoolForTesting(poolWithGate);
    expect(await isPgvectorRecallEnabled([0.1, 0.2])).toBe(false);
    await recallFacts(TENANT_A, {
      query: 'concise summaries',
      queryEmbedding: [0.1, 0.2],
    });
    expect(queries.at(-1)?.sql).not.toContain('<=>');

    process.env.MS365_MCP_PGVECTOR_ENABLED = '1';
    __resetFactPgvectorAvailabilityForTesting();
    await expect(isPgvectorRecallEnabled()).resolves.toBe(false);
    await recallFacts(TENANT_A, { query: 'concise summaries' });
    expect(queries.at(-1)?.sql).not.toContain('<=>');

    __resetFactPgvectorAvailabilityForTesting();
    await expect(isPgvectorRecallEnabled([0.1, 0.2])).resolves.toBe(true);
    await recallFacts(TENANT_A, {
      query: 'concise summaries',
      queryEmbedding: [0.1, 0.2],
    });

    expect(queries.some((query) => query.sql.includes('pg_available_extensions'))).toBe(true);
    expect(queries.at(-1)?.sql).toContain('embedding <=>');
    expect(queries.at(-1)?.params).toContain('[0.1,0.2]');
  });
});

describe('Phase 7 Plan 07-05 Task 2 - fact MCP tools', () => {
  let pool: Pool;
  let redis: MemoryRedisFacade;
  let server: McpServer;
  const originalPgvectorEnv = process.env.MS365_MCP_PGVECTOR_ENABLED;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
    __resetFactPgvectorAvailabilityForTesting();
    delete process.env.MS365_MCP_PGVECTOR_ENABLED;
    redis = new MemoryRedisFacade();
    server = new McpServer({ name: 'fact-test', version: '0.0.0' });
  });

  afterEach(async () => {
    process.env.MS365_MCP_PGVECTOR_ENABLED = originalPgvectorEnv;
    __resetFactPgvectorAvailabilityForTesting();
    __setPoolForTesting(null);
    await redis.quit();
    await pool.end();
  });

  it('record-fact requires scope and fact, and fails closed without tenant context', async () => {
    const { registerFactTools } = await loadFactTools();
    registerFactTools(server, { redis });

    const missingFact = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'record-fact', { scope: 'mailbox' })
    );
    expect(missingFact.isError).toBe(true);
    expect(JSON.parse(missingFact.content[0].text)).toMatchObject({ error: 'invalid_fact' });

    const noTenant = await callTool(server, 'record-fact', {
      scope: 'mailbox',
      fact: 'Tenant prefers concise summaries.',
    });
    expect(noTenant.isError).toBe(true);
    expect(JSON.parse(noTenant.content[0].text)).toMatchObject({ error: 'tenant_required' });
  });

  it('record-fact stores caller tenant content and publishes facts.json update', async () => {
    const { registerFactTools } = await loadFactTools();
    registerFactTools(server, { redis });

    const events = await collectFactEvents(redis, async () => {
      const result = await requestContext.run({ tenantId: TENANT_A }, () =>
        callTool(server, 'record-fact', {
          scope: 'mailbox',
          fact: 'Tenant prefers concise weekly inbox summaries.',
        })
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        scope: 'mailbox',
        content: 'Tenant prefers concise weekly inbox summaries.',
      });
    });

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'resources/updated',
        uris: expect.arrayContaining([
          `m365://tenant/${TENANT_A}/facts.json`,
          `mcp://tenant/${TENANT_A}/facts.json`,
        ]),
      })
    );
  });

  it('recall-facts accepts optional scope, query, and limit', async () => {
    const { pool: spyPool, queries } = makeQuerySpy([
      {
        id: crypto.randomUUID(),
        scope: 'mailbox',
        content: 'Tenant prefers concise summaries.',
        created_at: new Date('2026-04-25T10:00:00Z'),
        updated_at: new Date('2026-04-25T10:00:00Z'),
        score: 0.5,
      },
    ]);
    __setPoolForTesting(spyPool);

    const { registerFactTools } = await loadFactTools();
    registerFactTools(server, { redis });

    const result = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'recall-facts', {
        scope: 'mailbox',
        query: 'concise summaries',
        limit: 2,
      })
    );

    expect(result.isError).toBeFalsy();
    expect(queries[0].params).toEqual([TENANT_A, 'mailbox', 'concise summaries', 2]);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      facts: [{ scope: 'mailbox', content: 'Tenant prefers concise summaries.' }],
    });
  });

  it('forget-fact requires id and returns { deleted: boolean } with facts.json update on delete', async () => {
    const { registerFactTools } = await loadFactTools();
    registerFactTools(server, { redis });
    const fact = await recordFact(TENANT_A, {
      scope: 'preferences',
      content: 'Tenant prefers short replies.',
    });

    const missingId = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'forget-fact', {})
    );
    expect(missingId.isError).toBe(true);
    expect(JSON.parse(missingId.content[0].text)).toMatchObject({ error: 'invalid_forget_fact' });

    const events = await collectFactEvents(redis, async () => {
      const result = await requestContext.run({ tenantId: TENANT_A }, () =>
        callTool(server, 'forget-fact', { id: fact.id })
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toEqual({ deleted: true });
    });

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'resources/updated',
        uris: expect.arrayContaining([
          `m365://tenant/${TENANT_A}/facts.json`,
          `mcp://tenant/${TENANT_A}/facts.json`,
        ]),
      })
    );
  });
});

describe('Phase 7 Plan 07-05 Task 2 - admin fact subrouter', () => {
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

  it('GET /:id/facts lists only route tenant rows with optional scope and limit', async () => {
    await recordFact(TENANT_A, {
      scope: 'mailbox',
      content: 'Tenant A mailbox preference.',
    });
    await recordFact(TENANT_A, {
      scope: 'calendar',
      content: 'Tenant A calendar preference.',
    });
    await recordFact(TENANT_B, {
      scope: 'mailbox',
      content: 'Tenant B mailbox preference.',
    });
    const { url, close } = await startFactAdminServer(redis);
    try {
      const result = await doJson(
        'GET',
        `${url}/admin/tenants/${TENANT_A}/facts?scope=mailbox&limit=1`
      );

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        facts: [
          {
            scope: 'mailbox',
            content: 'Tenant A mailbox preference.',
          },
        ],
      });
      expect(JSON.stringify(result.body)).not.toContain('Tenant B');
    } finally {
      await close();
    }
  });

  it('DELETE /:id/facts/:factId returns 404 when the row is not owned by the route tenant', async () => {
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

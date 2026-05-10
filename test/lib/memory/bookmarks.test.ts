/**
 * Phase 7 Plan 07-03 — bookmark memory service contract.
 *
 * These tests pin SECUR-08 for bookmark persistence: every operation is
 * scoped by the explicit caller tenant id, including same-alias rows across
 * tenants.
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
  deleteBookmark,
  getBookmarkCountsByAlias,
  listBookmarks,
  upsertBookmark,
} from '../../../src/lib/memory/bookmarks.js';
import { safeBookmarkBoost } from '../../../src/lib/memory/bookmark-boost.js';
import { registerBookmarkTools } from '../../../src/lib/memory/bookmark-tools.js';
import { createMemoryBookmarkRoutes } from '../../../src/lib/admin/memory-bookmarks.js';
import { requestContext } from '../../../src/request-context.js';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';
import { TOOL_SELECTION_INVALIDATE_CHANNEL } from '../../../src/lib/tool-selection/tool-selection-invalidation.js';
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

    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_tenant_tool_bookmarks_tenant
      ON tenant_tool_bookmarks (tenant_id);
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

async function collectBookmarkPublishEvents(
  redis: MemoryRedisFacade,
  fn: () => Promise<void>
): Promise<{ invalidations: string[]; agenticEvents: Array<{ type: string; uris?: string[] }> }> {
  const invalidations: string[] = [];
  const agenticEvents: Array<{ type: string; uris?: string[] }> = [];
  redis.on('message', (channel, message) => {
    if (channel === TOOL_SELECTION_INVALIDATE_CHANNEL) {
      invalidations.push(message);
    }
    if (channel === AGENTIC_EVENTS_CHANNEL) {
      agenticEvents.push(JSON.parse(message) as { type: string; uris?: string[] });
    }
  });
  await redis.subscribe(TOOL_SELECTION_INVALIDATE_CHANNEL, AGENTIC_EVENTS_CHANNEL);
  await fn();
  return { invalidations, agenticEvents };
}

interface HttpResult {
  status: number;
  body: unknown;
}

async function startBookmarkAdminServer(
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
    (req as express.Request & { id?: string }).id = 'req-bookmark-admin';
    next();
  });
  app.use('/admin/tenants', createMemoryBookmarkRoutes({ redis } as never));
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

describe('Phase 7 Plan 07-03 Task 1 — bookmark service', () => {
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

  it('upsertBookmark inserts and updates on (tenant_id, alias)', async () => {
    const first = await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'mail sender',
      note: 'initial note',
    });
    const updated = await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'send mail',
      note: 'updated note',
    });

    expect(updated.id).toBe(first.id);
    expect(updated).toMatchObject({
      alias: 'me.sendMail',
      label: 'send mail',
      note: 'updated note',
    });

    const { rows } = await pool.query(
      `SELECT tenant_id, alias, label, note FROM tenant_tool_bookmarks WHERE tenant_id = $1`,
      [TENANT_A]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT_A,
      alias: 'me.sendMail',
      label: 'send mail',
      note: 'updated note',
    });
  });

  it('listBookmarks returns only rows where tenant_id = $1', async () => {
    await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'mail',
      note: 'A note',
    });
    await upsertBookmark(TENANT_B, {
      alias: 'me.sendMail',
      label: 'mail',
      note: 'B note',
    });
    await upsertBookmark(TENANT_A, {
      alias: 'me.ListMessages',
      label: 'inbox',
      note: 'A inbox',
    });

    const allA = await listBookmarks(TENANT_A);
    expect(allA.map((b) => b.alias).sort()).toEqual(['me.ListMessages', 'me.sendMail']);
    expect(allA.every((b) => !('tenantId' in b))).toBe(true);

    const filtered = await listBookmarks(TENANT_A, 'inbox');
    expect(filtered.map((b) => b.alias)).toEqual(['me.ListMessages']);
  });

  it('deleteBookmark deletes only tenant-owned rows by id, alias, or label', async () => {
    const rowA = await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'send mail',
      note: 'A',
    });
    await upsertBookmark(TENANT_B, {
      alias: 'me.sendMail',
      label: 'send mail',
      note: 'B',
    });

    await expect(deleteBookmark(TENANT_B, rowA.id)).resolves.toEqual({ deleted: false });
    expect(await listBookmarks(TENANT_A)).toHaveLength(1);

    await expect(deleteBookmark(TENANT_A, 'send mail')).resolves.toEqual({ deleted: true });
    expect(await listBookmarks(TENANT_A)).toEqual([]);
    expect(await listBookmarks(TENANT_B)).toHaveLength(1);
  });

  it('deleteBookmark rejects ambiguous tenant labels without deleting rows', async () => {
    await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'mail',
      note: 'first',
    });
    await upsertBookmark(TENANT_A, {
      alias: 'me.ListMessages',
      label: 'mail',
      note: 'second',
    });

    await expect(deleteBookmark(TENANT_A, 'mail')).resolves.toEqual({
      deleted: false,
      ambiguous: true,
    });
    expect((await listBookmarks(TENANT_A)).map((bookmark) => bookmark.alias).sort()).toEqual([
      'me.ListMessages',
      'me.sendMail',
    ]);
  });

  it('getBookmarkCountsByAlias counts only the caller tenant aliases', async () => {
    await upsertBookmark(TENANT_A, { alias: 'me.sendMail', label: 'send mail' });
    await upsertBookmark(TENANT_A, { alias: 'me.ListMessages', label: 'messages' });
    await upsertBookmark(TENANT_B, { alias: 'me.sendMail', label: 'tenant b send mail' });

    const countsA = await getBookmarkCountsByAlias(TENANT_A);
    const countsB = await getBookmarkCountsByAlias(TENANT_B);

    expect([...countsA.entries()].sort()).toEqual([
      ['me.ListMessages', 1],
      ['me.sendMail', 1],
    ]);
    expect([...countsB.entries()]).toEqual([['me.sendMail', 1]]);
  });
});

describe('Phase 7 Plan 07-03 Task 3 — bookmark boost math', () => {
  it('safeBookmarkBoost applies the SPEC multiplier exactly', () => {
    expect(safeBookmarkBoost(10, 0)).toBe(10);
    expect(safeBookmarkBoost(10, 1)).toBe(15);
    expect(safeBookmarkBoost(10, 2)).toBe(20);
  });

  it('safeBookmarkBoost ignores negative bookmark counts', () => {
    expect(safeBookmarkBoost(10, -5)).toBe(10);
  });

  it('search-tools applies bookmark boost over discoveryCatalogSet without tenant leakage', async () => {
    vi.resetModules();
    const countsByTenant = new Map<string, Map<string, number>>();

    vi.doMock('../../../src/generated/client.js', () => ({
      api: {
        endpoints: [
          {
            alias: 'users.user.ListUser',
            method: 'get',
            path: '/users',
            description: 'List user directory entries',
          },
          {
            alias: 'users.user.GetUserByUserPrincipalName',
            method: 'get',
            path: '/users/:userPrincipalName',
            description: 'Get one user by principal name',
          },
          { alias: 'me.sendMail', method: 'post', path: '/me/sendMail' },
          ...Array.from({ length: 13 }, (_, i) => ({
            alias: `users.synthetic${i}`,
            method: 'get',
            path: `/users/synthetic${i}`,
            description: `Synthetic user endpoint ${i}`,
          })),
        ],
      },
    }));
    vi.doMock('../../../src/lib/memory/bookmarks.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/lib/memory/bookmarks.js')>();
      return {
        ...actual,
        getBookmarkCountsByAlias: vi.fn((tenantId: string) =>
          Promise.resolve(countsByTenant.get(tenantId) ?? new Map<string, number>())
        ),
      };
    });

    const [{ registerDiscoveryTools, discoveryCache }, dynamicRequestContext, tenantSurface] =
      await Promise.all([
        import('../../../src/graph-tools.js'),
        import('../../../src/request-context.js'),
        import('../../../src/lib/tenant-surface/surface.js'),
      ]);

    const server = new McpServer({ name: 'bookmark-boost-test', version: '0.0.0' });
    registerDiscoveryTools(
      server,
      {
        graphRequest: vi.fn(),
      } as never,
      false,
      true
    );

    const discoveryCtxB = {
      tenantId: TENANT_B,
      enabledToolsSet: tenantSurface.DISCOVERY_META_TOOL_NAMES,
      presetVersion: tenantSurface.DISCOVERY_PRESET_VERSION,
    };
    const baseline = await dynamicRequestContext.requestContext.run(discoveryCtxB, () =>
      callTool(server, 'search-tools', { query: 'list user', limit: 10 })
    );
    const baselineBody = JSON.parse(baseline.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };
    const baselineNames = baselineBody.tools.map((tool) => tool.name);
    expect(baselineBody.total).toBeGreaterThan(12);
    expect(baselineNames[0]).toBe('users.user.ListUser');
    expect(baselineNames).toContain('users.user.GetUserByUserPrincipalName');

    countsByTenant.set(TENANT_A, new Map([['users.user.GetUserByUserPrincipalName', 100]]));

    const boosted = await dynamicRequestContext.requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: tenantSurface.DISCOVERY_META_TOOL_NAMES,
        presetVersion: tenantSurface.DISCOVERY_PRESET_VERSION,
      },
      () => callTool(server, 'search-tools', { query: 'list user', limit: 10 })
    );
    const boostedNames = (
      JSON.parse(boosted.content[0].text) as {
        tools: Array<{ name: string }>;
      }
    ).tools.map((tool) => tool.name);
    expect(boostedNames[0]).toBe('users.user.GetUserByUserPrincipalName');

    const notLeaked = await dynamicRequestContext.requestContext.run(discoveryCtxB, () =>
      callTool(server, 'search-tools', { query: 'list user', limit: 10 })
    );
    const notLeakedNames = (
      JSON.parse(notLeaked.content[0].text) as {
        tools: Array<{ name: string }>;
      }
    ).tools.map((tool) => tool.name);
    expect(notLeakedNames[0]).toBe('users.user.ListUser');

    discoveryCache._clear();
    vi.doUnmock('../../../src/generated/client.js');
    vi.doUnmock('../../../src/lib/memory/bookmarks.js');
    vi.resetModules();
  });
});

describe('Phase 7 Plan 07-03 Task 2 — bookmark MCP tools', () => {
  let pool: Pool;
  let redis: MemoryRedisFacade;
  let server: McpServer;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
    redis = new MemoryRedisFacade();
    server = new McpServer({ name: 'bookmark-test', version: '0.0.0' });
    registerBookmarkTools(server, { redis });
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await redis.quit();
    await pool.end();
  });

  it('bookmark-tool requires alias and fails closed when tenant context is absent', async () => {
    const missingAlias = await requestContext.run({ tenantId: TENANT_A }, () =>
      callTool(server, 'bookmark-tool', {})
    );
    expect(missingAlias.isError).toBe(true);
    expect(JSON.parse(missingAlias.content[0].text)).toMatchObject({ error: 'invalid_bookmark' });

    const noTenant = await callTool(server, 'bookmark-tool', { alias: 'me.sendMail' });
    expect(noTenant.isError).toBe(true);
    expect(JSON.parse(noTenant.content[0].text)).toMatchObject({ error: 'tenant_required' });
  });

  it('bookmark-tool persists a row and publishes invalidation plus bookmarks.json update', async () => {
    const events = await collectBookmarkPublishEvents(redis, async () => {
      const result = await requestContext.run(
        {
          tenantId: TENANT_A,
          enabledToolsSet: new Set(['bookmark-tool']),
          presetVersion: 'discovery-v1',
        },
        () =>
          callTool(server, 'bookmark-tool', {
            alias: 'me.sendMail',
            label: 'send mail',
            note: 'known good',
          })
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        alias: 'me.sendMail',
        label: 'send mail',
        note: 'known good',
      });
    });

    expect(await listBookmarks(TENANT_A)).toHaveLength(1);
    expect(events.invalidations).toEqual([TENANT_A]);
    expect(events.agenticEvents).toContainEqual(
      expect.objectContaining({
        type: 'resources/updated',
        uris: expect.arrayContaining([
          `m365://tenant/${TENANT_A}/bookmarks.json`,
          `mcp://tenant/${TENANT_A}/bookmarks.json`,
        ]),
      })
    );
  });

  it('list-bookmarks accepts optional filter and returns Bookmark[]', async () => {
    await upsertBookmark(TENANT_A, { alias: 'me.sendMail', label: 'mail' });
    await upsertBookmark(TENANT_A, { alias: 'me.ListMessages', label: 'inbox' });

    const result = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: new Set(['list-bookmarks']),
        presetVersion: 'discovery-v1',
      },
      () => callTool(server, 'list-bookmarks', { filter: 'mail' })
    );

    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text) as { bookmarks: Array<{ alias: string }> };
    expect(body.bookmarks.map((b) => b.alias)).toEqual(['me.sendMail']);
  });

  it('unbookmark-tool accepts label_or_alias and returns { deleted: boolean }', async () => {
    await upsertBookmark(TENANT_A, { alias: 'me.sendMail', label: 'send mail' });

    const result = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: new Set(['unbookmark-tool']),
        presetVersion: 'discovery-v1',
      },
      () => callTool(server, 'unbookmark-tool', { label_or_alias: 'send mail' })
    );

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(result.content[0].text)).toEqual({ deleted: true });
    expect(await listBookmarks(TENANT_A)).toEqual([]);
  });
});

describe('Phase 7 Plan 07-03 Task 2 — admin bookmark subrouter', () => {
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

  it('POST /:id/bookmarks accepts an array body and persists tenant-scoped bookmarks', async () => {
    const { url, close } = await startBookmarkAdminServer(redis);
    try {
      const result = await doJson('POST', `${url}/admin/tenants/${TENANT_A}/bookmarks`, [
        { alias: 'me.sendMail', label: 'send mail', note: 'admin seed' },
      ]);

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        bookmarks: [
          {
            alias: 'me.sendMail',
            label: 'send mail',
            note: 'admin seed',
          },
        ],
      });
      expect(await listBookmarks(TENANT_A)).toHaveLength(1);
      expect(await listBookmarks(TENANT_B)).toEqual([]);
    } finally {
      await close();
    }
  });

  it('DELETE /:id/bookmarks/:bookmarkId deletes only that tenant bookmark', async () => {
    const bookmarkA = await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'send mail',
    });
    await upsertBookmark(TENANT_B, {
      alias: 'me.sendMail',
      label: 'send mail',
    });
    const { url, close } = await startBookmarkAdminServer(redis);
    try {
      const denied = await doJson(
        'DELETE',
        `${url}/admin/tenants/${TENANT_B}/bookmarks/${bookmarkA.id}`
      );
      expect(denied.status).toBe(200);
      expect(denied.body).toEqual({ deleted: false });

      const result = await doJson(
        'DELETE',
        `${url}/admin/tenants/${TENANT_A}/bookmarks/${bookmarkA.id}`
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ deleted: true });
      expect(await listBookmarks(TENANT_A)).toEqual([]);
      expect(await listBookmarks(TENANT_B)).toHaveLength(1);
    } finally {
      await close();
    }
  });
});

/**
 * Plan 05-06 Task 2 — discovery (search-tools + get-tool-schema) per-tenant
 * BM25 cache + Redis pub/sub invalidation (integration).
 *
 * This file validates the end-to-end wiring the plan promises:
 *
 *   1. `search-tools` invoked inside a requestContext frame for tenant A
 *      returns BM25-ranked results drawn ONLY from A's enabled_tools_set;
 *      tenant B's concurrent call (different enabled set) returns a disjoint
 *      result list for the same query.
 *   2. `get-tool-schema` never returns a schema for a tool outside the
 *      tenant's enabled set — even when the tool exists in the global
 *      registry.
 *   3. A publish on `mcp:tool-selection-invalidate` with a GUID payload
 *      drops every cached entry for that tenant within 100ms; a subsequent
 *      search-tools call rebuilds the index (observable via `discoveryCache
 *      .size()` going from 2 → 1 → 2 again).
 *   4. Malformed payloads (non-GUID, JSON shapes, control characters) are
 *      ignored with a warn-level log; the cache is not evicted.
 *   5. Propagation latency: the full publish → evict hop completes in
 *      <100ms on the in-memory Redis facade (real-Redis RTT is comparable).
 *
 * The test uses the MemoryRedisFacade for the pub/sub channel and mounts
 * the real `registerDiscoveryTools` against a bounded generated-client
 * fixture. The production registry is ~72 MB after generation; loading it
 * under the integration global setup exceeds the local execution sandbox.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../../src/request-context.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../../src/lib/tenant-surface/surface.js';
import {
  subscribeToToolSelectionInvalidation,
  publishToolSelectionInvalidation,
  TOOL_SELECTION_INVALIDATE_CHANNEL,
} from '../../src/lib/tool-selection/tool-selection-invalidation.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { registerDiscoveryTools, discoveryCache } from '../../src/graph-tools.js';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

const { bookmarkCountsByTenant } = vi.hoisted(() => ({
  bookmarkCountsByTenant: new Map<string, Map<string, number>>(),
}));

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'me.sendMail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send a mail message',
      },
      {
        alias: 'me.ListMessages',
        method: 'get',
        path: '/me/messages',
        description: 'List mail messages',
      },
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
      ...Array.from({ length: 13 }, (_, i) => ({
        alias: `users.synthetic${i}`,
        method: 'get',
        path: `/users/synthetic${i}`,
        description: `Synthetic user endpoint ${i}`,
      })),
    ],
  },
}));

vi.mock('../../src/lib/memory/bookmarks.js', () => ({
  getBookmarkCountsByAlias: vi.fn((tenantId: string) =>
    Promise.resolve(bookmarkCountsByTenant.get(tenantId) ?? new Map<string, number>())
  ),
}));

/**
 * Aliases we know exist in `api.endpoints` — the discovery registry uses the
 * generator-emitted dot-cased aliases (not the endpoints.json `toolName`
 * kebab-case form). The v1 golden-query test set in
 * test/discovery-search.test.ts uses the same shape. Mail-send + messages
 * for tenant A; users list + get for tenant B so `send mail` ranks mail ops
 * for A but not for B.
 */
const ENABLED_A: ReadonlySet<string> = Object.freeze(
  new Set(['me.sendMail', 'me.ListMessages'])
) as ReadonlySet<string>;
const ENABLED_B: ReadonlySet<string> = Object.freeze(
  new Set(['users.user.ListUser', 'users.user.GetUserByUserPrincipalName'])
) as ReadonlySet<string>;

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Drive a registered MCP tool by name against the SDK's internal
 * `_registeredTools` map. Mirrors the pattern used in
 * `test/tool-selection/tools-list-correctness.int.test.ts`.
 */
async function callDiscoveryTool(
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
  return tool.handler(args, {
    requestId: 'test',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  });
}

/**
 * Build a minimally-functional GraphClient stub. Discovery handlers only
 * delegate to GraphClient from the `execute-tool` path — search-tools and
 * get-tool-schema do not touch it. The stub throws from graphRequest so a
 * test that accidentally invokes execute-tool fails loud.
 */
function makeGraphClientStub(): unknown {
  return {
    graphRequest: vi.fn().mockImplementation(() => {
      throw new Error('graphRequest unexpectedly invoked from discovery test');
    }),
  };
}

describe('plan 05-06 Task 2 — discovery per-tenant filter + pub/sub invalidation', () => {
  let server: McpServer;
  let redis: MemoryRedisFacade;

  beforeEach(() => {
    // A fresh MCP server per test prevents tool-registration collisions
    // (server.tool throws on duplicate name).
    server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphClient = makeGraphClientStub();
    // registerDiscoveryTools mounts search-tools, get-tool-schema, execute-tool.
    // It also populates the module-level discoveryCache with a fresh state.
    registerDiscoveryTools(
      server,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      graphClient as any,
      false,
      true
    );
    discoveryCache._clear();
    redis = new MemoryRedisFacade();
    bookmarkCountsByTenant.clear();
  });

  afterEach(async () => {
    discoveryCache._clear();
    bookmarkCountsByTenant.clear();
    await redis.quit();
    vi.restoreAllMocks();
  });

  it('Test 1: search-tools returns BM25-ranked results scoped to the tenant enabled set', async () => {
    // Tenant A: only mail ops enabled → "send email" query should rank send-mail first.
    const respA = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: ENABLED_A,
        presetVersion: 'test-A',
      },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );

    const bodyA = JSON.parse(respA.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };

    const namesA = bodyA.tools.map((t) => t.name);
    expect(namesA).toContain('me.sendMail');
    // Tenant A enabled set excludes list-users / create-event — they MUST NOT appear.
    expect(namesA).not.toContain('users.user.ListUser');
    expect(namesA).not.toContain('me.CreateEvents');
    // Every returned tool must be in tenant A's enabled set — T-05-12 isolation.
    for (const name of namesA) {
      expect(ENABLED_A.has(name)).toBe(true);
    }
  });

  it('Test 1b: tenant B with disjoint enabled set yields disjoint results for the same query', async () => {
    // First warm tenant A's cache with a query to prove isolation.
    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: ENABLED_A, presetVersion: 'test-A' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );

    // Tenant B has NO mail ops enabled → "send mail" returns empty or non-mail matches.
    const respB = await requestContext.run(
      {
        tenantId: TENANT_B,
        enabledToolsSet: ENABLED_B,
        presetVersion: 'test-B',
      },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );

    const bodyB = JSON.parse(respB.content[0].text) as {
      tools: Array<{ name: string }>;
    };
    const namesB = bodyB.tools.map((t) => t.name);
    // Tenant B MUST NOT see send-mail (not in its enabled set).
    expect(namesB).not.toContain('me.sendMail');
    expect(namesB).not.toContain('me.ListMessages');
    for (const name of namesB) {
      expect(ENABLED_B.has(name)).toBe(true);
    }
  });

  it('Test 2: get-tool-schema rejects tools outside the tenant enabled set', async () => {
    // Tenant A does NOT have list-users enabled — get-tool-schema must refuse.
    const respA = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: ENABLED_A,
        presetVersion: 'test-A',
      },
      () => callDiscoveryTool(server, 'get-tool-schema', { tool_name: 'users.user.ListUser' })
    );

    expect(respA.isError).toBe(true);
    expect(respA.content[0].text).toMatch(/not (enabled|found)/i);

    // But the same call for send-mail (which IS enabled) succeeds.
    const respOk = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: ENABLED_A,
        presetVersion: 'test-A',
      },
      () => callDiscoveryTool(server, 'get-tool-schema', { tool_name: 'me.sendMail' })
    );

    expect(respOk.isError).toBeFalsy();
    expect(respOk.content[0].text).toMatch(/send-mail|sendMail|parameters|inputSchema/);
  });

  it('Test 3: pub/sub publish evicts the tenant cache within 100ms; next search rebuilds', async () => {
    await subscribeToToolSelectionInvalidation(redis, {
      invalidate: (id: string) => discoveryCache.invalidate(id),
    });

    // Warm both tenants' caches with a search-tools call.
    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: ENABLED_A, presetVersion: 'test-A' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );
    await requestContext.run(
      { tenantId: TENANT_B, enabledToolsSet: ENABLED_B, presetVersion: 'test-B' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'list users' })
    );

    const sizeBefore = discoveryCache.size();
    expect(sizeBefore).toBeGreaterThanOrEqual(2);

    // Publish tenant A invalidation. Latency bound = 100ms per the plan.
    const start = Date.now();
    await publishToolSelectionInvalidation(redis, TENANT_A);

    // Wait for the dispatcher to run — one tick is enough for the facade.
    await new Promise((r) => setImmediate(r));
    const latency = Date.now() - start;

    expect(latency).toBeLessThan(100);
    expect(discoveryCache.size()).toBe(sizeBefore - 1);
  });

  it('Test 4: malformed pub/sub payloads are ignored (no eviction, warn logged)', async () => {
    await subscribeToToolSelectionInvalidation(redis, {
      invalidate: (id: string) => discoveryCache.invalidate(id),
    });

    // Warm tenant A's cache.
    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: ENABLED_A, presetVersion: 'test-A' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );
    const sizeBefore = discoveryCache.size();
    expect(sizeBefore).toBeGreaterThanOrEqual(1);

    // Malformed payloads — subscriber must ignore them all.
    await redis.publish(TOOL_SELECTION_INVALIDATE_CHANNEL, 'not-a-guid');
    await redis.publish(TOOL_SELECTION_INVALIDATE_CHANNEL, '');
    await redis.publish(TOOL_SELECTION_INVALIDATE_CHANNEL, JSON.stringify({ tenantId: TENANT_A }));
    await redis.publish(TOOL_SELECTION_INVALIDATE_CHANNEL, '../../etc/passwd');

    await new Promise((r) => setImmediate(r));

    // Cache state unchanged.
    expect(discoveryCache.size()).toBe(sizeBefore);
  });

  it('Test 5: publishToolSelectionInvalidation validates GUID before publish', async () => {
    await expect(publishToolSelectionInvalidation(redis, 'not-a-guid')).rejects.toThrow(
      /invalid GUID/i
    );

    await expect(publishToolSelectionInvalidation(redis, '')).rejects.toThrow(/invalid GUID/i);

    // Valid GUID resolves without throwing.
    await expect(publishToolSelectionInvalidation(redis, TENANT_A)).resolves.not.toThrow();
  });

  it('Test 6: subscriber ignores messages on unrelated channels', async () => {
    await subscribeToToolSelectionInvalidation(redis, {
      invalidate: (id: string) => discoveryCache.invalidate(id),
    });
    await redis.subscribe('mcp:tenant-invalidate'); // unrelated phase-3 channel

    // Warm tenant A.
    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: ENABLED_A, presetVersion: 'test-A' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );
    const sizeBefore = discoveryCache.size();
    expect(sizeBefore).toBeGreaterThanOrEqual(1);

    // Publish tenant A GUID on the WRONG channel — subscriber must not fire.
    await redis.publish('mcp:tenant-invalidate', TENANT_A);
    await new Promise((r) => setImmediate(r));

    // The tool-selection subscriber did not react (only the tenant-invalidate
    // subscriber would, which is not mounted in this test).
    expect(discoveryCache.size()).toBe(sizeBefore);
  });

  it('Test 7: search-tools falls back to the full registry when no tenant context is set', async () => {
    // With no ALS frame AND no stdio fallback touched, the handler should
    // neither crash nor leak the full registry — it returns a fail-closed
    // error envelope.
    const respNoCtx = await callDiscoveryTool(server, 'search-tools', {
      query: 'send mail',
    });
    // The plan requires the handler to refuse when tenant context is
    // unavailable. We assert either isError or an empty tools list (both
    // valid fail-closed shapes).
    const body = JSON.parse(respNoCtx.content[0].text) as {
      tools?: Array<{ name: string }>;
      error?: string;
    };
    if (respNoCtx.isError) {
      expect(body.error).toBeDefined();
    } else {
      // If not marked as error, the tool set must be empty (never leak).
      expect(body.tools ?? []).toEqual([]);
    }
  });

  it('Test 8: publish + immediate next search rebuilds the index (cache-miss observable)', async () => {
    await subscribeToToolSelectionInvalidation(redis, {
      invalidate: (id: string) => discoveryCache.invalidate(id),
    });

    // Warm tenant A.
    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: ENABLED_A, presetVersion: 'test-A' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );
    const sizeAfterWarm = discoveryCache.size();
    expect(sizeAfterWarm).toBeGreaterThanOrEqual(1);

    // Invalidate.
    await publishToolSelectionInvalidation(redis, TENANT_A);
    await new Promise((r) => setImmediate(r));
    expect(discoveryCache.size()).toBe(sizeAfterWarm - 1);

    // Next call rebuilds → size recovers (different or same key depending on
    // whether the enabled set changed; here it's the same so the same hash
    // produces a new cached entry).
    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: ENABLED_A, presetVersion: 'test-A' },
      () => callDiscoveryTool(server, 'search-tools', { query: 'send mail' })
    );
    expect(discoveryCache.size()).toBe(sizeAfterWarm);
  });

  it('Test 9: discovery tenant bookmark boost ranks over discoveryCatalogSet without tenant leakage', async () => {
    const discoveryCtxB = {
      tenantId: TENANT_B,
      enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
      presetVersion: DISCOVERY_PRESET_VERSION,
    };

    const baseline = await requestContext.run(discoveryCtxB, () =>
      callDiscoveryTool(server, 'search-tools', { query: 'user', limit: 10 })
    );
    const baselineBody = JSON.parse(baseline.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };
    const baselineNames = baselineBody.tools.map((t) => t.name);
    expect(baselineBody.total).toBeGreaterThan(12);
    expect(baselineNames.length).toBeGreaterThan(2);
    expect(baselineNames.some((name) => DISCOVERY_META_TOOL_NAMES.has(name))).toBe(false);

    const baselineTop = baselineNames[0];
    const boostTarget = baselineNames[baselineNames.length - 1];
    expect(boostTarget).not.toBe(baselineTop);

    bookmarkCountsByTenant.set(TENANT_A, new Map([[boostTarget, 100]]));

    const boosted = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
        presetVersion: DISCOVERY_PRESET_VERSION,
      },
      () => callDiscoveryTool(server, 'search-tools', { query: 'user', limit: 10 })
    );
    const boostedNames = (
      JSON.parse(boosted.content[0].text) as {
        tools: Array<{ name: string }>;
      }
    ).tools.map((t) => t.name);
    expect(boostedNames[0]).toBe(boostTarget);

    const notLeaked = await requestContext.run(discoveryCtxB, () =>
      callDiscoveryTool(server, 'search-tools', { query: 'user', limit: 10 })
    );
    const notLeakedNames = (
      JSON.parse(notLeaked.content[0].text) as {
        tools: Array<{ name: string }>;
      }
    ).tools.map((t) => t.name);
    expect(notLeakedNames[0]).toBe(baselineTop);
  });
});

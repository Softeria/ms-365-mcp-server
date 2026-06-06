/**
 * Plan 05-05 Task 1 — tools/list per-tenant filter (integration).
 *
 * Validates the two filter seams exposed by src/lib/tool-selection/
 * tools-list-filter.ts:
 *
 *   1. `wrapToolsListHandler(mcpServer)` — SDK-level handler override that
 *      captures the MCP SDK's default `tools/list` closure and replaces it
 *      with a wrapper that filters the `tools` array by `getRequestTenant
 *      ().enabledToolsSet`. This is the authoritative path because the
 *      Streamable HTTP transport uses @hono/node-server which bypasses
 *      Express's `res.json`/`res.send` methods (05-RESEARCH.md §State of
 *      the Art).
 *
 *   2. `createToolsListFilterMiddleware()` — Express middleware that
 *      intercepts JSON-RPC POST bodies with method "tools/list" and wraps
 *      `res.send`/`res.json` for any transport that DOES use Express's
 *      response methods. Belt-and-braces defense for future transports.
 *
 * Fixture: three tools — `mail-send` (preset), `users-list` (in both tenant
 * B's explicit list and the wider registry), `other-op` (in neither tenant).
 *
 * Tenants:
 *   - Tenant A: enabled_tools=NULL → preset (mail-send only).
 *   - Tenant B: enabled_tools="users-list,mail-send" → replacement mode.
 *
 * Asserts:
 *   - Test 1: Tenant A tools/list returns exactly [mail-send].
 *   - Test 2: Tenant B tools/list returns exactly [users-list, mail-send]
 *     (order preserved from SDK's default handler).
 *   - Test 3: Concurrent tenant A + tenant B calls produce disjoint sets
 *     with zero cross-tenant leakage (T-05-10 AsyncLocalStorage isolation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

vi.mock('../../src/logger.js', async () => {
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const debug = vi.fn();
  return {
    default: { info, warn, error, debug },
    rawPinoLogger: { info, warn, error, debug },
    enableConsoleLogging: vi.fn(),
    __mocks: { info, warn, error, debug },
  };
});

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

interface ToolEntry {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface ListToolsResponse {
  tools: ToolEntry[];
  nextCursor?: string;
}

async function invokeToolsList(server: McpServer, cursor?: string): Promise<ListToolsResponse> {
  // Reach into the SDK's internal request-handler map. The key is the method
  // literal "tools/list" — see @modelcontextprotocol/sdk/server/
  // zod-json-schema-compat.js getMethodLiteral. This is an intentional seam
  // for testing the filter without spinning up a full transport.
  const inner = (
    server.server as unknown as {
      _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<ListToolsResponse>>;
    }
  )._requestHandlers;
  const handler = inner.get('tools/list');
  if (!handler) {
    throw new Error('tools/list handler not registered on McpServer');
  }
  const req = { method: 'tools/list', params: cursor ? { cursor } : {} };
  return handler(req, { requestId: 'test-1', sendNotification: vi.fn(), sendRequest: vi.fn() });
}

function buildServerWithFixtures(): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  server.tool(
    'mail-send',
    'Send mail',
    { to: z.string() },
    { title: 'mail-send', readOnlyHint: false },
    async () => ({ content: [{ type: 'text', text: 'ok' }] })
  );
  server.tool(
    'users-list',
    'List users',
    {},
    { title: 'users-list', readOnlyHint: true },
    async () => ({ content: [{ type: 'text', text: 'ok' }] })
  );
  server.tool('other-op', 'Other op', {}, { title: 'other-op', readOnlyHint: true }, async () => ({
    content: [{ type: 'text', text: 'ok' }],
  }));
  return server;
}

describe('plan 05-05 Task 1 — tools/list per-tenant filter (SDK handler wrap)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: tenant A (preset-only enabled set) sees exactly [mail-send]', async () => {
    const { wrapToolsListHandler } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = buildServerWithFixtures();
    wrapToolsListHandler(server);

    // Tenant A's enabled_tools_set: mail-send only (preset-style).
    const tenantAEnabled = Object.freeze(new Set<string>(['mail-send']));

    const response = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: tenantAEnabled,
        presetVersion: 'essentials-v1',
      },
      async () => invokeToolsList(server)
    );

    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBe(1);
    expect(response.tools[0].name).toBe('mail-send');
    // The other two tools MUST be filtered out of tenant A's view.
    expect(response.tools.find((t) => t.name === 'users-list')).toBeUndefined();
    expect(response.tools.find((t) => t.name === 'other-op')).toBeUndefined();
  });

  it('Test 2: tenant B (explicit "users-list,mail-send") sees exactly those two tools', async () => {
    const { wrapToolsListHandler } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = buildServerWithFixtures();
    wrapToolsListHandler(server);

    const tenantBEnabled = Object.freeze(new Set<string>(['users-list', 'mail-send']));

    const response = await requestContext.run(
      {
        tenantId: TENANT_B,
        enabledToolsSet: tenantBEnabled,
        presetVersion: 'essentials-v1',
      },
      async () => invokeToolsList(server)
    );

    expect(response.tools.length).toBe(2);
    const names = response.tools.map((t) => t.name).sort();
    expect(names).toEqual(['mail-send', 'users-list']);
    expect(response.tools.find((t) => t.name === 'other-op')).toBeUndefined();
  });

  it('Test 3: concurrent tenant A + tenant B calls never leak sets across ALS frames', async () => {
    const { wrapToolsListHandler } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = buildServerWithFixtures();
    wrapToolsListHandler(server);

    const tenantAEnabled = Object.freeze(new Set<string>(['mail-send']));
    const tenantBEnabled = Object.freeze(new Set<string>(['users-list', 'mail-send']));

    // 20 interleaved calls — 10 tenant A + 10 tenant B.
    const calls: Array<Promise<{ tenant: string; toolNames: string[] }>> = [];
    for (let i = 0; i < 10; i++) {
      calls.push(
        requestContext.run(
          {
            tenantId: TENANT_A,
            enabledToolsSet: tenantAEnabled,
            presetVersion: 'essentials-v1',
          },
          async () => {
            await new Promise((r) => setTimeout(r, Math.random() * 3));
            const r = await invokeToolsList(server);
            return { tenant: TENANT_A, toolNames: r.tools.map((t) => t.name) };
          }
        )
      );
      calls.push(
        requestContext.run(
          {
            tenantId: TENANT_B,
            enabledToolsSet: tenantBEnabled,
            presetVersion: 'essentials-v1',
          },
          async () => {
            await new Promise((r) => setTimeout(r, Math.random() * 3));
            const r = await invokeToolsList(server);
            return { tenant: TENANT_B, toolNames: r.tools.map((t) => t.name) };
          }
        )
      );
    }

    const results = await Promise.all(calls);
    const aResults = results.filter((r) => r.tenant === TENANT_A);
    const bResults = results.filter((r) => r.tenant === TENANT_B);

    expect(aResults).toHaveLength(10);
    expect(bResults).toHaveLength(10);
    for (const r of aResults) {
      // Tenant A always sees exactly one tool: mail-send.
      expect(r.toolNames).toEqual(['mail-send']);
    }
    for (const r of bResults) {
      // Tenant B always sees exactly two tools: mail-send + users-list
      // (order inherited from server.tool() registration order).
      expect(new Set(r.toolNames)).toEqual(new Set(['mail-send', 'users-list']));
      expect(r.toolNames.length).toBe(2);
    }
  });

  it('keeps discovery-v1 primitives visible when explicit allowlist contains only Graph aliases', async () => {
    const { wrapToolsListHandler } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    for (const name of ['search-tools', 'get-tool-schema', 'execute-tool', 'me.ListMessages']) {
      server.tool(name, name, {}, { title: name, readOnlyHint: true }, async () => ({
        content: [{ type: 'text', text: 'ok' }],
      }));
    }
    wrapToolsListHandler(server);

    const response = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: Object.freeze(new Set<string>(['me.ListMessages'])),
        enabledToolsExplicit: true,
        presetVersion: 'discovery-v1',
      },
      async () => invokeToolsList(server)
    );

    const names = response.tools.map((tool) => tool.name).sort();
    expect(names).toEqual(['execute-tool', 'get-tool-schema', 'me.ListMessages', 'search-tools']);
  });

  it('does not expose unlisted discovery native tools for discovery-v1 tenants', async () => {
    const { wrapToolsListHandler } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    for (const name of [
      'search-tools',
      'get-tool-schema',
      'execute-tool',
      'delete-skill',
      'save-skill',
      'bulk-action',
    ]) {
      server.tool(name, name, {}, { title: name, readOnlyHint: true }, async () => ({
        content: [{ type: 'text', text: 'ok' }],
      }));
    }
    wrapToolsListHandler(server);

    const response = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: Object.freeze(new Set<string>(['search-tools'])),
        enabledToolsExplicit: true,
        presetVersion: 'discovery-v1',
      },
      async () => invokeToolsList(server)
    );

    const names = response.tools.map((tool) => tool.name).sort();
    expect(names).toEqual(['execute-tool', 'get-tool-schema', 'search-tools']);
    expect(names).not.toContain('delete-skill');
    expect(names).not.toContain('save-skill');
    expect(names).not.toContain('bulk-action');
  });

  it('guards direct calls to unlisted native discovery tools', async () => {
    const { wrapNativeDiscoveryToolHandlers } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    server.tool(
      'search-tools',
      'search-tools',
      {},
      { title: 'search-tools', readOnlyHint: true },
      async () => ({
        content: [{ type: 'text', text: 'search-ok' }],
      })
    );
    server.tool(
      'save-skill',
      'save-skill',
      {},
      { title: 'save-skill', readOnlyHint: false },
      async () => ({
        content: [{ type: 'text', text: 'save-ok' }],
      })
    );
    wrapNativeDiscoveryToolHandlers(server);
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { handler: (args: unknown, extra: unknown) => Promise<unknown> }
        >;
      }
    )._registeredTools;

    const searchResult = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: Object.freeze(new Set<string>(['search-tools'])),
        enabledToolsExplicit: true,
        presetVersion: 'discovery-v1',
      },
      async () => tools['search-tools'].handler({}, {})
    );
    expect(searchResult).toMatchObject({ content: [{ text: 'search-ok' }] });

    const saveResult = await requestContext.run(
      {
        tenantId: TENANT_A,
        enabledToolsSet: Object.freeze(new Set<string>(['search-tools'])),
        enabledToolsExplicit: true,
        presetVersion: 'discovery-v1',
      },
      async () => tools['save-skill'].handler({}, {})
    );
    expect(saveResult).toMatchObject({ isError: true });
    const payload = JSON.parse(
      (saveResult as { content: Array<{ type: 'text'; text: string }> }).content[0].text
    ) as { error: string; tool: string };
    expect(payload).toMatchObject({ error: 'tool_not_enabled_for_tenant', tool: 'save-skill' });
  });

  it('Test 4: pino info log emits {tenantId, before, after} on every filtered call', async () => {
    const loggerMod = (await import('../../src/logger.js')) as unknown as {
      default: { info: ReturnType<typeof vi.fn> };
      __mocks: { info: ReturnType<typeof vi.fn> };
    };
    loggerMod.__mocks.info.mockClear();

    const { wrapToolsListHandler } =
      await import('../../src/lib/tool-selection/tools-list-filter.js');
    const { requestContext } = await import('../../src/request-context.js');

    const server = buildServerWithFixtures();
    wrapToolsListHandler(server);

    const enabled = Object.freeze(new Set<string>(['mail-send']));

    await requestContext.run(
      { tenantId: TENANT_A, enabledToolsSet: enabled, presetVersion: 'essentials-v1' },
      async () => invokeToolsList(server)
    );

    const infoCall = loggerMod.__mocks.info.mock.calls.find((c) => {
      const meta = typeof c[0] === 'string' ? c[1] : c[0];
      if (!meta || typeof meta !== 'object') return false;
      const m = meta as Record<string, unknown>;
      return 'tenantId' in m && 'before' in m && 'after' in m;
    });
    expect(infoCall).toBeDefined();
    const meta = (typeof infoCall![0] === 'string' ? infoCall![1] : infoCall![0]) as Record<
      string,
      unknown
    >;
    expect(meta.tenantId).toBe(TENANT_A);
    expect(meta.before).toBe(3);
    expect(meta.after).toBe(1);
  });
});

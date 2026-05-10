import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import crypto, { randomBytes } from 'node:crypto';
import express from 'express';
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../../src/lib/tenant-surface/surface.js';
import { resolveDiscoveryCatalog } from '../../src/lib/discovery-catalog/catalog.js';
import { presetFor } from '../../src/lib/tool-selection/preset-loader.js';
import MicrosoftGraphServer from '../../src/server.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { __setPoolForTesting } from '../../src/lib/postgres.js';
import { __setRedisForTesting } from '../../src/lib/redis.js';
import { createStreamableHttpHandler } from '../../src/lib/transports/streamable-http.js';
import { createSeedTenantContextMiddleware } from '../../src/lib/tool-selection/tenant-context-middleware.js';
import { createTenantsRoutes } from '../../src/lib/admin/tenants.js';
import { createCursorSecret } from '../../src/lib/admin/cursor.js';
import { AGENTIC_EVENTS_CHANNEL } from '../../src/lib/mcp-notifications/events.js';

const RUN_E2E = process.env.MS365_MCP_E2E === '1';
const describeE2E = RUN_E2E ? describe : describe.skip;
const DISCOVERY_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const STATIC_TENANT_ID = '22222222-2222-4222-8222-222222222222';
const GRAPH_ALIAS = 'me.messages.ListMessages';
const PRODUCT_ALIAS = '__powerbi__Groups_GetGroups';
const DISCOVERY_TOOL_NAMES = [
  'search-tools',
  'get-tool-schema',
  'execute-tool',
  'bookmark-tool',
  'list-bookmarks',
  'unbookmark-tool',
  'save-recipe',
  'list-recipes',
  'run-recipe',
  'record-fact',
  'recall-facts',
  'forget-fact',
] as const;

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  rawPinoLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'me.messages.ListMessages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages in the signed-in user mailbox.',
        parameters: [],
      },
      {
        alias: 'me.messages.SendMail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send mail as the signed-in user.',
        parameters: [],
      },
      {
        alias: 'users.ListUsers',
        method: 'get',
        path: '/users',
        description: 'List users in the tenant.',
        parameters: [],
      },
      {
        alias: '__powerbi__Groups_GetGroups',
        method: 'get',
        path: '/groups',
        description: 'List Power BI workspaces.',
        parameters: [],
      },
    ],
  },
}));

interface JsonRpcToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface DiscoveryE2EHarness {
  server: Server;
  baseUrl: string;
  graphRequests: unknown[];
  initialize(tenantId?: string): Promise<string>;
  rpc<T = unknown>(sessionId: string, method: string, params?: unknown): Promise<T>;
  callTool(
    sessionId: string,
    name: string,
    args?: Record<string, unknown>
  ): Promise<JsonRpcToolResult>;
  waitForEvent(
    type: string,
    predicate: (event: Record<string, unknown>) => boolean
  ): Promise<number>;
  patchTenantPreset(tenantId: string, presetVersion: string): Promise<void>;
  close(): Promise<void>;
}

interface RecordedEvent {
  event: Record<string, unknown>;
  seenAt: number;
}

describeE2E('Phase 7 Plan 07-10 discovery-mode E2E smoke (set MS365_MCP_E2E=1 to run)', () => {
  let harness: DiscoveryE2EHarness;
  let sessionId: string;

  beforeAll(async () => {
    harness = await createDiscoveryE2EHarness();
    sessionId = await harness.initialize();
  });

  afterAll(async () => {
    await harness?.close();
  });

  it('AC-01 AC-09 AC-10 AC-11: tools/list returns exactly 12 discovery tools and static remains tool-only', async () => {
    const list = await harness.rpc<{ tools: Array<{ name: string }> }>(sessionId, 'tools/list', {});
    const names = list.tools.map((tool) => tool.name).sort();

    expect(names).toEqual([...DISCOVERY_TOOL_NAMES].sort());
    expect(names).toHaveLength(12);

    const staticSession = await harness.initialize(STATIC_TENANT_ID);
    const staticList = await harness.rpc<{ tools: Array<{ name: string }> }>(
      staticSession,
      'tools/list',
      {}
    );
    const staticNames = staticList.tools.map((tool) => tool.name);
    expect(staticNames).not.toContain('bookmark-tool');
    expect(staticNames).not.toContain('search-tools');
    await expect(harness.rpc(staticSession, 'resources/list', {})).rejects.toThrow();
    await expect(harness.rpc(staticSession, 'prompts/list', {})).rejects.toThrow();
    await expect(
      harness.rpc(staticSession, 'completion/complete', {
        ref: { type: 'ref/prompt', name: 'inbox-triage' },
        argument: { name: 'alias', value: 'me' },
      })
    ).rejects.toThrow();
  });

  it('AC-02 AC-03: resources/list/read and prompts/list/get are available for discovery tenants', async () => {
    const resources = await harness.rpc<{ resources: Array<{ uri: string }> }>(
      sessionId,
      'resources/list',
      {}
    );
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      'mcp://catalog/navigation-guide.md'
    );

    const templates = await harness.rpc<{ resourceTemplates: Array<{ uriTemplate: string }> }>(
      sessionId,
      'resources/templates/list',
      {}
    );
    expect(
      templates.resourceTemplates.some((template) => template.uriTemplate.includes('endpoint'))
    ).toBe(true);

    const read = await harness.rpc<{ contents: Array<{ text: string }> }>(
      sessionId,
      'resources/read',
      {
        uri: 'mcp://catalog/navigation-guide.md',
      }
    );
    expect(read.contents[0]!.text).toContain('search-tools');

    const prompts = await harness.rpc<{ prompts: Array<{ name: string }> }>(
      sessionId,
      'prompts/list',
      {}
    );
    expect(prompts.prompts).toHaveLength(10);
    const prompt = await harness.rpc<{ messages: Array<{ content: { text: string } }> }>(
      sessionId,
      'prompts/get',
      { name: 'inbox-triage', arguments: { account: 'alex@example.com', since: 'today' } }
    );
    expect(prompt.messages[0]!.content.text).toContain('alex@example.com');
  });

  it('AC-04 AC-05: search-tools -> get-tool-schema -> execute-tool targets generated Graph/product aliases via discoveryCatalogSet', async () => {
    const discoveryCatalogSet = resolveDiscoveryCatalog({
      presetVersion: DISCOVERY_PRESET_VERSION,
      enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
      registryAliases: [GRAPH_ALIAS, PRODUCT_ALIAS, ...DISCOVERY_TOOL_NAMES],
    }).discoveryCatalogSet;
    expect(discoveryCatalogSet.has(GRAPH_ALIAS)).toBe(true);
    expect(discoveryCatalogSet.has(PRODUCT_ALIAS)).toBe(true);
    expect(DISCOVERY_META_TOOL_NAMES.has(GRAPH_ALIAS)).toBe(false);

    const search = await harness.callTool(sessionId, 'search-tools', {
      query: 'messages',
      limit: 10,
    });
    const searchBody = JSON.parse(search.content[0]!.text) as {
      tools: Array<{ name: string }>;
    };
    expect(searchBody.tools.map((tool) => tool.name)).toContain(GRAPH_ALIAS);

    const schema = await harness.callTool(sessionId, 'get-tool-schema', { tool_name: GRAPH_ALIAS });
    expect(schema.isError).toBeFalsy();
    expect(schema.content[0]!.text).toContain(GRAPH_ALIAS);

    const executed = await harness.callTool(sessionId, 'execute-tool', {
      tool_name: GRAPH_ALIAS,
      parameters: {},
    });
    expect(executed.isError).toBeFalsy();
    expect(JSON.parse(executed.content[0]!.text)).toMatchObject({ value: [{ id: 'msg-1' }] });
    expect(harness.graphRequests.length).toBeGreaterThan(0);
  });

  it('AC-06 AC-08: bookmark-tool/save-recipe/run-recipe/record-fact survive reconnect and emit resources/updated under 2000 ms', async () => {
    const bookmarkStarted = Date.now();
    const bookmark = await harness.callTool(sessionId, 'bookmark-tool', {
      alias: GRAPH_ALIAS,
      label: 'mail list',
      note: 'starter bookmark',
    });
    expect(bookmark.isError).toBeFalsy();
    const bookmarkElapsed = await harness.waitForEvent('resources/updated', (event) =>
      JSON.stringify(event).includes(`mcp://tenant/${DISCOVERY_TENANT_ID}/bookmarks.json`)
    );
    expect(bookmarkElapsed).toBeLessThan(2000);
    expect(Date.now() - bookmarkStarted).toBeLessThan(2000);

    const bookmarks = await harness.callTool(sessionId, 'list-bookmarks', {});
    expect(bookmarks.content[0]!.text).toContain(GRAPH_ALIAS);

    const savedRecipe = await harness.callTool(sessionId, 'save-recipe', {
      name: 'list recent mail',
      alias: GRAPH_ALIAS,
      params: {},
      note: 'E2E recipe',
    });
    expect(savedRecipe.isError).toBeFalsy();
    const runRecipe = await harness.callTool(sessionId, 'run-recipe', {
      name: 'list recent mail',
    });
    expect(runRecipe.isError).toBeFalsy();

    const factText = 'Prefer concise mailbox summaries in reconnect tests.';
    const fact = await harness.callTool(sessionId, 'record-fact', {
      scope: 'mailbox',
      fact: factText,
    });
    expect(fact.isError).toBeFalsy();

    const reconnected = await harness.initialize();
    const recalled = await harness.callTool(reconnected, 'recall-facts', { scope: 'mailbox' });
    expect(recalled.content[0]!.text).toContain(factText);
  });

  it('AC-07: admin PATCH publishes tools/list_changed under 2000 ms', async () => {
    const started = Date.now();
    await harness.patchTenantPreset(DISCOVERY_TENANT_ID, 'essentials-v1');
    const elapsed = await harness.waitForEvent('tools/list_changed', (event) =>
      JSON.stringify(event).includes(DISCOVERY_TENANT_ID)
    );
    expect(elapsed).toBeLessThan(2000);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

async function createDiscoveryE2EHarness(): Promise<DiscoveryE2EHarness> {
  const pool = makePool();
  await installSchema(pool);
  __setPoolForTesting(pool);

  const redis = new MemoryRedisFacade();
  __setRedisForTesting(redis);
  const events: RecordedEvent[] = [];
  redis.on('message', (channel, message) => {
    if (channel !== AGENTIC_EVENTS_CHANNEL) return;
    events.push({ event: JSON.parse(message) as Record<string, unknown>, seenAt: Date.now() });
  });
  await redis.subscribe(AGENTIC_EVENTS_CHANNEL);

  const graphRequests: unknown[] = [];
  const graphClient = {
    graphRequest: vi.fn(async (path: string, options: unknown) => {
      graphRequests.push({ path, options });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              value: [{ id: 'msg-1', subject: 'Mocked Graph message' }],
              path,
            }),
          },
        ],
      };
    }),
  };

  const authManager = {
    isMultiAccount: vi.fn(async () => false),
    listAccounts: vi.fn(async () => []),
    isOAuthModeEnabled: vi.fn(() => true),
  };
  const graphServer = new MicrosoftGraphServer(authManager as never, { http: true, orgMode: true });
  (graphServer as unknown as { graphClient: unknown }).graphClient = graphClient;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { id?: string }).id = `e2e-${Date.now()}`;
    next();
  });
  app.use('/t/:tenantId', (req, _res, next) => {
    (
      req as express.Request & { tenant?: TenantRow & { enabled_tools_set: ReadonlySet<string> } }
    ).tenant = tenantFor(req.params.tenantId);
    next();
  });
  app.use('/t/:tenantId', createSeedTenantContextMiddleware());
  const mcpHandler = createStreamableHttpHandler({
    buildMcpServer: (tenant) => graphServer.createMcpServer(tenant),
  });
  app.post('/t/:tenantId/mcp', mcpHandler);
  app.get('/t/:tenantId/mcp', mcpHandler);

  app.use('/admin/tenants', (req, _res, next) => {
    (
      req as express.Request & {
        admin?: { actor: string; source: 'entra'; tenantScoped: string | null };
      }
    ).admin = { actor: 'admin@example.com', source: 'entra', tenantScoped: null };
    next();
  });
  app.use(
    '/admin/tenants',
    createTenantsRoutes({
      pgPool: pool,
      redis,
      tenantPool: { evict: vi.fn(), invalidate: vi.fn() },
      kek: randomBytes(32),
      cursorSecret: createCursorSecret(),
      adminOrigins: [],
      entraConfig: { appClientId: 'admin-app', groupId: 'admin-group' },
    } as never)
  );

  const server = await new Promise<Server>((resolve) => {
    const started = http.createServer(app).listen(0, () => resolve(started));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const sessions = new Map<string, { tenantId: string; header?: string }>();
  let rpcId = 1;

  async function postRpc<T>(
    tenantId: string,
    sessionHeader: string | undefined,
    method: string,
    params: unknown
  ): Promise<{ result: T; sessionHeader?: string }> {
    const response = await fetch(`${baseUrl}/t/${tenantId}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(sessionHeader ? { 'Mcp-Session-Id': sessionHeader } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: rpcId++,
        method,
        params,
      }),
    });
    const result = await parseJsonRpcResponse<T>(response);
    return {
      result,
      sessionHeader: response.headers.get('mcp-session-id') ?? undefined,
    };
  }

  const harness: DiscoveryE2EHarness = {
    server,
    baseUrl,
    graphRequests,
    async initialize(tenantId = DISCOVERY_TENANT_ID): Promise<string> {
      const { sessionHeader } = await postRpc(tenantId, undefined, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'phase-07-e2e', version: '1.0.0' },
      });
      const sessionId = sessionHeader ?? `stateless:${tenantId}:${rpcId++}`;
      sessions.set(sessionId, { tenantId, header: sessionHeader });
      return sessionId;
    },
    async rpc<T = unknown>(sessionId: string, method: string, params?: unknown): Promise<T> {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`unknown test session ${sessionId}`);
      const { result } = await postRpc<T>(session.tenantId, session.header, method, params ?? {});
      return result;
    },
    async callTool(
      sessionId: string,
      name: string,
      args: Record<string, unknown> = {}
    ): Promise<JsonRpcToolResult> {
      return harness.rpc<JsonRpcToolResult>(sessionId, 'tools/call', {
        name,
        arguments: args,
      });
    },
    async waitForEvent(
      type: string,
      predicate: (event: Record<string, unknown>) => boolean
    ): Promise<number> {
      const started = Date.now();
      const deadline = started + 2_000;
      while (Date.now() < deadline) {
        const found = events.find(
          (record) => record.event.type === type && predicate(record.event)
        );
        if (found) return Math.max(0, found.seenAt - started);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(`timed out waiting for ${type}`);
    },
    async patchTenantPreset(tenantId: string, presetVersion: string): Promise<void> {
      const response = await fetch(`${baseUrl}/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_version: presetVersion }),
      });
      if (response.status !== 200) {
        throw new Error(`admin PATCH failed: ${response.status} ${await response.text()}`);
      }
    },
    async close(): Promise<void> {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      __setPoolForTesting(null);
      __setRedisForTesting(null);
      redis.disconnect();
      await pool.end();
    },
  };

  return harness;
}

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
      id uuid PRIMARY KEY,
      mode text NOT NULL,
      client_id text NOT NULL,
      client_secret_ref text,
      tenant_id text NOT NULL,
      cloud_type text NOT NULL DEFAULT 'global',
      redirect_uri_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
      cors_origins jsonb NOT NULL DEFAULT '[]'::jsonb,
      allowed_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
      enabled_tools text,
      preset_version text NOT NULL DEFAULT 'discovery-v1',
      sharepoint_domain text,
      rate_limits jsonb,
      slug text UNIQUE,
      disabled_at timestamptz,
      wrapped_dek jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE TABLE audit_log (
      id text PRIMARY KEY,
      tenant_id uuid NOT NULL,
      actor text NOT NULL,
      action text NOT NULL,
      target text,
      ip text,
      request_id text NOT NULL,
      result text NOT NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      ts timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      owner_subject text,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_tenant_tool_bookmarks_unique_tenant_alias
      ON tenant_tool_bookmarks (tenant_id, alias)
      WHERE owner_subject IS NULL;

    CREATE UNIQUE INDEX idx_tenant_tool_bookmarks_unique_owner_alias
      ON tenant_tool_bookmarks (tenant_id, owner_subject, alias)
      WHERE owner_subject IS NOT NULL;

    CREATE TABLE tenant_tool_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
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

    CREATE TABLE tenant_facts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      owner_subject text,
      scope text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(
    `INSERT INTO tenants (
       id, mode, client_id, tenant_id, cloud_type,
       redirect_uri_allowlist, cors_origins, allowed_scopes, preset_version
     ) VALUES
       ($1, 'delegated', 'client-discovery', 'aad-discovery', 'global', '[]'::jsonb, '[]'::jsonb, '["Mail.Read"]'::jsonb, 'discovery-v1'),
       ($2, 'delegated', 'client-static', 'aad-static', 'global', '[]'::jsonb, '[]'::jsonb, '["Mail.Read"]'::jsonb, 'essentials-v1')`,
    [DISCOVERY_TENANT_ID, STATIC_TENANT_ID]
  );
}

function tenantFor(tenantId: string): TenantRow & { enabled_tools_set: ReadonlySet<string> } {
  const discovery = tenantId === DISCOVERY_TENANT_ID;
  return {
    id: tenantId,
    mode: 'delegated',
    client_id: discovery ? 'client-discovery' : 'client-static',
    client_secret_ref: null,
    tenant_id: discovery ? 'aad-discovery' : 'aad-static',
    cloud_type: 'global',
    redirect_uri_allowlist: [],
    cors_origins: [],
    allowed_scopes: ['Mail.Read'],
    enabled_tools: null,
    preset_version: discovery ? DISCOVERY_PRESET_VERSION : 'essentials-v1',
    enabled_tools_set: discovery ? DISCOVERY_META_TOOL_NAMES : presetFor('essentials-v1'),
    sharepoint_domain: null,
    rate_limits: null,
    wrapped_dek: null,
    slug: null,
    disabled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as TenantRow & { enabled_tools_set: ReadonlySet<string> };
}

async function parseJsonRpcResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  if (response.status === 202 || text.trim().length === 0) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payloadText = contentType.includes('text/event-stream') ? parseSseData(text) : text;
  const payload = JSON.parse(payloadText) as {
    result?: T;
    error?: { code?: number; message?: string };
  };
  if (payload.error) {
    throw new Error(payload.error.message ?? `JSON-RPC error ${payload.error.code}`);
  }
  return payload.result as T;
}

function parseSseData(text: string): string {
  const dataLine = text.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) {
    throw new Error(`SSE response missing data line: ${text}`);
  }
  return dataLine.slice('data:'.length).trim();
}

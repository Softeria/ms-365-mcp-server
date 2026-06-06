/**
 * Phase 7 Plan 07-02 — discovery-v1 surface contract.
 *
 * Pins discovery mode: a visible 30-alias meta/app preset that is accepted by
 * the existing selector DSL, while generated Graph and product aliases remain
 * outside that visible preset.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compileEssentialsPreset } from '../../bin/modules/compile-preset.mjs';
import { computeEnabledToolsSet } from '../../src/lib/tool-selection/enabled-tools-parser.js';
import {
  DEFAULT_PRESET_VERSION,
  KNOWN_PRESET_VERSIONS,
  presetFor,
} from '../../src/lib/tool-selection/preset-loader.js';
import { validateSelectors } from '../../src/lib/tool-selection/registry-validator.js';
import { requestContext } from '../../src/request-context.js';
import { registerDiscoveryTools, discoveryCache } from '../../src/graph-tools.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
  resolveTenantSurface,
} from '../../src/lib/tenant-surface/surface.js';
import { resolveDiscoveryCatalog } from '../../src/lib/discovery-catalog/catalog.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import {
  AGENTIC_EVENTS_CHANNEL,
  publishMcpLogMessage,
  publishResourceUpdated,
  publishResourcesListChanged,
  publishToolsListChanged,
} from '../../src/lib/mcp-notifications/events.js';
import MicrosoftGraphServer from '../../src/server.js';

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'me.sendMail', method: 'post', path: '/me/sendMail' },
      { alias: 'me.ListMessages', method: 'get', path: '/me/messages' },
      { alias: '__powerbi__Groups_GetGroups', method: 'get', path: '/groups' },
      ...Array.from({ length: 12 }, (_, i) => ({
        alias: `users.synthetic${i}`,
        method: 'get',
        path: `/users/synthetic${i}`,
      })),
    ],
  },
}));

const DISCOVERY_META_ALIASES = [
  'search-tools',
  'get-tool-schema',
  'execute-tool',
  'bulk-action',
  'read-bulk-result',
  'bookmark-tool',
  'list-bookmarks',
  'unbookmark-tool',
  'save-recipe',
  'list-recipes',
  'run-recipe',
  'record-fact',
  'recall-facts',
  'forget-fact',
  'list-skills',
  'get-skill',
  'save-skill',
  'delete-skill',
  'fork-builtin-skill',
  'render-skill',
  'validate-skill',
  'import-skill-pack',
  'export-skill-pack',
  'inbox-triage-view',
  'calendar-brief-view',
  'teams-digest-view',
  'file-search-view',
  'permissions-overview-view',
  'connector-diagnostics',
  'skill-editor-view',
] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ESSENTIALS_PRESET_PATH = path.join(REPO_ROOT, 'src', 'presets', 'essentials-v1.json');

let tmpDirs: string[] = [];

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface ToolEntry {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface ListToolsResponse {
  tools: ToolEntry[];
  nextCursor?: string;
}

function makeTmp(): string {
  const tmp = path.join(os.tmpdir(), `plan-07-02-discovery-${crypto.randomUUID()}`);
  fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'presets'), { recursive: true });
  tmpDirs.push(tmp);
  return tmp;
}

function makeFakeClient(aliases: readonly string[]): string {
  return [
    'export const api = {',
    '  endpoints: [',
    ...aliases.map(
      (alias) => `    { alias: ${JSON.stringify(alias)}, method: 'get', path: '/x' },`
    ),
    '  ],',
    '};',
    '',
  ].join('\n');
}

function stageEssentials(tmp: string): string[] {
  const essentials = JSON.parse(fs.readFileSync(ESSENTIALS_PRESET_PATH, 'utf-8')) as {
    ops: string[];
  };
  fs.writeFileSync(
    path.join(tmp, 'presets', 'essentials-v1.json'),
    JSON.stringify({ ...essentials, version: 'essentials-v1' })
  );
  return essentials.ops;
}

function stageDiscovery(tmp: string, ops: readonly string[] = DISCOVERY_META_ALIASES): void {
  fs.writeFileSync(
    path.join(tmp, 'presets', 'discovery-v1.json'),
    JSON.stringify({
      version: 'discovery-v1',
      generated_at: '2026-04-25T00:00:00Z',
      ops,
    })
  );
}

afterEach(() => {
  for (const tmp of tmpDirs) {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  tmpDirs = [];
  discoveryCache._clear();
});

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

async function invokeToolsList(server: McpServer): Promise<ListToolsResponse> {
  const inner = (
    server.server as unknown as {
      _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<ListToolsResponse>>;
    }
  )._requestHandlers;
  const handler = inner.get('tools/list');
  if (!handler) {
    throw new Error('tools/list handler not registered on McpServer');
  }
  return handler(
    { method: 'tools/list', params: {} },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  );
}

function createServerFactory(): MicrosoftGraphServer {
  return new MicrosoftGraphServer(
    {
      isMultiAccount: vi.fn(async () => false),
      listAccounts: vi.fn(async () => []),
    } as never,
    { http: true, orgMode: true }
  );
}

describe('Phase 7 Plan 07-02 — discovery-v1 visible preset', () => {
  it('presetFor("discovery-v1") returns exactly the 30 SPEC meta/app aliases and no Graph aliases', () => {
    const preset = presetFor('discovery-v1');
    expect([...preset].sort()).toEqual([...DISCOVERY_META_ALIASES].sort());
    expect(preset.size).toBe(30);
    expect(Object.isFrozen(preset)).toBe(true);
    expect(preset.has('me.sendMail')).toBe(false);
    expect(preset.has('__powerbi__Groups_GetGroups')).toBe(false);
  });

  it('computeEnabledToolsSet(null, "discovery-v1") returns a frozen set of size 30', () => {
    const set = computeEnabledToolsSet(null, 'discovery-v1');
    expect(set.size).toBe(30);
    expect(Object.isFrozen(set)).toBe(true);
    expect([...set].sort()).toEqual([...DISCOVERY_META_ALIASES].sort());
  });

  it('+preset:discovery-v1 is accepted by selector validation and expands to the 30 aliases', () => {
    const validation = validateSelectors(['+preset:discovery-v1']);
    expect(validation.ok).toBe(true);

    const set = computeEnabledToolsSet('+preset:discovery-v1', 'unknown-empty');
    expect([...set].sort()).toEqual([...DISCOVERY_META_ALIASES].sort());
  });

  it('DEFAULT_PRESET_VERSION and KNOWN_PRESET_VERSIONS include discovery-v1', () => {
    expect(DEFAULT_PRESET_VERSION).toBe('discovery-v1');
    expect(KNOWN_PRESET_VERSIONS).toContain('discovery-v1');
  });

  it('compile-preset accepts only the bounded discovery meta/app alias allowlist', () => {
    const tmp = makeTmp();
    const essentialsOps = stageEssentials(tmp);
    stageDiscovery(tmp);
    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient(essentialsOps));

    const result = compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'));
    expect(result.count).toBe(150);

    const out = fs.readFileSync(path.join(tmp, 'presets', 'generated-index.ts'), 'utf-8');
    expect(out).toContain('DISCOVERY_V1_OPS');
    expect(out).toMatch(/['"]discovery-v1['"]/);
    for (const alias of DISCOVERY_META_ALIASES) {
      expect(out).toMatch(new RegExp(`['"]${alias}['"]`));
    }

    const broken = makeTmp();
    const brokenEssentialsOps = stageEssentials(broken);
    stageDiscovery(broken, [...DISCOVERY_META_ALIASES, 'not-a-real-meta-tool']);
    fs.writeFileSync(
      path.join(broken, 'generated', 'client.ts'),
      makeFakeClient(brokenEssentialsOps)
    );

    expect(() =>
      compileEssentialsPreset(path.join(broken, 'generated'), path.join(broken, 'presets'))
    ).toThrow(/not-a-real-meta-tool|discovery-v1/);
  });
});

describe('Phase 7 Plan 07-02 — discovery catalog separation', () => {
  it('resolveTenantSurface detects discovery-v1 and exposes the frozen 30-tool visible set', () => {
    const surface = resolveTenantSurface({ preset_version: DISCOVERY_PRESET_VERSION });
    expect(surface.isDiscoverySurface).toBe(true);
    expect(surface.visibleToolsSet).toBe(DISCOVERY_META_TOOL_NAMES);
    expect(surface.visibleToolsSet.size).toBe(30);
    expect(Object.isFrozen(surface.visibleToolsSet)).toBe(true);

    const staticSurface = resolveTenantSurface({ preset_version: 'essentials-v1' });
    expect(staticSurface.isDiscoverySurface).toBe(false);
  });

  it('resolveDiscoveryCatalog separates visible discovery tools from generated Graph/product aliases', () => {
    const registryAliases = Object.freeze(
      new Set([
        'search-tools',
        'me.sendMail',
        'me.ListMessages',
        '__powerbi__Groups_GetGroups',
        ...Array.from({ length: 12 }, (_, i) => `users.synthetic${i}`),
      ])
    );

    const resolution = resolveDiscoveryCatalog({
      presetVersion: DISCOVERY_PRESET_VERSION,
      enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
      registryAliases,
    });

    expect(resolution.isDiscoverySurface).toBe(true);
    expect(resolution.visibleToolsSet.size).toBe(30);
    expect([...resolution.visibleToolsSet].sort()).toEqual([...DISCOVERY_META_ALIASES].sort());
    expect(resolution.discoveryCatalogSet.size).toBeGreaterThan(0);
    expect(resolution.discoveryCatalogSet.has('me.sendMail')).toBe(true);
    expect(resolution.discoveryCatalogSet.has('__powerbi__Groups_GetGroups')).toBe(true);
    expect(resolution.discoveryCatalogSet.has('search-tools')).toBe(false);
  });

  it('resolveDiscoveryCatalog applies explicit allowlists inside discovery-v1 catalogs', () => {
    const registryAliases = Object.freeze(
      new Set(['search-tools', 'me.sendMail', 'me.ListMessages', '__powerbi__Groups_GetGroups'])
    );

    const resolution = resolveDiscoveryCatalog({
      presetVersion: DISCOVERY_PRESET_VERSION,
      enabledToolsSet: Object.freeze(new Set(['me.ListMessages'])),
      enabledToolsExplicit: true,
      registryAliases,
    });

    expect(resolution.isDiscoverySurface).toBe(true);
    expect(resolution.visibleToolsSet.has('search-tools')).toBe(true);
    expect(resolution.discoveryCatalogSet.has('me.ListMessages')).toBe(true);
    expect(resolution.discoveryCatalogSet.has('me.sendMail')).toBe(false);
    expect(resolution.discoveryCatalogSet.has('__powerbi__Groups_GetGroups')).toBe(false);
    expect(resolution.discoveryCatalogSet.has('search-tools')).toBe(false);
  });

  it('resolveDiscoveryCatalog keeps static tenants aligned to enabledToolsSet', () => {
    const enabledToolsSet = Object.freeze(new Set(['me.sendMail']));
    const resolution = resolveDiscoveryCatalog({
      presetVersion: 'essentials-v1',
      enabledToolsSet,
      registryAliases: new Set(['me.sendMail', 'me.ListMessages']),
    });

    expect(resolution.isDiscoverySurface).toBe(false);
    expect(resolution.visibleToolsSet).toBe(enabledToolsSet);
    expect(resolution.discoveryCatalogSet).toBe(enabledToolsSet);
    expect(resolution.discoveryCatalogSet.has('me.ListMessages')).toBe(false);
  });

  it('search-tools and get-tool-schema use discoveryCatalogSet; execute-tool blocks default write aliases', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
      }),
    };
    registerDiscoveryTools(
      server,
      graphClient as unknown as Parameters<typeof registerDiscoveryTools>[1],
      false,
      true
    );

    const ctx = {
      tenantId: '11111111-1111-1111-1111-111111111111',
      enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
      presetVersion: DISCOVERY_PRESET_VERSION,
    };

    const search = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'search-tools', { query: 'send mail', limit: 10 })
    );
    const searchBody = JSON.parse(search.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };
    expect(searchBody.total).toBeGreaterThan(0);
    expect(searchBody.tools.map((t) => t.name)).toContain('me.sendMail');

    const schema = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'get-tool-schema', { tool_name: 'me.sendMail' })
    );
    expect(schema.isError).toBeFalsy();
    expect(schema.content[0].text).toContain('me.sendMail');

    const readExecuted = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'execute-tool', { tool_name: 'me.ListMessages', parameters: {} })
    );
    expect(readExecuted.isError).toBeFalsy();
    expect(graphClient.graphRequest).toHaveBeenCalled();

    graphClient.graphRequest.mockClear();
    const writeExecuted = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'execute-tool', { tool_name: 'me.sendMail', parameters: {} })
    );
    expect(writeExecuted.isError).toBe(true);
    expect(writeExecuted.content[0].text).toContain('explicit tenant enablement');
    expect(graphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('discovery tools enforce explicit tenant allowlists before schema or execution', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
      }),
    };
    registerDiscoveryTools(
      server,
      graphClient as unknown as Parameters<typeof registerDiscoveryTools>[1],
      false,
      true
    );

    const ctx = {
      tenantId: '11111111-1111-4111-8111-111111111111',
      enabledToolsSet: Object.freeze(new Set(['me.ListMessages'])),
      enabledToolsExplicit: true,
      presetVersion: DISCOVERY_PRESET_VERSION,
    };

    const search = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'search-tools', { limit: 10 })
    );
    const searchBody = JSON.parse(search.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };
    expect(searchBody.total).toBe(1);
    expect(searchBody.tools.map((t) => t.name)).toEqual(['me.ListMessages']);

    const schema = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'get-tool-schema', { tool_name: 'me.sendMail' })
    );
    expect(schema.isError).toBe(true);
    expect(schema.content[0].text).toContain('Tool not enabled for tenant');

    const executed = await requestContext.run(ctx, () =>
      callDiscoveryTool(server, 'execute-tool', { tool_name: 'me.sendMail', parameters: {} })
    );
    expect(executed.isError).toBe(true);
    expect(graphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('static tenants still search only their enabledToolsSet through discovery tools', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
      }),
    };
    registerDiscoveryTools(
      server,
      graphClient as unknown as Parameters<typeof registerDiscoveryTools>[1],
      false,
      true
    );

    const staticEnabled = Object.freeze(new Set(['me.ListMessages']));
    const search = await requestContext.run(
      {
        tenantId: '22222222-2222-2222-2222-222222222222',
        enabledToolsSet: staticEnabled,
        presetVersion: 'essentials-v1',
      },
      () => callDiscoveryTool(server, 'search-tools', { limit: 10 })
    );
    const body = JSON.parse(search.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };
    expect(body.total).toBe(1);
    expect(body.tools.map((t) => t.name)).toEqual(['me.ListMessages']);
  });
});

describe('Phase 7 Plan 07-02 — agentic notification publisher contract', () => {
  it('exports publisher functions that emit JSON-safe agentic event payloads', async () => {
    const redis = new MemoryRedisFacade();
    const messages: unknown[] = [];
    redis.on('message', (_channel, message) => {
      messages.push(JSON.parse(message));
    });
    await redis.subscribe(AGENTIC_EVENTS_CHANNEL);

    const tenantId = '33333333-3333-3333-3333-333333333333';
    await publishToolsListChanged(redis, tenantId, 'enabled-tools-change');
    await publishResourcesListChanged(redis, tenantId, 'resource-registry-change');
    await publishResourceUpdated(redis, tenantId, [`mcp://tenant/${tenantId}/bookmarks.json`]);
    await publishMcpLogMessage(redis, tenantId, {
      level: 'info',
      logger: 'test',
      data: { ok: true },
    });

    expect(messages).toHaveLength(4);
    expect(messages.map((msg) => (msg as { type: string }).type)).toEqual([
      'tools/list_changed',
      'resources/list_changed',
      'resources/updated',
      'logging/message',
    ]);
    expect(messages.every((msg) => (msg as { tenantId: string }).tenantId === tenantId)).toBe(true);
  });
});

describe('Phase 7 Plan 07-05 — aggregate memory registration', () => {
  it('discovery tenant tools/list contains exactly the locked 30 visible meta/app aliases', async () => {
    const graphServer = createServerFactory();
    const mcp = graphServer.createMcpServer({
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    } as never);

    const ctx = {
      tenantId: '11111111-1111-4111-8111-111111111111',
      enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
      presetVersion: DISCOVERY_PRESET_VERSION,
    };
    const list = await requestContext.run(ctx, () => invokeToolsList(mcp));
    const names = list.tools.map((tool) => tool.name).sort();

    expect(names).toEqual([...DISCOVERY_META_TOOL_NAMES].sort());
    expect(names).toEqual([...DISCOVERY_META_ALIASES].sort());
    expect(names).toHaveLength(30);
  });

  it('discovery tenant exposes discovery, memory, skill, and dashboard tools while search uses the catalog', async () => {
    const graphServer = createServerFactory();
    const mcp = graphServer.createMcpServer({
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    } as never);
    const ctx = {
      tenantId: '11111111-1111-4111-8111-111111111111',
      enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
      presetVersion: DISCOVERY_PRESET_VERSION,
    };

    const list = await requestContext.run(ctx, () => invokeToolsList(mcp));
    const names = new Set(list.tools.map((tool) => tool.name));
    for (const alias of DISCOVERY_META_ALIASES) {
      expect(names.has(alias)).toBe(true);
    }

    const search = await requestContext.run(ctx, () =>
      callDiscoveryTool(mcp, 'search-tools', { query: 'send mail', limit: 10 })
    );
    const body = JSON.parse(search.content[0].text) as {
      tools: Array<{ name: string }>;
      total: number;
    };
    expect(body.total).toBeGreaterThan(0);
    expect(body.tools.map((tool) => tool.name)).toContain('me.sendMail');
  });

  it('static tenant tools/list contains no memory tools and no resources, prompts, or completions handlers', async () => {
    const graphServer = createServerFactory();
    const staticEnabled = Object.freeze(new Set(['me.sendMail', 'record-fact']));
    const mcp = graphServer.createMcpServer({
      preset_version: 'essentials-v1',
      enabled_tools_set: staticEnabled,
    } as never);
    const ctx = {
      tenantId: '22222222-2222-4222-8222-222222222222',
      enabledToolsSet: staticEnabled,
      presetVersion: 'essentials-v1',
    };

    const list = await requestContext.run(ctx, () => invokeToolsList(mcp));
    const names = list.tools.map((tool) => tool.name);
    expect(names).not.toContain('record-fact');
    expect(names).not.toContain('recall-facts');
    expect(names).not.toContain('forget-fact');
    expect(names).not.toContain('bookmark-tool');
    expect(names).not.toContain('save-recipe');

    const handlers = (
      mcp.server as unknown as {
        _requestHandlers: Map<string, unknown>;
      }
    )._requestHandlers;
    expect(handlers.has('resources/list')).toBe(false);
    expect(handlers.has('prompts/list')).toBe(false);
    expect(handlers.has('completion/complete')).toBe(false);
  });

  it('admin memory aggregate is mounted behind the existing admin auth chain', () => {
    const routerSource = fs.readFileSync(path.join(REPO_ROOT, 'src/lib/admin/router.ts'), 'utf-8');
    const authIndex = routerSource.indexOf('r.use(createAdminAuthMiddleware(deps))');
    const memoryIndex = routerSource.indexOf("r.use('/tenants', createMemoryRoutes(deps))");

    expect(routerSource).toContain("from './memory.js'");
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(memoryIndex).toBeGreaterThan(authIndex);
  });
});

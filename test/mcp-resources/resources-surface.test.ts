import { describe, expect, it, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../../src/request-context.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../../src/lib/tenant-surface/surface.js';
import { readMcpResource } from '../../src/lib/mcp-resources/read.js';
import { registerMcpResources } from '../../src/lib/mcp-resources/register.js';
import MicrosoftGraphServer from '../../src/server.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

const memoryMocks = vi.hoisted(() => ({
  listBookmarks: vi.fn(),
  listRecipes: vi.fn(),
  recallFacts: vi.fn(),
}));

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages in the signed-in user mailbox.',
        parameters: [],
      },
      {
        alias: '__powerbi__Groups_GetGroups',
        method: 'get',
        path: '/groups',
        description: 'List Power BI workspaces.',
        parameters: [],
      },
      {
        alias: 'search-tools',
        method: 'get',
        path: '/meta/search-tools',
        description: 'Visible discovery meta tool that must not be in discoveryCatalogSet.',
        parameters: [],
      },
    ],
  },
}));

vi.mock('../../src/lib/memory/bookmarks.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/memory/bookmarks.js')>()),
  listBookmarks: memoryMocks.listBookmarks,
  getBookmarkCountsByAlias: vi.fn(async () => new Map()),
}));

vi.mock('../../src/lib/memory/recipes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/memory/recipes.js')>()),
  listRecipes: memoryMocks.listRecipes,
}));

vi.mock('../../src/lib/memory/facts.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/memory/facts.js')>()),
  recallFacts: memoryMocks.recallFacts,
}));

function readText(result: Awaited<ReturnType<typeof readMcpResource>>): string {
  return result.contents[0].text;
}

function discoveryContext() {
  return {
    tenantId: TENANT_A,
    enabledToolsSet: DISCOVERY_META_TOOL_NAMES,
    presetVersion: DISCOVERY_PRESET_VERSION,
  };
}

async function invokeResourcesList(server: McpServer): Promise<{
  resources: Array<{ uri: string; name: string; mimeType?: string }>;
}> {
  const handlers = (
    server.server as unknown as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<unknown>>;
    }
  )._requestHandlers;
  const handler = handlers.get('resources/list');
  if (!handler) {
    throw new Error('resources/list handler not registered on McpServer');
  }
  return handler(
    { method: 'resources/list', params: {} },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  ) as Promise<{ resources: Array<{ uri: string; name: string; mimeType?: string }> }>;
}

async function invokeResourceTemplatesList(server: McpServer): Promise<{
  resourceTemplates: Array<{ uriTemplate: string; name: string; mimeType?: string }>;
}> {
  const handlers = (
    server.server as unknown as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<unknown>>;
    }
  )._requestHandlers;
  const handler = handlers.get('resources/templates/list');
  if (!handler) {
    throw new Error('resources/templates/list handler not registered on McpServer');
  }
  return handler(
    { method: 'resources/templates/list', params: {} },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  ) as Promise<{
    resourceTemplates: Array<{ uriTemplate: string; name: string; mimeType?: string }>;
  }>;
}

function createGraphServer(): MicrosoftGraphServer {
  return new MicrosoftGraphServer(
    {
      isMultiAccount: vi.fn(async () => false),
      listAccounts: vi.fn(async () => []),
    } as never,
    { http: true, orgMode: true }
  );
}

function discoveryTenant() {
  return {
    id: TENANT_A,
    preset_version: DISCOVERY_PRESET_VERSION,
    enabled_tools: null,
    enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    allowed_scopes: ['Mail.Read', 'Mail.Send', 'User.Read.All'],
  };
}

describe('Phase 7 Plan 07-11 Task 2 - MCP resource read dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryMocks.listBookmarks.mockResolvedValue([{ alias: 'list-mail-messages' }]);
    memoryMocks.listRecipes.mockResolvedValue([{ name: 'morning inbox' }]);
    memoryMocks.recallFacts.mockResolvedValue([{ scope: 'mailbox', content: 'prefer concise' }]);
  });

  it('reads static catalog markdown resources with text/markdown MIME type and canonical response URIs', async () => {
    const result = await readMcpResource('mcp://catalog/navigation-guide.md', {});

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe('m365://catalog/navigation-guide.md');
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(readText(result)).toContain('search-tools');
    expect(readText(result)).toContain('mcp:// is accepted as a legacy alias');
  });

  it('builds catalog scope-map.json from endpoints.json as alias-to-scopes JSON', async () => {
    const result = await readMcpResource('mcp://catalog/scope-map.json', {});
    const body = JSON.parse(readText(result)) as Record<string, string[]>;

    expect(result.contents[0].uri).toBe('m365://catalog/scope-map.json');
    expect(result.contents[0].mimeType).toBe('application/json');
    expect(body['list-mail-messages']).toContain('Mail.Read');
    expect(body['send-mail']).toContain('Mail.Send');
  });

  it('reads endpoint schema resources with the same schema shape as get-tool-schema', async () => {
    const result = await requestContext.run(discoveryContext(), () =>
      readMcpResource('mcp://endpoint/list-mail-messages.schema.json', { orgMode: true })
    );
    const body = JSON.parse(readText(result)) as {
      name: string;
      method: string;
      path: string;
      parameters: unknown[];
    };

    expect(result.contents[0].uri).toBe('m365://endpoint/list-mail-messages.schema.json');
    expect(result.contents[0].mimeType).toBe('application/json');
    expect(body).toMatchObject({
      name: 'list-mail-messages',
      method: 'GET',
      path: '/me/messages',
    });
    expect(body.parameters).toEqual([]);
  });

  it('allows discovery endpoint schemas for generated aliases outside the 12 visible tools', async () => {
    const result = await requestContext.run(discoveryContext(), () =>
      readMcpResource('mcp://endpoint/__powerbi__Groups_GetGroups.schema.json', {
        orgMode: true,
      })
    );
    const body = JSON.parse(readText(result)) as { name: string };

    expect(body.name).toBe('__powerbi__Groups_GetGroups');
    expect(DISCOVERY_META_TOOL_NAMES.has('__powerbi__Groups_GetGroups')).toBe(false);
  });

  it('rejects endpoint schemas that are not in the effective discovery catalog', async () => {
    await expect(
      requestContext.run(discoveryContext(), () =>
        readMcpResource('mcp://endpoint/search-tools.schema.json', { orgMode: true })
      )
    ).rejects.toMatchObject({
      data: { code: 'invalid_resource_uri' },
    });
  });

  it('calls tenant memory services with the caller tenant id after owner validation', async () => {
    await requestContext.run(discoveryContext(), async () => {
      await readMcpResource(`mcp://tenant/${TENANT_A}/bookmarks.json`, {});
      await readMcpResource(`mcp://tenant/${TENANT_A}/recipes.json`, {});
      await readMcpResource(`mcp://tenant/${TENANT_A}/facts.json`, {});
    });

    expect(memoryMocks.listBookmarks).toHaveBeenCalledWith(TENANT_A, undefined, undefined);
    expect(memoryMocks.listRecipes).toHaveBeenCalledWith(TENANT_A, undefined, undefined);
    expect(memoryMocks.recallFacts).toHaveBeenCalledWith(TENANT_A, { limit: 100 }, undefined);
  });

  it('fails closed on tenant URI mismatch before tenant view reads', async () => {
    await expect(
      requestContext.run(discoveryContext(), () =>
        readMcpResource(`mcp://tenant/${TENANT_B}/bookmarks.json`, {})
      )
    ).rejects.toMatchObject({
      data: { code: 'tenant_resource_mismatch' },
    });

    expect(memoryMocks.listBookmarks).not.toHaveBeenCalled();
  });

  it('reads Graph-backed resources through bounded same-tenant Graph GETs', async () => {
    const graphClient = {
      graphRequest: vi.fn(async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: 'message-1',
              subject: 'Hello',
              accessToken: 'secret',
            }),
          },
        ],
      })),
    };

    const result = await requestContext.run(discoveryContext(), () =>
      readMcpResource(`m365://tenant/${TENANT_A}/mail/messages/message-1.json`, {
        tenant: discoveryTenant(),
        graphClient,
      })
    );
    const body = JSON.parse(readText(result)) as {
      uri: string;
      kind: string;
      readOnly: boolean;
      bounded: boolean;
      data: Record<string, unknown>;
    };

    expect(graphClient.graphRequest).toHaveBeenCalledWith('/me/messages/message-1', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(body).toMatchObject({
      uri: `m365://tenant/${TENANT_A}/mail/messages/message-1.json`,
      kind: 'mail-message',
      readOnly: true,
      bounded: true,
      data: { id: 'message-1', subject: 'Hello' },
    });
    expect(body.data).not.toHaveProperty('accessToken');
  });

  it('rejects Graph-backed resources when required scopes are absent', async () => {
    await expect(
      requestContext.run(discoveryContext(), () =>
        readMcpResource(`m365://tenant/${TENANT_A}/users/user-1.json`, {
          tenant: { ...discoveryTenant(), allowed_scopes: ['Mail.Read'] },
          graphClient: { graphRequest: vi.fn() },
        })
      )
    ).rejects.toMatchObject({
      data: { code: 'scope_not_allowed_for_tenant' },
    });
  });
});

describe('Phase 7 Plan 07-11 Task 3 - MCP resource registration', () => {
  it('registers static resources plus concrete caller-tenant views for discovery tenants', async () => {
    const server = new McpServer({ name: 'resources-test', version: '0.0.0' });
    registerMcpResources(server, {
      tenant: discoveryTenant(),
      orgMode: true,
    });

    const list = await requestContext.run(discoveryContext(), () => invokeResourcesList(server));
    const uris = list.resources.map((resource) => resource.uri).sort();

    expect(uris).toContain('m365://catalog/navigation-guide.md');
    expect(uris).toContain('mcp://catalog/navigation-guide.md');
    expect(uris).toContain('m365://catalog/scope-map.json');
    expect(uris).toContain('mcp://catalog/scope-map.json');
    expect(uris).toContain('m365://catalog/workloads/mail.md');
    expect(uris).toContain('mcp://catalog/workloads/mail.md');
    expect(uris).toContain(`m365://tenant/${TENANT_A}/enabled-tools.json`);
    expect(uris).toContain(`mcp://tenant/${TENANT_A}/enabled-tools.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/scopes.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/audit/recent.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/bookmarks.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/recipes.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/facts.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/connector/capabilities.json`);
    expect(uris).toContain(`m365://tenant/${TENANT_A}/connector/diagnostics.json`);
    expect(list.resources.find((resource) => resource.uri.endsWith('/scopes.json'))?.mimeType).toBe(
      'application/json'
    );
  });

  it('registers workload, endpoint schema, and editable skill resource templates', async () => {
    const server = new McpServer({ name: 'resources-test', version: '0.0.0' });
    registerMcpResources(server, {
      tenant: discoveryTenant(),
      orgMode: true,
    });

    const list = await invokeResourceTemplatesList(server);
    const templates = list.resourceTemplates.map((template) => template.uriTemplate).sort();

    expect(templates).toEqual(
      expect.arrayContaining([
        'm365://catalog/workloads/{slug}.md',
        'mcp://catalog/workloads/{slug}.md',
        'm365://endpoint/{alias}.schema.json',
        'mcp://endpoint/{alias}.schema.json',
        'm365://tenant/{tenantId}/skill-packs/{packName}.json',
        'm365://tenant/{tenantId}/skills/{name}.md',
        'm365://tenant/{tenantId}/skills/{name}.schema.json',
        'm365://tenant/{tenantId}/enabled-tools.json',
        'm365://tenant/{tenantId}/connector/capabilities.json',
        'm365://tenant/{tenantId}/users/{userId}.json',
        'm365://tenant/{tenantId}/mail/messages/{messageId}.json',
      ])
    );
    expect(
      list.resourceTemplates.find((template) => template.uriTemplate.includes('workloads'))
    ).toMatchObject({
      mimeType: 'text/markdown',
    });
    expect(
      list.resourceTemplates.find((template) => template.uriTemplate.includes('endpoint'))
    ).toMatchObject({
      mimeType: 'application/json',
    });
    expect(
      list.resourceTemplates.find((template) => template.uriTemplate.includes('/skill-packs/'))
    ).toMatchObject({
      mimeType: 'application/json',
    });
    expect(
      list.resourceTemplates.find((template) => template.uriTemplate.endsWith('/skills/{name}.md'))
    ).toMatchObject({
      mimeType: 'text/markdown',
    });
    expect(
      list.resourceTemplates.find((template) =>
        template.uriTemplate.endsWith('/skills/{name}.schema.json')
      )
    ).toMatchObject({
      mimeType: 'application/json',
    });
  });

  it('wires discovery tenant createMcpServer with resource handlers and concrete tenant resources', async () => {
    const mcp = createGraphServer().createMcpServer(discoveryTenant() as never);
    const list = await requestContext.run(discoveryContext(), () => invokeResourcesList(mcp));

    expect(list.resources.map((resource) => resource.uri)).toContain(
      `mcp://tenant/${TENANT_A}/enabled-tools.json`
    );
  });

  it('static tenant createMcpServer has no resource capability or resource list handler', () => {
    const mcp = createGraphServer().createMcpServer({
      id: TENANT_B,
      preset_version: 'essentials-v1',
      enabled_tools_set: Object.freeze(new Set(['list-mail-messages'])),
      allowed_scopes: ['Mail.Read'],
    } as never);
    const inner = mcp.server as unknown as {
      _requestHandlers: Map<string, unknown>;
      _capabilities: { resources?: unknown };
    };

    expect(inner._requestHandlers.has('resources/list')).toBe(false);
    expect(inner._requestHandlers.has('resources/templates/list')).toBe(false);
    expect(inner._requestHandlers.has('resources/read')).toBe(false);
    expect(inner._capabilities.resources).toBeUndefined();
  });
});

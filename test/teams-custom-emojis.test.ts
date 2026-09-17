import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAllowedScopeDiagnostics, resolveAuthScopes } from '../src/auth.js';
import type { GraphClient } from '../src/graph-client.js';
import {
  buildToolsRegistry,
  registerDiscoveryTools,
  registerGraphTools,
} from '../src/graph-tools.js';
import { TOOL_CATEGORIES } from '../src/tool-categories.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Import the real generated clients through graph-tools: a configuration entry alone
// must not make these tests pass when generation failed to expose its operation.
const toolNames = ['list-custom-emojis', 'create-custom-emoji'];
const enabledTools = `^(${toolNames.join('|')})$`;
const readScope = 'TeamworkCustomEmoji.Read';
const createScope = 'TeamworkCustomEmoji.Create';
const emojiPath = '/teamwork/messaging/customEmojis';
const imageFixtures = [
  {
    format: 'PNG',
    contentBytes:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1kAAAAASUVORK5CYII=',
  },
  {
    format: 'GIF',
    contentBytes: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  },
];

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

function resultJson<T>(result: ToolResult): T {
  return JSON.parse(result.content[0].text) as T;
}

describe('Teams custom emojis (real generated clients)', () => {
  let mockServer: {
    tool: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
    server: Record<string, unknown>;
  };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MS365_MCP_REQUIRE_CONFIRM', 'false');
    vi.stubEnv('MS365_MCP_MAX_TOP', '');
    mockServer = { tool: vi.fn(), registerTool: vi.fn(), server: {} };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
      }),
    } as unknown as GraphClient;
  });

  afterEach(() => vi.unstubAllEnvs());

  function register(readOnly = false, orgMode = true, allowedScopes?: string) {
    registerGraphTools(
      mockServer,
      mockGraphClient,
      readOnly,
      enabledTools,
      orgMode,
      undefined,
      false,
      [],
      allowedScopes
    );
    return mockServer.registerTool.mock.calls.map((call: unknown[]) => call[0]);
  }

  function handler(name: string, discovery = false): ToolHandler {
    const calls = discovery ? mockServer.tool.mock.calls : mockServer.registerTool.mock.calls;
    const call = calls.find((entry: unknown[]) => entry[0] === name);
    expect(call, `tool ${name} should be registered`).toBeDefined();
    return call![call!.length - 1] as ToolHandler;
  }

  function registerDiscovery(readOnly = false, orgMode = true, allowedScopes?: string) {
    registerDiscoveryTools(
      mockServer,
      mockGraphClient,
      readOnly,
      orgMode,
      undefined,
      false,
      [],
      enabledTools,
      allowedScopes
    );
  }

  it('registers both operations from the generated beta client', () => {
    expect(register().sort()).toEqual([...toolNames].sort());
    for (const call of mockServer.registerTool.mock.calls) {
      expect(call[1].description).toMatch(/^\[beta\]/);
      expect(call[1].annotations).toMatchObject({
        readOnlyHint: call[0] === 'list-custom-emojis',
        destructiveHint: call[0] === 'create-custom-emoji',
      });
    }
  });

  it('routes list with documented $top and $filter to beta', async () => {
    register();
    await handler('list-custom-emojis')({ top: 7, filter: "displayName eq 'example-emoji'" });

    expect(mockGraphClient.graphRequest).toHaveBeenCalledOnce();
    const [requestPath, options] = vi.mocked(mockGraphClient.graphRequest).mock.calls[0];
    const url = new URL(requestPath, 'https://graph.microsoft.com');
    expect(url.pathname).toBe(emojiPath);
    expect([...url.searchParams.entries()]).toEqual([
      ['$top', '7'],
      ['$filter', "displayName eq 'example-emoji'"],
    ]);
    expect(options).toMatchObject({ method: 'GET', apiVersion: 'beta' });
    expect(options?.body).toBeUndefined();
  });

  it('retains PNG/GIF bytes and the beta route across paginated list responses', async () => {
    vi.stubEnv('MS365_MCP_ALLOW_PAGINATION', 'true');
    vi.stubEnv('MS365_MCP_MAX_PAGES', '5');
    vi.stubEnv('MS365_MCP_MAX_ITEMS', '10');
    const emojis = imageFixtures.map(({ format, contentBytes }) => ({
      displayName: `example-${format.toLowerCase()}`,
      contentBytes,
    }));
    const nextQuery = '?$top=1&$skiptoken=next%2Bpage%2Ftoken%3D';
    vi.mocked(mockGraphClient.graphRequest)
      .mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              value: [emojis[0]],
              '@odata.nextLink': `https://graph.microsoft.com/beta${emojiPath}${nextQuery}`,
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ value: [emojis[1]] }) }],
      });
    mockGraphClient.serialize = vi.fn((value) => JSON.stringify(value));
    register();

    const response = await handler('list-custom-emojis')({ top: 1, fetchAllPages: true });

    expect(response.isError).not.toBe(true);
    expect(resultJson(response)).toEqual({ value: emojis });
    const requests = vi.mocked(mockGraphClient.graphRequest).mock.calls;
    expect(requests.map(([path]) => path)).toEqual([
      `${emojiPath}?$top=1`,
      `${emojiPath}${nextQuery}`,
    ]);
    for (const [, options] of requests) {
      expect(options).toMatchObject({ method: 'GET', apiVersion: 'beta', forceJsonOutput: true });
    }
  });

  it('exposes only documented list options and a continuation cursor in both schemas', async () => {
    register();
    registerDiscovery();
    const normal = mockServer.registerTool.mock.calls.find(
      (call: unknown[]) => call[0] === 'list-custom-emojis'
    )?.[1].inputSchema.shape;
    const discovery = resultJson<{ parameters: Array<{ name: string }> }>(
      await handler('get-tool-schema', true)({ tool_name: 'list-custom-emojis' })
    );
    const discoveredNames = discovery.parameters.map((parameter) => parameter.name);
    for (const name of ['top', 'filter', 'skiptoken']) {
      expect(normal, `normal schema should expose ${name}`).toHaveProperty(name);
      expect(discoveredNames).toContain(name);
    }
    for (const name of ['select', 'search', 'orderby', 'expand', 'skip', 'count']) {
      expect(normal).not.toHaveProperty(name);
      expect(discoveredNames).not.toContain(name);
    }
  });

  it('describes list queries without recommending unsupported options', async () => {
    vi.stubEnv('MS365_MCP_ALLOW_PAGINATION', 'true');
    register();
    registerDiscovery();
    const normal = mockServer.registerTool.mock.calls.find(
      (call: unknown[]) => call[0] === 'list-custom-emojis'
    )?.[1].inputSchema.shape;
    const discovery = resultJson<{ parameters: Array<{ name: string; description?: string }> }>(
      await handler('get-tool-schema', true)({ tool_name: 'list-custom-emojis' })
    );
    for (const name of ['top', 'filter', 'fetchAllPages']) {
      const descriptions = [
        normal[name].description,
        discovery.parameters.find((parameter) => parameter.name === name)?.description,
      ];
      for (const description of descriptions) {
        expect(description).toEqual(expect.any(String));
        expect(description).not.toMatch(/\$(select|search|orderby|expand|skip|count)\b/i);
        if (name === 'top') expect(description).toMatch(/base64/i);
      }
    }
  });

  it.each(['select', 'search', 'orderby'])(
    'rejects unsupported %s in direct and discovery calls before calling Graph',
    async (parameter) => {
      register();
      registerDiscovery();
      const direct = await handler('list-custom-emojis')({ [parameter]: 'displayName' });
      const discovery = await handler(
        'execute-tool',
        true
      )({
        tool_name: 'list-custom-emojis',
        parameters: { [`$${parameter}`]: 'displayName' },
      });
      for (const result of [direct, discovery]) {
        expect(result.isError).toBe(true);
        expect(resultJson(result)).toMatchObject({
          error: 'invalid_query_parameter',
          parameter: `$${parameter}`,
        });
      }
      expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();
    }
  );

  it.each(imageFixtures)(
    'forwards $format contentBytes unchanged in a JSON create body',
    async ({ contentBytes }) => {
      register();
      const body = { displayName: 'example-emoji', contentBytes };
      const tool = buildToolsRegistry(false, true, new RegExp(enabledTools)).get(
        'create-custom-emoji'
      );
      const bodySchema = tool?.tool.parameters?.find(
        (parameter) => parameter.type === 'Body'
      )?.schema;
      expect(
        bodySchema,
        'generated create operation must expose a typed request body'
      ).toBeDefined();
      expect(bodySchema!.parse(body)).toEqual(body);
      expect(bodySchema!.safeParse({ ...body, contentBytes: 42 }).success).toBe(false);
      expect(bodySchema!.safeParse({ displayName: body.displayName }).success).toBe(false);
      expect(bodySchema!.safeParse({ contentBytes }).success).toBe(false);

      await handler('create-custom-emoji')({ body });

      expect(mockGraphClient.graphRequest).toHaveBeenCalledExactlyOnceWith(
        emojiPath,
        expect.objectContaining({ method: 'POST', apiVersion: 'beta', body: JSON.stringify(body) })
      );
    }
  );

  it('retains the optional confirmation gate for create', async () => {
    vi.stubEnv('MS365_MCP_REQUIRE_CONFIRM', 'true');
    register();
    const create = handler('create-custom-emoji');
    const body = { displayName: 'example-emoji', contentBytes: imageFixtures[0].contentBytes };
    const refused = await create({ body });

    expect(refused.isError).toBe(true);
    expect(resultJson(refused)).toMatchObject({ error: 'confirmation_required' });
    expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();

    await create({ body, confirm: true });
    expect(mockGraphClient.graphRequest).toHaveBeenCalledExactlyOnceWith(
      emojiPath,
      expect.objectContaining({ body: JSON.stringify(body), apiVersion: 'beta' })
    );
  });

  it('discovers both operations and executes create through the same beta route', async () => {
    registerDiscovery();
    const result = resultJson<{ tools: Array<{ name: string; description: string }> }>(
      await handler('search-tools', true)({ query: 'custom emoji' })
    );
    expect(result.tools.map((tool) => tool.name).sort()).toEqual([...toolNames].sort());
    expect(result.tools.every((tool) => tool.description.startsWith('[beta]'))).toBe(true);

    const body = { displayName: 'example-emoji', contentBytes: imageFixtures[1].contentBytes };
    await handler('execute-tool', true)({ tool_name: 'create-custom-emoji', parameters: { body } });
    expect(mockGraphClient.graphRequest).toHaveBeenCalledExactlyOnceWith(
      emojiPath,
      expect.objectContaining({ method: 'POST', apiVersion: 'beta', body: JSON.stringify(body) })
    );
  });

  it('keeps create absent in read-only mode even with its scope explicitly allowed', async () => {
    const allowedScopes = `${readScope} ${createScope}`;
    expect(register(true, true, allowedScopes)).toEqual(['list-custom-emojis']);
    registerDiscovery(true, true, allowedScopes);
    const result = resultJson<{ tools: Array<{ name: string }> }>(
      await handler('search-tools', true)({ query: 'custom emoji' })
    );
    expect(result.tools.map((tool) => tool.name)).toEqual(['list-custom-emojis']);
    const denied = await handler(
      'execute-tool',
      true
    )({
      tool_name: 'create-custom-emoji',
      parameters: {
        body: { displayName: 'example-emoji', contentBytes: imageFixtures[0].contentBytes },
        confirm: true,
      },
    });
    expect(denied.isError).toBe(true);
    expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('exposes neither operation outside org mode', () => {
    expect(register(false, false, `${readScope} ${createScope}`)).toEqual([]);
    expect(buildToolsRegistry(false, false, new RegExp(enabledTools)).size).toBe(0);
  });

  it.each([
    { scopes: readScope, expected: ['list-custom-emojis'] },
    { scopes: createScope, expected: ['create-custom-emoji'] },
    { scopes: `${readScope} ${createScope}`, expected: toolNames },
    { scopes: 'User.Read', expected: [] },
  ])('requires the separate delegated permission: $scopes', ({ scopes, expected }) => {
    expect(register(false, true, scopes).sort()).toEqual([...expected].sort());
    expect(
      [...buildToolsRegistry(false, true, new RegExp(enabledTools), scopes).keys()].sort()
    ).toEqual([...expected].sort());
  });
});

describe('Teams custom emoji scope and preset boundaries', () => {
  it('requests read and create as separate scopes, without .All permissions', () => {
    expect(resolveAuthScopes({ orgMode: true, enabledTools }).sort()).toEqual(
      [createScope, readScope].sort()
    );
    expect(resolveAuthScopes({ orgMode: true, enabledTools: '^list-custom-emojis$' })).toEqual([
      readScope,
    ]);
    expect(resolveAuthScopes({ orgMode: true, enabledTools: '^create-custom-emoji$' })).toEqual([
      createScope,
    ]);
  });

  it('never requests create permission for the read-only surface, even when allowed', () => {
    const diagnostics = buildAllowedScopeDiagnostics({
      orgMode: true,
      enabledTools,
      readOnly: true,
      allowedScopes: `${readScope} ${createScope}`,
    });
    expect(diagnostics.effectivePermissions).toEqual([readScope]);
    expect(diagnostics.disabledTools).toEqual([]);
  });

  it('does not request custom emoji scopes for personal accounts', () => {
    expect(resolveAuthScopes({ orgMode: false, enabledTools })).toEqual([]);
  });

  it.each(['teams', 'work'])('makes both tools available in the %s preset', (preset) => {
    for (const name of toolNames) expect(name).toMatch(TOOL_CATEGORIES[preset].pattern);
    expect(TOOL_CATEGORIES[preset].requiresOrgMode).toBe(true);
  });

  it('keeps both tools outside the send-only teams-write preset', () => {
    for (const name of toolNames) expect(name).not.toMatch(TOOL_CATEGORIES['teams-write'].pattern);
  });
});

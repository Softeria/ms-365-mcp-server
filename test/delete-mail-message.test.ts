import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphClient } from '../src/graph-client.js';
import { api } from '../src/generated/client.js';
import { api as betaApi } from '../src/generated/client-beta.js';
import {
  buildToolsRegistry,
  deriveOverrideEndpoints,
  generatedPathFor,
  registerGraphTools,
} from '../src/graph-tools.js';

// Graph's DELETE /me/messages/{id} is Outlook's Shift+Delete: the message skips Deleted
// Items and lands in Recoverable Items. delete-mail-message is Outlook's Delete (a move to
// Deleted Items); permanently-delete-mail-message is the DELETE.

type Handler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

function registerAll(graphClient: GraphClient): Map<string, { handler: Handler; schema: unknown }> {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const tools = new Map<string, { handler: Handler; schema: unknown }>();
  vi.spyOn(server, 'registerTool').mockImplementation(((
    name: string,
    def: { inputSchema: unknown },
    handler: Handler
  ) => {
    tools.set(name, { handler, schema: def.inputSchema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
  }) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);
  registerGraphTools(server, graphClient, { orgMode: true });
  return tools;
}

function mockGraphClient() {
  return {
    graphRequest: vi.fn(async () => ({
      content: [{ type: 'text', text: JSON.stringify({ id: 'moved-id' }) }],
    })),
    serialize: vi.fn((data: unknown) => JSON.stringify(data)),
  } as unknown as GraphClient & { graphRequest: ReturnType<typeof vi.fn> };
}

const endpointsJson = JSON.parse(
  readFileSync(new URL('../src/endpoints.json', import.meta.url), 'utf8')
) as Array<{
  toolName: string;
  requestOverride?: unknown;
}>;

describe('delete-mail-message and permanently-delete-mail-message', () => {
  afterEach(() => {
    delete process.env.MS365_MCP_REQUIRE_CONFIRM;
    vi.restoreAllMocks();
  });

  it('every requestOverride entry in the shipped endpoints.json resolves to a generated operation', () => {
    const report = vi.fn();
    const derived = deriveOverrideEndpoints(
      endpointsJson as never,
      { v1: api.endpoints, beta: betaApi.endpoints },
      report
    );
    expect(report).not.toHaveBeenCalled();
    const expected = endpointsJson.filter((e) => e.requestOverride).map((e) => e.toolName);
    expect(expected).toContain('delete-mail-message');
    expect(derived.map((d) => d.alias).sort()).toEqual(expected.sort());
  });

  it('reports and skips an override whose operation is not generated', () => {
    const report = vi.fn();
    const derived = deriveOverrideEndpoints(
      [
        {
          pathPattern: '/me/no/such/{thing-id}',
          method: 'delete',
          toolName: 'no-such-tool',
          requestOverride: { method: 'post', path: '/me/no/such/{thing-id}/move' },
        },
      ] as never,
      { v1: api.endpoints, beta: betaApi.endpoints },
      report
    );
    expect(derived).toEqual([]);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toContain('no-such-tool');
  });

  it('converts endpoints.json path params to the generated form', () => {
    expect(generatedPathFor('/me/messages/{message-id}/move')).toBe('/me/messages/:messageId/move');
    expect(generatedPathFor('/me/mailFolders/{mailFolder-id}/messages/{message-id}')).toBe(
      '/me/mailFolders/:mailFolderId/messages/:messageId'
    );
  });

  it('both tools are in the registry with the DELETE operation schema; neither in read-only mode', () => {
    const registry = buildToolsRegistry(false, true);
    const del = registry.get('delete-mail-message');
    const perm = registry.get('permanently-delete-mail-message');
    expect(del).toBeDefined();
    expect(perm).toBeDefined();
    expect(perm!.tool.method).toBe('delete');
    expect(perm!.tool.path).toBe('/me/messages/:messageId');
    expect(del!.tool.method).toBe('delete');
    expect(del!.tool.path).toBe('/me/messages/:messageId');
    expect(del!.tool.parameters.map((p) => p.name)).not.toContain('body');
    expect(del!.config?.requestOverride).toEqual({
      method: 'post',
      path: '/me/messages/{message-id}/move',
      body: { destinationId: 'deleteditems' },
    });
    expect(perm!.config?.requestOverride).toBeUndefined();

    const readOnly = buildToolsRegistry(true, true);
    expect(readOnly.has('delete-mail-message')).toBe(false);
    expect(readOnly.has('permanently-delete-mail-message')).toBe(false);
  });

  it('delete-mail-message moves the message to deleteditems', async () => {
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    const result = await tools.get('delete-mail-message')!.handler({ messageId: 'AAMk=abc/def' });
    expect(result.isError).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    const [path, options] = graphClient.graphRequest.mock.calls[0] as [
      string,
      { method: string; body?: string },
    ];
    expect(path).toBe('/me/messages/AAMk=abc%2Fdef/move');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ destinationId: 'deleteditems' });
  });

  it('delete-mail-message ignores a caller-supplied destination', async () => {
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    await tools
      .get('delete-mail-message')!
      .handler({ messageId: 'abc', body: { destinationId: 'inbox' } });
    const [, options] = graphClient.graphRequest.mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(options.body as string)).toEqual({ destinationId: 'deleteditems' });
  });

  it('permanently-delete-mail-message sends the DELETE with no body', async () => {
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    await tools.get('permanently-delete-mail-message')!.handler({ messageId: 'abc' });
    const [path, options] = graphClient.graphRequest.mock.calls[0] as [
      string,
      { method: string; body?: string },
    ];
    expect(path).toBe('/me/messages/abc');
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
  });

  it('both tools sit behind the confirm gate', async () => {
    process.env.MS365_MCP_REQUIRE_CONFIRM = 'true';
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    for (const name of ['delete-mail-message', 'permanently-delete-mail-message']) {
      const refused = await tools.get(name)!.handler({ messageId: 'abc' });
      expect(refused.isError).toBe(true);
      expect(JSON.parse(refused.content[0].text).error).toBe('confirmation_required');
    }
    expect(graphClient.graphRequest).not.toHaveBeenCalled();
    await tools.get('delete-mail-message')!.handler({ messageId: 'abc', confirm: true });
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
  });
});

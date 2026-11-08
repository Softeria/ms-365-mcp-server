import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphClient } from '../src/graph-client.js';
import { api } from '../src/generated/client.js';
import { api as betaApi } from '../src/generated/client-beta.js';
import {
  buildToolsRegistry,
  deriveFixedBodyEndpoints,
  generatedPathFor,
  registerGraphTools,
} from '../src/graph-tools.js';
import { describeToolSchema } from '../src/lib/tool-schema.js';

// Graph's DELETE /me/messages/{id} is Outlook's Shift+Delete: the message skips Deleted
// Items and lands in Recoverable Items. delete-mail-message is Outlook's Delete, a move to
// Deleted Items; delete-mail-message-skip-deleted-items is the DELETE.
const SKIP = 'delete-mail-message-skip-deleted-items';

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

function lastRequest(graphClient: ReturnType<typeof mockGraphClient>) {
  return graphClient.graphRequest.mock.calls.at(-1) as [string, { method: string; body?: string }];
}

const endpointsJson = JSON.parse(
  readFileSync(new URL('../src/endpoints.json', import.meta.url), 'utf8')
) as Array<{ toolName: string; fixedBody?: unknown }>;

describe('delete-mail-message and delete-mail-message-skip-deleted-items', () => {
  afterEach(() => {
    delete process.env.MS365_MCP_REQUIRE_CONFIRM;
    vi.restoreAllMocks();
  });

  it('every fixedBody entry in the shipped endpoints.json resolves to a generated operation', () => {
    const report = vi.fn();
    const derived = deriveFixedBodyEndpoints(
      endpointsJson as never,
      { v1: api.endpoints, beta: betaApi.endpoints },
      report
    );
    expect(report).not.toHaveBeenCalled();
    const expected = endpointsJson.filter((e) => e.fixedBody).map((e) => e.toolName);
    expect(expected).toContain('delete-mail-message');
    expect(derived.map((d) => d.alias).sort()).toEqual(expected.sort());
  });

  it('reports and skips an entry whose operation is not generated', () => {
    const report = vi.fn();
    const derived = deriveFixedBodyEndpoints(
      [
        {
          pathPattern: '/me/no/such/{thing-id}',
          method: 'post',
          toolName: 'no-such-tool',
          fixedBody: { a: 1 },
        },
      ] as never,
      { v1: api.endpoints, beta: betaApi.endpoints },
      report
    );
    expect(derived).toEqual([]);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toContain('no-such-tool');
  });

  it('leaves out a disabled entry, as the generator does', () => {
    const report = vi.fn();
    const derived = deriveFixedBodyEndpoints(
      [
        {
          pathPattern: '/me/messages/{message-id}/move',
          method: 'post',
          toolName: 'disabled-tool',
          fixedBody: { destinationId: 'archive' },
          disabled: true,
        },
      ] as never,
      { v1: api.endpoints, beta: betaApi.endpoints },
      report
    );
    expect(derived).toEqual([]);
    expect(report).not.toHaveBeenCalled();
  });

  it('converts endpoints.json path params to the generated form', () => {
    expect(generatedPathFor('/me/messages/{message-id}/move')).toBe('/me/messages/:messageId/move');
    expect(generatedPathFor('/me/mailFolders/{mailFolder-id}/messages/{message-id}')).toBe(
      '/me/mailFolders/:mailFolderId/messages/:messageId'
    );
  });

  it('delete-mail-message is the move operation without its body param; neither tool is in read-only mode', () => {
    const registry = buildToolsRegistry(false, true);
    const del = registry.get('delete-mail-message')!;
    const skip = registry.get(SKIP)!;
    const move = registry.get('move-mail-message')!;
    expect(del.tool.method).toBe('post');
    expect(del.tool.path).toBe('/me/messages/:messageId/move');
    expect(del.tool.parameters.map((p) => p.name)).not.toContain('body');
    expect(del.config?.fixedBody).toEqual({ destinationId: 'deleteditems' });
    // The copy leaves the operation it came from alone
    expect(move.tool.parameters.map((p) => p.name)).toContain('body');
    expect(move.config?.fixedBody).toBeUndefined();
    expect(skip.tool.method).toBe('delete');
    expect(skip.tool.path).toBe('/me/messages/:messageId');

    const readOnly = buildToolsRegistry(true, true);
    expect(readOnly.has('delete-mail-message')).toBe(false);
    expect(readOnly.has(SKIP)).toBe(false);
  });

  it('discovery mode describes the request delete-mail-message sends', () => {
    const entry = buildToolsRegistry(false, true).get('delete-mail-message')!;
    const described = describeToolSchema(entry.tool, entry.config);
    expect(described.method).toBe('POST');
    expect(described.path).toBe('/me/messages/:messageId/move');
    const names = described.parameters.map((p) => p.name);
    expect(names).not.toContain('body');
    expect(names).toContain('confirm');
  });

  it('delete-mail-message moves the message to deleteditems', async () => {
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    const result = await tools.get('delete-mail-message')!.handler({ messageId: 'AAMk=abc/def' });
    expect(result.isError).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    const [path, options] = lastRequest(graphClient);
    expect(path).toBe('/me/messages/AAMk=abc%2Fdef/move');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ destinationId: 'deleteditems' });
  });

  it('delete-mail-message ignores a caller-supplied destination', async () => {
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    const del = tools.get('delete-mail-message')!;
    await del.handler({ messageId: 'abc', body: { destinationId: 'inbox' } });
    expect(JSON.parse(lastRequest(graphClient)[1].body as string)).toEqual({
      destinationId: 'deleteditems',
    });
    await del.handler({ messageId: 'abc', destinationId: 'inbox' });
    expect(JSON.parse(lastRequest(graphClient)[1].body as string)).toEqual({
      destinationId: 'deleteditems',
    });
  });

  it('delete-mail-message-skip-deleted-items sends the DELETE with no body', async () => {
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    await tools.get(SKIP)!.handler({ messageId: 'abc' });
    const [path, options] = lastRequest(graphClient);
    expect(path).toBe('/me/messages/abc');
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
  });

  it('both tools sit behind the confirm gate', async () => {
    process.env.MS365_MCP_REQUIRE_CONFIRM = 'true';
    const graphClient = mockGraphClient();
    const tools = registerAll(graphClient);
    for (const name of ['delete-mail-message', SKIP]) {
      const refused = await tools.get(name)!.handler({ messageId: 'abc' });
      expect(refused.isError).toBe(true);
      expect(JSON.parse(refused.content[0].text).error).toBe('confirmation_required');
    }
    expect(graphClient.graphRequest).not.toHaveBeenCalled();
    await tools.get('delete-mail-message')!.handler({ messageId: 'abc', confirm: true });
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
  });
});

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphClient } from '../src/graph-client.js';
import { registerDiscoveryTools, registerGraphTools } from '../src/graph-tools.js';
import type { GraphToolRegistrationOptions } from '../src/graph-tools.js';

vi.mock('../src/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
const clients: Client[] = [];
afterEach(async () => {
  delete process.env.MS365_MCP_REQUIRE_CONFIRM;
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

async function connect(options: GraphToolRegistrationOptions, discovery = true) {
  const graphRequest = vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: '{"value":[]}' }] });
  const graph = { graphRequest } as unknown as GraphClient;
  const server = new McpServer({ name: 'hybrid-test', version: '1' });
  if (discovery) registerDiscoveryTools(server, graph, options);
  else registerGraphTools(server, graph, options);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: 'test-client', version: '1' });
  await client.connect(b);
  clients.push(client);
  return { client, graphRequest };
}
const filter = '^(list-mail-messages|send-mail|list-users|download-bytes)$';

describe('hybrid discovery', () => {
  it('leaves plain discovery at three tools', async () => {
    const { client } = await connect({ orgMode: true, httpMode: true, enabledTools: filter });
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
      'search-tools',
      'get-tool-schema',
      'execute-tool',
    ]);
  });
  it('exposes only selected tools alongside complete discovery', async () => {
    const { client } = await connect({
      orgMode: true,
      httpMode: true,
      enabledTools: filter,
      eagerTools: ['list-mail-messages', 'download-bytes', 'list-mail-messages'],
    });
    const tools = (await client.listTools()).tools;
    expect(tools.map((t) => t.name)).toEqual([
      'list-mail-messages',
      'download-bytes',
      'search-tools',
      'get-tool-schema',
      'execute-tool',
    ]);
    const search = await client.callTool({
      name: 'search-tools',
      arguments: { query: 'send mail' },
    });
    expect(JSON.stringify(search)).toContain('send-mail');
    const eagerSearch = await client.callTool({
      name: 'search-tools',
      arguments: { query: 'list mail messages' },
    });
    expect(JSON.stringify(eagerSearch)).toContain('list-mail-messages');
  });
  it('preserves direct schemas and execution on both paths', async () => {
    const options = { orgMode: true, httpMode: true, enabledTools: filter };
    const normal = await connect(options, false);
    const hybrid = await connect({ ...options, eagerTools: ['list-mail-messages'] });
    const schema = async (client: Client) =>
      (await client.listTools()).tools.find((t) => t.name === 'list-mail-messages');
    expect(await schema(hybrid.client)).toEqual(await schema(normal.client));
    const args = { top: 2, select: 'id' };
    const direct = await hybrid.client.callTool({ name: 'list-mail-messages', arguments: args });
    const discovered = await hybrid.client.callTool({
      name: 'execute-tool',
      arguments: { tool_name: 'list-mail-messages', parameters: args },
    });
    expect(discovered).toEqual(direct);
    expect(hybrid.graphRequest).toHaveBeenCalledTimes(2);
    expect(hybrid.graphRequest.mock.calls[0]).toEqual(hybrid.graphRequest.mock.calls[1]);
  });
  it('cannot restore tools excluded by global filters or read-only mode', async () => {
    const { client, graphRequest } = await connect({
      orgMode: true,
      httpMode: true,
      readOnly: true,
      enabledTools: '^list-mail-messages$',
      eagerTools: ['send-mail', 'list-users'],
    });
    expect((await client.listTools()).tools.map((t) => t.name)).not.toContain('send-mail');
    const denied = await client.callTool({
      name: 'execute-tool',
      arguments: { tool_name: 'send-mail', parameters: { confirm: true } },
    });
    expect(denied.isError).toBe(true);
    expect(graphRequest).not.toHaveBeenCalled();
  });
  it('cannot restore scope-denied or HTTP-local tools', async () => {
    const { client } = await connect({
      orgMode: true,
      httpMode: true,
      allowedScopes: 'Mail.Read',
      eagerTools: ['send-mail', 'download-bytes-to-file'],
    });
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).not.toContain('send-mail');
    expect(names).not.toContain('download-bytes-to-file');
  });
  it('retains mutation confirmation on both paths', async () => {
    process.env.MS365_MCP_REQUIRE_CONFIRM = 'true';
    const { client, graphRequest } = await connect({
      orgMode: true,
      httpMode: true,
      enabledTools: filter,
      eagerTools: ['send-mail'],
    });
    for (const name of ['send-mail', 'execute-tool']) {
      const arguments_ =
        name === 'send-mail' ? { body: {} } : { tool_name: 'send-mail', parameters: { body: {} } };
      expect((await client.callTool({ name, arguments: arguments_ })).isError).toBe(true);
    }
    expect(graphRequest).not.toHaveBeenCalled();
    await client.callTool({ name: 'send-mail', arguments: { body: {}, confirm: true } });
    await client.callTool({
      name: 'execute-tool',
      arguments: { tool_name: 'send-mail', parameters: { body: {}, confirm: true } },
    });
    expect(graphRequest).toHaveBeenCalledTimes(2);
  });
  it('isolates a failed direct registration while preserving discovery', async () => {
    const server = new McpServer({ name: 'failure-test', version: '1' });
    const register = vi.spyOn(server, 'registerTool').mockImplementationOnce(() => {
      throw new Error('Synthetic registration failure');
    });
    registerDiscoveryTools(server, {} as GraphClient, {
      orgMode: true,
      httpMode: true,
      enabledTools: filter,
      eagerTools: ['list-mail-messages'],
    });
    register.mockRestore();
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const client = new Client({ name: 'failure-client', version: '1' });
    await client.connect(b);
    clients.push(client);
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
      'search-tools',
      'get-tool-schema',
      'execute-tool',
    ]);
    const schema = await client.callTool({
      name: 'get-tool-schema',
      arguments: { tool_name: 'list-mail-messages' },
    });
    expect(schema.isError).not.toBe(true);
  });

  it('rejects unknown eager names before exposing a server', () => {
    expect(() =>
      registerDiscoveryTools(new McpServer({ name: 'test', version: '1' }), {} as GraphClient, {
        eagerTools: ['not-a-tool'],
      })
    ).toThrow('Unknown eager tool names');
  });
});

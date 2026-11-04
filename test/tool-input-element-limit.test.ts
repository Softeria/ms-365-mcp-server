/**
 * GHSA-46jr-4wx8-v453: SDK 1.32 can cap the elements in a tool call's
 * arguments before Zod validates them, but only when the server opts in.
 * This drives the McpServer that server.ts builds, so it fails if the
 * option stops being wired in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import MicrosoftGraphServer, { MAX_TOOL_INPUT_ELEMENTS } from '../src/server.js';
import type AuthManager from '../src/auth.js';
import { clearSecretsCache } from '../src/secrets.js';

vi.mock('../src/graph-tools.js', () => ({
  registerDiscoveryTools: vi.fn(),
  registerGraphTools: vi.fn((server: McpServer) => {
    server.tool('echo-values', 'Counts values', { values: z.array(z.string()) }, async (args) => ({
      content: [{ type: 'text', text: String(args.values.length) }],
    }));
    // Same body shape as update-excel-range.
    const grid = z.array(z.array(z.union([z.string(), z.number()])));
    server.tool(
      'echo-range',
      'Counts cells',
      { body: z.object({ values: grid, numberFormat: grid.optional() }) },
      async (args) => ({
        content: [{ type: 'text', text: String(args.body.values.flat().length) }],
      })
    );
  }),
}));
vi.mock('../src/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

async function connectedClient(): Promise<Client> {
  const authManager = {
    isMultiAccount: vi.fn().mockResolvedValue(false),
    listAccounts: vi.fn().mockResolvedValue([]),
    isOAuthModeEnabled: vi.fn().mockReturnValue(false),
  } as unknown as AuthManager;
  const graphServer = new MicrosoftGraphServer(authManager, {});
  await graphServer.initialize('test');
  const server = (graphServer as unknown as { server: McpServer }).server;
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
  return client;
}

describe('tool input element ceiling', () => {
  beforeEach(() => {
    process.env.MS365_MCP_CLIENT_ID = 'test-client-id';
    process.env.MS365_MCP_TENANT_ID = 'test-tenant';
    delete process.env.MS365_MCP_KEYVAULT_URL;
    clearSecretsCache();
  });

  afterEach(() => {
    delete process.env.MS365_MCP_CLIENT_ID;
    delete process.env.MS365_MCP_TENANT_ID;
    clearSecretsCache();
  });

  it('accepts arguments at the ceiling', async () => {
    const client = await connectedClient();
    // The `values` key counts as one element.
    const values = Array.from({ length: MAX_TOOL_INPUT_ELEMENTS - 1 }, () => 'x');
    const result = await client.callTool({ name: 'echo-values', arguments: { values } });
    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([{ type: 'text', text: String(values.length) }]);
  });

  it('accepts a 100×100 Excel write with values and numberFormat', async () => {
    const client = await connectedClient();
    const grid = (cell: string | number) =>
      Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => cell));
    // Each row array counts too: 2 × 100 × 101 + 3 keys = 20 203 elements.
    const result = await client.callTool({
      name: 'echo-range',
      arguments: { body: { values: grid(1), numberFormat: grid('0.00') } },
    });
    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([{ type: 'text', text: '10000' }]);
  });

  it('accepts a 1000×10 Excel write', async () => {
    const client = await connectedClient();
    const values = Array.from({ length: 1000 }, () => Array.from({ length: 10 }, () => 'x'));
    const result = await client.callTool({ name: 'echo-range', arguments: { body: { values } } });
    expect(result.isError).toBeFalsy();
  });

  it('rejects arguments over the ceiling before validating them', async () => {
    const client = await connectedClient();
    // Numbers fail z.string(), so without the ceiling Zod would build one
    // issue per element.
    const values = Array.from({ length: MAX_TOOL_INPUT_ELEMENTS + 1 }, (_, i) => i);
    const result = await client.callTool({ name: 'echo-values', arguments: { values } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain(
      `more than the maximum of ${MAX_TOOL_INPUT_ELEMENTS} elements`
    );
  });
});

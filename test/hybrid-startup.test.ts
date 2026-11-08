import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type AuthManager from '../src/auth.js';
import MicrosoftGraphServer from '../src/server.js';
import logger from '../src/logger.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  vi.clearAllMocks();
});

// HTTP creates a fresh MCP surface for every POST on one owning Graph server.
function requestSurface(owner: MicrosoftGraphServer): McpServer {
  return (owner as unknown as { createMcpServer(): McpServer }).createMcpServer();
}
async function connectSurface(server: McpServer) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: 'startup-test', version: '1' });
  await client.connect(b);
  clients.push(client);
  return client;
}
async function listSurface(server: McpServer) {
  return (await (await connectSurface(server)).listTools()).tools.map((tool) => tool.name);
}

describe('hybrid startup and HTTP diagnostics', () => {
  it.each([undefined, '127.0.0.1:3000'])('rejects unknown names before start (http=%s)', (http) => {
    expect(
      () =>
        new MicrosoftGraphServer({} as AuthManager, {
          http,
          discovery: true,
          eagerTools: ['unknown-eager-tool'],
        })
    ).toThrow('Unknown eager tool names: unknown-eager-tool');
  });
  it('logs unavailable selections once across HTTP surfaces, independently per owner', async () => {
    const options = {
      http: '127.0.0.1:3000',
      discovery: true,
      readOnly: true,
      enabledTools: '^list-mail-messages$',
      eagerTools: ['send-mail'],
    };
    const owner = new MicrosoftGraphServer({} as AuthManager, options);
    const first = await listSurface(requestSurface(owner));
    const second = await listSurface(requestSurface(owner));
    expect(second).toEqual(first);
    expect(first).toEqual(['search-tools', 'get-tool-schema', 'execute-tool']);
    const diagnostic = 'Eager tool send-mail is unavailable under the current filters or transport';
    const count = () =>
      vi.mocked(logger.info).mock.calls.filter(([message]) => message === diagnostic).length;
    expect(count()).toBe(1);
    await listSurface(requestSurface(new MicrosoftGraphServer({} as AuthManager, options)));
    expect(count()).toBe(2);
  });
});

describe('attachment URL initialization guidance', () => {
  it.each([
    [undefined, false, false],
    [undefined, true, false],
    ['127.0.0.1:3000', false, false],
    ['127.0.0.1:3000', true, true],
  ] as const)(
    'reflects effective capability (http=%s, enabled=%s)',
    async (http, enableAttachmentUrls, enabled) => {
      for (const discovery of [false, true]) {
        const owner = new MicrosoftGraphServer({} as AuthManager, {
          http,
          enableAttachmentUrls,
          discovery,
          enabledTools: '^list-mail-attachments$',
        });
        const client = await connectSurface(requestSurface(owner));
        expect(client.getInstructions()?.includes('Attachment URLs are enabled')).toBe(enabled);
        expect(client.getInstructions()?.includes('DISCOVERY MODE ADD-ON')).toBe(discovery);
        expect(client.getInstructions()).toContain(
          'In stdio mode (or HTTP with --http-local-file-tools)'
        );
      }
    }
  );
});

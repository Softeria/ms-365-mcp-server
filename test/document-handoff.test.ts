import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { registerGraphTools } from '../src/graph-tools.js';
import {
  configureAttachmentMinting,
  resetAttachmentMinting,
} from '../src/lib/attachment-minting.js';
import { AttachmentTicketStore } from '../src/lib/attachment-tickets.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

afterEach(() => {
  resetAttachmentMinting();
  vi.restoreAllMocks();
});

it('hands synthetic attachment metadata and a URL to an external reader without binary content', async () => {
  const auth = {
    getToken: vi.fn().mockResolvedValue('synthetic-token'),
    getTokenForAccount: vi.fn().mockResolvedValue('synthetic-token'),
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
  };
  const graphClient = new GraphClient(auth as never, {
    clientId: 'synthetic-client',
    tenantId: 'synthetic-tenant',
    cloudType: 'global',
  });
  configureAttachmentMinting({
    store: new AttachmentTicketStore(120),
    config: { base: 'http://example.invalid', keyId: '1', ttlSeconds: 120 },
  });
  const metadata = {
    id: 'example-attachment',
    name: 'example.pdf',
    contentType: 'application/pdf',
    size: 75000,
    isInline: false,
  };
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ value: [metadata] }), {
        headers: { 'content-type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ name: metadata.name, contentType: metadata.contentType }), {
        headers: { 'content-type': 'application/json' },
      })
    );
  const server = new McpServer({ name: 'handoff-test', version: '1' });
  registerGraphTools(server, graphClient, {
    authManager: auth as never,
    enabledTools: '^(list-mail-attachments|get-download-url)$',
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: 'synthetic-reader', version: '1' });
  await client.connect(b);
  try {
    const tools = (await client.listTools()).tools;
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(['list-mail-attachments', 'get-download-url'])
    );
    const listing = await client.callTool({
      name: 'list-mail-attachments',
      arguments: {
        messageId: 'example-message',
        select: 'id,name,contentType,size,isInline',
      },
    });
    expect(listing.isError, JSON.stringify(listing)).not.toBe(true);
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('$select')).toBe(
      'id,name,contentType,size,isInline'
    );
    const selected = JSON.parse((listing.content as { text: string }[])[0].text).value[0];
    const url = await client.callTool({
      name: 'get-download-url',
      arguments: {
        target: `/me/messages/example-message/attachments/${selected.id}/$value`,
      },
    });
    expect(url.isError).not.toBe(true);
    const handoff = JSON.parse((url.content as { text: string }[])[0].text);
    expect(handoff.downloadUrl).toMatch(/^http:\/\/example\.invalid\/attachment\?t=/);
    expect(fetch).toHaveBeenCalledTimes(2); // Metadata only; the external reader fetches bytes.
    expect(JSON.stringify([listing, url])).not.toMatch(/contentBytes|base64|synthetic-token/);
  } finally {
    await client.close();
    await server.close();
  }
});

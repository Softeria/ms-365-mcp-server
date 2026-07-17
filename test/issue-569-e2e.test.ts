import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../src/generated/client.js', async () => {
  const { z } = await import('zod');
  return {
    api: {
      endpoints: [
        {
          alias: 'create-draft-email',
          method: 'post',
          path: '/me/messages',
          description: 'Create a draft email.',
          parameters: [
            {
              name: 'body',
              type: 'Body',
              schema: z.object({
                subject: z.string().nullish(),
                body: z
                  .object({
                    contentType: z.enum(['text', 'html']).optional(),
                    content: z.string().nullish(),
                  })
                  .nullish(),
                toRecipients: z
                  .array(
                    z.object({
                      emailAddress: z.object({ address: z.string().optional() }).optional(),
                    })
                  )
                  .nullish(),
              }),
            },
          ],
        },
      ],
    },
  };
});

// #569: clients flatten message fields into top-level tool args, and the SDK strips
// unknown keys during validation BEFORE the handler runs. So this test must go through
// a real McpServer + transport, not call the handler directly
describe('issue #569 end-to-end (through MCP SDK validation)', () => {
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ id: 'draft-1' }) }],
      }),
    } as unknown as GraphClient;
  });

  async function connectedClient(): Promise<Client> {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    registerGraphTools(server, mockGraphClient, false);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);
    return client;
  }

  it('flattened subject/toRecipients survive SDK validation and reach Graph', async () => {
    const client = await connectedClient();

    const result = await client.callTool({
      name: 'create-draft-email',
      arguments: {
        subject: 'Hello',
        body: { contentType: 'text', content: 'Hi there' },
        toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
      },
    });

    expect(result.isError).toBeFalsy();
    const options = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      body: string;
    };
    expect(JSON.parse(options.body)).toEqual({
      subject: 'Hello',
      body: { contentType: 'text', content: 'Hi there' },
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    });
  });

  it('a correctly nested full message still works through the SDK', async () => {
    const client = await connectedClient();

    const message = {
      subject: 'Hello',
      body: { contentType: 'text', content: 'Hi there' },
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    };
    await client.callTool({ name: 'create-draft-email', arguments: { body: message } });

    const options = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      body: string;
    };
    expect(JSON.parse(options.body)).toEqual(message);
  });
});

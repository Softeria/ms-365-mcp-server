import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Runs against the real generated schemas on purpose: the mocked suite in
// body-field-fallback.test.ts can't show that spec-derived shapes are trimmed subsets,
// which is exactly what decides whether a body gets nested (#620)
describe('Misplaced request body wrapping (issue #620)', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // This suite asserts exact sent bodies; keep the Teams message signoff
    // (message-signoff.test.ts) out of the picture.
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '');
    mockServer = { tool: vi.fn(), registerTool: vi.fn() };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{}' }] }),
    } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    registerGraphTools(mockServer, mockGraphClient, false, undefined, true);
    const call = mockServer.registerTool.mock.calls.find((c: unknown[]) => c[0] === toolName);
    expect(call).toBeDefined();
    return call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>;
  }

  function sentBody(): Record<string, unknown> {
    const options = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      body: string;
    };
    return JSON.parse(options.body);
  }

  it('nests an itemBody passed as the whole body of send-chat-message', async () => {
    const handler = getToolHandler('send-chat-message');

    await handler({
      chatId: '19:abc@unq.gbl.spaces',
      body: { contentType: 'html', content: '<p>test</p>' },
    });

    expect(sentBody()).toEqual({ body: { contentType: 'html', content: '<p>test</p>' } });
  });

  it('leaves isRead alone even though the trimmed message schema omits it', async () => {
    const handler = getToolHandler('update-mail-message');

    await handler({ messageId: 'AAMk123', body: { isRead: true } });

    expect(sentBody()).toEqual({ isRead: true });
  });

  it('nests an itemBody passed as the whole body of create-draft-email', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { contentType: 'text', content: 'Hi there' } });

    expect(sentBody()).toEqual({ body: { contentType: 'text', content: 'Hi there' } });
  });

  it('leaves the body alone when the outer schema has no body field (send-mail)', async () => {
    const handler = getToolHandler('send-mail');

    await handler({ body: { contentType: 'html', content: 'Hi' } });

    expect(sentBody()).toEqual({ contentType: 'html', content: 'Hi' });
  });

  it('never touches graph-batch request bodies', async () => {
    const handler = getToolHandler('graph-batch');

    const requests = {
      requests: [
        { id: '1', method: 'POST', url: '/me/sendMail', body: { content: 'Hi' } },
        { id: '2', method: 'GET', url: '/me' },
      ],
    };
    await handler({ body: requests });

    expect(sentBody()).toEqual(requests);
  });

  it('leaves a correctly shaped message body untouched', async () => {
    const handler = getToolHandler('create-draft-email');

    const message = { subject: 'Hello', body: { contentType: 'text', content: 'Hi there' } };
    await handler({ body: message });

    expect(sentBody()).toEqual(message);
  });
});

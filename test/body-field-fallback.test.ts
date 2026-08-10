import { beforeEach, describe, expect, it, vi } from 'vitest';
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
              // Trimmed like the generated schemas: `isRead` is a real message field that
              // the spec-derived shape omits and passthrough carries to Graph anyway
              schema: z.object({
                id: z.string().optional(),
                createdDateTime: z.string().optional(),
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

describe('Flattened body field fallback (issue #569)', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { tool: vi.fn(), registerTool: vi.fn() };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ id: 'draft-1' }) }],
      }),
    } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    registerGraphTools(mockServer, mockGraphClient, false);
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

  it('merges flattened message fields and nests the body field (issue #569 repro)', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({
      subject: 'Hello',
      body: { contentType: 'text', content: 'Hi there' },
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    });

    expect(sentBody()).toEqual({
      subject: 'Hello',
      body: { contentType: 'text', content: 'Hi there' },
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    });
  });

  it('builds the body entirely from flattened fields when no body param is passed', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({
      subject: 'Hello',
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    });

    expect(sentBody()).toEqual({
      subject: 'Hello',
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    });
  });

  it('leaves a correctly nested full message body unchanged', async () => {
    const handler = getToolHandler('create-draft-email');

    const message = {
      subject: 'Hello',
      body: { contentType: 'text', content: 'Hi there' },
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
    };
    await handler({ body: message });

    expect(sentBody()).toEqual(message);
  });

  it('merges stray fields into an explicit message object, which wins on conflict', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({
      subject: 'stale top-level duplicate',
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
      body: { subject: 'explicit wins', body: { contentType: 'text', content: 'Hi' } },
    });

    expect(sentBody()).toEqual({
      subject: 'explicit wins',
      toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
      body: { contentType: 'text', content: 'Hi' },
    });
  });

  it('drops stray fields with a warning when the body is not an object', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ subject: 'Hello', body: 'raw string body' });

    const options = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      body: string;
    };
    expect(options.body).toBe('raw string body');
  });

  it('never merges read-only entity fields like id into the body', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ subject: 'Hello', id: 'AAMk-echoed-id' });

    expect(sentBody()).toEqual({ subject: 'Hello' });
  });

  it('excludes read-only fields sent in kebab-case too', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ subject: 'Hello', 'created-date-time': '2026-01-01T00:00:00Z' });

    expect(sentBody()).toEqual({ subject: 'Hello' });
  });

  it('merges an empty body object flat instead of nesting it as an empty itemBody', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ subject: 'Hello', body: {} });

    expect(sentBody()).toEqual({ subject: 'Hello' });
  });

  it('nests a misplaced itemBody when there are no stray fields to merge (issue #620)', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { contentType: 'html', content: '<p>test</p>' } });

    expect(sentBody()).toEqual({ body: { contentType: 'html', content: '<p>test</p>' } });
  });

  it('leaves a non-object body alone when there are no stray fields', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: 'raw string body' });

    const options = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      body: string;
    };
    expect(options.body).toBe('raw string body');
  });

  it('leaves an empty body object alone when there are no stray fields', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: {} });

    expect(sentBody()).toEqual({});
  });

  it('leaves a passthrough field the trimmed schema omits unwrapped (isRead stays top-level)', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { isRead: true } });

    expect(sentBody()).toEqual({ isRead: true });
  });

  it('moves only the itemBody keys and leaves a foreign sibling top-level', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { contentType: 'html', content: 'Hi', isRead: true } });

    expect(sentBody()).toEqual({ isRead: true, body: { contentType: 'html', content: 'Hi' } });
  });

  it('nests a misplaced itemBody whose keys arrive in PascalCase', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ subject: 'Hello', body: { Content: 'Hi', ContentType: 'html' } });

    expect(sentBody()).toEqual({
      subject: 'Hello',
      body: { Content: 'Hi', ContentType: 'html' },
    });
  });

  it('moves an @odata.type that names the itemBody into the body', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({
      body: { content: 'Hi', contentType: 'html', '@odata.type': '#microsoft.graph.itemBody' },
    });

    expect(sentBody()).toEqual({
      body: { content: 'Hi', contentType: 'html', '@odata.type': '#microsoft.graph.itemBody' },
    });
  });

  it('leaves an @odata.type that names the outer entity top-level', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({
      body: { content: 'Hi', '@odata.type': '#microsoft.graph.message' },
    });

    expect(sentBody()).toEqual({
      '@odata.type': '#microsoft.graph.message',
      body: { content: 'Hi' },
    });
  });

  it('leaves other OData annotations on the entity they came from', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { content: 'Hi', '@odata.etag': 'W/"abc"' } });

    expect(sentBody()).toEqual({ '@odata.etag': 'W/"abc"', body: { content: 'Hi' } });
  });

  it('preserves a __proto__ key instead of dropping it through the legacy setter', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: JSON.parse('{"content":"Hi","__proto__":{"polluted":true}}') });

    // Built with JSON.parse on both sides: a '__proto__' key in an object literal sets the
    // prototype instead of becoming an own property, so a literal can't express this
    expect(sentBody()).toEqual(
      JSON.parse('{"__proto__":{"polluted":true},"body":{"content":"Hi"}}')
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('declines to repair when the body carries a case-variant body key', async () => {
    const handler = getToolHandler('create-draft-email');

    const payload = { BODY: { content: 'wrong' }, content: 'intended' };
    await handler({ body: payload });

    expect(sentBody()).toEqual(payload);
  });

  it('never clobbers a body that already carries its own body field', async () => {
    const handler = getToolHandler('create-draft-email');

    const message = { body: { contentType: 'text', content: 'real body' }, content: 'stray' };
    await handler({ body: message });

    expect(sentBody()).toEqual(message);
  });

  it('leaves a passthrough field unwrapped even when stray fields are present', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ subject: 'Hello', body: { isRead: true } });

    expect(sentBody()).toEqual({ subject: 'Hello', isRead: true });
  });

  it('nests a misplaced itemBody carrying only content', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { content: 'Hi' } });

    expect(sentBody()).toEqual({ body: { content: 'Hi' } });
  });

  it('nests a misplaced itemBody carrying only contentType', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { contentType: 'html' } });

    expect(sentBody()).toEqual({ body: { contentType: 'html' } });
  });

  it('nests a misplaced itemBody while still merging stray fields (issue #569 + #620)', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({
      subject: 'Hello',
      body: { contentType: 'html', content: 'Hi' },
    });

    expect(sentBody()).toEqual({
      subject: 'Hello',
      body: { contentType: 'html', content: 'Hi' },
    });
  });

  it('does not double-wrap a body the case-Body safeParse already corrected', async () => {
    const handler = getToolHandler('create-draft-email');

    await handler({ body: { body: { contentType: 'html', content: 'Hi' } } });

    expect(sentBody()).toEqual({ body: { contentType: 'html', content: 'Hi' } });
  });
});

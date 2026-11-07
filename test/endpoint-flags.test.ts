import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphClient } from '../src/graph-client.js';
import { buildToolsRegistry, registerGraphTools } from '../src/graph-tools.js';
import { describeToolSchema } from '../src/lib/tool-schema.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Real endpoints.json and the real generated client: these pin which tools get each
// per-tool behavior, whatever the code reads it from.

type ToolHandler = (
  params: Record<string, unknown>
) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

const U1 = '11111111-2222-3333-4444-555555555555';
const shorthandBody = {
  body: { contentType: 'html', content: `Hi <at user-id="${U1}">Jane</at>` },
};

describe('per-tool behavior on the real tool surface', () => {
  let server: {
    tool: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
    server: object;
  };
  let graphClient: GraphClient;

  beforeEach(() => {
    vi.stubEnv('MS365_MCP_REQUIRE_CONFIRM', 'false');
    server = { tool: vi.fn(), registerTool: vi.fn(), server: {} };
    graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ id: 'm1' }) }],
      }),
      serialize: vi.fn((value) => JSON.stringify(value)),
    } as unknown as GraphClient;
    registerGraphTools(server, graphClient, { orgMode: true });
  });

  afterEach(() => vi.unstubAllEnvs());

  function registered(name: string) {
    const call = server.registerTool.mock.calls.find((c: unknown[]) => c[0] === name);
    expect(call, `tool ${name} should be registered`).toBeDefined();
    return {
      shape: (call![1] as { inputSchema: { shape: Record<string, unknown> } }).inputSchema.shape,
      handler: call![call!.length - 1] as ToolHandler,
    };
  }

  function sentBody() {
    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    return JSON.parse(options!.body as string);
  }

  it('offers the member name filter on exactly the team and chat member tools', () => {
    const withName = server.registerTool.mock.calls
      .filter(
        (c: unknown[]) => 'name' in (c[1] as { inputSchema: { shape: object } }).inputSchema.shape
      )
      .map((c: unknown[]) => c[0])
      .sort();
    expect(withName).toEqual(['list-chat-members', 'list-team-members']);
  });

  it('shows the member name filter in discovery mode too', () => {
    const withName = [...buildToolsRegistry(false, true)]
      .filter(([, entry]) =>
        describeToolSchema(entry.tool, entry.config).parameters.some((p) => p.name === 'name')
      )
      .map(([name]) => name)
      .sort();
    expect(withName).toEqual(['list-chat-members', 'list-team-members']);
  });

  it.each([
    ['send-channel-message', { teamId: 't1', channelId: 'c1' }],
    ['reply-to-channel-message', { teamId: 't1', channelId: 'c1', chatMessageId: 'm0' }],
    ['update-channel-message', { teamId: 't1', channelId: 'c1', chatMessageId: 'm0' }],
    [
      'update-channel-message-reply',
      { teamId: 't1', channelId: 'c1', chatMessageId: 'm0', chatMessageId1: 'r0' },
    ],
    ['send-chat-message', { chatId: 'c1' }],
    ['reply-to-chat-message', { chatId: 'c1', chatMessageId: 'm0' }],
    ['update-chat-message', { chatId: 'c1', chatMessageId: 'm0' }],
  ])('rewrites the <at user-id> mention shorthand on %s', async (name, pathParams) => {
    const result = await registered(name).handler({
      ...pathParams,
      body: shorthandBody,
      confirm: true,
    });
    expect(result.isError).not.toBe(true);
    const sent = sentBody();
    expect(sent.body.content).toBe('Hi <at id="0">Jane</at>');
    expect(sent.mentions).toEqual([
      {
        id: 0,
        mentionText: 'Jane',
        mentioned: { user: { id: U1, displayName: 'Jane', userIdentityType: 'aadUser' } },
      },
    ]);
  });

  it.each(['create-draft-email', 'create-calendar-event'])(
    'leaves the shorthand alone on %s, which is not a Teams message tool',
    async (name) => {
      await registered(name).handler({ body: shorthandBody, confirm: true });
      expect(sentBody().body.content).toBe(shorthandBody.body.content);
      expect(sentBody().mentions).toBeUndefined();
    }
  );

  it('filters list-team-members by name and keeps name out of the Graph request', async () => {
    vi.mocked(graphClient.graphRequest).mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            value: [
              { id: '1', displayName: 'Jane Doe', email: 'jane@contoso.com' },
              { id: '2', displayName: 'John Smith', email: 'john@contoso.com' },
            ],
          }),
        },
      ],
    });
    const result = await registered('list-team-members').handler({ teamId: 't1', name: 'jane' });
    expect(JSON.parse(result.content[0].text).value.map((m: { id: string }) => m.id)).toEqual([
      '1',
    ]);
    expect(vi.mocked(graphClient.graphRequest).mock.calls[0][0]).not.toContain('name');
  });

  it('rejects a list-chats page above its $top cap before calling Graph', async () => {
    const result = await registered('list-chats').handler({ top: 51 });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('invalid_query_parameter');
    expect(graphClient.graphRequest).not.toHaveBeenCalled();

    await registered('list-chats').handler({ top: 50 });
    expect(graphClient.graphRequest).toHaveBeenCalledOnce();
  });

  it('rejects $select on list-todo-tasks before calling Graph, and still sends $orderby', async () => {
    const tasks = registered('list-todo-tasks').handler;
    const result = await tasks({ todoTaskListId: 'l1', select: 'id,title' });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      error: 'invalid_query_parameter',
      parameter: '$select',
    });
    expect(graphClient.graphRequest).not.toHaveBeenCalled();

    await tasks({ todoTaskListId: 'l1', orderby: 'createdDateTime desc' });
    expect(vi.mocked(graphClient.graphRequest).mock.calls[0][0]).toContain(
      '$orderby=createdDateTime'
    );
  });
});

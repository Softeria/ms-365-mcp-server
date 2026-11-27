import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphClient } from '../src/graph-client.js';
import { buildToolsRegistry, registerGraphTools, UTILITY_TOOLS } from '../src/graph-tools.js';
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
    registerTool: ReturnType<typeof vi.fn>;
    server: object;
  };
  let graphClient: GraphClient;

  beforeEach(() => {
    vi.stubEnv('MS365_MCP_REQUIRE_CONFIRM', 'false');
    server = { registerTool: vi.fn(), server: {} };
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
    // Utility tools register through registerTool too; get-upload-url has its own name param.
    const utilityNames = new Set(UTILITY_TOOLS.map((t) => t.name));
    const withName = server.registerTool.mock.calls
      .filter((c: unknown[]) => !utilityNames.has(c[0] as string))
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

  const DELTA_TOKEN_TOOLS = [
    'get-drive-delta',
    'get-sharepoint-sites-delta',
    'list-sharepoint-site-list-items-delta',
    'list-todo-task-lists-delta',
  ];

  it('offers the delta token param on exactly the delta tools that page with token=', () => {
    const withToken = server.registerTool.mock.calls
      .filter(
        (c: unknown[]) => 'token' in (c[1] as { inputSchema: { shape: object } }).inputSchema.shape
      )
      .map((c: unknown[]) => c[0])
      .sort();
    expect(withToken).toEqual(DELTA_TOKEN_TOOLS);
  });

  it('shows the delta token param in discovery mode too', () => {
    const withToken = [...buildToolsRegistry(false, true)]
      .filter(([, entry]) =>
        describeToolSchema(entry.tool, entry.config).parameters.some((p) => p.name === 'token')
      )
      .map(([name]) => name)
      .sort();
    expect(withToken).toEqual(DELTA_TOKEN_TOOLS);
  });

  it('resumes list-sharepoint-site-list-items-delta from a deltaLink with token=', async () => {
    await registered('list-sharepoint-site-list-items-delta').handler({
      siteId: 's1',
      listId: 'l1',
      token: 'https://graph.microsoft.com/v1.0/sites/s1/lists/l1/items/delta?token=tok1',
    });
    const [path] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(path).toContain('/sites/s1/lists/l1/items/delta()?token=tok1');
  });

  it('resumes list-todo-task-lists-delta from a Graph deltaLink with $deltatoken', async () => {
    await registered('list-todo-task-lists-delta').handler({
      token: 'https://graph.microsoft.com/v1.0/me/todo/lists/delta?$deltatoken=todo-state-1',
    });
    const [path] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(path).toContain('/me/todo/lists/delta()?$deltatoken=todo-state-1');
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

  it('rejects unsupported list-chats count without calling Graph and preserves pagination', async () => {
    const chats = registered('list-chats');
    expect(chats.shape).not.toHaveProperty('count');
    const entry = buildToolsRegistry(false, true).get('list-chats')!;
    expect(
      describeToolSchema(entry.tool, entry.config).parameters.map((p) => p.name)
    ).not.toContain('count');

    const result = await chats.handler({ count: true });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      error: 'invalid_query_parameter',
      parameter: '$count',
    });
    expect(graphClient.graphRequest).not.toHaveBeenCalled();

    await chats.handler({ top: 50, skiptoken: 'next-page' });
    const url = vi.mocked(graphClient.graphRequest).mock.calls[0][0];
    expect(url).toContain('$top=50');
    expect(url).toContain('$skiptoken=next-page');
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

  it('surfaces If-Match for the SharePoint list item update in registration and discovery', () => {
    const shape = registered('update-sharepoint-list-item').shape;
    expect(Object.keys(shape).find((name) => name.toLowerCase() === 'if-match')).toBeDefined();
    expect(registered('list-mail-messages').shape['If-Match']).toBeUndefined();

    const entry = buildToolsRegistry(false, true).get('update-sharepoint-list-item');
    expect(entry).toBeDefined();
    const discovered = describeToolSchema(entry!.tool, entry!.config).parameters.find(
      (param) => param.name.toLowerCase() === 'if-match'
    );
    expect(discovered).toMatchObject({ in: 'Header', required: false, schema: { type: 'string' } });
  });

  it('forwards the SharePoint list item ETag as an If-Match request header', async () => {
    await registered('update-sharepoint-list-item').handler({
      siteId: 'site-1',
      listId: 'list-1',
      listItemId: 'item-1',
      body: { fields: { Title: 'Updated' } },
      'If-Match': '"item-etag,1"',
      confirm: true,
    });

    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(options?.headers).toMatchObject({ 'If-Match': '"item-etag,1"' });
  });

  it.each(['upload-file-content', 'create-upload-session', 'move-rename-onedrive-item'])(
    'surfaces If-Match for %s in registration and discovery',
    (toolName) => {
      expect(
        Object.keys(registered(toolName).shape).find((name) => name.toLowerCase() === 'if-match')
      ).toBeDefined();

      const entry = buildToolsRegistry(false, true).get(toolName);
      expect(entry).toBeDefined();
      const discovered = describeToolSchema(entry!.tool, entry!.config).parameters.find(
        (param) => param.name.toLowerCase() === 'if-match'
      );
      expect(discovered).toMatchObject({
        in: 'Header',
        required: false,
        schema: { type: 'string' },
      });
    }
  );

  it('forwards the file ETag as an If-Match header on a base64 file upload', async () => {
    await registered('upload-file-content').handler({
      driveId: 'drive-1',
      driveItemId: 'root:/docs/a.txt:',
      body: Buffer.from('hello').toString('base64'),
      'If-Match': '"file-etag,3"',
      confirm: true,
    });

    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(options?.headers).toMatchObject({
      'If-Match': '"file-etag,3"',
      'Content-Type': 'application/octet-stream',
    });
    expect(Buffer.isBuffer(options?.body)).toBe(true);
  });

  it('forwards the file ETag as an If-Match header when creating an upload session', async () => {
    await registered('create-upload-session').handler({
      driveId: 'drive-1',
      driveItemId: 'root:/docs/a.txt:',
      body: { item: { '@microsoft.graph.conflictBehavior': 'replace' } },
      'If-Match': '"file-etag,3"',
      confirm: true,
    });

    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(options?.headers).toMatchObject({ 'If-Match': '"file-etag,3"' });
  });

  it('forwards the file ETag as an If-Match header when renaming or moving a drive item', async () => {
    await registered('move-rename-onedrive-item').handler({
      driveId: 'drive-1',
      driveItemId: 'item-1',
      body: { name: 'renamed.txt' },
      'If-Match': '"file-etag,3"',
      confirm: true,
    });

    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(options?.headers).toMatchObject({ 'If-Match': '"file-etag,3"' });
  });

  it('sends no If-Match header on a file upload when none is given', async () => {
    await registered('upload-file-content').handler({
      driveId: 'drive-1',
      driveItemId: 'root:/docs/a.txt:',
      body: Buffer.from('hello').toString('base64'),
      confirm: true,
    });

    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(options?.headers).not.toHaveProperty('If-Match');
  });

  it.each([
    [{ search: '*' }, 'search=*'],
    [{ search: ' " * " ' }, 'search=*'],
    [{ search: '  *  ' }, 'search=*'],
    [{ $search: 'marketing' }, 'search=marketing'],
    [{ search: '"marketing team"' }, 'search="marketing team"'],
    [
      {
        search: '*',
        skiptoken: 'https://graph.microsoft.com/v1.0/sites?search=*&$skiptoken=s!abc',
      },
      '$skiptoken=s!abc&search=*',
    ],
  ])('sends the SharePoint site search as plain search: %o', async (params, query) => {
    await registered('search-sharepoint-sites').handler(params);
    const url = vi.mocked(graphClient.graphRequest).mock.calls[0][0];
    expect(decodeURIComponent(url)).toBe(`/sites?${query}`);
  });

  it('keeps $search on other search tools', async () => {
    await registered('list-users').handler({ search: '"displayName:jane"' });
    expect(decodeURIComponent(vi.mocked(graphClient.graphRequest).mock.calls[0][0])).toContain(
      '$search='
    );
  });

  const NON_INDEXED = 'HonorNonIndexedQueriesWarningMayFailRandomly';

  function preferSent(call = -1): string[] {
    const [, options] = vi.mocked(graphClient.graphRequest).mock.calls.at(call)!;
    return (options?.headers?.Prefer ?? '').split(', ');
  }

  // A value for every path param of a generated path such as /sites/:siteId/lists/:listId
  function placeholders(path: string): Record<string, string> {
    return Object.fromEntries(
      [...path.matchAll(/:([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => [m[1], 'x'])
    );
  }

  it('lets exactly the SharePoint list item tools filter on a column with no index', async () => {
    const registry = buildToolsRegistry(false, true);
    const sending: string[] = [];
    const unreached: string[] = [];
    for (const call of server.registerTool.mock.calls) {
      const name = call[0] as string;
      const tool = registry.get(name)?.tool;
      const { shape } = (call[1] as { inputSchema: { shape: object } }).inputSchema;
      if (!tool || !('filter' in shape)) continue;
      vi.mocked(graphClient.graphRequest).mockClear();
      await registered(name).handler({ ...placeholders(tool.path), filter: "id eq 'x'" });
      if (vi.mocked(graphClient.graphRequest).mock.calls.length === 0) unreached.push(name);
      else if (preferSent().includes(NON_INDEXED)) sending.push(name);
    }
    // A tool that never reached Graph was not checked
    expect(unreached).toEqual([]);
    expect(sending.sort()).toEqual(['list-drive-list-items', 'list-sharepoint-site-list-items']);
  });

  it.each([
    ['list-sharepoint-site-list-items', { siteId: 's1', listId: 'l1' }],
    ['list-drive-list-items', { driveId: 'd1' }],
  ])(
    'asks Graph to run a non-indexed query on %s only with $filter or $orderby',
    async (name, ids) => {
      vi.stubEnv('MS365_MCP_BODY_FORMAT', 'text');
      const { handler } = registered(name);
      const prefer = async (params: Record<string, unknown>) => {
        vi.mocked(graphClient.graphRequest).mockClear();
        await handler({ ...ids, ...params });
        expect(graphClient.graphRequest).toHaveBeenCalledOnce();
        return preferSent();
      };

      expect(await prefer({ expand: 'fields' })).not.toContain(NON_INDEXED);
      // Graph reads Prefer as a list, so the body format it already carries stays
      expect(await prefer({ filter: "fields/Status eq 'Approved'" })).toEqual([
        'outlook.body-content-type="text"',
        NON_INDEXED,
      ]);
      expect(await prefer({ $orderby: 'fields/Status' })).toContain(NON_INDEXED);
      // Neither of these filters or sorts
      expect(await prefer({ filter: ' ', orderby: [] })).not.toContain(NON_INDEXED);

      vi.stubEnv('MS365_MCP_BODY_FORMAT', 'html');
      expect(await prefer({ filter: "fields/Status eq 'Approved'" })).toEqual([NON_INDEXED]);
    }
  );

  it('keeps asking for the non-indexed query on each page of fetchAllPages', async () => {
    const page = (body: object) => ({ content: [{ type: 'text', text: JSON.stringify(body) }] });
    vi.mocked(graphClient.graphRequest)
      .mockResolvedValueOnce(
        page({
          value: [{ id: '1' }],
          '@odata.nextLink':
            'https://graph.microsoft.com/v1.0/drives/d1/list/items?$filter=fields%2fStatus+eq+%27Approved%27&$skiptoken=abc',
        })
      )
      .mockResolvedValueOnce(page({ value: [{ id: '2' }] }));

    const result = await registered('list-drive-list-items').handler({
      driveId: 'd1',
      filter: "fields/Status eq 'Approved'",
      fetchAllPages: true,
    });

    const calls = vi.mocked(graphClient.graphRequest).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][0]).toContain('$skiptoken=abc');
    expect(preferSent(0)).toContain(NON_INDEXED);
    expect(preferSent(1)).toContain(NON_INDEXED);
    expect(JSON.parse(result.content[0].text).value).toHaveLength(2);
  });

  it('asks for the non-indexed query on a skiptoken page that repeats the filter', async () => {
    await registered('list-drive-list-items').handler({
      driveId: 'd1',
      filter: "fields/Status eq 'Approved'",
      skiptoken: 'https://graph.microsoft.com/v1.0/drives/d1/list/items?$top=2&$skiptoken=abc',
    });
    expect(vi.mocked(graphClient.graphRequest).mock.calls[0][0]).toContain('$skiptoken=abc');
    expect(preferSent()).toContain(NON_INDEXED);
  });

  // Checked against Graph on a document library. The column tools ignore $top, $filter,
  // $orderby and $search and return every column. List items ignore $search. Everything
  // else left out here is a 400, bar $count on content types, whose shared description
  // is about mail (as on list-rooms).
  it.each([
    ['get-drive-list', ['select', 'expand']],
    ['get-drive-item-list-item', ['select', 'expand']],
    ['list-drive-list-columns', ['select', 'expand']],
    ['list-sharepoint-site-columns', ['select', 'expand']],
    ['list-drive-list-items', ['select', 'expand', 'filter', 'orderby', 'top', 'skiptoken']],
    [
      'list-sharepoint-site-list-items',
      ['select', 'expand', 'filter', 'orderby', 'top', 'skiptoken'],
    ],
    [
      'list-sharepoint-site-content-types',
      ['select', 'expand', 'filter', 'orderby', 'top', 'skiptoken'],
    ],
    [
      'list-sharepoint-list-content-types',
      ['select', 'expand', 'filter', 'orderby', 'top', 'skiptoken'],
    ],
  ])('offers only the query options Graph honours on %s', async (name, honoured) => {
    const all = [
      'select',
      'expand',
      'filter',
      'orderby',
      'top',
      'skip',
      'count',
      'search',
      'skiptoken',
    ];
    const { shape, handler } = registered(name);
    expect(all.filter((option) => option in shape)).toEqual(honoured);

    const entry = buildToolsRegistry(false, true).get(name)!;
    const discovered = describeToolSchema(entry.tool, entry.config).parameters.map((p) => p.name);
    expect(all.filter((option) => discovered.includes(option))).toEqual(honoured);

    // One that is left out is refused here, not sent
    const result = await handler({ ...placeholders(entry.tool.path), skip: 1 });
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      error: 'invalid_query_parameter',
      parameter: '$skip',
    });
    expect(graphClient.graphRequest).not.toHaveBeenCalled();
  });
});

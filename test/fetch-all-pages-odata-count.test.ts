import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decode } from '@toon-format/toon';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/cloud-config.js', () => ({
  getCloudEndpoints: () => ({
    graphApi: 'https://graph.microsoft.com',
    authority: 'https://login.microsoftonline.com',
  }),
  getGraphBaseUrl: () => 'https://graph.microsoft.com',
}));

vi.mock('../src/lib/microsoft-auth.js', () => ({
  refreshAccessToken: vi.fn(),
}));

const { default: GraphClient } = await import('../src/graph-client.js');

const mockAuthManager = { getToken: vi.fn().mockResolvedValue('mock-token') };
const mockSecrets = {
  clientId: 'test-client-id',
  tenantId: 'test-tenant-id',
  clientSecret: 'test-client-secret',
  cloudType: 'global' as const,
};

type Handler = (params: Record<string, unknown>) => Promise<CallToolResult>;

// Real tools and a real GraphClient; only fetch is mocked, because the client's
// response processing decides which @odata.* keys reach the fetchAllPages merge.
function handlerFor(alias: string, format: 'json' | 'toon' = 'json'): Handler {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const handlers = new Map<string, Handler>();
  vi.spyOn(server, 'registerTool').mockImplementation(((
    name: string,
    _config: unknown,
    handler: Handler
  ) => {
    handlers.set(name, handler);
  }) as never);
  vi.spyOn(server, 'tool').mockImplementation((() => {}) as never);
  registerGraphTools(server, new GraphClient(mockAuthManager as never, mockSecrets, format), {});
  const handler = handlers.get(alias);
  if (!handler) throw new Error(`Tool ${alias} was not registered`);
  return handler;
}

function mockPages(...bodies: unknown[]) {
  const queue = [...bodies];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(JSON.stringify(queue.shift() ?? { value: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  );
}

const NEXT = 'https://graph.microsoft.com/v1.0/me/messages?$skiptoken=page2';

async function call(params: Record<string, unknown>) {
  const result = await handlerFor('list-mail-messages')(params);
  return JSON.parse(result.content[0].text as string) as Record<string, unknown>;
}

describe('fetchAllPages and @odata.count', () => {
  let mockFetch: ReturnType<typeof mockPages> | undefined;
  const prevMaxPages = process.env.MS365_MCP_MAX_PAGES;
  const prevMaxItems = process.env.MS365_MCP_MAX_ITEMS;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthManager.getToken.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    mockFetch?.mockRestore();
    mockFetch = undefined;
    if (prevMaxPages === undefined) delete process.env.MS365_MCP_MAX_PAGES;
    else process.env.MS365_MCP_MAX_PAGES = prevMaxPages;
    if (prevMaxItems === undefined) delete process.env.MS365_MCP_MAX_ITEMS;
    else process.env.MS365_MCP_MAX_ITEMS = prevMaxItems;
  });

  it('returns @odata.count for a complete multi-page merge', async () => {
    mockFetch = mockPages(
      { '@odata.count': 3, '@odata.nextLink': NEXT, value: [{ id: '1' }, { id: '2' }] },
      { value: [{ id: '3' }] }
    );

    const parsed = await call({ count: true, fetchAllPages: true });

    expect((parsed.value as unknown[]).length).toBe(3);
    expect(parsed['@odata.count']).toBe(3);
  });

  it("keeps Graph's total when the page cap truncates the merge", async () => {
    process.env.MS365_MCP_MAX_PAGES = '2';
    mockFetch = mockPages(
      { '@odata.count': 10, '@odata.nextLink': NEXT, value: [{ id: '1' }] },
      { '@odata.nextLink': NEXT, value: [{ id: '2' }] }
    );

    const parsed = await call({ count: true, fetchAllPages: true });

    expect((parsed.value as unknown[]).length).toBe(2);
    expect(parsed['@odata.count']).toBe(10);
  });

  it('keeps a zero count', async () => {
    mockFetch = mockPages({ '@odata.count': 0, '@odata.nextLink': NEXT, value: [] }, { value: [] });

    const parsed = await call({ count: true, fetchAllPages: true });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(parsed['@odata.count']).toBe(0);
  });
  describe.each(['json', 'toon'] as const)('%s bounded reads', (format) => {
    it.each([
      ['MS365_MCP_MAX_PAGES', 1],
      ['MS365_MCP_MAX_PAGES', 2],
      ['MS365_MCP_MAX_ITEMS', 1],
      ['MS365_MCP_MAX_ITEMS', 2],
    ] as const)('retains and resumes the cursor at %s=%s', async (limit, cap) => {
      process.env.MS365_MCP_MAX_PAGES = '100';
      process.env.MS365_MCP_MAX_ITEMS = '10000';
      process.env[limit] = String(cap);
      const cursor = limit === 'MS365_MCP_MAX_PAGES' ? '$skiptoken' : '$skip';
      const link = (n: number) => `https://graph.microsoft.com/v1.0/me/messages?${cursor}=${n}`;
      mockFetch = mockPages(
        {
          '@odata.count': 3,
          '@odata.nextLink': link(1),
          value: [{ id: 'example-1', subject: 'omit' }],
        },
        { '@odata.nextLink': link(2), value: [{ id: 'example-2', subject: 'omit' }] },
        { value: [{ id: 'example-3', subject: 'omit' }] }
      );
      const handler = handlerFor('list-mail-messages', format);
      const parse = (result: CallToolResult) =>
        (format === 'json'
          ? JSON.parse(result.content[0].text as string)
          : decode(result.content[0].text as string)) as Record<string, unknown>;
      const first = await handler({ fetchAllPages: true, select: 'id', count: true });
      const body = parse(first);
      expect(body['@odata.nextLink']).toBe(link(cap));
      expect(body['@odata.count']).toBe(3);
      expect(body.value).toEqual(
        Array.from({ length: cap }, (_, i) => ({ id: `example-${i + 1}` }))
      );
      expect(first._meta).toMatchObject({ result_count: cap, result_has_more: true });
      expect(mockFetch).toHaveBeenCalledTimes(cap);

      // The next request must start at the returned cursor, not repeat the initial URL.
      process.env.MS365_MCP_MAX_PAGES = '100';
      process.env.MS365_MCP_MAX_ITEMS = '10000';
      const resumed = await handler({
        fetchAllPages: true,
        skiptoken: body['@odata.nextLink'],
        select: 'id',
        count: true,
      });
      const resumedUrl = new URL(String(mockFetch.mock.calls[cap][0]));
      expect(resumedUrl.searchParams.get(cursor)).toBe(String(cap));
      expect(parse(resumed).value).toEqual(
        Array.from({ length: 3 - cap }, (_, i) => ({ id: `example-${cap + i + 1}` }))
      );
      expect(parse(resumed)['@odata.nextLink']).toBeUndefined();
      expect(resumed._meta).toMatchObject({ result_count: 3 - cap, result_has_more: false });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

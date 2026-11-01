import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

type Handler = (params: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

// Real tools and a real GraphClient; only fetch is mocked, because the client's
// response processing decides which @odata.* keys reach the fetchAllPages merge.
function handlerFor(alias: string): Handler {
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
  registerGraphTools(server, new GraphClient(mockAuthManager as never, mockSecrets, 'json'), false);
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
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe('fetchAllPages and @odata.count', () => {
  let mockFetch: ReturnType<typeof mockPages> | undefined;
  const prevMaxPages = process.env.MS365_MCP_MAX_PAGES;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthManager.getToken.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    mockFetch?.mockRestore();
    mockFetch = undefined;
    if (prevMaxPages === undefined) delete process.env.MS365_MCP_MAX_PAGES;
    else process.env.MS365_MCP_MAX_PAGES = prevMaxPages;
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
});

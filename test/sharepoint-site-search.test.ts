import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { GraphClient } from '../src/graph-client.js';
import { registerGraphTools } from '../src/graph-tools.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('../src/generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'search-sharepoint-sites',
        method: 'get',
        path: '/sites',
        description: 'Search SharePoint sites',
        parameters: [{ name: '$search', type: 'Query', schema: z.string().optional() }],
      },
    ],
  },
}));

describe('search-sharepoint-sites', () => {
  const server = { tool: vi.fn(), registerTool: vi.fn() };
  const graphRequest = vi.fn();
  let handler: (
    params: Record<string, unknown>
  ) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest.mockResolvedValue({ content: [{ type: 'text', text: '{"value":[]}' }] });
    registerGraphTools(server, { graphRequest } as unknown as GraphClient, { orgMode: true });
    const call = server.registerTool.mock.calls.find(
      (args: unknown[]) => args[0] === 'search-sharepoint-sites'
    );
    expect(call).toBeDefined();
    handler = call![call!.length - 1];
  });

  it.each([{ search: '*' }, { $search: '  *  ' }])(
    'rejects a standalone wildcard without a Graph request: %o',
    async (params) => {
      const result = await handler(params);
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        error: 'invalid_search',
        message: expect.stringContaining('specific keyword'),
      });
      expect(graphRequest).not.toHaveBeenCalled();
    }
  );

  it('forwards a keyword search to Graph', async () => {
    await handler({ search: 'marketing' });
    expect(graphRequest).toHaveBeenCalledOnce();
    expect(graphRequest.mock.calls[0][0]).toBe('/sites?$search=marketing');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
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

// Mirrors what `npm run generate` emits for this endpoint: the synthesized
// operation carries both path params, because the colon-addressing path is not
// in Microsoft's published OpenAPI metadata.
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'get-sharepoint-site-by-path',
        method: 'get',
        path: '/sites/:siteId:/:path',
        description: 'Resolve a SharePoint site from its server-relative URL.',
        parameters: [
          { name: 'siteId', type: 'Path', schema: z.string() },
          { name: 'path', type: 'Path', schema: z.string() },
        ],
      },
    ],
  },
}));

const endpointsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'endpoints.json'
);
const endpoints = JSON.parse(readFileSync(endpointsPath, 'utf8')) as Array<{
  toolName: string;
  pathPattern: string;
  skipEncoding?: string[];
}>;

describe('get-sharepoint-site-by-path', () => {
  const entry = endpoints.find((e) => e.toolName === 'get-sharepoint-site-by-path')!;

  it('uses the documented v1.0 colon-addressing route, not the getByPath function', () => {
    // GET /sites/{hostname}:/{relative-path} per
    // https://learn.microsoft.com/graph/api/site-getbypath
    // The OData function form `/sites/{site-id}/getByPath(path='{path}')` is in the
    // CSDL metadata but returns 400 "Error in query syntax" against v1.0.
    expect(entry.pathPattern).toBe('/sites/{site-id}:/{path}');
    expect(entry.pathPattern).not.toContain('getByPath');
  });

  it('declares skipEncoding for path so the relative path keeps its separators', () => {
    expect(entry.skipEncoding).toContain('path');
  });

  describe('URL construction', () => {
    let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };
    let mockGraphClient: GraphClient;

    beforeEach(() => {
      vi.clearAllMocks();
      mockServer = { tool: vi.fn(), registerTool: vi.fn() };
      mockGraphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify({ id: 'site-id' }) }],
        }),
      } as unknown as GraphClient;
    });

    function getToolHandler(toolName: string) {
      // orgMode (5th arg) must be true: this endpoint declares only workScopes,
      // so it is skipped entirely in personal mode.
      registerGraphTools(mockServer, mockGraphClient, false, undefined, true);
      const call = mockServer.registerTool.mock.calls.find((c: unknown[]) => c[0] === toolName);
      expect(call).toBeDefined();
      return call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>;
    }

    it('builds /sites/{hostname}:/{relative-path} without percent-encoding the separators', async () => {
      const handler = getToolHandler('get-sharepoint-site-by-path');

      await handler({ siteId: 'contoso.sharepoint.com', path: 'sites/marketing' });

      const calledPath = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledPath).toContain('/sites/contoso.sharepoint.com:/sites/marketing');
      // The regression this guards: encodeURIComponent turning the relative path
      // into %2Fsites%2Fmarketing, which Graph rejects.
      expect(calledPath).not.toContain('%2F');
    });

    it('handles a nested site path', async () => {
      const handler = getToolHandler('get-sharepoint-site-by-path');

      await handler({ siteId: 'contoso.sharepoint.com', path: 'teams/hr/benefits' });

      const calledPath = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledPath).toContain('/sites/contoso.sharepoint.com:/teams/hr/benefits');
    });
  });
});

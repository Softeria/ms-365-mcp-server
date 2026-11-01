import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { GraphClient } from '../src/graph-client.js';
import { registerGraphTools } from '../src/graph-tools.js';
import { isUnalteredGraphPath } from '../src/lib/attachment-tickets.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'delete-specific-calendar-event',
        method: 'delete',
        path: '/me/calendars/:calendarId/events/:eventId',
        description: 'Delete a calendar event.',
        parameters: [
          { name: 'calendarId', type: 'Path', schema: z.string() },
          { name: 'eventId', type: 'Path', schema: z.string() },
        ],
      },
      {
        alias: 'get-excel-range',
        method: 'get',
        path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')`,
        description: 'Get a range.',
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
          { name: 'workbookWorksheetId', type: 'Path', schema: z.string() },
          { name: 'address', type: 'Path', schema: z.string() },
        ],
      },
      {
        alias: 'get-sharepoint-site-by-path',
        method: 'get',
        path: '/sites/:siteId:/:path',
        description: 'Resolve a site.',
        parameters: [
          { name: 'siteId', type: 'Path', schema: z.string() },
          { name: 'path', type: 'Path', schema: z.string() },
        ],
      },
      {
        alias: 'list-supported-time-zones',
        method: 'get',
        path: `/me/outlook/supportedTimeZones(TimeZoneStandard=':TimeZoneStandard')`,
        description: 'List time zones.',
        parameters: [],
      },
    ],
  },
}));

describe('Path parameters cannot leave the endpoint (GHSA-42wc-j69p-jppq)', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;
  let graphRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { tool: vi.fn(), registerTool: vi.fn() };
    graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
    });
    mockGraphClient = { graphRequest } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    // orgMode for get-sharepoint-site-by-path; utility tools register through server.tool
    registerGraphTools(mockServer, mockGraphClient, { orgMode: true });
    const call = [...mockServer.registerTool.mock.calls, ...mockServer.tool.mock.calls].find(
      (c: unknown[]) => c[0] === toolName
    );
    expect(call).toBeDefined();
    return call![call!.length - 1] as (
      params: Record<string, unknown>
    ) => Promise<{ isError?: boolean; content: { text: string }[] }>;
  }

  async function expectRefused(toolName: string, params: Record<string, unknown>) {
    const result = await getToolHandler(toolName)(params);
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('invalid_path_parameter');
    expect(graphRequest).not.toHaveBeenCalled();
  }

  it.each(['..', '.'])('refuses %j as an id', async (eventId) => {
    await expectRefused('delete-specific-calendar-event', { calendarId: 'cal', eventId });
  });

  it('refuses ".." in a middle segment', async () => {
    await expectRefused('delete-specific-calendar-event', { calendarId: '..', eventId: 'evt' });
  });

  it.each([
    "A1')/../../../../../../../me/messages?x=",
    "A1')/../../../../../../../me#",
    'A1?$expand=x',
    'A1/%2e%2e/x',
    'A1\\..\\x',
  ])('refuses %j in a skipEncoding parameter', async (address) => {
    await expectRefused('get-excel-range', {
      driveId: 'd',
      driveItemId: 'i',
      workbookWorksheetId: 'w',
      address,
    });
  });

  it.each(["A1')/worksheet/tables('T", 'A1/x'])(
    'refuses %j, a skipEncoding value adding segments without dots',
    async (address) => {
      await expectRefused('get-excel-range', {
        driveId: 'd',
        driveItemId: 'i',
        workbookWorksheetId: 'w',
        address,
      });
    }
  );

  it('refuses a site path that starts a second path address', async () => {
    await expectRefused('get-sharepoint-site-by-path', {
      siteId: 'contoso.sharepoint.com',
      path: 'sites/hr:/lists/Employees/items',
    });
  });

  it('does not expand "$" replacement patterns in a raw value', async () => {
    const path = "sites/hr$`lists$'x$&";
    await getToolHandler('get-sharepoint-site-by-path')({
      siteId: 'contoso.sharepoint.com',
      path,
    });
    expect(graphRequest.mock.calls[0][0]).toBe(`/sites/contoso.sharepoint.com:/${path}`);
  });

  it('still sends a nested site path', async () => {
    await getToolHandler('get-sharepoint-site-by-path')({
      siteId: 'contoso.sharepoint.com',
      path: 'teams/hr/benefits',
    });
    expect(graphRequest.mock.calls[0][0]).toBe('/sites/contoso.sharepoint.com:/teams/hr/benefits');
  });

  it.each(['/me/../users', '/users#', '/me/drive/items/..'])(
    'download-bytes refuses %j',
    async (target) => {
      const result = await getToolHandler('download-bytes')({ target });
      expect(result.isError).toBe(true);
      expect(graphRequest).not.toHaveBeenCalled();
    }
  );

  it('get-download-url refuses a ".." item id', async () => {
    const result = await getToolHandler('get-download-url')({ target: '/me/drive/items/..' });
    expect(result.isError).toBe(true);
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('download-bytes still takes a path with a query and a space', async () => {
    await getToolHandler('download-bytes')({ target: '/me/drive/root:/Års rapport.docx:/content' });
    expect(graphRequest.mock.calls[0][0]).toBe('/me/drive/root:/Års rapport.docx:/content');
  });

  it('still sends ordinary ids, dots included', async () => {
    await getToolHandler('delete-specific-calendar-event')({
      calendarId: 'a.b',
      eventId: '..x',
    });
    expect(graphRequest.mock.calls[0][0]).toBe('/me/calendars/a.b/events/..x');
  });

  it('still sends a raw address with a space, quotes and non-ASCII', async () => {
    await getToolHandler('get-excel-range')({
      driveId: 'd',
      driveItemId: 'i',
      workbookWorksheetId: 'w',
      address: "''Årsrapport 2026''!A1:B2",
    });
    expect(graphRequest.mock.calls[0][0]).toContain("range(address='''Årsrapport 2026''!A1:B2')");
  });

  it('takes a non-string value for a quoted parameter', async () => {
    await getToolHandler('list-supported-time-zones')({ TimeZoneStandard: 7 });
    expect(graphRequest.mock.calls[0][0]).toContain("(TimeZoneStandard='7')");
  });

  it('doubles a quote inside an OData string literal', async () => {
    await getToolHandler('list-supported-time-zones')({ TimeZoneStandard: "Windows')x" });
    expect(graphRequest.mock.calls[0][0]).toContain("(TimeZoneStandard='Windows'')x')");
  });
});

describe('isUnalteredGraphPath', () => {
  it.each([
    '/me/messages/AAMk=',
    '/sites/root:/sites/Team Ø',
    "/me/x(a='b c')",
    '/me/a%2Fb',
    "/drives/d/search(q='100% off')",
  ])('accepts %j', (path) => {
    expect(isUnalteredGraphPath(path)).toBe(true);
  });

  it.each([
    '/me/messages/..',
    '/me/messages/.',
    '/me/messages/%2E%2e',
    '/me/messages/.\t.',
    '/me/messages/x?',
    '/me/messages/x#',
    '/me/messages/%ff',
  ])('refuses %j', (path) => {
    expect(isUnalteredGraphPath(path)).toBe(false);
  });
});

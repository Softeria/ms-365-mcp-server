import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'get-calendar-event',
        method: 'get',
        path: '/me/events/:eventId',
        description: 'Get a calendar event.',
        parameters: [{ name: 'eventId', type: 'Path', schema: z.string() }],
      },
      {
        alias: 'get-specific-calendar-event',
        method: 'get',
        path: '/me/calendars/:calendarId/events/:eventId',
        description: 'Get a specific calendar event.',
        parameters: [
          { name: 'calendarId', type: 'Path', schema: z.string() },
          { name: 'eventId', type: 'Path', schema: z.string() },
        ],
      },
    ],
  },
}));

describe('Path parameter encoding (issue #245)', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { tool: vi.fn() };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
      }),
    } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    registerGraphTools(mockServer, mockGraphClient, false);
    const call = mockServer.tool.mock.calls.find((c: unknown[]) => c[0] === toolName);
    expect(call).toBeDefined();
    return call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>;
  }

  it('should preserve = in base64-encoded event IDs', async () => {
    const handler = getToolHandler('get-calendar-event');
    const base64Id =
      'AAMkADE5NGJlYmU2LWIyZDItNGE3Ni04NjRiLTYxMDUwMDE2NDYzYgBGAAAAAAAweYIkG8t7T4BnY_vowazSBwCrNxh3sVpPTqkhqlJPyPJrAAAAAAENAACrNxh3sVpPTqkhqlJPyPJrAABx2DQOAAA=';

    await handler({ eventId: base64Id });

    const calledPath = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain(`/me/events/${base64Id}`);
    expect(calledPath).not.toContain('%3D');
  });

  it('should preserve = in IDs with double padding', async () => {
    const handler = getToolHandler('get-calendar-event');
    const idWithDoublePad = 'SomeBase64EncodedId==';

    await handler({ eventId: idWithDoublePad });

    const calledPath = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain(`/me/events/${idWithDoublePad}`);
    expect(calledPath).not.toContain('%3D');
  });

  it('should preserve = in multiple path parameters', async () => {
    const handler = getToolHandler('get-specific-calendar-event');
    const calendarId = 'AQMkADE5NGJlYmU2LWIyZDItNGE3Ni04NjRiLTYxMDUwMDE2NDYzYg==';
    const eventId = 'AAMkADE5NGJlYmU2LWIyZDItNGE3Ni04NjRiLTYxMDUwMDE2NDYzYgBG=';

    await handler({ calendarId, eventId });

    const calledPath = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain(`/me/calendars/${calendarId}/events/${eventId}`);
    expect(calledPath).not.toContain('%3D');
  });

  it('should still encode truly unsafe characters in path parameters', async () => {
    const handler = getToolHandler('get-calendar-event');
    const idWithSpace = 'some id with spaces';

    await handler({ eventId: idWithSpace });

    const calledPath = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain('some%20id%20with%20spaces');
  });
});

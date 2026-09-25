import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Real endpoints.json and generated client, so dropping the flag from config fails here (#687)
const TOOLS = ['get-schedule', 'find-meeting-times', 'list-shared-calendar-events'];

describe('timezone on schedule and shared calendar tools', () => {
  let registerTool: MockInstance;
  let graphRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    registerTool = vi.spyOn(server, 'registerTool').mockImplementation((() => {}) as never);
    vi.spyOn(server, 'tool').mockImplementation((() => {}) as never);
    graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
    });
    // All three are work-scoped, so they only register in org mode
    registerGraphTools(
      server,
      { graphRequest } as unknown as GraphClient,
      false,
      `^(${TOOLS.join('|')})$`,
      true
    );
  });

  function registered(toolName: string) {
    const call = registerTool.mock.calls.find((c) => c[0] === toolName);
    expect(call).toBeDefined();
    return {
      schema: (call![1] as { inputSchema: z.AnyZodObject }).inputSchema.shape as Record<
        string,
        z.ZodTypeAny
      >,
      handler: call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>,
    };
  }

  it.each(TOOLS)('%s exposes the timezone param', (toolName) => {
    expect(registered(toolName).schema).toHaveProperty('timezone');
  });

  it('get-schedule sends Prefer: outlook.timezone on the POST and keeps timezone out of the body', async () => {
    const body = {
      Schedules: ['adelev@contoso.com'],
      StartTime: { dateTime: '2026-09-25T08:00:00', timeZone: 'Europe/Zurich' },
      EndTime: { dateTime: '2026-09-25T18:00:00', timeZone: 'Europe/Zurich' },
    };

    await registered('get-schedule').handler({ body, timezone: 'Europe/Zurich' });

    const [path, options] = graphRequest.mock.calls[0];
    expect(path).toBe('/me/calendar/getSchedule');
    expect(options.method).toBe('POST');
    expect(options.headers['Prefer']).toContain('outlook.timezone="Europe/Zurich"');
    expect(JSON.parse(options.body)).toEqual(body);
  });
});

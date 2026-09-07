import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

// End-to-end smoke against the REAL generated client (no endpoint mocks):
// both acceptType endpoints must expose Accept and forward it to graphRequest.
describe('Accept override, real generated client', () => {
  function setup() {
    const server = new McpServer({ name: 't', version: '1' });
    const calls: Array<[string, { headers: Record<string, string> }]> = [];
    const graphClient = {
      graphRequest: vi.fn(async (path: string, opts: { headers: Record<string, string> }) => {
        calls.push([path, opts]);
        return { content: [{ type: 'text', text: 'ok' }] };
      }),
    } as unknown as GraphClient;
    const handlers = new Map<string, (p: Record<string, unknown>) => Promise<unknown>>();
    vi.spyOn(server, 'registerTool').mockImplementation(((
      name: string,
      _cfg: unknown,
      h: never
    ) => {
      handlers.set(name, h);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
    }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);
    registerGraphTools(server, graphClient, false, undefined, true);
    return { handlers, calls };
  }

  it('transcript content: default text/vtt, override survives', async () => {
    const { handlers, calls } = setup();
    const h = handlers.get('get-meeting-transcript-content')!;
    expect(h).toBeDefined();
    await h({ onlineMeetingId: 'm1', callTranscriptId: 't1' });
    expect(calls[0][1].headers['Accept']).toBe('text/vtt');
    await h({
      onlineMeetingId: 'm1',
      callTranscriptId: 't1',
      Accept: 'application/vnd.microsoft.graph.transcript+text',
    });
    expect(calls[1][1].headers['Accept']).toBe('application/vnd.microsoft.graph.transcript+text');
  });

  it('mail mime: default text/plain, override survives', async () => {
    const { handlers, calls } = setup();
    const h = handlers.get('get-mail-message-mime')!;
    expect(h).toBeDefined();
    await h({ messageId: 'abc' });
    expect(calls[0][1].headers['Accept']).toBe('text/plain');
    await h({ messageId: 'abc', Accept: 'application/octet-stream' });
    expect(calls[1][1].headers['Accept']).toBe('application/octet-stream');
  });
});

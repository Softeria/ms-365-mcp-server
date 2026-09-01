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

vi.mock('../src/generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        // endpoints.json configures acceptType 'text/vtt' for this tool
        alias: 'get-meeting-transcript-content',
        method: 'get',
        path: '/me/onlineMeetings/:onlineMeetingId/transcripts/:callTranscriptId/content',
        description: 'Transcript content.',
        parameters: [
          { name: 'onlineMeetingId', type: 'Path', schema: z.string() },
          { name: 'callTranscriptId', type: 'Path', schema: z.string() },
          { name: 'Accept', type: 'Header', schema: z.string().optional() },
        ],
      },
    ],
  },
}));

describe('explicit Accept header', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { tool: vi.fn(), registerTool: vi.fn() };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'WEBVTT' }],
      }),
    } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    // transcript tools are work-scoped only, so they need org mode to register
    registerGraphTools(mockServer, mockGraphClient, false, undefined, true);
    const call = mockServer.registerTool.mock.calls.find((c: unknown[]) => c[0] === toolName);
    expect(call).toBeDefined();
    return call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>;
  }

  function sentHeaders() {
    const call = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0];
    return (call[1] as { headers: Record<string, string> }).headers;
  }

  it('falls back to the configured acceptType when the caller sends none', async () => {
    const handler = getToolHandler('get-meeting-transcript-content');

    await handler({ onlineMeetingId: 'meeting-1', callTranscriptId: 'transcript-1' });

    expect(sentHeaders()['Accept']).toBe('text/vtt');
  });

  it('keeps an explicitly provided Accept header instead of overwriting it', async () => {
    const handler = getToolHandler('get-meeting-transcript-content');

    // Graph asks for this format when speaker-attributed transcripts are
    // disabled for the tenant (403 SpeakerAttributionNotAllowed). Overwriting
    // it with the configured acceptType made that retry impossible.
    await handler({
      onlineMeetingId: 'meeting-1',
      callTranscriptId: 'transcript-1',
      Accept: 'application/vnd.microsoft.graph.transcript+text',
    });

    expect(sentHeaders()['Accept']).toBe('application/vnd.microsoft.graph.transcript+text');
  });
});

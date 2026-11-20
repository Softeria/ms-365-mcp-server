import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import type { Tool } from '../src/tools/index.js';
import { ALL_TOOLS } from '../src/tools/index.js';
import { fakeGraphClient } from './fake-graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Pins the fix for upstream issue #245 (base64 path-param IDs with `=` were
// becoming `%3D`, which Graph rejected with 404). The runtime encodes path
// params but explicitly preserves `=`.
describe('Path parameter encoding (issue #245)', () => {
  let mockGraphClient: GraphClient;
  let graphRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
    });
    mockGraphClient = fakeGraphClient(graphRequest);
  });

  const getMailMessage = ALL_TOOLS.find((t) => t.name === 'mail-message-get') as Tool;
  const getCalendarEvent = ALL_TOOLS.find((t) => t.name === 'calendar-event-get') as Tool;

  it('preserves = in base64-encoded message IDs', async () => {
    const base64Id =
      'AAMkADE5NGJlYmU2LWIyZDItNGE3Ni04NjRiLTYxMDUwMDE2NDYzYgBGAAAAAAAweYIkG8t7T4BnY_vowazSBwCrNxh3sVpPTqkhqlJPyPJrAAAAAAENAACrNxh3sVpPTqkhqlJPyPJrAABx2DQOAAA=';

    await executeTool(getMailMessage, mockGraphClient, { 'message-id': base64Id });

    const calledPath = graphRequest.mock.calls[0][0] as string;
    expect(calledPath).toContain(`/me/messages/${base64Id}`);
    expect(calledPath).not.toContain('%3D');
  });

  it('preserves = with double padding', async () => {
    const idWithDoublePad = 'SomeBase64EncodedId==';

    await executeTool(getMailMessage, mockGraphClient, {
      'message-id': idWithDoublePad,
    });

    const calledPath = graphRequest.mock.calls[0][0] as string;
    expect(calledPath).toContain(`/me/messages/${idWithDoublePad}`);
    expect(calledPath).not.toContain('%3D');
  });

  it('still encodes truly unsafe characters in path parameters', async () => {
    const idWithSpace = 'some id with spaces';

    await executeTool(getCalendarEvent, mockGraphClient, { 'event-id': idWithSpace });

    const calledPath = graphRequest.mock.calls[0][0] as string;
    expect(calledPath).toContain('some%20id%20with%20spaces');
  });
});

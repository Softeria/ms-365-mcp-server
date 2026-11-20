/**
 * Preconditions against the REAL GraphClient (only `fetch` is stubbed).
 *
 * The other write-tool suites mock `graphClient` directly, which hid a bug:
 * the probes called `graphRequest` (MCP text envelope, never throws) and read
 * `isDraft`/`isOrganizer` off the envelope — undefined — so every guarded
 * write was refused in production. These tests exercise the real transport.
 */
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { requestContext } from '../src/request-context.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

function stubGraph(probe: Record<string, unknown> | 'not-found') {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url.includes('$select=')) {
      if (probe === 'not-found') return new Response('{"error":"nf"}', { status: 404 });
      return Response.json(probe);
    }
    if (init?.method === 'POST' && url.endsWith('/send')) return new Response('', { status: 202 });
    return Response.json({ id: 'ok' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const run = (tool: string, params: Record<string, unknown>) =>
  requestContext.run({ accessToken: 't', userPrincipalName: 'me@aretepartners.com' }, () =>
    executeTool(findTool(tool), new GraphClient(), params)
  );

const mainCalls = (fetchMock: Mock) =>
  fetchMock.mock.calls.filter(([url]) => !String(url).includes('$select='));

afterEach(() => vi.unstubAllGlobals());

describe('preconditions with the real GraphClient', () => {
  it('mail-message-update PATCHes a real draft', async () => {
    const fetchMock = stubGraph({ isDraft: true });
    const result = await run('mail-message-update', {
      'message-id': 'm1',
      body: { subject: 'x' },
    });
    expect(result.isError).toBeFalsy();
    expect(mainCalls(fetchMock)).toHaveLength(1);
    expect(mainCalls(fetchMock)[0][1].method).toBe('PATCH');
  });

  it('mail-message-update refuses received mail without PATCHing', async () => {
    const fetchMock = stubGraph({ isDraft: false });
    const result = await run('mail-message-update', {
      'message-id': 'm1',
      body: { subject: 'x' },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/not a draft \(isDraft=false\)/);
    expect(mainCalls(fetchMock)).toHaveLength(0);
  });

  it('a 404 on the probe refuses with a lookup-failed message', async () => {
    const fetchMock = stubGraph('not-found');
    const result = await run('mail-message-delete', { 'message-id': 'gone' });
    expect(result.content[0].text).toMatch(/could not verify message is a draft/);
    expect(mainCalls(fetchMock)).toHaveLength(0);
  });

  it('calendar-event-update PATCHes an organizer-owned event and refuses an attendee one', async () => {
    let fetchMock = stubGraph({ isOrganizer: true });
    let result = await run('calendar-event-update', { 'event-id': 'e1', body: { subject: 'x' } });
    expect(result.isError).toBeFalsy();
    expect(mainCalls(fetchMock)).toHaveLength(1);

    fetchMock = stubGraph({ isOrganizer: false });
    result = await run('calendar-event-update', { 'event-id': 'e1', body: { subject: 'x' } });
    expect(result.isError).toBe(true);
    expect(mainCalls(fetchMock)).toHaveLength(0);
  });

  it('mail-draft-send reads recipients from the probe and sends in-domain drafts', async () => {
    const fetchMock = stubGraph({
      isDraft: true,
      toRecipients: [{ emailAddress: { address: 'you@aretepartners.com' } }],
    });
    const result = await run('mail-draft-send', { 'message-id': 'd1' });
    expect(result.isError).toBeFalsy();
    expect(String(mainCalls(fetchMock)[0][0])).toMatch(/\/me\/messages\/d1\/send$/);
  });
});

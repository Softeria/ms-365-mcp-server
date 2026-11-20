/**
 * Connector-parity tools: server-built request bodies and the guards around
 * them, exercised through the real GraphClient with only `fetch` stubbed.
 */
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool, registerTools } from '../src/tool-runtime.js';
import { ALL_TOOLS, utilityTools, type Tool } from '../src/tools/index.js';
import { requestContext, type RequestContext } from '../src/request-context.js';
import { Policy } from '../src/policy/index.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const CALLER = '11111111-1111-1111-1111-111111111111';
const ALICE = '22222222-2222-2222-2222-222222222222';
const BOB = '33333333-3333-3333-3333-333333333333';

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

type Route = (url: URL, init: { method?: string; body?: string }) => unknown;

/** Stub fetch; `route` returns a JSON body, or a Response for non-200s. */
function stubGraph(route: Route): Mock {
  const fetchMock = vi.fn().mockImplementation(async (raw: string, init = {}) => {
    const out = route(new URL(raw), init);
    return out instanceof Response ? out : Response.json(out ?? {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ctx: RequestContext = {
  accessToken: 't',
  userOid: CALLER,
  userPrincipalName: 'me@aretepartners.com',
};

async function run(name: string, params: Record<string, unknown>) {
  const result = await requestContext.run(ctx, () =>
    executeTool(findTool(name), new GraphClient(), params)
  );
  return { result, text: result.content[0].text };
}

const writes = (fetchMock: Mock) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET');

afterEach(() => vi.unstubAllGlobals());

describe('teams-chat-create', () => {
  const member = (url: URL) => ({
    userPrincipalName: `${url.pathname.split('/').pop()}@arete.com`,
  });

  it('adds the caller and binds every member by in-tenant object id as owner', async () => {
    const fetchMock = stubGraph((url) =>
      url.pathname.startsWith('/v1.0/users/') ? member(url) : { id: 'chat-1' }
    );
    const { result } = await run('teams-chat-create', {
      chatType: 'group',
      topic: 'Deal team',
      memberIds: [ALICE, BOB.toUpperCase(), CALLER],
    });
    expect(result.isError).toBeFalsy();
    const [url, init] = writes(fetchMock)[0];
    expect(new URL(url).pathname).toBe('/v1.0/chats');
    const body = JSON.parse(init.body);
    expect(body.chatType).toBe('group');
    expect(body.topic).toBe('Deal team');
    expect(body.members.map((m: Record<string, unknown>) => m['user@odata.bind'])).toEqual([
      `https://graph.microsoft.com/v1.0/users('${CALLER}')`,
      `https://graph.microsoft.com/v1.0/users('${ALICE}')`,
      `https://graph.microsoft.com/v1.0/users('${BOB}')`,
    ]);
    for (const m of body.members) {
      expect(m.roles).toEqual(['owner']);
      expect(m).not.toHaveProperty('tenantId');
    }
  });

  it.each([
    [{ chatType: 'oneOnOne', memberIds: [ALICE, BOB] }, /exactly one other member/],
    [{ chatType: 'group', memberIds: [ALICE] }, /at least two other members/],
    [{ chatType: 'oneOnOne', memberIds: [ALICE], topic: 'x' }, /group chats/],
    [{ chatType: 'oneOnOne', memberIds: ['alice@aretepartners.com'] }, /Entra object ids/],
    [{ chatType: 'oneOnOne', memberIds: [CALLER] }, /exactly one other member/],
  ])('refuses %j without calling Graph', async (params, message) => {
    const fetchMock = stubGraph(() => ({}));
    const { result, text } = await run('teams-chat-create', params);
    expect(result.isError).toBe(true);
    expect(text).toMatch(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ userPrincipalName: 'jane_contoso.com#EXT#@arete.onmicrosoft.com' }],
    [{ userPrincipalName: 'jane@arete.com', userType: 'Guest' }],
    [{}],
  ])('refuses a non-member (%j) before creating the chat', async (profile) => {
    const fetchMock = stubGraph(() => profile);
    const { result, text } = await run('teams-chat-create', {
      chatType: 'oneOnOne',
      memberIds: [ALICE],
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/not a member of your organization/);
    expect(writes(fetchMock)).toHaveLength(0);
  });
});

describe('mail-draft-reply-create', () => {
  it.each([
    ['reply', 'createReply'],
    ['replyAll', 'createReplyAll'],
    ['forward', 'createForward'],
  ])('kind=%s POSTs to %s', async (kind, action) => {
    const fetchMock = stubGraph(() => ({ id: 'draft-1', isDraft: true }));
    await run('mail-draft-reply-create', {
      'message-id': 'AAMk=',
      kind,
      body: { comment: 'see below' },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe(`/v1.0/me/messages/AAMk=/${action}`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ comment: 'see below' });
  });

  it.each([
    [{ 'message-id': '..', kind: 'reply' }, /single opaque id/],
    [{ 'message-id': 'm1', kind: 'toString' }, /kind must be/],
  ])('refuses %j without calling Graph', async (params, message) => {
    const fetchMock = stubGraph(() => ({}));
    const { result, text } = await run('mail-draft-reply-create', params);
    expect(result.isError).toBe(true);
    expect(text).toMatch(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mail-message-categories-modify', () => {
  it('PATCHes only the merged categories, case-insensitively', async () => {
    const fetchMock = stubGraph((url, init) =>
      init.method === 'PATCH' ? {} : { id: 'm1', categories: ['Deals', 'Follow up'] }
    );
    const { text } = await run('mail-message-categories-modify', {
      'message-id': 'm1',
      add: ['deals', 'Lender'],
      remove: ['FOLLOW UP'],
    });
    const [patch] = writes(fetchMock);
    expect(new URL(patch[0]).pathname).toBe('/v1.0/me/messages/m1');
    expect(JSON.parse(patch[1].body)).toEqual({ categories: ['Deals', 'Lender'] });
    expect(JSON.parse(text)).toEqual({ id: 'm1', categories: ['Deals', 'Lender'], changed: true });
  });

  it('skips the PATCH when nothing changes', async () => {
    const fetchMock = stubGraph(() => ({ id: 'm1', categories: ['Deals'] }));
    const { text } = await run('mail-message-categories-modify', {
      'message-id': 'm1',
      add: ['DEALS'],
    });
    expect(writes(fetchMock)).toHaveLength(0);
    expect(JSON.parse(text).changed).toBe(false);
  });

  it('refuses an empty change', async () => {
    const fetchMock = stubGraph(() => ({}));
    const { result } = await run('mail-message-categories-modify', { 'message-id': 'm1' });
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mail-thread-categories-modify', () => {
  const page = (ids: string[], nextLink?: string) => ({
    value: ids.map((id) => ({ id, categories: id === 'm2' ? ['Deals'] : [] })),
    ...(nextLink ? { '@odata.nextLink': nextLink } : {}),
  });

  it('follows pages, escapes the filter, and PATCHes only messages that change', async () => {
    const fetchMock = stubGraph((url, init) => {
      if (init.method === 'PATCH') return {};
      return url.searchParams.has('$skip')
        ? page(['m3'])
        : page(['m1', 'm2'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=2');
    });
    const { text } = await run('mail-thread-categories-modify', {
      'conversation-id': "conv'1",
      add: ['Deals'],
    });
    const first = new URL(fetchMock.mock.calls[0][0]);
    expect(first.searchParams.get('$filter')).toBe("conversationId eq 'conv''1'");
    expect(writes(fetchMock).map(([u]) => new URL(u).pathname)).toEqual([
      '/v1.0/me/messages/m1',
      '/v1.0/me/messages/m3',
    ]);
    const out = JSON.parse(text);
    expect(out).toMatchObject({ matched: 3, unchanged: 1, failed: [] });
    expect(out.updated).toHaveLength(2);
  });

  it('refuses an oversized thread before writing anything', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `m${i}`);
    const fetchMock = stubGraph((url) =>
      url.searchParams.has('$skip')
        ? page(ids)
        : page(ids, 'https://graph.microsoft.com/v1.0/me/messages?$skip=60')
    );
    const { result, text } = await run('mail-thread-categories-modify', {
      'conversation-id': 'c1',
      add: ['Deals'],
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/more than 100 messages/);
    expect(writes(fetchMock)).toHaveLength(0);
  });

  it('refuses to follow a nextLink for another resource, before writing anything', async () => {
    const fetchMock = stubGraph(() =>
      page(['m1'], 'https://graph.microsoft.com/v1.0/me/contacts?$skip=1')
    );
    const { result } = await run('mail-thread-categories-modify', {
      'conversation-id': 'c1',
      add: ['Deals'],
    });
    expect(result.isError).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports per-message failures without hiding the successes', async () => {
    stubGraph((url, init) => {
      if (init.method !== 'PATCH') return page(['m1', 'm3']);
      return url.pathname.endsWith('/m3') ? new Response('{}', { status: 409 }) : {};
    });
    const { result, text } = await run('mail-thread-categories-modify', {
      'conversation-id': 'c1',
      add: ['Deals'],
    });
    expect(result.isError).toBeFalsy();
    const out = JSON.parse(text);
    expect(out.updated.map((m: { id: string }) => m.id)).toEqual(['m1']);
    expect(out.failed.map((m: { id: string }) => m.id)).toEqual(['m3']);
  });
});

describe('search tools stay pinned to their own index', () => {
  it.each([
    ['calendar-event-search', 'driveItem'],
    ['sharepoint-search', 'message'],
    ['teams-message-search', 'event'],
  ])('%s rejects entityType %s', (name, entityType) => {
    const body = findTool(name).params.find((p) => p.name === 'body')!.schema;
    const parsed = body.safeParse({
      requests: [{ entityTypes: [entityType], query: { queryString: 'x' } }],
    });
    expect(parsed.success).toBe(false);
  });

  it('search POSTs register as read-only, not destructive', () => {
    const hints = new Map<string, { readOnlyHint: boolean; destructiveHint: boolean }>();
    const server = {
      tool: vi.fn((name: string, _d: string, _s: unknown, h: never) => hints.set(name, h)),
    };
    registerTools(server as never, new GraphClient(), { toolsets: 'all' });
    for (const name of [
      'calendar-event-search',
      'calendar-schedule-get',
      'calendar-meeting-times-find',
      'sharepoint-search',
    ]) {
      expect(hints.get(name)).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    }
  });
});

describe('identity-granted-scopes-get', () => {
  it('normalizes resource-qualified scopes and lists what the session lacks', async () => {
    const tool = utilityTools.find((t) => t.name === 'identity-granted-scopes-get')!;
    const result = await requestContext.run(
      { accessToken: 't', grantedScopes: 'https://graph.microsoft.com/Mail.Read openid User.Read' },
      () =>
        tool.execute(
          {},
          { graphClient: new GraphClient(), requestedScopes: ['mail.read', 'People.Read'] }
        )
    );
    expect(JSON.parse(result.content[0].text)).toEqual({
      granted: ['Mail.Read', 'User.Read', 'openid'],
      missing: ['People.Read'],
    });
  });
});

describe('sharepoint-search response', () => {
  it('flattens hits to ids the follow-up tools take and reports the next page', async () => {
    const fetchMock = stubGraph(() => ({
      value: [
        {
          hitsContainers: [
            {
              moreResultsAvailable: true,
              hits: [
                {
                  hitId: 'h1',
                  summary: '<c0>Budget</c0> FY27',
                  resource: {
                    '@odata.type': '#microsoft.graph.driveItem',
                    id: 'item-1',
                    name: 'Budget.xlsx',
                    webUrl: 'https://t.sharepoint.com/Budget.xlsx',
                    parentReference: { driveId: 'drive-1', sharepointIds: { listId: 'l' } },
                    createdBy: { user: { displayName: 'Jane' } },
                  },
                },
              ],
            },
          ],
        },
      ],
    }));
    const body = {
      requests: [
        { entityTypes: ['driveItem'], query: { queryString: 'budget' }, from: 25, size: 25 },
      ],
    };
    const { text } = await run('sharepoint-search', { body });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body);
    expect(JSON.parse(text)).toEqual({
      hits: [
        {
          id: 'item-1',
          driveId: 'drive-1',
          name: 'Budget.xlsx',
          webUrl: 'https://t.sharepoint.com/Budget.xlsx',
          type: '#microsoft.graph.driveItem',
          hitId: 'h1',
          summary: '<c0>Budget</c0> FY27',
        },
      ],
      moreResultsAvailable: true,
      nextFrom: 26,
    });
  });

  const searchPage = (hits: unknown[], moreResultsAvailable = false) => ({
    value: [{ hitsContainers: [{ moreResultsAvailable, hits }] }],
  });
  const searchBody = (from: number) => ({
    requests: [{ entityTypes: ['driveItem'], query: { queryString: 'x' }, from, size: 25 }],
  });

  it('caps an oversized summary', async () => {
    stubGraph(() => searchPage([{ hitId: 'h1', summary: 'x'.repeat(200_000), resource: {} }]));
    const { text } = await run('sharepoint-search', { body: searchBody(0) });
    expect(text.length).toBeLessThan(2_000);
    const out = JSON.parse(text);
    expect(out.hits).toHaveLength(1);
    expect(out.moreResultsAvailable).toBe(false);
  });

  it('stops at the size budget and points nextFrom at the first omitted hit', async () => {
    const hits = Array.from({ length: 25 }, (_, i) => ({
      hitId: `h${i}`,
      summary: 's'.repeat(900),
      resource: { id: `item-${i}`, name: `${i}-${'n'.repeat(5_000)}` },
    }));
    stubGraph(() => searchPage(hits));
    const { text } = await run('sharepoint-search', { body: searchBody(50) });
    expect(text.length).toBeLessThan(60_000);
    const out = JSON.parse(text);
    const kept = out.hits.length;
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThan(25);
    expect(out.hits.map((h: { hitId: string }) => h.hitId)).toEqual(
      hits.slice(0, kept).map((h) => h.hitId)
    );
    expect(out).toMatchObject({ truncated: true, moreResultsAvailable: true, nextFrom: 50 + kept });
  });
});

describe('execute tools respect policy', () => {
  it('a user without the tool is denied before any Graph call', async () => {
    const fetchMock = stubGraph(() => ({}));
    const policy = Policy.fromDocument({ defaults: { allow: ['identity-get-me'] } });
    const result = await requestContext.run(ctx, () =>
      executeTool(
        findTool('mail-thread-categories-modify'),
        new GraphClient(),
        { 'conversation-id': 'c1', add: ['Deals'] },
        policy
      )
    );
    expect(result.content[0].text).toMatch(/Policy denied/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('download-bytes', () => {
  const tool = utilityTools.find((t) => t.name === 'download-bytes')!;
  const call = (target: string) =>
    requestContext.run(ctx, () =>
      tool.execute({ target }, { graphClient: new GraphClient(), requestedScopes: [] })
    );

  it.each([
    '/me/mailboxSettings',
    '/me/mailFolders/inbox/messageRules',
    '/me/messages/m1/attachments/a1/../../../mailboxSettings/$value',
    '/me/drive/items/x/%2e%2e/content',
  ])('refuses non-binary or dot-segment target %s without calling Graph', async (target) => {
    const fetchMock = stubGraph(() => ({}));
    const result = await call(target);
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    '/me/messages/m1/attachments/a1/$value',
    '/drives/d1/items/i1/content',
    '/me/onlineMeetings/m1/transcripts/t1/content?$format=text/vtt',
  ])('fetches binary endpoint %s', async (target) => {
    const fetchMock = stubGraph(
      () => new Response('bytes', { headers: { 'content-type': 'application/pdf' } })
    );
    const result = await call(target);
    expect(result.isError).toBeFalsy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('condensed responses', () => {
  const dt = (dateTime: string) => ({ dateTime, timeZone: 'Eastern Standard Time' });

  it('calendar-schedule-get keeps busy times and working hours, drops subjects and free items', async () => {
    stubGraph(() => ({
      '@odata.context': 'x',
      value: [
        {
          scheduleId: 'jane@arete.com',
          availabilityView: '0220',
          scheduleItems: [
            {
              status: 'busy',
              subject: 'Board prep',
              isPrivate: false,
              start: dt('2026-11-23T09:30:00'),
              end: dt('2026-11-23T10:30:00'),
            },
            {
              status: 'free',
              subject: 'Hold',
              start: dt('2026-11-23T11:00:00'),
              end: dt('2026-11-23T11:30:00'),
            },
          ],
          workingHours: {
            daysOfWeek: ['monday'],
            startTime: '08:00:00.0000000',
            endTime: '17:00:00.0000000',
            timeZone: { name: 'Eastern Standard Time', bias: 300 },
          },
        },
      ],
    }));
    const { text } = await run('calendar-schedule-get', {
      body: {
        schedules: ['jane@arete.com'],
        startTime: dt('2026-11-23T09:00:00'),
        endTime: dt('2026-11-23T11:00:00'),
      },
    });
    expect(JSON.parse(text)).toEqual({
      schedules: [
        {
          email: 'jane@arete.com',
          availabilityView: '0220',
          busy: [{ status: 'busy', start: '2026-11-23T09:30:00', end: '2026-11-23T10:30:00' }],
          workingHours: {
            days: ['monday'],
            start: '08:00:00.0000000',
            end: '17:00:00.0000000',
            timeZone: 'Eastern Standard Time',
          },
        },
      ],
    });
  });

  it('calendar-meeting-times-find lists slots and only the attendees who are not free', async () => {
    stubGraph(() => ({
      emptySuggestionsReason: '',
      meetingTimeSuggestions: [
        {
          confidence: 50,
          organizerAvailability: 'free',
          suggestionReason: 'Suggested because it is one of the nearest times.',
          meetingTimeSlot: { start: dt('2026-11-24T10:00:00'), end: dt('2026-11-24T10:30:00') },
          attendeeAvailability: [
            {
              attendee: { type: 'required', emailAddress: { address: 'a@arete.com' } },
              availability: 'free',
            },
            {
              attendee: { type: 'required', emailAddress: { address: 'b@arete.com' } },
              availability: 'tentative',
            },
          ],
          locations: [],
        },
      ],
    }));
    const { text } = await run('calendar-meeting-times-find', { body: {} });
    expect(JSON.parse(text)).toEqual({
      suggestions: [
        {
          start: '2026-11-24T10:00:00',
          end: '2026-11-24T10:30:00',
          timeZone: 'Eastern Standard Time',
          confidence: 50,
          organizerAvailability: 'free',
          notFree: [{ email: 'b@arete.com', availability: 'tentative' }],
          reason: 'Suggested because it is one of the nearest times.',
        },
      ],
    });
  });

  it('mail-draft-reply-create returns the id and recipients, not the quoted body', async () => {
    stubGraph(() => ({
      '@odata.context': 'x',
      id: 'draft-1',
      subject: 'RE: Term sheet',
      body: { contentType: 'html', content: '<p>quoted original</p>'.repeat(500) },
      toRecipients: [{ emailAddress: { address: 'jane@contoso.com', name: 'Jane' } }],
      ccRecipients: [],
      webLink: 'https://outlook.office365.com/owa/?ItemID=draft-1',
      conversationId: 'c1',
      internetMessageHeaders: [],
    }));
    const { text } = await run('mail-draft-reply-create', { 'message-id': 'm1', kind: 'reply' });
    expect(JSON.parse(text)).toEqual({
      id: 'draft-1',
      subject: 'RE: Term sheet',
      to: ['jane@contoso.com'],
      cc: [],
      bcc: [],
      webLink: 'https://outlook.office365.com/owa/?ItemID=draft-1',
    });
  });

  it('mail-category-create returns id, name, color only', async () => {
    stubGraph(() => ({
      '@odata.context': 'x',
      id: 'cat-1',
      displayName: 'Deals',
      color: 'preset4',
    }));
    const { text } = await run('mail-category-create', {
      body: { displayName: 'Deals', color: 'preset4' },
    });
    expect(JSON.parse(text)).toEqual({ id: 'cat-1', displayName: 'Deals', color: 'preset4' });
  });

  it('teams-chat-create returns the chat id and link only', async () => {
    stubGraph((url) =>
      url.pathname.startsWith('/v1.0/users/')
        ? { userPrincipalName: 'alice@arete.com' }
        : {
            '@odata.context': 'x',
            id: 'chat-1',
            chatType: 'oneOnOne',
            topic: null,
            tenantId: 't',
            createdDateTime: 'x',
            webUrl: 'https://teams/chat-1',
          }
    );
    const { text } = await run('teams-chat-create', { chatType: 'oneOnOne', memberIds: [ALICE] });
    expect(JSON.parse(text)).toEqual({
      id: 'chat-1',
      chatType: 'oneOnOne',
      topic: null,
      webUrl: 'https://teams/chat-1',
    });
  });

  it('a Graph error on a shaped tool still surfaces as a tool error', async () => {
    stubGraph(() => new Response('{"error":{"code":"ErrorItemNotFound"}}', { status: 404 }));
    const { result, text } = await run('mail-draft-reply-create', {
      'message-id': 'gone',
      kind: 'reply',
    });
    expect(result.isError).toBe(true);
    expect(text).toMatch(/ErrorItemNotFound/);
  });
});

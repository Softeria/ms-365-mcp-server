/**
 * Every tool condenses Graph's response to what an agent needs next: ids on
 * every item, the main summary, nothing else. Exercised through the real
 * GraphClient with only `fetch` stubbed.
 */
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { requestContext } from '../src/request-context.js';
import { compact, htmlToText } from '../src/tools/shapes.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

function stubGraph(route: (url: URL) => unknown): Mock {
  const fetchMock = vi
    .fn()
    .mockImplementation(async (raw: string) => Response.json(route(new URL(raw))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function run(name: string, params: Record<string, unknown>) {
  const result = await requestContext.run({ accessToken: 't' }, () =>
    executeTool(findTool(name), new GraphClient(), params)
  );
  return JSON.parse(result.content[0].text);
}

const addr = (name: string, address: string) => ({ emailAddress: { name, address } });
const dt = (dateTime: string) => ({ dateTime, timeZone: 'UTC' });

afterEach(() => vi.unstubAllGlobals());

describe('mail', () => {
  const message = {
    '@odata.context': 'x',
    '@odata.etag': 'W/"1"',
    id: 'm1',
    changeKey: 'ck',
    subject: 'Term sheet',
    from: addr('Jane Doe', 'jane@contoso.com'),
    toRecipients: [addr('me@arete.com', 'me@arete.com')],
    ccRecipients: [],
    bccRecipients: [],
    receivedDateTime: '2026-11-20T10:00:00Z',
    sentDateTime: '2026-11-20T09:59:00Z',
    isRead: false,
    isDraft: false,
    importance: 'normal',
    hasAttachments: true,
    categories: [],
    conversationId: 'c1',
    webLink: 'https://outlook/m1',
    bodyPreview: 'See attached',
    body: { contentType: 'text', content: 'See attached term sheet.' },
    flag: { flagStatus: 'notFlagged' },
    inferenceClassification: 'focused',
    internetMessageId: '<x@y>',
    parentFolderId: 'inbox',
  };

  it('mail-message-get keeps headers, ids, link, and body', async () => {
    stubGraph(() => message);
    expect(await run('mail-message-get', { 'message-id': 'm1' })).toEqual({
      id: 'm1',
      subject: 'Term sheet',
      from: 'Jane Doe <jane@contoso.com>',
      to: ['me@arete.com'],
      receivedDateTime: '2026-11-20T10:00:00Z',
      isRead: false,
      hasAttachments: true,
      conversationId: 'c1',
      webLink: 'https://outlook/m1',
      body: 'See attached term sheet.',
    });
  });

  it('mail-message-list items carry id, sender, preview, and conversationId', async () => {
    stubGraph(() => ({
      value: [message],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=15',
    }));
    expect(await run('mail-message-list', {})).toEqual({
      value: [
        {
          id: 'm1',
          subject: 'Term sheet',
          from: 'Jane Doe <jane@contoso.com>',
          to: ['me@arete.com'],
          receivedDateTime: '2026-11-20T10:00:00Z',
          preview: 'See attached',
          isRead: false,
          hasAttachments: true,
          conversationId: 'c1',
        },
      ],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=15',
    });
  });

  it('select or response_format: "detailed" returns the Graph object untouched', async () => {
    stubGraph(() => message);
    expect(
      (await run('mail-message-get', { 'message-id': 'm1', response_format: 'detailed' })).flag
    ).toEqual({
      flagStatus: 'notFlagged',
    });
    expect(
      (await run('mail-message-get', { 'message-id': 'm1', select: 'flag' })).flag
    ).toBeDefined();
  });

  it('mail-attachment-add never echoes the uploaded bytes', async () => {
    stubGraph((url) =>
      url.pathname.endsWith('/attachments')
        ? { id: 'a1', name: 'x.pdf', contentType: 'application/pdf', size: 3, contentBytes: 'AAAA' }
        : { isDraft: true }
    );
    expect(
      await run('mail-attachment-add', {
        'message-id': 'd1',
        body: {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: 'x.pdf',
          contentBytes: 'AAAA',
        },
      })
    ).toEqual({ id: 'a1', name: 'x.pdf', contentType: 'application/pdf', size: 3 });
  });

  it('mail-attachment-list asks Graph for metadata only', async () => {
    const fetchMock = stubGraph(() => ({ value: [] }));
    await run('mail-attachment-list', { 'message-id': 'm1' });
    const select = new URL(fetchMock.mock.calls[0][0]).searchParams.get('$select');
    expect(select).toBe('id,name,contentType,size,isInline');
  });
});

describe('calendar', () => {
  const event = {
    id: 'e1',
    subject: 'Board prep',
    start: dt('2026-11-24T15:00:00'),
    end: dt('2026-11-24T16:00:00'),
    isAllDay: false,
    isCancelled: false,
    location: { displayName: 'Room 4', locationType: 'default', uniqueIdType: 'unknown' },
    organizer: addr('Jane Doe', 'jane@arete.com'),
    attendees: [
      {
        ...addr('Bob', 'bob@arete.com'),
        type: 'required',
        status: { response: 'accepted', time: 'x' },
      },
      {
        ...addr('Ann', 'ann@arete.com'),
        type: 'optional',
        status: { response: 'none', time: 'x' },
      },
    ],
    onlineMeeting: { joinUrl: 'https://teams/join' },
    isOrganizer: false,
    responseStatus: { response: 'tentativelyAccepted', time: 'x' },
    showAs: 'tentative',
    type: 'singleInstance',
    webLink: 'https://outlook/e1',
    body: { contentType: 'text', content: 'Agenda: numbers.' },
    recurrence: null,
    iCalUId: 'ical',
  };

  it('calendar-event-get returns when/where/who, your response, link, and body', async () => {
    stubGraph(() => event);
    expect(await run('calendar-event-get', { 'event-id': 'e1' })).toEqual({
      id: 'e1',
      subject: 'Board prep',
      start: '2026-11-24T15:00:00',
      end: '2026-11-24T16:00:00',
      timeZone: 'UTC',
      location: 'Room 4',
      organizer: 'Jane Doe <jane@arete.com>',
      attendees: ['Bob <bob@arete.com> (accepted)', 'Ann <ann@arete.com> (optional)'],
      joinUrl: 'https://teams/join',
      isOrganizer: false,
      myResponse: 'tentativelyAccepted',
      showAs: 'tentative',
      webLink: 'https://outlook/e1',
      body: 'Agenda: numbers.',
    });
  });

  it('calendar-view items omit the body and per-user fields', async () => {
    stubGraph(() => ({ value: [event] }));
    const out = await run('calendar-view', {
      startDateTime: '2026-11-24T00:00:00Z',
      endDateTime: '2026-11-25T00:00:00Z',
    });
    expect(out.value[0]).toEqual({
      id: 'e1',
      subject: 'Board prep',
      start: '2026-11-24T15:00:00',
      end: '2026-11-24T16:00:00',
      timeZone: 'UTC',
      location: 'Room 4',
      organizer: 'Jane Doe <jane@arete.com>',
      attendees: ['Bob <bob@arete.com> (accepted)', 'Ann <ann@arete.com> (optional)'],
      joinUrl: 'https://teams/join',
    });
  });
});

describe('teams', () => {
  const chatMessage = (id: string, html: string) => ({
    id,
    replyToId: null,
    etag: '1',
    messageType: 'message',
    createdDateTime: '2026-11-20T10:00:00Z',
    lastModifiedDateTime: '2026-11-20T10:00:00Z',
    deletedDateTime: null,
    subject: null,
    importance: 'normal',
    locale: 'en-us',
    webUrl: null,
    chatId: 'chat-1',
    channelIdentity: null,
    from: {
      application: null,
      device: null,
      user: { id: 'u1', displayName: 'Jane Doe', userIdentityType: 'aadUser' },
    },
    body: { contentType: 'html', content: html },
    attachments: [],
    mentions: [],
    reactions: [],
    policyViolation: null,
  });

  it('message lists return plain text, capped, with ids and sender', async () => {
    const long = `<p>${'word '.repeat(400)}</p>`;
    stubGraph(() => ({
      value: [chatMessage('1', '<p>Hi <b>team</b>&nbsp;&amp; all</p>'), chatMessage('2', long)],
    }));
    const out = await run('teams-chat-message-list', { 'chat-id': 'chat-1' });
    expect(out.value[0]).toEqual({
      id: '1',
      createdDateTime: '2026-11-20T10:00:00Z',
      from: 'Jane Doe',
      fromId: 'u1',
      text: 'Hi team & all',
    });
    expect(out.value[1].truncated).toBe(true);
    expect(out.value[1].text.length).toBeLessThanOrEqual(1_001);
  });

  it('message get returns the full text and its location ids', async () => {
    stubGraph(() => chatMessage('2', `<p>${'word '.repeat(400)}</p>`));
    const out = await run('teams-chat-message-get', { 'chat-id': 'chat-1', 'chatMessage-id': '2' });
    expect(out.truncated).toBeUndefined();
    expect(out.text.length).toBeGreaterThan(1_500);
    expect(out.chatId).toBe('chat-1');
  });

  it('chat list keeps ids and summarizes an expanded last message', async () => {
    stubGraph(() => ({
      value: [
        {
          id: 'chat-1',
          chatType: 'group',
          topic: 'Deal team',
          createdDateTime: 'x',
          lastUpdatedDateTime: '2026-11-20T10:00:00Z',
          tenantId: 't',
          webUrl: 'https://teams/chat-1',
          onlineMeetingInfo: null,
          viewpoint: { isHidden: false, lastMessageReadDateTime: 'x' },
          lastMessagePreview: chatMessage('9', '<p>Signed!</p>'),
        },
      ],
    }));
    const out = await run('teams-chat-list', { expand: 'lastMessagePreview' });
    expect(out.value).toEqual([
      {
        id: 'chat-1',
        chatType: 'group',
        topic: 'Deal team',
        lastUpdatedDateTime: '2026-11-20T10:00:00Z',
        lastMessage: { from: 'Jane Doe', createdDateTime: '2026-11-20T10:00:00Z', text: 'Signed!' },
        webUrl: 'https://teams/chat-1',
      },
    ]);
  });

  it('transcript list hands back a download-bytes-ready contentPath', async () => {
    stubGraph(() => ({
      value: [
        {
          id: 't1',
          meetingId: 'mtg',
          meetingOrganizer: { user: { id: 'u1' } },
          createdDateTime: '2026-11-20T10:00:00Z',
          endDateTime: '2026-11-20T11:00:00Z',
          transcriptContentUrl:
            'https://graph.microsoft.com/v1.0/users/u1/onlineMeetings/mtg/transcripts/t1/content',
          contentCorrelationId: 'cc',
        },
      ],
    }));
    const out = await run('teams-meeting-transcript-list', { 'meeting-id': 'mtg' });
    expect(out.value[0]).toEqual({
      id: 't1',
      meetingId: 'mtg',
      createdDateTime: '2026-11-20T10:00:00Z',
      endDateTime: '2026-11-20T11:00:00Z',
      contentPath: '/users/u1/onlineMeetings/mtg/transcripts/t1/content?$format=text/vtt',
    });
  });
});

describe('files and SharePoint', () => {
  it('drive items drop hashes and facets but keep kind, size, and link', async () => {
    stubGraph(() => ({
      value: [
        {
          id: 'f1',
          name: 'Model.xlsx',
          size: 2048,
          webUrl: 'https://x/Model.xlsx',
          lastModifiedDateTime: '2026-11-19T00:00:00Z',
          file: { mimeType: 'application/vnd.ms-excel', hashes: { quickXorHash: 'abc' } },
        },
        { id: 'd1', name: 'Deals', size: 0, webUrl: 'https://x/Deals', folder: { childCount: 3 } },
      ],
    }));
    expect((await run('drive-children-list', {})).value).toEqual([
      {
        id: 'f1',
        name: 'Model.xlsx',
        mimeType: 'application/vnd.ms-excel',
        size: 2048,
        webUrl: 'https://x/Model.xlsx',
        lastModifiedDateTime: '2026-11-19T00:00:00Z',
      },
      {
        id: 'd1',
        name: 'Deals',
        isFolder: true,
        childCount: 3,
        size: 0,
        webUrl: 'https://x/Deals',
      },
    ]);
  });

  it('list items keep content columns and drop SharePoint system columns', async () => {
    stubGraph(() => ({
      value: [
        {
          '@odata.etag': 'x',
          id: '7',
          webUrl: 'https://x/7',
          lastModifiedDateTime: '2026-11-19T00:00:00Z',
          createdBy: { user: { displayName: 'Jane' } },
          fields: {
            '@odata.etag': 'x',
            Title: 'Acme lender',
            Status: 'Active',
            ContentType: 'Item',
            Edit: '',
            LinkTitle: 'Acme lender',
            _UIVersionString: '1.0',
            AuthorLookupId: '12',
          },
        },
      ],
    }));
    expect(
      (await run('sharepoint-list-item-list', { 'site-id': 's', 'list-id': 'l' })).value
    ).toEqual([
      {
        id: '7',
        webUrl: 'https://x/7',
        lastModifiedDateTime: '2026-11-19T00:00:00Z',
        fields: { Title: 'Acme lender', Status: 'Active' },
      },
    ]);
  });
});

describe('fetchAllPages applies the shape to every page', () => {
  it('merges condensed items only', async () => {
    stubGraph((url) =>
      url.searchParams.has('$skip')
        ? { value: [{ id: 'f2', name: 'b', file: { hashes: { x: 1 } } }] }
        : {
            value: [{ id: 'f1', name: 'a', file: { hashes: { x: 1 } } }],
            '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/drive/root/children?$skip=1',
          }
    );
    const out = await run('drive-children-list', { fetchAllPages: true });
    expect(out.value).toEqual([
      { id: 'f1', name: 'a' },
      { id: 'f2', name: 'b' },
    ]);
  });
});

describe('shape helpers', () => {
  it('compact drops bookkeeping and empties but keeps false and 0', () => {
    expect(
      compact({
        '@odata.etag': 'x',
        changeKey: 'y',
        a: null,
        b: '',
        c: [],
        d: {},
        e: false,
        f: 0,
        g: { h: [] },
      })
    ).toEqual({ e: false, f: 0 });
  });

  it('htmlToText keeps line breaks and decodes entities', () => {
    expect(htmlToText('<div>One</div><div>Two&nbsp;&lt;3</div><br/>Three')).toBe(
      'One\nTwo <3\n\nThree'
    );
  });
});

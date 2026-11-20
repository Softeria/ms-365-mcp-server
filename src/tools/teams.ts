import { z } from 'zod';
import { OData, type Tool, type ToolPrecondition } from './types.js';
import { flattenedSearch, searchRequestSchema } from './search.js';
import { capText, compact, graphPath, htmlToText, listShape } from './shapes.js';
import { getCloudEndpoints } from '../cloud-config.js';

const ENTRA_OBJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `teams-chat-create` handler. Builds the Graph `POST /chats` body server-side
 * so the model only names the other members: the caller is always added (Graph
 * requires it) and every member binds by Entra object id with the `owner` role
 * and no `tenantId`, which keeps out-of-tenant users out. Tenant guests (B2B
 * clients/lenders) DO have in-tenant ids, so each member is looked up first and
 * guests are refused. A oneOnOne create returns the existing chat when one
 * already exists.
 */
const createChat: NonNullable<Tool['execute']> = async (graphClient, params, ctx) => {
  const chatType = params['chatType'];
  const topic = params['topic'];
  const memberIds = Array.isArray(params['memberIds']) ? (params['memberIds'] as unknown[]) : [];
  if (!ctx.userOid) {
    throw new Error('the session has no Entra object id for the caller; sign in again.');
  }
  const callerOid = ctx.userOid.toLowerCase();
  const others = [...new Set(memberIds.map((id) => String(id).toLowerCase()))].filter(
    (id) => id !== callerOid
  );
  const invalid = others.filter((id) => !ENTRA_OBJECT_ID.test(id));
  if (invalid.length > 0) {
    throw new Error(
      `memberIds must be Entra object ids (GUIDs) from user-search; got ${JSON.stringify(invalid)}.`
    );
  }
  if (chatType !== 'oneOnOne' && chatType !== 'group') {
    throw new Error('chatType must be oneOnOne or group.');
  }
  if (chatType === 'oneOnOne' && others.length !== 1) {
    throw new Error(`a oneOnOne chat needs exactly one other member; got ${others.length}.`);
  }
  if (chatType === 'group' && others.length < 2) {
    throw new Error(
      `a group chat needs at least two other members; got ${others.length}. Use oneOnOne.`
    );
  }
  if (topic !== undefined && chatType !== 'group') {
    throw new Error('topic is only allowed on group chats.');
  }
  // userType may be absent under User.ReadBasic.All; an invited B2B guest's UPN
  // carries #EXT#. Either signal refuses, and so does an unreadable profile.
  for (const id of others) {
    const user = (await graphClient.makeRequest(
      `/users/${id}?$select=id,userPrincipalName,userType`,
      { method: 'GET' }
    )) as { userPrincipalName?: string; userType?: string } | null;
    const upn = user?.userPrincipalName ?? '';
    if (upn === '' || user?.userType === 'Guest' || upn.includes('#EXT#')) {
      throw new Error(
        `member ${id} (${upn || 'unknown'}) is not a member of your organization; this tool only ` +
          'opens chats with colleagues. Message external people from Teams directly.'
      );
    }
  }
  const graphApi = getCloudEndpoints().graphApi;
  const body = {
    chatType,
    ...(topic !== undefined ? { topic } : {}),
    members: [callerOid, ...others].map((id) => ({
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      roles: ['owner'],
      'user@odata.bind': `${graphApi}/v1.0/users('${id}')`,
    })),
  };
  const chat = (await graphClient.makeRequest('/chats', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as { id?: string; chatType?: string; topic?: string | null; webUrl?: string } | null;
  // id → teams-chat-message-send; webUrl → for the human.
  return { id: chat?.id, chatType: chat?.chatType, topic: chat?.topic, webUrl: chat?.webUrl };
};

/**
 * Guard for teams-online-meeting-find: exactly one lookup key (meeting-id OR
 * join-web-url). A usage invariant, not a security boundary — the Graph call is
 * read-only either way; this just refuses an ambiguous/empty lookup in code so
 * the model gets a clear error instead of a confusing Graph response.
 */
const assertExactlyOneMeetingKey: ToolPrecondition = async (_graphClient, params) => {
  const hasId = typeof params['meeting-id'] === 'string' && params['meeting-id'].length > 0;
  const hasUrl = typeof params['join-web-url'] === 'string' && params['join-web-url'].length > 0;
  if (hasId === hasUrl) {
    throw new Error(
      `teams-online-meeting-find requires exactly one of meeting-id or join-web-url (got ${hasId ? 'both' : 'neither'}).`
    );
  }
};

/** Body shape on a Teams chatMessage. HTML is the Teams default for client display. */
const messageItemBodySchema = z
  .object({
    contentType: z
      .enum(['html', 'text', 'HTML', 'Text'])
      .describe('html or text. HTML is preferred for Teams.'),
    content: z
      .string()
      .describe(
        'Body content. For mentions, embed <at id="N">Name</at> spans and supply matching entries in mentions[].'
      ),
  })
  .passthrough();

/**
 * Embedded mention. For each `<at id="N">Name</at>` span in the body, supply a
 * matching mention entry. `mentioned.user.id` is the Entra object id (not the UPN).
 */
const mentionSchema = z
  .object({
    id: z.number().int().describe('Numeric id matching the <at id="N"> span in the body.'),
    mentionText: z.string().describe('Display text inside the <at> span.'),
    mentioned: z
      .object({
        user: z
          .object({
            id: z.string().describe('Entra object id of the mentioned user.'),
            displayName: z.string().optional(),
            userIdentityType: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * Mutable chatMessage shape used by teams-chat-message-send / teams-channel-message-send /
 * teams-channel-message-reply-send. Same resource on all three endpoints; channel
 * posts can additionally set `subject` to start a thread with a title.
 */
const chatMessageWriteSchema = z
  .object({
    body: messageItemBodySchema,
    subject: z
      .string()
      .optional()
      .describe('Channel thread subject. Ignored for chat messages and channel replies.'),
    importance: z.enum(['normal', 'high', 'urgent']).optional(),
    mentions: z.array(mentionSchema).optional(),
    attachments: z
      .array(
        z
          .object({
            id: z.string(),
            contentType: z.string(),
            contentUrl: z.string().optional(),
            name: z.string().optional(),
            thumbnailUrl: z.string().optional(),
          })
          .passthrough()
      )
      .optional()
      .describe('Adaptive cards or hosted-content references. Most use cases do not need this.'),
  })
  .passthrough();

/**
 * Meeting participants: Entra user ids, NOT email addresses. (Graph asymmetry
 * vs calendar event attendees, which use SMTP.)
 */
const meetingParticipantSchema = z
  .object({
    identity: z
      .object({
        user: z
          .object({
            id: z.string().describe('Entra object id'),
            displayName: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    upn: z.string().optional(),
    role: z
      .enum(['attendee', 'presenter', 'producer', 'coorganizer'])
      .optional()
      .describe('Defaults to attendee.'),
  })
  .passthrough();

const onlineMeetingWriteSchema = z
  .object({
    subject: z.string().optional(),
    startDateTime: z
      .string()
      .optional()
      .describe(
        'ISO 8601, e.g. 2026-05-23T14:00:00Z. Bare timestamps — not the {dateTime,timeZone} wrapper calendar events use.'
      ),
    endDateTime: z.string().optional(),
    participants: z
      .object({
        organizer: meetingParticipantSchema.optional(),
        attendees: z.array(meetingParticipantSchema).optional(),
      })
      .passthrough()
      .optional(),
    isBroadcast: z.boolean().optional(),
    allowMeetingChat: z.enum(['enabled', 'disabled', 'limited']).optional(),
    allowedPresenters: z
      .enum(['everyone', 'organization', 'roleIsPresenter', 'organizer'])
      .optional(),
    allowAttendeeToEnableCamera: z.boolean().optional(),
    allowAttendeeToEnableMic: z.boolean().optional(),
    recordAutomatically: z.boolean().optional(),
  })
  .passthrough();

const MENTION_TIP =
  'To @-mention a user: embed <at id="0">Name</at> in body.content and supply a matching ' +
  'mentions[0] = { id: 0, mentionText: "Name", mentioned: { user: { id: "<entra-oid>" } } }. ' +
  'Use identity-get-me or user-search (when exposed) to resolve Entra object ids; do not invent them.';

const CREATE_MEETING_TIP =
  'teams-online-meeting-create mints a joinWebUrl but does NOT put the meeting on the calendar. ' +
  'For "schedule a meeting" workflows, prefer calendar-event-create with isOnlineMeeting: true — ' +
  'Graph will create the underlying Teams meeting and attach it to the event in one step. ' +
  'Use teams-online-meeting-create only when you need a join URL without a corresponding calendar entry.';

const messageSearchSchema = searchRequestSchema({
  entityTypes: z.array(z.literal('chatMessage')).default(['chatMessage']),
  queryDescription:
    'What to find. Plain words, or KQL scope terms: from:bob, to:alice, ' +
    'sent>2026-08-01, mentions:<entra-oid-without-dashes>, hasAttachment:true, IsRead:false.',
  maxSize: 25,
  topResults: true,
});

interface GraphChatMessage {
  id?: string;
  replyToId?: string;
  messageType?: string;
  createdDateTime?: string;
  deletedDateTime?: string;
  subject?: string;
  body?: { contentType?: string; content?: string };
  from?: { user?: { id?: string; displayName?: string }; application?: { displayName?: string } };
  attachments?: { id?: string; name?: string; contentType?: string }[];
  mentions?: { mentionText?: string }[];
  chatId?: string;
  channelIdentity?: { teamId?: string; channelId?: string };
  webUrl?: string;
}

/** Message lists cap each body here; teams-*-message-get returns the full text. */
const LIST_MESSAGE_CHARS = 1_000;

/** chatMessage → id, sender, time, plain-text body, attachment names, mentions. */
function messageSummary(m: GraphChatMessage, maxText?: number) {
  const content = m.body?.content ?? '';
  const text = m.body?.contentType === 'html' ? htmlToText(content) : content.trim();
  const capped = maxText ? capText(text, maxText) : { text };
  return {
    id: m.id,
    replyToId: m.replyToId,
    type: m.messageType === 'message' ? undefined : m.messageType,
    createdDateTime: m.createdDateTime,
    from: m.from?.user?.displayName ?? m.from?.application?.displayName,
    fromId: m.from?.user?.id,
    subject: m.subject,
    text: capped.text,
    truncated: 'truncated' in capped ? capped.truncated : undefined,
    deleted: m.deletedDateTime ? true : undefined,
    attachments: m.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      contentType: a.contentType,
    })),
    mentions: m.mentions?.map((x) => x.mentionText),
  };
}

const shapeMessageList = listShape((m) =>
  compact(messageSummary(m as GraphChatMessage, LIST_MESSAGE_CHARS))
);

function shapeMessage(raw: unknown) {
  const m = (raw ?? {}) as GraphChatMessage;
  return compact({
    ...messageSummary(m),
    chatId: m.chatId,
    teamId: m.channelIdentity?.teamId,
    channelId: m.channelIdentity?.channelId,
    webUrl: m.webUrl,
  });
}

/** A sent message: id (thread root for replies), time, and link. */
function shapeSentMessage(raw: unknown) {
  const m = (raw ?? {}) as GraphChatMessage;
  return { id: m.id, createdDateTime: m.createdDateTime, webUrl: m.webUrl };
}

/** chat → id, kind, topic, last activity, link, plus members / last message when expanded. */
function chatSummary(raw: Record<string, unknown>) {
  const c = raw as {
    id?: string;
    chatType?: string;
    topic?: string;
    lastUpdatedDateTime?: string;
    webUrl?: string;
    members?: { displayName?: string }[];
    lastMessagePreview?: GraphChatMessage;
  };
  const last = c.lastMessagePreview;
  return compact({
    id: c.id,
    chatType: c.chatType,
    topic: c.topic,
    lastUpdatedDateTime: c.lastUpdatedDateTime,
    members: c.members?.map((m) => m.displayName),
    lastMessage: last
      ? {
          from: last.from?.user?.displayName ?? last.from?.application?.displayName,
          createdDateTime: last.createdDateTime,
          text: capText(
            last.body?.contentType === 'html'
              ? htmlToText(last.body?.content ?? '')
              : last.body?.content,
            200
          ).text,
        }
      : undefined,
    webUrl: c.webUrl,
  });
}

interface GraphOnlineMeeting {
  id?: string;
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
  joinWebUrl?: string;
  joinMeetingIdSettings?: { joinMeetingId?: string };
  participants?: { organizer?: { upn?: string }; attendees?: { upn?: string }[] };
}

function meetingSummary(raw: unknown) {
  const m = (raw ?? {}) as GraphOnlineMeeting;
  return compact({
    id: m.id,
    subject: m.subject,
    startDateTime: m.startDateTime,
    endDateTime: m.endDateTime,
    joinWebUrl: m.joinWebUrl,
    joinMeetingId: m.joinMeetingIdSettings?.joinMeetingId,
    organizer: m.participants?.organizer?.upn,
    attendees: m.participants?.attendees?.map((a) => a.upn),
  });
}

/** By id Graph returns the meeting; by joinWebUrl filter it returns `{ value: [...] }`. */
function shapeMeetingFind(raw: unknown) {
  return Array.isArray((raw as { value?: unknown } | null)?.value)
    ? listShape(meetingSummary)(raw)
    : meetingSummary(raw);
}

/** Transcript → ids, times, and contentPath ready for download-bytes. */
const shapeTranscripts = listShape((raw) => {
  const t = raw as {
    id?: string;
    meetingId?: string;
    createdDateTime?: string;
    endDateTime?: string;
    transcriptContentUrl?: string;
  };
  return compact({
    id: t.id,
    meetingId: t.meetingId,
    createdDateTime: t.createdDateTime,
    endDateTime: t.endDateTime,
    contentPath: t.transcriptContentUrl
      ? `${graphPath(t.transcriptContentUrl)}?$format=text/vtt`
      : undefined,
  });
});

const shapeTeams = listShape((raw) => {
  const t = raw as { id?: string; displayName?: string; description?: string };
  return compact({ id: t.id, displayName: t.displayName, description: t.description });
});

const shapeChannels = listShape((raw) => {
  const c = raw as {
    id?: string;
    displayName?: string;
    description?: string;
    membershipType?: string;
  };
  return compact({
    id: c.id,
    displayName: c.displayName,
    membershipType: c.membershipType,
    description: c.description,
  });
});

export const teamsTools: readonly Tool[] = [
  // ---------- Chats (read) ----------

  {
    name: 'teams-message-search',
    description:
      "Search the signed-in user's Teams messages by content — one-on-one, group and channel — " +
      'and return ranked hits. This is the only way to FIND a message: chats cannot be filtered ' +
      'by what was said, and group chats often have no topic, so listing them identifies nothing. ' +
      'Returns { hits, moreResultsAvailable, nextFrom? }; for the next page resend with from = nextFrom.',
    method: 'POST',
    path: '/search/query',
    // Same scopes the read tools already union: Chat.Read for chat hits,
    // ChannelMessage.Read.All for channel ones. No new consent.
    scopes: ['Chat.Read', 'ChannelMessage.Read.All'],
    readOnly: true,
    execute: flattenedSearch((r) => {
      const from = r['from'] as { emailAddress?: { name?: string } } | undefined;
      const channel = r['channelIdentity'] as { teamId?: string; channelId?: string } | undefined;
      return {
        id: r['id'],
        chatId: r['chatId'],
        teamId: channel?.teamId,
        channelId: channel?.channelId,
        from: from?.emailAddress?.name,
        createdDateTime: r['createdDateTime'],
      };
    }),
    params: [{ name: 'body', location: 'body', schema: messageSearchSchema }],
    llmTip:
      'Each hit has the message id, a summary snippet (not the body), and chatId (a chat) or ' +
      'teamId + channelId (a channel). To read one, follow up with teams-chat-message-get ' +
      '(chatId + id) or teams-channel-message-get (teamId + channelId + id). Graph limits: results ' +
      'cannot be sorted, and only messages the signed-in user can already see are searchable.',
  },
  {
    name: 'teams-chat-list',
    description:
      "List the signed-in user's chats (one-on-one, group, and meeting chats): id, chatType, topic, lastUpdatedDateTime, webUrl. For a quick 'recent chats' summary, $expand=lastMessagePreview and $top=10.",
    method: 'GET',
    path: '/me/chats',
    scopes: ['Chat.ReadBasic'],
    shape: listShape(chatSummary),
    params: [OData.filter, OData.select, OData.orderby, OData.top, OData.skip, OData.expand],
    llmTip:
      'Useful $expand values: lastMessagePreview (most-recent message snippet), members (chat participants). ' +
      "Filter by chatType eq 'oneOnOne' or 'group' or 'meeting' to narrow.",
  },
  {
    name: 'teams-chat-get',
    description: 'Get a single chat by id. Pair with $expand=members to see participants.',
    method: 'GET',
    path: '/chats/{chat-id}',
    scopes: ['Chat.Read'],
    shape: (raw) => chatSummary((raw ?? {}) as Record<string, unknown>),
    params: [
      { name: 'chat-id', location: 'path', schema: z.string().describe('Chat id') },
      OData.select,
      OData.expand,
    ],
  },
  {
    name: 'teams-chat-message-list',
    description:
      'List messages in a chat: id, sender, time, plain-text body (capped at 1,000 chars — get the message for the rest), attachments, mentions. Chats are flat — there is no thread/reply structure (channels have that). Returns messages newest-first by default.',
    method: 'GET',
    path: '/chats/{chat-id}/messages',
    scopes: ['Chat.Read'],
    shape: shapeMessageList,
    params: [
      { name: 'chat-id', location: 'path', schema: z.string().describe('Chat id') },
      OData.filter,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
    ],
  },
  {
    name: 'teams-chat-message-get',
    description: 'Get a single chat message by id, including the full plain-text body.',
    method: 'GET',
    path: '/chats/{chat-id}/messages/{chatMessage-id}',
    scopes: ['Chat.Read'],
    shape: shapeMessage,
    params: [
      { name: 'chat-id', location: 'path', schema: z.string().describe('Chat id') },
      { name: 'chatMessage-id', location: 'path', schema: z.string().describe('Chat message id') },
      OData.select,
    ],
  },

  // ---------- Teams + channels (read) ----------

  {
    name: 'teams-joined-list',
    description: 'List the Teams the signed-in user is a member of.',
    method: 'GET',
    path: '/me/joinedTeams',
    scopes: ['Team.ReadBasic.All'],
    shape: shapeTeams,
    params: [OData.select, OData.top, OData.skip],
  },
  {
    name: 'teams-channel-list',
    description: 'List the channels in a team.',
    method: 'GET',
    path: '/teams/{team-id}/channels',
    scopes: ['Channel.ReadBasic.All'],
    shape: shapeChannels,
    params: [
      { name: 'team-id', location: 'path', schema: z.string().describe('Team id') },
      OData.filter,
      OData.select,
      OData.top,
      OData.skip,
    ],
  },
  {
    name: 'teams-channel-message-list',
    description:
      'List top-level messages (thread roots) in a channel: id, sender, time, subject, plain-text body (capped at 1,000 chars). Use teams-channel-message-reply-list to drill into a specific thread.',
    method: 'GET',
    path: '/teams/{team-id}/channels/{channel-id}/messages',
    scopes: ['ChannelMessage.Read.All'],
    shape: shapeMessageList,
    params: [
      { name: 'team-id', location: 'path', schema: z.string().describe('Team id') },
      { name: 'channel-id', location: 'path', schema: z.string().describe('Channel id') },
      OData.filter,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
    ],
    llmTip:
      'ChannelMessage.Read.All is broad — it reads across every channel the user is in. ' +
      'Start with $top=10.',
  },
  {
    name: 'teams-channel-message-get',
    description:
      'Get a single channel message (thread root) by id, including the full plain-text body.',
    method: 'GET',
    path: '/teams/{team-id}/channels/{channel-id}/messages/{chatMessage-id}',
    scopes: ['ChannelMessage.Read.All'],
    shape: shapeMessage,
    params: [
      { name: 'team-id', location: 'path', schema: z.string().describe('Team id') },
      { name: 'channel-id', location: 'path', schema: z.string().describe('Channel id') },
      {
        name: 'chatMessage-id',
        location: 'path',
        schema: z.string().describe('Channel message (thread root) id'),
      },
      OData.select,
    ],
  },
  {
    name: 'teams-channel-message-reply-list',
    description:
      'List replies to a thread root in a channel (same fields as teams-channel-message-list).',
    method: 'GET',
    path: '/teams/{team-id}/channels/{channel-id}/messages/{chatMessage-id}/replies',
    scopes: ['ChannelMessage.Read.All'],
    shape: shapeMessageList,
    params: [
      { name: 'team-id', location: 'path', schema: z.string().describe('Team id') },
      { name: 'channel-id', location: 'path', schema: z.string().describe('Channel id') },
      {
        name: 'chatMessage-id',
        location: 'path',
        schema: z.string().describe('Channel message (thread root) id'),
      },
      OData.filter,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
    ],
  },

  // ---------- Online meetings (read) ----------

  {
    name: 'teams-online-meeting-find',
    description:
      'Resolve a single online meeting by id OR by joinWebUrl (pass exactly one). Use meeting-id when you already have it; use join-web-url for a user-supplied Teams link (normalize it with parse-teams-url first). Returns id, subject, times, joinWebUrl, joinMeetingId, organizer, attendees.',
    method: 'GET',
    path: '/me/onlineMeetings',
    scopes: ['OnlineMeetings.Read'],
    shape: shapeMeetingFind,
    precondition: assertExactlyOneMeetingKey,
    resolverParams: ['meeting-id', 'join-web-url'],
    pathResolver: (p) => {
      const id = p['meeting-id'];
      if (typeof id === 'string' && id.length > 0) {
        return `/me/onlineMeetings/${encodeURIComponent(id)}`;
      }
      // Double single quotes per OData string-literal escaping so a `'` in the
      // URL can't break out of the filter (bounded to /me/onlineMeetings, but
      // still correct to escape). Build the $filter in code so the model never
      // hand-writes OData.
      const url = String(p['join-web-url'] ?? '').replace(/'/g, "''");
      return `/me/onlineMeetings?$filter=${encodeURIComponent(`joinWebUrl eq '${url}'`)}`;
    },
    params: [
      {
        name: 'meeting-id',
        location: 'query',
        schema: z
          .string()
          .describe('Online meeting id. Provide this OR join-web-url, not both.')
          .optional(),
      },
      {
        name: 'join-web-url',
        location: 'query',
        schema: z
          .string()
          .describe(
            'Teams joinWebUrl (from parse-teams-url). Provide this OR meeting-id, not both.'
          )
          .optional(),
      },
      OData.select,
    ],
    llmTip:
      'Pair with parse-teams-url to normalize a user-supplied Teams link before passing join-web-url.',
  },
  {
    name: 'teams-meeting-transcript-list',
    description:
      'List transcripts for an online meeting: id, times, and contentPath. Fetch the VTT text with download-bytes, target = contentPath.',
    method: 'GET',
    path: '/me/onlineMeetings/{meeting-id}/transcripts',
    scopes: ['OnlineMeetingTranscript.Read.All'],
    shape: shapeTranscripts,
    params: [
      { name: 'meeting-id', location: 'path', schema: z.string().describe('Online meeting id') },
      OData.select,
      OData.top,
      OData.skip,
    ],
    llmTip:
      'OnlineMeetingTranscript.Read.All requires admin consent (already granted on the Areté Entra app).',
  },

  // ---------- Writes ----------

  {
    name: 'teams-chat-create',
    description:
      'Start a Teams chat with colleagues in this tenant: oneOnOne (exactly one other member) or ' +
      'group (two or more). You are added automatically. Returns { id, chatType, topic, webUrl }; send ' +
      'the first message with teams-chat-message-send. A oneOnOne create returns the existing chat ' +
      'if there already is one. Guests and external users are refused.',
    method: 'POST',
    path: '/chats',
    scopes: ['Chat.Create'],
    execute: createChat,
    params: [
      {
        name: 'chatType',
        location: 'body',
        schema: z.enum(['oneOnOne', 'group']).describe('oneOnOne or group'),
      },
      {
        name: 'memberIds',
        location: 'body',
        schema: z
          .array(z.string())
          .min(1)
          .describe(
            'Entra object ids (GUIDs) of the OTHER members — resolve with user-search; do not invent. ' +
              'Do not include yourself.'
          ),
      },
      {
        name: 'topic',
        location: 'body',
        schema: z.string().min(1).optional().describe('Chat title. Group chats only.'),
      },
    ],
  },
  {
    name: 'teams-chat-message-send',
    description:
      'Send a new message to a chat. Returns { id, createdDateTime, webUrl }. Pair with teams-chat-list to find the chat-id.',
    method: 'POST',
    path: '/chats/{chat-id}/messages',
    scopes: ['ChatMessage.Send'],
    shape: shapeSentMessage,
    params: [
      { name: 'chat-id', location: 'path', schema: z.string().describe('Chat id') },
      { name: 'body', location: 'body', schema: chatMessageWriteSchema },
    ],
    llmTip:
      'Prefer body.contentType: "html" — plain text often renders oddly in Teams. ' + MENTION_TIP,
  },
  {
    name: 'teams-channel-message-send',
    description:
      'Start a new thread in a channel by sending a top-level message. Returns { id, createdDateTime, webUrl }; use the id with teams-channel-message-reply-send to add replies. Set body.subject to give the thread a title.',
    method: 'POST',
    path: '/teams/{team-id}/channels/{channel-id}/messages',
    scopes: ['ChannelMessage.Send'],
    shape: shapeSentMessage,
    params: [
      { name: 'team-id', location: 'path', schema: z.string().describe('Team id') },
      { name: 'channel-id', location: 'path', schema: z.string().describe('Channel id') },
      { name: 'body', location: 'body', schema: chatMessageWriteSchema },
    ],
    llmTip:
      'Channel posts vs replies: this endpoint starts a new thread. Use teams-channel-message-reply-send ' +
      'to add to an existing thread. ' +
      MENTION_TIP,
  },
  {
    name: 'teams-channel-message-reply-send',
    description:
      'Add a reply to an existing channel thread. Use teams-channel-message-list to find the thread root id.',
    method: 'POST',
    path: '/teams/{team-id}/channels/{channel-id}/messages/{chatMessage-id}/replies',
    scopes: ['ChannelMessage.Send'],
    shape: shapeSentMessage,
    params: [
      { name: 'team-id', location: 'path', schema: z.string().describe('Team id') },
      { name: 'channel-id', location: 'path', schema: z.string().describe('Channel id') },
      {
        name: 'chatMessage-id',
        location: 'path',
        schema: z.string().describe('Thread root message id'),
      },
      { name: 'body', location: 'body', schema: chatMessageWriteSchema },
    ],
    llmTip: 'Subject on replies is ignored — the thread already has one. ' + MENTION_TIP,
  },
  {
    name: 'teams-online-meeting-create',
    description:
      'Create a Teams online meeting. Returns id, subject, times, joinWebUrl, joinMeetingId. Does NOT add the meeting to the calendar.',
    method: 'POST',
    path: '/me/onlineMeetings',
    scopes: ['OnlineMeetings.ReadWrite'],
    shape: meetingSummary,
    params: [{ name: 'body', location: 'body', schema: onlineMeetingWriteSchema }],
    llmTip: CREATE_MEETING_TIP,
  },
  {
    name: 'teams-online-meeting-update',
    description:
      'Update fields on a Teams online meeting by id. Omitted fields are left unchanged.',
    method: 'PATCH',
    path: '/me/onlineMeetings/{meeting-id}',
    scopes: ['OnlineMeetings.ReadWrite'],
    shape: meetingSummary,
    params: [
      { name: 'meeting-id', location: 'path', schema: z.string().describe('Online meeting id') },
      { name: 'body', location: 'body', schema: onlineMeetingWriteSchema },
    ],
  },
  {
    name: 'teams-online-meeting-delete',
    description:
      'Delete a Teams online meeting by id. The meeting becomes inaccessible to attendees; if there is a corresponding calendar event, delete it separately with calendar-event-delete.',
    method: 'DELETE',
    path: '/me/onlineMeetings/{meeting-id}',
    scopes: ['OnlineMeetings.ReadWrite'],
    params: [
      { name: 'meeting-id', location: 'path', schema: z.string().describe('Online meeting id') },
    ],
  },
];

import { z } from 'zod';
import type GraphClient from '../graph-client.js';
import { OData, type Tool, type ToolPrecondition } from './types.js';
import { isSafePathSegment, requireSafePathSegment } from './graph-path.js';
import { DEFAULT_MAIL_SEND_CONFIG, evaluateMailSend } from '../policy/index.js';
import { resolveTrustedNextLink } from './contacts-cursor.js';
import { getCloudEndpoints } from '../cloud-config.js';

/**
 * Server-side guard: refuses the tool call unless the referenced message is a
 * draft. Mail.ReadWrite covers the entire mailbox at the Graph layer — this
 * guard narrows write capability to drafts for tools whose description says
 * "draft" but whose underlying endpoint accepts any message id.
 *
 * Performs a tiny GET with $select=isDraft to avoid pulling the message body.
 * Uses `makeRequest` (the raw Graph object; throws on Graph errors) — NOT
 * `graphRequest`, which wraps the payload in an MCP text envelope and never
 * throws, so every probe would read `isDraft` as undefined and refuse.
 */
const assertIsDraft: ToolPrecondition = async (
  graphClient: GraphClient,
  params: Record<string, unknown>
) => {
  const id = params['message-id'];
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('message-id is required and must be a non-empty string.');
  }
  const path = `/me/messages/${encodeURIComponent(id)}?$select=isDraft`;
  let msg: { isDraft?: boolean } | null;
  try {
    msg = (await graphClient.makeRequest(path, { method: 'GET' })) as {
      isDraft?: boolean;
    } | null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `could not verify message is a draft (lookup failed: ${message}). The message may not exist or the signed-in user may not have access.`
    );
  }
  if (!msg || msg.isDraft !== true) {
    throw new Error(
      `message '${id}' is not a draft (isDraft=${String(msg?.isDraft)}). ` +
        'This tool refuses to modify non-draft mail. Create a fresh draft with mail-draft-create instead, or have the human action the message in Outlook.'
    );
  }
};

/** A single Outlook recipient as Graph returns it on a message. */
interface GraphRecipient {
  emailAddress?: { address?: string };
}

/** Shape of the precondition probe GET for {@link assertSendWithinDomain}. */
interface DraftSendProbe {
  isDraft?: boolean;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  bccRecipients?: GraphRecipient[];
}

/** Flatten to/cc/bcc into a single list of non-empty SMTP addresses. */
function collectRecipientAddresses(msg: DraftSendProbe): string[] {
  const groups = [msg.toRecipients, msg.ccRecipients, msg.bccRecipients];
  const out: string[] = [];
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const r of group) {
      const address = r?.emailAddress?.address;
      if (typeof address === 'string' && address.trim() !== '') out.push(address.trim());
    }
  }
  return out;
}

/**
 * Server-side guard for {@link mail-draft-send}. Loads the draft, refuses if it
 * is not actually a draft, then enforces the same-domain send policy: the
 * sender (the authenticated caller) and EVERY recipient must share one email
 * domain (and, if the policy pins `allowedDomains`, that domain must be listed).
 *
 * This is the recipient/domain allow-list the README flagged as a precondition
 * for re-enabling send — enforced in code before any `messages/{id}/send` call
 * reaches Graph, independent of the tool description or the model's intent.
 */
const assertSendWithinDomain: ToolPrecondition = async (graphClient, params, ctx) => {
  const id = params['message-id'];
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('message-id is required and must be a non-empty string.');
  }
  const path = `/me/messages/${encodeURIComponent(id)}?$select=isDraft,toRecipients,ccRecipients,bccRecipients`;
  let msg: DraftSendProbe | null;
  try {
    msg = (await graphClient.makeRequest(path, { method: 'GET' })) as DraftSendProbe | null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `could not load the draft to validate recipients (lookup failed: ${message}). The message may not exist or the signed-in user may not have access.`
    );
  }
  if (!msg || msg.isDraft !== true) {
    throw new Error(
      `message '${id}' is not a draft (isDraft=${String(msg?.isDraft)}). ` +
        'mail-draft-send only sends drafts created and reviewed through this server; received or already-sent mail cannot be (re)sent.'
    );
  }

  const recipients = collectRecipientAddresses(msg);
  // Prefer the policy's configured decision; fall back to the fail-safe
  // same-domain default when a tool runs without a policy (e.g. unit tests).
  const decision = ctx.policy?.checkMailSend
    ? ctx.policy.checkMailSend({ senderUpn: ctx.userPrincipalName, recipients })
    : evaluateMailSend(DEFAULT_MAIL_SEND_CONFIG, {
        senderUpn: ctx.userPrincipalName,
        recipients,
      });
  if (!decision.allowed) {
    throw new Error(
      `refusing to send: ${decision.reason} ` +
        'This server only sends mail when the sender and every recipient are in the same domain ' +
        '(configurable via the mailSend policy block).'
    );
  }
};

/**
 * Server-side guard for {@link mail-send} (direct send, no draft). Reads the
 * recipients straight out of the request body (`body.message`) and enforces the
 * exact same same-domain / allowed-domain policy as {@link assertSendWithinDomain}:
 * the sender (authenticated caller) and EVERY recipient must share one email
 * domain (and, if the policy pins `allowedDomains`, that domain must be listed).
 *
 * Unlike the draft path there is no message in the mailbox to probe — the
 * payload IS the message — so the check runs purely against the inbound body
 * before the `/me/sendMail` POST reaches Graph.
 */
const assertDirectSendWithinDomain: ToolPrecondition = async (_graphClient, params, ctx) => {
  const body = params['body'];
  if (!body || typeof body !== 'object') {
    throw new Error('a request body with a `message` is required to send mail.');
  }
  const message = (body as { message?: unknown }).message;
  if (!message || typeof message !== 'object') {
    throw new Error(
      'body.message is required and must be a message object carrying the recipients to validate.'
    );
  }

  const recipients = collectRecipientAddresses(message as DraftSendProbe);
  if (recipients.length === 0) {
    throw new Error('the message has no recipients (to/cc/bcc) to send to.');
  }

  // Prefer the policy's configured decision; fall back to the fail-safe
  // same-domain default when a tool runs without a policy (e.g. unit tests).
  const decision = ctx.policy?.checkMailSend
    ? ctx.policy.checkMailSend({ senderUpn: ctx.userPrincipalName, recipients })
    : evaluateMailSend(DEFAULT_MAIL_SEND_CONFIG, {
        senderUpn: ctx.userPrincipalName,
        recipients,
      });
  if (!decision.allowed) {
    throw new Error(
      `refusing to send: ${decision.reason} ` +
        'This server only sends mail when the sender and every recipient are in the same domain ' +
        '(configurable via the mailSend policy block).'
    );
  }
};

const MAIL_SEARCH_TIP =
  'CRITICAL: When searching emails, the $search parameter value MUST be wrapped in double quotes. ' +
  'Format: $search="your search query here". Use KQL (Keyword Query Language) syntax to search ' +
  "specific properties: 'from:', 'subject:', 'body:', 'to:', 'cc:', 'bcc:', 'attachment:', " +
  "'hasAttachments:', 'importance:', 'received:', 'sent:'. " +
  'Examples: $search="from:john@example.com" | $search="subject:meeting AND hasAttachments:true" | ' +
  '$search="body:urgent AND received>=2024-01-01" | $search="from:john AND importance:high". ' +
  'Reference: https://learn.microsoft.com/en-us/graph/search-query-parameter ' +
  'IMPORTANT: Always use $select to limit returned fields and reduce response size. Recommended default: ' +
  '$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments. ' +
  'Use bodyPreview instead of body for listings. To read the full email body, use mail-message-get with the specific message id.';

/**
 * Outlook recipient: `{ emailAddress: { address, name? } }`. Reused by both
 * to/cc/bcc recipient arrays. `.passthrough()` so Graph extensions don't
 * fail validation.
 */
const emailAddressSchema = z
  .object({
    emailAddress: z
      .object({
        address: z.string().describe('SMTP address (e.g. user@example.com)'),
        name: z.string().optional().describe('Display name'),
      })
      .passthrough(),
  })
  .passthrough();

/** ItemBody on a Message. `contentType` is `text` or `html`. */
const itemBodySchema = z
  .object({
    contentType: z.enum(['text', 'html', 'Text', 'HTML']).describe('text or html'),
    content: z.string().describe('Body content in the chosen contentType'),
  })
  .passthrough();

/**
 * Mutable Message resource. Used as the body shape for mail-draft-create
 * and (in partial form) mail-message-update. Field set kept narrow and
 * commonly-needed; `.passthrough()` allows the LLM to send extras Graph
 * supports without a schema-update round-trip.
 */
const messageWriteSchema = z
  .object({
    subject: z.string().optional(),
    body: itemBodySchema.optional(),
    toRecipients: z.array(emailAddressSchema).optional(),
    ccRecipients: z.array(emailAddressSchema).optional(),
    bccRecipients: z.array(emailAddressSchema).optional(),
    replyTo: z.array(emailAddressSchema).optional(),
    importance: z.enum(['low', 'normal', 'high']).optional(),
    isRead: z.boolean().optional(),
    categories: z.array(z.string()).optional(),
    internetMessageHeaders: z
      .array(z.object({ name: z.string(), value: z.string() }).passthrough())
      .optional(),
  })
  .passthrough();

/**
 * Body shape for {@link mail-send} (`POST /me/sendMail`): the message to send
 * plus an optional `saveToSentItems` flag. The message reuses
 * {@link messageWriteSchema}, so recipients/subject/body/attachments are the
 * same fields as a draft — just sent in one step instead of created first.
 */
const sendMailBodySchema = z
  .object({
    message: messageWriteSchema.describe(
      'The message to send: toRecipients (+ optional cc/bcc), subject, body, etc.'
    ),
    saveToSentItems: z
      .boolean()
      .optional()
      .describe('Whether to save the sent message in Sent Items. Defaults to true.'),
  })
  .passthrough();

/**
 * FileAttachment write shape: `@odata.type` MUST be
 * `#microsoft.graph.fileAttachment`; `contentBytes` is base64. For ItemAttachment
 * / ReferenceAttachment, pass the appropriate @odata.type and additional fields
 * via .passthrough().
 */
const attachmentWriteSchema = z
  .object({
    '@odata.type': z
      .string()
      .describe(
        'Attachment subtype. Use #microsoft.graph.fileAttachment for bytes, ' +
          '#microsoft.graph.itemAttachment to attach another message/event, ' +
          '#microsoft.graph.referenceAttachment for a link.'
      ),
    name: z.string().describe('Display name of the attachment'),
    contentType: z.string().optional().describe('MIME type'),
    contentBytes: z
      .string()
      .optional()
      .describe('Base64-encoded file bytes (required for fileAttachment).'),
    contentId: z.string().optional(),
    isInline: z.boolean().optional(),
  })
  .passthrough();

/** createReply / createReplyAll / createForward, keyed by the tool's `kind` param. */
const REPLY_ACTIONS = {
  reply: 'createReply',
  replyAll: 'createReplyAll',
  forward: 'createForward',
} as const;

/** Graph body for createReply/createReplyAll/createForward: an optional comment plus message overrides. */
const replyDraftBodySchema = z
  .object({
    comment: z
      .string()
      .optional()
      .describe('Text placed above the quoted original. Use this OR message.body, not both.'),
    message: messageWriteSchema
      .optional()
      .describe(
        'Overrides on the new draft. Forward needs message.toRecipients; reply/replyAll may add cc/bcc.'
      ),
  })
  .strict();

const categoryNamesSchema = z.array(z.string().trim().min(1).max(255));

/** add/remove lists shared by the two category-modify tools. */
const categoryChangeParams: Tool['params'] = [
  {
    name: 'add',
    location: 'body',
    schema: categoryNamesSchema
      .optional()
      .describe(
        'Category names to add (see mail-category-list; unknown names still apply, uncolored).'
      ),
  },
  {
    name: 'remove',
    location: 'body',
    schema: categoryNamesSchema.optional().describe('Category names to remove.'),
  },
];

interface CategoryChange {
  add: string[];
  remove: string[];
}

function readCategoryChange(params: Record<string, unknown>): CategoryChange {
  const add = Array.isArray(params['add']) ? params['add'].map(String) : [];
  const remove = Array.isArray(params['remove']) ? params['remove'].map(String) : [];
  if (add.length === 0 && remove.length === 0) {
    throw new Error('pass at least one category name in add or remove.');
  }
  return { add, remove };
}

/**
 * Apply add/remove to a message's categories. Outlook category names compare
 * case-insensitively; existing entries keep their original casing and order.
 */
function applyCategoryChange(current: string[], change: CategoryChange): string[] {
  const removed = new Set(change.remove.map((c) => c.toLowerCase()));
  const next = current.filter((c) => !removed.has(c.toLowerCase()));
  for (const name of change.add) {
    if (!next.some((c) => c.toLowerCase() === name.toLowerCase())) next.push(name);
  }
  return next;
}

interface MessageCategories {
  id: string;
  categories?: string[];
}

/**
 * Received-mail exception to the draft-only rule: these handlers PATCH a body
 * the server builds from validated names — `{ categories }` and nothing else —
 * so a caller cannot reach isRead, flag, folder, or content through them.
 */
const modifyMessageCategories: NonNullable<Tool['execute']> = async (graphClient, params) => {
  const messageId = String(params['message-id'] ?? '');
  const path = `/me/messages/${requireSafePathSegment(messageId, 'message-id')}`;
  const change = readCategoryChange(params);
  const msg = (await graphClient.makeRequest(`${path}?$select=categories`, {
    method: 'GET',
  })) as MessageCategories | null;
  const before = msg?.categories ?? [];
  const after = applyCategoryChange(before, change);
  if (after.join('\u0000') === before.join('\u0000')) {
    return { id: messageId, categories: before, changed: false };
  }
  await graphClient.makeRequest(path, {
    method: 'PATCH',
    body: JSON.stringify({ categories: after }),
  });
  return { id: messageId, categories: after, changed: true };
};

/** Refuse threads larger than this rather than half-label them. */
const MAX_THREAD_MESSAGES = 100;

const modifyThreadCategories: NonNullable<Tool['execute']> = async (graphClient, params) => {
  const conversationId = String(params['conversation-id'] ?? '');
  if (conversationId === '') throw new Error('conversation-id is required.');
  const change = readCategoryChange(params);

  // Collect the whole thread before writing anything, so an oversized or
  // unreadable thread fails without partial changes.
  const filter = `conversationId eq '${conversationId.replace(/'/g, "''")}'`;
  let next: string | null =
    `/me/messages?$filter=${encodeURIComponent(filter)}&$select=id,categories&$top=50`;
  const messages: MessageCategories[] = [];
  while (next) {
    const page = (await graphClient.makeRequest(next, { method: 'GET' })) as {
      value?: MessageCategories[];
      '@odata.nextLink'?: string;
    } | null;
    messages.push(...(page?.value ?? []));
    if (messages.length > MAX_THREAD_MESSAGES) {
      throw new Error(
        `conversation has more than ${MAX_THREAD_MESSAGES} messages; refusing to bulk-categorize it. ` +
          'Use mail-message-categories-modify on the specific messages instead.'
      );
    }
    const nextLink = page?.['@odata.nextLink'];
    if (!nextLink) break;
    next = resolveTrustedNextLink(nextLink, getCloudEndpoints().graphApi, '/me/messages');
    if (!next) throw new Error('Graph returned an unexpected nextLink; refusing to follow it.');
  }
  if (messages.length === 0) {
    throw new Error(`no messages found for conversation-id '${conversationId}'.`);
  }

  const updated: MessageCategories[] = [];
  const failed: { id: string; error: string }[] = [];
  let unchanged = 0;
  for (const msg of messages) {
    const before = msg.categories ?? [];
    const after = applyCategoryChange(before, change);
    if (after.join('\u0000') === before.join('\u0000')) {
      unchanged++;
      continue;
    }
    try {
      await graphClient.makeRequest(`/me/messages/${requireSafePathSegment(msg.id, 'id')}`, {
        method: 'PATCH',
        body: JSON.stringify({ categories: after }),
      });
      updated.push({ id: msg.id, categories: after });
    } catch (err) {
      failed.push({ id: msg.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  if (failed.length > 0 && updated.length === 0) {
    throw new Error(`every update failed: ${JSON.stringify(failed)}`);
  }
  return { conversationId, matched: messages.length, unchanged, updated, failed };
};

const categoryIdParam = {
  name: 'category-id',
  location: 'path' as const,
  schema: z
    .string()
    .refine(isSafePathSegment, { message: "must be a single opaque id, not '.'/'..' or with '/'" })
    .describe('Category id from mail-category-list'),
};

/** Recipient list → bare SMTP addresses. */
function addresses(list: GraphRecipient[] | undefined): string[] {
  return (list ?? []).map((r) => r.emailAddress?.address).filter((a): a is string => !!a);
}

/**
 * New reply/forward draft → what the agent needs next: the id (for
 * mail-message-update / mail-draft-send), the recipients Graph filled in (to
 * check before sending), and webLink for the human. The quoted body is
 * omitted; read it with mail-message-get if needed.
 */
function shapeDraft(raw: unknown) {
  const m = (raw ?? {}) as DraftSendProbe & { id?: string; subject?: string; webLink?: string };
  return {
    id: m.id,
    subject: m.subject,
    to: addresses(m.toRecipients),
    cc: addresses(m.ccRecipients),
    bcc: addresses(m.bccRecipients),
    webLink: m.webLink,
  };
}

/** outlookCategory → id, name, color (drops @odata.context). */
function shapeCategory(raw: unknown) {
  const c = (raw ?? {}) as { id?: string; displayName?: string; color?: string };
  return { id: c.id, displayName: c.displayName, color: c.color };
}

const categoryColorSchema = z
  .enum(['none', ...Array.from({ length: 25 }, (_, i) => `preset${i}`)] as [string, ...string[]])
  .describe(
    'Preset color: preset0 red, 1 orange, 2 brown, 3 yellow, 4 green, 5 teal, 6 olive, 7 blue, ' +
      '8 purple, 9 cranberry, 10 steel, 11 dark steel, 12 gray, 13 dark gray, 14 black, ' +
      '15–24 dark red/orange/brown/yellow/green/teal/olive/blue/purple/cranberry; none = no color.'
  );

export const mailTools: readonly Tool[] = [
  {
    name: 'mail-message-list',
    description:
      "List the signed-in user's mail messages. Pass folder-id to scope to one folder (discover ids with mail-folder-list); omit to list across the whole mailbox.",
    method: 'GET',
    path: '/me/messages',
    scopes: ['Mail.Read'],
    projection: 'mail',
    resolverParams: ['folder-id'],
    pathResolver: (p) =>
      typeof p['folder-id'] === 'string' && p['folder-id'].length > 0
        ? `/me/mailFolders/${encodeURIComponent(p['folder-id'])}/messages`
        : '/me/messages',
    params: [
      {
        name: 'folder-id',
        location: 'query',
        schema: z
          .string()
          .describe(
            'Optional mail folder id (from mail-folder-list). Omit to list across all folders.'
          )
          .optional(),
      },
      OData.filter,
      OData.search,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
      OData.count,
      OData.expand,
    ],
    llmTip: MAIL_SEARCH_TIP,
  },
  {
    name: 'mail-message-get',
    description: 'Get a mail message by id, including the full body.',
    method: 'GET',
    path: '/me/messages/{message-id}',
    scopes: ['Mail.Read'],
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Mail message id'),
      },
      OData.select,
      OData.expand,
    ],
  },
  {
    name: 'mail-folder-list',
    description: "List the signed-in user's top-level mail folders.",
    method: 'GET',
    path: '/me/mailFolders',
    scopes: ['Mail.Read'],
    params: [OData.filter, OData.select, OData.orderby, OData.top, OData.skip, OData.count],
  },
  {
    name: 'mail-attachment-list',
    description:
      'List attachments on a mail message. Use download-bytes with the attachment $value path to fetch bytes.',
    method: 'GET',
    path: '/me/messages/{message-id}/attachments',
    scopes: ['Mail.Read'],
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Mail message id'),
      },
      OData.select,
      OData.top,
      OData.skip,
    ],
  },

  // ---------- Write tools (PR 4) ----------

  {
    name: 'mail-draft-create',
    description:
      "Create a draft email in the signed-in user's Drafts folder. Returns the new message including its id. The draft stays in Drafts until it is either sent with mail-draft-send (allowed only when the sender and every recipient share the same domain) or reviewed and sent by the human in Outlook.",
    method: 'POST',
    path: '/me/messages',
    scopes: ['Mail.ReadWrite'],
    params: [
      {
        name: 'body',
        location: 'body',
        schema: messageWriteSchema,
      },
    ],
    llmTip:
      'Resolve recipient addresses with user-search (or a known contact) before drafting; do not invent SMTP addresses. ' +
      'For HTML bodies set body.contentType to "html"; otherwise "text". ' +
      'After creating the draft, tell the human it is waiting in their Drafts folder for review — the model cannot send it.',
  },
  {
    name: 'mail-draft-reply-create',
    description:
      'Create a reply, reply-all, or forward DRAFT of an existing message (kind = reply | replyAll | forward). ' +
      'Graph threads it correctly and quotes the original. Returns { id, subject, to, cc, bcc, webLink } ' +
      'so you can check the recipients Graph filled in; edit the draft with mail-message-update and send ' +
      'it with mail-draft-send (same-domain rule applies), or leave it in Drafts for the human.',
    method: 'POST',
    path: '/me/messages/{message-id}/createReply',
    scopes: ['Mail.ReadWrite'],
    shape: shapeDraft,
    resolverParams: ['message-id', 'kind'],
    pathResolver: (p) => {
      const kind = String(p['kind']);
      if (!Object.prototype.hasOwnProperty.call(REPLY_ACTIONS, kind)) {
        throw new Error('kind must be reply, replyAll, or forward.');
      }
      const action = REPLY_ACTIONS[kind as keyof typeof REPLY_ACTIONS];
      const id = requireSafePathSegment(String(p['message-id'] ?? ''), 'message-id');
      return `/me/messages/${id}/${action}`;
    },
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Id of the message being replied to or forwarded'),
      },
      {
        name: 'kind',
        location: 'path',
        schema: z.enum(['reply', 'replyAll', 'forward']).describe('reply, replyAll, or forward'),
      },
      { name: 'body', location: 'body', schema: replyDraftBodySchema.optional() },
    ],
  },
  {
    name: 'mail-message-update',
    description:
      'Update fields on a draft mail message by id. Any field omitted is left unchanged. The server refuses this call if the message is not a draft (isDraft=true) — non-drafts must be actioned by the human in Outlook.',
    method: 'PATCH',
    path: '/me/messages/{message-id}',
    scopes: ['Mail.ReadWrite'],
    precondition: assertIsDraft,
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Draft message id (must satisfy isDraft=true)'),
      },
      {
        name: 'body',
        location: 'body',
        schema: messageWriteSchema,
      },
    ],
  },
  {
    name: 'mail-attachment-add',
    description:
      'Add an attachment to a draft message. For files under 3 MB pass base64 in contentBytes; for larger files use Graph upload sessions (not exposed in v1). The server refuses this call if the message is not a draft.',
    method: 'POST',
    path: '/me/messages/{message-id}/attachments',
    scopes: ['Mail.ReadWrite'],
    precondition: assertIsDraft,
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Draft message id (must satisfy isDraft=true)'),
      },
      {
        name: 'body',
        location: 'body',
        schema: attachmentWriteSchema,
      },
    ],
  },
  {
    name: 'mail-message-delete',
    description:
      'Move a draft mail message to Deleted Items by id. The server refuses this call if the message is not a draft — received and sent mail must be actioned by the human in Outlook (the LLM cannot mass-delete an inbox via this tool).',
    method: 'DELETE',
    path: '/me/messages/{message-id}',
    scopes: ['Mail.ReadWrite'],
    precondition: assertIsDraft,
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Draft message id (must satisfy isDraft=true)'),
      },
    ],
  },
  {
    name: 'mail-draft-send',
    description:
      'Send an existing draft message by id. The server refuses unless (a) the message is a draft and ' +
      '(b) the sender and EVERY recipient (to/cc/bcc) are in the same email domain, per the mailSend policy ' +
      '(default: internal-only, e.g. @aretepartners.com). Cross-domain or external recipients are rejected in ' +
      'code before anything reaches Graph — set the recipients on the draft (mail-draft-create / mail-message-update) and review them first.',
    method: 'POST',
    path: '/me/messages/{message-id}/send',
    scopes: ['Mail.Send'],
    precondition: assertSendWithinDomain,
    params: [
      {
        name: 'message-id',
        location: 'path',
        schema: z.string().describe('Draft message id to send (must satisfy isDraft=true)'),
      },
    ],
    llmTip:
      'Use only after the draft exists and its recipients are confirmed. If the send is refused for a ' +
      'cross-domain recipient, do NOT retry by rewriting recipients — the human must send externally from Outlook. ' +
      'On success Graph returns 202 with no body; the draft moves to Sent Items.',
  },
  {
    name: 'mail-send',
    description:
      'Send an email in one step, WITHOUT first creating a draft (POST /me/sendMail). Pass the whole ' +
      'message (recipients, subject, body, optional attachments) in body.message. The server refuses ' +
      'unless (a) the message has recipients and (b) the sender and EVERY recipient (to/cc/bcc) are in ' +
      'the same email domain, per the mailSend policy (default: internal-only, e.g. @aretepartners.com). ' +
      'This is the SAME same-domain / allowed-domain guard that protects mail-draft-send, enforced in ' +
      'code before anything reaches Graph. Prefer mail-draft-create when the human should review the ' +
      'message in Outlook before it goes out; use mail-send for unattended/internal sends.',
    method: 'POST',
    path: '/me/sendMail',
    scopes: ['Mail.Send'],
    precondition: assertDirectSendWithinDomain,
    params: [
      {
        name: 'body',
        location: 'body',
        schema: sendMailBodySchema,
      },
    ],
    llmTip:
      'This delivers mail immediately with no draft to review, so it pairs well with an out-of-band ' +
      'human-in-the-loop confirmation step BEFORE you call it: a request_human_input tool (if the host ' +
      'exposes one) or an MCP elicitation request, so the operator approves the recipients and content ' +
      'first. Resolve recipient addresses with user-search (or a known contact) before sending; do not ' +
      'invent SMTP addresses. For HTML bodies set body.message.body.contentType to "html"; otherwise "text". ' +
      'If the send is refused for a cross-domain recipient, do NOT retry by rewriting recipients — the ' +
      'human must send externally from Outlook. On success Graph returns 202 with no body.',
  },

  // ---------- Categories (Outlook's labels) ----------

  {
    name: 'mail-category-list',
    description:
      "List the signed-in user's Outlook categories (the master list: name + color). Messages carry " +
      'categories by name in their `categories` field.',
    method: 'GET',
    path: '/me/outlook/masterCategories',
    scopes: ['MailboxSettings.Read'],
    params: [OData.filter, OData.select],
  },
  {
    name: 'mail-category-create',
    description:
      'Add a category to the master list. displayName must be unique and cannot be renamed later; ' +
      'only the color can change (mail-category-update).',
    method: 'POST',
    path: '/me/outlook/masterCategories',
    scopes: ['MailboxSettings.ReadWrite'],
    shape: shapeCategory,
    params: [
      {
        name: 'body',
        location: 'body',
        schema: z
          .object({
            displayName: z.string().trim().min(1).max(255).describe('Category name'),
            color: categoryColorSchema.optional(),
          })
          .strict(),
      },
    ],
  },
  {
    name: 'mail-category-update',
    description:
      "Change a category's color. Graph does not allow renaming — to rename, create the new " +
      'category, move messages to it, then delete the old one.',
    method: 'PATCH',
    path: '/me/outlook/masterCategories/{category-id}',
    scopes: ['MailboxSettings.ReadWrite'],
    shape: shapeCategory,
    params: [
      categoryIdParam,
      {
        name: 'body',
        location: 'body',
        schema: z.object({ color: categoryColorSchema }).strict(),
      },
    ],
  },
  {
    name: 'mail-category-delete',
    description:
      'Delete a category from the master list. Messages already tagged keep the name, uncolored; ' +
      'remove it from them with mail-message-categories-modify / mail-thread-categories-modify.',
    method: 'DELETE',
    path: '/me/outlook/masterCategories/{category-id}',
    scopes: ['MailboxSettings.ReadWrite'],
    params: [categoryIdParam],
  },
  {
    name: 'mail-message-categories-modify',
    description:
      'Add and/or remove categories on ONE message — received, sent, or draft. Changes only the ' +
      'categories; nothing else on the message. Returns the resulting category list.',
    method: 'PATCH',
    path: '/me/messages/{message-id}',
    scopes: ['Mail.ReadWrite'],
    execute: modifyMessageCategories,
    params: [
      { name: 'message-id', location: 'path', schema: z.string().describe('Mail message id') },
      ...categoryChangeParams,
    ],
  },
  {
    name: 'mail-thread-categories-modify',
    description:
      `Add and/or remove categories on EVERY message in a conversation (up to ${MAX_THREAD_MESSAGES} ` +
      'messages; larger threads are refused untouched). Changes only the categories. Get the ' +
      'conversationId from mail-message-get / mail-message-list. Returns per-message results.',
    method: 'PATCH',
    path: '/me/messages',
    scopes: ['Mail.ReadWrite'],
    execute: modifyThreadCategories,
    params: [
      {
        name: 'conversation-id',
        location: 'query',
        schema: z.string().min(1).describe('conversationId of the thread'),
      },
      ...categoryChangeParams,
    ],
  },
];

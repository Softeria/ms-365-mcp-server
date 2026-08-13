/**
 * Signoff wrapped around outgoing agent-authored message content so recipients
 * can tell agent-sent messages from ones the account owner typed themselves.
 * Opt-in: MS365_MCP_MESSAGE_SIGNOFF_PREFIX and MS365_MCP_MESSAGE_SIGNOFF_SUFFIX
 * set the text (e.g. 🤖); both default to none, so messages go out as-is unless
 * the operator configures a marker (cli.ts maps the --message-signoff flags
 * onto them). Read at send time, mirroring the confirm gate in
 * destructive-ops.ts.
 *
 * Enforced at the Graph request layer (GraphClient.performRequest), keyed on
 * method + path rather than tool alias, so one gate covers the Teams
 * send/reply tools, the PATCH tools that could rewrite an already-signed
 * message, mail draft writes (POST .../send carries no body, so draft content
 * is signed where it is written), direct mail sends (sendMail, the
 * reply/replyAll/forward actions, group thread replies - shared-mailbox
 * variants included), and $batch sub-requests.
 */

import { parseFragment, serialize } from 'parse5';

/** A signable request whose body the signoff could not be applied to. */
export class MessageSignoffError extends Error {
  constructor(target: string, reason: string) {
    super(
      `${target}: a message signoff is configured but could not be applied - ${reason}. ` +
        `Provide the message as { body: { contentType, content } }, or disable the signoff ` +
        `(--no-message-signoff / unset the MS365_MCP_MESSAGE_SIGNOFF_* env vars).`
    );
    this.name = 'MessageSignoffError';
  }
}

function resolveEnvText(name: string, defaultValue?: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) {
    return defaultValue;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** The configured leading signoff text, or undefined when not configured. */
export function resolveMessageSignoffPrefix(): string | undefined {
  return resolveEnvText('MS365_MCP_MESSAGE_SIGNOFF_PREFIX');
}

/** The configured trailing signoff text, or undefined when disabled. */
export function resolveMessageSignoffSuffix(): string | undefined {
  return resolveEnvText('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX');
}

interface Parse5Node {
  nodeName: string;
  value?: string;
  childNodes?: Parse5Node[];
}

/** The text an html fragment renders as (text nodes only, markup dropped). */
function renderedText(html: string): string {
  const collect = (node: Parse5Node): string =>
    node.nodeName === '#text' ? (node.value ?? '') : (node.childNodes ?? []).map(collect).join('');
  return collect(parseFragment(html) as unknown as Parse5Node);
}

/**
 * Startup guard: a marker may deliberately contain markup (say, a coloured
 * <span>), but markup that renders as empty text would make html messages go
 * out looking unsigned while the operator believes a signoff is configured.
 */
export function assertSignoffMarkersVisible(): void {
  for (const [name, marker] of [
    ['MS365_MCP_MESSAGE_SIGNOFF_PREFIX', resolveMessageSignoffPrefix()],
    ['MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', resolveMessageSignoffSuffix()],
  ] as const) {
    if (marker === undefined || !marker.includes('<')) continue;
    if (renderedText(marker).trim() === '') {
      throw new Error(
        `${name} ("${marker}") renders as empty text in html messages, so the signoff would be ` +
          `invisible. Put visible text inside the markup (e.g. <span style="color:gray">🤖</span>) ` +
          `or use plain text.`
      );
    }
  }
}

function markerAlreadyAt(
  content: string,
  marker: string,
  isHtml: boolean,
  at: 'start' | 'end'
): boolean {
  const text = isHtml ? renderedText(content) : content;
  const markerText = (isHtml ? renderedText(marker) : marker).trim();
  if (markerText === '') return false;
  return at === 'start'
    ? text.trimStart().startsWith(markerText)
    : text.trimEnd().endsWith(markerText);
}

/**
 * Wrap content in the configured markers. A marker already present is not
 * doubled, so an agent editing a signed message (GET, modify, PATCH back)
 * does not stack signoffs; html bodies compare on rendered text, since Graph
 * returns stored content re-wrapped in markup.
 */
function signContent(content: string, isHtml: boolean, prefix?: string, suffix?: string): string {
  let signed = content;
  if (suffix !== undefined && !markerAlreadyAt(signed, suffix, isHtml, 'end')) {
    // An unterminated construct in html content (a trailing "<!--" or "<tag")
    // would swallow anything appended after it, so close/drop such constructs by
    // parsing and re-serializing before the suffix goes on. A prefix needs no
    // such protection - nothing later in the string can unrender it.
    signed = `${isHtml ? serialize(parseFragment(signed)) : signed} ${suffix}`;
  }
  if (prefix !== undefined && !markerAlreadyAt(signed, prefix, isHtml, 'start')) {
    signed = `${prefix} ${signed}`;
  }
  return signed;
}

type Json = Record<string, unknown>;

function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Sign the { body: { contentType, content } } (itemBody) nested in payload. */
function signItemBodyContainer(
  target: string,
  payload: Json,
  prefix?: string,
  suffix?: string
): Json {
  const message = payload.body;
  if (!isPlainObject(message)) {
    throw new MessageSignoffError(target, 'the body has no nested body (itemBody) object');
  }
  const content = message.content;
  if (typeof content !== 'string') {
    throw new MessageSignoffError(target, 'the body has no content string');
  }
  const contentType = message.contentType;
  const isHtml = typeof contentType === 'string' && contentType.toLowerCase() === 'html';
  return {
    ...payload,
    body: { ...message, content: signContent(content, isHtml, prefix, suffix) },
  };
}

/** POST of a new chatMessage: fail closed - the send must carry signable content. */
function signMessageSend(
  target: string,
  payload: unknown,
  prefix?: string,
  suffix?: string
): unknown {
  if (!isPlainObject(payload)) {
    throw new MessageSignoffError(target, 'the body is not a chatMessage object');
  }
  return signItemBodyContainer(target, payload, prefix, suffix);
}

/**
 * Writes that may carry an itemBody (chatMessage PATCH, mail draft
 * create/update): a payload rewriting body.content must re-sign it; one not
 * touching the body (an isRead flip, a subject-only draft) passes through.
 */
function signWhenBodyPresent(
  target: string,
  payload: unknown,
  prefix?: string,
  suffix?: string
): unknown {
  if (!isPlainObject(payload) || payload.body === undefined) return payload;
  return signItemBodyContainer(target, payload, prefix, suffix);
}

/**
 * Reply/forward actions ({ comment, message? }) - both the draft creators
 * (createReply/createReplyAll/createForward) and the direct sends
 * (reply/replyAll/forward): sign the comment and any inline message body;
 * the quoted original is not agent-authored, so a bare forward passes.
 */
function signReplyForwardDraft(
  target: string,
  payload: unknown,
  prefix?: string,
  suffix?: string
): unknown {
  if (!isPlainObject(payload)) return payload;
  let signed = payload;
  if (typeof signed.comment === 'string' && signed.comment.trim() !== '') {
    signed = { ...signed, comment: signContent(signed.comment, false, prefix, suffix) };
  }
  const message = signed.message;
  if (isPlainObject(message) && message.body !== undefined) {
    signed = { ...signed, message: signItemBodyContainer(target, message, prefix, suffix) };
  }
  return signed;
}

/**
 * POST .../sendMail: the outbound message rides in payload.message. Fail
 * closed - a direct send is the same class as a Teams send, so it must carry
 * signable content.
 */
function signSendMail(target: string, payload: unknown, prefix?: string, suffix?: string): unknown {
  if (!isPlainObject(payload) || !isPlainObject(payload.message)) {
    throw new MessageSignoffError(target, 'the body has no message object');
  }
  return { ...payload, message: signItemBodyContainer(target, payload.message, prefix, suffix) };
}

/** POST /groups/.../threads/.../reply: the outbound post rides in payload.post. */
function signGroupThreadReply(
  target: string,
  payload: unknown,
  prefix?: string,
  suffix?: string
): unknown {
  if (!isPlainObject(payload) || !isPlainObject(payload.post)) {
    throw new MessageSignoffError(target, 'the body has no post object');
  }
  return { ...payload, post: signItemBodyContainer(target, payload.post, prefix, suffix) };
}

interface SignoffRule {
  method: 'POST' | 'PATCH';
  pattern: RegExp;
  apply: (target: string, payload: unknown, prefix?: string, suffix?: string) => unknown;
}

/**
 * method + path pairs whose request body carries user-visible message content
 * an agent authors. Keyed on the Graph path, not the MCP tool alias, so every
 * route to the same resource (including $batch sub-requests) hits the gate.
 */
const SIGNOFF_RULES: SignoffRule[] = [
  // Teams sends and replies
  { method: 'POST', pattern: /^\/chats\/[^/]+\/messages$/, apply: signMessageSend },
  { method: 'POST', pattern: /^\/chats\/[^/]+\/messages\/[^/]+\/replies$/, apply: signMessageSend },
  {
    method: 'POST',
    pattern: /^\/teams\/[^/]+\/channels\/[^/]+\/messages$/,
    apply: signMessageSend,
  },
  {
    method: 'POST',
    pattern: /^\/teams\/[^/]+\/channels\/[^/]+\/messages\/[^/]+\/replies$/,
    apply: signMessageSend,
  },
  // Teams edits - a PATCH rewriting body.content must keep the signoff
  { method: 'PATCH', pattern: /^\/chats\/[^/]+\/messages\/[^/]+$/, apply: signWhenBodyPresent },
  {
    method: 'PATCH',
    pattern: /^\/teams\/[^/]+\/channels\/[^/]+\/messages\/[^/]+(?:\/replies\/[^/]+)?$/,
    apply: signWhenBodyPresent,
  },
  // Mail drafts - send-draft-message (POST .../send) carries no body to sign,
  // so draft content is signed where it is written instead
  {
    method: 'POST',
    pattern: /^\/(?:me|users\/[^/]+)(?:\/mailFolders\/[^/]+)?\/messages$/,
    apply: signWhenBodyPresent,
  },
  {
    method: 'PATCH',
    pattern: /^\/(?:me|users\/[^/]+)(?:\/mailFolders\/[^/]+)?\/messages\/[^/]+$/,
    apply: signWhenBodyPresent,
  },
  {
    method: 'POST',
    pattern: /^\/(?:me|users\/[^/]+)\/messages\/[^/]+\/create(?:Reply|ReplyAll|Forward)$/,
    apply: signReplyForwardDraft,
  },
  // Direct mail sends - straight out with no draft step, so they are signed
  // (and fail closed) like a Teams send. Covers the /users/{id} shared-mailbox
  // variants of each
  {
    method: 'POST',
    pattern: /^\/(?:me|users\/[^/]+)\/sendMail$/,
    apply: signSendMail,
  },
  {
    method: 'POST',
    pattern: /^\/(?:me|users\/[^/]+)\/messages\/[^/]+\/(?:reply|replyAll|forward)$/,
    apply: signReplyForwardDraft,
  },
  {
    method: 'POST',
    pattern: /^\/groups\/[^/]+\/threads\/[^/]+\/reply$/,
    apply: signGroupThreadReply,
  },
];

/**
 * Query-stripped, version-stripped path for rule matching. $batch sub-request
 * urls are relative to the version root but defensively may carry one.
 */
function normalizePath(path: string): string {
  let clean = path.split('?')[0];
  clean = clean.replace(/^\/(?:v1\.0|beta)(?=\/)/, '');
  if (!clean.startsWith('/')) clean = `/${clean}`;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean;
}

function parseIfString(target: string, body: unknown): unknown {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    throw new MessageSignoffError(target, 'the body is a string that is not valid JSON');
  }
}

/** Apply the rules to every sub-request of a JSON $batch payload. */
function signBatchPayload(payload: unknown, prefix?: string, suffix?: string): unknown {
  if (!isPlainObject(payload) || !Array.isArray(payload.requests)) {
    // Not a shape Graph will accept, so nothing here can go out unsigned.
    return payload;
  }
  const requests = payload.requests.map((entry) => {
    if (!isPlainObject(entry) || typeof entry.url !== 'string') return entry;
    const method = typeof entry.method === 'string' ? entry.method.toUpperCase() : '';
    const path = normalizePath(entry.url);
    const target = `${method} ${path} (in $batch)`;
    if (path === '/$batch') {
      return {
        ...entry,
        body: signBatchPayload(parseIfString(target, entry.body), prefix, suffix),
      };
    }
    const rule = SIGNOFF_RULES.find((r) => r.method === method && r.pattern.test(path));
    if (!rule) return entry;
    return {
      ...entry,
      body: rule.apply(target, parseIfString(target, entry.body), prefix, suffix),
    };
  });
  return { ...payload, requests };
}

/**
 * Gate an outbound Graph request through the signoff. Returns the body to send
 * (re-serialized when it arrived as a string and was changed). Fail-closed: a
 * request matching a signable route whose body cannot carry the signoff throws
 * MessageSignoffError rather than letting the message out unsigned.
 */
export function applyMessageSignoffToRequest(
  method: string,
  path: string,
  body: string | Buffer | Uint8Array | undefined
): string | Buffer | Uint8Array | undefined {
  const prefix = resolveMessageSignoffPrefix();
  const suffix = resolveMessageSignoffSuffix();
  if (prefix === undefined && suffix === undefined) return body;

  const upperMethod = method.toUpperCase();
  const cleanPath = normalizePath(path);
  const isBatch = upperMethod === 'POST' && cleanPath === '/$batch';
  const rule = isBatch
    ? undefined
    : SIGNOFF_RULES.find((r) => r.method === upperMethod && r.pattern.test(cleanPath));
  if (!isBatch && !rule) return body;

  const target = `${upperMethod} ${cleanPath}`;
  if (body !== undefined && typeof body !== 'string') {
    throw new MessageSignoffError(target, 'the body is binary, not a signable JSON payload');
  }
  const payload = parseIfString(target, body);
  const signed = isBatch
    ? signBatchPayload(payload, prefix, suffix)
    : rule!.apply(target, payload, prefix, suffix);
  if (signed === payload) return body;
  return JSON.stringify(signed);
}

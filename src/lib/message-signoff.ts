/**
 * Signoff wrapped around outgoing Teams messages so recipients can tell
 * agent-sent messages from ones the account owner typed themselves.
 * MS365_MCP_MESSAGE_SIGNOFF_PREFIX (default 🤖) and
 * MS365_MCP_MESSAGE_SIGNOFF_SUFFIX (default none) set the text; empty values
 * disable (cli.ts maps the --message-signoff flags onto them). Read at send
 * time, mirroring the confirm gate in destructive-ops.ts.
 */

import { parseFragment, serialize } from 'parse5';

export const DEFAULT_MESSAGE_SIGNOFF_PREFIX = '🤖';

/** Teams send/reply tools whose outgoing body carries a chatMessage. */
const SIGNOFF_TOOL_ALIASES = new Set([
  'send-chat-message',
  'reply-to-chat-message',
  'send-channel-message',
  'reply-to-channel-message',
]);

/** A Teams send whose body the signoff could not be applied to (see applyMessageSignoff). */
export class MessageSignoffError extends Error {
  constructor(toolAlias: string, reason: string) {
    super(
      `${toolAlias}: a message signoff is configured but could not be applied - ${reason}. ` +
        `Provide the message as { body: { contentType, content } }, or disable the signoff ` +
        `(--no-message-signoff / MS365_MCP_MESSAGE_SIGNOFF_PREFIX="").`
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

/** The configured leading signoff text, or undefined when disabled. */
export function resolveMessageSignoffPrefix(): string | undefined {
  return resolveEnvText('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', DEFAULT_MESSAGE_SIGNOFF_PREFIX);
}

/** The configured trailing signoff text, or undefined when disabled. */
export function resolveMessageSignoffSuffix(): string | undefined {
  return resolveEnvText('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX');
}

/**
 * Wrap a chatMessage request body's content ({ body: { content } }) in the
 * configured prefix/suffix, returning a new object. Non-Teams tools and
 * disabled signoffs pass through untouched. Fail-closed: a Teams send whose
 * body does not carry a signable content string throws MessageSignoffError
 * rather than letting the message out unsigned. A pre-serialized JSON string
 * body is parsed so it cannot sidestep the signoff.
 */
export function applyMessageSignoff(toolAlias: string, body: unknown): unknown {
  if (!SIGNOFF_TOOL_ALIASES.has(toolAlias)) {
    return body;
  }
  const prefix = resolveMessageSignoffPrefix();
  const suffix = resolveMessageSignoffSuffix();
  if (prefix === undefined && suffix === undefined) {
    return body;
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      throw new MessageSignoffError(toolAlias, 'the body is a string that is not valid JSON');
    }
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new MessageSignoffError(toolAlias, 'the body is not a chatMessage object');
  }
  const outer = body as Record<string, unknown>;
  const message = outer.body;
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    throw new MessageSignoffError(toolAlias, 'the body has no nested body (itemBody) object');
  }
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== 'string') {
    throw new MessageSignoffError(toolAlias, 'the body has no content string');
  }
  const contentType = (message as Record<string, unknown>).contentType;
  const isHtml = typeof contentType === 'string' && contentType.toLowerCase() === 'html';
  // An unterminated construct in html content (a trailing "<!--" or "<tag")
  // would swallow anything appended after it, so close/drop such constructs by
  // parsing and re-serializing before the suffix goes on. A prefix needs no
  // such protection - nothing later in the string can unrender it.
  const base = isHtml && suffix !== undefined ? serialize(parseFragment(content)) : content;
  const signed = [prefix, base, suffix].filter((part) => part !== undefined).join(' ');
  return { ...outer, body: { ...message, content: signed } };
}

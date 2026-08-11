import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';
import {
  applyMessageSignoff,
  DEFAULT_MESSAGE_SIGNOFF_PREFIX,
  MessageSignoffError,
  resolveMessageSignoffPrefix,
  resolveMessageSignoffSuffix,
} from '../src/lib/message-signoff.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const chatMessage = (content: string) => ({ body: { contentType: 'html', content } });

describe('resolveMessageSignoffPrefix / resolveMessageSignoffSuffix', () => {
  beforeEach(() => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', undefined);
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', undefined);
  });

  it('defaults to a robot emoji prefix and no suffix', () => {
    expect(resolveMessageSignoffPrefix()).toBe(DEFAULT_MESSAGE_SIGNOFF_PREFIX);
    expect(resolveMessageSignoffSuffix()).toBeUndefined();
  });

  it('uses custom values from the env vars', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '[bot]');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '- sent by an assistant');
    expect(resolveMessageSignoffPrefix()).toBe('[bot]');
    expect(resolveMessageSignoffSuffix()).toBe('- sent by an assistant');
  });

  it('is disabled by an empty or whitespace-only value', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    expect(resolveMessageSignoffPrefix()).toBeUndefined();
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '  ');
    expect(resolveMessageSignoffPrefix()).toBeUndefined();
  });
});

describe('applyMessageSignoff', () => {
  beforeEach(() => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', undefined);
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', undefined);
  });

  it('prepends the default prefix for every Teams send/reply tool', () => {
    for (const alias of [
      'send-chat-message',
      'reply-to-chat-message',
      'send-channel-message',
      'reply-to-channel-message',
    ]) {
      const result = applyMessageSignoff(alias, chatMessage('Hi')) as {
        body: { content: string };
      };
      expect(result.body.content).toBe(`${DEFAULT_MESSAGE_SIGNOFF_PREFIX} Hi`);
    }
  });

  it('does not touch other tools', () => {
    const body = chatMessage('Hello');
    expect(applyMessageSignoff('send-mail', body)).toBe(body);
    expect(applyMessageSignoff('update-chat-message', body)).toBe(body);
  });

  it('does not mutate the input body', () => {
    const body = chatMessage('Hello');
    applyMessageSignoff('send-chat-message', body);
    expect(body.body.content).toBe('Hello');
  });

  it('applies prefix and suffix together', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '- sent by an assistant');
    const result = applyMessageSignoff('send-chat-message', chatMessage('Hello')) as {
      body: { content: string };
    };
    expect(result.body.content).toBe(
      `${DEFAULT_MESSAGE_SIGNOFF_PREFIX} Hello - sent by an assistant`
    );
  });

  it('applies a suffix alone when the prefix is disabled', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const result = applyMessageSignoff('send-chat-message', chatMessage('Hello')) as {
      body: { content: string };
    };
    expect(result.body.content).toBe('Hello 🤖');
  });

  it('applies even when the content already contains the signoff', () => {
    const result = applyMessageSignoff(
      'send-chat-message',
      chatMessage(`${DEFAULT_MESSAGE_SIGNOFF_PREFIX} already signed`)
    ) as { body: { content: string } };
    expect(result.body.content).toBe(
      `${DEFAULT_MESSAGE_SIGNOFF_PREFIX} ${DEFAULT_MESSAGE_SIGNOFF_PREFIX} already signed`
    );
  });

  it('prepends before html markup', () => {
    const result = applyMessageSignoff('send-chat-message', chatMessage('<p>Hi</p>')) as {
      body: { content: string };
    };
    expect(result.body.content).toBe(`${DEFAULT_MESSAGE_SIGNOFF_PREFIX} <p>Hi</p>`);
  });

  it('does nothing when both signoffs are disabled', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    const body = chatMessage('Hello');
    expect(applyMessageSignoff('send-chat-message', body)).toBe(body);
  });

  it('normalizes unterminated html constructs so a suffix cannot be swallowed', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const comment = applyMessageSignoff('send-chat-message', chatMessage('hello<!--')) as {
      body: { content: string };
    };
    expect(comment.body.content).toBe('hello<!----> 🤖');
    const tag = applyMessageSignoff('send-chat-message', chatMessage('hello <span')) as {
      body: { content: string };
    };
    expect(tag.body.content).toBe('hello  🤖');
  });

  it('does not normalize text content or prefix-only messages', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const textMessage = applyMessageSignoff('send-chat-message', {
      body: { contentType: 'text', content: 'plain<!--' },
    }) as { body: { content: string } };
    expect(textMessage.body.content).toBe('plain<!-- 🤖');

    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '🤖');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '');
    const prefixed = applyMessageSignoff('send-chat-message', chatMessage('hello<!--')) as {
      body: { content: string };
    };
    expect(prefixed.body.content).toBe('🤖 hello<!--');
  });

  it('parses a pre-serialized JSON string body so it cannot sidestep the signoff', () => {
    const result = applyMessageSignoff(
      'send-chat-message',
      JSON.stringify(chatMessage('Hello'))
    ) as { body: { content: string } };
    expect(result.body.content).toBe(`${DEFAULT_MESSAGE_SIGNOFF_PREFIX} Hello`);
  });

  it('fails closed on bodies without a signable content string', () => {
    for (const body of [
      null,
      'raw',
      ['x'],
      { body: { contentType: 'text' } },
      { subject: 'x' },
      { body: 'not-an-object' },
    ]) {
      expect(() => applyMessageSignoff('send-chat-message', body)).toThrow(MessageSignoffError);
    }
  });

  it('passes unsignable bodies through when the signoff is disabled', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    expect(applyMessageSignoff('send-chat-message', null)).toBeNull();
    const noBody = { subject: 'x' };
    expect(applyMessageSignoff('send-chat-message', noBody)).toBe(noBody);
  });
});

// Same real-schema harness as misplaced-body-wrap.test.ts: prove the signoff is
// applied on the body that actually reaches graphRequest.
describe('message signoff through the tool executor', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', undefined);
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', undefined);
    mockServer = { tool: vi.fn(), registerTool: vi.fn() };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{}' }] }),
    } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    registerGraphTools(mockServer, mockGraphClient, false, undefined, true);
    const call = mockServer.registerTool.mock.calls.find((c: unknown[]) => c[0] === toolName);
    expect(call).toBeDefined();
    return call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>;
  }

  function sentBody(): Record<string, unknown> {
    const options = (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      body: string;
    };
    return JSON.parse(options.body);
  }

  it('prepends the default prefix to a sent chat message', async () => {
    const handler = getToolHandler('send-chat-message');

    await handler({
      chatId: '19:abc@unq.gbl.spaces',
      body: { body: { contentType: 'html', content: '<p>hello</p>' } },
    });

    expect(sentBody()).toEqual({
      body: { contentType: 'html', content: `${DEFAULT_MESSAGE_SIGNOFF_PREFIX} <p>hello</p>` },
    });
  });

  it('sends the body untouched when the signoff is disabled', async () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    const handler = getToolHandler('send-chat-message');

    await handler({
      chatId: '19:abc@unq.gbl.spaces',
      body: { body: { contentType: 'html', content: '<p>hello</p>' } },
    });

    expect(sentBody()).toEqual({ body: { contentType: 'html', content: '<p>hello</p>' } });
  });

  it('refuses the send when the body has no signable content', async () => {
    const handler = getToolHandler('send-chat-message');

    const result = (await handler({
      chatId: '19:abc@unq.gbl.spaces',
      body: { subject: 'no content here' },
    })) as { isError?: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe('message_signoff_failed');
    expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('applies a configured suffix on the wire', async () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const handler = getToolHandler('send-chat-message');

    await handler({
      chatId: '19:abc@unq.gbl.spaces',
      body: { body: { contentType: 'html', content: 'hello' } },
    });

    expect(sentBody()).toEqual({ body: { contentType: 'html', content: 'hello 🤖' } });
  });
});

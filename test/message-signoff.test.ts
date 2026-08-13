import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import type AuthManager from '../src/auth.js';
import type { AppSecrets } from '../src/secrets.js';
import {
  applyMessageSignoffToRequest,
  assertSignoffMarkersVisible,
  MessageSignoffError,
  resolveMessageSignoffPrefix,
  resolveMessageSignoffSuffix,
} from '../src/lib/message-signoff.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const PREFIX = '🤖';

const chatMessage = (content: string, contentType = 'html') => ({
  body: { contentType, content },
});

/** Run a JSON payload through the gate and parse what would go on the wire. */
function signed(method: string, path: string, payload: unknown): unknown {
  const result = applyMessageSignoffToRequest(method, path, JSON.stringify(payload));
  return typeof result === 'string' ? JSON.parse(result) : result;
}

// The signoff is opt-in; the suites below exercise it as an operator who
// configured a 🤖 prefix would see it.
beforeEach(() => {
  vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', PREFIX);
  vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', undefined);
});

describe('resolveMessageSignoffPrefix / resolveMessageSignoffSuffix', () => {
  it('defaults to no signoff at all', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', undefined);
    expect(resolveMessageSignoffPrefix()).toBeUndefined();
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

describe('assertSignoffMarkersVisible', () => {
  it('accepts plain text, emoji and markup with visible text', () => {
    expect(() => assertSignoffMarkersVisible()).not.toThrow();
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '[bot]');
    expect(() => assertSignoffMarkersVisible()).not.toThrow();
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '<span style="color:gray">🤖 AI</span>');
    expect(() => assertSignoffMarkersVisible()).not.toThrow();
  });

  it('rejects markers whose markup renders as empty text', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '<agent>');
    expect(() => assertSignoffMarkersVisible()).toThrow(/renders as empty text/);
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', undefined);
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '<span></span>');
    expect(() => assertSignoffMarkersVisible()).toThrow(/renders as empty text/);
  });
});

describe('applyMessageSignoffToRequest - Teams sends and replies', () => {
  const SEND_ROUTES: Array<[string, string]> = [
    ['POST', '/chats/19:abc@unq.gbl.spaces/messages'],
    ['POST', '/chats/19:abc@unq.gbl.spaces/messages/1749/replies'],
    ['POST', '/teams/team-id/channels/chan-id/messages'],
    ['POST', '/teams/team-id/channels/chan-id/messages/1749/replies'],
  ];

  it('prepends the default prefix on every send/reply route', () => {
    for (const [method, path] of SEND_ROUTES) {
      const result = signed(method, path, chatMessage('Hi')) as { body: { content: string } };
      expect(result.body.content).toBe(`${PREFIX} Hi`);
    }
  });

  it('ignores the query string when matching', () => {
    const result = signed('POST', '/chats/x/messages?$select=id', chatMessage('Hi')) as {
      body: { content: string };
    };
    expect(result.body.content).toBe(`${PREFIX} Hi`);
  });

  it('leaves non-message routes untouched', () => {
    const create = { chatType: 'oneOnOne' };
    expect(signed('POST', '/chats', create)).toEqual(create);
    const reaction = { reactionType: 'like' };
    expect(signed('POST', '/chats/x/messages/1/setReaction', reaction)).toEqual(reaction);
    const list = JSON.stringify({});
    expect(applyMessageSignoffToRequest('GET', '/chats/x/messages', list)).toBe(list);
  });

  it('applies prefix and suffix together', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '- sent by an assistant');
    const result = signed('POST', '/chats/x/messages', chatMessage('Hello')) as {
      body: { content: string };
    };
    expect(result.body.content).toBe(`${PREFIX} Hello - sent by an assistant`);
  });

  it('does not stack a marker that is already present', () => {
    const text = signed('POST', '/chats/x/messages', chatMessage(`${PREFIX} hi`, 'text')) as {
      body: { content: string };
    };
    expect(text.body.content).toBe(`${PREFIX} hi`);
    // Graph returns stored html content re-wrapped in markup; dedup compares rendered text
    const html = signed('POST', '/chats/x/messages', chatMessage(`<p>${PREFIX} hi</p>`)) as {
      body: { content: string };
    };
    expect(html.body.content).toBe(`<p>${PREFIX} hi</p>`);
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const suffixed = signed('POST', '/chats/x/messages', chatMessage('hi 🤖', 'text')) as {
      body: { content: string };
    };
    expect(suffixed.body.content).toBe('hi 🤖');
  });

  it('normalizes unterminated html constructs so a suffix cannot be swallowed', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const comment = signed('POST', '/chats/x/messages', chatMessage('hello<!--')) as {
      body: { content: string };
    };
    expect(comment.body.content).toBe('hello<!----> 🤖');
    const tag = signed('POST', '/chats/x/messages', chatMessage('hello <span')) as {
      body: { content: string };
    };
    expect(tag.body.content).toBe('hello  🤖');
  });

  it('does not normalize text content or prefix-only messages', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    const textMessage = signed('POST', '/chats/x/messages', chatMessage('plain<!--', 'text')) as {
      body: { content: string };
    };
    expect(textMessage.body.content).toBe('plain<!-- 🤖');

    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '🤖');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '');
    const prefixed = signed('POST', '/chats/x/messages', chatMessage('hello<!--')) as {
      body: { content: string };
    };
    expect(prefixed.body.content).toBe('🤖 hello<!--');
  });

  it('fails closed on sends without a signable content string', () => {
    for (const payload of [
      null,
      ['x'],
      { body: { contentType: 'text' } },
      { subject: 'x' },
      { body: 'not-an-object' },
    ]) {
      expect(() => signed('POST', '/chats/x/messages', payload)).toThrow(MessageSignoffError);
    }
    expect(() => applyMessageSignoffToRequest('POST', '/chats/x/messages', undefined)).toThrow(
      MessageSignoffError
    );
    expect(() => applyMessageSignoffToRequest('POST', '/chats/x/messages', 'not json')).toThrow(
      MessageSignoffError
    );
    expect(() =>
      applyMessageSignoffToRequest('POST', '/chats/x/messages', Buffer.from('binary'))
    ).toThrow(MessageSignoffError);
  });

  it('passes everything through when the signoff is disabled', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    const body = JSON.stringify({ subject: 'x' });
    expect(applyMessageSignoffToRequest('POST', '/chats/x/messages', body)).toBe(body);
    expect(applyMessageSignoffToRequest('POST', '/chats/x/messages', undefined)).toBeUndefined();
  });
});

describe('applyMessageSignoffToRequest - Teams edits (PATCH)', () => {
  const EDIT_ROUTES: Array<[string, string]> = [
    ['PATCH', '/chats/19:abc@unq.gbl.spaces/messages/1749'],
    ['PATCH', '/teams/team-id/channels/chan-id/messages/1749'],
    ['PATCH', '/teams/team-id/channels/chan-id/messages/1749/replies/1750'],
  ];

  it('re-signs a rewritten body on every edit route', () => {
    for (const [method, path] of EDIT_ROUTES) {
      const result = signed(method, path, chatMessage('rewritten')) as {
        body: { content: string };
      };
      expect(result.body.content).toBe(`${PREFIX} rewritten`);
    }
  });

  it('passes a PATCH that does not touch the body', () => {
    const payload = { attachments: [] };
    expect(signed('PATCH', '/chats/x/messages/1', payload)).toEqual(payload);
  });

  it('fails closed on a PATCH whose body is not signable', () => {
    expect(() => signed('PATCH', '/chats/x/messages/1', { body: { contentType: 'text' } })).toThrow(
      MessageSignoffError
    );
  });

  it('applies a suffix to an edit, normalizing unterminated html first', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '- AI');
    const result = signed('PATCH', '/chats/x/messages/1', chatMessage('edited<!--')) as {
      body: { content: string };
    };
    expect(result.body.content).toBe(`${PREFIX} edited<!----> - AI`);
  });
});

describe('applyMessageSignoffToRequest - mail drafts', () => {
  it('signs draft content at create and update time', () => {
    const draft = { subject: 'S', ...chatMessage('draft text', 'text') };
    for (const [method, path] of [
      ['POST', '/me/messages'],
      ['POST', '/me/mailFolders/drafts/messages'],
      ['PATCH', '/me/messages/AAMk1'],
      ['PATCH', '/users/someone@example.com/messages/AAMk1'],
    ] as Array<[string, string]>) {
      const result = signed(method, path, draft) as { body: { content: string } };
      expect(result.body.content).toBe(`${PREFIX} draft text`);
    }
  });

  it('passes drafts and updates that do not carry a body', () => {
    const subjectOnly = { subject: 'just a subject' };
    expect(signed('POST', '/me/messages', subjectOnly)).toEqual(subjectOnly);
    const isRead = { isRead: true };
    expect(signed('PATCH', '/me/messages/AAMk1', isRead)).toEqual(isRead);
  });

  it('signs the comment and inline message body of reply/forward drafts', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '- AI');
    for (const action of ['createReply', 'createReplyAll', 'createForward']) {
      const result = signed('POST', `/me/messages/AAMk1/${action}`, {
        comment: 'my reply',
      }) as { comment: string };
      expect(result.comment).toBe(`${PREFIX} my reply - AI`);
    }
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', undefined);
    const inline = signed('POST', '/me/messages/AAMk1/createReply', {
      message: chatMessage('inline reply', 'text'),
    }) as { message: { body: { content: string } } };
    expect(inline.message.body.content).toBe(`${PREFIX} inline reply`);
  });

  it('passes an empty reply-draft creation', () => {
    expect(
      applyMessageSignoffToRequest('POST', '/me/messages/AAMk1/createReply', undefined)
    ).toBeUndefined();
  });
});

describe('applyMessageSignoffToRequest - direct mail sends', () => {
  it('signs the message body of sendMail, shared mailboxes included', () => {
    for (const path of ['/me/sendMail', '/users/shared@example.com/sendMail']) {
      const result = signed('POST', path, {
        message: { subject: 's', ...chatMessage('report attached', 'text') },
        saveToSentItems: false,
      }) as { message: { body: { content: string } }; saveToSentItems: boolean };
      expect(result.message.body.content).toBe(`${PREFIX} report attached`);
      expect(result.saveToSentItems).toBe(false);
    }
  });

  it('fails closed on a sendMail without signable content', () => {
    for (const payload of [{}, { message: { subject: 'only a subject' } }]) {
      expect(() => signed('POST', '/me/sendMail', payload)).toThrow(MessageSignoffError);
    }
    expect(() => applyMessageSignoffToRequest('POST', '/me/sendMail', undefined)).toThrow(
      MessageSignoffError
    );
  });

  it('signs the comment of direct reply/replyAll/forward, shared mailboxes included', () => {
    for (const path of [
      '/me/messages/AAMk1/reply',
      '/me/messages/AAMk1/replyAll',
      '/me/messages/AAMk1/forward',
      '/users/shared@example.com/messages/AAMk1/reply',
    ]) {
      const result = signed('POST', path, { comment: 'looks good' }) as { comment: string };
      expect(result.comment).toBe(`${PREFIX} looks good`);
    }
  });

  it('passes a bare forward - the quoted original is not agent-authored', () => {
    const payload = { toRecipients: [{ emailAddress: { address: 'a@b.c' } }] };
    expect(signed('POST', '/me/messages/AAMk1/forward', payload)).toEqual(payload);
  });

  it('signs a group thread reply and fails closed without a post body', () => {
    const result = signed('POST', '/groups/g1/threads/t1/reply', {
      post: chatMessage('<p>update</p>'),
    }) as { post: { body: { content: string } } };
    expect(result.post.body.content).toBe(`${PREFIX} <p>update</p>`);
    expect(() => signed('POST', '/groups/g1/threads/t1/reply', {})).toThrow(MessageSignoffError);
    expect(() => signed('POST', '/groups/g1/threads/t1/reply', { post: {} })).toThrow(
      MessageSignoffError
    );
  });
});

describe('applyMessageSignoffToRequest - $batch', () => {
  it('signs matching sub-requests and leaves the rest untouched', () => {
    const result = signed('POST', '/$batch', {
      requests: [
        { id: '1', method: 'POST', url: '/chats/x/messages', body: chatMessage('hi') },
        { id: '2', method: 'GET', url: '/me/messages?$top=5' },
        { id: '3', method: 'PATCH', url: '/chats/x/messages/1', body: chatMessage('edit') },
        {
          id: '4',
          method: 'POST',
          url: '/me/sendMail',
          body: { message: { subject: 's', ...chatMessage('mail', 'text') } },
        },
        { id: '5', method: 'POST', url: '/chats', body: { chatType: 'oneOnOne' } },
      ],
    }) as {
      requests: Array<{
        id: string;
        body?: { body?: { content?: string }; message?: { body: { content: string } } };
      }>;
    };
    expect(result.requests[0].body!.body!.content).toBe(`${PREFIX} hi`);
    expect(result.requests[1]).toEqual({ id: '2', method: 'GET', url: '/me/messages?$top=5' });
    expect(result.requests[2].body!.body!.content).toBe(`${PREFIX} edit`);
    expect(result.requests[3].body!.message!.body.content).toBe(`${PREFIX} mail`);
    expect(result.requests[4]).toEqual({
      id: '5',
      method: 'POST',
      url: '/chats',
      body: { chatType: 'oneOnOne' },
    });
  });

  it('applies prefix and suffix to sub-requests', () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '- AI');
    const result = signed('POST', '/$batch', {
      requests: [{ id: '1', method: 'POST', url: '/chats/x/messages', body: chatMessage('hi') }],
    }) as { requests: Array<{ body: { body: { content: string } } }> };
    expect(result.requests[0].body.body.content).toBe(`${PREFIX} hi - AI`);
  });

  it('matches sub-request urls with a query string or version prefix', () => {
    const result = signed('POST', '/$batch', {
      requests: [
        {
          id: '1',
          method: 'post',
          url: '/v1.0/chats/x/messages?$select=id',
          body: chatMessage('hi'),
        },
      ],
    }) as { requests: Array<{ body: { body: { content: string } } }> };
    expect(result.requests[0].body.body.content).toBe(`${PREFIX} hi`);
  });

  it('fails closed on a matching sub-request without signable content', () => {
    expect(() =>
      signed('POST', '/$batch', {
        requests: [{ id: '1', method: 'POST', url: '/chats/x/messages', body: { subject: 'x' } }],
      })
    ).toThrow(MessageSignoffError);
    expect(() =>
      signed('POST', '/$batch', {
        requests: [{ id: '1', method: 'POST', url: '/chats/x/messages' }],
      })
    ).toThrow(MessageSignoffError);
  });
});

// End-to-end through a real GraphClient with fetch mocked: prove the gate sits
// on the wire path itself, not in any particular tool handler.
describe('message signoff at the Graph request layer', () => {
  let client: GraphClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const authManager = { getToken: vi.fn().mockResolvedValue('test-token') };
    const secrets = { clientId: 'id', tenantId: 'common', cloudType: 'global' };
    client = new GraphClient(
      authManager as unknown as AuthManager,
      secrets as unknown as AppSecrets
    );
    fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function wireBody(): Record<string, unknown> {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return JSON.parse(fetchMock.mock.calls[0][1].body as string);
  }

  it('prepends the prefix to a chat message send', async () => {
    await client.makeRequest('/chats/19:abc@unq.gbl.spaces/messages', {
      method: 'POST',
      body: JSON.stringify(chatMessage('<p>hello</p>')),
    });
    expect(wireBody()).toEqual({
      body: { contentType: 'html', content: `${PREFIX} <p>hello</p>` },
    });
  });

  it('applies a configured suffix on the wire', async () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_SUFFIX', '🤖');
    await client.makeRequest('/chats/19:abc@unq.gbl.spaces/messages', {
      method: 'POST',
      body: JSON.stringify(chatMessage('hello', 'text')),
    });
    expect(wireBody()).toEqual({ body: { contentType: 'text', content: 'hello 🤖' } });
  });

  it('signs $batch sub-requests on the wire', async () => {
    await client.makeRequest('/$batch', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          { id: '1', method: 'POST', url: '/chats/x/messages', body: chatMessage('hi', 'text') },
        ],
      }),
    });
    const sent = wireBody() as { requests: Array<{ body: { body: { content: string } } }> };
    expect(sent.requests[0].body.body.content).toBe(`${PREFIX} hi`);
  });

  it('refuses an unsignable send before anything reaches the network', async () => {
    const result = await client.graphRequest('/chats/x/messages', {
      method: 'POST',
      body: JSON.stringify({ subject: 'no content here' }),
    });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toMatch(
      /POST \/chats\/x\/messages: a message signoff is configured but could not be applied/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends untouched when the signoff is disabled', async () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '');
    await client.makeRequest('/chats/x/messages', {
      method: 'POST',
      body: JSON.stringify(chatMessage('<p>hello</p>')),
    });
    expect(wireBody()).toEqual({ body: { contentType: 'html', content: '<p>hello</p>' } });
  });
});

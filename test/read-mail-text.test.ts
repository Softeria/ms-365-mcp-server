import { describe, it, expect, vi, afterEach } from 'vitest';
import { UTILITY_TOOLS } from '../src/graph-tools.js';
import { cleanMailText } from '../src/lib/mail-text.js';

describe('cleanMailText', () => {
  it('removes quoted reply history (On ... wrote:)', () => {
    expect(
      cleanMailText(
        'Sounds good, Tuesday works.\n\nOn Tue, 7 Oct 2026 at 10:00, Paul <paul@example.com> wrote:\n> Can we meet?\n> Paul'
      )
    ).toBe('Sounds good, Tuesday works.');
  });

  it('removes a two-line On/wrote header', () => {
    expect(
      cleanMailText(
        'Yes.\n\nOn Tue, 7 Oct 2026 at 10:00, Paul Smith\n<paul@example.com> wrote:\nold'
      )
    ).toBe('Yes.');
  });

  it('removes Outlook From/Sent header blocks and Original Message separators', () => {
    expect(
      cleanMailText(
        'Attached is the quote.\n\n________________________________\nFrom: Paul\nSent: Tuesday\nTo: J\nSubject: quote\n\nold'
      )
    ).toBe('Attached is the quote.');
    expect(
      cleanMailText(
        'New text\r\n\r\nFrom: Paul <p@example.com>\r\nSent: Tuesday\r\nTo: J\r\nSubject: Re: x\r\n\r\nolder'
      )
    ).toBe('New text');
    expect(cleanMailText('Fine.\n-----Original Message-----\nFrom: a\nold')).toBe('Fine.');
  });

  it('keeps the history when nothing precedes it', () => {
    expect(cleanMailText('From: Paul\nSent: Tuesday\nTo: J\nSubject: x\n\nThe content')).toContain(
      'The content'
    );
  });

  it('removes the signature delimiter block and mobile sign-offs', () => {
    expect(cleanMailText('Thanks,\nJ\n-- \nJ Smith | CEO\n+1 555')).toBe('Thanks,\nJ');
    expect(cleanMailText('On my way.\n\nSent from my iPhone')).toBe('On my way.');
  });

  it('removes a trailing footer but keeps an early mention', () => {
    const body =
      'Your order has shipped and will arrive Friday. Track it from your account page any time you like.\n\n' +
      'Questions? Reply to this email.\n\nYou are receiving this because you bought something. Unsubscribe here.\n\n' +
      '© 2026 Shop Inc. All rights reserved.';
    expect(cleanMailText(body)).toBe(
      'Your order has shipped and will arrive Friday. Track it from your account page any time you like.\n\nQuestions? Reply to this email.'
    );
    const early =
      'Please read our privacy policy update before Friday.\n\n' +
      'It changes how we store data. '.repeat(10);
    expect(cleanMailText(early)).toContain('privacy policy update');
  });

  it('removes a footer block that starts just above the midpoint', () => {
    const body =
      'Short note from Graziela.\nView message<https://x.example/m>\nThis email was intended for J\n' +
      'Learn why<https://x.example/w>\nYou are receiving Messages digest emails.\n' +
      'Unsubscribe<https://x.example/u> · Help<https://x.example/h>\n' +
      '© 2026 Example Corporation, 1 Example Way, Sunnyvale, CA 94085. Example is a registered trademark.';
    expect(cleanMailText(body)).toBe('Short note from Graziela.\nView message [link: x.example]');
  });

  it('shortens links to their domain, unwrapping Safe Links', () => {
    const safe =
      'https://na01.safelinks.protection.outlook.com/?url=' +
      encodeURIComponent('https://www.fedex.com/track?id=1') +
      '&data=abc';
    expect(
      cleanMailText(
        `See the report<https://www.example.com/r?utm=1> and https://docs.example.org/a/b.\nTrack it<${safe}>\nCall (413) 555 0100<tel:4135550100>`
      )
    ).toBe(
      'See the report [link: example.com] and [link: docs.example.org].\nTrack it [link: fedex.com]\nCall (413) 555 0100'
    );
  });

  it('drops image placeholders and link-only lines, keeps linked-image labels', () => {
    expect(
      cleanMailText(
        '[Logo] [Messaging icon]\n[https://img.example.com/logo.png]\n<https://t.example/x> | <https://x.example/y>\n[View role]<https://jobs.example/1>\nDone.'
      )
    ).toBe('View role [link: jobs.example]\nDone.');
  });

  it('collapses whitespace and invisible preheader padding', () => {
    expect(cleanMailText('a\u200b\u034f  \t b\n\n\n\n\nc\u00a0d   ')).toBe('a b\n\nc d');
  });
});

describe('read-mail-text tool', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'read-mail-text')!;

  function msg(id: string, subject: string, content: string) {
    return {
      id,
      subject,
      body: { contentType: 'text', content },
      from: { emailAddress: { name: 'Paul', address: 'p@example.com' } },
      toRecipients: [{ emailAddress: { name: 'J', address: 'j@example.com' } }],
      ccRecipients: [],
      receivedDateTime: '2026-10-07T10:00:00Z',
      hasAttachments: false,
    };
  }

  function ctx(respond: (endpoint: string, options: Record<string, unknown>) => unknown) {
    const graphRequest = vi.fn(async (endpoint: string, options: Record<string, unknown>) => {
      const r = respond(endpoint, options);
      return r && typeof r === 'object' && 'isError' in r
        ? r
        : { content: [{ type: 'text', text: JSON.stringify(r) }] };
    });
    return {
      graphRequest,
      ctx: {
        graphClient: { graphRequest } as never,
        authManager: undefined,
        multiAccount: false,
        accountNames: [],
      },
    };
  }

  const parse = (r: { content: Array<{ type: string; text?: string }> }) =>
    JSON.parse(r.content[0].text as string);

  afterEach(() => {
    delete process.env.MS365_MCP_READ_MAIL_TEXT_MAX_CHARS;
  });

  it('is registered as a read-only utility', () => {
    expect(tool).toBeDefined();
    expect(tool.readOnlyHint).toBe(true);
  });

  it('messageIds: one $batch asking for text bodies; unknown ids reported per message', async () => {
    const { graphRequest, ctx: c } = ctx(() => ({
      responses: [
        { id: '1', status: 404, body: { error: { code: 'ErrorItemNotFound', message: 'x' } } },
        { id: '0', status: 200, body: msg('A', 'Hello', 'Hi J\n\nOn Mon, Paul wrote:\n> old') },
      ],
    }));
    const r = await tool.execute({ messageIds: ['A', 'B/='] }, c);
    expect(r.isError).toBeFalsy();
    expect(graphRequest).toHaveBeenCalledTimes(1);
    const [endpoint, options] = graphRequest.mock.calls[0];
    expect(endpoint).toBe('/$batch');
    expect(options.method).toBe('POST');
    expect(options.forceJsonOutput).toBe(true);
    const batch = JSON.parse(options.body as string);
    expect(batch.requests[1].url.startsWith('/me/messages/B%2F%3D?$select=')).toBe(true);
    expect(batch.requests[0].headers.Prefer).toBe('outlook.body-content-type="text"');
    expect(parse(r as never)).toEqual([
      {
        id: 'A',
        from: 'Paul <p@example.com>',
        to: ['J <j@example.com>'],
        cc: [],
        subject: 'Hello',
        received: '2026-10-07T10:00:00Z',
        hasAttachments: false,
        text: 'Hi J',
        chars: 4,
        truncated: false,
      },
      { id: 'B/=', error: 'not found' },
    ]);
  });

  it('folderId: one list request with top, filter and the text-body Prefer header', async () => {
    const { graphRequest, ctx: c } = ctx(() => ({ value: [msg('A', 'x', 'body')] }));
    await tool.execute(
      { folderId: 'inbox', top: 5, filter: 'receivedDateTime ge 2026-10-01T00:00:00Z' },
      c
    );
    const [endpoint, options] = graphRequest.mock.calls[0];
    expect(endpoint).toMatch(/^\/me\/mailFolders\/inbox\/messages\?/);
    const q = new URLSearchParams(endpoint.split('?')[1]);
    expect(q.get('$top')).toBe('5');
    expect(q.get('$filter')).toBe('receivedDateTime ge 2026-10-01T00:00:00Z');
    expect((options.headers as Record<string, string>).Prefer).toBe(
      'outlook.body-content-type="text"'
    );
  });

  it('keeps the quoted content of forwards', async () => {
    const { ctx: c } = ctx(() => ({
      value: [
        msg(
          'A',
          'FW: contract',
          'FYI\n\nFrom: Paul\nSent: Mon\nTo: J\nSubject: contract\n\nThe terms are attached.'
        ),
      ],
    }));
    const [m] = parse((await tool.execute({ folderId: 'inbox' }, c)) as never);
    expect(m.text).toContain('The terms are attached.');
  });

  it('returns full text unless maxChars is set', async () => {
    const long = 'word '.repeat(5000).trim();
    const { ctx: c } = ctx(() => ({ value: [msg('A', 'long', long)] }));
    const [full] = parse((await tool.execute({ folderId: 'inbox' }, c)) as never);
    expect(full.text.length).toBe(long.length);
    expect(full.truncated).toBe(false);
    const [cut] = parse((await tool.execute({ folderId: 'inbox', maxChars: 100 }, c)) as never);
    expect(cut.text.length).toBe(100);
    expect(cut.chars).toBe(long.length);
    expect(cut.truncated).toBe(true);
  });

  it('refuses an oversize result whole, naming the largest messages', async () => {
    const { ctx: c } = ctx(() => ({
      value: [
        msg('A', 'Weekly digest', 'x'.repeat(60000)),
        msg('B', 'Re: contract', 'y'.repeat(30000)),
        msg('C', 'short', 'z'),
      ],
    }));
    const r = await tool.execute({ folderId: 'inbox' }, c);
    expect(r.isError).toBe(true);
    const { error } = parse(r as never);
    expect(error).toMatch(
      /^Response would be [\d,]+ characters \(limit 80,000\)\. Largest: "Weekly digest" 60,000, "Re: contract" 30,000/
    );
    expect(error).toContain('maxChars');
    expect(
      parse((await tool.execute({ folderId: 'inbox', maxChars: 1000 }, c)) as never)
    ).toHaveLength(3);
    process.env.MS365_MCP_READ_MAIL_TEXT_MAX_CHARS = '200000';
    expect((await tool.execute({ folderId: 'inbox' }, c)).isError).toBeFalsy();
  });

  it('validates arguments before calling Graph', async () => {
    const { graphRequest, ctx: c } = ctx(() => ({}));
    for (const bad of [
      {},
      { messageIds: ['a'], folderId: 'inbox' },
      { messageIds: [] },
      { messageIds: Array(21).fill('a') },
      { messageIds: ['a'], top: 3 },
      { folderId: 'inbox', filter: 'x', search: 'y' },
    ]) {
      expect((await tool.execute(bad, c)).isError).toBe(true);
    }
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('passes Graph errors through', async () => {
    const graphError = {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid filter clause' }) }],
      isError: true,
    };
    const { ctx: c } = ctx(() => graphError);
    expect(await tool.execute({ folderId: 'inbox', filter: 'bad' }, c)).toEqual(graphError);
  });
});

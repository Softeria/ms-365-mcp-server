import { describe, it, expect, vi, afterEach } from 'vitest';
import { UTILITY_TOOLS } from '../src/graph-tools.js';
import { cleanMailText, MAIL_TEXT_MAX_INPUT_CHARS } from '../src/lib/mail-text.js';

const L = (d: string) => `⟦link: ${d}⟧`;

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
    expect(cleanMailText('Fine.\n-----Original Message-----\nFrom: a\nold')).toBe('Fine.');
  });

  it('keeps a separator line that is not above a quoted header block', () => {
    // A ticket system's history and a receipt use the Outlook separator inside the message.
    const ticket =
      'Latest update.\n________________________________\nMon 10/12 Paul Martin-\nEarlier update.\n________________________________\nFri 10/2 J-\nFirst message.';
    expect(cleanMailText(ticket)).toBe(ticket);
    const receipt = 'Thanks for your order.\n____________________\nSubtotal: $799.99\nTax: $0.00';
    expect(cleanMailText(receipt)).toBe(receipt);
    expect(
      cleanMailText('Reply.\n________________________________\n\nFrom: P\nSent: Tue\nTo: J\nold')
    ).toBe('Reply.');
  });

  it('keeps text that only looks like quoting: ">" lines and undated "On ... wrote:"', () => {
    const note = 'Build note:\n> Deploy only after the change window.\nPlease acknowledge.';
    expect(cleanMailText(note)).toBe(note);
    const doc =
      'The parser looks for this literal:\nOn {person} wrote:\nthen the example, which must remain.';
    expect(cleanMailText(doc)).toBe(doc);
    // Apple Mail quotes the whole history with ">", its header included.
    expect(
      cleanMailText('Top reply\n\n> On Sep 21, 2026, at 12:10 AM, J <j@x.example> wrote:\n>\n> old')
    ).toBe('Top reply');
  });

  it('keeps the history when nothing precedes it', () => {
    expect(cleanMailText('From: Paul\nSent: Tuesday\nTo: J\nSubject: x\n\nThe content')).toContain(
      'The content'
    );
  });

  it('never cuts the message: signatures, a bare "--" separator and footer lines are kept', () => {
    expect(cleanMailText('Thanks,\nJ\n-- \nJ Smith | CEO\n+1 555')).toBe(
      'Thanks,\nJ\n--\nJ Smith | CEO\n+1 555'
    );
    expect(cleanMailText('On my way.\n\nSent from my iPhone')).toBe(
      'On my way.\n\nSent from my iPhone'
    );
    // A ticketing system's layout: a header, a bare "--", then the actual content.
    const ticket =
      '520631 - Project\nPaul Martin\nExample Inc.\n.\n--\nTue 10/13 Paul Martin-\nStatus and next steps\n1. Confirm the scopes.';
    expect(cleanMailText(ticket)).toBe(ticket);
    const footerish =
      'Your order shipped. Track it from your account page any time you like.\n\nQuestions? Reply.\n\n' +
      'You are receiving this because you bought something. Unsubscribe here.\n\n© 2026 Shop Inc. All rights reserved.';
    expect(cleanMailText(footerish)).toBe(footerish);
    expect(
      cleanMailText(
        'Short note.\nPlease read our privacy policy\nThe important part comes after it.'
      )
    ).toContain('The important part comes after it.');
  });

  it('keeps links: Safe Links unwrapped, short addresses in full, long tracking addresses shortened to the real domain', () => {
    const safe =
      'https://na01.safelinks.protection.outlook.com/?url=' +
      encodeURIComponent('https://www.fedex.com/track?id=1') +
      '&data=abc';
    expect(
      cleanMailText(
        `See the report<https://www.example.com/r?x=2> and https://docs.example.org/a/b.\nTrack it<${safe}>`
      )
    ).toBe(
      'See the report <https://www.example.com/r?x=2> and https://docs.example.org/a/b.\nTrack it <https://www.fedex.com/track?id=1>'
    );
    const long = 'https://click.mailer.example.com/ls/click?upn=' + 'A'.repeat(350);
    expect(cleanMailText(`Read more<${long}>`)).toBe(`Read more ${L('click.mailer.example.com')}`);
    expect(cleanMailText('See (https://en.wikipedia.org/wiki/Foo_(bar)).')).toBe(
      'See (https://en.wikipedia.org/wiki/Foo_(bar)).'
    );
    expect(cleanMailText('(413) 555 0100<tel:4135550100> a@b.example<mailto:a@b.example>')).toBe(
      '(413) 555 0100<tel:4135550100> a@b.example<mailto:a@b.example>'
    );
  });

  it('unwraps Proofpoint and Google redirects, also inside Safe Links', () => {
    // URL Defense v3: "*" and "**<c>" stand for characters listed (base64) after ";".
    const enc = Buffer.from('+++%').toString('base64url');
    expect(
      cleanMailText(
        `Map<https://urldefense.com/v3/__https:/maps.example.com/q/1*Main*St**A0D__;${enc}!!x!y$>`
      )
    ).toBe('Map <https://maps.example.com/q/1+Main+St+%0D>');
    expect(
      cleanMailText(
        'Site https://urldefense.proofpoint.com/v2/url?u=https-3A__www.example.com_a_b&d=x&e= now'
      )
    ).toBe('Site https://www.example.com/a/b now');
    const google =
      'https://www.google.com/url?q=' +
      encodeURIComponent('https://us02web.zoom.us/j/123?pwd=abc') +
      '&sa=D&ust=1&usg=AOvVaw';
    const safe =
      'https://nam12.safelinks.protection.outlook.com/?url=' +
      encodeURIComponent(google) +
      '&data=' +
      'd'.repeat(200);
    expect(cleanMailText(`Join<${safe}>`)).toBe('Join <https://us02web.zoom.us/j/123?pwd=abc>');
  });

  it('drops tracking parameters and keeps the others', () => {
    expect(
      cleanMailText(
        'Job<https://www.linkedin.com/comm/jobs/view/42/?trackingId=abc&refId=x&lipi=y&eid=e1>'
      )
    ).toBe('Job <https://www.linkedin.com/comm/jobs/view/42/?eid=e1>');
    // A parameter that may make the link work (a one-time token) is not tracking.
    expect(
      cleanMailText('Complete it: https://service.example/approve?otpToken=one-time&case=42')
    ).toBe('Complete it: https://service.example/approve?otpToken=one-time&case=42');
    expect(cleanMailText('https://shop.example/p?id=7&utm_source=mail&utm_campaign=fall')).toBe(
      'https://shop.example/p?id=7'
    );
    const invite =
      'https://calendar.example.com/event?action=RESPOND&eid=' + 'e'.repeat(150) + '&rst=1';
    expect(cleanMailText(`Yes<${invite}>`)).toBe(`Yes <${invite}>`);
  });

  it('names the host a shortened link really goes to', () => {
    const tail = '/pay?x=' + 'y'.repeat(320);
    expect(cleanMailText('https://trusted.example(foo)@evil.example' + tail)).toBe(
      L('evil.example')
    );
  });

  it('cannot be made to produce a marker from body text', () => {
    const long = 'https://evil.example/x?' + 'z'.repeat(320);
    const t = cleanMailText(
      `Pay at [link: login.microsoftonline.com] or ⟦link: login.microsoftonline.com⟧\n${long}`
    );
    expect(t).toBe(
      `Pay at [link: login.microsoftonline.com] or [link: login.microsoftonline.com]\n${L('evil.example')}`
    );
    expect(t.match(/⟦/g)).toHaveLength(1);
  });

  it('never removes square-bracket text; only placeholders whose address is an image file', () => {
    expect(cleanMailText('Runbook: [https://portal.example.test/runbook] before deploying.')).toBe(
      'Runbook: [https://portal.example.test/runbook] before deploying.'
    );
    expect(cleanMailText('Pixel [https://img.example.com/a/logo.PNG?w=2] here')).toBe('Pixel here');
    expect(cleanMailText('see [JIRA-123] and arr[i] [1] [Logo]')).toBe(
      'see [JIRA-123] and arr[i] [1] [Logo]'
    );
    expect(cleanMailText('Logo [https://img.example.com/logo.png] here')).toBe('Logo here');
  });

  it('keeps link-only lines, collapsed to one line of their distinct links', () => {
    expect(
      cleanMailText(
        'Hello\n<https://t.example/x> | <https://x.example/y>\n<https://x.example/y>\nBye'
      )
    ).toBe('Hello\n<https://t.example/x> <https://x.example/y>\nBye');
  });

  it('keeps a single invisible character that is part of the text', () => {
    expect(cleanMailText('co\u00adoperate and a\u200bb')).toBe('co\u00adoperate and a\u200bb');
  });

  it('collapses whitespace and invisible preheader padding', () => {
    expect(cleanMailText('a\u200b\u034f\u200c\u034f  \t b\n\n\n\n\nc\u00a0d   ')).toBe('a b\n\nc d');
  });

  it('cleans hostile bodies in linear time', () => {
    const cases: Record<string, string> = {
      'url + 80k dots': 'https://a.com/' + '.'.repeat(80_000),
      'unterminated <http:a': '<http:a'.repeat(40_000),
      'repeated [[link: ': '[[link: '.repeat(20_000),
      'open brackets': '['.repeat(300_000),
      'long url': 'https://a.com/' + 'a'.repeat(299_000),
      parentheses: 'https://a.com/' + '('.repeat(100_000) + ')'.repeat(100_000),
      'On On On': 'On '.repeat(100_000),
      'From lines': 'From: x\n'.repeat(30_000),
      'image placeholders': '[https://a.b/c.png]'.repeat(15_000),
      'url defense stars':
        'https://urldefense.com/v3/__https:/a.b/' +
        '*'.repeat(4000) +
        '__;' +
        'A'.repeat(4000) +
        '!',
      'url defense runs': ('https://urldefense.com/v3/__' + '**A'.repeat(1300) + '__;!! ').repeat(
        50
      ),
      separators: '______________________________\n\n\n'.repeat(30_000),
      'distinct link-only lines': Array.from({ length: 14_000 }, (_, i) => `https://a.example/${i}`)
        .join('\n')
        .slice(0, MAIL_TEXT_MAX_INPUT_CHARS),
      'quoted header lines': '> On 1 x wrote: y\n'.repeat(15_000),
      'padding runs': '\u034f \u200c'.repeat(100_000),
      mixed: ('<https://a.b/' + 'x'.repeat(50) + ' [').repeat(5_000),
    };
    for (const [name, body] of Object.entries(cases)) {
      const t0 = Date.now();
      cleanMailText(body);
      expect(Date.now() - t0, name).toBeLessThan(500);
    }
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
        {
          id: '0',
          status: 200,
          body: msg('A', 'Hello', 'Hi J\n\nOn Mon, 6 Oct 2026, Paul wrote:\n> old'),
        },
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

  it('validates raw arguments in execute (discovery mode skips zod) before calling Graph', async () => {
    const { graphRequest, ctx: c } = ctx(() => ({}));
    for (const bad of [
      {},
      { messageIds: ['a'], folderId: 'inbox' },
      { messageIds: [] },
      { messageIds: Array(21).fill('a') },
      { messageIds: [' '] },
      { messageIds: ['a'], top: 3 },
      { folderId: 'inbox', top: 1000 },
      { folderId: 'inbox', top: 0 },
      { folderId: 'inbox', top: 2.5 },
      { folderId: 'inbox', maxChars: -1 },
      { folderId: 'inbox', maxChars: 0 },
      { folderId: 'inbox', filter: '' },
      { folderId: 'inbox', search: '  ' },
      { folderId: 'inbox', filter: 'x', search: 'y' },
      { folderId: '' },
    ]) {
      expect(
        (await tool.execute(bad as Record<string, unknown>, c)).isError,
        JSON.stringify(bad)
      ).toBe(true);
    }
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('normalises search quoting the same way list-mail-messages does', async () => {
    const { graphRequest, ctx: c } = ctx(() => ({ value: [] }));
    await tool.execute({ folderId: 'inbox', search: 'subject:"quarterly report"' }, c);
    await tool.execute({ folderId: 'inbox', search: '"quarterly report" from:paul' }, c);
    await tool.execute({ folderId: 'inbox', search: 'from:paul' }, c);
    const sent = graphRequest.mock.calls.map(([endpoint]) =>
      new URLSearchParams((endpoint as string).split('?')[1]).get('$search')
    );
    expect(sent).toEqual([
      '"subject:\\"quarterly report\\""',
      '"\\"quarterly report\\" from:paul"',
      '"from:paul"',
    ]);
    const quotesOnly = await tool.execute({ folderId: 'inbox', search: '""' }, c);
    expect(quotesOnly.isError).toBe(true);
    expect(graphRequest).toHaveBeenCalledTimes(3);
  });

  it('marks an enormous body truncated after cleaning at most the input cap', async () => {
    const { ctx: c } = ctx(() => ({
      value: [msg('A', 'huge', 'z '.repeat(MAIL_TEXT_MAX_INPUT_CHARS))],
    }));
    const [m] = parse((await tool.execute({ folderId: 'inbox', maxChars: 50 }, c)) as never);
    expect(m.truncated).toBe(true);
    expect(m.chars).toBeLessThanOrEqual(MAIL_TEXT_MAX_INPUT_CHARS);
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

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GraphClient } from '../src/graph-client.js';
import { registerGraphTools, type GraphToolRegistrationOptions } from '../src/graph-tools.js';
import { mcpAppPath, mcpAppUri } from '../src/mcp-apps.js';
import { runPage, type ViewHost } from './mcp-app-host.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  vi.useRealTimers();
});

/** The page exactly as the server serves it to a host */
async function servedPage(
  view: string,
  toolName: string,
  enabledTools: string,
  options: GraphToolRegistrationOptions = {}
) {
  const server = new McpServer({ name: 'views-test', version: '1' });
  registerGraphTools(server, { graphRequest: vi.fn() } as unknown as GraphClient, {
    mcpApps: true,
    enabledTools,
    ...options,
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: 'views-client', version: '1' });
  await client.connect(b);
  const { contents } = await client.readResource({ uri: mcpAppUri(view, toolName) });
  await client.close();
  return (contents[0] as { text: string }).text;
}

const text = (value: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
function el(host: ViewHost, id: string) {
  const element = host.document.getElementById(id);
  if (!element) throw new Error(`the page has no #${id}`);
  return element;
}

describe('MCP Apps bridge', () => {
  const bridgePage = `<script type="application/json" id="mcp-app-config">{}</script>
<script>${readFileSync(mcpAppPath('bridge.js'), 'utf8')}</script>
<script>
  window.calls = [];
  window.bridge = createMcpAppBridge({
    name: 'test-app',
    onToolInput: (args) => calls.push(['input', args]),
    onToolResult: (result) => calls.push(['result', result]),
    onToolCancelled: (params) => calls.push(['cancelled', params]),
    onReady: (capabilities) => calls.push(['ready', capabilities]),
    onInitError: (error) => calls.push(['initError', error.message]),
  });
</script>`;
  const calls = (host: ViewHost) => JSON.parse(JSON.stringify(host.global.calls));

  it('opens with ui/initialize and says initialized once the host answers', async () => {
    const host = runPage(bridgePage);
    expect(host.sent).toEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'ui/initialize',
        params: {
          appInfo: { name: 'test-app', version: '1.0.0' },
          appCapabilities: {},
          protocolVersion: '2026-01-26',
        },
      },
    ]);
    host.initialize({ serverTools: {} });
    await host.flush();
    expect(host.sent.map((m) => m.method)).toContain('ui/notifications/initialized');
    expect(calls(host)).toEqual([['ready', { serverTools: {} }]]);
  });

  it('applies the host theme, its CSS variables and its locale', async () => {
    const host = runPage(bridgePage);
    host.initialize(
      {},
      { theme: 'dark', locale: 'nb-NO', styles: { variables: { '--color-a': '#fff', b: 'x' } } }
    );
    await host.flush();
    const root = host.document.documentElement;
    expect(root.dataset.theme).toBe('dark');
    expect([...root.style.props]).toEqual([['--color-a', '#fff']]);
    expect(host.global.bridge.locale).toBe('nb-NO');
  });

  it('answers ping and teardown, and refuses other host requests', () => {
    const host = runPage(bridgePage);
    host.post({ jsonrpc: '2.0', id: 'p', method: 'ping' });
    host.post({ jsonrpc: '2.0', id: 't', method: 'ui/resource-teardown', params: {} });
    host.post({ jsonrpc: '2.0', id: 'x', method: 'ui/unknown' });
    expect(host.sent.slice(1)).toEqual([
      { jsonrpc: '2.0', id: 'p', result: {} },
      { jsonrpc: '2.0', id: 't', result: {} },
      { jsonrpc: '2.0', id: 'x', error: { code: -32601, message: 'Method not found' } },
    ]);
  });

  it('ignores other windows and anything that is not JSON-RPC', () => {
    const host = runPage(bridgePage);
    host.postFromElsewhere({ jsonrpc: '2.0', id: 'p', method: 'ping' });
    host.post({ id: 'p', method: 'ping' });
    host.post({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: text({}) });
    expect(host.sent).toHaveLength(1);
    expect(calls(host)).toEqual([['result', text({})]]);
  });

  it('applies only the first tool-input and tool-result, as hosts may echo the view’s calls', () => {
    const host = runPage(bridgePage);
    host.notify('ui/notifications/tool-input', { arguments: { a: 1 } });
    host.notify('ui/notifications/tool-input', { arguments: { a: 2 } });
    host.notify('ui/notifications/tool-result', text({ first: true }));
    host.notify('ui/notifications/tool-result', text({ first: false }));
    expect(calls(host)).toEqual([
      ['input', { a: 1 }],
      ['result', text({ first: true })],
    ]);
  });

  it('times a tool call out after 60s, unless progress keeps it alive', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const host = runPage(bridgePage);
    const outcome = vi.fn();
    host.global.bridge
      .callTool('some-tool', {})
      .then(outcome, (error: Error) => outcome(error.message));
    const call = host.request('tools/call')!;
    expect(call.params._meta).toEqual({ progressToken: call.id });

    await vi.advanceTimersByTimeAsync(59_000);
    host.notify('notifications/progress', { progressToken: call.id, progress: 1 });
    await vi.advanceTimersByTimeAsync(59_000);
    expect(outcome).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(outcome).toHaveBeenCalledWith('The host did not answer in time.');
    // Like the SDK, the view tells the host it gave up on the request
    expect(host.sent.at(-1)).toEqual({
      jsonrpc: '2.0',
      method: 'notifications/cancelled',
      params: { requestId: call.id, reason: 'Timed out' },
    });
  });

  it('waits for the host as long as it takes when the timeout is 0', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const host = runPage(bridgePage);
    const outcome = vi.fn();
    host.global.bridge.callTool('some-tool', {}, { timeout: 0 }).then(outcome, outcome);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(outcome).not.toHaveBeenCalled();
    host.answer('tools/call', text({ ok: true }));
    await host.flush();
    expect(outcome).toHaveBeenCalledWith(text({ ok: true }));
  });

  it('hands a cancel of the opening call to the view, and leaves the view’s own calls alone', async () => {
    const before = runPage(bridgePage);
    before.notify('ui/notifications/tool-cancelled', { reason: 'user' });
    expect(calls(before)).toEqual([['cancelled', { reason: 'user' }]]);

    // Once the result is in, a cancel can't be about it, and it never ends a call the view
    // made: a Send in flight must not look failed while the host still sends it
    const after = runPage(bridgePage);
    after.notify('ui/notifications/tool-result', text({}));
    const outcome = vi.fn();
    after.global.bridge.callTool('some-tool', {}).then(outcome, outcome);
    after.notify('ui/notifications/tool-cancelled', { reason: 'user' });
    await after.flush();
    expect(outcome).not.toHaveBeenCalled();
    after.answer('tools/call', text({ ok: true }));
    await after.flush();
    expect(outcome).toHaveBeenCalledWith(text({ ok: true }));
    expect(calls(after)).toEqual([['result', text({})]]);
  });

  it('reads this server’s tool results and tells a failure from a success', () => {
    const { bridge } = runPage(bridgePage).global;
    expect(bridge.readToolResult(text({ value: [] }), 'failed')).toEqual({ value: [] });
    // A body the model left out comes as structuredContent, next to the model's success line
    expect(
      bridge.readToolResult({ ...text({ success: true }), structuredContent: { value: [1] } }, 'x')
    ).toEqual({ value: [1] });
    expect(() =>
      bridge.readToolResult({ ...text({ error: 'nope' }), isError: true }, 'failed')
    ).toThrow('nope');
    expect(() =>
      bridge.readToolResult(
        { ...text({ error: 'nope' }), structuredContent: { value: [] }, isError: true },
        'failed'
      )
    ).toThrow('nope');
    expect(() => bridge.readToolResult(text({ error: { message: 'Graph said no' } }), 'x')).toThrow(
      'Graph said no'
    );
    expect(() => bridge.readToolResult({ content: [{ type: 'text', text: 'a: 1' }] }, 'x')).toThrow(
      'not JSON'
    );

    expect(bridge.toolError(text({ success: true }), 'failed')).toBeUndefined();
    expect(bridge.toolError({ content: [] }, 'failed')).toBeUndefined();
    expect(
      bridge.toolError({ ...text({ error: 'x', message: 'Denied' }), isError: true }, 'f')
    ).toBe('Denied');
    expect(
      bridge.toolError({ content: [{ type: 'text', text: 'boom' }], isError: true }, 'f')
    ).toBe('boom');
  });
});

describe('mail draft view', () => {
  // The result of the call that opened the view: Graph answers a POST with the draft as it
  // stores it, HTML body and all
  const draft = {
    id: 'AAMkDraft=',
    changeKey: 'CQAAABYAAAA1',
    isDraft: true,
    subject: 'Quarterly numbers',
    toRecipients: [{ emailAddress: { name: 'Bob Builder', address: 'bob@example.com' } }],
    ccRecipients: [{ emailAddress: { name: 'carol@example.com', address: 'carol@example.com' } }],
    bccRecipients: [],
    replyTo: [],
    body: {
      contentType: 'html',
      content:
        '<html><head><style>p{color:red}</style></head><body><p>Hi&nbsp;Bob,</p><div>See &lt;attached&gt; &amp; reply</div>' +
        '<script>parent.postMessage({ method: "tools/call" }, "*")</script><img src="x" onerror="alert(1)"></body></html>',
    },
    bodyPreview: 'Hi Bob, See <attached> & reply',
    webLink: 'https://outlook.office365.com/owa/?ItemID=AAMkDraft%3D',
    hasAttachments: false,
  };
  // The same draft as the view's own read gets it: this server asks Graph for text bodies
  const read = {
    ...draft,
    body: {
      contentType: 'text',
      content: 'Hi Bob,\n\nSee <attached> & reply\n[https://example.com/logo.png]',
    },
  };
  const everything = { serverTools: {}, openLinks: {}, updateModelContext: { text: {} } };
  let mePage: string;
  let sendOnlyPage: string;
  let draftsOnlyPage: string;
  let getOnlyPage: string;
  let sharedPage: string;

  beforeAll(async () => {
    mePage = await servedPage(
      'mail-draft',
      'create-reply-draft',
      '^(create-reply-draft|get-mail-message|send-draft-message)$'
    );
    sendOnlyPage = await servedPage(
      'mail-draft',
      'create-draft-email',
      '^(create-draft-email|send-draft-message)$'
    );
    draftsOnlyPage = await servedPage('mail-draft', 'create-draft-email', '^create-draft-email$');
    getOnlyPage = await servedPage(
      'mail-draft',
      'create-draft-email',
      '^(create-draft-email|get-mail-message)$'
    );
    sharedPage = await servedPage(
      'mail-draft',
      'create-shared-mailbox-draft',
      '^(create-shared-mailbox-draft|get-shared-mailbox-message|send-shared-mailbox-draft)$',
      { orgMode: true }
    );
  });

  const calls = (host: ViewHost) => host.requests('tools/call').map((m) => m.params);
  const names = (host: ViewHost) => calls(host).map((c) => c.name);

  /** Opens the view on a tool result, then answers its own read of the draft with current */
  async function open(
    page: string,
    message: unknown = draft,
    input: Record<string, unknown> = { messageId: 'AAMkOriginal=', comment: 'Hi Bob' },
    capabilities: Record<string, unknown> = everything,
    current: unknown = read
  ) {
    const host = runPage(page);
    host.initialize(capabilities);
    await host.flush();
    host.notify('ui/notifications/tool-input', { arguments: input });
    host.notify('ui/notifications/tool-result', text(message));
    await host.flush();
    // null leaves the read unanswered; a view that cannot read makes no call
    if (current !== null && calls(host).length > 0) {
      host.answer('tools/call', text(current));
      await host.flush();
    }
    return host;
  }

  /** Clicks Send and answers the view's fresh read of the draft */
  async function clickSend(host: ViewHost, current: unknown = read) {
    el(host, 'send').click();
    host.answer('tools/call', text(current));
    await host.flush();
  }

  it('shows the draft as it reads it itself, with every address written out', async () => {
    const host = await open(mePage);
    expect(calls(host)).toEqual([
      {
        name: 'get-mail-message',
        arguments: { messageId: 'AAMkDraft=' },
        _meta: { progressToken: expect.any(Number) },
      },
    ]);
    expect(el(host, 'subject').textContent).toBe('Quarterly numbers');
    expect(el(host, 'fields').textContent).toBe(
      'ToBob Builder <bob@example.com>Cccarol@example.com'
    );
    expect(el(host, 'body').textContent).toBe(
      'Hi Bob,\n\nSee <attached> & reply\n[https://example.com/logo.png]'
    );
    expect(el(host, 'status').textContent).toBe('');
    expect(el(host, 'send').hidden).toBe(false);
    expect(el(host, 'send').disabled).toBe(false);
    expect(el(host, 'open').hidden).toBe(false);
  });

  it('never parses the HTML body: until its own read it shows only Graph’s preview', async () => {
    const host = await open(mePage, draft, undefined, everything, null);
    expect(el(host, 'body').textContent).toBe('Hi Bob, See <attached> & reply');
    expect(el(host, 'status').textContent).toBe('Reading the draft...');
    expect(el(host, 'send').disabled).toBe(true);
    host.answer('tools/call', text(read));
    await host.flush();
    expect(el(host, 'body').textContent).toBe(read.body.content);
    expect(el(host, 'send').disabled).toBe(false);
  });

  it('shows the draft as it reads it, not the result that opened it, which a select can trim', async () => {
    // The model's select left the Bcc and the body out of the result that opened the view
    const { id, changeKey, subject, toRecipients } = draft;
    const whole = { ...read, bccRecipients: [{ emailAddress: { address: 'eve@evil.example' } }] };
    const host = await open(
      mePage,
      { id, changeKey, subject, toRecipients },
      undefined,
      everything,
      whole
    );
    expect(el(host, 'fields').textContent).toContain('Bcceve@evil.example');
    expect(el(host, 'body').textContent).toBe(read.body.content);
    await clickSend(host, whole);
    expect(names(host)).toEqual(['get-mail-message', 'get-mail-message', 'send-draft-message']);
  });

  it('shows only Graph’s preview, and no Send, when this server gives HTML bodies', async () => {
    // MS365_MCP_BODY_FORMAT=html: the view's own read gets HTML, which it does not turn into text
    const host = await open(mePage, draft, undefined, everything, draft);
    expect(el(host, 'body').textContent).toBe(draft.bodyPreview);
    expect(el(host, 'send').hidden).toBe(true);
    expect(el(host, 'status').textContent).toBe(
      'To send it, open it in Outlook or ask in the chat.'
    );
  });

  it('reads the draft once the host is ready when the result came first', async () => {
    const host = runPage(mePage);
    host.notify('ui/notifications/tool-input', { arguments: { messageId: 'AAMkOriginal=' } });
    host.notify('ui/notifications/tool-result', text(draft));
    await host.flush();
    expect(calls(host)).toEqual([]);
    host.initialize(everything);
    await host.flush();
    expect(names(host)).toEqual(['get-mail-message']);
    host.answer('tools/call', text(read));
    await host.flush();
    expect(el(host, 'body').textContent).toBe(read.body.content);
    expect(names(host)).toEqual(['get-mail-message']);
  });

  it('shows nothing it read for another message', async () => {
    const host = await open(mePage, draft, undefined, everything, { ...read, id: 'AAMkOther=' });
    expect(el(host, 'status').textContent).toBe('This result is not the draft.');
    expect(el(host, 'body').textContent).toBe(draft.bodyPreview);
  });

  it('shows where answers go when the draft sends them to someone else', async () => {
    const host = await open(mePage, draft, undefined, everything, {
      ...read,
      replyTo: [{ emailAddress: { name: 'Bob Builder', address: 'attacker@evil.example' } }],
    });
    expect(el(host, 'fields').textContent).toBe(
      'ToBob Builder <bob@example.com>Cccarol@example.comReply toBob Builder <attacker@evil.example>'
    );
  });

  it('shows Graph’s text of the body as it is, without bidi controls that turn text around', async () => {
    const rlo = String.fromCodePoint(0x202e);
    const rlm = String.fromCodePoint(0x200f);
    const arabicMark = String.fromCodePoint(0x061c);
    // An RLM before digit groups shows them in reverse order
    const content =
      `Pay here${rlo} https://evil.example/moc.knab//:sptth\n` +
      `Account: NO93 ${rlm}8601 1117 947${arabicMark}\n\n  <b>not bold</b>`;
    const host = await open(mePage, draft, undefined, everything, {
      ...read,
      body: { contentType: 'text', content },
    });
    expect(el(host, 'body').textContent).toBe(
      'Pay here https://evil.example/moc.knab//:sptth\nAccount: NO93 8601 1117 947\n\n  <b>not bold</b>'
    );
  });

  it('drops bidi controls that would make one address read like another', async () => {
    const rlo = String.fromCodePoint(0x202e);
    const isolate = String.fromCodePoint(0x2066);
    const arabicMark = String.fromCodePoint(0x061c);
    const host = await open(mePage, draft, undefined, everything, {
      ...read,
      toRecipients: [
        {
          emailAddress: {
            name: `Boss ${rlo}moc.ssob`,
            address: `${isolate}evil@${arabicMark}example.net`,
          },
        },
      ],
      ccRecipients: [],
    });
    expect(el(host, 'fields').textContent).toBe('ToBoss moc.ssob <evil@example.net>');
  });

  it('reads the draft again on a click, then sends it with its own id and confirm', async () => {
    const host = await open(mePage, draft, {
      messageId: 'AAMkOriginal=',
      comment: 'Hi Bob',
      account: 'me@example.com',
    });
    const get = {
      name: 'get-mail-message',
      arguments: { messageId: 'AAMkDraft=', account: 'me@example.com' },
      _meta: { progressToken: expect.any(Number) },
    };
    expect(calls(host)).toEqual([get]);
    await clickSend(host);
    expect(calls(host)).toEqual([
      get,
      get,
      {
        name: 'send-draft-message',
        arguments: { messageId: 'AAMkDraft=', confirm: true, account: 'me@example.com' },
        _meta: { progressToken: expect.any(Number) },
      },
    ]);
    expect(el(host, 'status').textContent).toBe('Sending...');
    expect(el(host, 'send').disabled).toBe(true);
    el(host, 'send').click();
    expect(calls(host)).toHaveLength(3);
  });

  it('reads and sends a shared mailbox’s draft in that mailbox', async () => {
    const host = await open(sharedPage, draft, { userId: 'shared@example.com', body: {} });
    await clickSend(host);
    const inMailbox = { messageId: 'AAMkDraft=', userId: 'shared@example.com' };
    expect(calls(host).map((c) => [c.name, c.arguments])).toEqual([
      ['get-shared-mailbox-message', inMailbox],
      ['get-shared-mailbox-message', inMailbox],
      ['send-shared-mailbox-draft', { ...inMailbox, confirm: true }],
    ]);
  });

  it('shows a draft that changed since it was shown, and sends only on the next click', async () => {
    const host = await open(mePage);
    const changed = {
      ...read,
      changeKey: 'CQAAABYAAAA2',
      toRecipients: [{ emailAddress: { name: 'Bob', address: 'attacker@evil.example' } }],
    };
    await clickSend(host, changed);
    expect(names(host)).toEqual(['get-mail-message', 'get-mail-message']);
    expect(el(host, 'fields').textContent).toContain('Bob <attacker@evil.example>');
    expect(el(host, 'status').textContent).toBe(
      'The draft changed since it was shown. Check it and press Send again.'
    );
    expect(el(host, 'send').disabled).toBe(false);

    await clickSend(host, changed);
    expect(names(host)).toEqual([
      'get-mail-message',
      'get-mail-message',
      'get-mail-message',
      'send-draft-message',
    ]);
  });

  it('reads the draft on a click when its first read failed, and sends only after showing it', async () => {
    const host = await open(mePage, draft, undefined, everything, null);
    host.answer('tools/call', { ...text({ error: 'Graph is busy' }), isError: true });
    await host.flush();
    expect(el(host, 'status').textContent).toBe('Graph is busy');
    expect(el(host, 'body').textContent).toBe(draft.bodyPreview);

    await clickSend(host);
    expect(names(host)).toEqual(['get-mail-message', 'get-mail-message']);
    expect(el(host, 'body').textContent).toBe(read.body.content);
    expect(el(host, 'status').textContent).toBe(
      'Here is the whole draft. Check it and press Send again.'
    );
    await clickSend(host);
    expect(names(host)).toEqual([
      'get-mail-message',
      'get-mail-message',
      'get-mail-message',
      'send-draft-message',
    ]);
  });

  it('sends nothing when the draft is gone or already sent', async () => {
    const gone = await open(mePage);
    el(gone, 'send').click();
    gone.answer('tools/call', {
      ...text({ error: 'ErrorItemNotFound: The specified object was not found in the store.' }),
      isError: true,
    });
    await gone.flush();
    expect(el(gone, 'status').textContent).toContain('ErrorItemNotFound');
    expect(names(gone)).toEqual(['get-mail-message', 'get-mail-message']);

    const sent = await open(mePage);
    await clickSend(sent, { ...read, isDraft: false });
    expect(el(sent, 'status').textContent).toBe('This draft has already been sent.');
    expect(names(sent)).toEqual(['get-mail-message', 'get-mail-message']);

    // An old view shown again finds out on its own first read
    const old = await open(mePage, draft, undefined, everything, { ...read, isDraft: false });
    expect(el(old, 'status').textContent).toBe('This draft has already been sent.');
  });

  it('says Sent, drops both buttons and tells the model, without the subject', async () => {
    const host = await open(mePage);
    await clickSend(host);
    host.answer('tools/call', text({ success: true }));
    await host.flush();
    expect(el(host, 'status').textContent).toBe('Sent.');
    expect(el(host, 'send').hidden).toBe(true);
    expect(el(host, 'open').hidden).toBe(true);
    const update = host.request('ui/update-model-context')!;
    expect(update.params.content[0].text).toContain('AAMkDraft=');
    expect(update.params.content[0].text).not.toContain('Quarterly');
  });

  it('counts an empty success as sent: Graph answers a send with no body', async () => {
    const host = await open(mePage);
    await clickSend(host);
    host.answer('tools/call', { content: [] });
    await host.flush();
    expect(el(host, 'status').textContent).toBe('Sent.');
  });

  it('leaves the model alone when the host takes no context updates', async () => {
    const host = await open(mePage, draft, {}, { serverTools: {} });
    await clickSend(host);
    host.answer('tools/call', text({ success: true }));
    await host.flush();
    expect(host.requests('ui/update-model-context')).toEqual([]);
  });

  it('shows why a send failed and lets the user try again', async () => {
    const host = await open(mePage);
    await clickSend(host);
    host.answer('tools/call', { ...text({ error: 'Mail.Send is missing' }), isError: true });
    await host.flush();
    expect(el(host, 'status').textContent).toBe('Mail.Send is missing');
    expect(el(host, 'status').classList.contains('error')).toBe(true);
    expect(el(host, 'send').disabled).toBe(false);
    el(host, 'send').click();
    expect(calls(host)).toHaveLength(4);
  });

  it('waits out a slow approval instead of reporting a failed send', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const host = await open(mePage);
    await clickSend(host);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(el(host, 'status').textContent).toBe('Sending...');
    host.answer('tools/call', text({ success: true }));
    await host.flush();
    expect(el(host, 'status').textContent).toBe('Sent.');
  });

  it('gives up after 10 minutes without an answer, and says to check Sent Items', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const host = await open(mePage);
    await clickSend(host);
    const sendCall = host.request('tools/call')!;
    await vi.advanceTimersByTimeAsync(600_000);
    expect(el(host, 'status').textContent).toBe(
      'No answer from the host. Check Sent Items before you try again.'
    );
    expect(host.sent).toContainEqual({
      jsonrpc: '2.0',
      method: 'notifications/cancelled',
      params: { requestId: sendCall.id, reason: 'Timed out' },
    });
    expect(el(host, 'send').disabled).toBe(false);
  });

  it('offers no Send, and shows only Graph’s preview, without the tools to read and send', async () => {
    const host = await open(draftsOnlyPage);
    expect(calls(host)).toEqual([]);
    expect(el(host, 'body').textContent).toBe(draft.bodyPreview);
    expect(el(host, 'send').hidden).toBe(true);
    expect(el(host, 'status').textContent).toBe(
      'To send it, open it in Outlook or ask in the chat.'
    );
  });

  it('reads and shows the whole draft, without Send, when this server registers no send tool', async () => {
    const host = await open(getOnlyPage);
    expect(names(host)).toEqual(['get-mail-message']);
    expect(el(host, 'body').textContent).toBe(read.body.content);
    expect(el(host, 'send').hidden).toBe(true);
    expect(el(host, 'status').textContent).toBe(
      'To send it, open it in Outlook or ask in the chat.'
    );
  });

  it('offers no Send without the tool that reads the draft again', async () => {
    const host = await open(sendOnlyPage);
    expect(calls(host)).toEqual([]);
    expect(el(host, 'send').hidden).toBe(true);
  });

  it('offers no Send when the host cannot call tools', async () => {
    const host = await open(mePage, draft, {}, {});
    expect(calls(host)).toEqual([]);
    expect(el(host, 'send').hidden).toBe(true);
    expect(el(host, 'open').hidden).toBe(true);
    expect(el(host, 'status').textContent).toBe('Ask in the chat to send it.');
  });

  it('reads a draft with no recipients again on a click, and sends it once it has some', async () => {
    const empty = { ...read, toRecipients: [], ccRecipients: [] };
    const host = await open(mePage, draft, undefined, everything, empty);
    expect(el(host, 'fields').textContent).toBe('ToNobody yet');
    expect(el(host, 'status').textContent).toBe('This draft has no recipients yet.');
    expect(el(host, 'send').disabled).toBe(false);

    // Still nobody to send to: the click only read it again
    await clickSend(host, empty);
    expect(names(host)).toEqual(['get-mail-message', 'get-mail-message']);
    expect(el(host, 'status').textContent).toBe('This draft has no recipients yet.');

    // The model has added Bob since
    const withBob = { ...read, changeKey: 'CQAAABYAAAA2' };
    await clickSend(host, withBob);
    expect(el(host, 'fields').textContent).toContain('Bob Builder <bob@example.com>');
    expect(el(host, 'status').textContent).toBe(
      'The draft changed since it was shown. Check it and press Send again.'
    );
    await clickSend(host, withBob);
    expect(names(host)).toEqual([
      'get-mail-message',
      'get-mail-message',
      'get-mail-message',
      'get-mail-message',
      'send-draft-message',
    ]);
  });

  it('shows the error when the draft could not be created', async () => {
    const host = runPage(mePage);
    host.initialize(everything);
    await host.flush();
    host.notify('ui/notifications/tool-result', {
      ...text({ error: 'Invalid recipient' }),
      isError: true,
    });
    await host.flush();
    expect(el(host, 'status').textContent).toBe('Invalid recipient');
    expect(el(host, 'send').hidden).toBe(true);
    expect(calls(host)).toEqual([]);
  });

  it('shows the draft when the model left it out of its own result', async () => {
    const host = runPage(mePage);
    host.initialize(everything);
    await host.flush();
    host.notify('ui/notifications/tool-input', { arguments: { excludeResponse: true } });
    host.notify('ui/notifications/tool-result', {
      ...text({ success: true }),
      structuredContent: draft,
    });
    await host.flush();
    host.answer('tools/call', text(read));
    await host.flush();
    expect(el(host, 'subject').textContent).toBe('Quarterly numbers');
    expect(el(host, 'body').textContent).toBe(read.body.content);
    expect(el(host, 'send').hidden).toBe(false);
  });

  it('says so when the result has no draft in it', async () => {
    const host = await open(mePage, { success: true });
    expect(el(host, 'status').textContent).toBe(
      'The result does not include the draft, so it is not shown here.'
    );
    expect(el(host, 'send').hidden).toBe(true);
    expect(el(host, 'open').hidden).toBe(true);
  });

  it('opens the draft in Outlook through the host', async () => {
    const host = await open(mePage);
    el(host, 'open').click();
    expect(host.request('ui/open-link')!.params).toEqual({ url: draft.webLink });
  });
});

describe('file browser view', () => {
  const listing = {
    value: [
      {
        id: 'file-1',
        name: 'report.pdf',
        size: 2048,
        file: {},
        webUrl: 'https://contoso.sharepoint.com/report.pdf',
        parentReference: { driveId: 'drive-1', id: 'root-id', path: '/drive/root:' },
      },
      {
        id: 'folder-1',
        name: 'Docs',
        folder: { childCount: 3 },
        parentReference: { driveId: 'drive-1', id: 'root-id', path: '/drive/root:' },
      },
      {
        id: 'shortcut-1',
        name: 'Shared',
        remoteItem: {
          id: 'remote-folder',
          folder: { childCount: 1 },
          parentReference: { driveId: 'drive-2' },
        },
      },
    ],
    '@odata.nextLink':
      'https://graph.microsoft.com/v1.0/drives/drive-1/items/root/children?$skiptoken=abc',
  };
  let page: string;

  beforeAll(async () => {
    page = await servedPage('file-browser', 'list-folder-files', '^list-folder-files$');
  });

  async function open() {
    const host = runPage(page);
    host.initialize({ serverTools: {}, openLinks: {} });
    await host.flush();
    host.notify('ui/notifications/tool-input', {
      arguments: { driveId: 'drive-1', driveItemId: 'root', account: 'me@example.com' },
    });
    host.notify('ui/notifications/tool-result', text(listing));
    await host.flush();
    return host;
  }

  const rows = (host: ViewHost) =>
    [...el(host, 'items').walk()].filter((node) => node.className === 'row');

  it('lists folders first and opens one through the same tool', async () => {
    const host = await open();
    expect(rows(host).map((row) => row.title)).toEqual(['Docs', 'Shared', 'report.pdf']);
    rows(host)[0].click();
    expect(host.request('tools/call')!.params).toMatchObject({
      name: 'list-folder-files',
      arguments: {
        driveId: 'drive-1',
        driveItemId: 'folder-1',
        top: 100,
        account: 'me@example.com',
      },
    });
  });

  it('opens a shortcut on the drive it points to', async () => {
    const host = await open();
    rows(host)[1].click();
    expect(host.request('tools/call')!.params.arguments).toMatchObject({
      driveId: 'drive-2',
      driveItemId: 'remote-folder',
    });
  });

  it('loads the next page with the same arguments and the nextLink as skiptoken', async () => {
    const host = await open();
    el(host, 'more').click();
    expect(host.request('tools/call')!.params.arguments).toEqual({
      driveId: 'drive-1',
      driveItemId: 'root',
      account: 'me@example.com',
      skiptoken: listing['@odata.nextLink'],
    });
    host.answer('tools/call', text({ value: [{ id: 'f2', name: 'more.txt', file: {} }] }));
    await host.flush();
    expect(rows(host).map((row) => row.title)).toEqual([
      'Docs',
      'Shared',
      'report.pdf',
      'more.txt',
    ]);
    expect(el(host, 'more').hidden).toBe(true);
  });

  it('opens a file in the browser through the host', async () => {
    const host = await open();
    rows(host)[2].click();
    expect(host.request('ui/open-link')!.params).toEqual({
      url: 'https://contoso.sharepoint.com/report.pdf',
    });
  });
});

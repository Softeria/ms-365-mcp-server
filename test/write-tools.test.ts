import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool, registerTools } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { resolveAuthScopes } from '../src/oauth/scopes.js';
import { Policy } from '../src/policy/index.js';
import { requestContext } from '../src/request-context.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

describe('write-tool registration', () => {
  const writeNames = [
    'mail-draft-create',
    'mail-message-update',
    'mail-attachment-add',
    'mail-message-delete',
    'mail-send',
    'calendar-event-create',
    'calendar-event-update',
    'calendar-event-delete',
  ];

  it('every PR 4 write tool is in ALL_TOOLS', () => {
    for (const name of writeNames) expect(findTool(name)).toBeDefined();
  });

  it('write-tool scopes are exposed via OAuth scopes_supported', () => {
    const scopes = resolveAuthScopes();
    expect(scopes).toContain('Mail.ReadWrite');
    expect(scopes).toContain('Calendars.ReadWrite');
  });

  it('Mail.Send IS requested and mail-draft-send carries the same-domain guard', () => {
    const scopes = resolveAuthScopes();
    expect(scopes).toContain('Mail.Send');
    const send = findTool('mail-draft-send');
    expect(send).toBeDefined();
    expect(send.method).toBe('POST');
    expect(send.path).toBe('/me/messages/{message-id}/send');
    // The send guard is enforced in code via a precondition, not just the
    // description — without it, send would be unguarded.
    expect(send.precondition).toBeDefined();
  });

  it('mail-send (direct send) hits /me/sendMail and carries the same-domain guard', () => {
    const send = findTool('mail-send');
    expect(send).toBeDefined();
    expect(send.scopes).toContain('Mail.Send');
    expect(send.method).toBe('POST');
    expect(send.path).toBe('/me/sendMail');
    // Same in-code same-domain guard as mail-draft-send; the description alone
    // is not load-bearing.
    expect(send.precondition).toBeDefined();
  });

  it('non-GET write tools surface destructiveHint via the McpServer registration', () => {
    const calls: Array<[string, string, Record<string, unknown>, Record<string, unknown>]> = [];
    const mockServer = {
      tool: vi.fn((name: string, description: string, schema, hints) => {
        calls.push([name, description, schema, hints]);
      }),
    };
    const graphClient = { graphRequest: vi.fn() } as unknown as GraphClient;
    registerTools(mockServer as never, graphClient, { toolsets: 'all' });

    for (const name of writeNames) {
      const call = calls.find((c) => c[0] === name);
      expect(call, `tool ${name} not registered`).toBeDefined();
      const hints = call![3] as { readOnlyHint: boolean; destructiveHint: boolean };
      expect(hints.readOnlyHint).toBe(false);
      expect(hints.destructiveHint).toBe(true);
    }
  });
});

describe('write-tool runtime', () => {
  let mockGraphClient: GraphClient;
  let graphRequest: ReturnType<typeof vi.fn>;

  // Mail write tools (other than mail-draft-create) carry an isDraft
  // precondition; calendar update/delete tools carry an isOrganizer
  // precondition. The runtime issues a GET ?$select=<prop> before the main
  // call; default the mock to "yes it's a draft" / "yes you're the organizer"
  // so existing test bodies exercise the main code path. Negative cases
  // override per-test.
  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest = vi.fn().mockImplementation((path: string) => {
      if (path.includes('$select=isDraft')) {
        return Promise.resolve({ isDraft: true });
      }
      if (path.includes('$select=isOrganizer')) {
        return Promise.resolve({ isOrganizer: true });
      }
      return Promise.resolve({ content: [{ type: 'text', text: '{}' }] });
    });
    // Precondition probes use makeRequest (raw object); the main call uses
    // graphRequest. One spy for both keeps the call-order assertions simple.
    mockGraphClient = { graphRequest, makeRequest: graphRequest } as unknown as GraphClient;
  });

  // Helper: the main Graph call is whichever one isn't a precondition probe.
  const mainCall = () =>
    graphRequest.mock.calls.find(
      ([p]: [string]) => !p.includes('$select=isDraft') && !p.includes('$select=isOrganizer')
    ) as [string, { method: string; body?: string }] | undefined;

  it('mail-draft-create POSTs a JSON body to /me/messages', async () => {
    const tool = findTool('mail-draft-create');
    await executeTool(tool, mockGraphClient, {
      body: {
        subject: 'Hello',
        body: { contentType: 'text', content: 'Test body' },
        toRecipients: [{ emailAddress: { address: 'to@example.com' } }],
      },
    });

    // mail-draft-create has no precondition — only one call.
    expect(graphRequest.mock.calls).toHaveLength(1);
    const call = mainCall()!;
    expect(call[0]).toBe('/me/messages');
    expect(call[1].method).toBe('POST');
    const parsed = JSON.parse(call[1].body!);
    expect(parsed.subject).toBe('Hello');
    expect(parsed.toRecipients[0].emailAddress.address).toBe('to@example.com');
  });

  it('mail-message-update PATCHes the message id after isDraft check passes', async () => {
    const tool = findTool('mail-message-update');
    await executeTool(tool, mockGraphClient, {
      'message-id': 'msg-1',
      body: { isRead: true },
    });

    // First call: precondition probe. Second call: the PATCH.
    expect(graphRequest.mock.calls[0][0]).toBe('/me/messages/msg-1?$select=isDraft');
    expect(graphRequest.mock.calls[0][1].method).toBe('GET');

    const call = mainCall()!;
    expect(call[0]).toBe('/me/messages/msg-1');
    expect(call[1].method).toBe('PATCH');
    expect(JSON.parse(call[1].body!)).toEqual({ isRead: true });
  });

  it('mail-message-delete DELETEs after isDraft check passes', async () => {
    const tool = findTool('mail-message-delete');
    await executeTool(tool, mockGraphClient, { 'message-id': 'msg-3' });

    expect(graphRequest.mock.calls[0][0]).toBe('/me/messages/msg-3?$select=isDraft');
    const call = mainCall()!;
    expect(call[0]).toBe('/me/messages/msg-3');
    expect(call[1].method).toBe('DELETE');
  });

  // ---- Precondition: negative cases ----
  // The runtime must refuse non-draft writes regardless of tool description.

  for (const toolName of ['mail-message-update', 'mail-message-delete', 'mail-attachment-add']) {
    it(`${toolName} REFUSES when isDraft=false (received mail) and never fires the main call`, async () => {
      graphRequest = vi.fn().mockResolvedValue({ isDraft: false });
      mockGraphClient = { graphRequest, makeRequest: graphRequest } as unknown as GraphClient;

      const params: Record<string, unknown> = { 'message-id': 'received-msg' };
      if (toolName === 'mail-message-update') params.body = { isRead: true };
      if (toolName === 'mail-attachment-add') {
        params.body = { '@odata.type': '#microsoft.graph.fileAttachment', name: 'x' };
      }

      const result = await executeTool(findTool(toolName), mockGraphClient, params);

      expect(result.isError).toBe(true);
      const payload = JSON.parse((result.content[0] as { text: string }).text);
      expect(payload.error).toMatch(/precondition failed/i);
      expect(payload.error).toMatch(/not a draft/i);
      // Exactly one Graph call — the isDraft probe — and nothing else.
      expect(graphRequest.mock.calls).toHaveLength(1);
      expect(graphRequest.mock.calls[0][0]).toContain('$select=isDraft');
    });
  }

  it('mail-message-update REFUSES when the message does not exist (precondition GET fails)', async () => {
    graphRequest = vi.fn().mockRejectedValue(new Error('404 Not Found'));
    mockGraphClient = { graphRequest, makeRequest: graphRequest } as unknown as GraphClient;

    const result = await executeTool(findTool('mail-message-update'), mockGraphClient, {
      'message-id': 'gone',
      body: { isRead: true },
    });

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/could not verify message is a draft/i);
    // Only the failed probe ran — no PATCH attempted.
    expect(graphRequest.mock.calls).toHaveLength(1);
  });

  it('calendar-event-create POSTs the event body to /me/events', async () => {
    const tool = findTool('calendar-event-create');
    await executeTool(tool, mockGraphClient, {
      body: {
        subject: 'Sync',
        start: { dateTime: '2026-05-22T14:00:00', timeZone: 'America/New_York' },
        end: { dateTime: '2026-05-22T15:00:00', timeZone: 'America/New_York' },
      },
    });

    // calendar-event-create has no precondition — only one call.
    expect(graphRequest.mock.calls).toHaveLength(1);
    const call = mainCall()!;
    expect(call[0]).toBe('/me/events');
    expect(call[1].method).toBe('POST');
    const parsed = JSON.parse(call[1].body!);
    expect(parsed.subject).toBe('Sync');
    expect(parsed.start.timeZone).toBe('America/New_York');
  });

  it('calendar-event-update PATCHes the event id after isOrganizer check passes', async () => {
    const tool = findTool('calendar-event-update');
    await executeTool(tool, mockGraphClient, {
      'event-id': 'evt-1',
      body: { subject: 'Renamed' },
    });

    // First call: precondition probe. Second call: the PATCH.
    expect(graphRequest.mock.calls[0][0]).toBe('/me/events/evt-1?$select=isOrganizer');
    expect(graphRequest.mock.calls[0][1].method).toBe('GET');

    const call = mainCall()!;
    expect(call[0]).toBe('/me/events/evt-1');
    expect(call[1].method).toBe('PATCH');
    expect(JSON.parse(call[1].body!)).toEqual({ subject: 'Renamed' });
  });

  it('calendar-event-delete DELETEs after isOrganizer check passes', async () => {
    const tool = findTool('calendar-event-delete');
    await executeTool(tool, mockGraphClient, { 'event-id': 'evt-2' });

    expect(graphRequest.mock.calls[0][0]).toBe('/me/events/evt-2?$select=isOrganizer');
    const call = mainCall()!;
    expect(call[0]).toBe('/me/events/evt-2');
    expect(call[1].method).toBe('DELETE');
  });

  // ---- Precondition: calendar negative cases ----
  // Attendee-side events (isOrganizer=false) and nonexistent events must be
  // refused before any PATCH/DELETE fires.

  for (const toolName of ['calendar-event-update', 'calendar-event-delete']) {
    it(`${toolName} REFUSES when isOrganizer=false (attendee event) and never fires the main call`, async () => {
      graphRequest = vi.fn().mockResolvedValue({ isOrganizer: false });
      mockGraphClient = { graphRequest, makeRequest: graphRequest } as unknown as GraphClient;

      const params: Record<string, unknown> = { 'event-id': 'invite-evt' };
      if (toolName === 'calendar-event-update') params.body = { subject: 'nope' };

      const result = await executeTool(findTool(toolName), mockGraphClient, params);

      expect(result.isError).toBe(true);
      const payload = JSON.parse((result.content[0] as { text: string }).text);
      expect(payload.error).toMatch(/precondition failed/i);
      expect(payload.error).toMatch(/not organized by the signed-in user/i);
      // Exactly one Graph call — the isOrganizer probe — and nothing else.
      expect(graphRequest.mock.calls).toHaveLength(1);
      expect(graphRequest.mock.calls[0][0]).toContain('$select=isOrganizer');
    });

    it(`${toolName} REFUSES when the event does not exist (precondition GET fails)`, async () => {
      graphRequest = vi.fn().mockRejectedValue(new Error('404 Not Found'));
      mockGraphClient = { graphRequest, makeRequest: graphRequest } as unknown as GraphClient;

      const params: Record<string, unknown> = { 'event-id': 'gone' };
      if (toolName === 'calendar-event-update') params.body = { subject: 'nope' };

      const result = await executeTool(findTool(toolName), mockGraphClient, params);

      expect(result.isError).toBe(true);
      const payload = JSON.parse((result.content[0] as { text: string }).text);
      expect(payload.error).toMatch(/could not verify event is organized/i);
      // Only the failed probe ran — no PATCH/DELETE attempted.
      expect(graphRequest.mock.calls).toHaveLength(1);
    });
  }
});

describe('mail-draft-send same-domain guard', () => {
  const recipient = (address: string) => ({ emailAddress: { address } });

  // Mock that answers the precondition probe with a configurable draft and
  // succeeds the actual /send POST.
  function makeMock(draft: Record<string, unknown>) {
    const graphRequest = vi.fn().mockImplementation((path: string) => {
      if (path.includes('$select=isDraft')) return Promise.resolve(draft);
      return Promise.resolve({ content: [{ type: 'text', text: '' }] });
    });
    return {
      graphRequest,
      client: { graphRequest, makeRequest: graphRequest } as unknown as GraphClient,
    };
  }

  const sendCall = (graphRequest: ReturnType<typeof vi.fn>) =>
    graphRequest.mock.calls.find(([p]: [string]) => p.endsWith('/send')) as
      | [string, { method: string }]
      | undefined;

  function run(upn: string | null, client: GraphClient, policy?: Policy, messageId = 'draft-1') {
    return requestContext.run(
      { accessToken: 'at', userOid: 'oid', tenantId: 't', userPrincipalName: upn },
      () => executeTool(findTool('mail-draft-send'), client, { 'message-id': messageId }, policy)
    );
  }

  const sameDomainPolicy = () =>
    Policy.fromDocument({
      defaults: { allow: ['mail-draft-send'] },
      mailSend: { requireSameDomain: true, allowedDomains: ['aretepartners.com'] },
    });

  it('sends when the sender and every recipient share the allowed domain', async () => {
    const { graphRequest, client } = makeMock({
      isDraft: true,
      toRecipients: [recipient('alice@aretepartners.com')],
      ccRecipients: [recipient('bob@aretepartners.com')],
    });
    const result = await run('me@aretepartners.com', client, sameDomainPolicy());

    expect(result.isError).toBeFalsy();
    const call = sendCall(graphRequest)!;
    expect(call[0]).toBe('/me/messages/draft-1/send');
    expect(call[1].method).toBe('POST');
  });

  it('refuses (and never POSTs) when any recipient is out of domain', async () => {
    const { graphRequest, client } = makeMock({
      isDraft: true,
      toRecipients: [recipient('alice@aretepartners.com')],
      bccRecipients: [recipient('outsider@gmail.com')],
    });
    const result = await run('me@aretepartners.com', client, sameDomainPolicy());

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/precondition failed/i);
    expect(payload.error).toMatch(/outsider@gmail\.com/);
    expect(sendCall(graphRequest)).toBeUndefined();
  });

  it('refuses when the sender domain is not in allowedDomains, even if internal-consistent', async () => {
    const { graphRequest, client } = makeMock({
      isDraft: true,
      toRecipients: [recipient('alice@other.com')],
    });
    const result = await run('me@other.com', client, sameDomainPolicy());

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/not in the policy's allowed send domains/i);
    expect(sendCall(graphRequest)).toBeUndefined();
  });

  it('refuses when the message is not a draft and never POSTs', async () => {
    const { graphRequest, client } = makeMock({
      isDraft: false,
      toRecipients: [recipient('alice@aretepartners.com')],
    });
    const result = await run('me@aretepartners.com', client, sameDomainPolicy());

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/not a draft/i);
    expect(sendCall(graphRequest)).toBeUndefined();
  });

  it('falls back to the fail-safe same-domain default when no policy is configured', async () => {
    const internal = makeMock({
      isDraft: true,
      toRecipients: [recipient('peer@example.com')],
    });
    const okResult = await run('me@example.com', internal.client);
    expect(okResult.isError).toBeFalsy();
    expect(sendCall(internal.graphRequest)).toBeDefined();

    const external = makeMock({
      isDraft: true,
      toRecipients: [recipient('peer@elsewhere.com')],
    });
    const denied = await run('me@example.com', external.client);
    expect(denied.isError).toBe(true);
    expect(sendCall(external.graphRequest)).toBeUndefined();
  });

  it('respects the policy gate: a user without mail-draft-send is denied before the guard runs', async () => {
    const policy = Policy.fromDocument({
      defaults: { allow: [] },
      mailSend: { requireSameDomain: true, allowedDomains: ['aretepartners.com'] },
    });
    const { graphRequest, client } = makeMock({
      isDraft: true,
      toRecipients: [recipient('alice@aretepartners.com')],
    });
    const result = await run('me@aretepartners.com', client, policy);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Policy denied');
    // Denied by policy before the precondition probe — no Graph call at all.
    expect(graphRequest).not.toHaveBeenCalled();
  });
});

describe('mail-send direct send same-domain guard', () => {
  const recipient = (address: string) => ({ emailAddress: { address } });

  // mail-send reads recipients straight from the request body — there is no
  // draft to probe — so the mock only needs to answer the /me/sendMail POST.
  function makeMock() {
    const graphRequest = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '' }] });
    return {
      graphRequest,
      client: { graphRequest, makeRequest: graphRequest } as unknown as GraphClient,
    };
  }

  const sendCall = (graphRequest: ReturnType<typeof vi.fn>) =>
    graphRequest.mock.calls.find(([p]: [string]) => p === '/me/sendMail') as
      | [string, { method: string }]
      | undefined;

  function run(
    upn: string | null,
    client: GraphClient,
    body: Record<string, unknown>,
    policy?: Policy
  ) {
    return requestContext.run(
      { accessToken: 'at', userOid: 'oid', tenantId: 't', userPrincipalName: upn },
      () => executeTool(findTool('mail-send'), client, { body }, policy)
    );
  }

  const sameDomainPolicy = () =>
    Policy.fromDocument({
      defaults: { allow: ['mail-send'] },
      mailSend: { requireSameDomain: true, allowedDomains: ['aretepartners.com'] },
    });

  it('sends when the sender and every recipient share the allowed domain', async () => {
    const { graphRequest, client } = makeMock();
    const result = await run(
      'me@aretepartners.com',
      client,
      {
        message: {
          subject: 'hi',
          toRecipients: [recipient('alice@aretepartners.com')],
          ccRecipients: [recipient('bob@aretepartners.com')],
        },
      },
      sameDomainPolicy()
    );

    expect(result.isError).toBeFalsy();
    const call = sendCall(graphRequest)!;
    expect(call[0]).toBe('/me/sendMail');
    expect(call[1].method).toBe('POST');
  });

  it('refuses (and never POSTs) when any recipient is out of domain', async () => {
    const { graphRequest, client } = makeMock();
    const result = await run(
      'me@aretepartners.com',
      client,
      {
        message: {
          toRecipients: [recipient('alice@aretepartners.com')],
          bccRecipients: [recipient('outsider@gmail.com')],
        },
      },
      sameDomainPolicy()
    );

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/precondition failed/i);
    expect(payload.error).toMatch(/outsider@gmail\.com/);
    expect(sendCall(graphRequest)).toBeUndefined();
  });

  it('refuses when the sender domain is not in allowedDomains', async () => {
    const { graphRequest, client } = makeMock();
    const result = await run(
      'me@other.com',
      client,
      { message: { toRecipients: [recipient('alice@other.com')] } },
      sameDomainPolicy()
    );

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/not in the policy's allowed send domains/i);
    expect(sendCall(graphRequest)).toBeUndefined();
  });

  it('refuses (and never POSTs) when the message has no recipients', async () => {
    const { graphRequest, client } = makeMock();
    const result = await run(
      'me@aretepartners.com',
      client,
      { message: { subject: 'lonely' } },
      sameDomainPolicy()
    );

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text);
    expect(payload.error).toMatch(/no recipients/i);
    expect(sendCall(graphRequest)).toBeUndefined();
  });

  it('falls back to the fail-safe same-domain default when no policy is configured', async () => {
    const internal = makeMock();
    const okResult = await run('me@example.com', internal.client, {
      message: { toRecipients: [recipient('peer@example.com')] },
    });
    expect(okResult.isError).toBeFalsy();
    expect(sendCall(internal.graphRequest)).toBeDefined();

    const external = makeMock();
    const denied = await run('me@example.com', external.client, {
      message: { toRecipients: [recipient('peer@elsewhere.com')] },
    });
    expect(denied.isError).toBe(true);
    expect(sendCall(external.graphRequest)).toBeUndefined();
  });

  it('respects the policy gate: a user without mail-send is denied before the guard runs', async () => {
    const policy = Policy.fromDocument({
      defaults: { allow: [] },
      mailSend: { requireSameDomain: true, allowedDomains: ['aretepartners.com'] },
    });
    const { graphRequest, client } = makeMock();
    const result = await run(
      'me@aretepartners.com',
      client,
      { message: { toRecipients: [recipient('alice@aretepartners.com')] } },
      policy
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Policy denied');
    expect(graphRequest).not.toHaveBeenCalled();
  });
});

describe('policy gating on write tools', () => {
  const writes = ['mail-draft-create', 'mail-message-update', 'calendar-event-create'];

  function makePolicy(extra?: Record<string, { allow?: string[]; deny?: string[] }>) {
    return Policy.fromDocument({
      defaults: { allow: ['identity-get-me'] },
      users: extra,
    });
  }

  function makeMockGraphClient() {
    const graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });
    return { graphRequest, makeRequest: graphRequest } as unknown as GraphClient;
  }

  it('a user not in the policy is denied every write tool', async () => {
    const policy = makePolicy();
    const mockGraphClient = makeMockGraphClient();

    for (const name of writes) {
      const result = await requestContext.run(
        {
          accessToken: 'at',
          userOid: 'oid',
          tenantId: 't',
          userPrincipalName: 'random@example.com',
        },
        () =>
          executeTool(
            findTool(name),
            mockGraphClient,
            // Schema-valid stubs so we exercise the gate, not validation.
            {
              body: {
                subject: 'x',
                start: { dateTime: '2026-05-22T00:00:00', timeZone: 'UTC' },
                end: { dateTime: '2026-05-22T01:00:00', timeZone: 'UTC' },
              },
              'message-id': 'm',
            },
            policy
          )
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Policy denied');
    }
    // No Graph request should have fired for any of them.
    expect(
      (mockGraphClient as unknown as { graphRequest: ReturnType<typeof vi.fn> }).graphRequest
    ).not.toHaveBeenCalled();
  });

  it('a user with an explicit allow entry passes through to the Graph call', async () => {
    const policy = makePolicy({
      'operator@example.com': { allow: writes },
    });
    const mockGraphClient = makeMockGraphClient();

    await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'operator@example.com',
      },
      () =>
        executeTool(
          findTool('mail-draft-create'),
          mockGraphClient,
          { body: { subject: 'allowed' } },
          policy
        )
    );

    expect(
      (mockGraphClient as unknown as { graphRequest: ReturnType<typeof vi.fn> }).graphRequest
    ).toHaveBeenCalledTimes(1);
  });

  it('user.deny wins over user.allow even when defaults would have allowed', async () => {
    const policy = Policy.fromDocument({
      defaults: { allow: ['mail-message-delete'] },
      users: {
        'careful@example.com': {
          allow: ['mail-message-delete'],
          deny: ['mail-message-delete'],
        },
      },
    });
    const mockGraphClient = makeMockGraphClient();

    const result = await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'careful@example.com',
      },
      () =>
        executeTool(findTool('mail-message-delete'), mockGraphClient, { 'message-id': 'm' }, policy)
    );
    expect(result.isError).toBe(true);
    expect(
      (mockGraphClient as unknown as { graphRequest: ReturnType<typeof vi.fn> }).graphRequest
    ).not.toHaveBeenCalled();
  });
});

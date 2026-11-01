import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import type AuthManager from '../src/auth.js';
import type { AppSecrets } from '../src/secrets.js';
import { applyBatchContentType } from '../src/lib/batch-content-type.js';
import { MessageSignoffError } from '../src/lib/message-signoff.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Records what the signoff gate was handed, so the ordering test can prove the
// gate saw the caller's payload and not one this module had already rewritten.
const { signoffBodies } = vi.hoisted(() => ({ signoffBodies: [] as unknown[] }));
vi.mock('../src/lib/message-signoff.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/message-signoff.js')>();
  return {
    ...actual,
    applyMessageSignoffToRequest: (method: string, path: string, body: unknown) => {
      signoffBodies.push(body);
      return actual.applyMessageSignoffToRequest(
        method,
        path,
        body as Parameters<typeof actual.applyMessageSignoffToRequest>[2]
      );
    },
  };
});

/** Run a payload through the filler and parse what would go on the wire. */
function sent(payload: unknown, method = 'POST', path = '/$batch'): any {
  const result = applyBatchContentType(method, path, JSON.stringify(payload));
  return typeof result === 'string' ? JSON.parse(result) : result;
}

/** The filler is a no-op when it returns the very string it was given. */
function untouched(payload: unknown, method = 'POST', path = '/$batch'): boolean {
  const body = JSON.stringify(payload);
  return applyBatchContentType(method, path, body) === body;
}

const JSON_HEADER = { 'Content-Type': 'application/json' };

const createEvent = {
  id: '1',
  method: 'POST',
  url: '/me/events',
  body: { subject: 'Test event' },
};

describe('applyBatchContentType', () => {
  it('adds the header Graph requires on a write sub-request (#677)', () => {
    expect(sent({ requests: [createEvent] }).requests[0]).toEqual({
      ...createEvent,
      headers: JSON_HEADER,
    });
  });

  it('keys on the body rather than a method allowlist', () => {
    const payload = {
      requests: [
        { id: '1', method: 'GET', url: '/me/messages' },
        { id: '2', method: 'patch', url: '/me/events/x', body: { subject: 'a' } },
        { id: '3', method: 'PUT', url: '/me/drive/items/x', body: { name: 'a' } },
      ],
    };
    expect(sent(payload).requests.map((r: any) => r.headers)).toEqual([
      undefined,
      JSON_HEADER,
      JSON_HEADER,
    ]);
  });

  it('leaves GET and DELETE alone even when they carry a body', () => {
    // OData forbids a body on either, so Graph rejects these for the body
    // itself; a header from us would only muddy the error.
    expect(
      untouched({
        requests: [
          { id: '1', method: 'GET', url: '/me/messages', body: { a: 1 } },
          { id: '2', method: 'DELETE', url: '/me/events/x', body: { a: 1 } },
        ],
      })
    ).toBe(true);
  });

  it('leaves every bodyless write for the caller to complete', () => {
    // Graph rejects these too, but inventing body: {} would turn a batch it
    // refuses into one that runs - an empty replyAll actually sends.
    expect(
      untouched({
        requests: [
          { id: '1', method: 'POST', url: '/me/messages/abc/replyAll' },
          { id: '2', method: 'POST', url: '/me/events/x/accept', body: null },
          { id: '3', method: 'PATCH', url: '/me/events/x' },
          { id: '4', method: 'PUT', url: '/me/drive/items/x/content' },
        ],
      })
    ).toBe(true);
  });

  it('keeps a Content-Type the caller set, at any casing', () => {
    const headers = { 'content-type': 'application/octet-stream' };
    const payload = { requests: [{ ...createEvent, headers }] };
    expect(sent(payload).requests[0].headers).toEqual(headers);
  });

  it('merges into the sub-request headers instead of replacing them', () => {
    const payload = { requests: [{ ...createEvent, headers: { Prefer: 'respond-async' } }] };
    expect(sent(payload).requests[0].headers).toEqual({
      Prefer: 'respond-async',
      ...JSON_HEADER,
    });
  });

  it('extends a differently cased headers key rather than adding a second one', () => {
    // Graph matches these names case-insensitively, so a lowercase key beside
    // the caller's own could take precedence and drop their If-Match.
    const payload = {
      requests: [{ ...createEvent, Headers: { 'If-Match': 'W/"1"' } }],
    };
    const wire = sent(payload).requests[0];
    expect(wire.Headers).toEqual({ 'If-Match': 'W/"1"', ...JSON_HEADER });
    expect(wire.headers).toBeUndefined();
  });

  it('will not choose between two headers keys', () => {
    expect(
      untouched({ requests: [{ ...createEvent, headers: {}, Headers: { 'If-Match': 'W/"1"' } }] })
    ).toBe(true);
  });

  it('leaves a non-object body to the caller, who has to name its type', () => {
    // base64 and text/* both arrive as strings; only the caller knows which.
    expect(untouched({ requests: [{ ...createEvent, body: 'SGVsbG8=' }] })).toBe(true);
  });

  it('will not guess a missing method', () => {
    expect(untouched({ requests: [{ id: '1', url: '/me/events', body: { subject: 'x' } }] })).toBe(
      true
    );
    expect(
      untouched({ requests: [{ id: '1', method: 7, url: '/me/events', body: { subject: 'x' } }] })
    ).toBe(true);
  });

  it('passes the body through byte for byte when nothing needs filling in', () => {
    expect(untouched({ requests: [{ id: '1', method: 'GET', url: '/me' }] })).toBe(true);
    expect(untouched({ requests: [{ ...createEvent, headers: JSON_HEADER }] })).toBe(true);
  });

  it('only touches $batch', () => {
    const body = JSON.stringify({ requests: [createEvent] });
    expect(applyBatchContentType('POST', '/me/events', body)).toBe(body);
    expect(applyBatchContentType('GET', '/$batch', body)).toBe(body);
  });

  it('matches $batch with a version prefix, query string or trailing slash', () => {
    const payload = { requests: [createEvent] };
    expect(sent(payload, 'POST', '/beta/$batch').requests[0].headers).toEqual(JSON_HEADER);
    expect(sent(payload, 'post', '/$batch?foo=bar').requests[0].headers).toEqual(JSON_HEADER);
    // The signoff gate normalizes this one too; both must see the same path.
    expect(sent(payload, 'POST', '/$batch/').requests[0].headers).toEqual(JSON_HEADER);
  });

  it('passes anything that is not a JSON batch payload straight through', () => {
    const binary = Buffer.from('not json');
    expect(applyBatchContentType('POST', '/$batch', binary)).toBe(binary);
    expect(applyBatchContentType('POST', '/$batch', undefined)).toBeUndefined();
    expect(applyBatchContentType('POST', '/$batch', '{ not json')).toBe('{ not json');
    expect(untouched({ foo: 'bar' })).toBe(true);
    expect(untouched({ requests: [null, 'x', { id: '1' }] })).toBe(true);
  });

  it('leaves headers it cannot extend for Graph to reject', () => {
    expect(untouched({ requests: [{ ...createEvent, headers: 'application/json' }] })).toBe(true);
  });

  it('does not recurse into a nested $batch, which OData forbids outright', () => {
    const inner = { requests: [{ id: 'a', method: 'POST', url: '/me/events', body: { x: 1 } }] };
    const payload = { requests: [{ id: '1', method: 'POST', url: '/$batch', body: inner }] };
    // The outer sub-request gets its own header; the unreachable inner one does not.
    const wire = sent(payload).requests[0];
    expect(wire.headers).toEqual(JSON_HEADER);
    expect(wire.body).toEqual(inner);
  });
});

// End-to-end through a real GraphClient with fetch mocked: prove the filler sits
// on the wire path itself, so any route to /$batch gets it.
describe('batch Content-Type at the Graph request layer', () => {
  let client: GraphClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signoffBodies.length = 0;
    const authManager = { getToken: vi.fn().mockResolvedValue('test-token') };
    const secrets = { clientId: 'id', tenantId: 'common', cloudType: 'global' };
    client = new GraphClient(
      authManager as unknown as AuthManager,
      secrets as unknown as AppSecrets
    );
    fetchMock = vi.fn().mockResolvedValue(
      new Response('{"responses":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fills the header in on the way out', async () => {
    await client.makeRequest('/$batch', {
      method: 'POST',
      body: JSON.stringify({ requests: [createEvent] }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const wireBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(wireBody.requests[0].headers).toEqual(JSON_HEADER);
  });

  it('runs after the signoff gate, which sees the caller’s own payload', async () => {
    const callerBody = JSON.stringify({ requests: [createEvent] });
    await client.makeRequest('/$batch', { method: 'POST', body: callerBody });
    // Not merely "the gate was called": the exact string the caller sent, which
    // is only true if nothing rewrote it first.
    expect(signoffBodies).toEqual([callerBody]);
  });

  it('does not mask a signoff the gate refuses to apply', async () => {
    vi.stubEnv('MS365_MCP_MESSAGE_SIGNOFF_PREFIX', '\u{1F916}');
    await expect(
      client.makeRequest('/$batch', {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ id: '1', method: 'POST', url: '/chats/x/messages' }],
        }),
      })
    ).rejects.toThrow(MessageSignoffError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

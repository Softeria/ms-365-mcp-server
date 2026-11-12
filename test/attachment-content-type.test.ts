import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Writable } from 'node:stream';
import { OutgoingMessage } from 'node:http';
import { UTILITY_TOOLS } from '../src/graph-tools.js';
import { requestContext } from '../src/request-context.js';
import { AttachmentTicketStore, TICKET_PARAM } from '../src/lib/attachment-tickets.js';
import {
  configureAttachmentMinting,
  resetAttachmentMinting,
} from '../src/lib/attachment-minting.js';
import { createAttachmentHandler } from '../src/attachment-route.js';
import { GraphApiError } from '../src/graph-client.js';

/**
 * Graph answers a mail attachment's /$value with application/octet-stream, so the signed
 * download URL served no real type or filename. get-download-url reads both from the
 * attachment's metadata when it mints, and the route serves them when Graph's answer is generic.
 */
describe('signed attachment download keeps the attachment content type and name', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'get-download-url')!;
  const MAIL = '/me/messages/AAA/attachments/BBB/$value';
  const META = '/me/messages/AAA/attachments/BBB?$select=name,contentType,size';
  const authManager = {
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
    getToken: async () => 'SERVER_TOKEN',
    getTokenForAccount: async () => 'SERVER_TOKEN',
  };
  let store: AttachmentTicketStore;

  beforeEach(() => {
    store = new AttachmentTicketStore(120);
    configureAttachmentMinting({
      store,
      config: { base: 'http://m365:3000', key: 'k', keyId: '1', ttlSeconds: 120 },
    });
  });
  afterEach(() => resetAttachmentMinting());

  /**
   * Mint through the tool with a stub metadata answer, or a stub error when meta is one.
   * callerToken runs it with the identity from the request, as in OAuth, bearer or OBO mode.
   */
  async function mint(
    meta: unknown,
    target = MAIL,
    {
      callerToken,
      auth = authManager,
      account,
    }: { callerToken?: string; auth?: object; account?: string } = {}
  ) {
    const makeRequest = vi.fn(async () => {
      if (meta instanceof Error) throw meta;
      return meta;
    });
    const run = () =>
      tool.execute({ target, ...(account && { account }) }, {
        graphClient: { makeRequest } as never,
        authManager: auth as never,
        multiAccount: false,
        accountNames: [],
      } as never);
    const result = callerToken
      ? await requestContext.run({ accessToken: callerToken } as never, run)
      : await run();
    return { result, reply: JSON.parse(result.content[0].text), makeRequest };
  }

  /** Mint, then redeem against a stub stream. */
  async function roundTrip(
    meta: unknown,
    stream: { contentType: string; contentDisposition: string | null },
    target = MAIL
  ) {
    const { reply, makeRequest } = await mint(meta, target);
    const id = new URL(reply.downloadUrl).searchParams.get(TICKET_PARAM)!;

    const headers: Record<string, string> = {};
    const res = new Writable({ write: (_c, _e, cb) => cb() }) as Writable & Record<string, unknown>;
    res.status = () => res;
    res.type = () => res;
    res.send = () => res;
    // A real OutgoingMessage rejects characters Node refuses in a header value.
    res.setHeader = (k: string, v: string) => {
      new OutgoingMessage().setHeader(k, v);
      headers[k.toLowerCase()] = v;
    };
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () =>
        ({
          downloadStream: async () => ({
            body: new ReadableStream({
              start(c) {
                c.enqueue(new Uint8Array([1]));
                c.close();
              },
            }),
            contentLength: 1,
            ...stream,
          }),
        }) as never,
      authManager: authManager as never,
    });
    await handler({ method: 'GET', query: { t: id } } as never, res as never, (() => {}) as never);
    return { headers, makeRequest, reply };
  }

  const GENERIC = { contentType: 'application/octet-stream', contentDisposition: null };

  it('serves the attachment type and name when Graph answers application/octet-stream', async () => {
    const { headers, makeRequest } = await roundTrip(
      { name: 'report.pdf', contentType: 'application/pdf' },
      GENERIC
    );
    expect(makeRequest).toHaveBeenCalledWith(META, { accessToken: 'SERVER_TOKEN' });
    expect(headers['content-type']).toBe('application/pdf');
    expect(headers['content-disposition']).toBe('attachment; filename="report.pdf"');
  });

  it('probes with the request token when identity comes from the request', async () => {
    const makeRequest = vi.fn(async () => ({ name: 'a.pdf', contentType: 'application/pdf' }));
    await requestContext.run({ accessToken: 'CALLER_TOKEN' } as never, () =>
      tool.execute({ target: MAIL }, {
        graphClient: { makeRequest } as never,
        authManager: authManager as never,
        multiAccount: false,
        accountNames: [],
      } as never)
    );
    expect(makeRequest).toHaveBeenCalledWith(META, { accessToken: 'CALLER_TOKEN' });
  });

  it("keeps Graph's own type and disposition when it sent them", async () => {
    const { headers } = await roundTrip(
      { name: 'other.pdf', contentType: 'application/pdf' },
      { contentType: 'text/plain', contentDisposition: 'attachment; filename="graph.txt"' }
    );
    expect(headers['content-type']).toBe('text/plain');
    expect(headers['content-disposition']).toBe('attachment; filename="graph.txt"');
  });

  it('adds an RFC 5987 filename* for a name Node would refuse in a header', async () => {
    const { headers } = await roundTrip(
      { name: 'отчёт.pdf', contentType: 'application/pdf' },
      GENERIC
    );
    expect(headers['content-disposition']).toBe(
      `attachment; filename="attachment.pdf"; filename*=UTF-8''${encodeURIComponent('отчёт.pdf')}`
    );
  });

  it('strips quote-breaking characters from the plain filename', async () => {
    const { headers } = await roundTrip(
      { name: 'a"b\\c.pdf', contentType: 'application/pdf' },
      GENERIC
    );
    expect(headers['content-disposition']).toBe('attachment; filename="abc.pdf"');
  });

  it('ignores a probed type that cannot be sent as a header', async () => {
    const { headers } = await roundTrip({ name: 'a.bin', contentType: 'text/плain' }, GENERIC);
    expect(headers['content-type']).toBe('application/octet-stream');
  });

  it('returns the name, size and type next to the URL', async () => {
    const { reply } = await mint({
      name: 'report.pdf',
      contentType: 'application/pdf',
      size: 52344,
    });
    expect(reply.downloadUrl).toMatch(/^http:\/\/m365:3000\//);
    expect(reply).toMatchObject({
      name: 'report.pdf',
      size: 52344,
      contentType: 'application/pdf',
    });
  });

  // Throttling or an outage can be over by the time the URL is fetched, and here the
  // redemption gets a fresh token for the account, so even a 401 can pass by then.
  it.each([
    ['a 401', new GraphApiError('Microsoft Graph API error: 401 Unauthorized', 401)],
    ['a 429', new GraphApiError('Microsoft Graph API error: 429 Too Many Requests', 429)],
    ['a 503', new GraphApiError('Microsoft Graph API error: 503 Service Unavailable', 503)],
    ['an error not from Graph', new Error('No access token available')],
  ])('falls back to the old behaviour when the metadata call fails with %s', async (_, error) => {
    const { headers, reply } = await roundTrip(error, GENERIC);
    expect(reply).toHaveProperty('downloadUrl');
    expect(headers['content-type']).toBe('application/octet-stream');
    expect(headers['content-disposition']).toBe('attachment');
  });

  it('falls back when Graph reports no usable name, type or size', async () => {
    const { headers, reply } = await roundTrip(
      { name: null, contentType: null, size: '52344' },
      GENERIC
    );
    expect(headers['content-type']).toBe('application/octet-stream');
    expect(headers['content-disposition']).toBe('attachment');
    expect(reply).not.toHaveProperty('name');
    expect(reply).not.toHaveProperty('size');
    expect(reply).not.toHaveProperty('contentType');
  });

  it('skips the check when there is no token for the account, rather than ask as another', async () => {
    const { reply, makeRequest } = await mint({ name: 'wrong.pdf' }, MAIL, {
      auth: {
        ...authManager,
        getTokenForAccount: async () => {
          throw new Error("No cached account matches 'other@example.com'");
        },
      },
      account: 'other@example.com',
    });
    expect(makeRequest).not.toHaveBeenCalled();
    expect(reply).toHaveProperty('downloadUrl');
    expect(reply).not.toHaveProperty('name');
    expect(store.size()).toBe(1);
  });

  describe('refuses to mint when Graph says the attachment cannot be read (#830)', () => {
    it.each([
      [400, 'ErrorInvalidIdMalformed'],
      [404, 'ErrorItemNotFound'],
    ])('a %i (%s) points the caller at the ids', async (status, code) => {
      const { result, reply } = await mint(
        new GraphApiError(
          `Microsoft Graph API error: ${status} - {"error":{"code":"${code}"}}`,
          status,
          code
        )
      );
      expect(result.isError).toBe(true);
      expect(reply.error).toMatch(/^No download URL was made: Microsoft Graph API error: /);
      expect(reply.error).toContain('including any trailing "="');
      expect(result._meta).toEqual({ http_status: status, error_code: code });
      expect(store.size()).toBe(0);
    });

    it('a 403 is about access, so it gets no id hint', async () => {
      const { result, reply } = await mint(
        new GraphApiError('Microsoft Graph API error: 403 Forbidden', 403, 'ErrorAccessDenied')
      );
      expect(result.isError).toBe(true);
      expect(reply.error).not.toContain('trailing');
      expect(result._meta).toEqual({ http_status: 403, error_code: 'ErrorAccessDenied' });
      expect(store.size()).toBe(0);
    });

    it.each([['MailboxNotEnabledForRESTAPI'], [undefined]])(
      'a 404 that is not about the ids (%s) gets no id hint',
      async (code) => {
        const { result, reply } = await mint(
          new GraphApiError('Microsoft Graph API error: 404 Not Found', 404, code)
        );
        expect(result.isError).toBe(true);
        expect(reply.error).not.toContain('trailing');
        expect(result._meta).toEqual({ http_status: 404, ...(code && { error_code: code }) });
        expect(store.size()).toBe(0);
      }
    );

    // The ticket would keep this same token, so the redemption would get the same answer.
    it.each([401, 404])('a %i refuses when the ticket keeps the caller token', async (status) => {
      const { result, makeRequest } = await mint(
        new GraphApiError(`Microsoft Graph API error: ${status}`, status),
        MAIL,
        { callerToken: 'CALLER_TOKEN' }
      );
      expect(makeRequest).toHaveBeenCalledWith(META, { accessToken: 'CALLER_TOKEN' });
      expect(result.isError).toBe(true);
      expect(store.size()).toBe(0);
    });

    it('checks an event attachment in another mailbox too', async () => {
      const { result, makeRequest } = await mint(
        new GraphApiError('Microsoft Graph API error: 404 Not Found', 404, 'ErrorItemNotFound'),
        '/users/u/events/AAA/attachments/BBB/$value'
      );
      expect(makeRequest).toHaveBeenCalledWith(
        '/users/u/events/AAA/attachments/BBB?$select=name,contentType,size',
        { accessToken: 'SERVER_TOKEN' }
      );
      expect(result.isError).toBe(true);
      expect(store.size()).toBe(0);
    });
  });

  it('does not probe anything that is not a mail or event attachment', async () => {
    const { makeRequest } = await roundTrip({}, GENERIC, '/me/photo/$value');
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

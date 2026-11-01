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

/**
 * Graph answers a mail attachment's /$value with application/octet-stream, so the signed
 * download URL served no real type or filename. get-download-url reads both from the
 * attachment's metadata when it mints, and the route serves them when Graph's answer is generic.
 */
describe('signed attachment download keeps the attachment content type and name', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'get-download-url')!;
  const MAIL = '/me/messages/AAA/attachments/BBB/$value';
  const META = '/me/messages/AAA/attachments/BBB?$select=name,contentType';
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

  /** Mint through the tool with a stub metadata answer, then redeem against a stub stream. */
  async function roundTrip(
    meta: unknown,
    stream: { contentType: string; contentDisposition: string | null },
    target = MAIL
  ) {
    const makeRequest = vi.fn(async () => {
      if (meta instanceof Error) throw meta;
      return meta;
    });
    const minted = await tool.execute({ target }, {
      graphClient: { makeRequest } as never,
      authManager: authManager as never,
      multiAccount: false,
      accountNames: [],
    } as never);
    const id = new URL(JSON.parse(minted.content[0].text).downloadUrl).searchParams.get(
      TICKET_PARAM
    )!;

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
    return { headers, makeRequest };
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

  it('falls back to the old behaviour when the metadata call fails', async () => {
    const { headers } = await roundTrip(new Error('403'), GENERIC);
    expect(headers['content-type']).toBe('application/octet-stream');
    expect(headers['content-disposition']).toBe('attachment');
  });

  it('falls back when Graph reports no contentType or name', async () => {
    const { headers } = await roundTrip({ name: null, contentType: null }, GENERIC);
    expect(headers['content-type']).toBe('application/octet-stream');
    expect(headers['content-disposition']).toBe('attachment');
  });

  it('does not probe anything that is not a mail or event attachment', async () => {
    const { makeRequest } = await roundTrip({}, GENERIC, '/me/photo/$value');
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Writable } from 'node:stream';
import {
  AttachmentTicketStore,
  TicketStoreFullError,
  buildAttachmentUrl,
  TICKET_PARAM,
} from '../src/lib/attachment-tickets.js';
import {
  loadAttachmentUrlConfig,
  AttachmentUrlConfigError,
} from '../src/lib/attachment-url-config.js';
import { canonicalString, digest } from '../src/lib/url-signing.js';
import { createAttachmentHandler } from '../src/attachment-route.js';

describe('AttachmentTicketStore', () => {
  const NOW = 1_780_000_000_000;

  it('mints an id that is not guessable from the target', () => {
    const store = new AttachmentTicketStore(120);
    const a = store.mint('/me/messages/1/attachments/2/$value', undefined, NOW);
    const b = store.mint('/me/messages/1/attachments/2/$value', undefined, NOW);
    expect(a.id).not.toBe(b.id);
    // 32 bytes of base64url, unpadded.
    expect(a.id).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('redeems once and only once', () => {
    const store = new AttachmentTicketStore(120);
    const { id } = store.mint('/target', 'max@example.com', NOW);
    expect(store.redeem(id, NOW)?.target).toBe('/target');
    expect(store.redeem(id, NOW)).toBeUndefined();
  });

  it('carries the account through to redemption', () => {
    const store = new AttachmentTicketStore(120);
    const { id } = store.mint('/target', 'olga@example.com', NOW);
    expect(store.redeem(id, NOW)?.accountName).toBe('olga@example.com');
  });

  it('refuses a ticket that has expired', () => {
    const store = new AttachmentTicketStore(120);
    const { id } = store.mint('/target', undefined, NOW);
    expect(store.redeem(id, NOW + 119_000)).toBeDefined();

    const { id: second } = store.mint('/target', undefined, NOW);
    expect(store.redeem(second, NOW + 121_000)).toBeUndefined();
  });

  it('treats the expiry instant itself as dead', () => {
    const store = new AttachmentTicketStore(120);
    const { id } = store.mint('/target', undefined, NOW);
    expect(store.redeem(id, NOW + 120_000)).toBeUndefined();
  });

  it('gives the same undefined for unknown, spent and expired', () => {
    const store = new AttachmentTicketStore(120);
    const { id } = store.mint('/target', undefined, NOW);
    store.redeem(id, NOW);
    expect(store.redeem(id, NOW)).toBeUndefined();
    expect(store.redeem('never-existed', NOW)).toBeUndefined();
    expect(store.redeem('', NOW)).toBeUndefined();
  });

  it('sweeps expired tickets rather than letting them accumulate', () => {
    const store = new AttachmentTicketStore(60);
    for (let i = 0; i < 10; i += 1) store.mint(`/t${i}`, undefined, NOW);
    expect(store.size(NOW)).toBe(10);
    expect(store.size(NOW + 61_000)).toBe(0);
  });

  it('refuses to mint past the live-ticket cap instead of growing without bound', () => {
    const store = new AttachmentTicketStore(300);
    for (let i = 0; i < 256; i += 1) store.mint(`/t${i}`, undefined, NOW);
    expect(() => store.mint('/one-too-many', undefined, NOW)).toThrow(TicketStoreFullError);
  });

  it('frees slots once the outstanding tickets expire', () => {
    const store = new AttachmentTicketStore(60);
    for (let i = 0; i < 256; i += 1) store.mint(`/t${i}`, undefined, NOW);
    expect(() => store.mint('/blocked', undefined, NOW)).toThrow(TicketStoreFullError);
    expect(() => store.mint('/ok', undefined, NOW + 61_000)).not.toThrow();
  });

  it('never evicts a live ticket to make room', () => {
    const store = new AttachmentTicketStore(300);
    const first = store.mint('/keep-me', undefined, NOW);
    for (let i = 0; i < 255; i += 1) store.mint(`/t${i}`, undefined, NOW);
    expect(() => store.mint('/overflow', undefined, NOW)).toThrow(TicketStoreFullError);
    // The oldest ticket is still redeemable — a caller minting in a loop must
    // not be able to invalidate someone else's outstanding ticket.
    expect(store.redeem(first.id, NOW)).toBeDefined();
  });
});

describe('buildAttachmentUrl', () => {
  const config = { base: 'http://m365-max-mcp:3000', key: 'k', keyId: '1', ttlSeconds: 120 };

  it('puts the ticket in the query, never the path', () => {
    const url = new URL(buildAttachmentUrl(config, 'TICKET', 1_780_000_000_000));
    expect(url.pathname).toBe('/attachment');
    expect(url.pathname).not.toContain('TICKET');
    expect(url.searchParams.get(TICKET_PARAM)).toBe('TICKET');
  });

  it('mints a signature that verifies over its own canonical string', () => {
    const url = buildAttachmentUrl(config, 'TICKET', 1_780_000_000_000);
    const parsed = new URL(url);
    expect(digest(config.key, canonicalString(url, parsed.searchParams.get('dgx')!))).toBe(
      parsed.searchParams.get('dgs')
    );
  });

  it('honours the configured key id', () => {
    const url = new URL(
      buildAttachmentUrl({ ...config, keyId: 'rotated' }, 'T', 1_780_000_000_000)
    );
    expect(url.searchParams.get('dgk')).toBe('rotated');
  });
});

describe('loadAttachmentUrlConfig', () => {
  const good = {
    MS365_MCP_ATTACHMENT_URL_BASE: 'http://m365-max-mcp:3000',
    MS365_MCP_ATTACHMENT_URL_KEY: 'secret',
  } as Record<string, string | undefined>;

  it('returns null when the feature is off, whatever the environment says', () => {
    expect(loadAttachmentUrlConfig(false, good)).toBeNull();
  });

  it('applies the documented defaults', () => {
    const config = loadAttachmentUrlConfig(true, good)!;
    expect(config.keyId).toBe('1');
    expect(config.ttlSeconds).toBe(120);
    expect(config.base).toBe('http://m365-max-mcp:3000');
  });

  it('refuses to start without a base', () => {
    expect(() => loadAttachmentUrlConfig(true, { MS365_MCP_ATTACHMENT_URL_KEY: 'k' })).toThrow(
      AttachmentUrlConfigError
    );
  });

  it('refuses to start without a key', () => {
    expect(() =>
      loadAttachmentUrlConfig(true, { MS365_MCP_ATTACHMENT_URL_BASE: 'http://h:3000' })
    ).toThrow(AttachmentUrlConfigError);
  });

  it('refuses a base carrying a query string', () => {
    expect(() =>
      loadAttachmentUrlConfig(true, {
        ...good,
        MS365_MCP_ATTACHMENT_URL_BASE: 'http://h:3000/?a=1',
      })
    ).toThrow(AttachmentUrlConfigError);
  });

  it('refuses a non-http scheme', () => {
    expect(() =>
      loadAttachmentUrlConfig(true, { ...good, MS365_MCP_ATTACHMENT_URL_BASE: 'ftp://h:3000' })
    ).toThrow(AttachmentUrlConfigError);
  });

  it('refuses a control character in the key without echoing it', () => {
    try {
      loadAttachmentUrlConfig(true, { ...good, MS365_MCP_ATTACHMENT_URL_KEY: 'ab\ncd' });
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as Error).message).toContain('offset 2');
      expect((error as Error).message).not.toContain('ab');
    }
  });

  it('refuses a non-numeric TTL rather than silently defaulting', () => {
    expect(() =>
      loadAttachmentUrlConfig(true, { ...good, MS365_MCP_ATTACHMENT_URL_TTL_S: '12abc' })
    ).toThrow(AttachmentUrlConfigError);
  });

  it('refuses a TTL of zero or beyond the ceiling', () => {
    expect(() =>
      loadAttachmentUrlConfig(true, { ...good, MS365_MCP_ATTACHMENT_URL_TTL_S: '0' })
    ).toThrow(AttachmentUrlConfigError);
    expect(() =>
      loadAttachmentUrlConfig(true, { ...good, MS365_MCP_ATTACHMENT_URL_TTL_S: '3601' })
    ).toThrow(AttachmentUrlConfigError);
  });
});

describe('attachment redemption route', () => {
  let store: AttachmentTicketStore;
  let sent: { status?: number; body?: unknown; headers: Record<string, string> };
  let written: Buffer[];

  /**
   * A real `Writable`, not a bag of spies: the handler finishes by awaiting
   * `stream.pipeline(..., res)`, which resolves only on a genuine 'finish'.
   * A mock that merely records `write` calls leaves that promise pending and
   * the test times out rather than failing usefully.
   */
  function mockRes() {
    const res = new Writable({
      write(chunk: Buffer, _enc, cb) {
        written.push(Buffer.from(chunk));
        cb();
      },
    }) as Writable & Record<string, unknown>;
    res.status = (code: number) => {
      sent.status = code;
      return res;
    };
    res.type = () => res;
    res.send = (body: unknown) => {
      sent.body = body;
      return res;
    };
    res.setHeader = (name: string, value: string) => {
      sent.headers[name] = value;
    };
    return res;
  }

  const authManager = { isOAuthModeEnabled: () => false, getTokenForAccount: async () => 'tok' };

  beforeEach(() => {
    store = new AttachmentTicketStore(120);
    sent = { headers: {} };
    written = [];
  });

  it('404s a missing ticket parameter', async () => {
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () => ({}) as never,
      authManager: authManager as never,
    });
    await handler({ query: {} } as never, mockRes() as never, (() => {}) as never);
    expect(sent.status).toBe(404);
  });

  it('404s a repeated ticket parameter rather than picking one', async () => {
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () => ({}) as never,
      authManager: authManager as never,
    });
    const { id } = store.mint('/target', undefined);
    await handler(
      { query: { t: [id, 'guess'] } } as never,
      mockRes() as never,
      (() => {}) as never
    );
    expect(sent.status).toBe(404);
    // and the real ticket must survive an attempt that was refused
    expect(store.redeem(id)).toBeDefined();
  });

  it('404s an unknown ticket with the same body as a spent one', async () => {
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () => ({}) as never,
      authManager: authManager as never,
    });
    await handler({ query: { t: 'nope' } } as never, mockRes() as never, (() => {}) as never);
    const unknown = { ...sent };

    const { id } = store.mint('/target', undefined);
    store.redeem(id);
    sent = { headers: {} };
    written = [];
    await handler({ query: { t: id } } as never, mockRes() as never, (() => {}) as never);

    expect(sent.status).toBe(unknown.status);
    expect(sent.body).toBe(unknown.body);
  });

  it('streams the Graph body and burns the ticket', async () => {
    const downloadStream = vi.fn(async () => ({
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      contentType: 'application/pdf',
      contentLength: 3,
      contentDisposition: 'attachment; filename="q.pdf"',
    }));
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () => ({ downloadStream }) as never,
      authManager: authManager as never,
    });
    const { id } = store.mint('/me/messages/1/attachments/2/$value', 'max@example.com');

    await handler({ query: { t: id } } as never, mockRes() as never, (() => {}) as never);

    expect(downloadStream).toHaveBeenCalledWith('/me/messages/1/attachments/2/$value', {
      accessToken: 'tok',
    });
    expect(sent.status).toBe(200);
    expect(sent.headers['content-type']).toBe('application/pdf');
    expect(sent.headers['content-disposition']).toBe('attachment; filename="q.pdf"');
    expect(sent.headers['x-content-type-options']).toBe('nosniff');
    expect(sent.headers['cache-control']).toBe('no-store');
    expect(Buffer.concat(written)).toEqual(Buffer.from([1, 2, 3]));
    expect(store.redeem(id)).toBeUndefined();
  });

  it('forces a download disposition when Graph supplies none', async () => {
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () =>
        ({
          downloadStream: async () => ({
            body: new ReadableStream({
              start(c) {
                c.close();
              },
            }),
            contentType: 'text/html',
            contentLength: null,
            contentDisposition: null,
          }),
        }) as never,
      authManager: authManager as never,
    });
    const { id } = store.mint('/t', undefined);
    await handler({ query: { t: id } } as never, mockRes() as never, (() => {}) as never);
    expect(sent.headers['content-disposition']).toBe('attachment');
    expect(sent.headers['content-length']).toBeUndefined();
  });

  it('502s an upstream failure without resurrecting the ticket', async () => {
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () =>
        ({
          downloadStream: async () => {
            throw new Error('Microsoft Graph API error: 404');
          },
        }) as never,
      authManager: authManager as never,
    });
    const { id } = store.mint('/gone', undefined);
    await handler({ query: { t: id } } as never, mockRes() as never, (() => {}) as never);
    expect(sent.status).toBe(502);
    expect(store.redeem(id)).toBeUndefined();
  });
});

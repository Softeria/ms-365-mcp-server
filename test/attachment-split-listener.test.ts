/**
 * `--attachment-port`: the attachment route on a listener of its own.
 *
 * The deployment this exists for runs `--trust-proxy-auth`, where `/mcp` reads
 * no Authorization header at all and **network reachability is the whole of the
 * authentication**. A document-conversion sidecar has to reach `/attachment` to
 * do its job; on one shared listener, reaching `/attachment` also means reaching
 * every tool the server exposes. `--attachment-port` puts the route on a second
 * Express app so a network policy can grant one without the other.
 *
 * These tests drive the real `MicrosoftGraphServer.start()` over real TCP rather
 * than rebuilding a lookalike app, because the claim under test is about what
 * `start()` mounts where, and a replica would pass whatever `start()` actually
 * did. Two of them are deliberately not "route responds" checks:
 *
 *  - the main-port case asserts the ticket is **still redeemable afterwards**.
 *    A 404 alone would also be produced by a route that ran, refused, and burnt
 *    the ticket on the way; an unburnt ticket proves the handler was never
 *    reached, which is the actual isolation property.
 *  - the attachment-port case sweeps `/mcp`, `/token`, `/`, and the OAuth
 *    discovery documents, so "the second app has nothing else on it" is checked
 *    as a property of the app rather than assumed from the one path we thought
 *    to name.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import MicrosoftGraphServer, { parseAttachmentPortOption } from '../src/server.js';
import GraphClient from '../src/graph-client.js';
import type AuthManager from '../src/auth.js';
import { getAttachmentMinting, resetAttachmentMinting } from '../src/lib/attachment-minting.js';
import type { CommandOptions } from '../src/cli.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  },
  enableConsoleLogging: vi.fn(),
}));

// stdio mode connects a transport to the real process streams, which would
// outlive the test. The stdio cases here are about a startup warning that fires
// well before the transport, so a transport that does nothing is enough.
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    onerror?: (error: Error) => void;
    async start(): Promise<void> {}
    async close(): Promise<void> {}
    async send(): Promise<void> {}
  },
}));

import logger from '../src/logger.js';

const MAIL_ATTACHMENT = '/me/messages/AAA/attachments/BBB/$value';
const ATTACHMENT_BODY = 'PDFBYTES';

/**
 * Two ports nothing is listening on.
 *
 * Bound simultaneously and then released, so the two are guaranteed distinct
 * (asking the kernel twice in sequence can hand back the same number). There is
 * a window between release and re-bind in which something else could take one;
 * on a test host that is not a real risk, and the alternative -- fixed port
 * numbers -- has a much larger one.
 */
async function reserveFreePorts(count: number): Promise<number[]> {
  const holders = await Promise.all(
    Array.from(
      { length: count },
      () =>
        new Promise<Server>((resolve) => {
          const s = createServer();
          s.listen(0, '127.0.0.1', () => resolve(s));
        })
    )
  );
  const ports = holders.map((s) => (s.address() as AddressInfo).port);
  await Promise.all(holders.map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
  return ports;
}

function fakeAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
    listAccounts: async () => [],
    getToken: async () => 'SERVER_OWN_TOKEN',
    getTokenForAccount: async () => 'SERVER_OWN_TOKEN',
    setOAuthToken: async () => {},
  } as unknown as AuthManager;
}

describe('--attachment-port (split attachment listener)', () => {
  const savedEnv = { ...process.env };
  let started: MicrosoftGraphServer[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MS365_MCP_RATE_LIMIT_DISABLED;
    delete process.env.MS365_MCP_ATTACHMENT_PORT;
    delete process.env.MS365_MCP_ATTACHMENT_URL_KEY_FILE;
    process.env.MS365_MCP_ATTACHMENT_URL_KEY = 'shared-hmac-key';
    // Graph is never dialled; every case either redeems a ticket against this
    // stub or never gets as far as the handler.
    vi.spyOn(GraphClient.prototype, 'downloadStream').mockImplementation(async () => ({
      // A fresh stream per call: a ReadableStream is consumable once, and two
      // of these tests redeem twice.
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ATTACHMENT_BODY));
          controller.close();
        },
      }) as never,
      contentType: 'application/pdf',
      contentLength: ATTACHMENT_BODY.length,
      contentDisposition: 'attachment; filename="report.pdf"',
    }));
  });

  afterEach(async () => {
    for (const server of started) await server.stop();
    started = [];
    resetAttachmentMinting();
    vi.restoreAllMocks();
    process.env = { ...savedEnv };
  });

  async function start(options: CommandOptions): Promise<MicrosoftGraphServer> {
    const server = new MicrosoftGraphServer(fakeAuthManager(), options);
    await server.initialize('0.0.0-test');
    started.push(server);
    await server.start();
    return server;
  }

  /** Mint a ticket on the store the running server built for itself. */
  function mintTicket(): string {
    const minting = getAttachmentMinting();
    expect(minting).not.toBeNull();
    return minting!.store.mint(MAIL_ATTACHMENT, undefined).id;
  }

  describe('with the flag: two listeners, two surfaces', () => {
    let mcpPort: number;
    let attachmentPort: number;

    beforeEach(async () => {
      [mcpPort, attachmentPort] = await reserveFreePorts(2);
      process.env.MS365_MCP_ATTACHMENT_URL_BASE = `http://127.0.0.1:${attachmentPort}`;
      await start({
        http: `127.0.0.1:${mcpPort}`,
        trustProxyAuth: true,
        enableAttachmentUrls: true,
        attachmentPort: String(attachmentPort),
      });
    });

    it('serves the attachment route on the dedicated port', async () => {
      const ticket = mintTicket();
      const response = await fetch(
        `http://127.0.0.1:${attachmentPort}/attachment?t=${encodeURIComponent(ticket)}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toBe('attachment; filename="report.pdf"');
      expect(await response.text()).toBe(ATTACHMENT_BODY);
    });

    it('404s the attachment route on the MCP port, without consuming the ticket', async () => {
      const ticket = mintTicket();
      const store = getAttachmentMinting()!.store;
      expect(store.size()).toBe(1);

      const response = await fetch(
        `http://127.0.0.1:${mcpPort}/attachment?t=${encodeURIComponent(ticket)}`
      );
      expect(response.status).toBe(404);
      // Not the handler's own refusal body. If this ever reads 'Not found', the
      // route is mounted on the MCP app again and the split is cosmetic.
      expect(await response.text()).not.toBe('Not found');

      // The decisive part: the handler never ran, so the capability is intact.
      expect(store.size()).toBe(1);
      const redeemed = await fetch(
        `http://127.0.0.1:${attachmentPort}/attachment?t=${encodeURIComponent(ticket)}`
      );
      expect(redeemed.status).toBe(200);
      expect(await redeemed.text()).toBe(ATTACHMENT_BODY);
    });

    it('404s /mcp on the attachment port, for GET and POST alike', async () => {
      const get = await fetch(`http://127.0.0.1:${attachmentPort}/mcp`);
      expect(get.status).toBe(404);

      const post = await fetch(`http://127.0.0.1:${attachmentPort}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      // 404, not 401: a 401 would mean the MCP auth middleware is mounted here
      // and only the credential is missing. Nothing MCP is mounted here at all.
      expect(post.status).toBe(404);
      expect(await post.text()).not.toContain('jsonrpc');
    });

    it('serves nothing but the attachment route on the attachment port', async () => {
      const paths = [
        '/',
        '/token',
        '/authorize',
        '/register',
        '/.well-known/oauth-authorization-server',
        '/.well-known/oauth-protected-resource',
      ];
      for (const path of paths) {
        const response = await fetch(`http://127.0.0.1:${attachmentPort}${path}`);
        expect(`${path} -> ${response.status}`).toBe(`${path} -> 404`);
      }
      // ...while the MCP app kept all of it.
      expect((await fetch(`http://127.0.0.1:${mcpPort}/`)).status).toBe(200);
      expect(
        (await fetch(`http://127.0.0.1:${mcpPort}/.well-known/oauth-authorization-server`)).status
      ).toBe(200);
    });

    it('carries the route’s rate limiter onto the dedicated listener', async () => {
      // 60/min, as mounted in server.ts. Unticketed requests are the cheapest
      // way to spend the budget; each is a 404 from the handler itself, which
      // is also a second confirmation the handler is the thing answering.
      const url = `http://127.0.0.1:${attachmentPort}/attachment`;
      for (let i = 0; i < 60; i++) {
        const response = await fetch(url);
        expect(`request ${i} -> ${response.status}`).toBe(`request ${i} -> 404`);
      }
      const limited = await fetch(url);
      expect(limited.status).toBe(429);
      expect(limited.headers.get('ratelimit-policy')).toMatch(/60;w=60/);
    });

    it('answers with the handler’s own refusal, not Express’s, for a bad ticket', async () => {
      const response = await fetch(`http://127.0.0.1:${attachmentPort}/attachment?t=nonsense`);
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toMatch(/text\/plain/);
      expect(await response.text()).toBe('Not found');
    });
  });

  describe('without the flag: unchanged single-listener behaviour', () => {
    it('keeps the attachment route on the MCP port and opens no second listener', async () => {
      const [mcpPort, unusedPort] = await reserveFreePorts(2);
      process.env.MS365_MCP_ATTACHMENT_URL_BASE = `http://127.0.0.1:${mcpPort}`;
      await start({
        http: `127.0.0.1:${mcpPort}`,
        trustProxyAuth: true,
        enableAttachmentUrls: true,
      });

      const ticket = mintTicket();
      const response = await fetch(
        `http://127.0.0.1:${mcpPort}/attachment?t=${encodeURIComponent(ticket)}`
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(ATTACHMENT_BODY);

      // The port that would have been the split one is not bound: still
      // connection-refused rather than answering anything.
      await expect(fetch(`http://127.0.0.1:${unusedPort}/attachment`)).rejects.toThrow();
    });

    it('still mounts no attachment route when the feature itself is off', async () => {
      const [mcpPort] = await reserveFreePorts(1);
      delete process.env.MS365_MCP_ATTACHMENT_URL_BASE;
      await start({ http: `127.0.0.1:${mcpPort}`, trustProxyAuth: true });

      expect(getAttachmentMinting()).toBeNull();
      const response = await fetch(`http://127.0.0.1:${mcpPort}/attachment`);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toBe('Not found');
    });
  });

  describe('startup validation', () => {
    it('refuses to start when --attachment-port is given without --enable-attachment-urls', async () => {
      const [mcpPort, attachmentPort] = await reserveFreePorts(2);
      process.env.MS365_MCP_ATTACHMENT_URL_BASE = `http://127.0.0.1:${attachmentPort}`;

      await expect(
        start({
          http: `127.0.0.1:${mcpPort}`,
          trustProxyAuth: true,
          attachmentPort: String(attachmentPort),
        })
      ).rejects.toThrow(/--attachment-port requires --enable-attachment-urls/);

      // It refused before binding anything, so neither port is live.
      await expect(fetch(`http://127.0.0.1:${mcpPort}/`)).rejects.toThrow();
      await expect(fetch(`http://127.0.0.1:${attachmentPort}/attachment`)).rejects.toThrow();
    });

    it('warns and ignores --attachment-port in stdio mode', async () => {
      await start({ enableAttachmentUrls: true, attachmentPort: '3001' });

      const warnings = vi.mocked(logger.warn).mock.calls.map(([message]) => String(message));
      expect(warnings.some((w) => /--attachment-port has no effect in stdio mode/.test(w))).toBe(
        true
      );
      // The flag it depends on keeps its own warning; neither swallows the other.
      expect(
        warnings.some((w) => /--enable-attachment-urls has no effect in stdio mode/.test(w))
      ).toBe(true);
    });

    it('refuses --attachment-port in stdio mode too when the feature flag is missing', async () => {
      // The dependency is a mis-configuration in every mode, so it is not
      // downgraded to the stdio warning. An operator who typed only this flag
      // believes the surfaces are separated; they are not.
      await expect(start({ attachmentPort: '3001' })).rejects.toThrow(
        /--attachment-port requires --enable-attachment-urls/
      );
    });
  });

  describe('shutdown', () => {
    it('closes both listeners', async () => {
      const [mcpPort, attachmentPort] = await reserveFreePorts(2);
      process.env.MS365_MCP_ATTACHMENT_URL_BASE = `http://127.0.0.1:${attachmentPort}`;
      const server = await start({
        http: `127.0.0.1:${mcpPort}`,
        trustProxyAuth: true,
        enableAttachmentUrls: true,
        attachmentPort: String(attachmentPort),
      });

      expect((await fetch(`http://127.0.0.1:${mcpPort}/`)).status).toBe(200);
      expect((await fetch(`http://127.0.0.1:${attachmentPort}/attachment`)).status).toBe(404);

      await server.stop();

      // Both refuse connections. A listener that were merely `close()`d while a
      // keep-alive socket stayed open would still be accepting here -- and would
      // hold the event loop open for the life of the process.
      await expect(fetch(`http://127.0.0.1:${mcpPort}/`)).rejects.toThrow();
      await expect(fetch(`http://127.0.0.1:${attachmentPort}/attachment`)).rejects.toThrow();

      // Minting is off too: there is no longer any listener to redeem on.
      expect(getAttachmentMinting()).toBeNull();
    });

    it('is safe to call twice', async () => {
      const [mcpPort, attachmentPort] = await reserveFreePorts(2);
      process.env.MS365_MCP_ATTACHMENT_URL_BASE = `http://127.0.0.1:${attachmentPort}`;
      const server = await start({
        http: `127.0.0.1:${mcpPort}`,
        trustProxyAuth: true,
        enableAttachmentUrls: true,
        attachmentPort: String(attachmentPort),
      });

      await server.stop();
      await expect(server.stop()).resolves.toBeUndefined();
    });

    it('closes the MCP listener when the attachment bind fails', async () => {
      // A half-open split is not a degraded mode: the route is missing while
      // the operator's network policy already assumes it moved. Starting must
      // fail, and it must not leave the first listener behind.
      //
      // This is also the cover for an Express footgun that cost real time to
      // find. Express 5 registers the callback you hand `app.listen` as the
      // server's `error` handler too, so a failed bind *calls* it, with an
      // Error argument. A callback that ignores its argument -- the shape this
      // code had, and the shape of every example -- reports success. Written
      // that way, this test sees a resolved start() and two live ports.
      const [mcpPort, takenPort] = await reserveFreePorts(2);
      const squatter = await new Promise<Server>((resolve) => {
        const s = createServer();
        s.listen(takenPort, '127.0.0.1', () => resolve(s));
      });
      process.env.MS365_MCP_ATTACHMENT_URL_BASE = `http://127.0.0.1:${takenPort}`;

      try {
        await expect(
          start({
            http: `127.0.0.1:${mcpPort}`,
            trustProxyAuth: true,
            enableAttachmentUrls: true,
            attachmentPort: String(takenPort),
          })
        ).rejects.toThrow(/EADDRINUSE/);

        await expect(fetch(`http://127.0.0.1:${mcpPort}/`)).rejects.toThrow();
      } finally {
        await new Promise<void>((resolve) => squatter.close(() => resolve()));
      }
    });
  });
});

/**
 * The option value itself.
 *
 * `parseHttpOption` next door falls back to 3000 on anything it cannot read,
 * which is survivable for the port the server is *for*. It is not survivable
 * here: a fallback would put the attachment route back on the MCP port, which
 * is the exact arrangement this option exists to take apart. Hence a strict
 * parser, and hence these cases.
 */
describe('parseAttachmentPortOption', () => {
  it('reads absent, null and empty as "no split listener"', () => {
    expect(parseAttachmentPortOption(undefined)).toBeNull();
    expect(parseAttachmentPortOption(null)).toBeNull();
    expect(parseAttachmentPortOption('')).toBeNull();
  });

  it('accepts a decimal port from a string or a number, with surrounding space', () => {
    expect(parseAttachmentPortOption('3001')).toBe(3001);
    expect(parseAttachmentPortOption(3001)).toBe(3001);
    expect(parseAttachmentPortOption('  3001  ')).toBe(3001);
    expect(parseAttachmentPortOption('65535')).toBe(65535);
    expect(parseAttachmentPortOption('1')).toBe(1);
  });

  it('refuses values parseInt would silently accept', () => {
    // The dangerous one: parseInt('3000x') is 3000, which is very likely the
    // MCP port.
    expect(() => parseAttachmentPortOption('3000x')).toThrow(/between 1 and 65535/);
    expect(() => parseAttachmentPortOption('3001.5')).toThrow(/between 1 and 65535/);
    expect(() => parseAttachmentPortOption('0x0bb9')).toThrow(/between 1 and 65535/);
    expect(() => parseAttachmentPortOption('-1')).toThrow(/between 1 and 65535/);
    expect(() => parseAttachmentPortOption('abc')).toThrow(/between 1 and 65535/);
  });

  it('refuses 0, which Node would read as "any free port"', () => {
    // It would bind, and serve attachments at an address nobody was told.
    expect(() => parseAttachmentPortOption('0')).toThrow(/between 1 and 65535/);
  });

  it('refuses a port above the range', () => {
    expect(() => parseAttachmentPortOption('65536')).toThrow(/between 1 and 65535/);
  });

  it('names both the flag and the env var, since either could have supplied it', () => {
    expect(() => parseAttachmentPortOption('nope')).toThrow(/--attachment-port/);
    expect(() => parseAttachmentPortOption('nope')).toThrow(/MS365_MCP_ATTACHMENT_PORT/);
  });
});

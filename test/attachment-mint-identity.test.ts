import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Writable } from 'node:stream';
import { UTILITY_TOOLS } from '../src/graph-tools.js';
import { requestContext } from '../src/request-context.js';
import { AttachmentTicketStore, TICKET_PARAM } from '../src/lib/attachment-tickets.js';
import {
  configureAttachmentMinting,
  resetAttachmentMinting,
} from '../src/lib/attachment-minting.js';
import { createAttachmentHandler } from '../src/attachment-route.js';

/**
 * Regression cover for an authority escalation.
 *
 * Redemption arrives with no Authorization header, so a ticket has to remember
 * who asked. When Graph identity comes from the request (plain `--http` bearer
 * mode, `--obo`, `MS365_MCP_OAUTH_TOKEN`) there is no cached account to look up,
 * and looking one up anyway fetches as whatever account the server has cached:
 * mint under one identity, fetch under another.
 *
 * These tests pin that a ticket minted from a request token is redeemed with
 * that token and never with the cache. If that stops holding, the "grants no
 * authority the caller did not already have" claim in the README and in
 * `mintDownloadUrl`'s docstring stops being true, and one of these fails.
 */
describe('a minted ticket is redeemed as the identity that asked', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'get-download-url')!;
  const MAIL_ATTACHMENT = '/me/messages/AAA/attachments/BBB/$value';
  let store: AttachmentTicketStore;

  function ctx(overrides: Record<string, unknown> = {}) {
    return {
      graphClient: {} as never,
      authManager: {
        isOAuthModeEnabled: () => false,
        isMultiAccount: async () => false,
        getToken: async () => 'SERVER_OWN_TOKEN',
        getTokenForAccount: async () => 'SERVER_OWN_TOKEN',
        ...overrides,
      } as never,
      multiAccount: false,
      accountNames: [],
    };
  }

  function parse(result: { content: Array<{ text: string }> }) {
    return JSON.parse(result.content[0].text);
  }

  function ticketIdOf(result: unknown): string {
    const { downloadUrl } = parse(result as never);
    return new URL(downloadUrl).searchParams.get(TICKET_PARAM)!;
  }

  beforeEach(() => {
    store = new AttachmentTicketStore(120);
    configureAttachmentMinting({
      store,
      config: { base: 'http://m365:3000', key: 'k', keyId: '1', ttlSeconds: 120 },
    });
  });

  afterEach(() => resetAttachmentMinting());

  it('mints a server-account ticket when identity is the server’s own cached token', async () => {
    const result = await tool.execute({ target: MAIL_ATTACHMENT }, ctx());
    expect(parse(result as never).downloadUrl).toMatch(/^http:\/\/m365:3000\/attachment\?/);
    expect(store.redeem(ticketIdOf(result))).toMatchObject({
      kind: 'server-account',
      accountName: undefined,
    });
  });

  it('keeps the request token in the ticket in bearer/OBO mode', async () => {
    const result = await requestContext.run({ accessToken: 'CALLER_TOKEN' }, () =>
      tool.execute({ target: MAIL_ATTACHMENT }, ctx())
    );
    expect(result.isError).toBeFalsy();
    expect(store.redeem(ticketIdOf(result))).toMatchObject({
      kind: 'request-token',
      accessToken: 'CALLER_TOKEN',
      target: MAIL_ATTACHMENT,
    });
  });

  it('never puts the token in the URL or anywhere else in the response', async () => {
    const result = await requestContext.run({ accessToken: 'CALLER_TOKEN' }, () =>
      tool.execute({ target: MAIL_ATTACHMENT }, ctx())
    );
    expect(JSON.stringify(result)).not.toContain('CALLER_TOKEN');
  });

  it('keeps the env token in the ticket in MS365_MCP_OAUTH_TOKEN mode', async () => {
    const result = await tool.execute(
      { target: MAIL_ATTACHMENT },
      ctx({ isOAuthModeEnabled: () => true, getToken: async () => 'ENV_TOKEN' })
    );
    expect(store.redeem(ticketIdOf(result))).toMatchObject({
      kind: 'request-token',
      accessToken: 'ENV_TOKEN',
    });
  });

  it('prefers the request token over the env token, as download-bytes does', async () => {
    const result = await requestContext.run({ accessToken: 'CALLER_TOKEN' }, () =>
      tool.execute(
        { target: MAIL_ATTACHMENT },
        ctx({ isOAuthModeEnabled: () => true, getToken: async () => 'ENV_TOKEN' })
      )
    );
    expect(store.redeem(ticketIdOf(result))).toMatchObject({ accessToken: 'CALLER_TOKEN' });
  });

  it('refuses rather than minting a server-account ticket when the request has no token', async () => {
    // What the real getToken() does with an empty MS365_MCP_OAUTH_TOKEN and no cached account.
    const result = await tool.execute(
      { target: MAIL_ATTACHMENT },
      ctx({
        isOAuthModeEnabled: () => true,
        getToken: async () => {
          throw new Error('No valid token found');
        },
      })
    );
    expect(result.isError).toBe(true);
    expect(parse(result as never).downloadUrl).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('refuses an account parameter the bearer cannot honour', async () => {
    const result = await requestContext.run({ accessToken: 'CALLER_TOKEN' }, () =>
      tool.execute({ target: MAIL_ATTACHMENT, account: 'olga@example.com' }, ctx())
    );
    expect(result.isError).toBe(true);
    expect(store.size()).toBe(0);
  });

  it('redeems with the minting token and never asks the cache', async () => {
    const result = await requestContext.run({ accessToken: 'CALLER_TOKEN' }, () =>
      tool.execute({ target: MAIL_ATTACHMENT }, ctx())
    );

    const downloadStream = vi.fn(async () => ({
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      contentType: 'application/pdf',
      contentLength: null,
      contentDisposition: null,
    }));
    const getToken = vi.fn(async () => 'SERVER_OWN_TOKEN');
    const getTokenForAccount = vi.fn(async () => 'SERVER_OWN_TOKEN');
    const handler = createAttachmentHandler({
      store,
      getGraphClient: () => ({ downloadStream }) as never,
      authManager: { isOAuthModeEnabled: () => false, getToken, getTokenForAccount } as never,
    });

    let status: number | undefined;
    const res = new Writable({
      write(_chunk, _enc, cb) {
        cb();
      },
    }) as Writable & Record<string, unknown>;
    res.status = (code: number) => {
      status = code;
      return res;
    };
    res.type = () => res;
    res.send = () => res;
    res.setHeader = () => {};

    // Redemption runs outside any request context, as the real fetch does.
    await handler(
      { method: 'GET', query: { [TICKET_PARAM]: ticketIdOf(result) } } as never,
      res as never,
      (() => {}) as never
    );

    expect(status).toBe(200);
    expect(downloadStream).toHaveBeenCalledWith(MAIL_ATTACHMENT, { accessToken: 'CALLER_TOKEN' });
    expect(getToken).not.toHaveBeenCalled();
    expect(getTokenForAccount).not.toHaveBeenCalled();
  });

  it('still refuses, rather than minting, for a non-byte Graph path', async () => {
    // The authority argument only holds for byte endpoints; an arbitrary Graph
    // path must stay refused even with minting enabled.
    const result = await tool.execute({ target: '/me/messages/AAA' }, ctx());
    expect(result.isError).toBe(true);
    expect(parse(result as never).downloadUrl).toBeUndefined();
  });

  it('does not mint at all when the feature is off', async () => {
    resetAttachmentMinting();
    const result = await tool.execute({ target: MAIL_ATTACHMENT }, ctx());
    expect(result.isError).toBe(true);
    expect(parse(result as never).error).toMatch(/do not expose a pre-authenticated/i);
  });
});

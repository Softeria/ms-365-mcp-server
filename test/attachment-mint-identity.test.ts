import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UTILITY_TOOLS } from '../src/graph-tools.js';
import { requestContext } from '../src/request-context.js';
import { AttachmentTicketStore } from '../src/lib/attachment-tickets.js';
import {
  configureAttachmentMinting,
  resetAttachmentMinting,
} from '../src/lib/attachment-minting.js';

/**
 * Regression cover for an authority escalation.
 *
 * The mint guard originally read `if (authManager?.isOAuthModeEnabled())`. That
 * predicate is true only for `MS365_MCP_OAUTH_TOKEN` and the oauth-provider
 * path -- it is **false** in plain `--http` bearer mode and in `--obo`, both of
 * which still run a tool inside a request context carrying the *caller's*
 * token. So in those modes `download-bytes` read as the caller while a redeemed
 * ticket read as whatever account the server had cached: mint under one
 * identity, fetch under another.
 *
 * These tests pin the corrected predicate. If either half is dropped again, the
 * "grants no authority the caller did not already have" claim in the README and
 * in `mintDownloadUrl`'s docstring stops being true, and one of these fails.
 */
describe('minting refuses whenever Graph identity comes from the request', () => {
  const tool = UTILITY_TOOLS.find((t) => t.name === 'get-download-url')!;
  const MAIL_ATTACHMENT = '/me/messages/AAA/attachments/BBB/$value';

  function ctx(overrides: Record<string, unknown> = {}) {
    return {
      graphClient: {} as never,
      authManager: {
        isOAuthModeEnabled: () => false,
        isMultiAccount: async () => false,
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

  beforeEach(() => {
    configureAttachmentMinting({
      store: new AttachmentTicketStore(120),
      config: { base: 'http://m365:3000', key: 'k', keyId: '1', ttlSeconds: 120 },
    });
  });

  afterEach(() => resetAttachmentMinting());

  it('mints when identity is the server’s own cached token', async () => {
    const result = await tool.execute({ target: MAIL_ATTACHMENT }, ctx());
    expect(parse(result as never).downloadUrl).toMatch(/^http:\/\/m365:3000\/attachment\?/);
  });

  it('refuses in bearer/OBO mode, where a request token is present', async () => {
    const result = await requestContext.run({ accessToken: 'CALLER_TOKEN' }, () =>
      tool.execute({ target: MAIL_ATTACHMENT }, ctx())
    );
    expect(result.isError).toBe(true);
    const body = parse(result as never);
    expect(body.downloadUrl).toBeUndefined();
    expect(body.error).toMatch(/identity comes from the request/i);
  });

  it('refuses when MS365_MCP_OAUTH_TOKEN-style OAuth mode is on', async () => {
    const result = await tool.execute(
      { target: MAIL_ATTACHMENT },
      ctx({ isOAuthModeEnabled: () => true })
    );
    expect(result.isError).toBe(true);
    expect(parse(result as never).downloadUrl).toBeUndefined();
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

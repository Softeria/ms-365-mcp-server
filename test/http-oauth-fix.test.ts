/**
 * Regression test for GitHub issue #258:
 * "No accounts found. Please login first." after update to 0.44
 *
 * In HTTP/OAuth mode, the access token comes from the request context (set by
 * microsoftBearerTokenAuthMiddleware), NOT from the MSAL token cache. The
 * multi-account commit (3112d0b) added account resolution via MSAL that broke
 * this flow — getTokenForAccount() tried to look up accounts in an empty MSAL
 * cache and threw "No accounts found".
 *
 * The fix: skip MSAL account resolution when a request-context token exists.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';
import GraphClient from '../src/graph-client.js';
import { requestContext } from '../src/request-context.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'GET',
        path: '/me/messages',
        description: 'List mail messages',
        parameters: [],
      },
    ],
  },
}));

describe('Issue #258: HTTP/OAuth mode with empty MSAL cache', () => {
  let server: McpServer;
  let originalFetch: typeof global.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedHandler: ((...args: any[]) => any) | undefined;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '1.0.0' });
    originalFetch = global.fetch;
    capturedHandler = undefined;

    // Capture the registered tool handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(server, 'tool').mockImplementation(((...args: any[]) => {
      const name = args[0];
      const handler = args[args.length - 1];
      if (name === 'list-mail-messages' && typeof handler === 'function') {
        capturedHandler = handler;
      }
    }) as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should use request-context token instead of failing with "No accounts found"', async () => {
    // Mock fetch to capture the token used in the Graph API call
    let capturedToken: string | undefined;
    global.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      capturedToken = options.headers?.['Authorization']?.replace('Bearer ', '');
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ value: [] }),
        headers: new Headers(),
      };
    });

    // AuthManager with empty MSAL cache and isOAuthMode=false (the bug scenario)
    const mockAuthManager = {
      isOAuthModeEnabled: vi.fn().mockReturnValue(false),
      getTokenForAccount: vi
        .fn()
        .mockRejectedValue(new Error('No accounts found. Please login first.')),
      getToken: vi.fn().mockResolvedValue(null),
    };

    const mockSecrets = {
      clientId: 'test-client',
      tenantId: 'common',
      cloudType: 'global' as const,
    };
    const graphClient = new GraphClient(mockAuthManager as any, mockSecrets);

    registerGraphTools(
      server,
      graphClient,
      false,
      undefined,
      false,
      mockAuthManager as any,
      false,
      []
    );

    expect(capturedHandler).toBeDefined();

    // Simulate HTTP/OAuth mode: token comes from request context (middleware)
    const result = await requestContext.run({ accessToken: 'OAUTH_HTTP_TOKEN' }, () =>
      capturedHandler!({})
    );

    // Should NOT have called getTokenForAccount (the MSAL path)
    expect(mockAuthManager.getTokenForAccount).not.toHaveBeenCalled();

    // Should have succeeded using the request-context token
    expect(result.isError).toBeUndefined();
    expect(capturedToken).toBe('OAUTH_HTTP_TOKEN');
  });

  it('should still use MSAL account resolution when no request context (stdio mode)', async () => {
    const mockAuthManager = {
      isOAuthModeEnabled: vi.fn().mockReturnValue(false),
      getTokenForAccount: vi
        .fn()
        .mockRejectedValue(new Error('No accounts found. Please login first.')),
      getToken: vi.fn().mockResolvedValue(null),
    };

    const mockSecrets = {
      clientId: 'test-client',
      tenantId: 'common',
      cloudType: 'global' as const,
    };
    const graphClient = new GraphClient(mockAuthManager as any, mockSecrets);

    registerGraphTools(
      server,
      graphClient,
      false,
      undefined,
      false,
      mockAuthManager as any,
      false,
      []
    );

    expect(capturedHandler).toBeDefined();

    // Call WITHOUT request context (stdio/device-code mode) — should hit MSAL path
    const result = await capturedHandler!({});

    // Should have attempted MSAL account resolution
    expect(mockAuthManager.getTokenForAccount).toHaveBeenCalled();

    // Should fail because MSAL cache is empty
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No accounts found');
  });
});

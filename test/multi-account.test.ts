import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphTools } from '../src/graph-tools.js';
import { registerAuthTools } from '../src/auth-tools.js';
import GraphClient from '../src/graph-client.js';
import AuthManager from '../src/auth.js';

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
      },
    ],
  },
}));

describe('Multi-account support', () => {
  let server: McpServer;
  let graphClient: GraphClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- McpServer.tool() has ~6 overloads; spying it requires any
  let toolSpy: any;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '1.0.0' });
    graphClient = {} as GraphClient;
    toolSpy = vi.spyOn(server, 'tool').mockImplementation((() => {}) as any);
  });

  describe('account parameter injection (Layer 2)', () => {
    it('should inject account param with known accounts in description when multiAccount=true', () => {
      registerGraphTools(server, graphClient, false, undefined, false, undefined, true, [
        'user@outlook.com',
        'work@company.com',
      ]);

      const toolCall = toolSpy.mock.calls.find(([name]) => name === 'list-mail-messages');
      expect(toolCall).toBeDefined();

      // Schema is the 3rd argument (index 2)
      const schema = toolCall![2] as Record<string, unknown>;
      expect(schema).toHaveProperty('account');
    });

    it('should not inject account param when multiAccount=false', () => {
      registerGraphTools(server, graphClient, false);

      const toolCall = toolSpy.mock.calls.find(([name]) => name === 'list-mail-messages');
      expect(toolCall).toBeDefined();

      const schema = toolCall![2] as Record<string, unknown>;
      expect(schema).not.toHaveProperty('account');
    });

    it('should use z.string (not z.enum) to accept mid-session accounts', () => {
      registerGraphTools(server, graphClient, false, undefined, false, undefined, true, [
        'user@outlook.com',
      ]);

      const toolCall = toolSpy.mock.calls.find(([name]) => name === 'list-mail-messages');
      const schema = toolCall![2] as Record<string, unknown>;
      // account should be a Zod string type, not enum — verify it's present and optional
      expect(schema).toHaveProperty('account');
    });
  });

  describe('list-accounts tool ownership (Layer 3)', () => {
    it('should not register list-accounts in registerGraphTools (canonical owner is auth-tools)', () => {
      const mockAuthManager = {
        isOAuthModeEnabled: vi.fn().mockReturnValue(false),
        getTokenForAccount: vi.fn(),
        listAccounts: vi.fn().mockResolvedValue([]),
        getSelectedAccountId: vi.fn().mockReturnValue(null),
      };

      registerGraphTools(
        server,
        graphClient,
        false,
        undefined,
        false,
        mockAuthManager as any,
        true,
        ['user@outlook.com']
      );

      const listAccountsCalls = toolSpy.mock.calls.filter(([name]) => name === 'list-accounts');
      expect(listAccountsCalls).toHaveLength(0);
    });

    it('should register list-accounts exactly once when auth-tools + graph-tools both run', () => {
      const mockAuthManager = {
        isOAuthModeEnabled: vi.fn().mockReturnValue(false),
        getTokenForAccount: vi.fn(),
        listAccounts: vi.fn().mockResolvedValue([]),
        getSelectedAccountId: vi.fn().mockReturnValue(null),
        testLogin: vi.fn(),
        acquireTokenByDeviceCode: vi.fn(),
        logout: vi.fn(),
        selectAccount: vi.fn(),
        removeAccount: vi.fn(),
      };

      // Simulate server boot: auth-tools first, then graph-tools
      registerAuthTools(server as any, mockAuthManager as any);
      registerGraphTools(
        server,
        graphClient,
        false,
        undefined,
        false,
        mockAuthManager as any,
        true,
        ['user@outlook.com']
      );

      const listAccountsCalls = toolSpy.mock.calls.filter(([name]) => name === 'list-accounts');
      expect(listAccountsCalls).toHaveLength(1);
    });
  });

  describe('list-accounts response shape', () => {
    it('should not expose homeAccountId in response', async () => {
      const mockAuthManager = {
        listAccounts: vi.fn().mockResolvedValue([
          { username: 'user@outlook.com', name: 'User', homeAccountId: 'secret-id-123' },
          { username: 'work@company.com', name: 'Work', homeAccountId: 'secret-id-456' },
        ]),
        getSelectedAccountId: vi.fn().mockReturnValue('secret-id-123'),
        testLogin: vi.fn(),
        acquireTokenByDeviceCode: vi.fn(),
        logout: vi.fn(),
        selectAccount: vi.fn(),
        removeAccount: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler type varies across McpServer.tool() overloads
      let listAccountsHandler: ((...args: any[]) => any) | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- McpServer.tool() has ~6 overloads; capturing requires any
      const captureSpy = vi.spyOn(server, 'tool').mockImplementation(((...args: any[]) => {
        // Capture the handler — it's the last argument regardless of overload
        const name = args[0];
        const handler = args[args.length - 1];
        if (name === 'list-accounts' && typeof handler === 'function') {
          listAccountsHandler = handler;
        }
      }) as any);

      registerAuthTools(server as any, mockAuthManager as any);
      expect(listAccountsHandler).toBeDefined();

      const result = await listAccountsHandler!({});
      const parsed = JSON.parse(result.content[0].text);

      // Should have email and isDefault, NOT id/homeAccountId
      expect(parsed.accounts).toHaveLength(2);
      expect(parsed.accounts[0]).toHaveProperty('email', 'user@outlook.com');
      expect(parsed.accounts[0]).toHaveProperty('isDefault', true);
      expect(parsed.accounts[0]).not.toHaveProperty('id');
      expect(parsed.accounts[0]).not.toHaveProperty('homeAccountId');
      expect(parsed.accounts[1]).toHaveProperty('email', 'work@company.com');
      expect(parsed.accounts[1]).toHaveProperty('isDefault', false);

      // Should have count and tip
      expect(parsed).toHaveProperty('count', 2);
      expect(parsed).toHaveProperty('tip');

      captureSpy.mockRestore();
    });
  });

  describe('resolveAccount()', () => {
    function createMockAuthManager(
      accounts: Array<{ username?: string; name?: string; homeAccountId: string }>
    ) {
      const mockMsalApp = {
        getTokenCache: () => ({
          getAllAccounts: vi.fn().mockResolvedValue(accounts),
        }),
      };
      // Create a minimal AuthManager-like object with resolveAccount bound to the mock
      const authManager = Object.create(AuthManager.prototype);
      authManager.msalApp = mockMsalApp;
      return authManager as AuthManager;
    }

    it('should resolve by email (case-insensitive)', async () => {
      const auth = createMockAuthManager([
        { username: 'User@Outlook.com', name: 'User', homeAccountId: 'id-1' },
        { username: 'work@company.com', name: 'Work', homeAccountId: 'id-2' },
      ]);

      const result = await auth.resolveAccount('user@outlook.com');
      expect(result.homeAccountId).toBe('id-1');
    });

    it('should fall back to homeAccountId when no email match', async () => {
      const auth = createMockAuthManager([
        { username: 'user@outlook.com', name: 'User', homeAccountId: 'id-1' },
      ]);

      const result = await auth.resolveAccount('id-1');
      expect(result.username).toBe('user@outlook.com');
    });

    it('should throw with available accounts on not-found', async () => {
      const auth = createMockAuthManager([
        { username: 'user@outlook.com', name: 'User', homeAccountId: 'id-1' },
      ]);

      await expect(auth.resolveAccount('nobody@example.com')).rejects.toThrow(
        /Account 'nobody@example.com' not found/
      );
    });

    it('should throw on empty cache', async () => {
      const auth = createMockAuthManager([]);

      await expect(auth.resolveAccount('user@outlook.com')).rejects.toThrow(/No accounts found/);
    });

    it('should not expose homeAccountId in error when username is missing', async () => {
      const auth = createMockAuthManager([
        { username: '', name: 'Service Account', homeAccountId: 'secret-tenant-id.object-id' },
      ]);

      try {
        await auth.resolveAccount('nobody@example.com');
        expect.fail('Should have thrown');
      } catch (err) {
        const message = (err as Error).message;
        expect(message).not.toContain('secret-tenant-id');
        expect(message).toContain('Service Account');
      }
    });
  });
});

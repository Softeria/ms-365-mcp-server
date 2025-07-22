import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import AuthManager from './auth.js';

export function registerAuthTools(server: McpServer, authManager: AuthManager): void {
  server.tool(
    'login',
    'Authenticate with Microsoft using device code flow',
    {
      force: z.boolean().default(false).describe('Force a new login even if already logged in'),
    },
    async ({ force }) => {
      try {
        if (!force) {
          const loginStatus = await authManager.testLogin();
          if (loginStatus.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    status: 'Already logged in',
                    ...loginStatus,
                  }),
                },
              ],
            };
          }
        }

        const text = await new Promise<string>((r) => {
          authManager.acquireTokenByDeviceCode(r);
        });
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Authentication failed: ${(error as Error).message}` }),
            },
          ],
        };
      }
    }
  );

  server.tool('logout', 'Log out from Microsoft account', {}, async () => {
    try {
      await authManager.logout();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: 'Logged out successfully' }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Logout failed' }),
          },
        ],
      };
    }
  });

  server.tool('verify-login', 'Check current Microsoft authentication status', {}, async () => {
    const testResult = await authManager.testLogin();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(testResult),
        },
      ],
    };
  });

  server.tool('list-accounts', 'List all available Microsoft accounts', {}, async () => {
    try {
      const accounts = await authManager.listAccounts();
      const selectedAccountId = authManager.getSelectedAccountId();
      const result = accounts.map((account) => ({
        id: account.homeAccountId,
        username: account.username,
        name: account.name,
        selected: account.homeAccountId === selectedAccountId,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ accounts: result }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Failed to list accounts: ${(error as Error).message}` }),
          },
        ],
      };
    }
  });

  server.tool(
    'select-account',
    'Select a specific Microsoft account to use',
    {
      accountId: z.string().describe('The account ID to select'),
    },
    async ({ accountId }) => {
      try {
        const success = await authManager.selectAccount(accountId);
        if (success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: `Selected account: ${accountId}` }),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Account not found: ${accountId}` }),
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Failed to select account: ${(error as Error).message}`,
              }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'remove-account',
    'Remove a Microsoft account from the cache',
    {
      accountId: z.string().describe('The account ID to remove'),
    },
    async ({ accountId }) => {
      try {
        const success = await authManager.removeAccount(accountId);
        if (success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: `Removed account: ${accountId}` }),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Account not found: ${accountId}` }),
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Failed to remove account: ${(error as Error).message}`,
              }),
            },
          ],
        };
      }
    }
  );
}

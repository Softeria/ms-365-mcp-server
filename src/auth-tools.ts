import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import AuthManager from './auth.js';

export function registerAuthTools(server: McpServer, authManager: AuthManager): void {
  server.tool(
    'login',
    'Authenticate with Microsoft account',
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

        if (authManager.getUseInteractiveAuth()) {
          await authManager.acquireTokenInteractive();
          const loginResult = await authManager.testLogin();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'Login successful',
                  message: 'Browser authentication completed successfully.',
                  ...loginResult,
                }),
              },
            ],
          };
        }

        const text = await new Promise<string>((resolve, reject) => {
          authManager.acquireTokenByDeviceCode(resolve).catch(reject);
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'device_code_required',
                message: text.trim(),
              }),
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

  // logout disabled for shared server deployments — prevents users from
  // invalidating other users' sessions on multi-tenant servers

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

  server.tool(
    'list-accounts',
    'List all Microsoft accounts configured in this server. Use this to discover available account emails before making tool calls. Reflects accounts added mid-session via --login.',
    {},
    {
      title: 'list-accounts',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async () => {
      try {
        const accounts = await authManager.listAccounts();
        const selectedAccountId = authManager.getSelectedAccountId();
        const result = accounts.map((account) => ({
          email: account.username || 'unknown',
          name: account.name,
          isDefault: account.homeAccountId === selectedAccountId,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                accounts: result,
                count: result.length,
                tip: "Pass the 'email' value as the 'account' parameter in any tool call to target a specific account.",
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Failed to list accounts: ${(error as Error).message}`,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'select-account',
    'Select a Microsoft account as the default. Accepts email address (e.g. user@outlook.com) or account ID. Use list-accounts to discover available accounts.',
    {
      account: z.string().describe('Email address or account ID of the account to select'),
    },
    async ({ account }) => {
      try {
        await authManager.selectAccount(account);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Selected account: ${account}` }),
            },
          ],
        };
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
          isError: true,
        };
      }
    }
  );

  // remove-account disabled for shared server deployments — prevents users
  // from removing other users' cached tokens
}

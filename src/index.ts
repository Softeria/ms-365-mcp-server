#!/usr/bin/env node

import 'dotenv/config';
import { parseArgs } from './cli.js';
import logger from './logger.js';
import AuthManager, { buildAllowedScopeDiagnostics, resolveAuthScopes } from './auth.js';
import MicrosoftGraphServer from './server.js';
import {
  getExpectedAccountInertWarning,
  shouldAssertExpectedAccountAtStartup,
  shouldUseLocalAuthStorage,
} from './startup-pinning.js';
import { createTokenCacheStorage } from './token-cache-storage.js';
import { dumpError, getActiveResources } from './crash-logging.js';
import { version } from './version.js';

// Global crash handlers. Without these, an unhandled rejection from a dependency
// (MSAL HTTP, keytar native, fetch in node) kills the stdio process silently
// before winston can flush. Log to stderr synchronously so the dump survives.
process.on('unhandledRejection', (reason) => {
  const dump = {
    kind: 'unhandledRejection',
    reason: dumpError(reason),
    activeResources: getActiveResources(),
  };
  console.error('[ms365-mcp] unhandledRejection', JSON.stringify(dump));
  logger.error('unhandledRejection', dump);
});

process.on('uncaughtException', (err, origin) => {
  const dump = {
    kind: 'uncaughtException',
    origin,
    error: dumpError(err),
    activeResources: getActiveResources(),
  };
  console.error('[ms365-mcp] uncaughtException', JSON.stringify(dump));
  logger.error('uncaughtException', dump);
});

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    const includeWorkScopes = args.orgMode || false;
    if (includeWorkScopes) {
      logger.info('Organization mode enabled - including work account scopes');
    }

    const readOnly = args.readOnly || false;
    const effectiveScopes = resolveAuthScopes(args);

    if (args.listPermissions) {
      const diagnostics = buildAllowedScopeDiagnostics(args);
      const mode = includeWorkScopes ? 'org' : 'personal';
      const filter = args.enabledTools ? args.enabledTools : undefined;
      if (diagnostics.disabledTools.length > 0) {
        console.error(
          `Warning: allowed scopes disabled ${diagnostics.disabledTools.length} tools. Missing scopes: ${diagnostics.missingAllowedScopesForTools.join(', ')}`
        );
      }
      console.log(
        JSON.stringify(
          {
            mode,
            readOnly,
            filter,
            ...diagnostics,
          },
          null,
          2
        )
      );
      process.exit(0);
    }

    const useLocalAuthStorage = shouldUseLocalAuthStorage(args);
    const storage = await createTokenCacheStorage({
      allowCommandStorage: useLocalAuthStorage,
      logProvider: useLocalAuthStorage,
    });
    const authManager = await AuthManager.create(
      effectiveScopes,
      {
        expectedUsername: args.expectedUsername,
        expectedHomeAccountId: args.expectedHomeAccountId,
      },
      { storage }
    );
    if (useLocalAuthStorage) {
      await authManager.loadTokenCache();
    }

    if (args.authBrowser) {
      authManager.setUseInteractiveAuth(true);
      logger.info('Browser-based interactive auth enabled');
    }

    const expectedAccountWarning = getExpectedAccountInertWarning(args, authManager);
    if (expectedAccountWarning) {
      logger.warn(expectedAccountWarning);
      console.error(expectedAccountWarning);
    }

    if (args.login) {
      if (args.authBrowser) {
        await authManager.acquireTokenInteractive();
      } else {
        await authManager.acquireTokenByDeviceCode();
      }
      logger.info('Login completed, testing connection with Graph API...');
      const result = await authManager.testLogin();
      // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.verifyLogin) {
      logger.info('Verifying login...');
      const result = await authManager.testLogin();
      // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.logout) {
      await authManager.logout();
      // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
      console.log(JSON.stringify({ message: 'Logged out successfully' }));
      process.exit(0);
    }

    if (args.listAccounts) {
      const accounts = await authManager.listAccounts();
      const selectedAccountId = authManager.getSelectedAccountId();
      const result = accounts.map((account) => ({
        id: account.homeAccountId,
        username: account.username,
        name: account.name,
        selected: account.homeAccountId === selectedAccountId,
      }));
      // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
      console.log(JSON.stringify({ accounts: result }));
      process.exit(0);
    }

    if (args.selectAccount) {
      const success = await authManager.selectAccount(args.selectAccount);
      if (success) {
        // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
        console.log(JSON.stringify({ message: `Selected account: ${args.selectAccount}` }));
      } else {
        // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
        console.log(JSON.stringify({ error: `Account not found: ${args.selectAccount}` }));
        process.exit(1);
      }
      process.exit(0);
    }

    if (args.removeAccount) {
      const success = await authManager.removeAccount(args.removeAccount);
      if (success) {
        // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
        console.log(JSON.stringify({ message: `Removed account: ${args.removeAccount}` }));
      } else {
        // CLI-only path: process.exit(0) follows immediately; stdout output here is intentional and safe (not in the server stdio loop).
        console.log(JSON.stringify({ error: `Account not found: ${args.removeAccount}` }));
        process.exit(1);
      }
      process.exit(0);
    }

    if (shouldAssertExpectedAccountAtStartup(args, authManager)) {
      await authManager.assertExpectedAccountAvailable();
    }

    const server = new MicrosoftGraphServer(authManager, args);
    await server.initialize(version);
    await server.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Startup error: ${message}`);
    console.error(message);
    process.exit(1);
  }
}

main();

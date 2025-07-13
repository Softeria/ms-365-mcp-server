#!/usr/bin/env node

import 'dotenv/config';
import { parseArgs } from './cli.js';
import logger from './logger.js';
import AuthManager from './auth.js';
import MicrosoftGraphServer from './server.js';
import { version } from './version.js';
import { buildScopesFromEndpoints } from './auth.js';

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    let includeWorkScopes = args.forceWorkScopes;
    if (!includeWorkScopes) {
      const tempAuthManager = new AuthManager(undefined, buildScopesFromEndpoints(false));
      await tempAuthManager.loadTokenCache();
      const hasWorkPermissions = await tempAuthManager.hasWorkAccountPermissions();
      if (hasWorkPermissions) {
        includeWorkScopes = true;
        logger.info('Detected existing work account permissions, including work scopes');
      }
    }

    const scopes = buildScopesFromEndpoints(includeWorkScopes);
    const authManager = new AuthManager(undefined, scopes);
    await authManager.loadTokenCache();

    if (args.login) {
      await authManager.acquireTokenByDeviceCode();
      logger.info('Login completed, testing connection with Graph API...');
      const result = await authManager.testLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.verifyLogin) {
      logger.info('Verifying login...');
      const result = await authManager.testLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.logout) {
      await authManager.logout();
      console.log(JSON.stringify({ message: 'Logged out successfully' }));
      process.exit(0);
    }

    if (args.listAccounts) {
      const accounts = await authManager.listAccounts();
      const selectedAccountId = authManager.getSelectedAccountId();
      const result = accounts.map(account => ({
        id: account.homeAccountId,
        username: account.username,
        name: account.name,
        selected: account.homeAccountId === selectedAccountId
      }));
      console.log(JSON.stringify({ accounts: result }));
      process.exit(0);
    }

    if (args.selectAccount) {
      const success = await authManager.selectAccount(args.selectAccount);
      if (success) {
        console.log(JSON.stringify({ message: `Selected account: ${args.selectAccount}` }));
      } else {
        console.log(JSON.stringify({ error: `Account not found: ${args.selectAccount}` }));
        process.exit(1);
      }
      process.exit(0);
    }

    if (args.removeAccount) {
      const success = await authManager.removeAccount(args.removeAccount);
      if (success) {
        console.log(JSON.stringify({ message: `Removed account: ${args.removeAccount}` }));
      } else {
        console.log(JSON.stringify({ error: `Account not found: ${args.removeAccount}` }));
        process.exit(1);
      }
      process.exit(0);
    }

    const server = new MicrosoftGraphServer(authManager, args);
    await server.initialize(version);
    await server.start();
  } catch (error) {
    logger.error(`Startup error: ${error}`);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

import { parseArgs } from './cli.js';
import logger from './logger.js';
import AuthManager from './auth.js';
import MicrosoftGraphServer from './server.js';
import { version } from './version.js';
import { buildScopesFromEndpoints } from './auth.js';

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    const scopes = buildScopesFromEndpoints(args.forceWorkScopes);
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

    const server = new MicrosoftGraphServer(authManager, args);
    await server.initialize(version);
    await server.start();
  } catch (error) {
    logger.error(`Startup error: ${error}`);
    process.exit(1);
  }
}

main();

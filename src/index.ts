#!/usr/bin/env node

import 'dotenv/config';
import { parseArgs } from './cli.js';
import logger from './logger.js';
import AuthManager from './auth.js';
import MicrosoftGraphServer from './server.js';
import { dumpError, getActiveResources } from './crash-logging.js';
import { version } from './version.js';

// Global crash handlers. Without these, an unhandled rejection from a dependency
// (MSAL HTTP, fetch in node) kills the process silently before winston can flush.
// Log to stderr synchronously so the dump survives.
process.on('unhandledRejection', (reason) => {
  const dump = {
    kind: 'unhandledRejection',
    reason: dumpError(reason),
    activeResources: getActiveResources(),
  };
  console.error('[microsoft-mcp] unhandledRejection', JSON.stringify(dump));
  logger.error('unhandledRejection', dump);
});

process.on('uncaughtException', (err, origin) => {
  const dump = {
    kind: 'uncaughtException',
    origin,
    error: dumpError(err),
    activeResources: getActiveResources(),
  };
  console.error('[microsoft-mcp] uncaughtException', JSON.stringify(dump));
  logger.error('uncaughtException', dump);
});

async function main(): Promise<void> {
  try {
    const args = parseArgs();
    const authManager = await AuthManager.create();
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

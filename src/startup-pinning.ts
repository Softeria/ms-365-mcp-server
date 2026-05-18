import type AuthManager from './auth.js';
import type { CommandOptions } from './cli.js';

const LOCAL_ACCOUNT_COMMANDS = [
  'login',
  'logout',
  'listAccounts',
  'selectAccount',
  'removeAccount',
  'verifyLogin',
] as const;

export function getExpectedAccountInertWarning(
  args: CommandOptions,
  authManager: Pick<AuthManager, 'hasExpectedAccount' | 'isOAuthModeEnabled'>
): string | null {
  if (!authManager.hasExpectedAccount()) {
    return null;
  }

  const inertModes: string[] = [];
  if (args.http) {
    inertModes.push('--http');
  }
  if (args.obo) {
    inertModes.push('--obo');
  }
  if (authManager.isOAuthModeEnabled()) {
    inertModes.push('MS365_MCP_OAUTH_TOKEN');
  }

  if (inertModes.length === 0) {
    return null;
  }

  return (
    `Warning: expected account pinning is configured, but ${inertModes.join(', ')} ` +
    'uses request-provided tokens for Graph calls. The pin only guards local MSAL auth helpers.'
  );
}

export function shouldAssertExpectedAccountAtStartup(
  args: CommandOptions,
  authManager: Pick<AuthManager, 'hasExpectedAccount' | 'isOAuthModeEnabled'>
): boolean {
  if (!authManager.hasExpectedAccount()) {
    return false;
  }
  if (getExpectedAccountInertWarning(args, authManager)) {
    return false;
  }
  return !LOCAL_ACCOUNT_COMMANDS.some((key) => Boolean(args[key]));
}

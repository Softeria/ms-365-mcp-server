import type { AccountInfo, Configuration } from '@azure/msal-node';
import { PublicClientApplication } from '@azure/msal-node';
import logger from './logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId } from './cloud-config.js';
import {
  createTokenCacheStorage,
  DefaultTokenCacheStorage,
  type TokenCacheStorage,
  unwrapCache,
  wrapCache,
} from './token-cache-storage.js';

interface EndpointConfig {
  pathPattern: string;
  method: string;
  toolName: string;
  scopes?: string[];
  workScopes?: string[];
  llmTip?: string;
  readOnly?: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as EndpointConfig[];

function createMsalConfig(secrets: AppSecrets): Configuration {
  const cloudEndpoints = getCloudEndpoints();
  return {
    auth: {
      clientId: secrets.clientId || getDefaultClientId(),
      authority: `${cloudEndpoints.authority}/${secrets.tenantId || 'common'}`,
    },
  };
}

export function getEndpointRequiredScopes(
  endpoint: Pick<EndpointConfig, 'scopes' | 'workScopes'> | undefined
): string[] {
  if (!endpoint) {
    return [];
  }
  const scopes = new Set<string>();
  if (endpoint.scopes) {
    endpoint.scopes.forEach((scope) => scopes.add(scope));
  }
  if (endpoint.workScopes) {
    endpoint.workScopes.forEach((scope) => scopes.add(scope));
  }
  return Array.from(scopes);
}

/**
 * Union of all delegated scopes required by the current tool surface. Areté
 * operates inside one Entra tenant so we always include both personal and
 * work-account scopes for every endpoint.
 */
export function buildScopesFromEndpoints(): string[] {
  const scopesSet = new Set<string>();
  for (const endpoint of endpointsData) {
    getEndpointRequiredScopes(endpoint).forEach((scope) => scopesSet.add(scope));
  }
  return Array.from(scopesSet);
}

export function resolveAuthScopes(): string[] {
  return buildScopesFromEndpoints();
}

interface AuthManagerCreateOptions {
  storage?: TokenCacheStorage;
}

class AuthManager {
  private scopes: string[];
  private msalApp: PublicClientApplication;
  private accessToken: string | null;
  private tokenExpiry: number | null;
  private oauthToken: string | null;
  private isOAuthMode: boolean;
  private selectedAccountId: string | null;
  private storage: TokenCacheStorage;

  constructor(config: Configuration, scopes: string[] = [], storage?: TokenCacheStorage) {
    logger.info(`Initializing AuthManager with ${scopes.length} scopes`);
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(config);
    this.accessToken = null;
    this.tokenExpiry = null;
    this.selectedAccountId = null;
    this.storage = storage ?? new DefaultTokenCacheStorage();
    // OAuth mode is entered at runtime when MicrosoftOAuthProvider calls setOAuthToken
    // after verifying a bearer token. There is no static configuration path into it.
    this.oauthToken = null;
    this.isOAuthMode = false;
  }

  static async create(options: AuthManagerCreateOptions = {}): Promise<AuthManager> {
    const secrets = await getSecrets();
    const config = createMsalConfig(secrets);
    const storage =
      options.storage ??
      (await createTokenCacheStorage({ allowCommandStorage: false, logProvider: true }));
    return new AuthManager(config, resolveAuthScopes(), storage);
  }

  private async saveTokenCache(): Promise<void> {
    try {
      const stamped = wrapCache(this.msalApp.getTokenCache().serialize());
      await this.storage.save('token-cache', stamped);
    } catch (error) {
      logger.error(`Error saving token cache: ${(error as Error).message}`);
      if (this.storage.failClosed) {
        throw error;
      }
    }
  }

  async setOAuthToken(token: string): Promise<void> {
    this.oauthToken = token;
    this.isOAuthMode = true;
  }

  isOAuthModeEnabled(): boolean {
    return this.isOAuthMode;
  }

  getSelectedAccountId(): string | null {
    return this.selectedAccountId;
  }

  async getToken(forceRefresh = false): Promise<string | null> {
    if (this.isOAuthMode && this.oauthToken) {
      return this.oauthToken;
    }

    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now() && !forceRefresh) {
      return this.accessToken;
    }

    const currentAccount = await this.getCurrentAccount();

    if (currentAccount) {
      try {
        const response = await this.msalApp.acquireTokenSilent({
          account: currentAccount,
          scopes: this.scopes,
        });
        this.accessToken = response.accessToken;
        this.tokenExpiry = response.expiresOn ? new Date(response.expiresOn).getTime() : null;
        await this.saveTokenCache();
        return this.accessToken;
      } catch {
        logger.error('Silent token acquisition failed');
        throw new Error('Silent token acquisition failed');
      }
    }

    throw new Error('No valid token found');
  }

  async getCurrentAccount(): Promise<AccountInfo | null> {
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    if (accounts.length === 0) return null;
    if (this.selectedAccountId) {
      const selectedAccount = accounts.find(
        (account) => account.homeAccountId === this.selectedAccountId
      );
      if (selectedAccount) return selectedAccount;
      logger.warn(
        `Selected account ${this.selectedAccountId} not found, falling back to first account`
      );
    }
    return accounts[0];
  }

  async listAccounts(): Promise<AccountInfo[]> {
    return this.msalApp.getTokenCache().getAllAccounts();
  }

  async resolveAccount(identifier: string): Promise<AccountInfo> {
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please login first.');
    }
    const lowerIdentifier = identifier.toLowerCase();
    let account = accounts.find((a) => a.username?.toLowerCase() === lowerIdentifier) ?? null;
    if (!account) {
      account = accounts.find((a) => a.homeAccountId === identifier) ?? null;
    }
    if (!account) {
      const availableAccounts = accounts.map((a) => a.username || a.name || 'unknown').join(', ');
      throw new Error(
        `Account '${identifier}' not found. Available accounts: ${availableAccounts}`
      );
    }
    return account;
  }

  async isMultiAccount(): Promise<boolean> {
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    return accounts.length > 1;
  }

  async getTokenForAccount(identifier?: string): Promise<string> {
    if (this.isOAuthMode && this.oauthToken) {
      return this.oauthToken;
    }

    let targetAccount: AccountInfo | null = null;

    if (identifier) {
      targetAccount = await this.resolveAccount(identifier);
    } else {
      const accounts = await this.msalApp.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please login first.');
      }
      if (accounts.length === 1) {
        targetAccount = accounts[0];
      } else {
        if (this.selectedAccountId) {
          targetAccount = accounts.find((a) => a.homeAccountId === this.selectedAccountId) ?? null;
        }
        if (!targetAccount) {
          const availableAccounts = accounts
            .map((a) => a.username || a.name || 'unknown')
            .join(', ');
          throw new Error(
            `Multiple accounts configured but no 'account' parameter provided and no default selected. ` +
              `Available accounts: ${availableAccounts}. ` +
              `Pass account="<email>" in your tool call.`
          );
        }
      }
    }

    try {
      const response = await this.msalApp.acquireTokenSilent({
        account: targetAccount,
        scopes: this.scopes,
      });
      await this.saveTokenCache();
      return response.accessToken;
    } catch {
      throw new Error(
        `Failed to acquire token for account '${targetAccount.username || targetAccount.name || 'unknown'}'. ` +
          `The token may have expired.`
      );
    }
  }
}

export default AuthManager;
export { type AuthManagerCreateOptions, unwrapCache, wrapCache };

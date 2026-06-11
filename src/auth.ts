import type { Configuration } from '@azure/msal-node';
import { AuthError, PublicClientApplication } from '@azure/msal-node';
import logger from './logger.js';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId } from './cloud-config.js';
import {
  createTokenCacheStorage,
  DefaultTokenCacheStorage,
  wrapCache,
  unwrapCache,
  type TokenCacheStorage,
} from './token-cache-storage.js';

function createMsalConfig(secrets: AppSecrets): Configuration {
  const cloudEndpoints = getCloudEndpoints(secrets.cloudType);
  return {
    auth: {
      clientId: secrets.clientId || getDefaultClientId(secrets.cloudType),
      authority: `${cloudEndpoints.authority}/${secrets.tenantId || 'common'}`,
    },
  };
}

export function describeAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    const suberror = error.subError ? ` / ${error.subError}` : '';
    return `${error.errorCode}${suberror} (correlationId: ${error.correlationId || 'none'}): ${error.errorMessage}`;
  }
  return (error as Error).message;
}

class AuthManager {
  private config: Configuration;
  private scopes: string[];
  private msalApp: PublicClientApplication;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private oauthToken: string | null = null;
  private isOAuthMode: boolean = false;
  private selectedAccountId: string | null = null;
  private storage: TokenCacheStorage;

  constructor(
    config: Configuration,
    scopes: string[] = [],
    storage?: TokenCacheStorage
  ) {
    this.config = config;
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(this.config);
    this.storage = storage ?? new DefaultTokenCacheStorage();
    if (process.env.MS365_MCP_OAUTH_TOKEN) {
      this.oauthToken = process.env.MS365_MCP_OAUTH_TOKEN;
      this.isOAuthMode = true;
    }
  }

  static async create(
    scopes: string[] = [],
    options: { storage?: TokenCacheStorage } = {}
  ): Promise<AuthManager> {
    const secrets = await getSecrets();
    const config = createMsalConfig(secrets);
    const storage = options.storage ?? await createTokenCacheStorage({ allowCommandStorage: false, logProvider: true });
    return new AuthManager(config, scopes, storage);
  }

  async loadTokenCache(): Promise<void> {
    const cacheRaw = await this.storage.load('token-cache');
    if (cacheRaw) this.msalApp.getTokenCache().deserialize(unwrapCache(cacheRaw).data);
    const selectedRaw = await this.storage.load('selected-account');
    if (selectedRaw) this.selectedAccountId = JSON.parse(unwrapCache(selectedRaw).data).accountId;
  }

  async saveTokenCache(): Promise<void> {
    await this.storage.save('token-cache', wrapCache(this.msalApp.getTokenCache().serialize()));
    if (this.selectedAccountId) {
      await this.storage.save('selected-account', wrapCache(JSON.stringify({ accountId: this.selectedAccountId })));
    }
  }

  async getToken(): Promise<string | null> {
    if (this.isOAuthMode) return this.oauthToken;
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) return this.accessToken;
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    const account = this.selectedAccountId ? accounts.find(a => a.homeAccountId === this.selectedAccountId) : accounts[0];
    if (account) {
      const resp = await this.msalApp.acquireTokenSilent({ account, scopes: this.scopes });
      this.accessToken = resp.accessToken;
      this.tokenExpiry = resp.expiresOn ? new Date(resp.expiresOn).getTime() : null;
      return this.accessToken;
    }
    return null;
  }
}

export default AuthManager;

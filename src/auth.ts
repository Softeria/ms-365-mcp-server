import type { AccountInfo, Configuration, DeviceCodeRequest } from '@azure/msal-node';
import { AuthError, PublicClientApplication } from '@azure/msal-node';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId } from './cloud-config.js';
import {
  createTokenCacheStorage,
  DefaultTokenCacheStorage,
  wrapCache,
  unwrapCache,
  type TokenCacheStorage,
} from './token-cache-storage.js';

interface AuthManagerOptions {
  expectedUsername?: string;
  expectedHomeAccountId?: string;
}

export interface AllowedScopeDiagnostics {
  disabledTools: string[];
  missingAllowedScopesForTools: string[];
  allowedScopes?: string[];
}

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
  return error instanceof Error ? error.message : String(error);
}

export function parseAllowedScopes(raw?: string | string[] | null): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  const scopes = Array.isArray(raw) ? raw : raw.split(/[\s,]+/);
  const normalized = scopes.map((scope) => scope.trim()).filter(Boolean);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

export function buildScopesFromEndpoints(
  orgMode?: boolean,
  _enabledTools?: string[] | string,
  readOnly?: boolean
): string[] {
  const scopes = new Set<string>(['User.Read', 'offline_access']);

  if (readOnly) {
    scopes.add('Files.Read.All');
    scopes.add('Mail.Read');
    scopes.add('Calendars.Read');
    scopes.add('Contacts.Read');
  } else {
    scopes.add('Files.ReadWrite.All');
    scopes.add('Mail.ReadWrite');
    scopes.add('Mail.Send');
    scopes.add('Calendars.ReadWrite');
    scopes.add('Contacts.ReadWrite');
  }

  if (orgMode) {
    scopes.add('Sites.Read.All');
  }

  return Array.from(scopes);
}

export function resolveAuthScopes(args: any = {}): string[] {
  const explicit = parseAllowedScopes(args.allowedScopes ?? process.env.MS365_MCP_ALLOWED_SCOPES);
  if (explicit) return explicit;
  return buildScopesFromEndpoints(args.orgMode, args.enabledTools, args.readOnly);
}

export function getEndpointRequiredScopes(_endpoint: unknown): string[] {
  return [];
}

export function getMissingAllowedScopes(_requiredScopes: string[], _allowedScopes?: string[]): string[] {
  return [];
}

export function buildAllowedScopeDiagnostics(args: any = {}): AllowedScopeDiagnostics {
  return {
    disabledTools: [],
    missingAllowedScopesForTools: [],
    allowedScopes: resolveAuthScopes(args),
  };
}

class AuthManager {
  private config: Configuration;
  private scopes: string[];
  private msalApp: PublicClientApplication;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private oauthToken: string | null = null;
  private isOAuthMode = false;
  private selectedAccountId: string | null = null;
  private storage: TokenCacheStorage;
  private useInteractiveAuth = false;
  private expectedUsername?: string;
  private expectedHomeAccountId?: string;

  constructor(config: Configuration, scopes: string[] = [], storage?: TokenCacheStorage, options: AuthManagerOptions = {}) {
    this.config = config;
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(this.config);
    this.storage = storage ?? new DefaultTokenCacheStorage();
    this.expectedUsername = options.expectedUsername;
    this.expectedHomeAccountId = options.expectedHomeAccountId;

    if (process.env.MS365_MCP_OAUTH_TOKEN) {
      this.oauthToken = process.env.MS365_MCP_OAUTH_TOKEN;
      this.isOAuthMode = true;
    }
  }

  static async create(
    scopes: string[] = [],
    options: AuthManagerOptions = {},
    { storage }: { storage?: TokenCacheStorage } = {}
  ): Promise<AuthManager> {
    const secrets = await getSecrets();
    const config = createMsalConfig(secrets);
    const effectiveStorage =
      storage ?? (await createTokenCacheStorage({ allowCommandStorage: false, logProvider: true }));
    return new AuthManager(config, scopes, effectiveStorage, options);
  }

  setUseInteractiveAuth(value: boolean): void {
    this.useInteractiveAuth = value;
  }

  getUseInteractiveAuth(): boolean {
    return this.useInteractiveAuth;
  }

  isOAuthModeEnabled(): boolean {
    return this.isOAuthMode;
  }

  hasExpectedAccount(): boolean {
    return Boolean(this.expectedUsername || this.expectedHomeAccountId);
  }

  async isMultiAccount(): Promise<boolean> {
    const accounts = await this.listAccounts();
    return accounts.length > 1;
  }

  async acquireTokenInteractive(): Promise<void> {
    throw new Error('Interactive browser authentication is not available in this runtime.');
  }

  async acquireTokenByDeviceCode(callback?: DeviceCodeRequest['deviceCodeCallback']): Promise<void> {
    const result = await this.msalApp.acquireTokenByDeviceCode({
      scopes: this.scopes,
      deviceCodeCallback:
        callback ??
        ((response) => {
          console.error(response.message);
        }),
    });

    if (!result?.accessToken) {
      throw new Error('Device code authentication did not return an access token.');
    }

    this.accessToken = result.accessToken;
    this.tokenExpiry = result.expiresOn ? result.expiresOn.getTime() : null;
    await this.saveTokenCache();
  }

  async testLogin(): Promise<{ success: boolean; message?: string; account?: string }> {
    try {
      const token = await this.getToken();
      return token ? { success: true } : { success: false, message: 'No cached token available' };
    } catch (error) {
      return { success: false, message: describeAuthError(error) };
    }
  }

  async logout(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.oauthToken = null;
    await this.storage.delete('token-cache');
    await this.storage.delete('selected-account');
  }

  async listAccounts(): Promise<AccountInfo[]> {
    return this.msalApp.getTokenCache().getAllAccounts();
  }

  getSelectedAccountId(): string | null {
    return this.selectedAccountId;
  }

  async selectAccount(idOrUsername: string): Promise<boolean> {
    const accounts = await this.listAccounts();
    const account = accounts.find(
      (item) => item.homeAccountId === idOrUsername || item.username === idOrUsername
    );
    if (!account) return false;
    this.selectedAccountId = account.homeAccountId;
    await this.saveTokenCache();
    return true;
  }

  async removeAccount(idOrUsername: string): Promise<boolean> {
    const accounts = await this.listAccounts();
    const account = accounts.find(
      (item) => item.homeAccountId === idOrUsername || item.username === idOrUsername
    );
    if (!account) return false;
    await this.msalApp.getTokenCache().removeAccount(account);
    if (this.selectedAccountId === account.homeAccountId) {
      this.selectedAccountId = null;
    }
    await this.saveTokenCache();
    return true;
  }

  async assertExpectedAccountAvailable(): Promise<void> {
    if (!this.hasExpectedAccount()) return;
    const accounts = await this.listAccounts();
    const found = accounts.some(
      (account) =>
        account.username === this.expectedUsername || account.homeAccountId === this.expectedHomeAccountId
    );
    if (!found) {
      throw new Error('Expected Microsoft account is not available in the token cache.');
    }
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

    await this.loadTokenCache();
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    const account = this.selectedAccountId
      ? accounts.find((item) => item.homeAccountId === this.selectedAccountId)
      : accounts[0];

    if (account) {
      const resp = await this.msalApp.acquireTokenSilent({ account, scopes: this.scopes });
      this.accessToken = resp.accessToken;
      this.tokenExpiry = resp.expiresOn ? resp.expiresOn.getTime() : null;
      return this.accessToken;
    }

    return null;
  }
}

export default AuthManager;

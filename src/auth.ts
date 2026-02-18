import type { AccountInfo, Configuration } from '@azure/msal-node';
import { PublicClientApplication } from '@azure/msal-node';
import logger from './logger.js';
import fs, { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId } from './cloud-config.js';

// Ok so this is a hack to lazily import keytar only when needed
// since --http mode may not need it at all, and keytar can be a pain to install (looking at you alpine)
let keytar: typeof import('keytar') | null = null;
async function getKeytar() {
  if (keytar === undefined) {
    return null;
  }
  if (keytar === null) {
    try {
      keytar = await import('keytar');
      return keytar;
    } catch (error) {
      logger.info('keytar not available, using file-based credential storage');
      keytar = undefined as any;
      return null;
    }
  }
  return keytar;
}

interface EndpointConfig {
  pathPattern: string;
  method: string;
  toolName: string;
  scopes?: string[];
  workScopes?: string[];
  llmTip?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as EndpointConfig[];

const endpoints = {
  default: endpointsData,
};

const SERVICE_NAME = 'ms-365-mcp-server';
const TOKEN_CACHE_ACCOUNT = 'msal-token-cache';
const SELECTED_ACCOUNT_KEY = 'selected-account';
const FALLBACK_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TOKEN_CACHE_PATH = path.join(FALLBACK_DIR, '..', '.token-cache.json');
const DEFAULT_SELECTED_ACCOUNT_PATH = path.join(FALLBACK_DIR, '..', '.selected-account.json');

/**
 * Returns the token cache file path.
 * Uses MS365_MCP_TOKEN_CACHE_PATH env var if set, otherwise the default fallback.
 */
function getTokenCachePath(): string {
  const envPath = process.env.MS365_MCP_TOKEN_CACHE_PATH?.trim();
  return envPath || DEFAULT_TOKEN_CACHE_PATH;
}

/**
 * Returns the selected-account file path.
 * Uses MS365_MCP_SELECTED_ACCOUNT_PATH env var if set, otherwise the default fallback.
 */
function getSelectedAccountPath(): string {
  const envPath = process.env.MS365_MCP_SELECTED_ACCOUNT_PATH?.trim();
  return envPath || DEFAULT_SELECTED_ACCOUNT_PATH;
}

/**
 * Ensures the parent directory of a file path exists, creating it recursively if needed.
 */
function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

/**
 * Creates MSAL configuration from secrets.
 * This is called during AuthManager initialization.
 */
function createMsalConfig(secrets: AppSecrets): Configuration {
  const cloudEndpoints = getCloudEndpoints(secrets.cloudType);
  return {
    auth: {
      clientId: secrets.clientId || getDefaultClientId(secrets.cloudType),
      authority: `${cloudEndpoints.authority}/${secrets.tenantId || 'common'}`,
    },
  };
}

interface ScopeHierarchy {
  [key: string]: string[];
}

const SCOPE_HIERARCHY: ScopeHierarchy = {
  'Mail.ReadWrite': ['Mail.Read'],
  'Calendars.ReadWrite': ['Calendars.Read'],
  'Files.ReadWrite': ['Files.Read'],
  'Tasks.ReadWrite': ['Tasks.Read'],
  'Contacts.ReadWrite': ['Contacts.Read'],
};

function buildScopesFromEndpoints(
  includeWorkAccountScopes: boolean = false,
  enabledToolsPattern?: string
): string[] {
  const scopesSet = new Set<string>();

  // Create regex for tool filtering if pattern is provided
  let enabledToolsRegex: RegExp | undefined;
  if (enabledToolsPattern) {
    try {
      enabledToolsRegex = new RegExp(enabledToolsPattern, 'i');
      logger.info(`Building scopes with tool filter pattern: ${enabledToolsPattern}`);
    } catch (error) {
      logger.error(
        `Invalid tool filter regex pattern: ${enabledToolsPattern}. Building scopes without filter.`
      );
    }
  }

  endpoints.default.forEach((endpoint) => {
    // Skip endpoints that don't match the tool filter
    if (enabledToolsRegex && !enabledToolsRegex.test(endpoint.toolName)) {
      return;
    }

    // Skip endpoints that only have workScopes if not in work mode
    if (!includeWorkAccountScopes && !endpoint.scopes && endpoint.workScopes) {
      return;
    }

    // Add regular scopes
    if (endpoint.scopes && Array.isArray(endpoint.scopes)) {
      endpoint.scopes.forEach((scope) => scopesSet.add(scope));
    }

    // Add workScopes if in work mode
    if (includeWorkAccountScopes && endpoint.workScopes && Array.isArray(endpoint.workScopes)) {
      endpoint.workScopes.forEach((scope) => scopesSet.add(scope));
    }
  });

  // Scope hierarchy: if we have BOTH a higher scope (ReadWrite) AND lower scopes (Read),
  // keep only the higher scope since it includes the permissions of the lower scopes.
  // Do NOT upgrade Read to ReadWrite if we only have Read scopes.
  Object.entries(SCOPE_HIERARCHY).forEach(([higherScope, lowerScopes]) => {
    if (scopesSet.has(higherScope) && lowerScopes.every((scope) => scopesSet.has(scope))) {
      // We have both ReadWrite and Read, so remove the redundant Read scope
      lowerScopes.forEach((scope) => scopesSet.delete(scope));
    }
  });

  const scopes = Array.from(scopesSet);
  if (enabledToolsPattern) {
    logger.info(`Built ${scopes.length} scopes for filtered tools: ${scopes.join(', ')}`);
  }

  return scopes;
}

interface LoginTestResult {
  success: boolean;
  message: string;
  userData?: {
    displayName: string;
    userPrincipalName: string;
  };
}

class AuthManager {
  private config: Configuration;
  private scopes: string[];
  private msalApp: PublicClientApplication;
  private accessToken: string | null;
  private tokenExpiry: number | null;
  private oauthToken: string | null;
  private isOAuthMode: boolean;
  private selectedAccountId: string | null;

  constructor(config: Configuration, scopes: string[] = buildScopesFromEndpoints()) {
    logger.info(`And scopes are ${scopes.join(', ')}`, scopes);
    this.config = config;
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(this.config);
    this.accessToken = null;
    this.tokenExpiry = null;
    this.selectedAccountId = null;

    const oauthTokenFromEnv = process.env.MS365_MCP_OAUTH_TOKEN;
    this.oauthToken = oauthTokenFromEnv ?? null;
    this.isOAuthMode = oauthTokenFromEnv != null;
  }

  /**
   * Creates an AuthManager instance with secrets loaded from the configured provider.
   * Uses Key Vault if MS365_MCP_KEYVAULT_URL is set, otherwise environment variables.
   */
  static async create(scopes: string[] = buildScopesFromEndpoints()): Promise<AuthManager> {
    const secrets = await getSecrets();
    const config = createMsalConfig(secrets);
    return new AuthManager(config, scopes);
  }

  async loadTokenCache(): Promise<void> {
    try {
      let cacheData: string | undefined;

      try {
        const kt = await getKeytar();
        if (kt) {
          const cachedData = await kt.getPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT);
          if (cachedData) {
            cacheData = cachedData;
          }
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain access failed, falling back to file storage: ${(keytarError as Error).message}`
        );
      }

      const cachePath = getTokenCachePath();
      if (!cacheData && existsSync(cachePath)) {
        cacheData = readFileSync(cachePath, 'utf8');
      }

      if (cacheData) {
        this.msalApp.getTokenCache().deserialize(cacheData);
      }

      // Load selected account
      await this.loadSelectedAccount();
    } catch (error) {
      logger.error(`Error loading token cache: ${(error as Error).message}`);
    }
  }

  private async loadSelectedAccount(): Promise<void> {
    try {
      let selectedAccountData: string | undefined;

      try {
        const kt = await getKeytar();
        if (kt) {
          const cachedData = await kt.getPassword(SERVICE_NAME, SELECTED_ACCOUNT_KEY);
          if (cachedData) {
            selectedAccountData = cachedData;
          }
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain access failed for selected account, falling back to file storage: ${(keytarError as Error).message}`
        );
      }

      const accountPath = getSelectedAccountPath();
      if (!selectedAccountData && existsSync(accountPath)) {
        selectedAccountData = readFileSync(accountPath, 'utf8');
      }

      if (selectedAccountData) {
        const parsed = JSON.parse(selectedAccountData);
        this.selectedAccountId = parsed.accountId;
        logger.info(`Loaded selected account: ${this.selectedAccountId}`);
      }
    } catch (error) {
      logger.error(`Error loading selected account: ${(error as Error).message}`);
    }
  }

  async saveTokenCache(): Promise<void> {
    try {
      const cacheData = this.msalApp.getTokenCache().serialize();

      try {
        const kt = await getKeytar();
        if (kt) {
          await kt.setPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT, cacheData);
        } else {
          const cachePath = getTokenCachePath();
          ensureParentDir(cachePath);
          fs.writeFileSync(cachePath, cacheData, { mode: 0o600 });
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain save failed, falling back to file storage: ${(keytarError as Error).message}`
        );

        const cachePath = getTokenCachePath();
        ensureParentDir(cachePath);
        fs.writeFileSync(cachePath, cacheData, { mode: 0o600 });
      }
    } catch (error) {
      logger.error(`Error saving token cache: ${(error as Error).message}`);
    }
  }

  private async saveSelectedAccount(): Promise<void> {
    try {
      const selectedAccountData = JSON.stringify({ accountId: this.selectedAccountId });

      try {
        const kt = await getKeytar();
        if (kt) {
          await kt.setPassword(SERVICE_NAME, SELECTED_ACCOUNT_KEY, selectedAccountData);
        } else {
          const accountPath = getSelectedAccountPath();
          ensureParentDir(accountPath);
          fs.writeFileSync(accountPath, selectedAccountData, { mode: 0o600 });
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain save failed for selected account, falling back to file storage: ${(keytarError as Error).message}`
        );

        const accountPath = getSelectedAccountPath();
        ensureParentDir(accountPath);
        fs.writeFileSync(accountPath, selectedAccountData, { mode: 0o600 });
      }
    } catch (error) {
      logger.error(`Error saving selected account: ${(error as Error).message}`);
    }
  }

  async setOAuthToken(token: string): Promise<void> {
    this.oauthToken = token;
    this.isOAuthMode = true;
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
      const silentRequest = {
        account: currentAccount,
        scopes: this.scopes,
      };

      try {
        const response = await this.msalApp.acquireTokenSilent(silentRequest);
        this.accessToken = response.accessToken;
        this.tokenExpiry = response.expiresOn ? new Date(response.expiresOn).getTime() : null;
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

    if (accounts.length === 0) {
      return null;
    }

    // If a specific account is selected, find it
    if (this.selectedAccountId) {
      const selectedAccount = accounts.find(
        (account: AccountInfo) => account.homeAccountId === this.selectedAccountId
      );
      if (selectedAccount) {
        return selectedAccount;
      }
      logger.warn(
        `Selected account ${this.selectedAccountId} not found, falling back to first account`
      );
    }

    // Fall back to first account (backward compatibility)
    return accounts[0];
  }

  async acquireTokenByDeviceCode(hack?: (message: string) => void): Promise<string | null> {
    const deviceCodeRequest = {
      scopes: this.scopes,
      deviceCodeCallback: (response: { message: string }) => {
        const text = ['\n', response.message, '\n'].join('');
        if (hack) {
          hack(text + 'After login run the "verify login" command');
        } else {
          console.log(text);
        }
        logger.info('Device code login initiated');
      },
    };

    try {
      logger.info('Requesting device code...');
      logger.info(`Requesting scopes: ${this.scopes.join(', ')}`);
      const response = await this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest);
      logger.info(`Granted scopes: ${response?.scopes?.join(', ') || 'none'}`);
      logger.info('Device code login successful');
      this.accessToken = response?.accessToken || null;
      this.tokenExpiry = response?.expiresOn ? new Date(response.expiresOn).getTime() : null;

      // Set the newly authenticated account as selected if no account is currently selected
      if (!this.selectedAccountId && response?.account) {
        this.selectedAccountId = response.account.homeAccountId;
        await this.saveSelectedAccount();
        logger.info(`Auto-selected new account: ${response.account.username}`);
      }

      await this.saveTokenCache();
      return this.accessToken;
    } catch (error) {
      logger.error(`Error in device code flow: ${(error as Error).message}`);
      throw error;
    }
  }

  async testLogin(): Promise<LoginTestResult> {
    try {
      logger.info('Testing login...');
      const token = await this.getToken();

      if (!token) {
        logger.error('Login test failed - no token received');
        return {
          success: false,
          message: 'Login failed - no token received',
        };
      }

      logger.info('Token retrieved successfully, testing Graph API access...');

      try {
        const secrets = await getSecrets();
        const cloudEndpoints = getCloudEndpoints(secrets.cloudType);
        const response = await fetch(`${cloudEndpoints.graphApi}/v1.0/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          logger.info('Graph API user data fetch successful');
          return {
            success: true,
            message: 'Login successful',
            userData: {
              displayName: userData.displayName,
              userPrincipalName: userData.userPrincipalName,
            },
          };
        } else {
          const errorText = await response.text();
          logger.error(`Graph API user data fetch failed: ${response.status} - ${errorText}`);
          return {
            success: false,
            message: `Login successful but Graph API access failed: ${response.status}`,
          };
        }
      } catch (graphError) {
        logger.error(`Error fetching user data: ${(graphError as Error).message}`);
        return {
          success: false,
          message: `Login successful but Graph API access failed: ${(graphError as Error).message}`,
        };
      }
    } catch (error) {
      logger.error(`Login test failed: ${(error as Error).message}`);
      return {
        success: false,
        message: `Login failed: ${(error as Error).message}`,
      };
    }
  }

  async logout(): Promise<boolean> {
    try {
      const accounts = await this.msalApp.getTokenCache().getAllAccounts();
      for (const account of accounts) {
        await this.msalApp.getTokenCache().removeAccount(account);
      }
      this.accessToken = null;
      this.tokenExpiry = null;
      this.selectedAccountId = null;

      try {
        const kt = await getKeytar();
        if (kt) {
          await kt.deletePassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT);
          await kt.deletePassword(SERVICE_NAME, SELECTED_ACCOUNT_KEY);
        }
      } catch (keytarError) {
        logger.warn(`Keychain deletion failed: ${(keytarError as Error).message}`);
      }

      const cachePath = getTokenCachePath();
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }

      const accountPath = getSelectedAccountPath();
      if (fs.existsSync(accountPath)) {
        fs.unlinkSync(accountPath);
      }

      return true;
    } catch (error) {
      logger.error(`Error during logout: ${(error as Error).message}`);
      throw error;
    }
  }

  // Multi-account support methods
  async listAccounts(): Promise<AccountInfo[]> {
    return await this.msalApp.getTokenCache().getAllAccounts();
  }

  async selectAccount(accountId: string): Promise<boolean> {
    const accounts = await this.listAccounts();
    const account = accounts.find((acc: AccountInfo) => acc.homeAccountId === accountId);

    if (!account) {
      logger.error(`Account with ID ${accountId} not found`);
      return false;
    }

    this.selectedAccountId = accountId;
    await this.saveSelectedAccount();

    // Clear cached tokens to force refresh with new account
    this.accessToken = null;
    this.tokenExpiry = null;

    logger.info(`Selected account: ${account.username} (${accountId})`);
    return true;
  }

  async removeAccount(accountId: string): Promise<boolean> {
    const accounts = await this.listAccounts();
    const account = accounts.find((acc: AccountInfo) => acc.homeAccountId === accountId);

    if (!account) {
      logger.error(`Account with ID ${accountId} not found`);
      return false;
    }

    try {
      await this.msalApp.getTokenCache().removeAccount(account);

      // If this was the selected account, clear the selection
      if (this.selectedAccountId === accountId) {
        this.selectedAccountId = null;
        await this.saveSelectedAccount();
        this.accessToken = null;
        this.tokenExpiry = null;
      }

      logger.info(`Removed account: ${account.username} (${accountId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove account ${accountId}: ${(error as Error).message}`);
      return false;
    }
  }

  getSelectedAccountId(): string | null {
    return this.selectedAccountId;
  }

  /**
   * Returns true if auth is in OAuth/HTTP mode (token supplied via env or setOAuthToken).
   * In this mode, account resolution should be skipped — the request context drives token selection.
   */
  isOAuthModeEnabled(): boolean {
    return this.isOAuthMode;
  }

  /**
   * Returns true if the MSAL cache contains more than one account.
   * Used to decide whether to inject the `account` parameter into tool schemas.
   */
  async isMultiAccount(): Promise<boolean> {
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    return accounts.length > 1;
  }

  /**
   * Acquires a token for a specific account identified by username (email) or homeAccountId,
   * WITHOUT changing the persisted selectedAccountId.
   *
   * Resolution order:
   *  1. Exact match on username (case-insensitive)
   *  2. Exact match on homeAccountId
   *  3. If identifier is empty/undefined AND only 1 account exists → auto-select
   *  4. If identifier is empty/undefined AND multiple accounts → use selectedAccountId or throw
   *
   * @returns The access token string.
   */
  async getTokenForAccount(identifier?: string): Promise<string> {
    if (this.isOAuthMode && this.oauthToken) {
      return this.oauthToken;
    }

    const accounts = await this.msalApp.getTokenCache().getAllAccounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please login first.');
    }

    let targetAccount: AccountInfo | null = null;

    if (identifier) {
      const lowerIdentifier = identifier.toLowerCase();

      // Try username (email) match first
      targetAccount = accounts.find(
        (a: AccountInfo) => a.username?.toLowerCase() === lowerIdentifier
      ) ?? null;

      // Fall back to homeAccountId match
      if (!targetAccount) {
        targetAccount = accounts.find(
          (a: AccountInfo) => a.homeAccountId === identifier
        ) ?? null;
      }

      if (!targetAccount) {
        const availableAccounts = accounts.map((a: AccountInfo) => a.username || a.homeAccountId).join(', ');
        throw new Error(
          `Account '${identifier}' not found. Available accounts: ${availableAccounts}`
        );
      }
    } else {
      // No identifier provided
      if (accounts.length === 1) {
        targetAccount = accounts[0];
      } else {
        // Multiple accounts: resolve by explicit selectedAccountId only — never fall back to accounts[0].
        // getCurrentAccount() has backward-compat fallback to first account which is unsafe for multi-account routing.
        if (this.selectedAccountId) {
          targetAccount = accounts.find(
            (a: AccountInfo) => a.homeAccountId === this.selectedAccountId
          ) ?? null;
        }
        if (!targetAccount) {
          const availableAccounts = accounts.map((a: AccountInfo) => a.username || a.homeAccountId).join(', ');
          throw new Error(
            `Multiple accounts configured but no 'account' parameter provided and no default selected. ` +
            `Available accounts: ${availableAccounts}. ` +
            `Pass account="<email>" in your tool call or use select-account to set a default.`
          );
        }
      }
    }

    const silentRequest = {
      account: targetAccount,
      scopes: this.scopes,
    };

    try {
      const response = await this.msalApp.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch {
      throw new Error(
        `Failed to acquire token for account '${targetAccount.username || targetAccount.homeAccountId}'. ` +
        `The token may have expired. Please re-login with: --login`
      );
    }
  }
}

export default AuthManager;
export { buildScopesFromEndpoints, getTokenCachePath, getSelectedAccountPath };

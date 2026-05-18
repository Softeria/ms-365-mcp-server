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
      // Normalize ESM/CJS interop: under Node 24+ `await import('keytar')` returns a
      // namespace object whose top-level `setPassword` is undefined (functions live on
      // `.default`). On older Node and pure CJS, methods live on the namespace itself.
      // Falling back to the namespace keeps backward compatibility. See issue #418.
      const mod = (await import('keytar')) as typeof import('keytar') & {
        default?: typeof import('keytar');
      };
      keytar = mod.default ?? mod;
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
  readOnly?: boolean;
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

function wrapCache(data: string): string {
  return JSON.stringify({ _cacheEnvelope: true, data, savedAt: Date.now() });
}

function unwrapCache(raw: string): { data: string; savedAt?: number } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed._cacheEnvelope && typeof parsed.data === 'string') {
      return { data: parsed.data, savedAt: parsed.savedAt };
    }
  } catch {
    // not our envelope format
  }
  return { data: raw };
}

function pickNewest(
  keytarRaw: string | undefined,
  fileRaw: string | undefined
): string | undefined {
  if (!keytarRaw && !fileRaw) return undefined;
  if (keytarRaw && !fileRaw) return unwrapCache(keytarRaw).data;
  if (!keytarRaw && fileRaw) return unwrapCache(fileRaw).data;

  const kt = unwrapCache(keytarRaw!);
  const file = unwrapCache(fileRaw!);

  if (kt.savedAt === undefined && file.savedAt === undefined) return kt.data;
  if (kt.savedAt !== undefined && file.savedAt === undefined) return kt.data;
  if (kt.savedAt === undefined && file.savedAt !== undefined) return file.data;
  return kt.savedAt! >= file.savedAt! ? kt.data : file.data;
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

interface AllowedScopeOptions {
  orgMode?: boolean;
  enabledTools?: string;
  readOnly?: boolean;
  allowedScopes?: string;
}

interface DisabledToolScope {
  toolName: string;
  requiredScopes: string[];
  missingScopes: string[];
}

interface ScopeDiagnostics {
  permissions: string[];
  toolPermissions: string[];
  effectivePermissions: string[];
  allowedScopes?: string[];
  disabledTools: DisabledToolScope[];
  missingAllowedScopesForTools: string[];
  extraAllowedScopesNotUsedByTools: string[];
}

function parseAllowedScopes(value?: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.from(new Set(value.trim().split(/\s+/).filter(Boolean)));
}

function getEndpointRequiredScopes(
  endpoint: Pick<EndpointConfig, 'scopes' | 'workScopes'> | undefined,
  includeWorkAccountScopes: boolean = false
): string[] {
  if (!endpoint) {
    return [];
  }

  const scopes = new Set<string>();
  if (endpoint.scopes && Array.isArray(endpoint.scopes)) {
    endpoint.scopes.forEach((scope) => scopes.add(scope));
  }
  if (includeWorkAccountScopes && endpoint.workScopes && Array.isArray(endpoint.workScopes)) {
    endpoint.workScopes.forEach((scope) => scopes.add(scope));
  }
  return Array.from(scopes);
}

function collapseRedundantScopes(scopes: string[]): string[] {
  const scopesSet = new Set(scopes);

  // Scope hierarchy: if we have BOTH a higher scope (ReadWrite) AND lower scopes (Read),
  // keep only the higher scope since it includes the permissions of the lower scopes.
  // Do NOT upgrade Read to ReadWrite if we only have Read scopes.
  Object.entries(SCOPE_HIERARCHY).forEach(([higherScope, lowerScopes]) => {
    if (scopesSet.has(higherScope) && lowerScopes.every((scope) => scopesSet.has(scope))) {
      lowerScopes.forEach((scope) => scopesSet.delete(scope));
    }
  });

  return Array.from(scopesSet);
}

function buildScopesFromEndpoints(
  includeWorkAccountScopes: boolean = false,
  enabledToolsPattern?: string,
  readOnly: boolean = false
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
    // Skip write operations in read-only mode
    if (readOnly && endpoint.method.toUpperCase() !== 'GET') {
      if (!(endpoint.method.toUpperCase() === 'POST' && endpoint.readOnly)) {
        return;
      }
    }

    // Skip endpoints that don't match the tool filter
    if (enabledToolsRegex && !enabledToolsRegex.test(endpoint.toolName)) {
      return;
    }

    // Skip endpoints that only have workScopes if not in work mode
    if (!includeWorkAccountScopes && !endpoint.scopes && endpoint.workScopes) {
      return;
    }

    getEndpointRequiredScopes(endpoint, includeWorkAccountScopes).forEach((scope) =>
      scopesSet.add(scope)
    );
  });

  const scopes = collapseRedundantScopes(Array.from(scopesSet));
  if (enabledToolsPattern) {
    logger.info(`Built ${scopes.length} scopes for filtered tools: ${scopes.join(', ')}`);
  }

  return scopes;
}

function lowerScopesFor(scope: string): string[] {
  const lowerScopes = new Set(SCOPE_HIERARCHY[scope] ?? []);

  if (scope.endsWith('.ReadWrite.All')) {
    const readAllScope = scope.replace(/\.ReadWrite\.All$/, '.Read.All');
    const readWriteScope = scope.replace(/\.ReadWrite\.All$/, '.ReadWrite');
    const readScope = scope.replace(/\.ReadWrite\.All$/, '.Read');
    lowerScopes.add(readAllScope);
    lowerScopes.add(readWriteScope);
    lowerScopes.add(readScope);
  } else if (scope.endsWith('.ReadWrite.Shared')) {
    lowerScopes.add(scope.replace(/\.ReadWrite\.Shared$/, '.Read.Shared'));
  } else if (scope.endsWith('.ReadWrite')) {
    lowerScopes.add(scope.replace(/\.ReadWrite$/, '.Read'));
  } else if (scope.endsWith('.Read.All')) {
    lowerScopes.add(scope.replace(/\.Read\.All$/, '.Read'));
  }

  return Array.from(lowerScopes);
}

function addImpliedScopes(scope: string, scopesSet: Set<string>): void {
  for (const lowerScope of lowerScopesFor(scope)) {
    if (!scopesSet.has(lowerScope)) {
      scopesSet.add(lowerScope);
      addImpliedScopes(lowerScope, scopesSet);
    }
  }
}

function collapseScopeHierarchy(scopes: string[]): string[] {
  const scopesSet = new Set(scopes);
  for (const scope of scopes) {
    addImpliedScopes(scope, scopesSet);
  }
  return Array.from(scopesSet);
}

function getMissingAllowedScopes(requiredScopes: string[], allowedScopes?: string[]): string[] {
  if (allowedScopes === undefined) {
    return [];
  }

  const coveredAllowedScopes = new Set(collapseScopeHierarchy(allowedScopes));
  return requiredScopes.filter((scope) => !coveredAllowedScopes.has(scope));
}

function isEndpointCoveredByAllowedScopes(
  endpoint: Pick<EndpointConfig, 'scopes' | 'workScopes'> | undefined,
  includeWorkAccountScopes: boolean,
  allowedScopes?: string[]
): boolean {
  return (
    getMissingAllowedScopes(
      getEndpointRequiredScopes(endpoint, includeWorkAccountScopes),
      allowedScopes
    ).length === 0
  );
}

function isScopeUsedByTools(allowedScope: string, toolScopes: string[]): boolean {
  const coveredByAllowedScope = new Set(collapseScopeHierarchy([allowedScope]));
  return toolScopes.some((scope) => coveredByAllowedScope.has(scope));
}

function endpointMatchesNormalToolSurface(
  endpoint: EndpointConfig,
  includeWorkAccountScopes: boolean,
  enabledToolsRegex?: RegExp,
  readOnly: boolean = false
): boolean {
  if (readOnly && endpoint.method.toUpperCase() !== 'GET') {
    if (!(endpoint.method.toUpperCase() === 'POST' && endpoint.readOnly)) {
      return false;
    }
  }

  if (enabledToolsRegex && !enabledToolsRegex.test(endpoint.toolName)) {
    return false;
  }

  if (!includeWorkAccountScopes && !endpoint.scopes && endpoint.workScopes) {
    return false;
  }

  return true;
}

function buildAllowedScopeDiagnostics(options: AllowedScopeOptions = {}): ScopeDiagnostics {
  const allowedScopes = parseAllowedScopes(options.allowedScopes);
  let enabledToolsRegex: RegExp | undefined;
  if (options.enabledTools) {
    try {
      enabledToolsRegex = new RegExp(options.enabledTools, 'i');
    } catch {
      logger.error(
        `Invalid tool filter regex pattern: ${options.enabledTools}. Building diagnostics without filter.`
      );
    }
  }

  const normalToolScopes = new Set<string>();
  const effectiveToolScopes = new Set<string>();
  const disabledTools: DisabledToolScope[] = [];

  for (const endpoint of endpoints.default) {
    if (
      !endpointMatchesNormalToolSurface(
        endpoint,
        Boolean(options.orgMode),
        enabledToolsRegex,
        Boolean(options.readOnly)
      )
    ) {
      continue;
    }

    const requiredScopes = getEndpointRequiredScopes(endpoint, Boolean(options.orgMode));
    requiredScopes.forEach((scope) => normalToolScopes.add(scope));

    const missingScopes = getMissingAllowedScopes(requiredScopes, allowedScopes);
    if (missingScopes.length > 0) {
      disabledTools.push({
        toolName: endpoint.toolName,
        requiredScopes: requiredScopes.sort((a, b) => a.localeCompare(b)),
        missingScopes: missingScopes.sort((a, b) => a.localeCompare(b)),
      });
      continue;
    }

    requiredScopes.forEach((scope) => effectiveToolScopes.add(scope));
  }

  const toolPermissions = collapseRedundantScopes(Array.from(normalToolScopes)).sort((a, b) =>
    a.localeCompare(b)
  );
  const effectivePermissions = collapseRedundantScopes(Array.from(effectiveToolScopes)).sort(
    (a, b) => a.localeCompare(b)
  );
  const sortedAllowedScopes = allowedScopes
    ? [...allowedScopes].sort((a, b) => a.localeCompare(b))
    : undefined;
  const missingAllowedScopesForTools = Array.from(
    new Set(disabledTools.flatMap((tool) => tool.missingScopes))
  ).sort((a, b) => a.localeCompare(b));
  const extraAllowedScopesNotUsedByTools =
    sortedAllowedScopes?.filter((scope) => !isScopeUsedByTools(scope, effectivePermissions)) ?? [];

  return {
    permissions: effectivePermissions,
    toolPermissions,
    effectivePermissions,
    ...(sortedAllowedScopes ? { allowedScopes: sortedAllowedScopes } : {}),
    disabledTools,
    missingAllowedScopesForTools,
    extraAllowedScopesNotUsedByTools,
  };
}

function resolveAuthScopes(options: AllowedScopeOptions = {}): string[] {
  return buildAllowedScopeDiagnostics(options).effectivePermissions;
}

function buildScopeDiagnostics(
  toolScopes: string[],
  allowedScopesInput: string[]
): ScopeDiagnostics {
  const toolPermissions = [...toolScopes].sort((a, b) => a.localeCompare(b));
  const coveredAllowedScopes = new Set(collapseScopeHierarchy(allowedScopesInput));
  const missingAllowedScopesForTools = toolPermissions.filter(
    (scope) => !coveredAllowedScopes.has(scope)
  );

  return {
    permissions: toolPermissions.filter((scope) => coveredAllowedScopes.has(scope)),
    toolPermissions,
    effectivePermissions: toolPermissions.filter((scope) => coveredAllowedScopes.has(scope)),
    allowedScopes: [...allowedScopesInput].sort((a, b) => a.localeCompare(b)),
    disabledTools: [],
    missingAllowedScopesForTools,
    extraAllowedScopesNotUsedByTools: [...allowedScopesInput]
      .sort((a, b) => a.localeCompare(b))
      .filter((scope) => !isScopeUsedByTools(scope, toolPermissions)),
  };
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
  private useInteractiveAuth: boolean;

  constructor(config: Configuration, scopes: string[] = []) {
    logger.info(`And scopes are ${scopes.join(', ')}`, scopes);
    this.config = config;
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(this.config);
    this.accessToken = null;
    this.tokenExpiry = null;
    this.selectedAccountId = null;
    this.useInteractiveAuth = false;

    const oauthTokenFromEnv = process.env.MS365_MCP_OAUTH_TOKEN;
    this.oauthToken = oauthTokenFromEnv ?? null;
    this.isOAuthMode = oauthTokenFromEnv != null;
  }

  /**
   * Creates an AuthManager instance with secrets loaded from the configured provider.
   * Uses Key Vault if MS365_MCP_KEYVAULT_URL is set, otherwise environment variables.
   */
  static async create(scopes: string[] = []): Promise<AuthManager> {
    const secrets = await getSecrets();
    const config = createMsalConfig(secrets);
    return new AuthManager(config, scopes);
  }

  async loadTokenCache(): Promise<void> {
    try {
      let keytarRaw: string | undefined;
      try {
        const kt = await getKeytar();
        if (kt) {
          keytarRaw = (await kt.getPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT)) ?? undefined;
        }
      } catch (keytarError) {
        logger.warn(`Keychain access failed: ${(keytarError as Error).message}`);
      }

      let fileRaw: string | undefined;
      const cachePath = getTokenCachePath();
      if (existsSync(cachePath)) {
        fileRaw = readFileSync(cachePath, 'utf8');
      }

      const cacheData = pickNewest(keytarRaw, fileRaw);
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
      let keytarRaw: string | undefined;
      try {
        const kt = await getKeytar();
        if (kt) {
          keytarRaw = (await kt.getPassword(SERVICE_NAME, SELECTED_ACCOUNT_KEY)) ?? undefined;
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain access failed for selected account: ${(keytarError as Error).message}`
        );
      }

      let fileRaw: string | undefined;
      const accountPath = getSelectedAccountPath();
      if (existsSync(accountPath)) {
        fileRaw = readFileSync(accountPath, 'utf8');
      }

      const selectedAccountData = pickNewest(keytarRaw, fileRaw);
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
      const stamped = wrapCache(this.msalApp.getTokenCache().serialize());

      try {
        const kt = await getKeytar();
        if (kt) {
          await kt.setPassword(SERVICE_NAME, TOKEN_CACHE_ACCOUNT, stamped);
        } else {
          const cachePath = getTokenCachePath();
          ensureParentDir(cachePath);
          fs.writeFileSync(cachePath, stamped, { mode: 0o600 });
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain save failed, falling back to file storage: ${(keytarError as Error).message}`
        );

        const cachePath = getTokenCachePath();
        ensureParentDir(cachePath);
        fs.writeFileSync(cachePath, stamped, { mode: 0o600 });
      }
    } catch (error) {
      logger.error(`Error saving token cache: ${(error as Error).message}`);
    }
  }

  private async saveSelectedAccount(): Promise<void> {
    try {
      const stamped = wrapCache(JSON.stringify({ accountId: this.selectedAccountId }));

      try {
        const kt = await getKeytar();
        if (kt) {
          await kt.setPassword(SERVICE_NAME, SELECTED_ACCOUNT_KEY, stamped);
        } else {
          const accountPath = getSelectedAccountPath();
          ensureParentDir(accountPath);
          fs.writeFileSync(accountPath, stamped, { mode: 0o600 });
        }
      } catch (keytarError) {
        logger.warn(
          `Keychain save failed for selected account, falling back to file storage: ${(keytarError as Error).message}`
        );

        const accountPath = getSelectedAccountPath();
        ensureParentDir(accountPath);
        fs.writeFileSync(accountPath, stamped, { mode: 0o600 });
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

  setUseInteractiveAuth(value: boolean): void {
    this.useInteractiveAuth = value;
  }

  getUseInteractiveAuth(): boolean {
    return this.useInteractiveAuth;
  }

  async acquireTokenInteractive(hack?: (message: string) => void): Promise<string | null> {
    const open = (await import('open')).default;

    const interactiveRequest = {
      scopes: this.scopes,
      openBrowser: async (url: string) => {
        const message = 'Opening browser for Microsoft sign-in...';
        if (hack) {
          hack(message);
        }
        logger.info(message);
        await open(url);
      },
      successTemplate:
        '<h1>Authentication successful!</h1><p>You can close this window and return to your application.</p>',
      errorTemplate: '<h1>Authentication failed</h1><p>Something went wrong. Please try again.</p>',
    };

    try {
      logger.info('Requesting interactive browser login...');
      logger.info(`Requesting scopes: ${this.scopes.join(', ')}`);
      const response = await this.msalApp.acquireTokenInteractive(interactiveRequest);
      logger.info(`Granted scopes: ${response?.scopes?.join(', ') || 'none'}`);
      logger.info('Interactive browser login successful');
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
      logger.error(`Error in interactive browser flow: ${(error as Error).message}`);
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

  async selectAccount(identifier: string): Promise<boolean> {
    const account = await this.resolveAccount(identifier);

    this.selectedAccountId = account.homeAccountId;
    await this.saveSelectedAccount();

    // Clear cached tokens to force refresh with new account
    this.accessToken = null;
    this.tokenExpiry = null;

    logger.info(`Selected account: ${account.username} (${account.homeAccountId})`);
    return true;
  }

  async removeAccount(identifier: string): Promise<boolean> {
    const account = await this.resolveAccount(identifier);

    try {
      await this.msalApp.getTokenCache().removeAccount(account);

      // If this was the selected account, clear the selection
      if (this.selectedAccountId === account.homeAccountId) {
        this.selectedAccountId = null;
        await this.saveSelectedAccount();
        this.accessToken = null;
        this.tokenExpiry = null;
      }

      logger.info(`Removed account: ${account.username} (${account.homeAccountId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove account ${identifier}: ${(error as Error).message}`);
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
   * Resolves an account by identifier (email or homeAccountId).
   * Resolution: username match (case-insensitive) → homeAccountId match → throw.
   */
  async resolveAccount(identifier: string): Promise<AccountInfo> {
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please login first.');
    }

    const lowerIdentifier = identifier.toLowerCase();

    // Try username (email) match first
    let account =
      accounts.find((a: AccountInfo) => a.username?.toLowerCase() === lowerIdentifier) ?? null;

    // Fall back to homeAccountId match
    if (!account) {
      account = accounts.find((a: AccountInfo) => a.homeAccountId === identifier) ?? null;
    }

    if (!account) {
      const availableAccounts = accounts
        .map((a: AccountInfo) => a.username || a.name || 'unknown')
        .join(', ');
      throw new Error(
        `Account '${identifier}' not found. Available accounts: ${availableAccounts}`
      );
    }

    return account;
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

    let targetAccount: AccountInfo | null = null;

    if (identifier) {
      // resolveAccount handles empty-cache check internally
      targetAccount = await this.resolveAccount(identifier);
    } else {
      const accounts = await this.msalApp.getTokenCache().getAllAccounts();

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please login first.');
      }
      // No identifier provided
      if (accounts.length === 1) {
        targetAccount = accounts[0];
      } else {
        // Multiple accounts: resolve by explicit selectedAccountId only — never fall back to accounts[0].
        // getCurrentAccount() has backward-compat fallback to first account which is unsafe for multi-account routing.
        if (this.selectedAccountId) {
          targetAccount =
            accounts.find((a: AccountInfo) => a.homeAccountId === this.selectedAccountId) ?? null;
        }
        if (!targetAccount) {
          const availableAccounts = accounts
            .map((a: AccountInfo) => a.username || a.name || 'unknown')
            .join(', ');
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
      await this.saveTokenCache();
      return response.accessToken;
    } catch {
      throw new Error(
        `Failed to acquire token for account '${targetAccount.username || targetAccount.name || 'unknown'}'. ` +
          `The token may have expired. Please re-login with: --login`
      );
    }
  }
}

export default AuthManager;
export {
  buildAllowedScopeDiagnostics,
  buildScopesFromEndpoints,
  buildScopeDiagnostics,
  collapseScopeHierarchy,
  getEndpointRequiredScopes,
  getMissingAllowedScopes,
  getTokenCachePath,
  getSelectedAccountPath,
  isEndpointCoveredByAllowedScopes,
  parseAllowedScopes,
  resolveAuthScopes,
  wrapCache,
  unwrapCache,
  pickNewest,
};

import type { AccountInfo, Configuration } from '@azure/msal-node';
import { AuthError, PublicClientApplication } from '@azure/msal-node';
import logger from './logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId } from './cloud-config.js';
import {
  createTokenCacheStorage,
  DefaultTokenCacheStorage,
  getSelectedAccountPath,
  getTokenCachePath,
  pickNewest,
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
  presets?: string[]; // Presets this endpoint belongs to (mail, outlook, personal, ...)
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as EndpointConfig[];

const endpoints = {
  default: endpointsData,
};

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
  // Sites.Selected is a site-scoped replacement for the broad Sites permissions.
  // Treat it as covering all three so that --allowed-scopes Sites.Selected enables
  // SharePoint tools without requiring Sites.Read.All / Sites.ReadWrite.All / Sites.Manage.All
  // in the app registration.
  'Sites.Selected': ['Sites.Read.All', 'Sites.ReadWrite.All', 'Sites.Manage.All'],
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

  // Scope hierarchy: if a higher scope is present, remove any of its lower scopes
  // that are also in the set — the higher scope already implies them.
  // Each lower scope is removed independently; we do not require all lower scopes
  // to be present (e.g. Sites.Selected implies Sites.Read.All even when
  // Sites.ReadWrite.All / Sites.Manage.All are absent).
  // Do NOT upgrade Read to ReadWrite if we only have Read scopes.
  Object.entries(SCOPE_HIERARCHY).forEach(([higherScope, lowerScopes]) => {
    if (scopesSet.has(higherScope)) {
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
    } catch {
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

interface ExpectedAccountOptions {
  expectedUsername?: string;
  expectedHomeAccountId?: string;
}

interface AuthManagerCreateOptions {
  storage?: TokenCacheStorage;
}

/**
 * Summarises a silent-acquire failure for logging. MSAL throws AuthError subclasses
 * (e.g. InteractionRequiredAuthError) whose errorCode, subError and correlationId pin
 * the cause, such as invalid_grant from the token endpoint or interaction_required.
 * The log formatter only emits `message`, so the codes are folded into the string here.
 */
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
  private accessToken: string | null;
  private tokenExpiry: number | null;
  private oauthToken: string | null;
  private isOAuthMode: boolean;
  private selectedAccountId: string | null;
  private useInteractiveAuth: boolean;
  private expectedUsername: string | null;
  private expectedHomeAccountId: string | null;
  private storage: TokenCacheStorage;

  constructor(
    config: Configuration,
    scopes: string[] = [],
    expectedAccount?: ExpectedAccountOptions,
    storage?: TokenCacheStorage
  ) {
    logger.info(`And scopes are ${scopes.join(', ')}`, scopes);
    this.config = config;
    this.scopes = scopes;
    this.msalApp = new PublicClientApplication(this.config);
    this.accessToken = null;
    this.tokenExpiry = null;
    this.selectedAccountId = null;
    this.useInteractiveAuth = false;
    this.expectedUsername = this.normalizeExpectedUsername(expectedAccount?.expectedUsername);
    this.expectedHomeAccountId = this.normalizeExpectedHomeAccountId(
      expectedAccount?.expectedHomeAccountId
    );
    this.storage = storage ?? new DefaultTokenCacheStorage();

    const oauthTokenFromEnv = process.env.MS365_MCP_OAUTH_TOKEN;
    this.oauthToken = oauthTokenFromEnv ?? null;
    this.isOAuthMode = oauthTokenFromEnv != null;
  }

  /**
   * Creates an AuthManager instance with secrets loaded from the configured provider.
   * Uses Key Vault if MS365_MCP_KEYVAULT_URL is set, otherwise environment variables.
   */
  static async create(
    scopes: string[] = [],
    expectedAccount?: ExpectedAccountOptions,
    options: AuthManagerCreateOptions = {}
  ): Promise<AuthManager> {
    const secrets = await getSecrets();
    const config = createMsalConfig(secrets);
    const storage =
      options.storage ??
      (await createTokenCacheStorage({ allowCommandStorage: false, logProvider: true }));
    return new AuthManager(config, scopes, expectedAccount, storage);
  }

  async loadTokenCache(): Promise<void> {
    try {
      const cacheRaw = await this.storage.load('token-cache');
      if (cacheRaw) {
        this.msalApp.getTokenCache().deserialize(unwrapCache(cacheRaw).data);
      }

      // Load selected account
      await this.loadSelectedAccount();
    } catch (error) {
      logger.error(`Error loading token cache: ${(error as Error).message}`);
      if (this.storage.failClosed) {
        throw error;
      }
    }
  }

  private async loadSelectedAccount(): Promise<void> {
    try {
      const selectedAccountRaw = await this.storage.load('selected-account');
      if (selectedAccountRaw) {
        const parsed = JSON.parse(unwrapCache(selectedAccountRaw).data);
        this.selectedAccountId = parsed.accountId;
        logger.info(`Loaded selected account: ${this.selectedAccountId}`);
      }
    } catch (error) {
      logger.error(`Error loading selected account: ${(error as Error).message}`);
      if (this.storage.failClosed) {
        throw error;
      }
    }
  }

  async saveTokenCache(): Promise<void> {
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

  private async saveSelectedAccount(): Promise<void> {
    try {
      const stamped = wrapCache(JSON.stringify({ accountId: this.selectedAccountId }));
      await this.storage.save('selected-account', stamped);
    } catch (error) {
      logger.error(`Error saving selected account: ${(error as Error).message}`);
      if (this.storage.failClosed) {
        throw error;
      }
    }
  }

  private normalizeExpectedUsername(value?: string): string | null {
    if (value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new Error('Expected Microsoft account username was provided but is empty.');
    }
    return trimmed.toLowerCase();
  }

  private normalizeExpectedHomeAccountId(value?: string): string | null {
    if (value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new Error('Expected Microsoft account homeAccountId was provided but is empty.');
    }
    return trimmed;
  }

  hasExpectedAccount(): boolean {
    return this.expectedUsername !== null || this.expectedHomeAccountId !== null;
  }

  private expectedAccountLabel(): string {
    const parts: string[] = [];
    if (this.expectedUsername) {
      parts.push(`username ${this.expectedUsername}`);
    }
    if (this.expectedHomeAccountId) {
      parts.push(`homeAccountId ${this.expectedHomeAccountId}`);
    }
    return parts.join(' and ');
  }

  private describeAccount(account: AccountInfo | null | undefined): string {
    return account?.username || account?.name || 'unknown';
  }

  private describeCachedAccounts(accounts: AccountInfo[]): string {
    if (accounts.length === 0) {
      return 'none';
    }
    return accounts.map((account) => this.describeAccount(account)).join(', ');
  }

  private accountMatchesExpected(account: AccountInfo | null | undefined): boolean {
    if (!this.hasExpectedAccount() || !account) {
      return !this.hasExpectedAccount();
    }
    if (this.expectedUsername && account.username?.toLowerCase() !== this.expectedUsername) {
      return false;
    }
    if (this.expectedHomeAccountId && account.homeAccountId !== this.expectedHomeAccountId) {
      return false;
    }
    return true;
  }

  private buildExpectedAccountMissingError(accounts: AccountInfo[]): Error {
    return new Error(
      `Expected Microsoft account '${this.expectedAccountLabel()}' not found in token cache. ` +
        `Cached accounts: ${this.describeCachedAccounts(accounts)}. ` +
        'Run --login after configuring the expected account, or use --select-account to recover.'
    );
  }

  private resolveExpectedAccountFromAccounts(accounts: AccountInfo[]): AccountInfo {
    if (!this.hasExpectedAccount()) {
      throw new Error('No expected Microsoft account is configured.');
    }

    const usernameMatch = this.expectedUsername
      ? accounts.find((account) => account.username?.toLowerCase() === this.expectedUsername)
      : undefined;
    const homeAccountIdMatch = this.expectedHomeAccountId
      ? accounts.find((account) => account.homeAccountId === this.expectedHomeAccountId)
      : undefined;

    if (this.expectedUsername && this.expectedHomeAccountId) {
      if (!usernameMatch || !homeAccountIdMatch) {
        throw this.buildExpectedAccountMissingError(accounts);
      }
      if (usernameMatch.homeAccountId !== homeAccountIdMatch.homeAccountId) {
        throw new Error(
          `Expected Microsoft account pins conflict: username ${this.expectedUsername} matched ` +
            `${this.describeAccount(usernameMatch)}, but homeAccountId ${this.expectedHomeAccountId} matched ` +
            `${this.describeAccount(homeAccountIdMatch)}.`
        );
      }
      return usernameMatch;
    }

    const expectedAccount = usernameMatch ?? homeAccountIdMatch;
    if (!expectedAccount) {
      throw this.buildExpectedAccountMissingError(accounts);
    }
    return expectedAccount;
  }

  async assertExpectedAccountAvailable(): Promise<void> {
    if (!this.hasExpectedAccount()) {
      return;
    }
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();
    this.resolveExpectedAccountFromAccounts(accounts);
  }

  private async rejectUnexpectedLoginAccount(
    account: AccountInfo | null | undefined
  ): Promise<void> {
    if (!this.hasExpectedAccount()) {
      return;
    }

    if (this.accountMatchesExpected(account)) {
      return;
    }

    this.accessToken = null;
    this.tokenExpiry = null;

    if (account) {
      try {
        await this.msalApp.getTokenCache().removeAccount(account);
      } catch (error) {
        logger.warn(`Failed to remove unexpected account from cache: ${(error as Error).message}`);
      }
      throw new Error(
        `Authenticated Microsoft account '${this.describeAccount(account)}' does not match expected Microsoft account '${this.expectedAccountLabel()}'. Login was not persisted.`
      );
    }

    throw new Error(
      `Microsoft login did not return an account. Expected Microsoft account '${this.expectedAccountLabel()}'. Login was not persisted.`
    );
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
      } catch (error) {
        logger.error(`Silent token acquisition failed: ${describeAuthError(error)}`);
        throw new Error('Silent token acquisition failed');
      }
    }

    throw new Error('No valid token found');
  }

  async getCurrentAccount(): Promise<AccountInfo | null> {
    const accounts = await this.msalApp.getTokenCache().getAllAccounts();

    if (this.hasExpectedAccount()) {
      return this.resolveExpectedAccountFromAccounts(accounts);
    }

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
      await this.rejectUnexpectedLoginAccount(response?.account);

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
      await this.rejectUnexpectedLoginAccount(response?.account);

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

      await this.storage.delete('token-cache');
      await this.storage.delete('selected-account');

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
    if (this.hasExpectedAccount() && !this.accountMatchesExpected(account)) {
      throw new Error(
        `Account '${identifier}' does not match expected Microsoft account '${this.expectedAccountLabel()}'.`
      );
    }

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
    if (this.hasExpectedAccount()) {
      return false;
    }
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
      // Refuse instead of silently returning the bearer's identity (discussion #467):
      // in OAuth mode the token comes from the connecting client and cannot be
      // switched to a cached MSAL account.
      if (identifier) {
        throw new Error(
          `Cannot switch to account '${identifier}': the server is in OAuth mode and always uses ` +
            `the identity of the supplied bearer token. Account switching requires stdio mode ` +
            `(or HTTP with --trust-proxy-auth).`
        );
      }
      return this.oauthToken;
    }

    let targetAccount: AccountInfo | null = null;

    if (this.hasExpectedAccount()) {
      const accounts = await this.msalApp.getTokenCache().getAllAccounts();
      targetAccount = this.resolveExpectedAccountFromAccounts(accounts);
      if (identifier) {
        const requestedAccount = await this.resolveAccount(identifier);
        if (requestedAccount.homeAccountId !== targetAccount.homeAccountId) {
          throw new Error(
            `Account '${identifier}' does not match expected Microsoft account '${this.expectedAccountLabel()}'.`
          );
        }
      }
    } else if (identifier) {
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
    } catch (error) {
      logger.error(`Silent token acquisition failed: ${describeAuthError(error)}`);
      throw new Error(
        `Failed to acquire token for account '${targetAccount.username || targetAccount.name || 'unknown'}'. ` +
          `The token may have expired. Please re-login with: --login`
      );
    }
  }
}

export default AuthManager;
export {
  type AuthManagerCreateOptions,
  type ExpectedAccountOptions,
  buildAllowedScopeDiagnostics,
  buildScopesFromEndpoints,
  buildScopeDiagnostics,
  collapseScopeHierarchy,
  getEndpointRequiredScopes,
  getMissingAllowedScopes,
  getTokenCachePath,
  getSelectedAccountPath,
  parseAllowedScopes,
  resolveAuthScopes,
  wrapCache,
  unwrapCache,
  pickNewest,
};

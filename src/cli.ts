import { Command, Option } from 'commander';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCombinedPresetPattern, listPresets, presetRequiresOrgMode } from './tool-categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

program
  .name('ms-365-mcp-server')
  .description('Microsoft 365 MCP Server')
  .version(version)
  .option('-v', 'Enable verbose logging')
  .option('--login', 'Login to Microsoft account')
  .option('--logout', 'Log out and clear saved credentials')
  .option('--verify-login', 'Verify login without starting the server')
  .option('--list-accounts', 'List all cached accounts')
  .option('--select-account <accountId>', 'Select a specific account by ID')
  .option('--remove-account <accountId>', 'Remove a specific account by ID')
  .option(
    '--expected-username <username>',
    'Require local MSAL authentication to use this Microsoft account username'
  )
  .option(
    '--expected-home-account-id <id>',
    'Require local MSAL authentication to use this exact MSAL homeAccountId'
  )
  .option('--read-only', 'Start server in read-only mode, disabling write operations')
  .option(
    '--http [address]',
    'Use Streamable HTTP transport instead of stdio. Format: [host:]port (e.g., "localhost:3000", ":3000", "3000"). Default: all interfaces on port 3000'
  )
  .option(
    '--enable-auth-tools',
    'Enable login/logout tools when using HTTP mode (disabled by default in HTTP mode)'
  )
  .option(
    '--enabled-tools <pattern>',
    'Filter tools using regex pattern (e.g., "excel|contact" to enable Excel and Contact tools)'
  )
  .option(
    '--allowed-scopes <scopes>',
    'Limit exposed tools to Graph scopes covered by this whitespace-separated allowlist'
  )
  .option(
    '--preset <names>',
    'Use preset tool categories (comma-separated). Available: mail, calendar, files, personal, work, excel, contacts, tasks, onenote, search, users, all'
  )
  .option('--list-presets', 'List all available presets and exit')
  .option('--list-permissions', 'List all required Graph API permissions and exit')
  .option(
    '--org-mode',
    'Enable organization/work mode from start (includes Teams, SharePoint, etc.)'
  )
  .option('--work-mode', 'Alias for --org-mode')
  .option('--force-work-scopes', 'Backwards compatibility alias for --org-mode (deprecated)')
  .option('--toon', '(experimental) Enable TOON output format for 30-60% token reduction')
  .option('--discovery', 'Enable runtime tool discovery and loading (experimental feature)')
  .option('--cloud <type>', 'Microsoft cloud environment: global (default) or china (21Vianet)')
  .option(
    '--enable-dynamic-registration',
    'Enable OAuth Dynamic Client Registration endpoint (kept for backwards compatibility, now enabled by default in HTTP mode)'
  )
  .option(
    '--no-dynamic-registration',
    'Disable OAuth Dynamic Client Registration endpoint in HTTP mode'
  )
  .option(
    '--auth-browser',
    'Use browser-based interactive OAuth flow instead of device code for stdio mode. Opens system browser with localhost callback for seamless sign-in.'
  )
  .option(
    '--public-url <url>',
    'Public base URL (e.g. https://mcp.example.com) used in browser-facing OAuth redirects when running behind a reverse proxy. Server-to-server endpoints (token, register) stay on the request host.'
  )
  .option(
    '--obo',
    'Enable On-Behalf-Of token exchange in HTTP mode. Exchanges the incoming bearer token for a Graph API token using the OBO flow. Requires MS365_MCP_CLIENT_SECRET.'
  )
  .option(
    '--trust-proxy-auth',
    'In HTTP mode, skip the built-in Bearer-token check on /mcp and let an upstream reverse proxy (which is presumed to have already authenticated the caller) pass requests through unauthenticated. Microsoft Graph access still flows through the locally cached MSAL refresh token via AuthManager. Use only when the server is not reachable except via a trusted proxy.'
  )
  .addOption(
    // DEPRECATED: kept only so existing deployments that set --base-url or
    // MS365_MCP_BASE_URL do not crash at startup. Use --public-url /
    // MS365_MCP_PUBLIC_URL instead. Hidden from --help; undocumented.
    new Option('--base-url <url>', 'deprecated: use --public-url').hideHelp()
  );

export interface CommandOptions {
  v?: boolean;
  login?: boolean;
  logout?: boolean;
  verifyLogin?: boolean;
  listAccounts?: boolean;
  selectAccount?: string;
  removeAccount?: string;
  expectedUsername?: string;
  expectedHomeAccountId?: string;
  readOnly?: boolean;
  http?: string | boolean;
  enableAuthTools?: boolean;
  enabledTools?: string;
  allowedScopes?: string;
  preset?: string;
  listPresets?: boolean;
  listPermissions?: boolean;
  orgMode?: boolean;
  workMode?: boolean;
  forceWorkScopes?: boolean;
  toon?: boolean;
  discovery?: boolean;
  cloud?: string;
  enableDynamicRegistration?: boolean;
  dynamicRegistration?: boolean;
  authBrowser?: boolean;
  obo?: boolean;
  trustProxyAuth?: boolean;
  publicUrl?: string;
  /** @deprecated use publicUrl */
  baseUrl?: string;

  [key: string]: unknown;
}

export function parseArgs(): CommandOptions {
  program.parse();
  const options = program.opts();

  if (options.listPresets) {
    const presets = listPresets();
    console.log(JSON.stringify({ presets }, null, 2));
    process.exit(0);
  }

  if (options.preset) {
    const presetNames = options.preset.split(',').map((p: string) => p.trim());
    try {
      options.enabledTools = getCombinedPresetPattern(presetNames);

      const requiresOrgMode = presetNames.some((preset: string) => presetRequiresOrgMode(preset));
      if (requiresOrgMode && !options.orgMode) {
        console.warn(
          `Warning: Preset(s) [${presetNames.filter((p: string) => presetRequiresOrgMode(p)).join(', ')}] require --org-mode to function properly`
        );
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  if (process.env.READ_ONLY === 'true' || process.env.READ_ONLY === '1') {
    options.readOnly = true;
  }

  if (process.env.ENABLED_TOOLS) {
    options.enabledTools = process.env.ENABLED_TOOLS;
  }

  if (options.allowedScopes === undefined && process.env.MS365_MCP_ALLOWED_SCOPES !== undefined) {
    options.allowedScopes = process.env.MS365_MCP_ALLOWED_SCOPES;
  }

  if (options.allowedScopes !== undefined && options.allowedScopes.trim() === '') {
    console.error(
      'Error: --allowed-scopes / MS365_MCP_ALLOWED_SCOPES was provided but is empty. ' +
        'Provide one or more whitespace-separated scopes, or omit it to use tool-derived scopes.'
    );
    process.exit(1);
  }

  if (
    options.expectedUsername === undefined &&
    process.env.MS365_MCP_EXPECTED_USERNAME !== undefined
  ) {
    options.expectedUsername = process.env.MS365_MCP_EXPECTED_USERNAME;
  }

  if (
    options.expectedHomeAccountId === undefined &&
    process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID !== undefined
  ) {
    options.expectedHomeAccountId = process.env.MS365_MCP_EXPECTED_HOME_ACCOUNT_ID;
  }

  if (options.expectedUsername !== undefined) {
    const expectedUsername = String(options.expectedUsername).trim();
    if (expectedUsername === '') {
      console.error(
        'Error: --expected-username / MS365_MCP_EXPECTED_USERNAME was provided but is empty. ' +
          'Provide a Microsoft account username, or omit it to allow any cached account.'
      );
      process.exit(1);
    }
    options.expectedUsername = expectedUsername;
  }

  if (options.expectedHomeAccountId !== undefined) {
    const expectedHomeAccountId = String(options.expectedHomeAccountId).trim();
    if (expectedHomeAccountId === '') {
      console.error(
        'Error: --expected-home-account-id / MS365_MCP_EXPECTED_HOME_ACCOUNT_ID was provided but is empty. ' +
          'Provide an MSAL homeAccountId, or omit it to allow any cached account.'
      );
      process.exit(1);
    }
    options.expectedHomeAccountId = expectedHomeAccountId;
  }

  // Validate tool filter regex early — fail at startup instead of silently
  // disabling the filter at runtime (which would expose all tools)
  if (options.enabledTools) {
    try {
      new RegExp(options.enabledTools, 'i');
    } catch {
      console.error(
        `Error: invalid --enabled-tools regex pattern: "${options.enabledTools}". ` +
          `Without a valid filter, all tools would be exposed.`
      );
      process.exit(1);
    }
  }

  if (process.env.MS365_MCP_ORG_MODE === 'true' || process.env.MS365_MCP_ORG_MODE === '1') {
    options.orgMode = true;
  }

  if (
    process.env.MS365_MCP_FORCE_WORK_SCOPES === 'true' ||
    process.env.MS365_MCP_FORCE_WORK_SCOPES === '1'
  ) {
    options.forceWorkScopes = true;
  }

  if (options.workMode || options.forceWorkScopes) {
    options.orgMode = true;
  }

  if (process.env.MS365_MCP_OUTPUT_FORMAT === 'toon') {
    options.toon = true;
  }

  // Dynamic registration defaults to true in HTTP mode
  // --enable-dynamic-registration (backwards compat) or --no-dynamic-registration to override
  if (options.http) {
    if (options.dynamicRegistration === false) {
      options.enableDynamicRegistration = false;
    } else {
      options.enableDynamicRegistration = true;
    }
  }

  if (process.env.MS365_MCP_OBO === 'true' || process.env.MS365_MCP_OBO === '1') {
    options.obo = true;
  }

  // Handle cloud type - CLI option takes precedence over environment variable
  if (options.cloud) {
    process.env.MS365_MCP_CLOUD_TYPE = options.cloud;
  }

  return options;
}

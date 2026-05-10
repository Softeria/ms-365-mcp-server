import { Command, Option } from 'commander';
import { spawnSync } from 'child_process';
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
  .option(
    '--health-check',
    'Probe /healthz and exit (for Docker HEALTHCHECK). In HTTP mode, performs a GET to /healthz on the configured port and exits 0 on HTTP 200, 1 otherwise. In stdio mode, exits 0 immediately (process-is-alive = healthy).'
  )
  .option(
    '--connector-doctor <publicUrl>',
    'Check public OAuth and connector metadata surfaces for connector name consistency'
  )
  .option('--observed-name <name>', 'Hosted connector display name observed in the client UI')
  .option(
    '--tenant-display-name <name>',
    'Tenant display name expected in connector metadata during --connector-doctor checks'
  )
  .option('--list-accounts', 'List all cached accounts')
  .option('--select-account <accountId>', 'Select a specific account by ID')
  .option('--remove-account <accountId>', 'Remove a specific account by ID')
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
    '--tenant-id <tenantId>',
    'Tenant ID (GUID) for multi-tenant stdio mode (plan 03-09, TRANS-03). When set, stdio loads the tenant row from Postgres and scopes the session to that tenant. Also honours MS365_MCP_TENANT_ID env var. Omit for legacy single-tenant behaviour.'
  )
  .addOption(
    // DEPRECATED: kept only so existing deployments that set --base-url or
    // MS365_MCP_BASE_URL do not crash at startup. Use --public-url /
    // MS365_MCP_PUBLIC_URL instead. Hidden from --help; undocumented.
    new Option('--base-url <url>', 'deprecated: use --public-url').hideHelp()
  )
  // No-op default action — the real startup logic lives in src/index.ts
  // main(). Commander's default behavior once a subcommand is registered
  // is to print help + exit(1) when no subcommand is given; attaching a
  // no-op action keeps the parent program runnable (so `ms-365-mcp-server
  // --http` still launches the server). parseArgs() below returns
  // program.opts() to the caller which then drives the server lifecycle.
  .action(() => {});

// One-shot migration subcommand (SECUR-07 / D-04). The heavy lifting lives
// in bin/migrate-tokens.mjs so the same script is usable both as
// `npx ms-365-mcp-server migrate-tokens` and directly with
// `node bin/migrate-tokens.mjs`. We shell out with process.execPath so
// the migrator runs under the same Node version + ESM loader.
program
  .command('migrate-tokens')
  .description('Migrate v1 OS-keychain (keytar) tokens to v2 file-based storage')
  .option('--dry-run', 'Report what would be migrated without writing')
  .option('--clear-keytar', 'Delete OS-keychain entries after successful migration')
  .action((opts: { dryRun?: boolean; clearKeytar?: boolean }) => {
    const scriptArgs: string[] = [];
    if (opts.dryRun) scriptArgs.push('--dry-run');
    if (opts.clearKeytar) scriptArgs.push('--clear-keytar');
    // Dist layout: when compiled, cli.js sits at dist/cli.js and the
    // migrator script is at <repo>/bin/migrate-tokens.mjs. Both dev (src/)
    // and prod (dist/) resolve the same relative path via __dirname.
    const scriptPath = path.resolve(__dirname, '..', 'bin', 'migrate-tokens.mjs');
    const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
      stdio: 'inherit',
    });
    process.exit(result.status ?? 1);
  });

export interface CommandOptions {
  v?: boolean;
  login?: boolean;
  logout?: boolean;
  verifyLogin?: boolean;
  healthCheck?: boolean;
  connectorDoctor?: string;
  observedName?: string;
  tenantDisplayName?: string;
  listAccounts?: boolean;
  selectAccount?: string;
  removeAccount?: string;
  readOnly?: boolean;
  http?: string | boolean;
  enableAuthTools?: boolean;
  enabledTools?: string;
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
  publicUrl?: string;
  /** @deprecated use publicUrl */
  baseUrl?: string;
  /**
   * Tenant ID (GUID) for multi-tenant stdio mode (plan 03-09, TRANS-03).
   * When present (via --tenant-id or MS365_MCP_TENANT_ID env), the stdio
   * bootstrap loads the tenant row from Postgres; otherwise the legacy
   * single-tenant AuthManager path is used.
   */
  tenantId?: string;

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

  // Handle cloud type - CLI option takes precedence over environment variable
  if (options.cloud) {
    process.env.MS365_MCP_CLOUD_TYPE = options.cloud;
  }

  return options;
}

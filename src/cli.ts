import { Command } from 'commander';
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
  .option('--login', 'Login using device code flow')
  .option('--logout', 'Log out and clear saved credentials')
  .option('--verify-login', 'Verify login without starting the server')
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
  .option(
    '--org-mode',
    'Enable organization/work mode from start (includes Teams, SharePoint, etc.)'
  )
  .option('--work-mode', 'Alias for --org-mode')
  .option('--force-work-scopes', 'Backwards compatibility alias for --org-mode (deprecated)')
  .option('--toon', '(experimental) Enable TOON output format for 30-60% token reduction')
  .option('--discovery', 'Enable runtime tool discovery and loading (experimental feature)')
  .option('--cloud <type>', 'Microsoft cloud environment: global (default) or china (21Vianet)');

export interface CommandOptions {
  v?: boolean;
  login?: boolean;
  logout?: boolean;
  verifyLogin?: boolean;
  listAccounts?: boolean;
  selectAccount?: string;
  removeAccount?: string;
  readOnly?: boolean;
  http?: string | boolean;
  enableAuthTools?: boolean;
  enabledTools?: string;
  preset?: string;
  listPresets?: boolean;
  orgMode?: boolean;
  workMode?: boolean;
  forceWorkScopes?: boolean;
  toon?: boolean;
  discovery?: boolean;
  cloud?: string;

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

  // Handle cloud type - CLI option takes precedence over environment variable
  if (options.cloud) {
    process.env.MS365_MCP_CLOUD_TYPE = options.cloud;
  }

  return options;
}

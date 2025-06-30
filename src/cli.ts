import { Command } from 'commander';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  .option('--read-only', 'Start server in read-only mode, disabling write operations')
  .option(
    '--http [port]',
    'Use Streamable HTTP transport instead of stdio (optionally specify port, default: 3000)'
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
    '--force-work-scopes',
    'Force inclusion of work account scopes during login (includes Teams, SharePoint, etc.)'
  );

export interface CommandOptions {
  v?: boolean;
  login?: boolean;
  logout?: boolean;
  verifyLogin?: boolean;
  readOnly?: boolean;
  http?: string | boolean;
  enableAuthTools?: boolean;
  enabledTools?: string;
  forceWorkScopes?: boolean;

  [key: string]: any;
}

export function parseArgs(): CommandOptions {
  program.parse();
  const options = program.opts();

  if (process.env.READ_ONLY === 'true' || process.env.READ_ONLY === '1') {
    options.readOnly = true;
  }

  if (process.env.ENABLED_TOOLS) {
    options.enabledTools = process.env.ENABLED_TOOLS;
  }

  if (
    process.env.MS365_MCP_FORCE_WORK_SCOPES === 'true' ||
    process.env.MS365_MCP_FORCE_WORK_SCOPES === '1'
  ) {
    options.forceWorkScopes = true;
  }

  return options;
}

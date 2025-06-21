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
  );

export interface CommandOptions {
  v?: boolean;
  login?: boolean;
  logout?: boolean;
  verifyLogin?: boolean;
  readOnly?: boolean;
  http?: string | boolean;
  enableAuthTools?: boolean;

  [key: string]: any;
}

export function parseArgs(): CommandOptions {
  program.parse();
  const options = program.opts();

  if (process.env.READ_ONLY === 'true' || process.env.READ_ONLY === '1') {
    options.readOnly = true;
  }

  return options;
}

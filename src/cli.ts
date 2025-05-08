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
  .option('--verify-login', 'Verify login without starting the server');

export interface CommandOptions {
  v?: boolean;
  login?: boolean;
  logout?: boolean;
  verifyLogin?: boolean;
  [key: string]: any;
}

export function parseArgs(): CommandOptions {
  program.parse();
  return program.opts();
}

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
  .name('microsoft-mcp-server')
  .description('Areté Microsoft 365 MCP Server')
  .version(version)
  .option('-v', 'Enable verbose logging')
  .option(
    '--http [address]',
    'Bind the Streamable HTTP transport. Format: [host:]port (e.g., "localhost:3000", ":3000", "3000"). Default: all interfaces on port 3000'
  )
  .option(
    '--public-url <url>',
    'Public base URL (e.g. https://mcp.example.com) used in browser-facing OAuth redirects when running behind a reverse proxy. Server-to-server endpoints (token, register) stay on the request host.'
  )
  .option('--toon', 'Enable TOON output format for 30-60% token reduction');

export interface CommandOptions {
  v?: boolean;
  http?: string | boolean;
  publicUrl?: string;
  toon?: boolean;

  [key: string]: unknown;
}

export function parseArgs(): CommandOptions {
  program.parse();
  const options = program.opts();

  if (process.env.MS365_MCP_OUTPUT_FORMAT === 'toon') {
    options.toon = true;
  }

  return options;
}

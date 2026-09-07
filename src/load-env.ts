/**
 * Loads a project-local `.env`, but only for plain app config.
 *
 * dotenv reads `.env` from `process.cwd()`. For an MCP server that directory is
 * whatever folder the client happened to launch us in, not necessarily one the
 * operator controls - clients commonly pass the open workspace through as cwd.
 * A blanket load therefore lets any file sitting in that folder set *any* of the
 * server's environment variables, including ones that run a command at startup,
 * relocate the token cache, or switch off log redaction.
 *
 * So the allowlist below is deliberately small: credentials for a custom app
 * registration, which is all `.env` was ever documented for. Everything else has
 * to come from the real environment (shell or MCP client config), where only the
 * operator can set it.
 *
 * See GHSA-9w34-3f56-vwmh.
 */

import { parse } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

export const ENV_FILE_ALLOWLIST = [
  'MS365_MCP_CLIENT_ID',
  'MS365_MCP_CLIENT_SECRET',
  'MS365_MCP_TENANT_ID',
  'MS365_MCP_CLOUD_TYPE',
];

export interface LoadEnvFileResult {
  /** Allowlisted keys taken from the file. */
  applied: string[];
  /** Keys present in the file that were refused. */
  ignored: string[];
}

export function loadEnvFile(options: { path?: string } = {}): LoadEnvFileResult {
  // parse() rather than config(): it is a pure text-to-pairs function, so the
  // file can only ever become key/value pairs. config() decides some of its own
  // behaviour from the very file we distrust - a DOTENV_CONFIG_DEBUG line inside
  // .env turns its logging back on and it writes to stdout, which is the
  // JSON-RPC channel in stdio mode - and it also resolves .env.vault from cwd.
  const file = options.path ?? path.resolve(process.cwd(), '.env');
  let fromFile: Record<string, string> = {};
  try {
    fromFile = parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // No .env here, or unreadable. Nothing to apply.
  }

  const applied: string[] = [];
  const ignored: string[] = [];

  for (const [key, value] of Object.entries(fromFile)) {
    if (!ENV_FILE_ALLOWLIST.includes(key)) {
      ignored.push(key);
      continue;
    }
    // Anything already set came from the operator, so it wins - same precedence
    // dotenv itself uses.
    if (process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = value;
    applied.push(key);
  }

  // Only our own variables: the advice below does not apply to a DATABASE_URL
  // that happens to share the file, and naming unrelated secrets on every
  // startup helps nobody.
  const ignoredOwn = ignored.filter((key) => key.startsWith('MS365_MCP_'));
  if (ignoredOwn.length > 0) {
    // Key names only, never values: a .env is exactly where secrets live.
    // stderr because stdout is the MCP transport, and the file logger is
    // invisible in stdio mode.
    console.error(
      `[ms365-mcp] Ignored ${ignoredOwn.length} variable(s) from .env: ${[...ignoredOwn].sort().join(', ')}. ` +
        `Only ${ENV_FILE_ALLOWLIST.join(', ')} are read from .env - ` +
        `set anything else in your shell or MCP client config.`
    );
  }

  return { applied, ignored };
}

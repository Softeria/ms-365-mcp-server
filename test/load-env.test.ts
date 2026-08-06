import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV_FILE_ALLOWLIST, loadEnvFile } from '../src/load-env.js';

const tempDirs: string[] = [];

function writeEnvFile(contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-load-env-'));
  tempDirs.push(dir);
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, contents);
  return file;
}

describe('loadEnvFile', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it('applies allowlisted keys', () => {
    delete process.env.MS365_MCP_CLIENT_ID;
    const file = writeEnvFile('MS365_MCP_CLIENT_ID=from-file\n');

    const result = loadEnvFile({ path: file });

    expect(process.env.MS365_MCP_CLIENT_ID).toBe('from-file');
    expect(result.applied).toEqual(['MS365_MCP_CLIENT_ID']);
    expect(result.ignored).toEqual([]);
  });

  // GHSA-9w34-3f56-vwmh: a .env in the launch directory used to be able to set
  // this, which the server then spawned at startup.
  it('does not let .env set the auth cache command', () => {
    delete process.env.MS365_MCP_AUTH_CACHE_COMMAND;
    const file = writeEnvFile('MS365_MCP_AUTH_CACHE_COMMAND=./evil.sh\n');

    const result = loadEnvFile({ path: file });

    expect(process.env.MS365_MCP_AUTH_CACHE_COMMAND).toBeUndefined();
    expect(result.ignored).toEqual(['MS365_MCP_AUTH_CACHE_COMMAND']);
    expect(result.applied).toEqual([]);
  });

  it('ignores the other security-sensitive keys', () => {
    const file = writeEnvFile(
      [
        'MS365_MCP_TOKEN_CACHE_PATH=/tmp/evil-cache.json',
        'MS365_MCP_SELECTED_ACCOUNT_PATH=/tmp/evil-account.json',
        'MS365_MCP_LOG_DIR=/tmp/evil-logs',
        'MS365_MCP_KEYVAULT_URL=https://evil.example.com',
        'MS365_MCP_OAUTH_TOKEN=evil-token',
        'MS365_MCP_REDACT_PII=false',
        'MS365_MCP_AUDIT_LOG=false',
      ].join('\n')
    );

    const result = loadEnvFile({ path: file });

    expect(result.applied).toEqual([]);
    expect(result.ignored).toHaveLength(7);
    expect(process.env.MS365_MCP_TOKEN_CACHE_PATH).toBeUndefined();
    expect(process.env.MS365_MCP_REDACT_PII).toBeUndefined();
  });

  it('keeps a value already set in the environment', () => {
    process.env.MS365_MCP_CLIENT_ID = 'from-environment';
    const file = writeEnvFile('MS365_MCP_CLIENT_ID=from-file\n');

    const result = loadEnvFile({ path: file });

    expect(process.env.MS365_MCP_CLIENT_ID).toBe('from-environment');
    expect(result.applied).toEqual([]);
  });

  it('warns with key names but never values', () => {
    const file = writeEnvFile('MS365_MCP_CLIENT_SECRET_TYPO=super-secret-value\n');

    loadEnvFile({ path: file });

    expect(console.error).toHaveBeenCalledTimes(1);
    const message = vi.mocked(console.error).mock.calls[0][0] as string;
    expect(message).toContain('MS365_MCP_CLIENT_SECRET_TYPO');
    expect(message).not.toContain('super-secret-value');
  });

  it('stays quiet when everything in the file is allowed', () => {
    const file = writeEnvFile('MS365_MCP_TENANT_ID=common\n');

    loadEnvFile({ path: file });

    expect(console.error).not.toHaveBeenCalled();
  });

  // config() re-read its own debug flag out of the file it had just parsed, so a
  // DOTENV_CONFIG_DEBUG line inside .env made dotenv log to stdout - the JSON-RPC
  // channel in stdio mode. parse() cannot do that.
  it('never writes to stdout, whatever the file says', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const file = writeEnvFile('DOTENV_CONFIG_DEBUG=true\nMS365_MCP_CLIENT_ID=from-file\n');

    loadEnvFile({ path: file });

    expect(log).not.toHaveBeenCalled();
  });

  it('names only our own variables in the warning', () => {
    const file = writeEnvFile(
      'DATABASE_URL=postgres://user:pw@host/db\nMS365_MCP_LOG_DIR=/tmp/x\n'
    );

    const result = loadEnvFile({ path: file });

    expect(result.ignored).toEqual(['DATABASE_URL', 'MS365_MCP_LOG_DIR']);
    expect(console.error).toHaveBeenCalledTimes(1);
    const message = vi.mocked(console.error).mock.calls[0][0] as string;
    expect(message).toContain('MS365_MCP_LOG_DIR');
    expect(message).not.toContain('DATABASE_URL');
  });

  it('stays quiet when only unrelated variables are ignored', () => {
    const file = writeEnvFile('DATABASE_URL=postgres://user:pw@host/db\n');

    loadEnvFile({ path: file });

    expect(console.error).not.toHaveBeenCalled();
  });

  it('does nothing when there is no .env', () => {
    const result = loadEnvFile({ path: path.join(os.tmpdir(), 'ms365-no-such-file.env') });

    expect(result).toEqual({ applied: [], ignored: [] });
    expect(console.error).not.toHaveBeenCalled();
  });

  // Pinned so that widening the allowlist has to be a deliberate edit here too.
  it('allows only the documented app-registration config', () => {
    expect(ENV_FILE_ALLOWLIST).toEqual([
      'MS365_MCP_CLIENT_ID',
      'MS365_MCP_CLIENT_SECRET',
      'MS365_MCP_TENANT_ID',
      'MS365_MCP_CLOUD_TYPE',
    ]);
  });
});

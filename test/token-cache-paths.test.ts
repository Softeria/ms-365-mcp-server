import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateLegacyPathsFrom } from '../src/token-cache-storage.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('migration off the package directory', () => {
  const originalPlatform = process.platform;
  let legacyDir: string;
  let targetDir: string;

  beforeEach(() => {
    vi.unstubAllEnvs();
    legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-legacy-'));
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-target-'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    fs.rmSync(legacyDir, { recursive: true, force: true });
    fs.rmSync(targetDir, { recursive: true, force: true });
  });

  function useConfigHome(): string {
    const configHome = path.join(targetDir, 'config');
    vi.stubEnv('XDG_CONFIG_HOME', configHome);
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    return path.join(configHome, 'ms-365-mcp-server');
  }

  it('moves both files to the config dir and leaves the package directory clean', () => {
    fs.writeFileSync(path.join(legacyDir, '.token-cache.json'), 'legacy-cache');
    fs.writeFileSync(path.join(legacyDir, '.selected-account.json'), 'legacy-account');
    const appDir = useConfigHome();

    migrateLegacyPathsFrom(legacyDir);

    expect(fs.readFileSync(path.join(appDir, '.token-cache.json'), 'utf8')).toBe('legacy-cache');
    expect(fs.readFileSync(path.join(appDir, '.selected-account.json'), 'utf8')).toBe(
      'legacy-account'
    );
    expect(fs.existsSync(path.join(legacyDir, '.token-cache.json'))).toBe(false);
    expect(fs.existsSync(path.join(legacyDir, '.selected-account.json'))).toBe(false);
  });

  it('never clobbers a cache already at the new location', () => {
    fs.writeFileSync(path.join(legacyDir, '.token-cache.json'), 'legacy-cache');
    const appDir = useConfigHome();
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, '.token-cache.json'), 'current-cache');

    migrateLegacyPathsFrom(legacyDir);

    expect(fs.readFileSync(path.join(appDir, '.token-cache.json'), 'utf8')).toBe('current-cache');
  });

  it('leaves the legacy file alone when the path is pinned by env', () => {
    fs.writeFileSync(path.join(legacyDir, '.token-cache.json'), 'legacy-cache');
    vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', path.join(targetDir, '.token-cache.json'));

    migrateLegacyPathsFrom(legacyDir);

    expect(fs.existsSync(path.join(legacyDir, '.token-cache.json'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.token-cache.json'))).toBe(false);
  });

  it('does nothing when there is no legacy file to move', () => {
    const appDir = useConfigHome();

    migrateLegacyPathsFrom(legacyDir);

    expect(fs.existsSync(path.join(appDir, '.token-cache.json'))).toBe(false);
  });
});

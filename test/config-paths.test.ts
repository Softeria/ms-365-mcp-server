import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfigDir } from '../src/lib/config-paths.js';

describe('config dir resolution', () => {
  const originalPlatform = process.platform;

  function setPlatform(value: string): void {
    Object.defineProperty(process, 'platform', { value, configurable: true });
  }

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  it('uses APPDATA on windows', () => {
    setPlatform('win32');
    vi.stubEnv('APPDATA', 'C:\\Users\\brian\\AppData\\Roaming');

    expect(getConfigDir()).toBe(
      path.join('C:\\Users\\brian\\AppData\\Roaming', 'ms-365-mcp-server')
    );
  });

  it('falls back to the profile path when APPDATA is unset on windows', () => {
    setPlatform('win32');
    vi.stubEnv('APPDATA', '');

    expect(getConfigDir()).toBe(path.join(os.homedir(), 'AppData', 'Roaming', 'ms-365-mcp-server'));
  });

  it('uses Application Support on macos', () => {
    setPlatform('darwin');

    expect(getConfigDir()).toBe(
      path.join(os.homedir(), 'Library', 'Application Support', 'ms-365-mcp-server')
    );
  });

  it('uses XDG_CONFIG_HOME on linux', () => {
    setPlatform('linux');
    vi.stubEnv('XDG_CONFIG_HOME', '/custom/config');

    expect(getConfigDir()).toBe(path.join('/custom/config', 'ms-365-mcp-server'));
  });

  it('falls back to ~/.config when XDG_CONFIG_HOME is unset', () => {
    setPlatform('linux');
    vi.stubEnv('XDG_CONFIG_HOME', '');

    expect(getConfigDir()).toBe(path.join(os.homedir(), '.config', 'ms-365-mcp-server'));
  });

  // The XDG spec says a relative value must be ignored, not resolved against cwd.
  it('ignores a relative XDG_CONFIG_HOME', () => {
    setPlatform('linux');
    vi.stubEnv('XDG_CONFIG_HOME', 'relative/config');

    expect(getConfigDir()).toBe(path.join(os.homedir(), '.config', 'ms-365-mcp-server'));
  });

  it('never resolves inside the installed package', () => {
    for (const platform of ['win32', 'darwin', 'linux']) {
      setPlatform(platform);
      expect(getConfigDir()).not.toContain('node_modules');
    }
  });
});

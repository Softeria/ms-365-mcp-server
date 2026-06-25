import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'node:os';
import path from 'path';
import { getSelectedAccountPath, getTokenCachePath } from '../src/auth.js';

describe('token cache path configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getTokenCachePath', () => {
    it('should return default path when env var is not set', () => {
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', '');
      const result = getTokenCachePath();
      expect(result).toContain('.token-cache.json');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should return env var path when set', () => {
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', '/tmp/test-cache/.token-cache.json');
      const result = getTokenCachePath();
      expect(result).toBe('/tmp/test-cache/.token-cache.json');
    });

    it('should trim whitespace from env var', () => {
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', '  /tmp/test-cache/.token-cache.json  ');
      const result = getTokenCachePath();
      expect(result).toBe('/tmp/test-cache/.token-cache.json');
    });

    it('should return default path when env var is undefined', () => {
      delete process.env.MS365_MCP_TOKEN_CACHE_PATH;
      const result = getTokenCachePath();
      expect(result).toContain('.token-cache.json');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should use XDG_DATA_HOME when token cache path env var is unset', () => {
      vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', '');
      vi.stubEnv('XDG_DATA_HOME', '/custom/xdg');
      const result = getTokenCachePath();
      expect(result).toBe('/custom/xdg/ms-365-mcp-server/.token-cache.json');
    });

    it('should use homedir XDG default when token cache path and XDG_DATA_HOME are unset', () => {
      delete process.env.MS365_MCP_TOKEN_CACHE_PATH;
      delete process.env.XDG_DATA_HOME;
      const result = getTokenCachePath();
      expect(result).toBe(
        path.join(os.homedir(), '.local', 'share', 'ms-365-mcp-server', '.token-cache.json')
      );
    });
  });

  describe('getSelectedAccountPath', () => {
    it('should return default path when env var is not set', () => {
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', '');
      const result = getSelectedAccountPath();
      expect(result).toContain('.selected-account.json');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should return env var path when set', () => {
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', '/tmp/test-cache/.selected-account.json');
      const result = getSelectedAccountPath();
      expect(result).toBe('/tmp/test-cache/.selected-account.json');
    });

    it('should trim whitespace from env var', () => {
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', '  /tmp/test-cache/.selected-account.json  ');
      const result = getSelectedAccountPath();
      expect(result).toBe('/tmp/test-cache/.selected-account.json');
    });

    it('should return default path when env var is undefined', () => {
      delete process.env.MS365_MCP_SELECTED_ACCOUNT_PATH;
      const result = getSelectedAccountPath();
      expect(result).toContain('.selected-account.json');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should use XDG_DATA_HOME when selected account path env var is unset', () => {
      vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', '');
      vi.stubEnv('XDG_DATA_HOME', '/custom/xdg');
      const result = getSelectedAccountPath();
      expect(result).toBe('/custom/xdg/ms-365-mcp-server/.selected-account.json');
    });

    it('should use homedir XDG default when selected account path and XDG_DATA_HOME are unset', () => {
      delete process.env.MS365_MCP_SELECTED_ACCOUNT_PATH;
      delete process.env.XDG_DATA_HOME;
      const result = getSelectedAccountPath();
      expect(result).toBe(
        path.join(
          os.homedir(),
          '.local',
          'share',
          'ms-365-mcp-server',
          '.selected-account.json'
        )
      );
    });
  });
});

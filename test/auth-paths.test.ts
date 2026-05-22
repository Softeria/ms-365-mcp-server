import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import { getSelectedAccountPath, getTokenCachePath } from '../src/token-cache-storage.js';

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
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSecrets, clearSecretsCache } from '../src/secrets.js';

describe('secrets module', () => {
  beforeEach(() => {
    clearSecretsCache();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    clearSecretsCache();
    vi.unstubAllEnvs();
  });

  describe('environment secrets provider', () => {
    it('should read secrets from environment variables', async () => {
      vi.stubEnv('MS365_MCP_CLIENT_ID', 'test-client-id');
      vi.stubEnv('MS365_MCP_TENANT_ID', 'test-tenant-id');
      vi.stubEnv('MS365_MCP_CLIENT_SECRET', 'test-client-secret');
      vi.stubEnv('MS365_MCP_KEYVAULT_URL', '');

      const secrets = await getSecrets();

      expect(secrets.clientId).toBe('test-client-id');
      expect(secrets.tenantId).toBe('test-tenant-id');
      expect(secrets.clientSecret).toBe('test-client-secret');
    });

    it('should default tenantId to common when not set', async () => {
      vi.stubEnv('MS365_MCP_CLIENT_ID', 'test-client-id');
      vi.stubEnv('MS365_MCP_TENANT_ID', '');
      vi.stubEnv('MS365_MCP_KEYVAULT_URL', '');

      const secrets = await getSecrets();

      expect(secrets.tenantId).toBe('common');
    });

    it('should cache secrets after first call', async () => {
      vi.stubEnv('MS365_MCP_CLIENT_ID', 'first-client-id');
      vi.stubEnv('MS365_MCP_KEYVAULT_URL', '');

      const secrets1 = await getSecrets();
      expect(secrets1.clientId).toBe('first-client-id');

      vi.stubEnv('MS365_MCP_CLIENT_ID', 'second-client-id');

      const secrets2 = await getSecrets();
      expect(secrets2.clientId).toBe('first-client-id');
    });

    it('should return fresh secrets after cache clear', async () => {
      vi.stubEnv('MS365_MCP_CLIENT_ID', 'first-client-id');
      vi.stubEnv('MS365_MCP_KEYVAULT_URL', '');

      await getSecrets();
      clearSecretsCache();

      vi.stubEnv('MS365_MCP_CLIENT_ID', 'second-client-id');

      const secrets = await getSecrets();
      expect(secrets.clientId).toBe('second-client-id');
    });
  });
});

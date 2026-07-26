import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MicrosoftGraphServer from '../src/server.js';
import type AuthManager from '../src/auth.js';
import { clearSecretsCache } from '../src/secrets.js';

/**
 * server.ts's Node-version guard delegates to assertNodeVersionSupportsDocumentConversion
 * (unit-tested against explicit version strings in test/document-conversion.test.ts, since
 * the real ambient Node version here varies by environment). This file only proves the
 * wiring: that initialize() actually calls the guard when the flag is set, and propagates
 * whatever it throws, without depending on which Node version the test happens to run under.
 */
const assertNodeVersionMock = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/document-conversion.js', () => ({
  assertNodeVersionSupportsDocumentConversion: assertNodeVersionMock,
}));

vi.mock('../src/graph-tools.js', () => ({
  registerDiscoveryTools: vi.fn(),
  registerGraphTools: vi.fn(),
}));

vi.mock('../src/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

function mockAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: vi.fn().mockReturnValue(false),
    isMultiAccount: vi.fn().mockResolvedValue(false),
    listAccounts: vi.fn().mockResolvedValue([]),
  } as unknown as AuthManager;
}

describe('document conversion Node-version guard wiring', () => {
  beforeEach(() => {
    assertNodeVersionMock.mockClear();
    process.env.MS365_MCP_CLIENT_ID = 'test-client-id';
    process.env.MS365_MCP_TENANT_ID = 'test-tenant';
    delete process.env.MS365_MCP_KEYVAULT_URL;
    clearSecretsCache();
  });

  afterEach(() => {
    delete process.env.MS365_MCP_CLIENT_ID;
    delete process.env.MS365_MCP_TENANT_ID;
    clearSecretsCache();
  });

  it('does not check the Node version when the flag is not set', async () => {
    const server = new MicrosoftGraphServer(mockAuthManager(), {});
    await server.initialize('test');
    expect(assertNodeVersionMock).not.toHaveBeenCalled();
  });

  it('checks the Node version when --enable-document-conversion is set', async () => {
    const server = new MicrosoftGraphServer(mockAuthManager(), {
      enableDocumentConversion: true,
    });
    await server.initialize('test');
    expect(assertNodeVersionMock).toHaveBeenCalledTimes(1);
  });

  it('propagates the guard error instead of starting on an unsupported Node version', async () => {
    assertNodeVersionMock.mockImplementation(() => {
      throw new Error(
        '--enable-document-conversion requires Node >=22.13.0 (running Node 18.19.1).'
      );
    });
    const server = new MicrosoftGraphServer(mockAuthManager(), {
      enableDocumentConversion: true,
    });
    await expect(server.initialize('test')).rejects.toThrow(/requires Node >=22\.13\.0/);
  });
});

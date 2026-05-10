import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONNECTOR_IDENTITY_ENV,
  compareConnectorNames,
  connectorDoctor,
  connectorIdentityDiagnostics,
  resolveConnectorIdentity,
} from '../src/lib/connector-identity/metadata.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe('connector identity defaults', () => {
  it('resolves the canonical server-owned identity by default', () => {
    const identity = resolveConnectorIdentity({ version: '1.2.3' });

    expect(identity.name).toBe('Microsoft365MCP');
    expect(identity.displayName).toBe('Microsoft 365 MCP Gateway');
    expect(identity.shortName).toBe('Microsoft 365');
    expect(identity.slug).toBe('ms-365-mcp-server');
    expect(identity.version).toBe('1.2.3');
    expect(JSON.stringify(identity)).not.toContain('ToolHub');
  });

  it('adds a safe tenant display suffix without changing canonical name', () => {
    const identity = resolveConnectorIdentity({ version: '1.2.3', tenantDisplayName: 'Aspire' });

    expect(identity.name).toBe('Microsoft365MCP');
    expect(identity.displayName).toBe('Microsoft 365 MCP Gateway - Aspire');
    expect(identity.baseDisplayName).toBe('Microsoft 365 MCP Gateway');
  });

  it('rejects non-HTTPS optional metadata URLs', () => {
    process.env.MS365_MCP_CONNECTOR_ICON_URL = 'http://example.com/icon.png';

    expect(() => resolveConnectorIdentity({ version: '1.2.3' })).toThrow(/HTTPS URL/i);
  });

  it('permits ToolHub only when an operator explicitly configured it', () => {
    process.env.MS365_MCP_CONNECTOR_NAME = 'ToolHub';

    const identity = resolveConnectorIdentity({ version: '1.2.3' });

    expect(identity.displayName).toBe('ToolHub');
    expect(identity.operatorConfigured.displayName).toBe(true);
  });
});

describe('connector identity diagnostics', () => {
  it('projects consistent metadata values and canonical tenant MCP endpoint', () => {
    const diagnostics = connectorIdentityDiagnostics({
      publicBaseUrl: 'https://mcp.example.com',
      tenantId: '11111111-1111-4111-8111-111111111111',
      version: '1.2.3',
      tenantDisplayName: 'Aspire',
      transport: 'streamable-http',
    });

    expect(diagnostics.expectedDisplayName).toBe('Microsoft 365 MCP Gateway - Aspire');
    expect(diagnostics.serverInfo).toEqual({ name: 'Microsoft365MCP', version: '1.2.3' });
    expect(diagnostics.urls.mcpEndpoint).toBe(
      'https://mcp.example.com/t/11111111-1111-4111-8111-111111111111/mcp'
    );
    expect(diagnostics.wellKnown.displayName).toBe('Microsoft 365 MCP Gateway - Aspire');
    expect(diagnostics.protectedResource.resource).toBe(diagnostics.urls.mcpEndpoint);
    expect(JSON.stringify(diagnostics)).not.toContain('ToolHub');
  });

  it('explains hosted connector name divergence without echoing secrets', async () => {
    const result = await connectorDoctor({
      publicUrl: 'https://mcp.example.com',
      tenantId: '11111111-1111-4111-8111-111111111111',
      observedName: 'ToolHub',
      version: '1.2.3',
      fetchImpl: async (url) =>
        new Response(JSON.stringify({ displayName: 'Microsoft 365 MCP Gateway', url }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'set-cookie': 'secret=1' },
        }),
    });

    expect(result.status).toBe('warn');
    expect(result.expectedDisplayName).toBe('Microsoft 365 MCP Gateway');
    expect(result.explanation).toContain('Server metadata advertises Microsoft 365 MCP Gateway');
    expect(result.explanation).toContain('ToolHub');
    expect(JSON.stringify(result)).not.toMatch(/authorization|cookie|secret=1|access_token/i);
  });

  it('returns pass when all checked surfaces match the canonical display name', async () => {
    const result = await connectorDoctor({
      publicUrl: 'https://mcp.example.com',
      tenantId: '11111111-1111-4111-8111-111111111111',
      observedName: 'Microsoft 365 MCP Gateway',
      version: '1.2.3',
      fetchImpl: async () =>
        new Response(JSON.stringify({ displayName: 'Microsoft 365 MCP Gateway' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });

    expect(result.status).toBe('pass');
  });
});

describe('connector identity env surface', () => {
  it('documents all Phase 8 connector env knobs', () => {
    expect(CONNECTOR_IDENTITY_ENV).toEqual([
      'MS365_MCP_CONNECTOR_NAME',
      'MS365_MCP_CONNECTOR_SHORT_NAME',
      'MS365_MCP_CONNECTOR_DESCRIPTION',
      'MS365_MCP_CONNECTOR_ICON_URL',
      'MS365_MCP_CONNECTOR_PRIVACY_URL',
      'MS365_MCP_CONNECTOR_TERMS_URL',
    ]);
  });

  it('compares observed hosted connector labels against server metadata', () => {
    expect(
      compareConnectorNames({
        expectedDisplayName: 'Microsoft 365 MCP Gateway',
        observedDisplayName: 'ToolHub',
      })
    ).toMatchObject({ status: 'warn' });
  });
});

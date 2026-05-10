import { describe, expect, it } from 'vitest';
import {
  buildConnectorWellKnownMetadata,
  buildOAuthAuthorizationServerMetadata,
  buildOAuthProtectedResourceMetadata,
  buildWwwAuthenticateMetadata,
} from '../src/lib/connector-identity/metadata.js';

describe('OAuth and connector metadata identity projection', () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const publicBaseUrl = 'https://mcp.example.com';
  const scopes = ['User.Read', 'Mail.Read'];

  it('builds tenant auth-server metadata with canonical display fields and DCR URL', () => {
    const metadata = buildOAuthAuthorizationServerMetadata({
      publicBaseUrl,
      tenantId,
      scopes,
      version: '1.2.3',
      dynamicRegistration: true,
    });

    expect(metadata.issuer).toBe(`${publicBaseUrl}/t/${tenantId}`);
    expect(metadata.authorization_endpoint).toBe(`${publicBaseUrl}/t/${tenantId}/authorize`);
    expect(metadata.token_endpoint).toBe(`${publicBaseUrl}/t/${tenantId}/token`);
    expect(metadata.registration_endpoint).toBe(`${publicBaseUrl}/register`);
    expect(metadata.client_name).toBe('Microsoft 365 MCP Gateway');
    expect(metadata.display_name).toBe('Microsoft 365 MCP Gateway');
    expect(metadata.server_info).toEqual({ name: 'Microsoft365MCP', version: '1.2.3' });
    expect(JSON.stringify(metadata)).not.toContain('ToolHub');
  });

  it('builds protected-resource metadata with the canonical tenant MCP endpoint', () => {
    const metadata = buildOAuthProtectedResourceMetadata({
      publicBaseUrl,
      tenantId,
      scopes,
      version: '1.2.3',
    });

    expect(metadata.resource).toBe(`${publicBaseUrl}/t/${tenantId}/mcp`);
    expect(metadata.authorization_servers).toEqual([`${publicBaseUrl}/t/${tenantId}`]);
    expect(metadata.resource_documentation).toBe(`${publicBaseUrl}/t/${tenantId}`);
    expect(metadata.display_name).toBe('Microsoft 365 MCP Gateway');
    expect(metadata.server_info).toEqual({ name: 'Microsoft365MCP', version: '1.2.3' });
  });

  it('builds /.well-known/mcp-connector metadata for tenant connector setup', () => {
    const metadata = buildConnectorWellKnownMetadata({ publicBaseUrl, tenantId, version: '1.2.3' });

    expect(metadata.name).toBe('Microsoft365MCP');
    expect(metadata.displayName).toBe('Microsoft 365 MCP Gateway');
    expect(metadata.shortName).toBe('Microsoft 365');
    expect(metadata.endpoints.mcp).toBe(`${publicBaseUrl}/t/${tenantId}/mcp`);
    expect(metadata.endpoints.oauthAuthorizationServer).toBe(
      `${publicBaseUrl}/t/${tenantId}/.well-known/oauth-authorization-server`
    );
    expect(metadata.endpoints.oauthProtectedResource).toBe(
      `${publicBaseUrl}/t/${tenantId}/.well-known/oauth-protected-resource`
    );
  });

  it('builds WWW-Authenticate resource metadata URL for the tenant protected-resource document', () => {
    const metadata = buildWwwAuthenticateMetadata({ publicBaseUrl, tenantId });

    expect(metadata.realm).toBe(`${publicBaseUrl}/t/${tenantId}`);
    expect(metadata.resourceMetadata).toBe(
      `${publicBaseUrl}/t/${tenantId}/.well-known/oauth-protected-resource`
    );
  });
});

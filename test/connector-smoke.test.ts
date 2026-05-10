import { describe, expect, it } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  buildConnectorWellKnownMetadata,
  buildOAuthAuthorizationServerMetadata,
  buildOAuthProtectedResourceMetadata,
  connectorDoctor,
} from '../src/lib/connector-identity/metadata.js';

const PUBLIC_URL = 'https://mcp.example.test';
const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const TENANT_NAME = 'Aspire';
const VERSION = '8.14.0';

async function startMetadataServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = express();
  app.get('/t/:tenantId/.well-known/oauth-authorization-server', (req, res) => {
    res.json(
      buildOAuthAuthorizationServerMetadata({
        publicBaseUrl: PUBLIC_URL,
        tenantId: req.params.tenantId,
        tenantDisplayName: TENANT_NAME,
        scopes: ['openid', 'offline_access', 'User.Read'],
        version: VERSION,
        dynamicRegistration: true,
      })
    );
  });
  app.get('/.well-known/oauth-authorization-server/t/:tenantId', (req, res) => {
    res.json(
      buildOAuthAuthorizationServerMetadata({
        publicBaseUrl: PUBLIC_URL,
        tenantId: req.params.tenantId,
        tenantDisplayName: TENANT_NAME,
        scopes: ['openid', 'offline_access', 'User.Read'],
        version: VERSION,
        dynamicRegistration: true,
      })
    );
  });
  app.get('/t/:tenantId/.well-known/oauth-protected-resource', (req, res) => {
    res.set(
      'WWW-Authenticate',
      `Bearer realm="${PUBLIC_URL}/t/${req.params.tenantId}", resource_metadata="${PUBLIC_URL}/t/${req.params.tenantId}/.well-known/oauth-protected-resource"`
    );
    res.json(
      buildOAuthProtectedResourceMetadata({
        publicBaseUrl: PUBLIC_URL,
        tenantId: req.params.tenantId,
        tenantDisplayName: TENANT_NAME,
        scopes: ['openid', 'offline_access', 'User.Read'],
        version: VERSION,
      })
    );
  });
  app.get('/.well-known/oauth-protected-resource/t/:tenantId', (req, res) => {
    res.json(
      buildOAuthProtectedResourceMetadata({
        publicBaseUrl: PUBLIC_URL,
        tenantId: req.params.tenantId,
        tenantDisplayName: TENANT_NAME,
        scopes: ['openid', 'offline_access', 'User.Read'],
        version: VERSION,
      })
    );
  });
  app.get('/t/:tenantId/.well-known/mcp-connector', (req, res) => {
    res.json(
      buildConnectorWellKnownMetadata({
        publicBaseUrl: PUBLIC_URL,
        tenantId: req.params.tenantId,
        tenantDisplayName: TENANT_NAME,
        version: VERSION,
      })
    );
  });
  app.post('/t/:tenantId/mcp', (req, res) => {
    res.json({
      jsonrpc: '2.0',
      id: 1,
      result: { serverInfo: { name: 'Microsoft365MCP', version: VERSION } },
    });
  });

  const server = await new Promise<http.Server>((resolve) => {
    const next = http.createServer(app).listen(0, () => resolve(next));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('Phase 08 connector smoke', () => {
  it('local metadata and connector-doctor pass with matching tenant connector names', async () => {
    const server = await startMetadataServer();
    try {
      const [authServer, protectedResource, connector] = await Promise.all([
        fetch(`${server.baseUrl}/.well-known/oauth-authorization-server/t/${TENANT_ID}`),
        fetch(`${server.baseUrl}/.well-known/oauth-protected-resource/t/${TENANT_ID}`),
        fetch(`${server.baseUrl}/t/${TENANT_ID}/.well-known/mcp-connector`),
      ]);
      expect(authServer.status).toBe(200);
      expect(protectedResource.status).toBe(200);
      expect(connector.status).toBe(200);

      const authBody = (await authServer.json()) as Record<string, unknown>;
      const resourceBody = (await protectedResource.json()) as Record<string, unknown>;
      const connectorBody = (await connector.json()) as {
        endpoints?: { mcp?: string };
        displayName?: string;
      };
      expect(authBody.displayName).toBe('Microsoft 365 MCP Gateway - Aspire');
      expect(resourceBody.resource).toBe(`${PUBLIC_URL}/t/${TENANT_ID}/mcp`);
      expect(connectorBody.displayName).toBe('Microsoft 365 MCP Gateway - Aspire');
      expect(connectorBody.endpoints?.mcp).toBe(`${PUBLIC_URL}/t/${TENANT_ID}/mcp`);

      const doctor = await connectorDoctor({
        publicBaseUrl: server.baseUrl,
        publicUrl: server.baseUrl,
        tenantId: TENANT_ID,
        tenantDisplayName: TENANT_NAME,
        observedName: 'Microsoft 365 MCP Gateway - Aspire',
        version: VERSION,
      });
      expect(doctor.status).toBe('pass');
      expect(doctor.checkedUrls).toEqual([
        `${server.baseUrl}/t/${TENANT_ID}/.well-known/oauth-protected-resource`,
        `${server.baseUrl}/t/${TENANT_ID}/.well-known/mcp-connector`,
      ]);
    } finally {
      await server.close();
    }
  });

  it('connector-doctor fails clearly when a server-owned metadata name diverges', async () => {
    const doctor = await connectorDoctor({
      publicBaseUrl: PUBLIC_URL,
      publicUrl: PUBLIC_URL,
      tenantId: TENANT_ID,
      tenantDisplayName: TENANT_NAME,
      observedName: 'Microsoft 365 MCP Gateway - Aspire',
      version: VERSION,
      fetchImpl: async (url) =>
        new Response(
          JSON.stringify({
            displayName: url.includes('mcp-connector')
              ? 'ToolHub'
              : 'Microsoft 365 MCP Gateway - Aspire',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        ),
    });

    expect(doctor.status).toBe('fail');
    expect(doctor.surfaces['mcp-connector']).toMatchObject({ ok: false, displayName: 'ToolHub' });
    expect(doctor.expectedDisplayName).toBe('Microsoft 365 MCP Gateway - Aspire');
  });
});

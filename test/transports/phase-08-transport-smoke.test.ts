import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createStreamableHttpHandler } from '../../src/lib/transports/streamable-http.js';
import {
  createLegacySseGetHandler,
  createLegacySsePostHandler,
} from '../../src/lib/transports/legacy-sse.js';
import { buildStdioCapabilityProfile } from '../../src/lib/transports/stdio.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const TENANT: TenantRow = {
  id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  mode: 'delegated',
  client_id: 'fake-client',
  client_secret_ref: null,
  tenant_id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  cloud_type: 'global',
  redirect_uri_allowlist: [],
  cors_origins: [],
  allowed_scopes: ['User.Read'],
  enabled_tools: null,
  wrapped_dek: null,
  slug: 'aspire',
  disabled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

function buildDiscoveryServer(): McpServer {
  const server = new McpServer({ name: 'Microsoft365MCP', version: '8.14.0' });
  server.tool('search-tools', 'Search available Microsoft 365 tools', {}, async () => ({
    content: [{ type: 'text', text: 'get-user is available' }],
    structuredContent: { results: [{ name: 'get-user' }] },
  }));
  server.tool('get-tool-schema', 'Return a tool schema', {}, async () => ({
    content: [{ type: 'text', text: '{"name":"get-user","parameters":{}}' }],
    structuredContent: { name: 'get-user', parameters: {} },
  }));
  server.tool('execute-tool', 'Execute a selected Microsoft 365 tool', {}, async () => ({
    content: [{ type: 'text', text: '{"ok":true}' }],
    structuredContent: { ok: true },
  }));
  return server;
}

async function startApp(
  app: express.Express
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = await new Promise<http.Server>((resolve) => {
    const next = http.createServer(app).listen(0, () => resolve(next));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function readJsonRpcResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json'))
    return (await response.json()) as Record<string, unknown>;
  const text = await response.text();
  const dataLine = text.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) throw new Error(`No SSE data line found in ${text}`);
  return JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
}

async function postMcp(
  baseUrl: string,
  body: Record<string, unknown>,
  sessionId?: string
): Promise<Response> {
  return fetch(`${baseUrl}/t/${TENANT.id}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('Phase 08 transport smoke', () => {
  it('Streamable HTTP initializes on /t/{tenantId}/mcp and supports the tool-only discovery loop', async () => {
    const app = express();
    app.use(express.json());
    app.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    app.post(
      '/t/:tenantId/mcp',
      createStreamableHttpHandler({
        buildMcpServer: () => buildDiscoveryServer(),
        surface: 'discovery',
        phase8Enabled: () => true,
      })
    );

    const probe = await startApp(app);
    try {
      const initialize = await postMcp(probe.baseUrl, {
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {}, resources: {}, prompts: {}, structuredToolResults: {} },
          clientInfo: { name: 'claude-code', version: '1.0.0' },
        },
      });
      expect(initialize.status).toBe(200);
      const sessionId = initialize.headers.get('mcp-session-id') ?? undefined;
      const initializeBody = await readJsonRpcResponse(initialize);
      expect(initializeBody.result).toMatchObject({ serverInfo: { name: 'Microsoft365MCP' } });

      const toolsList = await postMcp(
        probe.baseUrl,
        { jsonrpc: '2.0', method: 'tools/list', id: 2 },
        sessionId
      );
      expect(toolsList.status).toBe(200);
      const toolsBody = await readJsonRpcResponse(toolsList);
      expect(JSON.stringify(toolsBody)).toContain('search-tools');
      expect(JSON.stringify(toolsBody)).toContain('get-tool-schema');
      expect(JSON.stringify(toolsBody)).toContain('execute-tool');
    } finally {
      await probe.close();
    }
  });

  it('legacy SSE advertises limited deprecated Phase 8 support without advanced capabilities', async () => {
    const app = express();
    app.use(express.json());
    app.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    const deps = { buildMcpServer: () => buildDiscoveryServer() };
    app.get('/t/:tenantId/sse', createLegacySseGetHandler(deps));
    app.post('/t/:tenantId/messages', createLegacySsePostHandler(deps));

    const probe = await startApp(app);
    try {
      const initialize = await fetch(`${probe.baseUrl}/t/${TENANT.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      });
      const initializeBody = (await initialize.json()) as {
        result?: { capabilities?: Record<string, unknown> };
      };
      expect(initialize.status).toBe(200);
      expect(initializeBody.result?.capabilities).toEqual({ tools: {} });

      const tools = await fetch(`${probe.baseUrl}/t/${TENANT.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 2 }),
      });
      const body = (await tools.json()) as { error?: string; hint?: string };
      expect(tools.status).toBe(501);
      expect(body.error).toBe('legacy_sse_limited_support');
      expect(body.hint).toBe(
        'Legacy SSE has limited Phase 08 support. Use /t/{tenantId}/mcp for the full Streamable HTTP connector surface.'
      );
    } finally {
      await probe.close();
    }
  });

  it('stdio gates roots, sampling, and elicitation on client-advertised capability', () => {
    const absent = buildStdioCapabilityProfile({
      protocolVersion: '2025-06-18',
      advertisedCapabilities: {},
      phase8Enabled: true,
    });
    expect(absent.capabilities.roots.effective).toBe(false);
    expect(absent.capabilities.sampling.effective).toBe(false);
    expect(absent.capabilities.elicitation.effective).toBe(false);

    const advertised = buildStdioCapabilityProfile({
      protocolVersion: '2025-06-18',
      advertisedCapabilities: { roots: {}, sampling: {}, elicitation: {} },
      phase8Enabled: true,
    });
    expect(advertised.capabilities.roots.effective).toBe(true);
    expect(advertised.capabilities.sampling.effective).toBe(true);
    expect(advertised.capabilities.elicitation.effective).toBe(true);
    expect(advertised.capabilities.apps.effective).toBe(false);
  });
});

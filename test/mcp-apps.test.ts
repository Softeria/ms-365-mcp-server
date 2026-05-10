import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../src/request-context.js';
import { buildEffectiveCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import { registerMcpApps, createAppViewResult } from '../src/lib/mcp-apps/register.js';
import { readMcpAppResource } from '../src/lib/mcp-apps/assets.js';
import MicrosoftGraphServer from '../src/server.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../src/lib/tenant-surface/surface.js';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages in the signed-in user mailbox.',
        parameters: [],
      },
    ],
  },
}));

function discoveryTenant() {
  return {
    id: TENANT_ID,
    preset_version: DISCOVERY_PRESET_VERSION,
    enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    allowed_scopes: ['Mail.Read', 'Calendars.Read'],
  };
}

function appsProfile() {
  return buildEffectiveCapabilityProfile({
    transport: 'streamable-http',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: true },
    advertisedCapabilities: { apps: {}, resources: {}, tools: {}, structuredToolResults: {} },
  });
}

function noAppsProfile() {
  return buildEffectiveCapabilityProfile({
    transport: 'streamable-http',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: true },
    advertisedCapabilities: { resources: {}, tools: {}, structuredToolResults: {} },
  });
}

async function invokeResourcesList(server: McpServer): Promise<{
  resources: Array<{
    uri: string;
    name: string;
    mimeType?: string;
    _meta?: Record<string, unknown>;
  }>;
}> {
  const handlers = (
    server.server as unknown as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<unknown>>;
    }
  )._requestHandlers;
  const handler = handlers.get('resources/list');
  if (!handler) throw new Error('resources/list handler not registered on McpServer');
  return handler(
    { method: 'resources/list', params: {} },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  ) as Promise<{
    resources: Array<{
      uri: string;
      name: string;
      mimeType?: string;
      _meta?: Record<string, unknown>;
    }>;
  }>;
}

async function invokeToolsList(server: McpServer): Promise<{
  tools: Array<{ name: string; _meta?: Record<string, unknown> }>;
}> {
  const handlers = (
    server.server as unknown as {
      _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<unknown>>;
    }
  )._requestHandlers;
  const handler = handlers.get('tools/list');
  if (!handler) throw new Error('tools/list handler not registered on McpServer');
  return handler(
    { method: 'tools/list', params: {} },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  ) as Promise<{ tools: Array<{ name: string; _meta?: Record<string, unknown> }> }>;
}

function createGraphServer(): MicrosoftGraphServer {
  return new MicrosoftGraphServer(
    {
      isMultiAccount: vi.fn(async () => false),
      listAccounts: vi.fn(async () => []),
    } as never,
    { http: true, orgMode: true }
  );
}

describe('MCP Apps foundation', () => {
  it('registers ui:// app resources with Apps MIME and strict CSP metadata', async () => {
    const server = new McpServer({ name: 'apps-test', version: '0.0.0' });
    registerMcpApps(server, { tenant: discoveryTenant(), capabilityProfile: appsProfile() });

    const list = await invokeResourcesList(server);
    const app = list.resources.find((resource) => resource.uri === 'ui://m365/inbox-triage.html');

    expect(app?.name).toBe('m365-app-inbox-triage');
    expect(app?.mimeType).toBe('text/html;profile=mcp-app');
    expect(app?._meta?.ui).toMatchObject({
      csp: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
      sandbox: 'allow-scripts',
    });
  });

  it('serves secure static app shell HTML for registered ui resources', async () => {
    const result = await readMcpAppResource('ui://m365/connector-diagnostics.html');

    expect(result.contents[0].mimeType).toBe('text/html;profile=mcp-app');
    expect(result.contents[0].uri).toBe('ui://m365/connector-diagnostics.html');
    expect(result.contents[0]._meta?.ui).toMatchObject({
      csp: expect.objectContaining({ scriptSrc: ["'self'"] }),
    });
    expect(result.contents[0].text).toContain('Microsoft 365 MCP');
  });

  it('adds ui resource metadata only for Apps-capable profiles while preserving fallback data', () => {
    const result = createAppViewResult({
      dashboard: 'calendar-brief',
      profile: appsProfile(),
      summary: 'Calendar brief ready.',
      data: { eventCount: 2 },
      resources: [
        { uri: `m365://tenant/${TENANT_ID}/calendar/events/upcoming.json`, name: 'events' },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Calendar brief ready.');
    expect(result.structuredContent?.data).toEqual({ eventCount: 2 });
    expect(result.structuredContent?.resources[0].uri).toBe(
      `m365://tenant/${TENANT_ID}/calendar/events/upcoming.json`
    );
    expect(result._meta?.ui).toMatchObject({ resourceUri: 'ui://m365/calendar-brief.html' });
  });

  it('returns exact non-Apps fallback copy and no error when Apps are unsupported', () => {
    const result = createAppViewResult({
      dashboard: 'teams-digest',
      profile: noAppsProfile(),
      summary: 'Teams digest ready.',
      data: { threadCount: 3 },
      resources: [{ uri: `m365://tenant/${TENANT_ID}/teams/digest.json`, name: 'teams digest' }],
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(
      'This dashboard is available as a UI resource in Apps-capable clients. This response includes the same data as text, structured JSON, and m365:// resources.'
    );
    expect(result.structuredContent?.summary).toBe('Teams digest ready.');
    expect(result._meta?.ui).toBeUndefined();
    expect(result._meta?.fallback).toBe('apps_unsupported');
  });

  it('static-preset tenants do not expose app tools or resources by default', async () => {
    const mcp = createGraphServer().createMcpServer({
      id: '22222222-2222-4222-8222-222222222222',
      preset_version: 'essentials-v1',
      enabled_tools_set: Object.freeze(new Set(['list-mail-messages'])),
      allowed_scopes: ['Mail.Read'],
    } as never);

    const tools = await requestContext.run(
      {
        tenantId: '22222222-2222-4222-8222-222222222222',
        enabledToolsSet: new Set(['list-mail-messages']),
        presetVersion: 'essentials-v1',
      },
      () => invokeToolsList(mcp)
    );
    const inner = mcp.server as unknown as { _requestHandlers: Map<string, unknown> };

    expect(tools.tools.map((tool) => tool.name).some((name) => name.endsWith('-view'))).toBe(false);
    expect(inner._requestHandlers.has('resources/list')).toBe(false);
  });
});

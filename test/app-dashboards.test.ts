import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import {
  APP_ASSET_DIST_PATHS,
  APP_DEFINITIONS,
  readMcpAppResource,
} from '../src/lib/mcp-apps/assets.js';
import { registerMcpApps } from '../src/lib/mcp-apps/register.js';
import { buildEffectiveCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import { registerDashboardTools } from '../src/lib/mcp-dashboards/tools.js';
import { DASHBOARD_TOOL_NAMES } from '../src/lib/mcp-dashboards/data.js';
import { DISCOVERY_PRESET_VERSION } from '../src/lib/tenant-surface/surface.js';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const ALL_DASHBOARD_TOOLS = new Set([
  'list-mail-messages',
  'get-calendar-view',
  'list-channel-messages',
  'search-query',
  'list-users',
  'search-sharepoint-sites',
  'connector-diagnostics',
  'list-skills',
  'validate-skill',
  'save-skill',
]);

function appsProfile() {
  return buildEffectiveCapabilityProfile({
    transport: 'streamable-http',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: true },
    advertisedCapabilities: { apps: {}, resources: {}, tools: {}, structuredToolResults: {} },
  });
}

function registerDashboards(profile = appsProfile()) {
  const server = new McpServer({ name: 'dashboard-test', version: '0.0.0' });
  registerMcpApps(server, {
    tenant: { id: TENANT_ID, preset_version: DISCOVERY_PRESET_VERSION },
    capabilityProfile: profile,
    registerTools: false,
  });
  registerDashboardTools(server, {
    server: { name: 'Microsoft365MCP', version: '0.0.0-test' },
    tenant: {
      id: TENANT_ID,
      slug: 'Aspire',
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: ALL_DASHBOARD_TOOLS,
      allowed_scopes: [
        'Mail.Read',
        'Calendars.Read',
        'ChannelMessage.Read.All',
        'Files.Read.All',
        'User.Read.All',
        'Sites.Read.All',
      ],
    },
    profile,
    surface: 'discovery',
    transport: 'streamable-http',
    expectedDisplayName: 'Microsoft 365 MCP Gateway',
    metadataUrls: { mcp: `/t/${TENANT_ID}/mcp` },
    now: new Date('2026-05-08T20:00:00Z'),
  });
  return server;
}

async function callTool(server: McpServer, name: string, args: Record<string, unknown> = {}) {
  const inner = server as unknown as {
    _registeredTools: Record<
      string,
      { handler: (args: Record<string, unknown>, extra?: unknown) => Promise<unknown> }
    >;
  };
  return inner._registeredTools[name]!.handler(args, {});
}

function registeredToolNames(server: McpServer): string[] {
  return Object.keys(
    (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools
  );
}

describe('MCP dashboard tools and app resources', () => {
  it('registers dashboard fallback tools without shadowing text-first connector diagnostics', () => {
    const server = registerDashboards();
    const names = registeredToolNames(server);

    expect(
      names.filter((name) => Object.values(DASHBOARD_TOOL_NAMES).includes(name as never))
    ).toHaveLength(6);
    expect(names).not.toContain('connector-diagnostics');
    expect(names).toContain('inbox-triage-view');
    expect(names).not.toContain('connector-diagnostics-view');
  });

  it('returns structured dashboard data, m365 resources, and ui metadata for Apps-capable clients', async () => {
    const server = registerDashboards();
    const result = (await callTool(server, 'calendar-brief-view')) as {
      content: Array<{ text: string }>;
      structuredContent?: {
        data?: { dashboard?: string; resources?: Array<{ uri: string }> };
        resources: Array<{ uri: string }>;
      };
      _meta?: Record<string, unknown>;
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('Calendar Brief Dashboard ready.');
    expect(result.structuredContent?.data?.dashboard).toBe('calendar-brief');
    expect(result.structuredContent?.resources[0]!.uri).toBe(
      `m365://tenant/${TENANT_ID}/dashboards/calendar-brief.json`
    );
    expect(result._meta?.ui).toMatchObject({ resourceUri: 'ui://m365/calendar-brief.html' });
  });

  it('serves seven concrete dashboard app assets with required UI copy', async () => {
    expect(APP_DEFINITIONS).toHaveLength(7);
    expect(APP_ASSET_DIST_PATHS).toContain('dist/apps/connector-diagnostics.html');
    expect(APP_ASSET_DIST_PATHS).toContain('dist/apps/skill-editor.html');

    const assets = await Promise.all(APP_DEFINITIONS.map((app) => readMcpAppResource(app.uri)));
    const texts = assets.map((asset) => asset.contents[0]!.text ?? '');

    expect(
      texts.filter((text) => text.includes('This app view contains only server-generated data'))
    ).toHaveLength(7);
    expect(texts.some((text) => text.includes('Connector Diagnostics Dashboard'))).toBe(true);
    expect(texts.some((text) => text.includes('Skill Editor Dashboard'))).toBe(true);
    expect(
      texts.some((text) => text.includes('Delete skill: This disables the custom skill'))
    ).toBe(true);
  });
});

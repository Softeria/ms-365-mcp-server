import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import { buildEffectiveCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import { registerDashboardTools } from '../src/lib/mcp-dashboards/tools.js';
import { DISCOVERY_PRESET_VERSION } from '../src/lib/tenant-surface/surface.js';

const TENANT_ID = '22222222-2222-4222-8222-222222222222';
const APP_UNSUPPORTED_FALLBACK =
  'This dashboard is available as a UI resource in Apps-capable clients. This response includes the same data as text, structured JSON, and m365:// resources.';

function noAppsProfile() {
  return buildEffectiveCapabilityProfile({
    transport: 'streamable-http',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: true },
    advertisedCapabilities: { resources: {}, tools: {}, structuredToolResults: {} },
  });
}

function dashboardServer(
  options: {
    enabledTools?: ReadonlySet<string>;
    allowedScopes?: readonly string[];
  } = {}
) {
  const profile = noAppsProfile();
  const server = new McpServer({ name: 'dashboard-fallback-test', version: '0.0.0' });
  registerDashboardTools(server, {
    server: { name: 'Microsoft365MCP', version: '0.0.0-test' },
    tenant: {
      id: TENANT_ID,
      slug: 'Aspire',
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: options.enabledTools ?? new Set(['list-mail-messages']),
      allowed_scopes: options.allowedScopes ?? ['Mail.Read'],
    },
    profile,
    surface: 'discovery',
    transport: 'streamable-http',
    expectedDisplayName: 'Microsoft 365 MCP Gateway',
    metadataUrls: { mcp: `/t/${TENANT_ID}/mcp` },
    now: new Date('2026-05-08T20:05:00Z'),
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

describe('dashboard fallback behavior', () => {
  it('returns exact Apps-unsupported fallback copy without error', async () => {
    const result = (await callTool(dashboardServer(), 'inbox-triage-view')) as {
      content: Array<{ text: string }>;
      structuredContent?: { warnings: string[] };
      _meta?: Record<string, unknown>;
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain(APP_UNSUPPORTED_FALLBACK);
    expect(result.structuredContent?.warnings).toContain(APP_UNSUPPORTED_FALLBACK);
    expect(result._meta?.ui).toBeUndefined();
    expect(result._meta?.fallback).toBe('apps_unsupported');
  });

  it('warns when required dashboard tools and scopes are disabled for the tenant', async () => {
    const result = (await callTool(dashboardServer(), 'calendar-brief-view')) as {
      structuredContent?: {
        data?: { unavailableTools?: string[]; unavailableScopes?: string[] };
        warnings: string[];
      };
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.data?.unavailableTools).toEqual(['get-calendar-view']);
    expect(result.structuredContent?.data?.unavailableScopes).toEqual(['Calendars.Read']);
    expect(result.structuredContent?.warnings.join('\n')).toContain(
      'Required enabled tools unavailable'
    );
    expect(result.structuredContent?.warnings.join('\n')).toContain('Required scopes unavailable');
  });

  it('returns confirmation-required next-call shape for permissions remediation instead of executing writes', async () => {
    const server = dashboardServer({
      enabledTools: new Set(['list-users', 'search-sharepoint-sites']),
      allowedScopes: ['User.Read.All', 'Sites.Read.All'],
    });
    const result = (await callTool(server, 'permissions-overview-view')) as {
      content: Array<{ text: string }>;
      structuredContent?: {
        data?: {
          confirmation?: {
            code: string;
            toolName: string;
            confirmationId: string;
            nextCall: Record<string, unknown>;
          };
        };
        nextActions: string[];
      };
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.data?.confirmation).toEqual(
      expect.objectContaining({
        code: 'confirmation_required',
        toolName: 'permissions-overview-view',
        confirmationId: 'permissions-remediation-preview',
        nextCall: expect.objectContaining({ confirmation: true }),
      })
    );
    expect(result.structuredContent?.nextActions.join('\n')).toContain(
      'Confirmation required before remediate risky permission. Call permissions-overview-view again with confirmation=true and confirmationId=permissions-remediation-preview.'
    );
    expect(result.content[0]!.text).toContain(
      'Confirmation required before remediate risky permission'
    );
  });
});

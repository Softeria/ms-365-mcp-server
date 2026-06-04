import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import { buildEffectiveCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import { dashboardDefinition } from '../src/lib/mcp-dashboards/data.js';
import { registerDashboardTools } from '../src/lib/mcp-dashboards/tools.js';
import type { DashboardSlug } from '../src/lib/mcp-apps/assets.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../src/lib/tenant-surface/surface.js';

const TENANT_ID = '22222222-2222-4222-8222-222222222222';
const APP_UNSUPPORTED_FALLBACK =
  'This dashboard is available as a UI resource in Apps-capable clients. This response includes the same data as text, structured JSON, and m365:// resources.';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENDPOINT_ALIASES = new Set(
  (
    JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')) as Array<{
      toolName: string;
    }>
  ).map((endpoint) => endpoint.toolName)
);
const DASHBOARD_SLUGS: readonly DashboardSlug[] = Object.freeze([
  'inbox-triage',
  'calendar-brief',
  'teams-digest',
  'file-search',
  'permissions-overview',
  'connector-diagnostics',
  'skill-editor',
]);
const DASHBOARD_HELPER_TOOLS = new Set([
  'connector-diagnostics',
  'list-skills',
  'validate-skill',
  'save-skill',
]);

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
    enabledToolsExplicit?: boolean;
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
      enabled_tools: options.enabledToolsExplicit === false ? null : 'test-enabled-tools',
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

  it('does not warn that Mail.Read is missing when Mail.ReadWrite is allowed', async () => {
    const result = (await callTool(
      dashboardServer({ allowedScopes: ['Mail.ReadWrite'] }),
      'inbox-triage-view'
    )) as {
      structuredContent?: {
        data?: { unavailableScopes?: string[] };
        warnings: string[];
      };
      isError?: boolean;
    };

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.data?.unavailableScopes).toEqual([]);
    expect(result.structuredContent?.warnings.join('\n')).not.toContain('Mail.Read');
    expect(result.structuredContent?.warnings.join('\n')).not.toContain(
      'Required scopes unavailable'
    );
  });

  it('does not treat visible discovery meta-tools as missing generated dashboard aliases', async () => {
    const result = (await callTool(
      dashboardServer({
        enabledTools: DISCOVERY_META_TOOL_NAMES,
        enabledToolsExplicit: false,
      }),
      'inbox-triage-view'
    )) as {
      structuredContent?: {
        data?: { unavailableTools?: string[] };
        warnings: string[];
      };
      isError?: boolean;
    };

    expect(DISCOVERY_META_TOOL_NAMES.has('list-mail-messages')).toBe(false);
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.data?.unavailableTools).toEqual([]);
    expect(result.structuredContent?.warnings.join('\n')).not.toContain('list-mail-messages');
    expect(result.structuredContent?.warnings.join('\n')).not.toContain(
      'Required enabled tools unavailable'
    );
  });

  it('keeps dashboard generated prerequisites on canonical endpoint aliases', () => {
    const requiredTools = DASHBOARD_SLUGS.flatMap((slug) => [
      ...dashboardDefinition(slug).requiredTools,
    ]);

    expect(requiredTools).toEqual(
      expect.arrayContaining([
        'list-mail-messages',
        'get-calendar-view',
        'list-channel-messages',
        'search-query',
        'list-users',
        'search-sharepoint-sites',
      ])
    );
    expect(requiredTools).not.toContain('me.ListMessages');
    for (const tool of requiredTools) {
      expect(ENDPOINT_ALIASES.has(tool) || DASHBOARD_HELPER_TOOLS.has(tool)).toBe(true);
    }
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

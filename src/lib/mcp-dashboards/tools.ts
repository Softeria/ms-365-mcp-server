import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getRequestTenant, getRequestTokens } from '../../request-context.js';
import type { CallToolResult } from '../../graph-tools.js';
import { createAppViewResult } from '../mcp-apps/register.js';
import { MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA } from '../mcp-results/schemas.js';
import {
  buildConnectorDiagnostics,
  type ConnectorDiagnosticsPayload,
} from '../mcp-capabilities/diagnostics.js';
import {
  buildEffectiveCapabilityProfile,
  DEFAULT_SERVER_CAPABILITIES,
  type ClientCapabilityProfile,
  type McpSurfaceMode,
  type McpTransportKind,
} from '../mcp-capabilities/profile.js';
import type { DashboardSlug } from '../mcp-apps/assets.js';
import {
  DASHBOARD_TOOL_NAMES,
  buildDashboardData,
  dashboardDefinition,
  dashboardToolName,
  type DashboardData,
  type DashboardTenantContext,
} from './data.js';

interface DashboardTenantDeps {
  readonly id?: string | null;
  readonly slug?: string | null;
  readonly preset_version?: string | null;
  readonly enabled_tools?: string | null;
  readonly enabled_tools_set?: ReadonlySet<string>;
  readonly allowed_scopes?: readonly string[];
}

export interface RegisterDashboardToolsDeps {
  readonly server: { readonly name: string; readonly version: string };
  readonly tenant?: DashboardTenantDeps;
  readonly profile?: ClientCapabilityProfile;
  readonly surface: McpSurfaceMode;
  readonly transport: McpTransportKind;
  readonly metadataUrls?: Record<string, string | undefined>;
  readonly expectedDisplayName?: string;
  readonly now?: Date;
}

const DashboardInputZod = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    timebox: z.string().trim().min(1).max(64).optional(),
    confirmation: z.boolean().optional(),
    confirmationId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

const DASHBOARD_ORDER: readonly DashboardSlug[] = Object.freeze([
  'inbox-triage',
  'calendar-brief',
  'teams-digest',
  'file-search',
  'permissions-overview',
  'connector-diagnostics',
  'skill-editor',
]);

function requestTenantContext(deps: RegisterDashboardToolsDeps): DashboardTenantContext | null {
  const requestTenant = getRequestTenant();
  const tenantId = requestTenant.id ?? deps.tenant?.id ?? undefined;
  if (!tenantId) return null;
  return {
    id: tenantId,
    enabledToolsSet: requestTenant.enabledToolsSet ?? deps.tenant?.enabled_tools_set,
    enabledToolsExplicit:
      requestTenant.enabledToolsExplicit ??
      (deps.tenant?.enabled_tools !== null && deps.tenant?.enabled_tools !== undefined),
    allowedScopes: deps.tenant?.allowed_scopes,
    presetVersion: requestTenant.presetVersion ?? deps.tenant?.preset_version ?? undefined,
  };
}

function effectiveProfile(deps: RegisterDashboardToolsDeps): ClientCapabilityProfile {
  const contextProfile = getRequestTokens()?.capabilityProfile;
  return (
    contextProfile ??
    deps.profile ??
    buildEffectiveCapabilityProfile({
      protocolVersion: undefined,
      clientInfo: undefined,
      advertisedCapabilities: { tools: {} },
      transport: deps.transport,
      surface: deps.surface,
      tenantPolicy: { phase8Enabled: deps.surface === 'discovery' },
      serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
    })
  );
}

function diagnosticsPayload(
  deps: RegisterDashboardToolsDeps,
  tenant: DashboardTenantContext,
  profile: ClientCapabilityProfile
): ConnectorDiagnosticsPayload {
  return buildConnectorDiagnostics({
    server: deps.server,
    tenant: { id: tenant.id, label: deps.tenant?.slug ?? undefined },
    surface: deps.surface,
    profile,
    metadataUrls: deps.metadataUrls,
    expectedDisplayName: deps.expectedDisplayName,
  }).structured;
}

function dashboardSummary(data: DashboardData): string {
  const unavailable = [...data.unavailableTools, ...data.unavailableScopes];
  if (unavailable.length > 0) {
    return `${data.title} fallback ready with ${unavailable.length} unavailable prerequisite${unavailable.length === 1 ? '' : 's'}.`;
  }
  return `${data.title} ready.`;
}

function dashboardNextActions(data: DashboardData): string[] {
  return [
    'Open linked m365:// resources for durable follow-up data.',
    ...(data.confirmation
      ? [
          `Confirmation required before ${data.confirmation.action}. Call ${data.confirmation.toolName} again with confirmation=true and confirmationId=${data.confirmation.confirmationId}.`,
        ]
      : []),
    ...(data.unavailableTools.length > 0
      ? ['Enable the required tenant tools or switch to a preset that exposes this dashboard.']
      : []),
    ...(data.unavailableScopes.length > 0
      ? ['Grant the required tenant scopes before expecting live dashboard data.']
      : []),
  ].slice(0, 5);
}

function buildResult(
  slug: DashboardSlug,
  deps: RegisterDashboardToolsDeps,
  args: unknown
): CallToolResult {
  const parsed = DashboardInputZod.safeParse(args);
  if (!parsed.success) {
    return createAppViewResult({
      dashboard: slug,
      toolName: dashboardToolName(slug),
      profile: deps.profile,
      summary: `${dashboardDefinition(slug).title} input rejected.`,
      data: { error: 'invalid_dashboard_input', details: parsed.error.issues },
      warnings: [
        'This view could not load safely. Check the required tenant, scopes, enabled tools, and connector capabilities, then retry.',
      ],
    });
  }

  const tenant = requestTenantContext(deps);
  const profile = effectiveProfile(deps);
  if (!tenant) {
    return createAppViewResult({
      dashboard: slug,
      toolName: dashboardToolName(slug),
      profile,
      summary: `${dashboardDefinition(slug).title} requires tenant context.`,
      data: { error: 'tenant_required' },
      warnings: [
        'This view could not load safely. Check the required tenant, scopes, enabled tools, and connector capabilities, then retry.',
      ],
    });
  }

  const data = buildDashboardData(slug, {
    tenant,
    profile,
    now: deps.now,
    connectorDiagnostics:
      slug === 'connector-diagnostics' ? diagnosticsPayload(deps, tenant, profile) : undefined,
  });

  return createAppViewResult({
    dashboard: slug,
    toolName: DASHBOARD_TOOL_NAMES[slug],
    profile,
    summary: dashboardSummary(data),
    data,
    resources: [...data.resources],
    nextActions: dashboardNextActions(data),
    warnings: [...data.warnings],
  });
}

function registerDashboardTool(
  server: McpServer,
  slug: DashboardSlug,
  deps: RegisterDashboardToolsDeps
): void {
  const definition = dashboardDefinition(slug);
  server
    .tool(
      dashboardToolName(slug),
      `${definition.title}. Returns text, structured JSON, m365:// resource links, and an optional ui:// app link.`,
      DashboardInputZod.shape,
      { title: dashboardToolName(slug), readOnlyHint: true, openWorldHint: false },
      async (args) => buildResult(slug, deps, args)
    )
    .update({ outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never });
}

export function registerDashboardTools(server: McpServer, deps: RegisterDashboardToolsDeps): void {
  for (const slug of DASHBOARD_ORDER) registerDashboardTool(server, slug, deps);
}

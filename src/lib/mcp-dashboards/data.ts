import type { DashboardSlug } from '../mcp-apps/assets.js';
import type { ClientCapabilityProfile } from '../mcp-capabilities/profile.js';
import type { ConnectorDiagnosticsPayload } from '../mcp-capabilities/diagnostics.js';
import { resolveDiscoveryCatalog } from '../discovery-catalog/catalog.js';
import { tenantScopeSatisfies } from '../scope-satisfaction.js';

export const DASHBOARD_TOOL_NAMES = Object.freeze({
  'inbox-triage': 'inbox-triage-view',
  'calendar-brief': 'calendar-brief-view',
  'teams-digest': 'teams-digest-view',
  'file-search': 'file-search-view',
  'permissions-overview': 'permissions-overview-view',
  'connector-diagnostics': 'connector-diagnostics',
  'skill-editor': 'skill-editor-view',
} as const satisfies Record<DashboardSlug, string>);

export type DashboardToolName = (typeof DASHBOARD_TOOL_NAMES)[DashboardSlug];

export interface DashboardTenantContext {
  readonly id: string;
  readonly enabledToolsSet?: ReadonlySet<string>;
  readonly enabledToolsExplicit?: boolean;
  readonly allowedScopes?: readonly string[];
  readonly presetVersion?: string;
}

export interface DashboardBuildContext {
  readonly tenant: DashboardTenantContext;
  readonly profile?: ClientCapabilityProfile;
  readonly now?: Date;
  readonly connectorDiagnostics?: ConnectorDiagnosticsPayload;
}

export interface DashboardResourceLink {
  readonly uri: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly description?: string;
}

export interface DashboardPanel {
  readonly title: string;
  readonly status: 'empty' | 'ready' | 'warning' | 'confirmation-required';
  readonly items: ReadonlyArray<Record<string, unknown>>;
}

export interface DashboardData {
  readonly dashboard: DashboardSlug;
  readonly title: string;
  readonly lastUpdated: string;
  readonly tenantId: string;
  readonly emptyState: {
    readonly heading: string;
    readonly body: string;
  };
  readonly requiredTools: readonly string[];
  readonly requiredScopes: readonly string[];
  readonly unavailableTools: readonly string[];
  readonly unavailableScopes: readonly string[];
  readonly panels: readonly DashboardPanel[];
  readonly resources: readonly DashboardResourceLink[];
  readonly warnings: readonly string[];
  readonly confirmation?: {
    readonly code: 'confirmation_required';
    readonly action: string;
    readonly toolName: string;
    readonly confirmationId: string;
    readonly nextCall: Record<string, unknown>;
  };
  readonly capabilities?: {
    readonly apps: boolean;
    readonly resources: boolean;
    readonly structuredToolResults: boolean;
  };
  readonly diagnostics?: ConnectorDiagnosticsPayload;
}

interface DashboardDefinition {
  readonly slug: DashboardSlug;
  readonly title: string;
  readonly requiredTools: readonly string[];
  readonly requiredScopes: readonly string[];
  readonly emptyHeading: string;
  readonly emptyHint: string;
  readonly resourcePath: string;
  readonly panelTitle: string;
  readonly sampleItems: ReadonlyArray<Record<string, unknown>>;
  readonly warnings?: readonly string[];
  readonly confirmation?: DashboardData['confirmation'];
}

const EMPTY_STATE_BODY =
  'This view has no matching items for the current tenant, account, filters, and enabled tools. Adjust filters or ask for a broader search.';

const DEFINITIONS: Record<DashboardSlug, DashboardDefinition> = {
  'inbox-triage': {
    slug: 'inbox-triage',
    title: 'Inbox Triage Dashboard',
    requiredTools: ['list-mail-messages'],
    requiredScopes: ['Mail.Read'],
    emptyHeading: 'No messages need triage',
    emptyHint: 'Filter by priority, unread state, or a shorter received-time window.',
    resourcePath: 'dashboards/inbox-triage.json',
    panelTitle: 'Prioritized messages',
    sampleItems: [],
  },
  'calendar-brief': {
    slug: 'calendar-brief',
    title: 'Calendar Brief Dashboard',
    requiredTools: ['get-calendar-view'],
    requiredScopes: ['Calendars.Read'],
    emptyHeading: 'No upcoming events found',
    emptyHint: 'Expand the time window or include additional calendars.',
    resourcePath: 'dashboards/calendar-brief.json',
    panelTitle: 'Upcoming events and conflicts',
    sampleItems: [],
  },
  'teams-digest': {
    slug: 'teams-digest',
    title: 'Teams Digest Dashboard',
    requiredTools: ['list-channel-messages'],
    requiredScopes: ['ChannelMessage.Read.All'],
    emptyHeading: 'No recent Teams activity found',
    emptyHint: 'Filter by team, channel, mentions, or a broader timebox.',
    resourcePath: 'dashboards/teams-digest.json',
    panelTitle: 'Recent threads and unresolved questions',
    sampleItems: [],
  },
  'file-search': {
    slug: 'file-search',
    title: 'File Search Dashboard',
    requiredTools: ['search-query'],
    requiredScopes: ['Files.Read.All'],
    emptyHeading: 'No files matched this search',
    emptyHint: 'Refine the query, modified range, file type, site, or drive.',
    resourcePath: 'dashboards/file-search.json',
    panelTitle: 'Preview-safe file results',
    sampleItems: [],
  },
  'permissions-overview': {
    slug: 'permissions-overview',
    title: 'Permissions Overview Dashboard',
    requiredTools: ['list-users', 'search-sharepoint-sites'],
    requiredScopes: ['User.Read.All', 'Sites.Read.All'],
    emptyHeading: 'No risky permissions found',
    emptyHint: 'Filter by risk, resource type, subject, or sharing scope.',
    resourcePath: 'dashboards/permissions-overview.json',
    panelTitle: 'High-risk sharing and permissions',
    sampleItems: [],
    warnings: [
      'Permissions remediation is high-risk; this dashboard returns confirmation-required next-call data instead of executing writes.',
    ],
    confirmation: {
      code: 'confirmation_required',
      action: 'remediate risky permission',
      toolName: 'permissions-overview-view',
      confirmationId: 'permissions-remediation-preview',
      nextCall: {
        toolName: 'permissions-overview-view',
        confirmation: true,
        confirmationId: 'permissions-remediation-preview',
      },
    },
  },
  'connector-diagnostics': {
    slug: 'connector-diagnostics',
    title: 'Connector Diagnostics Dashboard',
    requiredTools: ['connector-diagnostics'],
    requiredScopes: [],
    emptyHeading: 'No connector diagnostics available',
    emptyHint:
      'Run connector diagnostics after tenant context and capability profile are available.',
    resourcePath: 'dashboards/connector-diagnostics.json',
    panelTitle: 'Capability matrix and metadata URLs',
    sampleItems: [],
  },
  'skill-editor': {
    slug: 'skill-editor',
    title: 'Skill Editor Dashboard',
    requiredTools: ['list-skills', 'validate-skill', 'save-skill'],
    requiredScopes: [],
    emptyHeading: 'No custom skills yet',
    emptyHint: 'Fork a built-in skill, import a pack, or save a tenant/user draft.',
    resourcePath: 'dashboards/skill-editor.json',
    panelTitle: 'Editable skill states',
    sampleItems: [
      { state: 'built-in', label: 'Read-only badge', actions: ['render', 'fork', 'export'] },
      {
        state: 'tenant-custom',
        label: 'Editable badge',
        actions: ['validate', 'save draft', 'publish', 'export'],
      },
      {
        state: 'user-personal',
        label: 'Personal badge',
        actions: ['validate', 'save draft', 'publish'],
      },
      { state: 'forked-built-in', label: 'Forked badge', actions: ['compare source', 'publish'] },
      {
        state: 'invalid-draft',
        label: 'Invalid references warning',
        actions: ['save as draft only'],
      },
      { state: 'high-risk', label: 'High-risk warning', actions: ['require confirmation'] },
    ],
    warnings: [
      'Delete skill: This disables the custom skill for this tenant or user. Built-in skills cannot be deleted. Confirm the skill name to continue.',
    ],
  },
};

function tenantResourceUri(tenantId: string, path: string): string {
  return `m365://tenant/${tenantId}/${path}`;
}

function missingTools(requiredTools: readonly string[], tenant: DashboardTenantContext): string[] {
  if (!tenant.enabledToolsSet && !tenant.presetVersion) return [];
  const effectiveTools = tenant.presetVersion
    ? resolveDiscoveryCatalog({
        presetVersion: tenant.presetVersion,
        enabledToolsSet: tenant.enabledToolsSet,
        enabledToolsExplicit: tenant.enabledToolsExplicit,
        registryAliases: requiredTools,
      }).discoveryCatalogSet
    : tenant.enabledToolsSet;
  if (!effectiveTools) return [];
  return requiredTools.filter((tool) => !effectiveTools.has(tool));
}

function missingScopes(
  requiredScopes: readonly string[],
  allowedScopes: readonly string[] | undefined
): string[] {
  if (!allowedScopes) return [];
  return requiredScopes.filter((scope) => !tenantScopeSatisfies(allowedScopes, scope));
}

function capabilityFlags(
  profile: ClientCapabilityProfile | undefined
): DashboardData['capabilities'] {
  if (!profile) return undefined;
  return {
    apps: profile.capabilities.apps.effective,
    resources: profile.capabilities.resources.effective,
    structuredToolResults: profile.capabilities.structuredToolResults.effective,
  };
}

function buildWarnings(
  definition: DashboardDefinition,
  unavailableTools: readonly string[],
  unavailableScopes: readonly string[],
  profile: ClientCapabilityProfile | undefined
): string[] {
  return [
    ...(unavailableTools.length > 0
      ? [
          `Required enabled tools unavailable for this tenant: ${unavailableTools.join(', ')}. Dashboard data is limited to fallback resources.`,
        ]
      : []),
    ...(unavailableScopes.length > 0
      ? [
          `Required scopes unavailable for this tenant: ${unavailableScopes.join(', ')}. Dashboard data is limited to fallback resources.`,
        ]
      : []),
    ...(profile?.capabilities.apps.effective === false
      ? [
          'Your client does not advertise apps. I returned text, structured data, and resource links instead.',
        ]
      : []),
    ...(definition.warnings ?? []),
  ];
}

export function dashboardDefinition(slug: DashboardSlug): DashboardDefinition {
  return DEFINITIONS[slug];
}

export function dashboardToolName(slug: DashboardSlug): DashboardToolName {
  return DASHBOARD_TOOL_NAMES[slug];
}

export function buildDashboardData(
  slug: DashboardSlug,
  context: DashboardBuildContext
): DashboardData {
  const definition = dashboardDefinition(slug);
  const unavailableTools = missingTools(definition.requiredTools, context.tenant);
  const unavailableScopes = missingScopes(definition.requiredScopes, context.tenant.allowedScopes);
  const resource = {
    uri: tenantResourceUri(context.tenant.id, definition.resourcePath),
    name: `${slug} data`,
    mimeType: 'application/json',
    description: `${definition.title} backing data for the current tenant/session.`,
  };
  const diagnostics = slug === 'connector-diagnostics' ? context.connectorDiagnostics : undefined;
  const items = diagnostics
    ? [
        {
          expectedDisplayName: diagnostics.expectedDisplayName,
          transport: diagnostics.transport,
          enabledFeatures: diagnostics.enabledFeatures,
          disabledFeatures: diagnostics.disabledFeatures,
          metadataUrls: diagnostics.metadataUrls,
        },
      ]
    : definition.sampleItems;

  return {
    dashboard: slug,
    title: definition.title,
    lastUpdated: (context.now ?? new Date()).toISOString(),
    tenantId: context.tenant.id,
    emptyState: {
      heading: definition.emptyHeading,
      body: `${EMPTY_STATE_BODY} ${definition.emptyHint}`,
    },
    requiredTools: definition.requiredTools,
    requiredScopes: definition.requiredScopes,
    unavailableTools,
    unavailableScopes,
    panels: [
      {
        title: definition.panelTitle,
        status:
          definition.confirmation && unavailableTools.length === 0 && unavailableScopes.length === 0
            ? 'confirmation-required'
            : unavailableTools.length > 0 || unavailableScopes.length > 0
              ? 'warning'
              : items.length > 0
                ? 'ready'
                : 'empty',
        items,
      },
    ],
    resources: [resource],
    warnings: buildWarnings(definition, unavailableTools, unavailableScopes, context.profile),
    ...(definition.confirmation ? { confirmation: definition.confirmation } : {}),
    ...(context.profile ? { capabilities: capabilityFlags(context.profile) } : {}),
    ...(diagnostics ? { diagnostics } : {}),
  };
}

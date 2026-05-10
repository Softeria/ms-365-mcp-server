import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MARKDOWN_MIME_TYPE, STATIC_CATALOG_RESOURCES, WORKLOAD_GUIDE_SLUGS } from './catalog.js';
import { JSON_MIME_TYPE, readMcpResource, type ReadMcpResourceDeps } from './read.js';
import { GRAPH_BACKED_RESOURCE_TEMPLATES } from './graph-backed.js';
import { registerResourceSubscriptionHandlers } from '../mcp-notifications/register-handlers.js';
import type { RedisResourceSubscriptionStore } from '../mcp-notifications/resource-subscriptions.js';
import {
  completeAlias,
  completeGraphBacked,
  completeTenantId,
  type GraphCompletionProviderName,
} from '../mcp-completions/handlers.js';
import { isDiscoverySurface } from '../tenant-surface/surface.js';

export interface RegisterMcpResourcesDeps extends ReadMcpResourceDeps {
  resourceSubscriptions?: RedisResourceSubscriptionStore;
}

interface ResourceDefinition {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
}

interface TemplateDefinition {
  name: string;
  uriTemplate: string;
  title: string;
  description: string;
  mimeType: string;
  complete?: Record<
    string,
    (value: string, context?: Record<string, unknown>) => string[] | Promise<string[]>
  >;
}

const SCOPE_MAP_RESOURCE: ResourceDefinition = Object.freeze({
  uri: 'm365://catalog/scope-map.json',
  name: 'catalog-scope-map',
  title: 'Microsoft 365 MCP Scope Map',
  description: 'JSON map of Microsoft 365 MCP endpoint aliases to required Graph scopes.',
  mimeType: JSON_MIME_TYPE,
});

const TENANT_RESOURCE_DEFINITIONS: readonly Omit<ResourceDefinition, 'uri'>[] = Object.freeze([
  {
    name: 'tenant-enabled-tools',
    title: 'Tenant Enabled Tools',
    description: 'Read-only JSON view of the caller tenant enabled tool aliases.',
    mimeType: JSON_MIME_TYPE,
  },
  {
    name: 'tenant-scopes',
    title: 'Tenant Granted Scopes',
    description: 'Read-only JSON view of the caller tenant configured Azure AD scopes.',
    mimeType: JSON_MIME_TYPE,
  },
  {
    name: 'tenant-audit-recent',
    title: 'Tenant Recent Audit Rows',
    description: 'Read-only JSON view of the latest 100 audit rows for the caller tenant.',
    mimeType: JSON_MIME_TYPE,
  },
  {
    name: 'tenant-bookmarks',
    title: 'Tenant Tool Bookmarks',
    description: 'Read-only JSON view of the caller tenant saved tool bookmarks.',
    mimeType: JSON_MIME_TYPE,
  },
  {
    name: 'tenant-recipes',
    title: 'Tenant Tool Recipes',
    description: 'Read-only JSON view of the caller tenant saved tool recipes.',
    mimeType: JSON_MIME_TYPE,
  },
  {
    name: 'tenant-facts',
    title: 'Tenant Facts',
    description: 'Read-only JSON view of the caller tenant remembered facts.',
    mimeType: JSON_MIME_TYPE,
  },
]);

const TENANT_RESOURCE_PATHS = [
  'enabled-tools.json',
  'scopes.json',
  'audit/recent.json',
  'bookmarks.json',
  'recipes.json',
  'facts.json',
] as const;

const CONNECTOR_RESOURCE_PATHS = [
  {
    path: 'connector/capabilities.json',
    name: 'tenant-connector-capabilities',
    title: 'Tenant Connector Capabilities',
    description: 'Read-only JSON view of the effective MCP capability profile for this connector.',
  },
  {
    path: 'connector/diagnostics.json',
    name: 'tenant-connector-diagnostics',
    title: 'Tenant Connector Diagnostics',
    description:
      'Read-only JSON diagnostics for connector identity, capabilities, and metadata URLs.',
  },
] as const;

const SKILL_RESOURCE_TEMPLATES = [
  {
    name: 'tenant-skill-markdown-template',
    uriTemplate: 'm365://tenant/{tenantId}/skills/{name}.md',
    title: 'Tenant Skill Markdown Template',
    description: 'Parameterized markdown view of an editable tenant skill.',
    mimeType: 'text/markdown',
    complete: { tenantId: completeTenantId },
  },
  {
    name: 'tenant-skill-schema-template',
    uriTemplate: 'm365://tenant/{tenantId}/skills/{name}.schema.json',
    title: 'Tenant Skill Schema Template',
    description: 'Parameterized JSON schema view of an editable tenant skill.',
    mimeType: JSON_MIME_TYPE,
    complete: { tenantId: completeTenantId },
  },
  {
    name: 'tenant-skill-pack-template',
    uriTemplate: 'm365://tenant/{tenantId}/skill-packs/{packName}.json',
    title: 'Tenant Skill Pack Template',
    description: 'Parameterized JSON skill pack export resource.',
    mimeType: JSON_MIME_TYPE,
    complete: { tenantId: completeTenantId },
  },
] as const satisfies readonly TemplateDefinition[];

const TENANT_RESOURCE_TEMPLATES: readonly TemplateDefinition[] = Object.freeze([
  ...TENANT_RESOURCE_PATHS.map((pathName) => ({
    name: `tenant-${pathName.replace(/[/_.]/g, '-')}-template`,
    uriTemplate: `m365://tenant/{tenantId}/${pathName}`,
    title: `Tenant ${pathName} Resource Template`,
    description: `Parameterized tenant ${pathName} resource for the caller tenant.`,
    mimeType: JSON_MIME_TYPE,
    complete: { tenantId: completeTenantId },
  })),
  ...CONNECTOR_RESOURCE_PATHS.map((resource) => ({
    name: `${resource.name}-template`,
    uriTemplate: `m365://tenant/{tenantId}/${resource.path}`,
    title: `${resource.title} Template`,
    description: resource.description,
    mimeType: JSON_MIME_TYPE,
    complete: { tenantId: completeTenantId },
  })),
]);

function legacyMcpAlias(uri: string): string {
  return uri.replace(/^m365:/, 'mcp:');
}

function withLegacyAlias(resource: ResourceDefinition): ResourceDefinition[] {
  return [
    resource,
    {
      ...resource,
      uri: legacyMcpAlias(resource.uri),
      name: `${resource.name}-mcp-alias`,
      title: `${resource.title} (mcp:// compatibility alias)`,
    },
  ];
}

function staticResourceDefinitions(): ResourceDefinition[] {
  const canonical = [
    ...STATIC_CATALOG_RESOURCES.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      title: resource.title,
      description: resource.description,
      mimeType: resource.mimeType,
    })),
    SCOPE_MAP_RESOURCE,
  ];
  return canonical.flatMap(withLegacyAlias);
}

function tenantResourceDefinitions(tenantId: string): ResourceDefinition[] {
  const canonical = TENANT_RESOURCE_DEFINITIONS.map((definition, index) => ({
    ...definition,
    uri: `m365://tenant/${tenantId}/${TENANT_RESOURCE_PATHS[index]}`,
  }));
  return canonical.flatMap(withLegacyAlias);
}

function connectorResourceDefinitions(tenantId: string): ResourceDefinition[] {
  return CONNECTOR_RESOURCE_PATHS.flatMap((resource) =>
    withLegacyAlias({
      uri: `m365://tenant/${tenantId}/${resource.path}`,
      name: resource.name,
      title: resource.title,
      description: resource.description,
      mimeType: JSON_MIME_TYPE,
    })
  );
}

function skillResourceDefinitions(tenantId: string): ResourceDefinition[] {
  return [
    {
      uri: `m365://tenant/${tenantId}/skills/index.json`,
      name: 'tenant-skills-index',
      title: 'Tenant Skills Index',
      description: 'Read-only JSON index of editable skills visible to the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
  ];
}

function registerStaticResource(
  server: McpServer,
  resource: ResourceDefinition,
  deps: RegisterMcpResourcesDeps
): void {
  server.registerResource(
    resource.name,
    resource.uri,
    {
      title: resource.title,
      description: resource.description,
      mimeType: resource.mimeType,
    },
    (uri) => readMcpResource(uri.toString(), deps)
  );
}

function registerTemplate(
  server: McpServer,
  template: TemplateDefinition,
  deps: RegisterMcpResourcesDeps
): void {
  server.registerResource(
    template.name,
    new ResourceTemplate(template.uriTemplate, {
      list: undefined,
      ...(template.complete ? { complete: template.complete } : {}),
    }),
    {
      title: template.title,
      description: template.description,
      mimeType: template.mimeType,
    },
    (uri) => readMcpResource(uri.toString(), deps)
  );
}

function registerSkillTemplates(server: McpServer, deps: RegisterMcpResourcesDeps): void {
  for (const template of SKILL_RESOURCE_TEMPLATES) {
    registerTemplate(server, template, deps);
  }
}

const GRAPH_TEMPLATE_COMPLETIONS: Record<
  string,
  Record<string, GraphCompletionProviderName>
> = Object.freeze({
  'tenant-user-resource-template': { userId: 'user' },
  'tenant-group-resource-template': { groupId: 'group' },
  'tenant-team-resource-template': { teamId: 'team' },
  'tenant-team-channel-resource-template': { teamId: 'team', channelId: 'channel' },
  'tenant-site-resource-template': { siteId: 'site' },
  'tenant-drive-item-resource-template': { driveId: 'drive', itemId: 'driveItem' },
  'tenant-mail-message-resource-template': { messageId: 'message' },
  'tenant-calendar-event-resource-template': { eventId: 'event' },
});

function completeGraphVariable(
  provider: GraphCompletionProviderName,
  deps: RegisterMcpResourcesDeps
): (value: string, context?: Record<string, unknown>) => Promise<string[]> {
  return (value, context) =>
    completeGraphBacked(provider, value, { graphClient: deps.graphClient }, context);
}

function registerTemplates(server: McpServer, deps: RegisterMcpResourcesDeps): void {
  for (const scheme of ['m365', 'mcp'] as const) {
    registerTemplate(
      server,
      {
        name: `catalog-workload-guide-template-${scheme}`,
        uriTemplate: `${scheme}://catalog/workloads/{slug}.md`,
        title: `Catalog Workload Guide Template (${scheme}://)`,
        description: 'Parameterized workload guide resource for Microsoft 365 catalog navigation.',
        mimeType: MARKDOWN_MIME_TYPE,
        complete: {
          slug: (value) => WORKLOAD_GUIDE_SLUGS.filter((slug) => slug.startsWith(value)),
        },
      },
      deps
    );

    registerTemplate(
      server,
      {
        name: `endpoint-schema-template-${scheme}`,
        uriTemplate: `${scheme}://endpoint/{alias}.schema.json`,
        title: `Endpoint Schema Template (${scheme}://)`,
        description: 'Parameterized JSON Schema resource for generated Graph and product aliases.',
        mimeType: JSON_MIME_TYPE,
        complete: { alias: (value) => completeAlias(value) },
      },
      deps
    );
  }

  for (const template of TENANT_RESOURCE_TEMPLATES) {
    registerTemplate(server, template, deps);
  }

  for (const template of GRAPH_BACKED_RESOURCE_TEMPLATES) {
    const providers = GRAPH_TEMPLATE_COMPLETIONS[template.name] ?? {};
    const completions = Object.fromEntries(
      Object.entries(providers).map(([name, provider]) => [
        name,
        completeGraphVariable(provider, deps),
      ])
    );
    registerTemplate(
      server,
      {
        ...template,
        complete: {
          tenantId: completeTenantId,
          ...completions,
        },
      },
      deps
    );
  }
}

export function registerMcpResources(server: McpServer, deps: RegisterMcpResourcesDeps): void {
  const tenantId = deps.tenant?.id;
  if (!tenantId) {
    return;
  }

  if (deps.resourceSubscriptions) {
    registerResourceSubscriptionHandlers(server, {
      tenantId,
      store: deps.resourceSubscriptions,
    });
  }

  for (const resource of staticResourceDefinitions()) {
    registerStaticResource(server, resource, deps);
  }

  for (const resource of tenantResourceDefinitions(tenantId)) {
    registerStaticResource(server, resource, deps);
  }

  if (isDiscoverySurface(deps.tenant?.preset_version)) {
    for (const resource of connectorResourceDefinitions(tenantId)) {
      registerStaticResource(server, resource, deps);
    }
    for (const resource of skillResourceDefinitions(tenantId)) {
      registerStaticResource(server, resource, deps);
    }
  }

  registerTemplates(server, deps);
  if (isDiscoverySurface(deps.tenant?.preset_version)) {
    registerSkillTemplates(server, deps);
  }
}

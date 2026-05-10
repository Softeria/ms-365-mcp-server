import { ErrorCode, McpError, type ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { resolveDiscoveryCatalog } from '../discovery-catalog/catalog.js';
import type { GraphBackedMcpResourceUri, GraphBackedResourceKind } from './uri.js';

const JSON_MIME_TYPE = 'application/json';
const MAX_GRAPH_RESOURCE_ARRAY_ITEMS = 50;
const MAX_GRAPH_RESOURCE_OBJECT_KEYS = 80;
const MAX_GRAPH_RESOURCE_STRING_LENGTH = 4000;
const MAX_GRAPH_RESOURCE_DEPTH = 6;
const MAX_EXECUTE_TOOL_RAW_TEXT_LENGTH = 7000;
const FORBIDDEN_KEYS = /authorization|cookie|token|secret|password/i;

export interface GraphBackedGraphClient {
  graphRequest(
    endpoint: string,
    options: { method: 'GET'; headers?: Record<string, string> }
  ): Promise<{
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
    _meta?: unknown;
  }>;
}

export interface GraphBackedResourceDeps {
  tenant?: {
    id?: string;
    allowed_scopes?: readonly string[];
    enabled_tools?: string | null;
    enabled_tools_set?: ReadonlySet<string>;
    preset_version?: string;
  };
  graphClient?: GraphBackedGraphClient;
}

export interface GraphBackedResourceTemplate {
  readonly name: string;
  readonly uriTemplate: string;
  readonly title: string;
  readonly description: string;
  readonly mimeType: typeof JSON_MIME_TYPE;
}

export interface GraphResourceLink extends Record<string, unknown> {
  readonly uri: string;
  readonly name?: string;
  readonly mimeType?: string;
  readonly description?: string;
}

interface GraphBackedDefinition {
  readonly kind: GraphBackedResourceKind;
  readonly toolName: string;
  readonly requiredScopes: readonly string[];
  readonly template: GraphBackedResourceTemplate;
  readonly graphPath: (ids: Readonly<Record<string, string>>) => string;
}

export const GRAPH_BACKED_RESOURCE_TEMPLATES: readonly GraphBackedResourceTemplate[] =
  Object.freeze([
    {
      name: 'tenant-user-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/users/{userId}.json',
      title: 'Tenant User Resource Template',
      description: 'Bounded read-only Microsoft Graph user resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-group-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/groups/{groupId}.json',
      title: 'Tenant Group Resource Template',
      description: 'Bounded read-only Microsoft Graph group resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-team-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/teams/{teamId}.json',
      title: 'Tenant Team Resource Template',
      description: 'Bounded read-only Microsoft Graph team resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-team-channel-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/teams/{teamId}/channels/{channelId}.json',
      title: 'Tenant Team Channel Resource Template',
      description: 'Bounded read-only Microsoft Graph team channel resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-site-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/sites/{siteId}.json',
      title: 'Tenant SharePoint Site Resource Template',
      description:
        'Bounded read-only Microsoft Graph SharePoint site resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-drive-item-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/drives/{driveId}/items/{itemId}.json',
      title: 'Tenant Drive Item Resource Template',
      description: 'Bounded read-only Microsoft Graph drive item resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-mail-message-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/mail/messages/{messageId}.json',
      title: 'Tenant Mail Message Resource Template',
      description: 'Bounded read-only Microsoft Graph mail message resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
    {
      name: 'tenant-calendar-event-resource-template',
      uriTemplate: 'm365://tenant/{tenantId}/calendar/events/{eventId}.json',
      title: 'Tenant Calendar Event Resource Template',
      description:
        'Bounded read-only Microsoft Graph calendar event resource for the caller tenant.',
      mimeType: JSON_MIME_TYPE,
    },
  ]);

const GRAPH_BACKED_DEFINITIONS: Readonly<Record<GraphBackedResourceKind, GraphBackedDefinition>> =
  Object.freeze({
    user: {
      kind: 'user',
      toolName: 'list-users',
      requiredScopes: ['User.Read.All'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[0],
      graphPath: (ids) => `/users/${encodePathSegment(ids.userId)}`,
    },
    group: {
      kind: 'group',
      toolName: 'get-group',
      requiredScopes: ['Group.Read.All'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[1],
      graphPath: (ids) => `/groups/${encodePathSegment(ids.groupId)}`,
    },
    team: {
      kind: 'team',
      toolName: 'get-team',
      requiredScopes: ['Team.ReadBasic.All'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[2],
      graphPath: (ids) => `/teams/${encodePathSegment(ids.teamId)}`,
    },
    'team-channel': {
      kind: 'team-channel',
      toolName: 'get-team-channel',
      requiredScopes: ['Channel.ReadBasic.All'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[3],
      graphPath: (ids) =>
        `/teams/${encodePathSegment(ids.teamId)}/channels/${encodePathSegment(ids.channelId)}`,
    },
    site: {
      kind: 'site',
      toolName: 'get-sharepoint-site',
      requiredScopes: ['Sites.Read.All'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[4],
      graphPath: (ids) => `/sites/${encodePathSegment(ids.siteId)}`,
    },
    'drive-item': {
      kind: 'drive-item',
      toolName: 'get-drive-item',
      requiredScopes: ['Files.Read'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[5],
      graphPath: (ids) =>
        `/drives/${encodePathSegment(ids.driveId)}/items/${encodePathSegment(ids.itemId)}`,
    },
    'mail-message': {
      kind: 'mail-message',
      toolName: 'get-mail-message',
      requiredScopes: ['Mail.Read'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[6],
      graphPath: (ids) => `/me/messages/${encodePathSegment(ids.messageId)}`,
    },
    'calendar-event': {
      kind: 'calendar-event',
      toolName: 'get-calendar-event',
      requiredScopes: ['Calendars.Read'],
      template: GRAPH_BACKED_RESOURCE_TEMPLATES[7],
      graphPath: (ids) => `/me/events/${encodePathSegment(ids.eventId)}`,
    },
  });

function encodePathSegment(value: string | undefined): string {
  return encodeURIComponent(value ?? '').replace(/%3D/gi, '=');
}

function canonicalGraphUri(tenantId: string, path: string): string {
  return `m365://tenant/${tenantId}/${path}`;
}

function throwResourceError(
  code: string,
  message: string,
  data: Record<string, unknown> = {}
): never {
  throw new McpError(ErrorCode.InvalidParams, message, { code, ...data });
}

function hasScope(allowedScopes: readonly string[], requiredScope: string): boolean {
  if (allowedScopes.includes(requiredScope)) return true;
  if (requiredScope.endsWith('.Read.All')) {
    const writeScope = requiredScope.replace(/\.Read\.All$/, '.ReadWrite.All');
    return allowedScopes.includes(writeScope);
  }
  if (requiredScope.endsWith('.Read')) {
    const writeScope = requiredScope.replace(/\.Read$/, '.ReadWrite');
    return allowedScopes.includes(writeScope);
  }
  return false;
}

function assertGraphResourceAllowed(
  definition: GraphBackedDefinition,
  deps: GraphBackedResourceDeps
): void {
  const enabledTools = deps.tenant?.enabled_tools_set;
  const effectiveTools = deps.tenant?.preset_version
    ? resolveDiscoveryCatalog({
        presetVersion: deps.tenant.preset_version,
        enabledToolsSet: enabledTools,
        enabledToolsExplicit:
          deps.tenant.enabled_tools !== null && deps.tenant.enabled_tools !== undefined,
        registryAliases: [definition.toolName],
      }).discoveryCatalogSet
    : enabledTools;
  if (!effectiveTools?.has(definition.toolName)) {
    throwResourceError(
      'tool_not_enabled_for_tenant',
      `Graph-backed resource requires enabled tool: ${definition.toolName}.`,
      { toolName: definition.toolName }
    );
  }

  const allowedScopes = deps.tenant?.allowed_scopes ?? [];
  const unavailableScopes = definition.requiredScopes.filter(
    (scope) => !hasScope(allowedScopes, scope)
  );
  if (unavailableScopes.length > 0) {
    throwResourceError(
      'scope_not_allowed_for_tenant',
      `Graph-backed resource requires tenant scopes: ${unavailableScopes.join(', ')}.`,
      { scopes: unavailableScopes }
    );
  }
}

function boundedJson(value: unknown, depth = 0): { value: unknown; truncated: boolean } {
  if (depth > MAX_GRAPH_RESOURCE_DEPTH) return { value: '[truncated:max-depth]', truncated: true };
  if (value === null || value === undefined) return { value, truncated: false };
  if (typeof value === 'string') {
    if (value.length <= MAX_GRAPH_RESOURCE_STRING_LENGTH) return { value, truncated: false };
    return { value: `${value.slice(0, MAX_GRAPH_RESOURCE_STRING_LENGTH)}…`, truncated: true };
  }
  if (typeof value === 'number' || typeof value === 'boolean') return { value, truncated: false };
  if (typeof value === 'bigint') return { value: value.toString(), truncated: false };
  if (value instanceof Date) return { value: value.toISOString(), truncated: false };
  if (Array.isArray(value)) {
    let truncated = value.length > MAX_GRAPH_RESOURCE_ARRAY_ITEMS;
    const bounded = value.slice(0, MAX_GRAPH_RESOURCE_ARRAY_ITEMS).map((item) => {
      const nested = boundedJson(item, depth + 1);
      truncated ||= nested.truncated;
      return nested.value;
    });
    return { value: bounded, truncated };
  }
  if (typeof value !== 'object') return { value: String(value), truncated: false };

  const entries = Object.entries(value as Record<string, unknown>);
  let truncated = entries.length > MAX_GRAPH_RESOURCE_OBJECT_KEYS;
  const boundedEntries = entries
    .filter(([key]) => !FORBIDDEN_KEYS.test(key))
    .slice(0, MAX_GRAPH_RESOURCE_OBJECT_KEYS)
    .map(([key, nested]) => {
      const bounded = boundedJson(nested, depth + 1);
      truncated ||= bounded.truncated;
      return [key, bounded.value] as const;
    });
  return { value: Object.fromEntries(boundedEntries), truncated };
}

function parseGraphText(text: string | undefined): unknown {
  if (!text) {
    throwResourceError(
      'unsupported_graph_resource_payload',
      'Graph-backed resource returned no text.'
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throwResourceError(
      'unsupported_graph_resource_payload',
      'Graph-backed resources only expose JSON text payloads.'
    );
  }
}

export async function readGraphBackedResource(
  uri: string,
  parsed: GraphBackedMcpResourceUri,
  deps: GraphBackedResourceDeps
): Promise<ReadResourceResult> {
  const definition = GRAPH_BACKED_DEFINITIONS[parsed.graphKind];
  assertGraphResourceAllowed(definition, deps);

  if (!deps.graphClient) {
    throwResourceError(
      'graph_resource_client_unavailable',
      'Graph-backed resource reads require a Graph client.'
    );
  }

  const response = await deps.graphClient.graphRequest(definition.graphPath(parsed.ids), {
    method: 'GET',
    headers: { Accept: JSON_MIME_TYPE },
  });
  if (response.isError) {
    throwResourceError('graph_resource_read_failed', 'Graph-backed resource read failed.');
  }

  const payload = parseGraphText(response.content?.[0]?.text);
  const bounded = boundedJson(payload);
  const canonical = canonicalGraphUri(parsed.tenantId, parsed.path);
  const body = {
    uri: canonical,
    requestedUri: uri,
    kind: parsed.graphKind,
    toolName: definition.toolName,
    readOnly: true,
    bounded: true,
    truncated: bounded.truncated,
    data: bounded.value,
  };

  return {
    contents: [
      {
        uri: canonical,
        mimeType: JSON_MIME_TYPE,
        text: JSON.stringify(body, null, 2),
      },
    ],
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function itemList(data: unknown): Array<Record<string, unknown>> {
  if (typeof data !== 'object' || data === null) return [];
  if (Array.isArray((data as { value?: unknown }).value)) {
    return (data as { value: unknown[] }).value.filter(
      (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
    );
  }
  return [data as Record<string, unknown>];
}

function firstString(params: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function linksForItems(
  tenantId: string,
  data: unknown,
  build: (item: Record<string, unknown>) => GraphResourceLink | null
): GraphResourceLink[] {
  return itemList(data)
    .map(build)
    .filter((link): link is GraphResourceLink => link !== null)
    .slice(0, 25);
}

function idLink(
  tenantId: string,
  path: string,
  name: string,
  description: string
): GraphResourceLink {
  return { uri: canonicalGraphUri(tenantId, path), name, mimeType: JSON_MIME_TYPE, description };
}

export function graphResourceLinksForToolResult(input: {
  toolName: string;
  tenantId?: string;
  data: unknown;
  parameters?: Record<string, unknown>;
}): GraphResourceLink[] {
  const tenantId = input.tenantId;
  if (!tenantId) return [];
  const params = input.parameters ?? {};

  switch (input.toolName) {
    case 'list-users':
    case 'get-current-user':
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `users/${encodePathSegment(id)}.json`,
              'User resource',
              'Durable user resource link.'
            )
          : null;
      });
    case 'list-groups':
    case 'get-group':
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `groups/${encodePathSegment(id)}.json`,
              'Group resource',
              'Durable group resource link.'
            )
          : null;
      });
    case 'list-joined-teams':
    case 'get-team':
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `teams/${encodePathSegment(id)}.json`,
              'Team resource',
              'Durable team resource link.'
            )
          : null;
      });
    case 'list-team-channels':
    case 'get-team-channel': {
      const teamId = firstString(params, ['team-id', 'teamId']);
      if (!teamId) return [];
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `teams/${encodePathSegment(teamId)}/channels/${encodePathSegment(id)}.json`,
              'Team channel resource',
              'Durable team channel resource link.'
            )
          : null;
      });
    }
    case 'search-sharepoint-sites':
    case 'get-sharepoint-site':
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `sites/${encodePathSegment(id)}.json`,
              'SharePoint site resource',
              'Durable SharePoint site resource link.'
            )
          : null;
      });
    case 'get-drive-item': {
      const driveId = firstString(params, ['drive-id', 'driveId']);
      return linksForItems(tenantId, input.data, (item) => {
        const itemId =
          stringField(item.id) ?? firstString(params, ['driveItem-id', 'driveItemId', 'itemId']);
        if (!driveId || !itemId) return null;
        return idLink(
          tenantId,
          `drives/${encodePathSegment(driveId)}/items/${encodePathSegment(itemId)}.json`,
          'Drive item resource',
          'Durable drive item resource link.'
        );
      });
    }
    case 'list-mail-messages':
    case 'get-mail-message':
    case 'me.ListMessages':
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `mail/messages/${encodePathSegment(id)}.json`,
              'Mail message resource',
              'Durable mail message resource link.'
            )
          : null;
      });
    case 'list-calendar-events':
    case 'get-calendar-event':
    case 'get-calendar-view':
      return linksForItems(tenantId, input.data, (item) => {
        const id = stringField(item.id);
        return id
          ? idLink(
              tenantId,
              `calendar/events/${encodePathSegment(id)}.json`,
              'Calendar event resource',
              'Durable calendar event resource link.'
            )
          : null;
      });
    default:
      return [];
  }
}

export function shouldUseResourceLinkedText(
  resultTextLength: number,
  resources: readonly unknown[]
): boolean {
  return resultTextLength > MAX_EXECUTE_TOOL_RAW_TEXT_LENGTH && resources.length > 0;
}

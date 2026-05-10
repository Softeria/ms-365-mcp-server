import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from '../../generated/client.js';
import {
  getFlow,
  getRequestOwnerSubject,
  getRequestTenant,
  getRequestTokens,
  type AuthFlow,
} from '../../request-context.js';
import { resolveDiscoveryCatalog } from '../discovery-catalog/catalog.js';
import { listBookmarks } from '../memory/bookmarks.js';
import { listFactsForAdmin } from '../memory/facts.js';
import { listRecipes } from '../memory/recipes.js';
import { listVisibleSkillRecords } from '../mcp-skills/store.js';
import {
  completionCacheKey,
  getCachedCompletionValues,
  setCachedCompletionValues,
} from './cache.js';

export const MAX_COMPLETION_VALUES = 20;

export interface AccountCompletionAuthManager {
  listAccounts(): Promise<Array<{ username?: string | null; homeAccountId?: string | null }>>;
}

export interface CompletionGraphClient {
  graphRequest(
    endpoint: string,
    options: { method: 'GET'; headers?: Record<string, string> }
  ): Promise<{ content?: Array<{ type?: string; text?: string }>; isError?: boolean }>;
}

export interface CompletionProviderDeps {
  authManager?: AccountCompletionAuthManager;
  flow?: AuthFlow;
  registryAliases?: Iterable<string>;
  ownerSubject?: string;
  graphClient?: CompletionGraphClient;
}

export interface CompletionValue {
  id?: string;
  label: string;
}

interface EndpointMetadata {
  toolName: string;
  scopes?: readonly string[];
  workScopes?: readonly string[];
}

interface GraphProviderDefinition {
  readonly name: GraphCompletionProviderName;
  readonly toolName: string;
  readonly requiredId?: string;
  readonly path: (query: string, context?: Record<string, unknown>) => string | null;
  readonly headers?: Record<string, string>;
  readonly labelKeys: readonly string[];
}

export type GraphCompletionProviderName =
  | 'user'
  | 'group'
  | 'team'
  | 'channel'
  | 'site'
  | 'drive'
  | 'driveItem'
  | 'message'
  | 'mailFolder'
  | 'calendar'
  | 'event';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const endpoints = JSON.parse(
  readFileSync(path.join(__dirname, '..', '..', 'endpoints.json'), 'utf8')
) as readonly EndpointMetadata[];

function normalizedNeedle(value: string): string {
  return value.trim().toLowerCase();
}

function firstString(item: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

function startsOrIncludes(value: string, needle: string): boolean {
  if (!needle) return true;
  return value.toLowerCase().includes(needle);
}

function bound(values: readonly string[]): string[] {
  return [...new Set(values)].slice(0, MAX_COMPLETION_VALUES);
}

function requestOwnerSubject(deps: CompletionProviderDeps): string | undefined {
  const raw = deps.ownerSubject ?? getRequestOwnerSubject();
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function requestAccountId(): string | undefined {
  const ctx = getRequestTokens();
  return ctx?.authClientId ?? ctx?.clientAccessToken;
}

function requestAllowedScopes(): readonly string[] {
  return getRequestTokens()?.tenantRow?.allowed_scopes ?? [];
}

function hasScope(allowedScopes: readonly string[], requiredScope: string): boolean {
  if (allowedScopes.length === 0) return true;
  if (allowedScopes.includes(requiredScope)) return true;
  if (requiredScope.endsWith('.Read.All')) {
    return allowedScopes.includes(requiredScope.replace(/\.Read\.All$/, '.ReadWrite.All'));
  }
  if (requiredScope.endsWith('.Read')) {
    return allowedScopes.includes(requiredScope.replace(/\.Read$/, '.ReadWrite'));
  }
  return false;
}

function toolScopes(toolName: string): readonly string[] {
  const endpoint = endpoints.find((entry) => entry.toolName === toolName);
  return endpoint?.workScopes ?? endpoint?.scopes ?? [];
}

export function completeTenantId(_value: string): string[] {
  const tenant = getRequestTenant();
  return tenant.id ? [tenant.id] : [];
}

export async function completeAccount(
  value: string,
  deps: CompletionProviderDeps = {}
): Promise<string[]> {
  const tenant = getRequestTenant();
  if (!tenant.id || !deps.authManager) return [];

  const flow = deps.flow ?? getFlow();
  if (flow !== 'delegated' && flow !== 'device-code') return [];

  try {
    const needle = normalizedNeedle(value);
    const accounts = await deps.authManager.listAccounts();
    return bound(
      accounts
        .map((account) => account.username)
        .filter(
          (username): username is string => typeof username === 'string' && username.length > 0
        )
        .filter((username) => username.toLowerCase().startsWith(needle))
    );
  } catch {
    return [];
  }
}

export function completeAlias(value: string, deps: CompletionProviderDeps = {}): string[] {
  const tenant = getRequestTenant();
  if (!tenant.id || !tenant.presetVersion || !tenant.enabledToolsSet) return [];

  const registryAliases = deps.registryAliases ?? api.endpoints.map((endpoint) => endpoint.alias);
  const catalog = resolveDiscoveryCatalog({
    presetVersion: tenant.presetVersion,
    enabledToolsSet: tenant.enabledToolsSet,
    enabledToolsExplicit: tenant.enabledToolsExplicit,
    registryAliases,
  });

  if (!catalog.isDiscoverySurface) return [];

  const needle = normalizedNeedle(value);
  return bound(
    [...catalog.discoveryCatalogSet]
      .filter((alias) => startsOrIncludes(alias, needle))
      .sort((a, b) => rankAlias(a, needle) - rankAlias(b, needle) || a.localeCompare(b))
  );
}

export async function completeSkillName(
  value: string,
  deps: CompletionProviderDeps = {}
): Promise<string[]> {
  const tenant = getRequestTenant();
  if (!tenant.id) return [];
  try {
    const needle = normalizedNeedle(value);
    const ownerSubject = requestOwnerSubject(deps);
    const skills = await listVisibleSkillRecords(tenant.id, ownerSubject);
    return bound(
      skills.map((skill) => skill.name).filter((name) => startsOrIncludes(name, needle))
    );
  } catch {
    return [];
  }
}

export async function completeRecipeName(value: string): Promise<string[]> {
  const tenant = getRequestTenant();
  if (!tenant.id) return [];
  try {
    const recipes = await listRecipes(tenant.id, value);
    return bound(recipes.map((recipe) => recipe.name));
  } catch {
    return [];
  }
}

export async function completeBookmark(value: string): Promise<string[]> {
  const tenant = getRequestTenant();
  if (!tenant.id) return [];
  try {
    const bookmarks = await listBookmarks(tenant.id, value);
    return bound(
      bookmarks.flatMap((bookmark) => [bookmark.label, bookmark.alias]).filter(isString)
    );
  } catch {
    return [];
  }
}

export async function completeFactScope(value: string): Promise<string[]> {
  const tenant = getRequestTenant();
  if (!tenant.id) return [];
  try {
    const facts = await listFactsForAdmin(tenant.id, { limit: MAX_COMPLETION_VALUES });
    const needle = normalizedNeedle(value);
    return bound(
      facts.facts.map((fact) => fact.scope).filter((scope) => startsOrIncludes(scope, needle))
    );
  } catch {
    return [];
  }
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function rankAlias(alias: string, needle: string): number {
  if (!needle) return 0;
  const lower = alias.toLowerCase();
  if (lower.startsWith(needle)) return 0;
  if (lower.includes(needle)) return 1;
  return 2;
}

function graphAllowed(definition: GraphProviderDefinition): boolean {
  const tenant = getRequestTenant();
  if (!tenant.id || !tenant.presetVersion || !tenant.enabledToolsSet) return false;
  const catalog = resolveDiscoveryCatalog({
    presetVersion: tenant.presetVersion,
    enabledToolsSet: tenant.enabledToolsSet,
    enabledToolsExplicit: tenant.enabledToolsExplicit,
    registryAliases: [definition.toolName],
  });
  if (!catalog.discoveryCatalogSet.has(definition.toolName)) return false;
  return toolScopes(definition.toolName).every((scope) => hasScope(requestAllowedScopes(), scope));
}

function encodeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function topSelect(path: string, select: readonly string[], top = 10): string {
  return `${path}?$top=${top}&$select=${select.map(encodeURIComponent).join(',')}`;
}

function appendFilter(path: string, filter: string | undefined): string {
  return filter ? `${path}&$filter=${encodeURIComponent(filter)}` : path;
}

function graphSearchPath(path: string, query: string, property = 'displayName'): string {
  if (!query.trim()) return path;
  const search = `"${property}:${query.replace(/"/g, '').trim()}"`;
  return `${path}&$search=${encodeURIComponent(search)}`;
}

function contextString(
  context: Record<string, unknown> | undefined,
  keys: readonly string[]
): string | undefined {
  const direct = firstString(context ?? {}, keys);
  if (direct) return direct;
  const args = context?.arguments;
  return typeof args === 'object' && args !== null
    ? firstString(args as Record<string, unknown>, keys)
    : undefined;
}

const GRAPH_PROVIDERS: Readonly<Record<GraphCompletionProviderName, GraphProviderDefinition>> = {
  user: {
    name: 'user',
    toolName: 'list-users',
    path: (query) =>
      graphSearchPath(
        topSelect('/users', ['id', 'displayName', 'mail', 'userPrincipalName']),
        query
      ),
    headers: { ConsistencyLevel: 'eventual' },
    labelKeys: ['displayName', 'userPrincipalName', 'mail', 'id'],
  },
  group: {
    name: 'group',
    toolName: 'list-groups',
    path: (query) => graphSearchPath(topSelect('/groups', ['id', 'displayName', 'mail']), query),
    headers: { ConsistencyLevel: 'eventual' },
    labelKeys: ['displayName', 'mail', 'id'],
  },
  team: {
    name: 'team',
    toolName: 'list-joined-teams',
    path: (query) =>
      appendFilter(
        topSelect('/me/joinedTeams', ['id', 'displayName', 'description']),
        query ? `startswith(displayName,'${encodeODataString(query)}')` : undefined
      ),
    labelKeys: ['displayName', 'id'],
  },
  channel: {
    name: 'channel',
    toolName: 'list-team-channels',
    requiredId: 'teamId',
    path: (query, context) => {
      const teamId = contextString(context, ['teamId', 'team-id']);
      if (!teamId) return null;
      return appendFilter(
        topSelect(`/teams/${encodeURIComponent(teamId)}/channels`, ['id', 'displayName']),
        query ? `startswith(displayName,'${encodeODataString(query)}')` : undefined
      );
    },
    labelKeys: ['displayName', 'id'],
  },
  site: {
    name: 'site',
    toolName: 'search-sharepoint-sites',
    path: (query) =>
      `/sites?search=${encodeURIComponent(query.trim() || '*')}&$top=10&$select=id,displayName,name,webUrl`,
    labelKeys: ['displayName', 'name', 'webUrl', 'id'],
  },
  drive: {
    name: 'drive',
    toolName: 'list-drives',
    path: (query) =>
      appendFilter(
        topSelect('/me/drives', ['id', 'name', 'driveType']),
        query ? `startswith(name,'${encodeODataString(query)}')` : undefined
      ),
    labelKeys: ['name', 'id'],
  },
  driveItem: {
    name: 'driveItem',
    toolName: 'get-drive-item',
    requiredId: 'driveId',
    path: (query, context) => {
      const driveId = contextString(context, ['driveId', 'drive-id']);
      if (!driveId) return null;
      return appendFilter(
        topSelect(`/drives/${encodeURIComponent(driveId)}/root/children`, ['id', 'name', 'webUrl']),
        query ? `startswith(name,'${encodeODataString(query)}')` : undefined
      );
    },
    labelKeys: ['name', 'webUrl', 'id'],
  },
  message: {
    name: 'message',
    toolName: 'list-mail-messages',
    path: (query) =>
      appendFilter(
        topSelect('/me/messages', ['id', 'subject', 'from', 'receivedDateTime']),
        query ? `contains(subject,'${encodeODataString(query)}')` : undefined
      ),
    labelKeys: ['subject', 'id'],
  },
  mailFolder: {
    name: 'mailFolder',
    toolName: 'list-mail-folders',
    path: (query) =>
      appendFilter(
        topSelect('/me/mailFolders', ['id', 'displayName', 'totalItemCount', 'unreadItemCount']),
        query ? `startswith(displayName,'${encodeODataString(query)}')` : undefined
      ),
    labelKeys: ['displayName', 'id'],
  },
  calendar: {
    name: 'calendar',
    toolName: 'list-calendars',
    path: (query) =>
      appendFilter(
        topSelect('/me/calendars', ['id', 'name', 'color']),
        query ? `startswith(name,'${encodeODataString(query)}')` : undefined
      ),
    labelKeys: ['name', 'id'],
  },
  event: {
    name: 'event',
    toolName: 'list-calendar-events',
    path: (query) =>
      appendFilter(
        topSelect('/me/events', ['id', 'subject', 'start', 'end'], 10),
        query ? `contains(subject,'${encodeODataString(query)}')` : undefined
      ),
    labelKeys: ['subject', 'id'],
  },
};

function parseGraphItems(response: {
  content?: Array<{ text?: string }>;
  isError?: boolean;
}): Array<Record<string, unknown>> {
  if (response.isError) return [];
  const text = response.content?.find((item) => typeof item.text === 'string')?.text;
  if (!text) return [];
  const parsed = JSON.parse(text) as unknown;
  if (typeof parsed !== 'object' || parsed === null) return [];
  const value = (parsed as { value?: unknown }).value;
  const items = Array.isArray(value) ? value : [parsed];
  return items.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
  );
}

function labelForItem(item: Record<string, unknown>, keys: readonly string[]): string | undefined {
  const label = firstString(item, keys);
  const id = firstString(item, ['id']);
  if (!label) return id;
  return id && label !== id ? `${label} (${id})` : label;
}

export async function completeGraphBacked(
  provider: GraphCompletionProviderName,
  value: string,
  deps: CompletionProviderDeps = {},
  completionContext?: Record<string, unknown>
): Promise<string[]> {
  const tenant = getRequestTenant();
  const definition = GRAPH_PROVIDERS[provider];
  if (!tenant.id || !deps.graphClient || !graphAllowed(definition)) return [];

  const query = value.trim();
  const path = definition.path(query, completionContext);
  if (!path) return [];

  const key = completionCacheKey({
    tenantId: tenant.id,
    accountId: requestAccountId(),
    provider,
    query,
    enabledToolsSet: tenant.enabledToolsSet,
    capabilityProfile: getRequestTokens()?.capabilityProfile,
  });
  const cached = getCachedCompletionValues(key);
  if (cached) return cached;

  try {
    const response = await deps.graphClient.graphRequest(path, {
      method: 'GET',
      headers: { Accept: 'application/json', ...definition.headers },
    });
    const labels = parseGraphItems(response)
      .map((item) => labelForItem(item, definition.labelKeys))
      .filter(isString);
    return setCachedCompletionValues(key, bound(labels));
  } catch {
    return [];
  }
}

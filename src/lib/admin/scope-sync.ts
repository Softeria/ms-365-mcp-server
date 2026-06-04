/**
 * Tenant allowed_scopes sync helpers.
 *
 * This module intentionally only reads Microsoft Graph delegated consent state
 * and computes tenant metadata updates. It does not touch OAuth/session stores:
 * syncing allowed_scopes is an operator metadata refresh, not token revocation.
 */
import { getCloudEndpoints, type CloudType } from '../../cloud-config.js';

const MICROSOFT_GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';

export interface FetchGraphDelegatedScopesInput {
  tenantDirectoryId: string;
  clientId: string;
  cloudType: CloudType;
  adminBearerToken: string;
  fetchImpl?: typeof fetch;
}

export interface SyncAllowedScopesInput {
  existingScopes: readonly string[];
  fetchedGraphScopes: readonly string[];
  replaceAll?: boolean;
}

interface GraphCollection<T> {
  value?: T[];
  '@odata.nextLink'?: string;
}

interface ServicePrincipalRow {
  id?: unknown;
  appId?: unknown;
}

interface OAuth2PermissionGrantRow {
  scope?: unknown;
  resourceId?: unknown;
}

function uniqueSorted(scopes: Iterable<string>): string[] {
  return [...new Set([...scopes].map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * Graph delegated scope values are bare names such as `User.Read` or
 * `Directory.AccessAsUser.All`. Product/non-Graph scopes are represented as
 * resource URLs/audiences and must be preserved by default.
 */
export function isBareGraphScope(scope: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/.test(scope.trim());
}

export function normalizeGraphDelegatedScopes(scopes: readonly string[]): string[] {
  return uniqueSorted(scopes.filter(isBareGraphScope));
}

export function computeSyncedAllowedScopes(input: SyncAllowedScopesInput): string[] {
  const graphScopes = normalizeGraphDelegatedScopes(input.fetchedGraphScopes);
  if (input.replaceAll) {
    return graphScopes;
  }

  const preservedNonGraphScopes = uniqueSorted(
    input.existingScopes.filter((scope) => !isBareGraphScope(scope))
  );
  return [...graphScopes, ...preservedNonGraphScopes];
}

function graphHeaders(adminBearerToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${adminBearerToken}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJson<T>(
  url: string,
  adminBearerToken: string,
  fetchImpl: typeof fetch
): Promise<T> {
  const res = await fetchImpl(url, { headers: graphHeaders(adminBearerToken) });
  if (!res.ok) {
    throw new Error(`Microsoft Graph scope sync failed with HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchGraphCollection<T>(
  url: string,
  adminBearerToken: string,
  fetchImpl: typeof fetch
): Promise<T[]> {
  const rows: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const page: GraphCollection<T> = await fetchJson<GraphCollection<T>>(
      next,
      adminBearerToken,
      fetchImpl
    );
    if (!Array.isArray(page.value)) {
      throw new Error('Microsoft Graph scope sync returned a malformed collection');
    }
    rows.push(...page.value);
    next = typeof page['@odata.nextLink'] === 'string' ? page['@odata.nextLink'] : undefined;
  }
  return rows;
}

function graphUrl(base: string, path: string): string {
  return `${base}/v1.0${path}`;
}

function quoteODataString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function fetchConsentedGraphDelegatedScopes(
  input: FetchGraphDelegatedScopesInput
): Promise<string[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const graphBase = getCloudEndpoints(input.cloudType).graphApi;
  const clientFilter = encodeURIComponent(`appId eq ${quoteODataString(input.clientId)}`);
  const servicePrincipals = await fetchGraphCollection<ServicePrincipalRow>(
    graphUrl(graphBase, `/servicePrincipals?$filter=${clientFilter}&$select=id,appId`),
    input.adminBearerToken,
    fetchImpl
  );
  const clientSpId = servicePrincipals.find((sp) => typeof sp.id === 'string')?.id;
  if (typeof clientSpId !== 'string' || clientSpId.length === 0) {
    throw new Error('Microsoft Graph scope sync could not find the tenant service principal');
  }

  const grantFilter = encodeURIComponent(`clientId eq ${quoteODataString(clientSpId)}`);
  const grants = await fetchGraphCollection<OAuth2PermissionGrantRow>(
    graphUrl(
      graphBase,
      `/oauth2PermissionGrants?$filter=${grantFilter}&$select=scope,resourceId,clientId`
    ),
    input.adminBearerToken,
    fetchImpl
  );

  const resourceIds = uniqueSorted(
    grants
      .map((grant) => grant.resourceId)
      .filter((resourceId): resourceId is string => typeof resourceId === 'string')
  );
  const graphResourceIds = new Set<string>();
  for (const resourceId of resourceIds) {
    const resource = await fetchJson<ServicePrincipalRow>(
      graphUrl(graphBase, `/servicePrincipals/${encodeURIComponent(resourceId)}?$select=id,appId`),
      input.adminBearerToken,
      fetchImpl
    );
    if (resource.appId === MICROSOFT_GRAPH_APP_ID) {
      graphResourceIds.add(resourceId);
    }
  }

  const scopes = grants.flatMap((grant) => {
    if (typeof grant.resourceId !== 'string' || !graphResourceIds.has(grant.resourceId)) return [];
    if (typeof grant.scope !== 'string') return [];
    return grant.scope.split(/\s+/);
  });
  return normalizeGraphDelegatedScopes(scopes);
}

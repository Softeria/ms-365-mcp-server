/**
 * Tenant allowed_scopes sync helpers.
 *
 * This module intentionally only reads Microsoft Graph delegated consent state
 * and computes tenant metadata updates. It does not touch OAuth/session stores:
 * syncing allowed_scopes is an operator metadata refresh, not token revocation.
 */
import { getCloudEndpoints, type CloudType } from '../../cloud-config.js';

const MICROSOFT_GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';
const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MANDATORY_DELEGATED_OAUTH_SCOPES = ['offline_access'] as const;
const CANONICAL_DELEGATED_OAUTH_SCOPES = new Map(
  MANDATORY_DELEGATED_OAUTH_SCOPES.map((scope) => [scope.toLowerCase(), scope])
);

export interface FetchGraphDelegatedScopesInput {
  tenantDirectoryId: string;
  clientId: string;
  cloudType: CloudType;
  graphBearerToken: string;
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

interface DecodedJwtPayload {
  tid?: unknown;
  aud?: unknown;
}

function uniqueSorted(scopes: Iterable<string>): string[] {
  return [...new Set([...scopes].map((s) => s.trim()).filter(Boolean))].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

/**
 * Graph delegated scope values are bare names such as `User.Read` or
 * `Directory.AccessAsUser.All`. Product/non-Graph scopes are represented as
 * resource URLs/audiences and must be preserved by default.
 */
export function isBareGraphScope(scope: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/.test(scope.trim());
}

function canonicalDelegatedOAuthScope(scope: string): string | null {
  return CANONICAL_DELEGATED_OAUTH_SCOPES.get(scope.trim().toLowerCase()) ?? null;
}

function isManagedDelegatedScope(scope: string): boolean {
  return isBareGraphScope(scope) || canonicalDelegatedOAuthScope(scope) !== null;
}

function normalizeManagedDelegatedScope(scope: string): string | null {
  const canonicalOAuthScope = canonicalDelegatedOAuthScope(scope);
  if (canonicalOAuthScope) return canonicalOAuthScope;
  const trimmed = scope.trim();
  return isBareGraphScope(trimmed) ? trimmed : null;
}

export function normalizeGraphDelegatedScopes(scopes: readonly string[]): string[] {
  return uniqueSorted(scopes.map(normalizeManagedDelegatedScope).filter((scope) => scope !== null));
}

export function computeSyncedAllowedScopes(input: SyncAllowedScopesInput): string[] {
  const graphScopes = uniqueSorted([
    ...normalizeGraphDelegatedScopes(input.fetchedGraphScopes),
    ...MANDATORY_DELEGATED_OAUTH_SCOPES,
  ]);
  if (input.replaceAll) {
    return graphScopes;
  }

  const preservedNonGraphScopes = input.existingScopes.filter(
    (scope) => !isManagedDelegatedScope(scope)
  );
  return uniqueSorted([...graphScopes, ...preservedNonGraphScopes]);
}

function graphHeaders(graphBearerToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${graphBearerToken}`,
    'Content-Type': 'application/json',
  };
}

function decodeJwtPayload(graphBearerToken: string): DecodedJwtPayload | null {
  const [, payloadSegment] = graphBearerToken.split('.');
  if (!payloadSegment) return null;

  try {
    return JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8')
    ) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

function assertGraphBearerMatches(
  graphBearerToken: string,
  tenantDirectoryId: string,
  cloudType: CloudType
): void {
  const expectedTenantId = tenantDirectoryId.trim();
  if (!TENANT_GUID.test(expectedTenantId)) {
    throw new Error('Microsoft Graph scope sync target tenant_id is invalid');
  }

  const payload = decodeJwtPayload(graphBearerToken);
  const tokenTenantId = typeof payload?.tid === 'string' ? payload.tid.trim() : '';
  if (!tokenTenantId) {
    throw new Error('Microsoft Graph scope sync Graph bearer token is missing tid');
  }
  if (tokenTenantId.toLowerCase() !== expectedTenantId.toLowerCase()) {
    throw new Error('Microsoft Graph scope sync Graph bearer token tenant mismatch');
  }

  const graphAudience = getCloudEndpoints(cloudType).graphApi.replace(/\/+$/, '');
  const allowedAudiences = new Set([MICROSOFT_GRAPH_APP_ID, graphAudience]);
  const rawAudiences = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  const audiences = rawAudiences.filter((aud): aud is string => typeof aud === 'string');
  if (
    audiences.length > 0 &&
    !audiences.some((aud) => allowedAudiences.has(aud.replace(/\/+$/, '')))
  ) {
    throw new Error('Microsoft Graph scope sync Graph bearer token audience mismatch');
  }
}

function validateGraphNextLink(nextLink: string, graphBase: string): string {
  let expected: URL;
  let candidate: URL;
  try {
    expected = new URL(graphBase);
    candidate = new URL(nextLink);
  } catch {
    throw new Error('Microsoft Graph scope sync returned an invalid nextLink');
  }

  if (candidate.protocol !== 'https:' || candidate.origin !== expected.origin) {
    throw new Error('Microsoft Graph scope sync rejected an off-host nextLink');
  }
  if (candidate.pathname !== '/v1.0' && !candidate.pathname.startsWith('/v1.0/')) {
    throw new Error('Microsoft Graph scope sync rejected a nextLink outside Graph v1.0');
  }
  return candidate.toString();
}

async function fetchJson<T>(
  url: string,
  graphBearerToken: string,
  fetchImpl: typeof fetch
): Promise<T> {
  const res = await fetchImpl(url, { headers: graphHeaders(graphBearerToken) });
  if (!res.ok) {
    throw new Error(`Microsoft Graph scope sync failed with HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchGraphCollection<T>(
  url: string,
  graphBase: string,
  graphBearerToken: string,
  fetchImpl: typeof fetch
): Promise<T[]> {
  const rows: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const page: GraphCollection<T> = await fetchJson<GraphCollection<T>>(
      next,
      graphBearerToken,
      fetchImpl
    );
    if (!Array.isArray(page.value)) {
      throw new Error('Microsoft Graph scope sync returned a malformed collection');
    }
    rows.push(...page.value);
    next =
      typeof page['@odata.nextLink'] === 'string'
        ? validateGraphNextLink(page['@odata.nextLink'], graphBase)
        : undefined;
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
  assertGraphBearerMatches(input.graphBearerToken, input.tenantDirectoryId, input.cloudType);

  const fetchImpl = input.fetchImpl ?? fetch;
  const graphBase = getCloudEndpoints(input.cloudType).graphApi;
  const clientFilter = encodeURIComponent(`appId eq ${quoteODataString(input.clientId)}`);
  const servicePrincipals = await fetchGraphCollection<ServicePrincipalRow>(
    graphUrl(graphBase, `/servicePrincipals?$filter=${clientFilter}&$select=id,appId`),
    graphBase,
    input.graphBearerToken,
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
    graphBase,
    input.graphBearerToken,
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
      input.graphBearerToken,
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

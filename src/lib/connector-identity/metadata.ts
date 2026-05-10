export { CONNECTOR_IDENTITY_ENV, resolveConnectorIdentity } from './config.js';
export type { ConnectorIdentity, ConnectorIdentityInput } from './config.js';

import {
  CONNECTOR_DEFAULT_DISPLAY_NAME,
  CONNECTOR_PACKAGE,
  CONNECTOR_SLUG,
  resolveConnectorIdentity,
  type ConnectorIdentity,
  type ConnectorIdentityInput,
} from './config.js';

export interface ConnectorMetadataInput {
  publicBaseUrl: string;
  tenantId?: string | null;
  tenantDisplayName?: string | null;
  version: string;
}

export interface OAuthMetadataInput extends ConnectorMetadataInput {
  scopes: readonly string[];
  dynamicRegistration?: boolean;
}

export interface WwwAuthenticateMetadataInput {
  publicBaseUrl: string;
  tenantId?: string | null;
}

export interface ConnectorDiagnosticsInput extends ConnectorMetadataInput {
  transport?: string;
}

export type ConnectorDoctorStatus = 'pass' | 'warn' | 'fail';

export interface ConnectorDoctorInput extends ConnectorMetadataInput {
  publicUrl: string;
  observedName?: string;
  fetchImpl?: typeof fetch;
}

export interface ConnectorDoctorSurface {
  url: string;
  ok: boolean;
  status?: number;
  displayName?: string;
  error?: string;
}

export interface ConnectorDoctorResult {
  status: ConnectorDoctorStatus;
  expectedDisplayName: string;
  checkedUrls: string[];
  surfaces: Record<string, ConnectorDoctorSurface>;
  explanation: string;
}

interface UrlBundle {
  publicBaseUrl: string;
  tenantBaseUrl: string;
  mcpEndpoint: string;
  oauthAuthorizationServer: string;
  oauthAuthorizationServerRfc8414: string;
  oauthProtectedResource: string;
  oauthProtectedResourceRfc8414: string;
  connectorWellKnown: string;
  dynamicClientRegistration: string;
}

function normalizePublicBaseUrl(publicBaseUrl: string): string {
  return new URL(publicBaseUrl).href.replace(/\/$/, '');
}

function tenantSegment(tenantId?: string | null): string {
  return tenantId ? `/t/${encodeURIComponent(tenantId)}` : '';
}

function buildUrls(input: { publicBaseUrl: string; tenantId?: string | null }): UrlBundle {
  const publicBaseUrl = normalizePublicBaseUrl(input.publicBaseUrl);
  const segment = tenantSegment(input.tenantId);
  const tenantBaseUrl = `${publicBaseUrl}${segment}`;
  const tenantSuffix = input.tenantId ? `/t/${encodeURIComponent(input.tenantId)}` : '';

  return {
    publicBaseUrl,
    tenantBaseUrl,
    mcpEndpoint: input.tenantId ? `${tenantBaseUrl}/mcp` : `${publicBaseUrl}/mcp`,
    oauthAuthorizationServer: `${tenantBaseUrl}/.well-known/oauth-authorization-server`,
    oauthAuthorizationServerRfc8414: `${publicBaseUrl}/.well-known/oauth-authorization-server${tenantSuffix}`,
    oauthProtectedResource: `${tenantBaseUrl}/.well-known/oauth-protected-resource`,
    oauthProtectedResourceRfc8414: `${publicBaseUrl}/.well-known/oauth-protected-resource${tenantSuffix}`,
    connectorWellKnown: `${tenantBaseUrl}/.well-known/mcp-connector`,
    dynamicClientRegistration: `${publicBaseUrl}/register`,
  };
}

function identityFields(identity: ConnectorIdentity): Record<string, unknown> {
  return {
    name: identity.name,
    display_name: identity.displayName,
    displayName: identity.displayName,
    client_name: identity.displayName,
    short_name: identity.shortName,
    shortName: identity.shortName,
    description: identity.description,
    slug: identity.slug,
    package: identity.packageName,
    server_info: { name: identity.name, version: identity.version },
    ...(identity.iconUrl ? { logo_uri: identity.iconUrl, iconUrl: identity.iconUrl } : {}),
    ...(identity.privacyUrl
      ? { policy_uri: identity.privacyUrl, privacyUrl: identity.privacyUrl }
      : {}),
    ...(identity.termsUrl ? { tos_uri: identity.termsUrl, termsUrl: identity.termsUrl } : {}),
  };
}

export function buildServerInfo(input: ConnectorIdentityInput): { name: string; version: string } {
  const identity = resolveConnectorIdentity(input);
  return { name: identity.name, version: identity.version };
}

export function buildOAuthAuthorizationServerMetadata(
  input: OAuthMetadataInput
): Record<string, unknown> {
  const identity = resolveConnectorIdentity(input);
  const urls = buildUrls(input);
  const metadata: Record<string, unknown> = {
    issuer: urls.tenantBaseUrl,
    authorization_endpoint: `${urls.tenantBaseUrl}/authorize`,
    token_endpoint: `${urls.tenantBaseUrl}/token`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: input.scopes,
    ...identityFields(identity),
  };
  if (input.dynamicRegistration) {
    metadata.registration_endpoint = urls.dynamicClientRegistration;
  }
  return metadata;
}

export function buildOAuthProtectedResourceMetadata(
  input: OAuthMetadataInput
): Record<string, unknown> {
  const identity = resolveConnectorIdentity(input);
  const urls = buildUrls(input);
  return {
    resource: urls.mcpEndpoint,
    authorization_servers: [urls.tenantBaseUrl],
    scopes_supported: input.scopes,
    bearer_methods_supported: ['header'],
    resource_documentation: urls.tenantBaseUrl,
    ...identityFields(identity),
  };
}

export function buildConnectorWellKnownMetadata(
  input: ConnectorMetadataInput
): Record<string, unknown> {
  const identity = resolveConnectorIdentity(input);
  const urls = buildUrls(input);
  return {
    name: identity.name,
    displayName: identity.displayName,
    shortName: identity.shortName,
    description: identity.description,
    slug: identity.slug,
    package: identity.packageName,
    version: identity.version,
    ...(identity.iconUrl ? { iconUrl: identity.iconUrl } : {}),
    ...(identity.privacyUrl ? { privacyUrl: identity.privacyUrl } : {}),
    ...(identity.termsUrl ? { termsUrl: identity.termsUrl } : {}),
    endpoints: {
      mcp: urls.mcpEndpoint,
      oauthAuthorizationServer: urls.oauthAuthorizationServer,
      oauthAuthorizationServerRfc8414: urls.oauthAuthorizationServerRfc8414,
      oauthProtectedResource: urls.oauthProtectedResource,
      oauthProtectedResourceRfc8414: urls.oauthProtectedResourceRfc8414,
      dynamicClientRegistration: urls.dynamicClientRegistration,
    },
  };
}

export function buildWwwAuthenticateMetadata(input: WwwAuthenticateMetadataInput): {
  realm: string;
  resourceMetadata: string;
} {
  const urls = buildUrls(input);
  return {
    realm: urls.tenantBaseUrl,
    resourceMetadata: urls.oauthProtectedResource,
  };
}

export function connectorIdentityDiagnostics(
  input: ConnectorDiagnosticsInput
): Record<string, unknown> {
  const identity = resolveConnectorIdentity(input);
  const urls = buildUrls(input);
  const scopes: readonly string[] = [];
  return {
    expectedDisplayName: identity.displayName,
    transport: input.transport ?? 'unknown',
    tenantId: input.tenantId ?? null,
    serverInfo: { name: identity.name, version: identity.version },
    instructionsHeader: `${identity.displayName} (${identity.name})`,
    urls: {
      mcpEndpoint: urls.mcpEndpoint,
      oauthAuthorizationServer: urls.oauthAuthorizationServer,
      oauthProtectedResource: urls.oauthProtectedResource,
      connectorWellKnown: urls.connectorWellKnown,
      dynamicClientRegistration: urls.dynamicClientRegistration,
    },
    oauthAuthorizationServer: buildOAuthAuthorizationServerMetadata({ ...input, scopes }),
    protectedResource: buildOAuthProtectedResourceMetadata({ ...input, scopes }),
    wellKnown: buildConnectorWellKnownMetadata(input),
    package: { name: CONNECTOR_PACKAGE, slug: CONNECTOR_SLUG },
  };
}

export function compareConnectorNames(input: {
  expectedDisplayName: string;
  observedDisplayName?: string | null;
}): { status: ConnectorDoctorStatus; explanation: string } {
  const observed = input.observedDisplayName?.trim();
  if (!observed || observed === input.expectedDisplayName) {
    return {
      status: 'pass',
      explanation: `Server metadata advertises ${input.expectedDisplayName}.`,
    };
  }
  return {
    status: 'warn',
    explanation: `Server metadata advertises ${input.expectedDisplayName}. If your hosted connector shows ${observed}, recreate or update the external connector configuration.`,
  };
}

function displayNameFromMetadata(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ['displayName', 'display_name', 'client_name', 'name']) {
    if (typeof record[key] === 'string') return record[key];
  }
  return undefined;
}

async function checkSurface(
  url: string,
  fetchImpl: typeof fetch,
  expectedDisplayName: string
): Promise<ConnectorDoctorSurface> {
  try {
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json() : undefined;
    const displayName = displayNameFromMetadata(body);
    return {
      url,
      ok: response.ok && (!displayName || displayName === expectedDisplayName),
      status: response.status,
      ...(displayName ? { displayName } : {}),
    };
  } catch (error) {
    return { url, ok: false, error: (error as Error).message };
  }
}

export async function connectorDoctor(input: ConnectorDoctorInput): Promise<ConnectorDoctorResult> {
  const metadataInput: ConnectorMetadataInput = {
    publicBaseUrl: input.publicUrl,
    tenantId: input.tenantId,
    tenantDisplayName: input.tenantDisplayName,
    version: input.version,
  };
  const diagnostics = connectorIdentityDiagnostics(metadataInput);
  const expectedDisplayName = String(
    diagnostics.expectedDisplayName || CONNECTOR_DEFAULT_DISPLAY_NAME
  );
  const urls = diagnostics.urls as Record<string, string>;
  const checkedUrls = [urls.oauthProtectedResource, urls.connectorWellKnown];
  const fetchImpl = input.fetchImpl ?? fetch;
  const entries = await Promise.all(
    checkedUrls.map(
      async (url) => [url, await checkSurface(url, fetchImpl, expectedDisplayName)] as const
    )
  );
  const surfaces = Object.fromEntries(
    entries.map(([url, result]) => {
      const key = url.split('/').slice(-1)[0] || url;
      return [key, result];
    })
  );
  const comparison = compareConnectorNames({
    expectedDisplayName,
    observedDisplayName: input.observedName,
  });
  const anyFailed = Object.values(surfaces).some((surface) => !surface.ok);
  const status: ConnectorDoctorStatus = anyFailed ? 'fail' : comparison.status;
  return {
    status,
    expectedDisplayName,
    checkedUrls,
    surfaces,
    explanation: comparison.explanation,
  };
}

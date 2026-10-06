/**
 * Cloud configuration module for Microsoft 365 MCP Server.
 *
 * Supports multiple Microsoft cloud environments:
 * - global: Microsoft public cloud (default)
 * - china: Microsoft Azure operated by 21Vianet
 *
 * @see https://learn.microsoft.com/en-us/graph/deployments
 */

/**
 * Supported Microsoft cloud environments.
 */
export type CloudType = 'global' | 'china';

/**
 * Cloud-specific endpoint configuration.
 */
export interface CloudEndpoints {
  /** Azure AD login endpoint (e.g., login.microsoftonline.com) */
  authority: string;
  /** Microsoft Graph API base URL (e.g., graph.microsoft.com) */
  graphApi: string;
  /** Azure portal URL for reference */
  portal: string;
}

/**
 * Cloud endpoint configurations based on Microsoft documentation.
 * @see https://learn.microsoft.com/en-us/graph/deployments
 */
export const CLOUD_ENDPOINTS: Record<CloudType, CloudEndpoints> = {
  global: {
    authority: 'https://login.microsoftonline.com',
    graphApi: 'https://graph.microsoft.com',
    portal: 'https://portal.azure.com',
  },
  china: {
    authority: 'https://login.chinacloudapi.cn',
    graphApi: 'https://microsoftgraph.chinacloudapi.cn',
    portal: 'https://portal.azure.cn',
  },
};

/**
 * Default client IDs for each cloud environment.
 * These are pre-registered public client applications.
 */
export const DEFAULT_CLIENT_IDS: Record<CloudType, string> = {
  global: '084a3e9f-a9f4-43f7-89f9-d229cf97853e',
  china: 'f3e61a6e-bc26-4281-8588-2c7359a02141',
};

/**
 * Gets the default client ID for the specified cloud type.
 * @param cloudType - The cloud environment type (default: 'global')
 * @returns The default client ID for the specified cloud
 */
export function getDefaultClientId(cloudType: CloudType = 'global'): string {
  return DEFAULT_CLIENT_IDS[cloudType];
}

/**
 * Deliberately not in the `.env` allowlist (see load-env.ts): a file in the
 * client's cwd must not be able to redirect bearer-token traffic.
 */
const GRAPH_BASE_URL_ENV = 'MS365_MCP_GRAPH_BASE_URL';

/**
 * Reads and validates the Graph base URL override, if any.
 * @returns The override without a trailing slash, or undefined when unset/blank
 * @throws Error if the value is set but is not an absolute http(s) URL without query or fragment
 */
function getGraphBaseUrlOverride(): string | undefined {
  const raw = process.env[GRAPH_BASE_URL_ENV]?.trim();
  if (!raw) return undefined;
  let parsed: URL | undefined;
  try {
    parsed = new URL(raw);
  } catch {
    parsed = undefined;
  }
  if (!parsed || !/^https?:$/.test(parsed.protocol) || parsed.search || parsed.hash) {
    throw new Error(
      `${GRAPH_BASE_URL_ENV} must be an absolute http(s) URL without query or fragment, got: ${raw}`
    );
  }
  return raw.replace(/\/+$/, '');
}

/**
 * Gets cloud endpoints for the specified cloud type.
 * @param cloudType - The cloud environment type (default: 'global')
 * @returns The endpoint configuration for the specified cloud
 * @throws Error if the cloud type is invalid
 */
export function getCloudEndpoints(cloudType: CloudType = 'global'): CloudEndpoints {
  const endpoints = CLOUD_ENDPOINTS[cloudType];
  if (!endpoints) {
    throw new Error(
      `Unknown cloud type: ${cloudType}. Valid values: ${Object.keys(CLOUD_ENDPOINTS).join(', ')}`
    );
  }
  return endpoints;
}

/**
 * The base URL Graph requests are sent to: `MS365_MCP_GRAPH_BASE_URL` when set,
 * otherwise the cloud's `graphApi`.
 *
 * The override is for deployments that put an egress proxy in front of Graph:
 * the server dials the proxy over plain HTTP and the proxy originates TLS to
 * Microsoft. A path prefix is kept as-is (`http://proxy:10255/tenant-a/graph`
 * + `/v1.0/me`). The login authority is not affected; use `--cloud` /
 * `MS365_MCP_CLOUD_TYPE` for that.
 *
 * Use this where `graphApi` is dialled as a URL. Do not use it where `graphApi`
 * names the Graph resource (the OBO scope in obo-client.ts): the token's
 * audience is the real Graph origin whatever proxy the requests go through.
 */
export function getGraphBaseUrl(cloudType: CloudType = 'global'): string {
  return getGraphBaseUrlOverride() ?? getCloudEndpoints(cloudType).graphApi;
}

/**
 * Validates if a string is a valid CloudType.
 * @param value - The string to validate
 * @returns True if the value is a valid cloud type
 */
export function isValidCloudType(value: string): value is CloudType {
  return value in CLOUD_ENDPOINTS;
}

/**
 * Parses cloud type from string with validation.
 * @param value - The string value to parse (case-insensitive)
 * @returns The validated CloudType (defaults to 'global' if undefined)
 * @throws Error if the value is not a valid cloud type
 */
export function parseCloudType(value: string | undefined): CloudType {
  if (!value) return 'global';
  const normalized = value.toLowerCase().trim();
  if (!isValidCloudType(normalized)) {
    throw new Error(
      `Invalid cloud type: ${value}. Valid values: ${Object.keys(CLOUD_ENDPOINTS).join(', ')}`
    );
  }
  return normalized;
}

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
 * Enabi fork: the upstream Softeria default client IDs are removed.
 * Each Enabi deployment MUST set MS365_MCP_CLIENT_ID to its own Azure AD
 * app registration. Calling this function indicates a misconfiguration.
 */
export function getDefaultClientId(_cloudType: CloudType = 'global'): string {
  throw new Error(
    'MS365_MCP_CLIENT_ID is not set. Enabi does not ship a fallback client ID — ' +
      'set the environment variable to your Azure AD app registration before starting the server.'
  );
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

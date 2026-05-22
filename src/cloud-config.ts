/**
 * Microsoft public-cloud endpoints. Areté operates inside a global Entra tenant;
 * the upstream 21Vianet (China) branch was removed.
 *
 * @see https://learn.microsoft.com/en-us/graph/deployments
 */

export interface CloudEndpoints {
  authority: string;
  graphApi: string;
}

const GLOBAL_ENDPOINTS: CloudEndpoints = {
  authority: 'https://login.microsoftonline.com',
  graphApi: 'https://graph.microsoft.com',
};

const DEFAULT_CLIENT_ID = '084a3e9f-a9f4-43f7-89f9-d229cf97853e';

export function getDefaultClientId(): string {
  return DEFAULT_CLIENT_ID;
}

export function getCloudEndpoints(): CloudEndpoints {
  return GLOBAL_ENDPOINTS;
}

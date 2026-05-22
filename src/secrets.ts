import { getDefaultClientId } from './cloud-config.js';

export interface AppSecrets {
  clientId: string;
  tenantId: string;
  clientSecret?: string;
}

let cachedSecrets: AppSecrets | null = null;

export async function getSecrets(): Promise<AppSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  cachedSecrets = {
    clientId: process.env.MS365_MCP_CLIENT_ID || getDefaultClientId(),
    tenantId: process.env.MS365_MCP_TENANT_ID || 'common',
    clientSecret: process.env.MS365_MCP_CLIENT_SECRET,
  };
  return cachedSecrets;
}

export function clearSecretsCache(): void {
  cachedSecrets = null;
}

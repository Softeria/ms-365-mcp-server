/**
 * Secrets management module with optional Azure Key Vault and AWS SSM support.
 *
 * Priority:
 *   1. MS365_MCP_KEYVAULT_URL → Azure Key Vault
 *   2. MS365_MCP_SSM_PREFIX   → AWS Systems Manager Parameter Store
 *   3. (default)              → Environment variables
 */

import logger from './logger.js';
import { parseCloudType, getDefaultClientId, type CloudType } from './cloud-config.js';

/**
 * Configuration values that can be retrieved from secrets storage.
 */
export interface AppSecrets {
  clientId: string;
  tenantId: string;
  clientSecret?: string;
  cloudType: CloudType;
}

/**
 * Interface for secrets providers.
 */
interface SecretsProvider {
  getSecrets(): Promise<AppSecrets>;
}

/**
 * Default secrets provider that reads from environment variables.
 */
class EnvironmentSecretsProvider implements SecretsProvider {
  async getSecrets(): Promise<AppSecrets> {
    const cloudType = parseCloudType(process.env.MS365_MCP_CLOUD_TYPE);
    return {
      clientId: process.env.MS365_MCP_CLIENT_ID || getDefaultClientId(cloudType),
      tenantId: process.env.MS365_MCP_TENANT_ID || 'common',
      clientSecret: process.env.MS365_MCP_CLIENT_SECRET,
      cloudType,
    };
  }
}

/**
 * Azure Key Vault secrets provider.
 * Requires @azure/identity and @azure/keyvault-secrets packages.
 *
 * Secret name mapping:
 *   - ms365-mcp-client-id -> clientId
 *   - ms365-mcp-tenant-id -> tenantId
 *   - ms365-mcp-client-secret -> clientSecret (optional)
 *   - ms365-mcp-cloud-type -> cloudType (optional, defaults to 'global')
 */
class KeyVaultSecretsProvider implements SecretsProvider {
  private vaultUrl: string;

  constructor(vaultUrl: string) {
    this.vaultUrl = vaultUrl;
  }

  async getSecrets(): Promise<AppSecrets> {
    // Dynamic import to keep these as optional dependencies
    const { DefaultAzureCredential } = await import('@azure/identity');
    const { SecretClient } = await import('@azure/keyvault-secrets');

    const credential = new DefaultAzureCredential();
    const client = new SecretClient(this.vaultUrl, credential);

    logger.info(`Fetching secrets from Key Vault: ${this.vaultUrl}`);

    const [clientIdSecret, tenantIdSecret, clientSecretResult, cloudTypeResult] = await Promise.all(
      [
        client.getSecret('ms365-mcp-client-id'),
        client.getSecret('ms365-mcp-tenant-id').catch(() => null),
        client.getSecret('ms365-mcp-client-secret').catch(() => null),
        client.getSecret('ms365-mcp-cloud-type').catch(() => null),
      ]
    );

    if (!clientIdSecret.value) {
      throw new Error('Required secret ms365-mcp-client-id not found in Key Vault');
    }

    logger.info('Successfully retrieved secrets from Key Vault');

    return {
      clientId: clientIdSecret.value,
      tenantId: tenantIdSecret?.value || 'common',
      clientSecret: clientSecretResult?.value,
      cloudType: parseCloudType(cloudTypeResult?.value),
    };
  }
}

/**
 * AWS Systems Manager Parameter Store secrets provider.
 * Requires @aws-sdk/client-ssm package.
 *
 * Parameter name mapping (using the configured prefix, default "/m365-mcp"):
 *   - {prefix}/client-id     -> clientId
 *   - {prefix}/tenant-id     -> tenantId     (optional, defaults to 'common')
 *   - {prefix}/client-secret -> clientSecret  (optional)
 *   - {prefix}/cloud-type    -> cloudType     (optional, defaults to 'global')
 *
 * All parameters are fetched with decryption enabled so SecureString values work.
 * Set MS365_MCP_SSM_PREFIX to enable (e.g., "/m365-mcp" or "/prod/ms365").
 * Optionally set MS365_MCP_SSM_REGION to override the AWS region.
 */
class SsmSecretsProvider implements SecretsProvider {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix.replace(/\/+$/, ''); // strip trailing slashes
  }

  private async getParameter(name: string): Promise<string | undefined> {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
    const region = process.env.MS365_MCP_SSM_REGION;
    const ssm = new SSMClient(region ? { region } : {});
    try {
      const result = await ssm.send(
        new GetParameterCommand({ Name: `${this.prefix}/${name}`, WithDecryption: true })
      );
      return result.Parameter?.Value ?? undefined;
    } catch (error) {
      // ParameterNotFound is non-fatal for optional params
      if ((error as { name?: string }).name === 'ParameterNotFound') {
        return undefined;
      }
      throw error;
    }
  }

  async getSecrets(): Promise<AppSecrets> {
    logger.info(`Fetching secrets from AWS SSM with prefix: ${this.prefix}`);

      this.getParameter('client-id'),
      this.getParameter('tenant-id'),
      this.getParameter('client-secret'),
      this.getParameter('cloud-type'),
      
    ]);

    if (!clientId) {
      throw new Error(`Required SSM parameter ${this.prefix}/client-id not found`);
    }

    logger.info('Successfully retrieved secrets from AWS SSM');

    return {
      clientId,
      tenantId: tenantId || 'common',
      clientSecret,
      cloudType: parseCloudType(cloudTypeRaw),
      
    };
  }
}

/**
 * Creates a secrets provider based on environment configuration.
 * Priority: Key Vault > AWS SSM > Environment variables.
 */
function createSecretsProvider(): SecretsProvider {
  const vaultUrl = process.env.MS365_MCP_KEYVAULT_URL;
  if (vaultUrl) {
    logger.info('Key Vault URL configured, using Azure Key Vault for secrets');
    return new KeyVaultSecretsProvider(vaultUrl);
  }

  const ssmPrefix = process.env.MS365_MCP_SSM_PREFIX;
  if (ssmPrefix) {
    logger.info('SSM prefix configured, using AWS Systems Manager Parameter Store for secrets');
    return new SsmSecretsProvider(ssmPrefix);
  }

  logger.info('Using environment variables for secrets');
  return new EnvironmentSecretsProvider();
}

// Cached secrets to avoid repeated Key Vault calls
let cachedSecrets: AppSecrets | null = null;

/**
 * Retrieves application secrets from the configured provider.
 * Results are cached after the first call.
 */
export async function getSecrets(): Promise<AppSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const provider = createSecretsProvider();
  cachedSecrets = await provider.getSecrets();
  return cachedSecrets;
}

/**
 * Clears the cached secrets. Useful for testing or when secrets need to be refreshed.
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
}

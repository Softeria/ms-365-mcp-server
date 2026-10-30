import {
  ConfidentialClientApplication,
  ManagedIdentityApplication,
  type AuthenticationResult,
  type ManagedIdentityIdParams,
} from '@azure/msal-node';
import { X509Certificate } from 'crypto';
import { readFileSync } from 'fs';
import logger from './logger.js';
import type { AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId, parseCloudType } from './cloud-config.js';
import type { CommandOptions } from './cli.js';

export const APP_MODE_WARNING =
  'Warning: app mode (--app-mode) uses application permissions with no signed-in user. ' +
  'Whatever the app registration is granted applies to the whole tenant (every mailbox, ' +
  'calendar, site), and anyone who can call this server acts with it. Grant the fewest ' +
  'permissions you can, and scope mailbox access with RBAC for Applications in Exchange Online.';

// Client credentials need a real tenant: these authorities mean "whoever signs in".
const NON_TENANT_AUTHORITIES = new Set(['common', 'organizations', 'consumers']);

const LOCAL_ACCOUNT_FLAGS: Array<[keyof CommandOptions, string]> = [
  ['login', '--login'],
  ['logout', '--logout'],
  ['listAccounts', '--list-accounts'],
  ['selectAccount', '--select-account'],
  ['removeAccount', '--remove-account'],
  ['authBrowser', '--auth-browser'],
  ['expectedUsername', '--expected-username'],
  ['expectedHomeAccountId', '--expected-home-account-id'],
];

/** Refuses flags that need a signed-in user or a caller's token. */
export function assertAppModeOptions(options: CommandOptions): void {
  const conflicts: string[] = [];
  if (options.http) conflicts.push('--http');
  if (options.obo) conflicts.push('--obo');
  if (options.trustProxyAuth) conflicts.push('--trust-proxy-auth');
  // The app always asks for /.default: what is granted is what the token gets
  if (options.extraScopes !== undefined) conflicts.push('--extra-scopes');
  for (const [key, flag] of LOCAL_ACCOUNT_FLAGS) {
    if (options[key]) conflicts.push(flag);
  }
  if (process.env.MS365_MCP_OAUTH_TOKEN) conflicts.push('MS365_MCP_OAUTH_TOKEN');
  if (conflicts.length > 0) {
    throw new Error(
      `--app-mode cannot be combined with ${conflicts.join(', ')}. App mode is stdio only and ` +
        'uses the app registration itself, with no signed-in user.'
    );
  }
}

interface CertificateCredential {
  thumbprintSha256: string;
  privateKey: string;
}

function pemBlock(pem: string, label: RegExp): string | undefined {
  const match = pem.match(
    new RegExp(`-----BEGIN (${label.source})-----[\\s\\S]+?-----END \\1-----`)
  );
  return match?.[0];
}

/** Reads one PEM file holding both the certificate and its unencrypted private key. */
export function loadCertificateCredential(certPath: string): CertificateCredential {
  let pem: string;
  try {
    pem = readFileSync(certPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Cannot read MS365_MCP_CLIENT_CERTIFICATE_PATH (${certPath}): ${(error as Error).message}`
    );
  }
  if (pemBlock(pem, /ENCRYPTED PRIVATE KEY/)) {
    throw new Error(
      'MS365_MCP_CLIENT_CERTIFICATE_PATH holds an encrypted private key; decrypt it first (openssl pkey -in key.pem -out plain.pem).'
    );
  }
  const certificate = pemBlock(pem, /CERTIFICATE/);
  const privateKey = pemBlock(pem, /(?:RSA |EC )?PRIVATE KEY/);
  if (!certificate || !privateKey) {
    throw new Error(
      'MS365_MCP_CLIENT_CERTIFICATE_PATH must be a PEM file with both the certificate and its private key.'
    );
  }
  const thumbprintSha256 = new X509Certificate(certificate).fingerprint256.replace(/:/g, '');
  return { thumbprintSha256, privateKey };
}

function isBuiltInClientId(secrets: AppSecrets): boolean {
  try {
    return secrets.clientId === getDefaultClientId(secrets.cloudType);
  } catch {
    // A cloud with no built-in app (GCC High) always runs on the user's own registration
    return false;
  }
}

export interface AppTokenInfo {
  appId?: string;
  tenantId?: string;
  roles: string[];
}

function decodeTokenClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1] ?? '';
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

export function describeAppToken(token: string): AppTokenInfo {
  const claims = decodeTokenClaims(token);
  return {
    appId: (claims.appid ?? claims.azp) as string | undefined,
    tenantId: claims.tid as string | undefined,
    roles: Array.isArray(claims.roles) ? (claims.roles as string[]) : [],
  };
}

/** Reads the federated token (a JWT from Kubernetes, GitHub Actions, ...) that Entra is set up to trust. */
export function readFederatedToken(tokenPath: string): string {
  let token: string;
  try {
    token = readFileSync(tokenPath, 'utf8').trim();
  } catch (error) {
    throw new Error(
      `Cannot read MS365_MCP_FEDERATED_TOKEN_FILE (${tokenPath}): ${(error as Error).message}`
    );
  }
  if (!token) {
    throw new Error(`MS365_MCP_FEDERATED_TOKEN_FILE (${tokenPath}) is empty.`);
  }
  return token;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `system` (or true/1) for the host's system-assigned identity, a client id for a user-assigned one. */
export function parseManagedIdentity(value: string): ManagedIdentityIdParams {
  const trimmed = value.trim();
  if (['system', 'true', '1'].includes(trimmed.toLowerCase())) return {};
  if (GUID.test(trimmed)) return { userAssignedClientId: trimmed };
  throw new Error(
    `MS365_MCP_MANAGED_IDENTITY must be 'system' or the client id of a user-assigned identity, not '${trimmed}'.`
  );
}

export interface AppCredentialEnv {
  certPath?: string;
  federatedTokenFile?: string;
  managedIdentity?: string;
}

function managedIdentityFromEnv(): string | undefined {
  const value = process.env.MS365_MCP_MANAGED_IDENTITY?.trim();
  return value && !['false', '0'].includes(value.toLowerCase()) ? value : undefined;
}

function credentialEnvFromProcess(): AppCredentialEnv {
  return {
    certPath: process.env.MS365_MCP_CLIENT_CERTIFICATE_PATH || undefined,
    federatedTokenFile: process.env.MS365_MCP_FEDERATED_TOKEN_FILE || undefined,
    managedIdentity: managedIdentityFromEnv(),
  };
}

export function usesManagedIdentity(): boolean {
  return managedIdentityFromEnv() !== undefined;
}

/**
 * A managed identity has no app registration, so skip Key Vault and the built-in client id
 * fallback (which throws on GCC High). The secret is still read so a stray one is refused.
 */
export function managedIdentitySecrets(): AppSecrets {
  return {
    clientId: process.env.MS365_MCP_CLIENT_ID || '',
    tenantId: process.env.MS365_MCP_TENANT_ID || 'common',
    clientSecret: process.env.MS365_MCP_CLIENT_SECRET,
    cloudType: parseCloudType(process.env.MS365_MCP_CLOUD_TYPE),
  };
}

const CREDENTIAL_OPTIONS =
  'MS365_MCP_CLIENT_SECRET, MS365_MCP_CLIENT_CERTIFICATE_PATH, MS365_MCP_FEDERATED_TOKEN_FILE or MS365_MCP_MANAGED_IDENTITY';

/**
 * App-only tokens for app mode: client credentials (secret, certificate or federated token)
 * or a managed identity. MSAL keeps the token in memory and fetches a new one when it is
 * about to expire, so nothing is cached on disk.
 */
export class AppTokenClient {
  private acquire: () => Promise<AuthenticationResult | null>;

  constructor(secrets: AppSecrets, env: AppCredentialEnv = credentialEnvFromProcess()) {
    const set = [
      secrets.clientSecret && 'a client secret (MS365_MCP_CLIENT_SECRET, .env or Key Vault)',
      env.certPath && 'MS365_MCP_CLIENT_CERTIFICATE_PATH',
      env.federatedTokenFile && 'MS365_MCP_FEDERATED_TOKEN_FILE',
      env.managedIdentity && 'MS365_MCP_MANAGED_IDENTITY',
    ].filter((name): name is string => Boolean(name));
    if (set.length === 0) {
      throw new Error(`--app-mode needs one of ${CREDENTIAL_OPTIONS}.`);
    }
    if (set.length > 1) {
      throw new Error(`Set only one credential for --app-mode, not ${set.join(' and ')}.`);
    }

    const cloudEndpoints = getCloudEndpoints(secrets.cloudType);
    const graphResource = cloudEndpoints.graphApi.replace(/\/$/, '');

    if (env.managedIdentity) {
      // The identity belongs to the Azure host, so there is no tenant or app registration to name
      const managedIdentityIdParams = parseManagedIdentity(env.managedIdentity);
      if (secrets.clientId) {
        logger.warn(
          'App mode: MS365_MCP_CLIENT_ID is ignored with a managed identity. For a user-assigned identity, put its client id in MS365_MCP_MANAGED_IDENTITY.'
        );
      }
      const mia = new ManagedIdentityApplication({ managedIdentityIdParams });
      this.acquire = () => mia.acquireToken({ resource: graphResource });
      logger.info(
        `App mode: managed identity (${managedIdentityIdParams.userAssignedClientId ? `user-assigned ${managedIdentityIdParams.userAssignedClientId}` : 'system-assigned'})`
      );
      return;
    }

    const tenantId = secrets.tenantId?.trim();
    if (!tenantId || NON_TENANT_AUTHORITIES.has(tenantId.toLowerCase())) {
      throw new Error(
        `--app-mode needs MS365_MCP_TENANT_ID set to your tenant id or domain, not '${tenantId || 'common'}'.`
      );
    }
    if (isBuiltInClientId(secrets)) {
      throw new Error(
        '--app-mode needs MS365_MCP_CLIENT_ID set to your own app registration; the built-in app has no application permissions.'
      );
    }

    let credential:
      | { clientSecret: string }
      | { clientCertificate: CertificateCredential }
      | { clientAssertion: () => Promise<string> };
    let label: string;
    if (env.certPath) {
      credential = { clientCertificate: loadCertificateCredential(env.certPath) };
      label = 'a certificate';
    } else if (env.federatedTokenFile) {
      const tokenFile = env.federatedTokenFile;
      readFederatedToken(tokenFile);
      // Read on every request: these tokens rotate (about hourly on AKS)
      credential = { clientAssertion: async () => readFederatedToken(tokenFile) };
      label = 'a federated token';
    } else {
      credential = { clientSecret: secrets.clientSecret as string };
      label = 'a client secret';
    }

    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: secrets.clientId,
        authority: `${cloudEndpoints.authority}/${tenantId}`,
        ...credential,
      },
    });
    const scopes = [`${graphResource}/.default`];
    this.acquire = () => cca.acquireTokenByClientCredential({ scopes });
    logger.info(`App mode: client credentials with ${label} for tenant ${tenantId}`);
  }

  async getToken(): Promise<string> {
    const result = await this.acquire();
    if (!result?.accessToken) {
      throw new Error('App token request returned no access token');
    }
    return result.accessToken;
  }
}

import { ConfidentialClientApplication } from '@azure/msal-node';
import { X509Certificate } from 'crypto';
import { readFileSync } from 'fs';
import logger from './logger.js';
import type { AppSecrets } from './secrets.js';
import { getCloudEndpoints, getDefaultClientId } from './cloud-config.js';
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

/**
 * Client-credentials tokens for app mode. MSAL keeps the token in memory and
 * fetches a new one when it is about to expire, so nothing is cached on disk.
 */
export class AppTokenClient {
  private cca: ConfidentialClientApplication;
  private scopes: string[];

  constructor(secrets: AppSecrets, certPath = process.env.MS365_MCP_CLIENT_CERTIFICATE_PATH) {
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
    if (certPath && secrets.clientSecret) {
      throw new Error(
        'Set MS365_MCP_CLIENT_SECRET or MS365_MCP_CLIENT_CERTIFICATE_PATH for --app-mode, not both.'
      );
    }
    if (!certPath && !secrets.clientSecret) {
      throw new Error(
        '--app-mode needs MS365_MCP_CLIENT_SECRET or MS365_MCP_CLIENT_CERTIFICATE_PATH for your own app registration.'
      );
    }

    const cloudEndpoints = getCloudEndpoints(secrets.cloudType);
    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId: secrets.clientId,
        authority: `${cloudEndpoints.authority}/${tenantId}`,
        ...(certPath
          ? { clientCertificate: loadCertificateCredential(certPath) }
          : { clientSecret: secrets.clientSecret }),
      },
    });
    this.scopes = [`${cloudEndpoints.graphApi.replace(/\/$/, '')}/.default`];
    logger.info(
      `App mode: client credentials with a ${certPath ? 'certificate' : 'client secret'} for tenant ${tenantId}`
    );
  }

  async getToken(): Promise<string> {
    const result = await this.cca.acquireTokenByClientCredential({ scopes: this.scopes });
    if (!result?.accessToken) {
      throw new Error('Client credentials token request returned no access token');
    }
    return result.accessToken;
  }
}

import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import logger from '../../logger.js';

export interface OAuthClientRegistrationInput {
  tenantId: string;
  clientName?: string;
  redirectUris: readonly string[];
  grantTypes?: readonly string[];
  responseTypes?: readonly string[];
  tokenEndpointAuthMethod?: string;
}

export interface OAuthClientRegistration {
  id: string;
  tenantId: string;
  clientId: string;
  clientName: string | null;
  redirectUris: readonly string[];
  grantTypes: readonly string[];
  responseTypes: readonly string[];
  tokenEndpointAuthMethod: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  disabledAt: string | null;
}

type Db = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

const DEFAULT_GRANT_TYPES = Object.freeze(['authorization_code']);
const DEFAULT_RESPONSE_TYPES = Object.freeze(['code']);

export function hashOpaqueValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function newClientId(): string {
  return `mcp-client-${crypto.randomBytes(24).toString('base64url')}`;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function mapRow(row: Record<string, unknown>): OAuthClientRegistration {
  return Object.freeze({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    clientId: String(row.client_id),
    clientName: typeof row.client_name === 'string' ? row.client_name : null,
    redirectUris: Object.freeze(stringArray(row.redirect_uris)),
    grantTypes: Object.freeze(stringArray(row.grant_types)),
    responseTypes: Object.freeze(stringArray(row.response_types)),
    tokenEndpointAuthMethod: String(row.token_endpoint_auth_method ?? 'none'),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at as string | Date).toISOString() : null,
    disabledAt: row.disabled_at ? new Date(row.disabled_at as string | Date).toISOString() : null,
  });
}

export async function isOAuthClientStoreAvailable(db: Db): Promise<boolean> {
  try {
    await db.query('select 1 from oauth_clients limit 1');
    return true;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'DCR client store unavailable');
    return false;
  }
}

export async function createOAuthClientRegistration(
  db: Db,
  input: OAuthClientRegistrationInput
): Promise<OAuthClientRegistration> {
  const clientId = newClientId();
  const redirectUris = [...new Set(input.redirectUris)];
  const grantTypes = input.grantTypes?.length
    ? [...new Set(input.grantTypes)]
    : [...DEFAULT_GRANT_TYPES];
  const responseTypes = input.responseTypes?.length
    ? [...new Set(input.responseTypes)]
    : [...DEFAULT_RESPONSE_TYPES];
  const tokenEndpointAuthMethod = input.tokenEndpointAuthMethod ?? 'none';

  const result = await db.query(
    `insert into oauth_clients
       (tenant_id, client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
     returning id, tenant_id, client_id, client_name, redirect_uris, grant_types, response_types,
       token_endpoint_auth_method, created_at, updated_at, last_seen_at, disabled_at`,
    [
      input.tenantId,
      clientId,
      input.clientName ?? null,
      JSON.stringify(redirectUris),
      JSON.stringify(grantTypes),
      JSON.stringify(responseTypes),
      tokenEndpointAuthMethod,
    ]
  );

  logger.info(
    {
      tenantId: input.tenantId,
      redirectUriCount: redirectUris.length,
      grantTypeCount: grantTypes.length,
      clientIdHash: hashOpaqueValue(clientId).slice(0, 16),
    },
    'DCR client registration stored'
  );
  return mapRow(result.rows[0] as Record<string, unknown>);
}

export async function getActiveOAuthClientRegistration(
  db: Db,
  tenantId: string,
  clientId: string
): Promise<OAuthClientRegistration | null> {
  const result = await db.query(
    `select id, tenant_id, client_id, client_name, redirect_uris, grant_types, response_types,
       token_endpoint_auth_method, created_at, updated_at, last_seen_at, disabled_at
     from oauth_clients
     where tenant_id = $1 and client_id = $2 and disabled_at is null
     limit 1`,
    [tenantId, clientId]
  );
  return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
}

export async function touchOAuthClientRegistration(
  db: Db,
  tenantId: string,
  clientId: string
): Promise<void> {
  await db.query(
    `update oauth_clients set last_seen_at = now(), updated_at = now()
     where tenant_id = $1 and client_id = $2 and disabled_at is null`,
    [tenantId, clientId]
  );
}

export function hasExactRedirectUri(
  registration: Pick<OAuthClientRegistration, 'redirectUris'>,
  redirectUri: string
): boolean {
  return registration.redirectUris.includes(redirectUri);
}

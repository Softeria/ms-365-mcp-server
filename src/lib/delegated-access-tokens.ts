/**
 * Delegated connector-token admission markers.
 *
 * /t/:tenantId/token returns a Microsoft Graph access token to the MCP client
 * for delegated tenants. Graph access tokens are still forwarded to Graph
 * unchanged, but they are not reliable local MCP bearer credentials for our
 * stricter verifier path. Record only sha256(accessToken) in Redis so /mcp can
 * prove the token was minted by this server without storing the token itself.
 *
 * The marker TTL intentionally follows the server-side session TTL, not the
 * Microsoft Graph access-token expiry. Claude keeps presenting the original
 * MCP bearer; after the Graph token expires, the request must still be admitted
 * so TokenRefreshMiddleware can rotate the encrypted server-side session.
 */
import type { RedisClient } from './redis.js';
import { hashAccessToken } from './session-store.js';

const DEFAULT_TTL_SECONDS = 14 * 24 * 60 * 60;
const MIN_TTL_SECONDS = 60;

export function delegatedAccessTokenKey(tenantId: string, accessToken: string): string {
  return `mcp:delegated-access:${tenantId}:${hashAccessToken(accessToken)}`;
}

function parsePositiveTtl(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < MIN_TTL_SECONDS) return undefined;
  return parsed;
}

export function delegatedAccessTokenTtlSeconds(): number {
  return (
    parsePositiveTtl(process.env.MS365_MCP_DELEGATED_ACCESS_TTL_SECONDS) ??
    parsePositiveTtl(process.env.MS365_MCP_SESSION_TTL_SECONDS) ??
    DEFAULT_TTL_SECONDS
  );
}

export async function rememberDelegatedAccessToken(args: {
  redis: RedisClient;
  tenantId: string;
  accessToken: string;
  expiresOn?: Date | null;
}): Promise<void> {
  const ttlSeconds = delegatedAccessTokenTtlSeconds();
  await args.redis.set(
    delegatedAccessTokenKey(args.tenantId, args.accessToken),
    '1',
    'EX',
    ttlSeconds
  );
}

export async function forgetDelegatedAccessToken(args: {
  redis: RedisClient;
  tenantId: string;
  accessToken: string;
}): Promise<void> {
  await args.redis.del(delegatedAccessTokenKey(args.tenantId, args.accessToken));
}

export async function hasDelegatedAccessToken(args: {
  redis: RedisClient;
  tenantId: string;
  accessToken: string;
}): Promise<boolean> {
  return (await args.redis.get(delegatedAccessTokenKey(args.tenantId, args.accessToken))) !== null;
}

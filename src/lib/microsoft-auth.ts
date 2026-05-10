/**
 * Microsoft auth middleware + helpers (plan 03-06 + 03-07, AUTH-03, SECUR-02).
 *
 * Plan 03-07 DELETED the v1 refresh-token custom header read path entirely.
 * Refresh tokens now live in src/lib/session-store.ts (opaque server-side,
 * envelope-encrypted in Redis per-tenant). The deprecated legacy bearer
 * middleware that read the refresh-token from a custom HTTP header is gone.
 *
 * Graph 401 refresh path (src/graph-client.ts) consults SessionStore using
 * sha256(clientAccessToken) to look up the delegated session — no custom
 * header ever reaches a middleware or handler.
 *
 * Breaking change for v1 HTTP-mode users: see docs/migration-v1-to-v2.md.
 *
 * Remaining surface:
 *   - createBearerMiddleware (03-06): verifies bearer JWTs before tenant routing
 *   - exchangeCodeForToken: POST to Microsoft's /token endpoint (used by the
 *     stdio-mode OAuth callback and legacy /auth/callback handler)
 *   - refreshAccessToken: POST grant_type=refresh_token (kept for stdio-mode
 *     AuthManager fallback; HTTP-mode uses MSAL.acquireTokenByRefreshToken
 *     via the pool + session store)
 */
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import logger from '../logger.js';
import { getCloudEndpoints, type CloudType } from '../cloud-config.js';
import { requestContext, getRequestTokens } from '../request-context.js';
import { buildWwwAuthenticate } from './www-authenticate.js';
import type { TenantRow } from './tenant/tenant-row.js';

const MICROSOFT_GRAPH_APP_ID = '00000003-0000-0000-c000-000000000000';
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface BearerTokenVerificationInput {
  token: string;
  tenantId: string;
  clientId?: string;
  cloudType?: CloudType;
}

export type BearerTokenVerifier = (input: BearerTokenVerificationInput) => Promise<JWTPayload>;

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(url);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, jwks);
  return jwks;
}

function acceptedAudiences(clientId: string | undefined, cloudType: CloudType): string[] {
  const cloudEndpoints = getCloudEndpoints(cloudType);
  const audiences = new Set<string>([MICROSOFT_GRAPH_APP_ID, cloudEndpoints.graphApi]);
  if (clientId) {
    audiences.add(clientId);
    audiences.add(`api://${clientId}`);
  }
  return [...audiences];
}

function ownerSubjectFromPayload(payload: JWTPayload): string | undefined {
  for (const key of ['oid', 'sub', 'preferred_username', 'upn']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

export async function verifyMicrosoftBearerToken({
  token,
  tenantId,
  clientId,
  cloudType = 'global',
}: BearerTokenVerificationInput): Promise<JWTPayload> {
  const cloudEndpoints = getCloudEndpoints(cloudType);
  const issuer = `${cloudEndpoints.authority}/${tenantId}/v2.0`;
  const jwksUrl = `${cloudEndpoints.authority}/${tenantId}/discovery/v2.0/keys`;
  const { payload } = await jwtVerify(token, getJwks(jwksUrl), {
    issuer,
    audience: acceptedAudiences(clientId, cloudType),
  });
  return payload;
}

/**
 * Bearer middleware (AUTH-03).
 *
 * Verifies Microsoft-issued bearer JWTs before seeding requestContext. The
 * token is still forwarded as-is to Graph, but local MCP resources/tools are
 * no longer authorized by an unverified decoded payload.
 *
 * On match (tid === tenant.tenant_id): sets requestContext.accessToken = raw
 * token, flow = 'bearer'.
 * On mismatch: 401 tenant_mismatch.
 * On missing tid: 401 invalid_token / missing_tid_claim.
 * On malformed/unverified JWT: 401 invalid_token.
 * On missing Authorization header: calls next() without populating anything
 *   (pass-through to the next auth strategy, e.g., app-only selector).
 * On bearer without URL tenantId: 400 bearer_requires_tenant_context.
 */
export function createBearerMiddleware(
  deps: { verifyToken?: BearerTokenVerifier } = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const verifyToken = deps.verifyToken ?? verifyMicrosoftBearerToken;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.substring(7);

    const urlTenantIdRaw = req.params?.tenantId;
    const urlTenantIdEarly = Array.isArray(urlTenantIdRaw) ? urlTenantIdRaw[0] : urlTenantIdRaw;
    const tenantForChallenge =
      typeof urlTenantIdEarly === 'string' && urlTenantIdEarly ? urlTenantIdEarly : undefined;

    if (!tenantForChallenge) {
      // Bearer flows in Phase 3 are always per-tenant — refuse a bearer
      // request that arrived outside a tenant-scoped route.
      res.status(400).json({ error: 'bearer_requires_tenant_context' });
      return;
    }

    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    const expectedTenantId = tenant?.tenant_id ?? tenantForChallenge;

    let payload: JWTPayload;
    try {
      payload = await verifyToken({
        token,
        tenantId: expectedTenantId,
        clientId: tenant?.client_id,
        cloudType: tenant?.cloud_type ?? 'global',
      });
    } catch (err) {
      logger.info({ err: (err as Error).message }, 'bearer: JWT verification failed');
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWwwAuthenticate({
            req,
            tenantId: tenantForChallenge,
            error: 'invalid_token',
            errorDescription: 'JWT verification failed',
          })
        )
        .json({ error: 'invalid_token' });
      return;
    }

    if (typeof payload.tid !== 'string') {
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWwwAuthenticate({
            req,
            tenantId: tenantForChallenge,
            error: 'invalid_token',
            errorDescription: 'missing tid claim',
          })
        )
        .json({ error: 'invalid_token', detail: 'missing_tid_claim' });
      return;
    }

    if (payload.tid.toLowerCase() !== expectedTenantId.toLowerCase()) {
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWwwAuthenticate({
            req,
            tenantId: tenantForChallenge,
            error: 'invalid_token',
            errorDescription: 'JWT tid does not match tenant',
          })
        )
        .json({
          error: 'tenant_mismatch',
          detail: 'JWT tid does not match tenant',
        });
      return;
    }

    const existing = getRequestTokens() ?? {};
    requestContext.run(
      {
        ...existing,
        accessToken: token,
        flow: 'bearer',
        authClientId: undefined,
        tenantRow: tenant,
        ownerSubject: ownerSubjectFromPayload(payload),
      },
      () => next()
    );
  };
}

/**
 * Exchange authorization code for access token.
 *
 * Kept for the stdio-mode OAuth callback + legacy /auth/callback handler
 * (v1 compatibility). HTTP-mode /token now goes through
 * createTenantTokenHandler → tenantPool.acquire → MSAL.acquireTokenByCode
 * (two-leg PKCE), not this helper.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string | undefined,
  tenantId: string = 'common',
  codeVerifier?: string,
  cloudType: CloudType = 'global'
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}> {
  const cloudEndpoints = getCloudEndpoints(cloudType);
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  // Add client_secret for confidential clients
  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }

  // Add code_verifier for PKCE flow
  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  const response = await fetch(`${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`Failed to exchange code for token: ${error}`);
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an access token via the Microsoft /token endpoint. Retained for
 * stdio-mode compatibility only. HTTP-mode refreshes flow through
 * MSAL.acquireTokenByRefreshToken via the TenantPool + SessionStore (see
 * src/graph-client.ts refreshSessionAndRetry).
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string | undefined,
  tenantId: string = 'common',
  cloudType: CloudType = 'global'
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const cloudEndpoints = getCloudEndpoints(cloudType);
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }

  const response = await fetch(`${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`Failed to refresh token: ${error}`);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

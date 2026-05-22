import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';
import { getCloudEndpoints } from '../cloud-config.js';

function buildWwwAuthenticate(req: Request, error: string, description: string): string {
  const protocol = req.secure ? 'https' : 'http';
  const origin = `${protocol}://${req.get('host')}`;
  const resourceMetadata = `${origin}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${resourceMetadata}", error="${error}", error_description="${description}"`;
}

// Returns true only for JWTs whose exp claim is in the past.
// Opaque tokens (e.g. MSA compact tokens) and tokens without exp return false
// and are passed through for Graph to validate.
function isJwtExpired(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

/**
 * Microsoft Bearer Token Auth Middleware validates that the request has a valid Microsoft access token.
 * Returns HTTP 401 + WWW-Authenticate on missing or expired tokens so spec-compliant MCP clients
 * refresh via the /token endpoint. Opaque tokens fall through and are validated by Graph.
 */
export const microsoftBearerTokenAuthMiddleware =
  () =>
  (
    req: Request & { microsoftAuth?: { accessToken: string } },
    res: Response,
    next: NextFunction
  ): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWwwAuthenticate(req, 'invalid_token', 'Missing or malformed Authorization header')
        )
        .json({
          error: 'invalid_token',
          error_description: 'Missing or malformed Authorization header',
        });
      return;
    }

    const accessToken = authHeader.substring(7);

    if (isJwtExpired(accessToken)) {
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWwwAuthenticate(req, 'invalid_token', 'The access token has expired')
        )
        .json({ error: 'invalid_token', error_description: 'The access token has expired' });
      return;
    }

    req.microsoftAuth = { accessToken };

    next();
  };

export interface UpstreamOAuthErrorBody {
  error: string;
  error_description?: string;
  error_codes?: number[];
  suberror?: string;
  trace_id?: string;
  correlation_id?: string;
  timestamp?: string;
}

export class OAuthUpstreamError extends Error {
  readonly status: number;
  readonly body: UpstreamOAuthErrorBody;
  readonly raw: string;

  constructor(status: number, raw: string, body: UpstreamOAuthErrorBody) {
    const suffix = body.error_description ? ` - ${body.error_description}` : '';
    super(`OAuth upstream error: ${body.error}${suffix}`);
    this.name = 'OAuthUpstreamError';
    this.status = status;
    this.body = body;
    this.raw = raw;
  }
}

function parseUpstreamOAuthError(raw: string): UpstreamOAuthErrorBody | null {
  try {
    const json = JSON.parse(raw) as unknown;
    if (
      json !== null &&
      typeof json === 'object' &&
      typeof (json as { error?: unknown }).error === 'string'
    ) {
      return json as UpstreamOAuthErrorBody;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export function toOAuthErrorResponse(error: unknown): {
  status: number;
  body: { error: string; error_description?: string; suberror?: string };
} {
  if (error instanceof OAuthUpstreamError) {
    const body: { error: string; error_description?: string; suberror?: string } = {
      error: error.body.error,
    };
    if (error.body.error_description) body.error_description = error.body.error_description;
    if (error.body.suberror) body.suberror = error.body.suberror;
    return { status: 400, body };
  }
  return {
    status: 500,
    body: {
      error: 'server_error',
      error_description: 'Internal server error during token exchange',
    },
  };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string | undefined,
  tenantId: string = 'common',
  codeVerifier?: string
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}> {
  const cloudEndpoints = getCloudEndpoints();
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
    const raw = await response.text();
    const parsed = parseUpstreamOAuthError(raw);
    if (parsed) {
      logger.warn(`Token endpoint upstream OAuth error: ${parsed.error}`, {
        status: response.status,
        error: parsed.error,
        suberror: parsed.suberror,
        error_codes: parsed.error_codes,
        correlation_id: parsed.correlation_id,
      });
      throw new OAuthUpstreamError(response.status, raw, parsed);
    }
    logger.error(`Failed to exchange code for token: ${raw}`);
    throw new Error(`Failed to exchange code for token: ${raw}`);
  }

  return response.json();
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string | undefined,
  tenantId: string = 'common'
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const cloudEndpoints = getCloudEndpoints();
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
    const raw = await response.text();
    const parsed = parseUpstreamOAuthError(raw);
    if (parsed) {
      logger.warn(`Token endpoint upstream OAuth error: ${parsed.error}`, {
        status: response.status,
        error: parsed.error,
        suberror: parsed.suberror,
        error_codes: parsed.error_codes,
        correlation_id: parsed.correlation_id,
      });
      throw new OAuthUpstreamError(response.status, raw, parsed);
    }
    logger.error(`Failed to refresh token: ${raw}`);
    throw new Error(`Failed to refresh token: ${raw}`);
  }

  return response.json();
}

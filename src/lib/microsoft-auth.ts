import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';
import { getCloudEndpoints, type CloudType } from '../cloud-config.js';

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
export const microsoftBearerTokenAuthMiddleware = (
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

/**
 * Exchange authorization code for access token
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

  // When the app registration has the redirect_uri registered as a
  // Single-Page Application (SPA), Entra requires the /token request to
  // include an Origin header matching the redirect_uri's origin — otherwise
  // it returns AADSTS9002327 ("Tokens issued for the 'Single-Page Application'
  // client-type may only be redeemed via cross-origin requests"). SPA redirect
  // URIs are the only way to get PKCE-without-secret working against a tenant
  // where user-consent restrictions or a public-client-disallowed policy rule
  // out a confidential-client flow. Emulate the cross-origin call here so
  // server-side token redemption works for both Web and SPA redirect types
  // (for Web redirects Entra simply ignores the Origin header).
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  try {
    const redirectUrl = new URL(redirectUri);
    headers['Origin'] = redirectUrl.origin;
  } catch {
    // redirect_uri is not a valid URL — omit Origin and let Entra decide
  }

  const response = await fetch(`${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers,
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
 * Refresh an access token
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

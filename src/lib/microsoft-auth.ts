import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

/**
 * Microsoft Bearer Token Auth Middleware validates that the request has a valid Microsoft access token
 * The token is passed in the Authorization header as a Bearer token
 */
export const microsoftBearerTokenAuthMiddleware = (
  req: Request & { microsoftAuth?: { accessToken: string; refreshToken: string } },
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid access token' });
    return;
  }

  const accessToken = authHeader.substring(7);

  // For Microsoft Graph, we don't validate the token here - we'll let the API calls fail if it's invalid
  // and handle token refresh in the GraphClient

  // Extract refresh token from a custom header (if provided)
  const refreshToken = (req.headers['x-microsoft-refresh-token'] as string) || '';

  // Store tokens in request for later use
  req.microsoftAuth = {
    accessToken,
    refreshToken,
  };

  next();
};

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  tenantId: string = 'common',
  codeVerifier?: string
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  // Add code_verifier for PKCE flow
  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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
 * Refresh an access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tenantId: string = 'common'
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`Failed to refresh token: ${error}`);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

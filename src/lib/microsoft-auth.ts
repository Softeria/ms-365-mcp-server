import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';
import { getCloudEndpoints, type CloudType } from '../cloud-config.js';

/**
 * Build the resource_metadata URL per RFC 9728 §3.1.
 * (https://www.rfc-editor.org/rfc/rfc9728.html#name-protected-resource-metadata-)
 *
 * When the resource identifier has a path component that should be seen as the resource path.
 * And thus be inserted in the end of the well-known URI.
 *
 *   https://example.com                   → https://example.com/.well-known/oauth-protected-resource
 *   https://example.com/tenant/ms-365-mcp → https://example.com/.well-known/oauth-protected-resource/tenant/ms-365-mcp
 *
 * When publicUrl is absent the request Host
 * header is used as the origin and no additional path component is appended.
 */
function buildResourceMetadataUrl(req: Request, publicUrl?: string | null): string {
  if (publicUrl) {
    const parsed = new URL(publicUrl);
    // If the resource identifier value contains a path or query component,
    // any terminating slash (/) following the host component MUST be removed
    // before inserting /.well-known/ and the well-known URI path suffix
    // between the host component and the path and/or query components
    const path = parsed.pathname.replace(/\/$/, '');
    return `${parsed.origin}/.well-known/oauth-protected-resource${path}`;
  }
  const protocol = req.secure ? 'https' : 'http';
  const origin = `${protocol}://${req.get('host')}`;
  return `${origin}/.well-known/oauth-protected-resource`;
}

function buildWwwAuthenticate(
  req: Request,
  error: string,
  description: string,
  publicUrl?: string | null
): string {
  const resourceMetadata = buildResourceMetadataUrl(req, publicUrl);
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

const DISCOVERY_METHODS = new Set([
  'initialize',
  'notifications/initialized',
  'tools/list',
  'prompts/list',
  'resources/list',
  'ping',
]);

function isDiscoveryRequest(req: Request): boolean {
  if (req.method !== 'POST' || !req.body) return false;
  const body = req.body;
  if (Array.isArray(body)) {
    return body.every((item) => DISCOVERY_METHODS.has(item?.method));
  }
  return DISCOVERY_METHODS.has(body?.method);
}

/**
 * Microsoft Bearer Token Auth Middleware validates that the request has a valid Microsoft access token.
 * Returns HTTP 401 + WWW-Authenticate on missing or expired tokens so spec-compliant MCP clients
 * refresh via the /token endpoint. Opaque tokens fall through and are validated by Graph.
 *
 * When `trustProxyAuth` is true the bearer check is skipped — an upstream
 * reverse proxy is presumed to have authenticated the caller, and Microsoft
 * Graph access falls back to the locally cached MSAL refresh token via
 * AuthManager (the same path stdio mode uses).
 *
 * When `allowUnauthenticatedDiscovery` is true, discovery requests (initialize,
 * tools/list, etc.) are allowed without a token so that MCP gateways can
 * register the available tools before any user has authenticated. It is off by
 * default; non-discovery requests (e.g. tools/call) always still require a token.
 */
export const microsoftBearerTokenAuthMiddleware =
  (
    opts: {
      trustProxyAuth?: boolean;
      allowUnauthenticatedDiscovery?: boolean;
      publicUrl?: string | null;
    } = {}
  ) =>
  (
    req: Request & { microsoftAuth?: { accessToken: string } },
    res: Response,
    next: NextFunction
  ): void => {
    if (opts.trustProxyAuth) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (opts.allowUnauthenticatedDiscovery && isDiscoveryRequest(req)) {
        next();
        return;
      }
      res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWwwAuthenticate(
            req,
            'invalid_token',
            'Missing or malformed Authorization header',
            opts.publicUrl
          )
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
          buildWwwAuthenticate(req, 'invalid_token', 'The access token has expired', opts.publicUrl)
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

// AADSTS700025 — "Client is public so neither 'client_assertion' nor
// 'client_secret' should be presented". One app registration can hold both a
// Web redirect URI, which requires the secret, and a Mobile and desktop one,
// which forbids it, so whether to send the secret is a property of the exchange
// rather than of our configuration. A loopback URI is legal under either
// platform, so we can't tell them apart from the redirect_uri alone — send the
// secret, and let Entra tell us when this particular exchange didn't want one.
const PUBLIC_CLIENT_SECRET_REJECTED = 700025;

function isPublicClientRejection(body: UpstreamOAuthErrorBody | null): boolean {
  // parseUpstreamOAuthError only guarantees `error` is a string, so error_codes
  // is whatever the upstream sent. Anything but an array of numbers isn't Entra
  // answering us, and must not turn into a TypeError that costs the caller the
  // OAuth passthrough and hands it a bare 500 instead.
  return (
    Array.isArray(body?.error_codes) && body.error_codes.includes(PUBLIC_CLIENT_SECRET_REJECTED)
  );
}

type TokenResponse =
  | { ok: true; json: unknown }
  | { ok: false; status: number; raw: string; parsed: UpstreamOAuthErrorBody | null };

async function postTokenRequest(tokenUrl: string, params: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (response.ok) {
    return { ok: true, json: await response.json() };
  }

  const raw = await response.text();
  return { ok: false, status: response.status, raw, parsed: parseUpstreamOAuthError(raw) };
}

/**
 * POST to the token endpoint, retrying once without client_secret if Entra
 * rejects it as a public client. See PUBLIC_CLIENT_SECRET_REJECTED.
 */
async function requestToken<T>(
  tokenUrl: string,
  params: URLSearchParams,
  clientSecret: string | undefined,
  failureMessage: string
): Promise<T> {
  if (!clientSecret) {
    return unwrapToken(await postTokenRequest(tokenUrl, params), failureMessage);
  }

  const withSecret = new URLSearchParams(params);
  withSecret.append('client_secret', clientSecret);

  let result = await postTokenRequest(tokenUrl, withSecret);

  if (!result.ok && isPublicClientRejection(result.parsed)) {
    // Carry the first attempt's correlation_id: if the retry then fails for an
    // unrelated reason, this is the only record that a 700025 came before it.
    logger.info(
      'Upstream rejected client_secret as a public client (AADSTS700025) — retrying without it',
      {
        status: result.status,
        error_codes: result.parsed?.error_codes,
        correlation_id: result.parsed?.correlation_id,
      }
    );
    // params is the untouched copy, so the retry is the same request minus the secret.
    result = await postTokenRequest(tokenUrl, params);
  }

  return unwrapToken(result, failureMessage);
}

function unwrapToken<T>(result: TokenResponse, failureMessage: string): T {
  if (result.ok) {
    return result.json as T;
  }

  if (result.parsed) {
    logger.warn(`Token endpoint upstream OAuth error: ${result.parsed.error}`, {
      status: result.status,
      error: result.parsed.error,
      suberror: result.parsed.suberror,
      error_codes: result.parsed.error_codes,
      correlation_id: result.parsed.correlation_id,
    });
    throw new OAuthUpstreamError(result.status, result.raw, result.parsed);
  }

  logger.error(`${failureMessage}: ${result.raw}`);
  throw new Error(`${failureMessage}: ${result.raw}`);
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

  // Add code_verifier for PKCE flow
  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  return requestToken(
    `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/token`,
    params,
    clientSecret,
    'Failed to exchange code for token'
  );
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

  return requestToken(
    `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/token`,
    params,
    clientSecret,
    'Failed to refresh token'
  );
}

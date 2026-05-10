import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import logger from '../../logger.js';
import type { CloudType } from '../../cloud-config.js';
import { exchangeCodeForToken, refreshAccessToken } from '../microsoft-auth.js';
import type { PkceStore } from '../pkce-store/pkce-store.js';

const LEGACY_SINGLE_TENANT_KEY = '_';

export interface TokenHandlerSecrets {
  clientId: string;
  clientSecret?: string;
  tenantId?: string;
  cloudType: CloudType;
}

export interface TokenHandlerConfig {
  secrets: TokenHandlerSecrets;
  pkceStore: PkceStore;
}

function stripRefreshToken<T extends Record<string, unknown>>(result: T): Omit<T, 'refresh_token'> {
  const { refresh_token: _refreshToken, ...publicResult } = result;
  return publicResult;
}

export function createTokenHandler(config: TokenHandlerConfig) {
  const { secrets, pkceStore } = config;

  return async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info(
        {
          method: req.method,
          url: req.url,
          contentType: req.get('Content-Type'),
          grant_type: (req.body as Record<string, unknown> | undefined)?.grant_type,
        },
        'Token endpoint called'
      );

      const body = req.body as Record<string, unknown> | undefined;

      if (!body) {
        logger.error({}, 'Token endpoint: Request body is undefined');
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Request body is required',
        });
        return;
      }

      if (!body.grant_type) {
        logger.error(
          {
            grant_type: '[MISSING]',
            has_code: Boolean(body.code),
            has_refresh_token: Boolean(body.refresh_token),
            has_client_secret: Boolean(body.client_secret),
          },
          'Token endpoint: grant_type is missing'
        );
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'grant_type parameter is required',
        });
        return;
      }

      if (body.grant_type === 'authorization_code') {
        if (typeof body.code !== 'string' || body.code.length === 0) {
          res.status(400).json({
            error: 'invalid_request',
            error_description: 'code parameter is required',
          });
          return;
        }
        if (typeof body.redirect_uri !== 'string' || body.redirect_uri.length === 0) {
          res.status(400).json({
            error: 'invalid_request',
            error_description: 'redirect_uri parameter is required',
          });
          return;
        }
        const tenantId = secrets.tenantId || 'common';
        const clientId = secrets.clientId;
        const clientSecret = secrets.clientSecret;

        logger.info(
          {
            redirect_uri: body.redirect_uri,
            has_code: Boolean(body.code),
            has_code_verifier: Boolean(body.code_verifier),
            clientId,
            tenantId,
            hasClientSecret: Boolean(clientSecret),
          },
          'Token endpoint: authorization_code exchange'
        );

        let serverCodeVerifier: string | undefined;
        if (body.code_verifier) {
          const clientVerifier = body.code_verifier as string;
          const clientChallengeComputed = crypto
            .createHash('sha256')
            .update(clientVerifier)
            .digest('base64url');

          const pkceEntry = await pkceStore.takeByChallenge(
            LEGACY_SINGLE_TENANT_KEY,
            clientChallengeComputed
          );
          if (pkceEntry) {
            serverCodeVerifier = pkceEntry.serverCodeVerifier;
            logger.info(
              { state: pkceEntry.state.substring(0, 8) + '...' },
              'Two-leg PKCE: matched client verifier, using server verifier'
            );
          }
        }

        const result = await exchangeCodeForToken(
          body.code as string,
          body.redirect_uri as string,
          clientId,
          clientSecret,
          tenantId,
          serverCodeVerifier || (body.code_verifier as string | undefined),
          secrets.cloudType
        );
        res.json(stripRefreshToken(result));
      } else if (body.grant_type === 'refresh_token') {
        if (process.env.MS365_MCP_LEGACY_OAUTH_REFRESH === '1') {
          const tenantId = secrets.tenantId || 'common';
          const clientId = secrets.clientId;
          const clientSecret = secrets.clientSecret;

          if (clientSecret) {
            logger.warn(
              {},
              'Legacy /token refresh: confidential client with client_secret (MS365_MCP_LEGACY_OAUTH_REFRESH=1 opt-in; refresh-token-from-body crosses trust boundary)'
            );
          } else {
            logger.warn(
              {},
              'Legacy /token refresh: public client without client_secret (MS365_MCP_LEGACY_OAUTH_REFRESH=1 opt-in; refresh-token-from-body crosses trust boundary)'
            );
          }

          const result = await refreshAccessToken(
            body.refresh_token as string,
            clientId,
            clientSecret,
            tenantId,
            secrets.cloudType
          );
          res.json(stripRefreshToken(result));
        } else {
          res.status(400).json({
            error: 'unsupported_grant_type',
            error_description:
              'refresh_token grant retired on the legacy /token mount in v2. ' +
              'Use /t/:tenantId/token and rely on the server-side SessionStore ' +
              '(refresh tokens never cross the client trust boundary in v2). ' +
              'For narrow migration windows, opt back in with MS365_MCP_LEGACY_OAUTH_REFRESH=1.',
          });
        }
      } else {
        res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: `Grant type '${body.grant_type}' is not supported`,
        });
      }
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error.message : String(error),
          code: (error as { code?: string } | undefined)?.code,
        },
        'Token endpoint error'
      );
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token exchange',
      });
    }
  };
}

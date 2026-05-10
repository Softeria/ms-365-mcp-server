import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import logger from '../../logger.js';
import { validateRedirectUri, type RedirectUriPolicy } from '../redirect-uri.js';
import { resolveConnectorIdentity } from '../connector-identity/metadata.js';

export function createRegisterHandler(policy: RedirectUriPolicy) {
  return async (req: Request, res: Response): Promise<void> => {
    const body = (req.body as Record<string, unknown>) ?? {};
    const requestedGrantTypes = Array.isArray(body.grant_types) ? body.grant_types : [];
    const grantTypes = requestedGrantTypes.filter(
      (grant): grant is string => grant === 'authorization_code'
    );

    logger.info(
      {
        client_name: body.client_name,
        grant_types: body.grant_types,
        redirect_uri_count: Array.isArray(body.redirect_uris) ? body.redirect_uris.length : 0,
      },
      'Client registration request'
    );

    const redirectUris: unknown[] = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    for (const uri of redirectUris) {
      if (typeof uri !== 'string') {
        res.status(400).json({
          error: 'invalid_redirect_uri',
          reason: 'redirect_uris must be strings',
        });
        return;
      }
      const result = validateRedirectUri(uri, policy);
      if (!result.ok) {
        res.status(400).json({
          error: 'invalid_redirect_uri',
          redirect_uri: uri,
          reason: result.reason,
        });
        return;
      }
    }

    const clientId = `mcp-client-${crypto.randomBytes(8).toString('hex')}`;

    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      grant_types: grantTypes.length ? grantTypes : ['authorization_code'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'none',
      client_name:
        body.client_name ||
        resolveConnectorIdentity({ version: 'dynamic-registration' }).displayName,
    });
  };
}

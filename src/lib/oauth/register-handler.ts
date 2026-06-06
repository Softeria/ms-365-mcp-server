import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import type { Pool } from 'pg';
import logger from '../../logger.js';
import { validateRedirectUri, type RedirectUriPolicy } from '../redirect-uri.js';
import { resolveConnectorIdentity } from '../connector-identity/metadata.js';
import { createOAuthClientRegistration, hashOpaqueValue } from './client-store.js';

export interface RegisterHandlerOptions {
  pgPool?: Pool;
  tenantId?: string;
  supportedGrantTypes?: readonly string[];
  defaultGrantTypes?: readonly string[];
}

function stringList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const filtered = value.filter((item): item is string => typeof item === 'string');
  return filtered.length ? [...new Set(filtered)] : [...fallback];
}

function hasUnsupportedValues(values: readonly string[], supported: readonly string[]): boolean {
  return values.some((value) => !supported.includes(value));
}

function safeClientName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 128) : undefined;
}

export function createRegisterHandler(
  policy: RedirectUriPolicy,
  options: RegisterHandlerOptions = {}
) {
  return async (req: Request, res: Response): Promise<void> => {
    const body = (req.body as Record<string, unknown>) ?? {};
    const supportedGrantTypes = options.supportedGrantTypes ?? [
      'authorization_code',
      'refresh_token',
    ];
    const defaultGrantTypes = options.defaultGrantTypes ?? supportedGrantTypes;
    const grantTypes = stringList(body.grant_types, defaultGrantTypes);
    const responseTypes = stringList(body.response_types, ['code']);
    const tokenEndpointAuthMethod =
      typeof body.token_endpoint_auth_method === 'string'
        ? body.token_endpoint_auth_method
        : 'none';
    if (hasUnsupportedValues(grantTypes, supportedGrantTypes)) {
      res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Unsupported grant_type requested.',
      });
      return;
    }
    if (hasUnsupportedValues(responseTypes, ['code'])) {
      res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Unsupported response_type requested.',
      });
      return;
    }
    if (grantTypes.includes('refresh_token') && !grantTypes.includes('authorization_code')) {
      res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'refresh_token requires authorization_code.',
      });
      return;
    }
    if (tokenEndpointAuthMethod !== 'none') {
      res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Only token_endpoint_auth_method "none" is supported.',
      });
      return;
    }
    const clientName =
      safeClientName(body.client_name) ??
      resolveConnectorIdentity({ version: 'dynamic-registration' }).displayName;

    logger.info(
      {
        durable: Boolean(options.pgPool && options.tenantId),
        clientNamePresent: Boolean(clientName),
        clientNameHash: hashOpaqueValue(clientName).slice(0, 16),
        clientNameLength: clientName.length,
        grantTypeCount: grantTypes.length,
        redirectUriCount: Array.isArray(body.redirect_uris) ? body.redirect_uris.length : 0,
        redirect_uri_count: Array.isArray(body.redirect_uris) ? body.redirect_uris.length : 0,
      },
      'Client registration request'
    );

    const redirectUris: unknown[] = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    const validatedRedirectUris: string[] = [];
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
        logger.warn(
          { reason: result.reason, redirectUriHash: hashOpaqueValue(uri).slice(0, 16) },
          'Client registration rejected redirect URI'
        );
        res.status(400).json({
          error: 'invalid_redirect_uri',
          redirect_uri: uri,
          reason: result.reason,
        });
        return;
      }
      validatedRedirectUris.push(uri);
    }

    if (
      options.pgPool &&
      options.tenantId &&
      grantTypes.includes('authorization_code') &&
      validatedRedirectUris.length === 0
    ) {
      res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Durable authorization_code clients require at least one redirect_uri.',
      });
      return;
    }

    if (options.pgPool && options.tenantId) {
      const registration = await createOAuthClientRegistration(options.pgPool, {
        tenantId: options.tenantId,
        clientName,
        redirectUris: validatedRedirectUris,
        grantTypes: grantTypes.length ? grantTypes : defaultGrantTypes,
        responseTypes: responseTypes.length ? responseTypes : ['code'],
        tokenEndpointAuthMethod,
      });
      res.status(201).json({
        client_id: registration.clientId,
        client_id_issued_at: Math.floor(Date.parse(registration.createdAt) / 1000),
        redirect_uris: registration.redirectUris,
        grant_types: registration.grantTypes,
        response_types: registration.responseTypes,
        token_endpoint_auth_method: registration.tokenEndpointAuthMethod,
        client_name: registration.clientName ?? clientName,
      });
      return;
    }

    const clientId = `mcp-client-${crypto.randomBytes(24).toString('base64url')}`;

    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: validatedRedirectUris,
      grant_types: grantTypes.length ? grantTypes : defaultGrantTypes,
      response_types: responseTypes.length ? responseTypes : ['code'],
      token_endpoint_auth_method: tokenEndpointAuthMethod,
      client_name: clientName,
    });
  };
}

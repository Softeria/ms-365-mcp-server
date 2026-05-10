import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import crypto from 'node:crypto';
import logger from '../../logger.js';
import { getCloudEndpoints } from '../../cloud-config.js';
import { getRequestTokens } from '../../request-context.js';
import { validateRedirectUri } from '../redirect-uri.js';
import {
  delegatedAccessTokenTtlSeconds,
  rememberDelegatedAccessToken,
} from '../delegated-access-tokens.js';
import type { RedisClient } from '../redis.js';
import type { PkceStore } from '../pkce-store/pkce-store.js';
import type { TenantRow } from '../tenant/tenant-row.js';
import type { TenantPool } from '../tenant/tenant-pool.js';

export interface AuthorizeHandlerConfig {
  pkceStore: PkceStore;
  pgPool?: Pool;
  extraAllowedHosts?: readonly string[];
}

export interface TenantTokenHandlerConfig {
  pkceStore: PkceStore;
  tenantPool: Pick<TenantPool, 'acquire' | 'getDekForTenant'>;
  redis: RedisClient;
  pgPool?: Pool;
}

function normalizeRedirectUri(u: string): string {
  try {
    const parsed = new URL(u);
    return parsed.href.replace(/\/$/, '');
  } catch {
    return u;
  }
}

export function createAuthorizeHandler(config: AuthorizeHandlerConfig) {
  const { pkceStore, pgPool, extraAllowedHosts } = config;

  const emitAudit = (
    tenantId: string,
    result: 'success' | 'failure',
    redirectUri: string,
    meta: Record<string, unknown>,
    req: Request
  ): void => {
    if (!pgPool) return;
    void (async () => {
      const { writeAuditStandalone } = await import('../audit.js');
      const reqId =
        (req as Request & { id?: string }).id ?? getRequestTokens()?.requestId ?? 'no-req-id';
      await writeAuditStandalone(pgPool, {
        tenantId,
        actor: 'unauthenticated',
        action: 'oauth.authorize',
        target: redirectUri || null,
        ip: req.ip ?? null,
        requestId: reqId,
        result,
        meta,
      });
    })();
  };

  return async (req: Request, res: Response): Promise<void> => {
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(500).json({ error: 'loadTenant_missing' });
      return;
    }

    const redirectUri = String(req.query.redirect_uri ?? '');
    const schemeCheck = validateRedirectUri(redirectUri, {
      mode: 'prod',
      publicUrlHost: null,
      extraAllowedHosts,
    });
    if (!schemeCheck.ok) {
      emitAudit(
        tenant.id,
        'failure',
        redirectUri,
        { error: 'invalid_redirect_uri', reason: schemeCheck.reason },
        req
      );
      res.status(400).json({ error: 'invalid_redirect_uri', reason: schemeCheck.reason });
      return;
    }

    const normalizedRedirect = normalizeRedirectUri(redirectUri);
    const allowlistNormalized = tenant.redirect_uri_allowlist.map(normalizeRedirectUri);
    if (!allowlistNormalized.includes(normalizedRedirect)) {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'invalid_redirect_uri' }, req);
      res.status(400).json({ error: 'invalid_redirect_uri' });
      return;
    }

    const clientCodeChallenge = String(req.query.code_challenge ?? '');
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(clientCodeChallenge)) {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'invalid_code_challenge' }, req);
      res.status(400).json({ error: 'invalid_code_challenge' });
      return;
    }
    const clientCodeChallengeMethod = String(req.query.code_challenge_method ?? 'S256');
    const state = String(req.query.state ?? crypto.randomBytes(16).toString('base64url'));
    const clientId = String(req.query.client_id ?? tenant.client_id);
    const tenantKey = tenant.id;

    const serverCodeVerifier = crypto.randomBytes(32).toString('base64url');
    const serverChallenge = crypto
      .createHash('sha256')
      .update(serverCodeVerifier)
      .digest('base64url');

    const ok = await pkceStore.put(tenantKey, {
      state,
      clientCodeChallenge,
      clientCodeChallengeMethod,
      serverCodeVerifier,
      clientId,
      redirectUri,
      tenantId: tenantKey,
      createdAt: Date.now(),
    });
    if (!ok) {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'pkce_challenge_collision' }, req);
      res.status(400).json({
        error: 'pkce_challenge_collision',
        error_description:
          'An outstanding authorization request already uses this code_challenge; regenerate and retry.',
      });
      return;
    }

    const cloudEndpoints = getCloudEndpoints(tenant.cloud_type);
    const azureTenant = tenant.tenant_id || 'common';
    const authorizeUrl = new URL(
      `${cloudEndpoints.authority}/${azureTenant}/oauth2/v2.0/authorize`
    );
    authorizeUrl.searchParams.set('client_id', tenant.client_id);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set(
      'scope',
      tenant.allowed_scopes.length ? tenant.allowed_scopes.join(' ') : 'User.Read'
    );
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', serverChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    logger.info(
      {
        tenantId: tenant.id,
        state: state.substring(0, 8) + '...',
        challengePrefix: clientCodeChallenge.substring(0, 8) + '...',
      },
      'Two-leg PKCE: stored client challenge, forwarding to Microsoft with server challenge'
    );

    emitAudit(
      tenant.id,
      'success',
      redirectUri,
      {
        clientId: tenant.client_id,
        scopes: tenant.allowed_scopes,
      },
      req
    );
    res.redirect(authorizeUrl.toString());
  };
}

interface DelegatedMsalClient {
  acquireTokenByCode: (config: {
    code: string;
    scopes: string[];
    redirectUri: string;
    codeVerifier: string;
  }) => Promise<{
    accessToken?: string;
    refreshToken?: string;
    expiresOn?: Date | null;
    account?: { homeAccountId?: string; username?: string } | null;
  } | null>;
}

function isDelegatedMsalClient(client: unknown): client is DelegatedMsalClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'acquireTokenByCode' in client &&
    typeof (client as { acquireTokenByCode: unknown }).acquireTokenByCode === 'function'
  );
}

function serializeMsalCache(client: unknown): string | undefined {
  if (
    typeof client !== 'object' ||
    client === null ||
    !('getTokenCache' in client) ||
    typeof (client as { getTokenCache: unknown }).getTokenCache !== 'function'
  ) {
    return undefined;
  }
  const cache = (client as { getTokenCache: () => { serialize?: () => string } }).getTokenCache();
  return typeof cache.serialize === 'function' ? cache.serialize() : undefined;
}

export function createTenantTokenHandler(config: TenantTokenHandlerConfig) {
  const { pkceStore, tenantPool, redis, pgPool } = config;

  const emitTokenAudit = (
    tenantId: string,
    result: 'success' | 'failure',
    meta: Record<string, unknown>,
    req: Request
  ): void => {
    if (!pgPool) return;
    void (async () => {
      const { writeAuditStandalone } = await import('../audit.js');
      const reqId =
        (req as Request & { id?: string }).id ?? getRequestTokens()?.requestId ?? 'no-req-id';
      await writeAuditStandalone(pgPool, {
        tenantId,
        actor: 'unauthenticated',
        action: 'oauth.token.exchange',
        target: null,
        ip: req.ip ?? null,
        requestId: reqId,
        result,
        meta,
      });
    })();
  };

  return async (req: Request, res: Response): Promise<void> => {
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(500).json({ error: 'loadTenant_missing' });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const clientVerifier = String(body?.code_verifier ?? '');
    if (!clientVerifier) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_request', reason: 'code_verifier required' },
        req
      );
      res
        .status(400)
        .json({ error: 'invalid_request', error_description: 'code_verifier required' });
      return;
    }
    if (typeof body?.code !== 'string' || body.code.length === 0) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_request', reason: 'code required' },
        req
      );
      res.status(400).json({ error: 'invalid_request', error_description: 'code required' });
      return;
    }

    const clientCodeChallenge = crypto
      .createHash('sha256')
      .update(clientVerifier)
      .digest('base64url');
    const entry = await pkceStore.takeByChallenge(tenant.id, clientCodeChallenge);
    if (!entry) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_grant', reason: 'PKCE mismatch' },
        req
      );
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE mismatch' });
      return;
    }

    try {
      const msal = await tenantPool.acquire(tenant);
      if (!isDelegatedMsalClient(msal)) {
        emitTokenAudit(tenant.id, 'failure', { error: 'delegated_requires_client_with_code' }, req);
        res.status(500).json({ error: 'delegated_requires_client_with_code' });
        return;
      }

      const scopes = tenant.allowed_scopes.length ? tenant.allowed_scopes : ['User.Read'];
      const result = await msal.acquireTokenByCode({
        code: String(body?.code ?? ''),
        scopes,
        redirectUri: entry.redirectUri,
        codeVerifier: entry.serverCodeVerifier,
      });

      if (!result?.accessToken) {
        emitTokenAudit(tenant.id, 'failure', { error: 'token_exchange_failed' }, req);
        res.status(502).json({ error: 'token_exchange_failed' });
        return;
      }

      const refreshTokenFromAuthority = (result as { refreshToken?: string }).refreshToken;
      try {
        const dek = tenantPool.getDekForTenant(tenant.id);
        const { SessionStore } = await import('../session-store.js');
        const sessionStore = new SessionStore(redis, dek);
        await sessionStore.put(tenant.id, result.accessToken, {
          tenantId: tenant.id,
          refreshToken: refreshTokenFromAuthority,
          accountHomeId: result.account?.homeAccountId,
          msalCache: serializeMsalCache(msal),
          graphAccessToken: result.accessToken,
          graphAccessTokenExpiresOn: result.expiresOn?.toISOString(),
          clientId: tenant.client_id,
          scopes,
          ownerSubject: result.account?.homeAccountId ?? result.account?.username,
          createdAt: Date.now(),
        });
      } catch (sessionErr) {
        logger.error(
          { tenantId: tenant.id, err: (sessionErr as Error).message },
          'SessionStore put failed; refusing unusable delegated token'
        );
        emitTokenAudit(tenant.id, 'failure', { error: 'delegated_session_store_failed' }, req);
        res.status(502).json({ error: 'delegated_session_store_failed' });
        return;
      }

      const expiresIn = delegatedAccessTokenTtlSeconds();

      try {
        await rememberDelegatedAccessToken({
          redis,
          tenantId: tenant.id,
          accessToken: result.accessToken,
          expiresOn: result.expiresOn,
        });
      } catch (markerErr) {
        logger.error(
          { err: (markerErr as Error).message, tenantId: tenant.id },
          'delegated access marker write failed'
        );
        emitTokenAudit(tenant.id, 'failure', { error: 'delegated_access_store_failed' }, req);
        res.status(502).json({ error: 'delegated_access_store_failed' });
        return;
      }

      emitTokenAudit(tenant.id, 'success', { clientId: tenant.client_id, scopes }, req);

      res.json({
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
      });
    } catch (err) {
      logger.error({ err: (err as Error).message, tenantId: tenant.id }, '/token exchange failed');
      emitTokenAudit(tenant.id, 'failure', { error: 'token_exchange_failed' }, req);
      res.status(400).json({ error: 'token_exchange_failed' });
    }
  };
}

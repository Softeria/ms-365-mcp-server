import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import crypto from 'node:crypto';
import logger from '../../logger.js';
import { getCloudEndpoints } from '../../cloud-config.js';
import { getRequestTokens } from '../../request-context.js';
import { isSameAuthorizeRequest } from './authorize-request-identity.js';
import { validateRedirectUriSafety } from '../redirect-uri.js';
import { tenantScopeSatisfies } from '../scope-satisfaction.js';
import {
  getActiveOAuthClientRegistration,
  hashOpaqueValue,
  hasExactRedirectUri,
  isOAuthClientStoreAvailable,
  touchOAuthClientRegistration,
} from './client-store.js';
import {
  delegatedAccessTokenTtlSeconds,
  forgetDelegatedAccessToken,
  rememberDelegatedAccessToken,
} from '../delegated-access-tokens.js';
import { hashAccessToken, SessionStore } from '../session-store.js';
import {
  acquireGatewayRefreshRotationLock,
  lookupGatewayRefreshSession,
  mintGatewayRefreshToken,
  releaseGatewayRefreshRotationLock,
  revokeGatewayRefreshToken,
  startGatewayRefreshRotationLockHeartbeat,
  storeGatewayRefreshToken,
} from './refresh-handles.js';
import type { RedisClient } from '../redis.js';
import type { PkceEntry, PkceStore } from '../pkce-store/pkce-store.js';
import type { TenantRow } from '../tenant/tenant-row.js';
import type { TenantPool } from '../tenant/tenant-pool.js';

export interface AuthorizeHandlerConfig {
  pkceStore: PkceStore;
  pgPool?: Pool;
  publicUrlHost?: string | null;
  extraAllowedHosts?: readonly string[];
}

export interface TenantTokenHandlerConfig {
  pkceStore: PkceStore;
  tenantPool: Pick<TenantPool, 'acquire' | 'getDekForTenant'>;
  redis: RedisClient;
  pgPool?: Pool;
}

function pkceChallengeForVerifier(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

const STANDARD_OAUTH_PROTOCOL_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);

function isStandardOAuthProtocolScope(scope: string): boolean {
  return STANDARD_OAUTH_PROTOCOL_SCOPES.has(scope);
}

function tenantDefaultScopes(tenant: Pick<TenantRow, 'allowed_scopes'>): string[] {
  return tenant.allowed_scopes.length ? [...tenant.allowed_scopes] : ['User.Read'];
}

function scopesAllowedByTenant(
  tenant: Pick<TenantRow, 'allowed_scopes'>,
  scopes: readonly string[]
): boolean {
  const allowedScopes = tenantDefaultScopes(tenant);
  return scopes.every(
    (scope) => isStandardOAuthProtocolScope(scope) || tenantScopeSatisfies(allowedScopes, scope)
  );
}

function uniqScopes(scopes: readonly string[]): string[] {
  return [...new Set(scopes)];
}

function resolveTenantAuthorizeScopes(
  tenant: Pick<TenantRow, 'allowed_scopes'>,
  requestedScopes: readonly string[]
): { graphScopes: string[]; protocolScopes: string[]; disallowedScopes: string[] } {
  const allowedScopes = tenantDefaultScopes(tenant);
  const protocolScopes = requestedScopes.filter(isStandardOAuthProtocolScope);
  const requestedGraphScopes = requestedScopes.filter(
    (scope) => !isStandardOAuthProtocolScope(scope)
  );
  const graphScopes = requestedScopes.length === 0 ? allowedScopes : requestedGraphScopes;
  const disallowedScopes = graphScopes.filter(
    (scope) => !tenantScopeSatisfies(allowedScopes, scope)
  );
  return {
    graphScopes: uniqScopes(graphScopes),
    protocolScopes: uniqScopes(protocolScopes),
    disallowedScopes,
  };
}

interface DynamicClientAuthorizeDecision {
  allowed: boolean;
  refreshEnabled: boolean;
}

async function dynamicClientAuthorizeDecision(
  pgPool: Pool,
  tenant: Pick<TenantRow, 'id'>,
  clientId: string,
  redirectUri: string
): Promise<DynamicClientAuthorizeDecision> {
  if (!(await isOAuthClientStoreAvailable(pgPool))) {
    return { allowed: false, refreshEnabled: false };
  }
  const registration = await getActiveOAuthClientRegistration(pgPool, tenant.id, clientId);
  const allowed = Boolean(
    registration &&
    hasExactRedirectUri(registration, redirectUri) &&
    registration.grantTypes.includes('authorization_code') &&
    registration.responseTypes.includes('code')
  );
  if (allowed) {
    await touchOAuthClientRegistration(pgPool, tenant.id, clientId);
  }
  return { allowed, refreshEnabled: Boolean(registration?.grantTypes.includes('refresh_token')) };
}

export function createAuthorizeHandler(config: AuthorizeHandlerConfig) {
  const { pkceStore, pgPool } = config;

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
    if (typeof req.query.client_id !== 'string' || req.query.client_id.trim().length === 0) {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'invalid_request' }, req);
      res.status(400).json({ error: 'invalid_request', error_description: 'client_id required' });
      return;
    }
    const clientId = req.query.client_id;
    const allowedByStaticClient =
      clientId === tenant.client_id && tenant.redirect_uri_allowlist.includes(redirectUri);
    {
      const safetyCheck = validateRedirectUriSafety(redirectUri);
      if (!safetyCheck.ok) {
        emitAudit(
          tenant.id,
          'failure',
          redirectUri,
          { error: 'invalid_redirect_uri', reason: safetyCheck.reason },
          req
        );
        res.status(400).json({ error: 'invalid_redirect_uri', reason: safetyCheck.reason });
        return;
      }
    }
    let allowedByDynamicClient = false;
    let dynamicRefreshEnabled = false;
    if (!allowedByStaticClient && pgPool) {
      const dynamicDecision = await dynamicClientAuthorizeDecision(
        pgPool,
        tenant,
        clientId,
        redirectUri
      );
      allowedByDynamicClient = dynamicDecision.allowed;
      dynamicRefreshEnabled = dynamicDecision.refreshEnabled;
    }
    if (!allowedByStaticClient && !allowedByDynamicClient) {
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
    if (clientCodeChallengeMethod !== 'S256') {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'invalid_code_challenge_method' }, req);
      res.status(400).json({ error: 'invalid_code_challenge_method' });
      return;
    }
    const state = String(req.query.state ?? crypto.randomBytes(16).toString('base64url'));
    const tenantKey = tenant.id;

    const requestedScopes = String(req.query.scope ?? '')
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
    const { graphScopes, protocolScopes, disallowedScopes } = resolveTenantAuthorizeScopes(
      tenant,
      requestedScopes
    );
    const issueGatewayRefreshToken = allowedByStaticClient || dynamicRefreshEnabled;
    if (!issueGatewayRefreshToken && protocolScopes.includes('offline_access')) {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'invalid_scope' }, req);
      res.status(400).json({ error: 'invalid_scope' });
      return;
    }
    const upstreamScopes = uniqScopes([
      ...protocolScopes.filter((scope) => scope !== 'offline_access'),
      ...graphScopes,
      ...(issueGatewayRefreshToken ? ['offline_access'] : []),
    ]);
    if (disallowedScopes.length > 0) {
      emitAudit(tenant.id, 'failure', redirectUri, { error: 'invalid_scope' }, req);
      res.status(400).json({ error: 'invalid_scope' });
      return;
    }

    const serverCodeVerifier = crypto.randomBytes(32).toString('base64url');
    let serverChallenge = pkceChallengeForVerifier(serverCodeVerifier);
    const pkceEntry: PkceEntry = {
      state,
      clientCodeChallenge,
      clientCodeChallengeMethod,
      serverCodeVerifier,
      clientId,
      redirectUri,
      tenantId: tenantKey,
      scopes: graphScopes,
      tokenScopes: upstreamScopes,
      createdAt: Date.now(),
    };

    const ok = await pkceStore.put(tenantKey, pkceEntry);
    if (!ok) {
      const existing = await pkceStore.getByChallenge(tenantKey, clientCodeChallenge);
      if (existing && isSameAuthorizeRequest(existing, pkceEntry)) {
        serverChallenge = pkceChallengeForVerifier(existing.serverCodeVerifier);
        logger.info(
          {
            tenantId: tenant.id,
            state: state.substring(0, 8) + '...',
            challengePrefix: clientCodeChallenge.substring(0, 8) + '...',
          },
          'Two-leg PKCE: reused existing challenge for duplicate authorize retry'
        );
      } else {
        emitAudit(tenant.id, 'failure', redirectUri, { error: 'pkce_challenge_collision' }, req);
        res.status(400).json({
          error: 'pkce_challenge_collision',
          error_description:
            'An outstanding authorization request already uses this code_challenge; regenerate and retry.',
        });
        return;
      }
    }

    const cloudEndpoints = getCloudEndpoints(tenant.cloud_type);
    const azureTenant = tenant.tenant_id || 'common';
    const authorizeUrl = new URL(
      `${cloudEndpoints.authority}/${azureTenant}/oauth2/v2.0/authorize`
    );
    authorizeUrl.searchParams.set('client_id', tenant.client_id);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', upstreamScopes.join(' '));
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
        clientId,
        clientSource: allowedByStaticClient ? 'static' : 'dynamic',
        scopes: graphScopes,
      },
      req
    );
    res.redirect(authorizeUrl.toString());
  };
}

interface RefreshResult {
  accessToken?: string;
  refreshToken?: string;
  expiresOn?: Date | null;
  account?: { homeAccountId?: string; username?: string } | null;
}

interface RefreshMsalClient {
  acquireTokenByRefreshToken: (config: {
    refreshToken: string;
    scopes: string[];
  }) => Promise<RefreshResult | null>;
}

interface SilentMsalClient {
  acquireTokenSilent: (config: {
    account: unknown;
    scopes: string[];
    forceRefresh?: boolean;
  }) => Promise<RefreshResult | null>;
  getTokenCache: () => {
    getAccountByHomeId: (homeAccountId: string) => Promise<unknown | null>;
    deserialize?: (cache: string) => void;
    serialize?: () => string;
  };
}

interface DelegatedMsalClient {
  acquireTokenByCode: (config: {
    code: string;
    scopes: string[];
    redirectUri: string;
    codeVerifier: string;
  }) => Promise<RefreshResult | null>;
}

function isRefreshMsalClient(client: unknown): client is RefreshMsalClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'acquireTokenByRefreshToken' in client &&
    typeof (client as { acquireTokenByRefreshToken: unknown }).acquireTokenByRefreshToken ===
      'function'
  );
}

function isDelegatedMsalClient(client: unknown): client is DelegatedMsalClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'acquireTokenByCode' in client &&
    typeof (client as { acquireTokenByCode: unknown }).acquireTokenByCode === 'function'
  );
}

function isSilentMsalClient(client: unknown): client is SilentMsalClient {
  return (
    typeof client === 'object' &&
    client !== null &&
    'acquireTokenSilent' in client &&
    typeof (client as { acquireTokenSilent: unknown }).acquireTokenSilent === 'function' &&
    'getTokenCache' in client &&
    typeof (client as { getTokenCache: unknown }).getTokenCache === 'function'
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

async function refreshDelegatedSession(
  msal: unknown,
  record: {
    refreshToken?: string;
    accountHomeId?: string;
    msalCache?: string;
    scopes: string[];
    tokenScopes?: string[];
  }
): Promise<RefreshResult | null> {
  const tokenScopes = record.tokenScopes ?? record.scopes;
  if (record.refreshToken && isRefreshMsalClient(msal)) {
    return await msal.acquireTokenByRefreshToken({
      refreshToken: record.refreshToken,
      scopes: tokenScopes,
    });
  }

  if (record.accountHomeId && isSilentMsalClient(msal)) {
    const tokenCache = msal.getTokenCache();
    if (record.msalCache && typeof tokenCache.deserialize === 'function') {
      tokenCache.deserialize(record.msalCache);
    }
    const account = await tokenCache.getAccountByHomeId(record.accountHomeId);
    if (!account) return null;
    return await msal.acquireTokenSilent({
      account,
      scopes: tokenScopes,
      forceRefresh: true,
    });
  }

  return null;
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
    if (typeof body?.grant_type !== 'string' || body.grant_type.trim().length === 0) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_request', reason: 'grant_type required' },
        req
      );
      res.status(400).json({ error: 'invalid_request', error_description: 'grant_type required' });
      return;
    }
    const grantType = body.grant_type;
    if (grantType !== 'authorization_code' && grantType !== 'refresh_token') {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'unsupported_grant_type', grant_type: grantType },
        req
      );
      res.status(400).json({ error: 'unsupported_grant_type' });
      return;
    }
    if (grantType === 'refresh_token') {
      const submittedRefreshToken = String(body?.refresh_token ?? '');
      const refreshAuditMeta = (error?: string, extra: Record<string, unknown> = {}) => ({
        grant_type: 'refresh_token',
        ...(error ? { error } : {}),
        ...extra,
      });
      if (!submittedRefreshToken) {
        emitTokenAudit(tenant.id, 'failure', refreshAuditMeta('invalid_request'), req);
        res
          .status(400)
          .json({ error: 'invalid_request', error_description: 'refresh_token required' });
        return;
      }
      try {
        const dek = tenantPool.getDekForTenant(tenant.id);
        const sessionStore = new SessionStore(redis, dek);
        const session = await lookupGatewayRefreshSession({
          redis,
          sessionStore,
          tenantId: tenant.id,
          refreshToken: submittedRefreshToken,
        });
        if (!session) {
          emitTokenAudit(tenant.id, 'failure', refreshAuditMeta('invalid_grant'), req);
          res.status(400).json({ error: 'invalid_grant' });
          return;
        }

        const submittedClientId = String(body?.client_id ?? '');
        const clientIdHash = submittedClientId
          ? hashOpaqueValue(submittedClientId).slice(0, 16)
          : undefined;
        if (!submittedClientId || submittedClientId !== session.record.clientId) {
          emitTokenAudit(
            tenant.id,
            'failure',
            refreshAuditMeta('invalid_grant', { reason: 'client_mismatch', clientIdHash }),
            req
          );
          res.status(400).json({ error: 'invalid_grant' });
          return;
        }
        if (submittedClientId !== tenant.client_id) {
          if (!pgPool) {
            emitTokenAudit(
              tenant.id,
              'failure',
              refreshAuditMeta('invalid_grant', {
                reason: 'dynamic_store_unavailable',
                clientIdHash,
              }),
              req
            );
            res.status(400).json({ error: 'invalid_grant' });
            return;
          }
          const registration = await getActiveOAuthClientRegistration(
            pgPool,
            tenant.id,
            submittedClientId
          );
          if (!registration || !registration.grantTypes.includes('refresh_token')) {
            emitTokenAudit(
              tenant.id,
              'failure',
              refreshAuditMeta('invalid_grant', { reason: 'grant_not_allowed', clientIdHash }),
              req
            );
            res.status(400).json({ error: 'invalid_grant' });
            return;
          }
        }

        if (!scopesAllowedByTenant(tenant, session.record.scopes)) {
          emitTokenAudit(
            tenant.id,
            'failure',
            refreshAuditMeta('invalid_grant', { reason: 'scope_revoked', clientIdHash }),
            req
          );
          res.status(400).json({ error: 'invalid_grant' });
          return;
        }

        const rotationLockId = crypto.randomUUID();
        const rotationLockAcquired = await acquireGatewayRefreshRotationLock({
          redis,
          tenantId: tenant.id,
          refreshToken: submittedRefreshToken,
          lockId: rotationLockId,
        });
        if (!rotationLockAcquired) {
          emitTokenAudit(
            tenant.id,
            'failure',
            refreshAuditMeta('temporarily_unavailable', {
              reason: 'rotation_in_progress',
              clientIdHash,
            }),
            req
          );
          res.status(503).json({ error: 'temporarily_unavailable' });
          return;
        }

        const stopRotationLockHeartbeat = startGatewayRefreshRotationLockHeartbeat({
          redis,
          tenantId: tenant.id,
          refreshToken: submittedRefreshToken,
          lockId: rotationLockId,
        });

        try {
          const lockedSession = await lookupGatewayRefreshSession({
            redis,
            sessionStore,
            tenantId: tenant.id,
            refreshToken: submittedRefreshToken,
          });
          if (!lockedSession || lockedSession.accessTokenHash !== session.accessTokenHash) {
            emitTokenAudit(
              tenant.id,
              'failure',
              refreshAuditMeta('invalid_grant', {
                reason: 'refresh_handle_rotated',
                clientIdHash,
              }),
              req
            );
            res.status(400).json({ error: 'invalid_grant' });
            return;
          }

          const msal = await tenantPool.acquire(tenant);
          const fresh = await refreshDelegatedSession(msal, lockedSession.record);
          if (!fresh?.accessToken) {
            emitTokenAudit(
              tenant.id,
              'failure',
              refreshAuditMeta('invalid_grant', {
                reason: 'upstream_refresh_failed',
                clientIdHash,
              }),
              req
            );
            res.status(400).json({ error: 'invalid_grant' });
            return;
          }

          const oldGraphAccessToken = lockedSession.record.graphAccessToken;
          if (!oldGraphAccessToken) {
            emitTokenAudit(
              tenant.id,
              'failure',
              refreshAuditMeta('invalid_grant', {
                reason: 'missing_session_access_token',
                clientIdHash,
              }),
              req
            );
            res.status(400).json({ error: 'invalid_grant' });
            return;
          }

          const nextMsalCache = serializeMsalCache(msal) ?? lockedSession.record.msalCache;
          await sessionStore.put(tenant.id, fresh.accessToken, {
            ...lockedSession.record,
            refreshToken: fresh.refreshToken ?? lockedSession.record.refreshToken,
            accountHomeId: fresh.account?.homeAccountId ?? lockedSession.record.accountHomeId,
            msalCache: nextMsalCache,
            graphAccessToken: fresh.accessToken,
            graphAccessTokenExpiresOn: fresh.expiresOn?.toISOString(),
            createdAt: Date.now(),
          });
          const nextRefreshToken = mintGatewayRefreshToken();
          await storeGatewayRefreshToken({
            redis,
            tenantId: tenant.id,
            refreshToken: nextRefreshToken,
            accessToken: fresh.accessToken,
          });
          await rememberDelegatedAccessToken({
            redis,
            tenantId: tenant.id,
            accessToken: fresh.accessToken,
            expiresOn: fresh.expiresOn,
          });
          await revokeGatewayRefreshToken({
            redis,
            tenantId: tenant.id,
            refreshToken: submittedRefreshToken,
          });
          try {
            const freshAccessTokenHash = hashAccessToken(fresh.accessToken);
            if (lockedSession.accessTokenHash !== freshAccessTokenHash) {
              await sessionStore.deleteByAccessTokenHash(tenant.id, lockedSession.accessTokenHash);
            }
            if (oldGraphAccessToken !== fresh.accessToken) {
              await forgetDelegatedAccessToken({
                redis,
                tenantId: tenant.id,
                accessToken: oldGraphAccessToken,
              });
            }
          } catch (cleanupErr) {
            logger.warn(
              { err: (cleanupErr as Error).message, tenantId: tenant.id },
              'old delegated refresh session cleanup failed after durable rotation'
            );
          }
          emitTokenAudit(
            tenant.id,
            'success',
            refreshAuditMeta(undefined, { clientIdHash, scopes: lockedSession.record.scopes }),
            req
          );
          res.json({
            access_token: fresh.accessToken,
            token_type: 'Bearer',
            expires_in: delegatedAccessTokenTtlSeconds(),
            refresh_token: nextRefreshToken,
          });
        } finally {
          stopRotationLockHeartbeat();
          try {
            await releaseGatewayRefreshRotationLock({
              redis,
              tenantId: tenant.id,
              refreshToken: submittedRefreshToken,
              lockId: rotationLockId,
            });
          } catch (releaseErr) {
            logger.warn(
              { err: (releaseErr as Error).message, tenantId: tenant.id },
              'delegated refresh rotation lock release failed'
            );
          }
        }
      } catch (err) {
        logger.error({ err: (err as Error).message, tenantId: tenant.id }, '/token refresh failed');
        emitTokenAudit(tenant.id, 'failure', refreshAuditMeta('temporarily_unavailable'), req);
        if (!res.headersSent) {
          res.status(503).json({ error: 'temporarily_unavailable' });
        }
      }
      return;
    }

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

    if (typeof body?.client_id !== 'string' || body.client_id.trim().length === 0) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_request', reason: 'client_id required' },
        req
      );
      res.status(400).json({ error: 'invalid_request', error_description: 'client_id required' });
      return;
    }
    if (typeof body?.redirect_uri !== 'string' || body.redirect_uri.trim().length === 0) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_request', reason: 'redirect_uri required' },
        req
      );
      res
        .status(400)
        .json({ error: 'invalid_request', error_description: 'redirect_uri required' });
      return;
    }

    const submittedClientId = body.client_id;
    const submittedRedirectUri = body.redirect_uri;
    const entry = await pkceStore.getByChallenge(tenant.id, clientCodeChallenge);
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
    if (
      entry.tenantId !== tenant.id ||
      entry.clientId !== submittedClientId ||
      entry.redirectUri !== submittedRedirectUri ||
      entry.clientCodeChallengeMethod !== 'S256'
    ) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_grant', reason: 'binding mismatch' },
        req
      );
      res.status(400).json({ error: 'invalid_grant', error_description: 'binding mismatch' });
      return;
    }
    const consumedEntry = await pkceStore.takeByChallenge(tenant.id, clientCodeChallenge);
    if (!consumedEntry) {
      emitTokenAudit(
        tenant.id,
        'failure',
        { error: 'invalid_grant', reason: 'PKCE mismatch' },
        req
      );
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE mismatch' });
      return;
    }

    let issueGatewayRefreshToken = submittedClientId === tenant.client_id;
    if (!issueGatewayRefreshToken && pgPool) {
      const registration = await getActiveOAuthClientRegistration(
        pgPool,
        tenant.id,
        submittedClientId
      );
      issueGatewayRefreshToken = Boolean(registration?.grantTypes.includes('refresh_token'));
    }

    try {
      const msal = await tenantPool.acquire(tenant);
      if (!isDelegatedMsalClient(msal)) {
        emitTokenAudit(tenant.id, 'failure', { error: 'delegated_requires_client_with_code' }, req);
        res.status(500).json({ error: 'delegated_requires_client_with_code' });
        return;
      }

      const scopes = entry.scopes ?? ['User.Read'];
      const tokenScopes = entry.tokenScopes ?? scopes;
      if (!scopesAllowedByTenant(tenant, scopes)) {
        emitTokenAudit(
          tenant.id,
          'failure',
          { error: 'invalid_grant', reason: 'scope_revoked' },
          req
        );
        res.status(400).json({ error: 'invalid_grant' });
        return;
      }
      const result = await msal.acquireTokenByCode({
        code: String(body?.code ?? ''),
        scopes: tokenScopes,
        redirectUri: entry.redirectUri,
        codeVerifier: entry.serverCodeVerifier,
      });

      if (!result?.accessToken) {
        emitTokenAudit(tenant.id, 'failure', { error: 'token_exchange_failed' }, req);
        res.status(502).json({ error: 'token_exchange_failed' });
        return;
      }

      const refreshTokenFromAuthority = (result as { refreshToken?: string }).refreshToken;
      const gatewayRefreshToken = issueGatewayRefreshToken ? mintGatewayRefreshToken() : undefined;
      try {
        const dek = tenantPool.getDekForTenant(tenant.id);
        const sessionStore = new SessionStore(redis, dek);
        await sessionStore.put(tenant.id, result.accessToken, {
          tenantId: tenant.id,
          refreshToken: issueGatewayRefreshToken ? refreshTokenFromAuthority : undefined,
          accountHomeId: result.account?.homeAccountId,
          msalCache: serializeMsalCache(msal),
          graphAccessToken: result.accessToken,
          graphAccessTokenExpiresOn: result.expiresOn?.toISOString(),
          clientId: submittedClientId,
          scopes,
          tokenScopes,
          ownerSubject: result.account?.homeAccountId ?? result.account?.username,
          createdAt: Date.now(),
        });
        if (gatewayRefreshToken) {
          await storeGatewayRefreshToken({
            redis,
            tenantId: tenant.id,
            refreshToken: gatewayRefreshToken,
            accessToken: result.accessToken,
          });
        }
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

      emitTokenAudit(tenant.id, 'success', { clientId: submittedClientId, scopes }, req);

      res.json({
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        ...(gatewayRefreshToken ? { refresh_token: gatewayRefreshToken } : {}),
      });
    } catch (err) {
      logger.error({ err: (err as Error).message, tenantId: tenant.id }, '/token exchange failed');
      emitTokenAudit(tenant.id, 'failure', { error: 'token_exchange_failed' }, req);
      res.status(400).json({ error: 'token_exchange_failed' });
    }
  };
}

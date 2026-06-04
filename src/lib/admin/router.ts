/**
 * Admin sub-router factory (plan 04-01, ADMIN-01..06).
 *
 * Mounts at `/admin` in src/server.ts BEFORE `/t/:tenantId` so admin paths
 * never route through loadTenant (which would 404 on 'admin' failing the GUID
 * regex — see T-04-03c).
 *
 * Middleware order:
 *   1. TLS enforce (T-04-01)
 *   2. Admin CORS (separate env MS365_MCP_ADMIN_ORIGINS; T-04-03)
 *   3. Admin route rate limit (before health, auth, and database work)
 *   4. GET /health (auth bypass — smoke probe only)
 *   5. Dual-stack admin auth (plan 04-04, X-Admin-Api-Key > Bearer)
 *   6. Sub-routes (04-02 /tenants + 04-03 /api-keys + 04-05 /audit mounted)
 *
 * The factory captures deps in a closure so callers get a single Express
 * Router handle to hand to `app.use('/admin', router)`. Per plan 04-01,
 * deps are validated eagerly — a missing Entra admin app reg is a
 * configuration error, not a request-time surprise.
 *
 * Per D-01 redaction: this router does NOT log Authorization or
 * X-Admin-Api-Key headers. CORS middleware never logs. Request bodies are
 * unseen at this layer.
 */
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express';
import expressRateLimit from 'express-rate-limit';
import type { Pool } from 'pg';
import type { RedisClient } from '../redis.js';
import type { TenantPool } from '../tenant/tenant-pool.js';
import type { BearerTokenVerifier } from '../microsoft-auth.js';
import type { fetchConsentedGraphDelegatedScopes } from './scope-sync.js';
import { createAdminTlsEnforceMiddleware } from './tls-enforce.js';
import { createApiKeyRoutes, subscribeToApiKeyRevoke } from './api-keys.js';
import { createTenantsRoutes } from './tenants.js';
import { createEnabledToolsRoutes } from './enabled-tools.js';
import { createAuditRoutes } from './audit.js';
import { createMemoryRoutes } from './memory.js';
import { createAdminAuthMiddleware } from './auth/dual-stack.js';
import logger from '../../logger.js';

/**
 * Dependency bag. Factory-with-DI shape matches src/lib/tenant/load-tenant.ts:
 * no import-time globals, all runtime state injected.
 */
export interface AdminRouterDeps {
  pgPool: Pool;
  redis: RedisClient;
  tenantPool: TenantPool;
  kek: Buffer;
  adminOrigins: string[];
  entraConfig: {
    appClientId: string;
    groupId: string;
  };
  /** 32-byte HMAC secret for pagination cursors. Rotated per-process. */
  cursorSecret: Buffer;
  /** Optional override for deterministic tenant allowed_scopes sync tests. */
  scopeSyncFetcher?: typeof fetchConsentedGraphDelegatedScopes;
  /** Optional fetch impl for deterministic Entra admin auth tests. */
  fetchImpl?: typeof fetch;
  /** Optional JWT verifier override for deterministic Entra admin auth tests. */
  verifyToken?: BearerTokenVerifier;
}

/**
 * Split MS365_MCP_ADMIN_ORIGINS on commas, trim, drop empty entries.
 *
 * Empty env → empty array → CORS middleware rejects every Origin.
 * Deny-by-default matches D-14 ("admin CORS separate from per-tenant CORS;
 * default deny-all").
 */
export function parseAdminOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function createAdminRouteRateLimit(): RequestHandler {
  const rawLimit = process.env.MS365_MCP_ADMIN_ROUTE_RATE_LIMIT_PER_MIN;
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 600;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 600;

  return expressRateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      type: 'https://ms365mcp.local/problems/rate_limited',
      title: 'Rate limited',
      status: 429,
      detail: 'too many admin requests',
    },
  }) as unknown as RequestHandler;
}

// ── CORS ────────────────────────────────────────────────────────────────────

const ADMIN_ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
// X-Admin-Api-Key is the header the dual-stack auth (plan 04-04) reads for
// API-key mode; it MUST be in Access-Control-Allow-Headers so browser callers
// can present it. Authorization covers the Entra OAuth path.
const ADMIN_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Admin-Api-Key, If-Match';

/**
 * Admin-scoped CORS middleware — closure over the allowlist passed at
 * construction time. Mirrors src/lib/cors.ts:createCorsMiddleware shape but
 * ships here to keep admin-specific concerns (additional headers, stricter
 * defaults) localized.
 *
 * Semantics:
 *   - Origin absent: OPTIONS → 204 (no preflight needed); else next().
 *   - Origin present and allowlisted: set ACAO + ACAM + ACAH + ACAC;
 *     OPTIONS → 204; else next().
 *   - Origin present but NOT allowlisted: OPTIONS → 403 (loud signal to
 *     operator); else next() without ACAO (browser blocks in that case).
 *
 * Does NOT log — CORS policy decisions are routine and would flood logs.
 */
function createAdminCorsMiddleware({ allowlist }: { allowlist: string[] }): RequestHandler {
  const allowSet = new Set(allowlist);

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (!origin || typeof origin !== 'string') {
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
      return;
    }

    const isAllowed = allowSet.has(origin);

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', ADMIN_ALLOWED_METHODS);
      res.header('Access-Control-Allow-Headers', ADMIN_ALLOWED_HEADERS);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      // Always emit Vary so browser caches do not serve a denied response for
      // a later allowed origin.
      res.header('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      // 403 on denied origin is a hard signal to operators that the allowlist
      // needs updating — silently 200-ing without ACAO produces inscrutable
      // browser errors.
      res.sendStatus(isAllowed ? 204 : 403);
      return;
    }

    next();
  };
}

// ── Router factory ──────────────────────────────────────────────────────────

/**
 * Build the admin sub-router. Throws if deps are incomplete.
 */
export function createAdminRouter(deps: AdminRouterDeps): Router {
  if (!deps.entraConfig?.appClientId) {
    throw new Error('createAdminRouter: entraConfig.appClientId is required');
  }
  if (!deps.entraConfig.groupId) {
    throw new Error('createAdminRouter: entraConfig.groupId is required');
  }

  const r = Router();

  // 1. TLS gate — fails fast before any other work happens.
  r.use(createAdminTlsEnforceMiddleware());

  // 2. Admin-scoped CORS — separate allowlist from per-tenant CORS.
  r.use(createAdminCorsMiddleware({ allowlist: deps.adminOrigins }));

  // 3. Coarse admin route limiter — gates /health, auth, and every mounted
  //    admin sub-router before authorization or database work happens.
  r.use(createAdminRouteRateLimit());

  // 4. /health — auth bypass ONLY for this path. A smoke probe for bootstrap
  //    and reverse-proxy health checks. Returns plain text so there is zero
  //    JSON ambiguity; the caller just asserts status 200 + body text.
  //    NOTE: this is the ONLY admin route that bypasses auth. All other
  //    handlers added in later plans (04-02..04-05) go through
  //    createAdminAuthMiddleware first.
  // codeql[js/missing-rate-limiting]: createAdminRouteRateLimit gates this route before the handler.
  r.get('/health', (_req, res) => {
    res.type('text/plain').status(200).send('admin-router-alive');
  });

  // 5. Dual-stack admin auth (plan 04-04): X-Admin-Api-Key header first,
  //    Authorization: Bearer (Entra) second, neither → 401 problem+json.
  //    Mounted AFTER /health so the liveness probe bypasses auth, BEFORE
  //    sub-routes so every /admin/tenants + /admin/api-keys + /admin/audit
  //    handler sees req.admin populated with {actor, source, tenantScoped}.
  r.use(createAdminAuthMiddleware(deps));

  r.use('/tenants', createTenantsRoutes(deps));
  // Mount plan 05-07 PATCH /:id/enabled-tools on the SAME /tenants base.
  // Express composes by pattern+method, so the longer-suffix match here
  // (PATCH /:id/enabled-tools) wins over the broader PATCH /:id in
  // createTenantsRoutes. Appending after keeps the existing tenants
  // sub-router behaviour intact.
  r.use('/tenants', createEnabledToolsRoutes(deps));
  r.use('/tenants', createMemoryRoutes(deps));
  r.use('/api-keys', createApiKeyRoutes(deps));
  r.use('/audit', createAuditRoutes(deps));

  // Kick off the pub/sub subscriber for cross-replica API-key revocation
  // propagation (04-03, D-15). Must run on a DUPLICATED ioredis connection —
  // ioredis forbids regular commands on a subscriber-mode client, and the
  // rate-limit middleware's sliding-window EVALSHA shares deps.redis with
  // the commander. Passing deps.redis directly here put it into subscriber
  // mode → every /t/:tenantId/mcp tool call threw 503 rate_limit_error.
  // Fire-and-forget: subscription failure does not block router mount — the
  // 60s in-process LRU TTL is the fallback.
  const apiKeyRevokeSubscriber =
    'duplicate' in deps.redis &&
    typeof (deps.redis as { duplicate: unknown }).duplicate === 'function'
      ? (deps.redis as { duplicate: () => typeof deps.redis }).duplicate()
      : deps.redis;
  void subscribeToApiKeyRevoke(apiKeyRevokeSubscriber).catch((err) => {
    logger.error({ err: (err as Error).message }, 'admin: api-key revoke subscription failed');
  });

  return r;
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ExpressStreamableHTTPServerTransport } from './lib/transports/express-streamable-http-transport.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import express, { type Request, type Response, type RequestHandler } from 'express';
import expressRateLimit from 'express-rate-limit';
import logger, { enableConsoleLogging, rawPinoLogger } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools, registerDiscoveryTools } from './graph-tools.js';
import { registerMemoryTools } from './lib/memory/tools.js';
import { registerMcpResources } from './lib/mcp-resources/register.js';
import { registerMcpPrompts, type RegisterMcpPromptsDeps } from './lib/mcp-prompts/register.js';
import type { PromptTemplateDefinition } from './lib/mcp-prompts/frontmatter.js';
import { registerSkillTools } from './lib/mcp-skills/tools.js';
import { listVisibleSkills } from './lib/mcp-skills/store.js';
import { registerMcpApps } from './lib/mcp-apps/register.js';
import { registerMcpCompletions } from './lib/mcp-completions/register.js';
import { registerMcpLogging } from './lib/mcp-logging/register.js';
import { buildEffectiveCapabilityProfile } from './lib/mcp-capabilities/profile.js';
import { registerDashboardTools } from './lib/mcp-dashboards/tools.js';
import {
  mcpSessionRegistry,
  subscribeToAgenticEvents,
} from './lib/mcp-notifications/session-registry.js';
import { RedisResourceSubscriptionStore } from './lib/mcp-notifications/resource-subscriptions.js';
import { publishResourceUpdated } from './lib/mcp-notifications/events.js';
import { buildMcpServerInstructions } from './mcp-instructions.js';
import GraphClient from './graph-client.js';
import AuthManager, { buildScopesFromEndpoints } from './auth.js';
import { MicrosoftOAuthProvider } from './oauth-provider.js';
import { verifyMicrosoftBearerToken } from './lib/microsoft-auth.js';
import type { CommandOptions } from './cli.ts';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { parseHttpOption } from './lib/http-option.js';
import { requestContext, getRequestTokens, getRequestOwnerSubject } from './request-context.js';
import { mountHealth, type ReadinessCheck } from './lib/health.js';
import { registerShutdownHooks } from './lib/shutdown.js';
import { createCorsMiddleware, type CorsMode } from './lib/cors.js';
import { getRedis } from './lib/redis.js';
import { registerAuditResourcePublisher } from './lib/audit.js';
import { resolveTrustProxySetting } from './lib/trust-proxy.js';
import { createRateLimitMiddleware } from './lib/rate-limit/middleware.js';
import {
  collectForwardedAuthorizeParams,
  isSameAuthorizeRequest,
  LEGACY_FORWARDED_AUTHORIZE_PARAMS,
} from './lib/oauth/authorize-request-identity.js';
import { createRegisterHandler } from './lib/oauth/register-handler.js';
import { createAuthorizeHandler, createTenantTokenHandler } from './lib/oauth/tenant-handlers.js';
import { isOAuthClientStoreAvailable } from './lib/oauth/client-store.js';
import { buildWwwAuthenticate } from './lib/www-authenticate.js';
import { createTokenHandler } from './lib/oauth/token-handler.js';
export { createRegisterHandler } from './lib/oauth/register-handler.js';
export { createAuthorizeHandler, createTenantTokenHandler } from './lib/oauth/tenant-handlers.js';
export { createTokenHandler } from './lib/oauth/token-handler.js';
export { parseHttpOption } from './lib/http-option.js';
export type {
  AuthorizeHandlerConfig,
  TenantTokenHandlerConfig,
} from './lib/oauth/tenant-handlers.js';
import type { PkceEntry, PkceStore } from './lib/pkce-store/pkce-store.js';
import { MemoryPkceStore } from './lib/pkce-store/memory-store.js';
import type { TenantRow } from './lib/tenant/tenant-row.js';
import type { TenantPool } from './lib/tenant/tenant-pool.js';
import { createStreamableHttpHandler } from './lib/transports/streamable-http.js';
import {
  createLegacySseGetHandler,
  createLegacySsePostHandler,
} from './lib/transports/legacy-sse.js';
import { createAuthSelectorMiddleware } from './lib/auth-selector.js';
import {
  createToolsListFilterMiddleware,
  wrapNativeDiscoveryToolHandlers,
  wrapToolsListHandler,
} from './lib/tool-selection/tools-list-filter.js';
import { resolveTenantSurface } from './lib/tenant-surface/surface.js';
import {
  buildConnectorWellKnownMetadata,
  buildOAuthAuthorizationServerMetadata,
  buildOAuthProtectedResourceMetadata,
  buildServerInfo,
} from './lib/connector-identity/metadata.js';
import crypto from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { nanoid } from 'nanoid';
import { requestLogProps } from './lib/request-log-props.js';

const LEGACY_SINGLE_TENANT_KEY = '_';

function onceAsync<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  let called = false;
  return async (...args: T) => {
    if (called) return;
    called = true;
    await fn(...args);
  };
}

function pkceChallengeForVerifier(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function createHttpRouteRateLimit(): RequestHandler {
  const rawLimit = process.env.MS365_MCP_HTTP_ROUTE_RATE_LIMIT_PER_MIN;
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 600;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 600;

  return expressRateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited', reason: 'route_rate' },
  }) as unknown as RequestHandler;
}

// Legacy /token handler lives in src/lib/oauth/token-handler.ts so handler tests do not import the full MCP server/tool graph.

// Per-tenant OAuth handlers live in src/lib/oauth/tenant-handlers.ts so
// handler tests do not import the full MCP server/tool graph.

/**
 * Resolve the prod-mode CORS allowlist from environment variables.
 *
 * Precedence:
 *   1. MS365_MCP_CORS_ORIGINS (plural, comma-separated) — canonical.
 *   2. MS365_MCP_CORS_ORIGIN  (singular, v1 compat) — honored with a
 *      warn log so operators know to migrate. Removal target is v2.1
 *      (tracked in CHANGELOG by plan 01-08).
 *   3. Empty array — src/index.ts fails-fast with exit(78) in prod
 *      HTTP mode before this function is consulted by the middleware.
 *
 * Computed once per HTTP setup and closure-captured by
 * createCorsMiddleware so the split+trim cost is not paid per request.
 */
function computeCorsAllowlist(): string[] {
  const plural = process.env.MS365_MCP_CORS_ORIGINS;
  if (plural && plural.trim()) {
    return plural
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const singular = process.env.MS365_MCP_CORS_ORIGIN;
  if (singular && singular.trim()) {
    logger.warn(
      'MS365_MCP_CORS_ORIGIN (singular) is deprecated — use MS365_MCP_CORS_ORIGINS (plural, comma-separated)'
    );
    return [singular.trim()];
  }

  return [];
}

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient | null;
  private server: McpServer | null;
  private secrets: AppSecrets | null;
  private version: string = '0.0.0';
  private multiAccount: boolean = false;
  private accountNames: string[] = [];

  // Two-leg PKCE (plan 03-03): PkceStore abstracts over RedisPkceStore (HTTP
  // mode) and MemoryPkceStore (stdio / tests). Keyed by
  // (tenantId, clientCodeChallenge) — the v1 Map<state, entry> + O(N) find
  // has been fully removed along with its opportunistic cleanup timer
  // (Redis TTL = 600s handles eviction; MemoryPkceStore uses Date.now()
  // comparison on read).
  private pkceStore: PkceStore;
  private promptDeps?: RegisterMcpPromptsDeps;

  // Phase 3 (plan 03-01): pushed by src/index.ts before server.start() so
  // /readyz composition reflects every subsystem (Postgres in 03-01; Redis
  // in 03-02; tenantPool in 03-05; etc). Default empty array preserves the
  // Phase 1 baseline contract.
  private readinessChecks: ReadinessCheck[];
  private resourceSubscriptions?: RedisResourceSubscriptionStore;

  /**
   * @param authManager - MSAL + scope owner.
   * @param options - CLI/runtime flags (CommandOptions).
   * @param readinessChecks - Pushed by src/index.ts before start() — /readyz composes these.
   * @param deps - Phase 3+ dependency-injection bag. `pkceStore` defaults to
   *   MemoryPkceStore when omitted so tests and stdio callers don't need to
   *   construct the Redis substrate. HTTP-mode bootstraps inject
   *   RedisPkceStore(getRedis()) via src/index.ts region:phase3-pkce-store.
   */
  constructor(
    authManager: AuthManager,
    options: CommandOptions = {},
    readinessChecks: ReadinessCheck[] = [],
    deps: { pkceStore?: PkceStore; promptDeps?: RegisterMcpPromptsDeps } = {}
  ) {
    this.authManager = authManager;
    this.options = options;
    this.graphClient = null; // Initialized in start() after secrets are loaded
    this.server = null;
    this.secrets = null;
    this.readinessChecks = readinessChecks;
    this.pkceStore = deps.pkceStore ?? new MemoryPkceStore();
    this.promptDeps = deps.promptDeps;
  }

  /**
   * Build a fresh MCP server instance. Plan 03-09 (TRANS-05): this is the
   * single factory that produces an `McpServer` for every transport — stdio,
   * Streamable HTTP, AND the legacy SSE shim all call this method so the
   * tool surface is identical across transports.
   *
   * The optional `tenant` parameter is forwarded for per-tenant tool-surface
   * scoping introduced in Phase 5 (`tenant.enabled_tools` filter). Phase 3
   * registers all tools regardless of tenant; the parameter is threaded
   * through so callers can pass it today without changing the signature
   * later. Passing `undefined` preserves the legacy single-tenant behaviour
   * (stdio mode + HTTP mode's legacy /mcp path which 03-09 retires).
   */
  private async createMcpServerForRequest(tenant: TenantRow): Promise<McpServer> {
    const tenantSurface = resolveTenantSurface(tenant);
    const skillPrompts = tenantSurface.isDiscoverySurface
      ? await listVisibleSkills(tenant.id, getRequestOwnerSubject())
      : [];
    return this.createMcpServer(tenant, skillPrompts);
  }

  createMcpServer(
    tenant?: TenantRow,
    skillPrompts: readonly PromptTemplateDefinition[] = []
  ): McpServer {
    // Per-tenant allowlist for tool registration. The augmented
    // `req.tenant` shape from loadTenant carries `enabled_tools_set` —
    // a frozen Set of aliases derived from `tenants.enabled_tools` text
    // + `preset_version`. Passing it down to registerGraphTools turns
    // the inner registration loop from "iterate all 42k generated tools"
    // into "iterate ~tenant-allowlist-size tools", which keeps per-request
    // heap usage proportional to what the tenant actually exposes.
    const enabledToolsSet = (tenant as { enabled_tools_set?: ReadonlySet<string> } | undefined)
      ?.enabled_tools_set;
    const tenantSurface = resolveTenantSurface(tenant);
    const useDiscoverySurface = tenant
      ? tenantSurface.isDiscoverySurface
      : Boolean(this.options.discovery);

    const server = new McpServer(
      buildServerInfo({ version: this.version, tenantDisplayName: tenant?.slug }),
      {
        instructions: buildMcpServerInstructions({
          discovery: useDiscoverySurface,
          orgMode: Boolean(this.options.orgMode),
          readOnly: Boolean(this.options.readOnly),
          multiAccount: this.multiAccount,
          tenantDisplayName: tenant?.slug,
          version: this.version,
        }),
      }
    );

    const shouldRegisterAuthTools = !this.options.http || this.options.enableAuthTools;
    if (shouldRegisterAuthTools) {
      registerAuthTools(server, this.authManager);
    }

    if (useDiscoverySurface) {
      registerDiscoveryTools(
        server,
        this.graphClient!,
        this.options.readOnly,
        this.options.orgMode,
        this.authManager,
        this.multiAccount
      );
      registerMemoryTools(server, {
        redis: getRedis(),
        graphClient: this.graphClient!,
        authManager: this.authManager,
        readOnly: this.options.readOnly,
        orgMode: this.options.orgMode,
      });
      registerSkillTools(server, {
        redis: getRedis(),
        readOnly: this.options.readOnly,
        orgMode: this.options.orgMode,
        loadBuiltInPrompts: this.promptDeps?.loadPrompts,
      });
      const capabilityProfile = buildEffectiveCapabilityProfile({
        transport: this.options.http ? 'streamable-http' : 'stdio',
        surface: 'discovery',
        tenantPolicy: { phase8Enabled: true },
        advertisedCapabilities: { tools: {}, apps: {}, resources: {}, structuredToolResults: {} },
      });
      registerMcpApps(server, {
        tenant: tenant ? { id: tenant.id, preset_version: tenant.preset_version } : undefined,
        capabilityProfile,
        registerTools: false,
      });
      registerMcpResources(server, {
        tenant:
          tenant && enabledToolsSet
            ? {
                id: tenant.id,
                allowed_scopes: tenant.allowed_scopes,
                enabled_tools: tenant.enabled_tools,
                enabled_tools_set: enabledToolsSet,
                preset_version: tenant.preset_version,
              }
            : undefined,
        readOnly: this.options.readOnly,
        orgMode: this.options.orgMode,
        graphClient: this.graphClient!,
        connector: {
          server: { name: 'Microsoft365MCP', version: this.version },
          surface: 'discovery',
          transport: this.options.http ? 'streamable-http' : 'stdio',
          profile: capabilityProfile,
          metadataUrls: tenant ? { mcp: `/t/${tenant.id}/mcp` } : {},
          expectedDisplayName: 'Microsoft 365 MCP Gateway',
        },
        resourceSubscriptions: this.resourceSubscriptions,
      });
      registerMcpPrompts(server, {
        ...(this.promptDeps ?? {}),
        authManager: this.authManager,
        ...(tenant
          ? {
              enableEditableSkills: true,
              loadSkillPrompts: () => [...skillPrompts],
            }
          : {}),
      });
      registerMcpCompletions(server);
      registerMcpLogging(server);
      registerDashboardTools(server, {
        server: { name: 'Microsoft365MCP', version: this.version },
        tenant: tenant
          ? {
              id: tenant.id,
              slug: tenant.slug,
              preset_version: tenant.preset_version,
              enabled_tools_set: enabledToolsSet,
              allowed_scopes: tenant.allowed_scopes,
            }
          : { id: 'single-tenant' },
        surface: 'discovery',
        transport: this.options.http ? 'streamable-http' : 'stdio',
        expectedDisplayName: 'Microsoft 365 MCP Gateway',
        metadataUrls: tenant ? { mcp: `/t/${tenant.id}/mcp` } : {},
        profile: capabilityProfile,
      });
    } else {
      registerGraphTools(
        server,
        this.graphClient!,
        this.options.readOnly,
        this.options.enabledTools,
        this.options.orgMode,
        this.authManager,
        this.multiAccount,
        this.accountNames,
        enabledToolsSet
      );
    }

    // Plan 05-05 (COVRG-04, TENANT-08): wrap the SDK's default tools/list
    // handler AFTER all tool registrations so the filter sees the populated
    // `_registeredTools` map. Safe to call in stdio mode — `wrapToolsListHandler`
    // reads `getRequestTenant()` from AsyncLocalStorage which falls back to
    // the stdio bootstrap triple (Pitfall 8). Idempotent on repeat calls.
    // Native discovery tools also need dispatch guarding because tools/list
    // filtering is not a tools/call authorization boundary.
    wrapNativeDiscoveryToolHandlers(server);
    wrapToolsListHandler(server);

    return server;
  }

  /**
   * Plan 03-08: mount the /t/:tenantId/* router on the Express app.
   *
   * Wires:
   *   1. `loadTenant` middleware — resolves the tenant row from Postgres
   *      (via LRU cache) and populates `req.tenant`.
   *   2. Tenant-scoped `/t/:tenantId/.well-known/oauth-authorization-server`
   *      and `oauth-protected-resource` — issuer URLs include the tenant
   *      segment so downstream clients use tenant-scoped endpoints.
   *   3. `/t/:tenantId/authorize` + `/t/:tenantId/token` — per-tenant OAuth
   *      handlers from 03-06.
   *   4. Redis pub/sub subscriber on `mcp:tenant-invalidate` — admin
   *      mutations in Phase 4 publish here; we evict the cached entry.
   *
   * The mount is best-effort: if Postgres, Redis, or the TenantPool are
   * unavailable we log at warn level and skip the mount so the legacy
   * single-tenant /authorize + /token path remains functional for v1
   * compatibility. This keeps Phase 3 deployments on the happy path while
   * leaving v1 HTTP deployments unaffected.
   */
  private async mountTenantRoutes(
    app: import('express').Express,
    publicBase: string | null,
    oauthRedirectHosts: readonly string[] = []
  ): Promise<void> {
    let pg: import('pg').Pool;
    try {
      const postgres = await import('./lib/postgres.js');
      pg = postgres.getPool();
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'Phase 3 tenant routes: postgres unavailable, skipping /t/:tenantId/* mount'
      );
      return;
    }

    let redis: import('./lib/redis.js').RedisClient;
    let tenantPool: TenantPool;
    try {
      const redisLib = await import('./lib/redis.js');
      redis = redisLib.getRedis();
      const poolLib = await import('./lib/tenant/tenant-pool.js');
      const existingPool = poolLib.getTenantPool();
      if (!existingPool) {
        logger.warn(
          'Phase 3 tenant routes: TenantPool not initialized, skipping /t/:tenantId/* mount'
        );
        return;
      }
      tenantPool = existingPool;
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'Phase 3 tenant routes: Redis/TenantPool unavailable, skipping /t/:tenantId/* mount'
      );
      return;
    }

    const { createLoadTenantMiddleware } = await import('./lib/tenant/load-tenant.js');
    const { subscribeToTenantInvalidation } = await import('./lib/tenant/tenant-invalidation.js');
    const { subscribeToToolSelectionInvalidation } =
      await import('./lib/tool-selection/tool-selection-invalidation.js');
    const { discoveryCache } = await import('./graph-tools.js');
    const { createPerTenantCorsMiddleware } = await import('./lib/cors.js');

    const loadTenant = createLoadTenantMiddleware({ pool: pg });
    const durableDcrAvailable = await isOAuthClientStoreAvailable(pg);
    const resourceSubscriptions = new RedisResourceSubscriptionStore(redis);
    this.resourceSubscriptions = resourceSubscriptions;
    mcpSessionRegistry.setResourceSubscriptionChecker((tenantId, sessionId, uri) =>
      resourceSubscriptions.isSubscribed(tenantId, sessionId, uri)
    );
    registerAuditResourcePublisher((tenantId) =>
      publishResourceUpdated(
        redis,
        tenantId,
        [
          `m365://tenant/${tenantId}/audit/recent.json`,
          `mcp://tenant/${tenantId}/audit/recent.json`,
        ],
        'audit-write'
      )
    );

    // Per-tenant McpServer cache. The MCP server holds the registered
    // tool list (Zod schemas + handlers) for a tenant; building it
    // requires walking the generated catalog (~42k entries) — too heavy
    // to repeat per request. We build once on first use, reuse on every
    // subsequent request for the same tenant, and evict when either
    // tenant-invalidate (tenant row mutated) or tool-selection-invalidate
    // (enabled_tools or preset_version mutated) fires for that tenant.
    // Stdio mode keeps using `this.server` (legacy single-server path).
    const mcpServerCache = new Map<string, McpServer>();
    // to our LRU. Failure to subscribe (Redis partition) logs + continues —
    // the 60s TTL still bounds staleness.
    try {
      // Same .duplicate() pattern as tool-selection below — subscribe must
      // run on a dedicated connection; ioredis refuses regular commands on a
      // client in subscriber mode, which caused rate-limit middleware to
      // throw "Connection in subscriber mode" on every /t/:tenantId/mcp call
      // when this subscription was run on the shared client.
      const tenantSubscriberClient =
        'duplicate' in redis && typeof (redis as { duplicate: unknown }).duplicate === 'function'
          ? (redis as { duplicate: () => typeof redis }).duplicate()
          : redis;
      await subscribeToTenantInvalidation(tenantSubscriberClient, {
        evict: (tenantId: string) => {
          loadTenant.evict(tenantId);
          tenantPool.evict(tenantId);
          mcpServerCache.delete(tenantId);
        },
      });
      logger.info('Phase 3 tenant routes: subscribed to mcp:tenant-invalidate');
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'Phase 3 tenant routes: tenant-invalidate subscription failed (falling back to 60s TTL)'
      );
    }

    // Plan 05-06 (COVRG-05, D-20/D-21): subscribe to the tool-selection
    // invalidation channel. Admin PATCH /admin/tenants/{id}/enabled-tools
    // (Plan 05-07) publishes a tenantId here after COMMIT; we evict every
    // cached BM25 index for that tenant so the next discovery call picks
    // up the new enabled_tools_set. Failure to subscribe is non-fatal —
    // the 10-minute TTL still bounds staleness.
    //
    // Real ioredis clients support `.duplicate()` (Pitfall 6 — dedicated
    // subscriber connection with auto-resubscribe on reconnect). The
    // MemoryRedisFacade lacks duplicate() — fall back to the shared
    // client. Both facades route subscribe/publish through an in-memory
    // channel map so the shared-client path is safe for tests and stdio.
    try {
      const subscriberClient =
        'duplicate' in redis && typeof (redis as { duplicate: unknown }).duplicate === 'function'
          ? (redis as { duplicate: () => typeof redis }).duplicate()
          : redis;
      await subscribeToToolSelectionInvalidation(subscriberClient, {
        invalidate: (tenantId: string) => {
          discoveryCache.invalidate(tenantId);
          // enabled_tools_set is baked into the tenant's cached McpServer
          // at registration time, so a tool-selection mutation MUST evict
          // the server too — otherwise the next /mcp call replays the old
          // tool surface until the next tenant-invalidate.
          mcpServerCache.delete(tenantId);
        },
      });
      logger.info('Plan 05-06 tool-selection routes: subscribed to mcp:tool-selection-invalidate');
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'Plan 05-06 tool-selection routes: invalidation subscription failed (falling back to 10-minute TTL)'
      );
    }

    try {
      await subscribeToAgenticEvents(redis, mcpSessionRegistry);
      logger.info('Plan 07-08 notifications: subscribed to mcp:agentic-events');
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'Plan 07-08 notifications: agentic event subscription failed'
      );
    }

    // region:phase4-admin-router
    // Plan 04-01: Admin REST API skeleton. Mount BEFORE /t/:tenantId so
    // /admin/* paths never accidentally route through loadTenant (which
    // would 404 on the literal segment 'admin' failing the GUID regex —
    // T-04-03c). Gated on Entra admin env so deployments without the admin
    // app registration expose zero /admin/* surface (T-04-03b).
    //
    // NOTE: Plan 04-01 originally described mounting OUTSIDE mountTenantRoutes
    // (just before the call at ~line 1326). pg/redis/tenantPool are resolved
    // INSIDE this method, however, so mounting here keeps deps in scope
    // without duplicating the resolution block. Mount order vs. /t/:tenantId
    // is preserved — admin declaration precedes the first app.use('/t/…').
    if (process.env.MS365_MCP_ADMIN_APP_CLIENT_ID && process.env.MS365_MCP_ADMIN_GROUP_ID) {
      const { createAdminRouter, parseAdminOrigins } = await import('./lib/admin/router.js');
      const { createCursorSecret } = await import('./lib/admin/cursor.js');
      const { loadKek } = await import('./lib/crypto/kek.js');
      const adminOrigins = parseAdminOrigins(process.env.MS365_MCP_ADMIN_ORIGINS);
      const adminRouter = createAdminRouter({
        pgPool: pg,
        redis,
        tenantPool,
        kek: await loadKek(),
        adminOrigins,
        entraConfig: {
          appClientId: process.env.MS365_MCP_ADMIN_APP_CLIENT_ID,
          groupId: process.env.MS365_MCP_ADMIN_GROUP_ID,
        },
        cursorSecret: createCursorSecret(),
      });
      app.use('/admin', adminRouter);
      // Log origin COUNT only — never the actual allowlist contents (PII-
      // adjacent: reveals which operator domains use this deployment).
      logger.info({ adminOriginCount: adminOrigins.length }, 'Phase 4: /admin/* router mounted');
    } else {
      logger.warn(
        {},
        'Phase 4: MS365_MCP_ADMIN_APP_CLIENT_ID or MS365_MCP_ADMIN_GROUP_ID unset; /admin/* not mounted'
      );
    }
    // endregion:phase4-admin-router

    // Per-tenant CORS — falls back to the global allowlist when the tenant
    // did not customize CORS. loadTenant runs first so req.tenant is set.
    const isProdMode = process.env.NODE_ENV === 'production';
    const fallbackAllowlist = computeCorsAllowlist();
    const tenantLoadRouteRateLimit = createHttpRouteRateLimit();
    // codeql[js/missing-rate-limiting]: route limiter runs before loadTenant performs tenant DB lookup.
    app.use('/t/:tenantId', tenantLoadRouteRateLimit, loadTenant);
    app.use(
      '/t/:tenantId',
      createPerTenantCorsMiddleware({
        mode: isProdMode ? 'prod' : 'dev',
        fallbackAllowlist,
      })
    );

    const tenantOauthRouteRateLimit = createHttpRouteRateLimit();

    // Per-tenant OAuth discovery — /.well-known/* URLs scoped to a tenant
    // segment so downstream clients bind the right issuer. publicBase
    // (MS365_MCP_PUBLIC_URL) is the canonical external origin for all OAuth
    // metadata. Falling back to the request origin is dev-only behavior.
    //
    // We expose BOTH discovery shapes for each metadata document:
    //   - /t/:tenantId/.well-known/<suffix>     (OIDC-discovery shape, well-known
    //                                            after path)
    //   - /.well-known/<suffix>/t/:tenantId     (RFC 8414 §3.1 shape, well-known
    //                                            between host and path)
    // Different MCP clients try different forms; Claude.ai connectors follow
    // RFC 8414 strictly. Both routes serve the same body via the same
    // builders below.
    const externalBaseFor = (req: Request): string => {
      const protocol = req.secure ? 'https' : 'http';
      const requestOrigin = `${protocol}://${req.get('host')}`;
      return publicBase ?? requestOrigin;
    };

    const scopesForTenant = (tenant: TenantRow): readonly string[] =>
      tenant.allowed_scopes.length
        ? tenant.allowed_scopes
        : buildScopesFromEndpoints(this.options.orgMode, this.options.enabledTools);

    const buildAuthServerMetadata = (tenant: TenantRow, req: Request): Record<string, unknown> =>
      buildOAuthAuthorizationServerMetadata({
        publicBaseUrl: externalBaseFor(req),
        tenantId: tenant.id,
        tenantDisplayName: tenant.slug,
        scopes: scopesForTenant(tenant),
        version: this.version,
        dynamicRegistration: this.options.enableDynamicRegistration && durableDcrAvailable,
      });

    const buildProtectedResourceMetadata = (
      tenant: TenantRow,
      req: Request
    ): Record<string, unknown> =>
      buildOAuthProtectedResourceMetadata({
        publicBaseUrl: externalBaseFor(req),
        tenantId: tenant.id,
        tenantDisplayName: tenant.slug,
        scopes: scopesForTenant(tenant),
        version: this.version,
      });

    // OIDC-discovery shape (well-known after path).
    app.get(
      '/t/:tenantId/.well-known/oauth-authorization-server',
      tenantOauthRouteRateLimit,
      async (req, res) => {
        const tenant = (req as Request & { tenant?: TenantRow }).tenant;
        if (!tenant) {
          res.status(404).json({ error: 'tenant_not_found' });
          return;
        }
        res.json(buildAuthServerMetadata(tenant, req));
      }
    );

    app.get(
      '/t/:tenantId/.well-known/oauth-protected-resource',
      tenantOauthRouteRateLimit,
      async (req, res) => {
        const tenant = (req as Request & { tenant?: TenantRow }).tenant;
        if (!tenant) {
          res.status(404).json({ error: 'tenant_not_found' });
          return;
        }
        res.json(buildProtectedResourceMetadata(tenant, req));
      }
    );

    // RFC 8414 shape (well-known between host and path). These routes do NOT
    // go through the `/t/:tenantId/*` prefix where loadTenant is mounted at
    // line 1134, so we apply loadTenant inline. Both routes serve the same
    // body as the OIDC-discovery-shape variants above.
    app.get(
      '/.well-known/oauth-authorization-server/t/:tenantId',
      tenantOauthRouteRateLimit,
      loadTenant,
      async (req, res) => {
        const tenant = (req as Request & { tenant?: TenantRow }).tenant;
        if (!tenant) {
          res.status(404).json({ error: 'tenant_not_found' });
          return;
        }
        res.json(buildAuthServerMetadata(tenant, req));
      }
    );

    app.get(
      '/.well-known/oauth-protected-resource/t/:tenantId',
      tenantOauthRouteRateLimit,
      loadTenant,
      async (req, res) => {
        const tenant = (req as Request & { tenant?: TenantRow }).tenant;
        if (!tenant) {
          res.status(404).json({ error: 'tenant_not_found' });
          return;
        }
        res.json(buildProtectedResourceMetadata(tenant, req));
      }
    );

    app.get('/t/:tenantId/.well-known/mcp-connector', async (req, res) => {
      const tenant = (req as Request & { tenant?: TenantRow }).tenant;
      if (!tenant) {
        res.status(404).json({ error: 'tenant_not_found' });
        return;
      }
      res.json(
        buildConnectorWellKnownMetadata({
          publicBaseUrl: externalBaseFor(req),
          tenantId: tenant.id,
          tenantDisplayName: tenant.slug,
          version: this.version,
          dynamicRegistration: this.options.enableDynamicRegistration && durableDcrAvailable,
        })
      );
    });

    // /t/:tenantId/authorize + /t/:tenantId/token — tenant-scoped OAuth from 03-06.
    // Plan 03-10: pgPool wired so both handlers emit oauth.authorize +
    // oauth.token.exchange audit rows via writeAuditStandalone.
    app.get(
      '/t/:tenantId/authorize',
      tenantOauthRouteRateLimit,
      createAuthorizeHandler({
        pkceStore: this.pkceStore,
        pgPool: pg,
        publicUrlHost: publicBase ? new URL(publicBase).hostname : null,
        extraAllowedHosts: oauthRedirectHosts,
      })
    );
    if (this.options.enableDynamicRegistration && durableDcrAvailable) {
      app.post('/t/:tenantId/register', tenantOauthRouteRateLimit, async (req, res, next) => {
        const tenant = (req as Request & { tenant?: TenantRow }).tenant;
        if (!tenant) {
          res.status(404).json({ error: 'tenant_not_found' });
          return;
        }
        return createRegisterHandler(
          {
            mode: isProdMode ? 'prod' : 'dev',
            publicUrlHost: publicBase ? new URL(publicBase).hostname : null,
            extraAllowedHosts: oauthRedirectHosts,
          },
          { pgPool: pg, tenantId: tenant.id }
        )(req, res).catch(next);
      });
    }

    app.post(
      '/t/:tenantId/token',
      tenantOauthRouteRateLimit,
      createTenantTokenHandler({
        pkceStore: this.pkceStore,
        tenantPool,
        redis,
        pgPool: pg,
      })
    );

    // ── Plan 03-09: three-transport mounting on /t/:tenantId/* ───────────
    //
    // Mount order (most-specific first per RESEARCH.md Pattern 4 +
    // Pitfall 3):
    //   /t/:tenantId/sse          — legacy SSE GET stream (2024-11-05 spec)
    //   /t/:tenantId/messages     — legacy SSE POST channel (shim: initialize only)
    //   /t/:tenantId/mcp          — Streamable HTTP (current MCP spec; GET+POST+DELETE)
    //
    // All three share the SAME createMcpServer(tenant) factory (TRANS-05)
    // so tool registration is identical across transports. The closure
    // captures `this` + tenantPool + redis from the bootstrap scope.
    const authSelector = createAuthSelectorMiddleware({ tenantPool, redis });
    // NOT cached: MCP SDK's Server.connect(transport) is strictly 1:1 —
    // reusing a server across requests fails with "Already connected to
    // a transport". Per-tenant caching was attempted (commit d6706e3)
    // but conflicts with the streamable-http stateless transport model.
    // The cost we still avoid is registering 42k tools per request:
    // registerGraphTools now filters by tenant.enabled_tools_set BEFORE
    // building Zod schemas, so each per-request build is ~204 tools
    // (cheap, sub-100ms) instead of the full catalog.
    const buildMcpServer = (tenant: TenantRow): Promise<McpServer> =>
      this.createMcpServerForRequest(tenant);
    const buildLegacyMcpServer = (tenant: TenantRow): McpServer => this.createMcpServer(tenant);
    void mcpServerCache;

    // Plan 05-04 TENANT-08: seed AsyncLocalStorage with tenantId +
    // enabled_tools_set + preset_version BEFORE authSelector runs. The auth
    // middlewares own their own requestContext.run() calls that spread the
    // existing frame; by seeding tenant fields first, dispatch-guard can
    // resolve the tenant triple inside executeGraphTool via getRequestTenant().
    const { createSeedTenantContextMiddleware } =
      await import('./lib/tool-selection/tenant-context-middleware.js');
    const seedTenantContext = createSeedTenantContextMiddleware();

    const streamableHttp = createStreamableHttpHandler({
      buildMcpServer,
      sessionRegistry: mcpSessionRegistry,
      resourceSubscriptions,
    });
    const legacySseGet = createLegacySseGetHandler({ buildMcpServer: buildLegacyMcpServer });
    const legacySsePost = createLegacySsePostHandler({ buildMcpServer: buildLegacyMcpServer });

    // Plan 05-05 (COVRG-04, TENANT-08): Express-level tools/list filter.
    // Authoritative filtering happens inside createMcpServer via
    // wrapToolsListHandler — Streamable HTTP (@hono/node-server) bypasses
    // res.json/res.send. This middleware is defense in depth for any
    // transport (including future web-standard replacements) that DOES
    // route JSON-RPC responses through Express's response methods.
    const toolsListFilter = createToolsListFilterMiddleware();

    // region:phase6-rate-limit (plan 06-09 — closes OPS-08 gap from 06-04 Task 3)
    // Mount the per-tenant rate-limit middleware BETWEEN the existing chain
    // members and transport handlers. Both request-rate and graph-points
    // budgets are gated (per ROADMAP SC#3 + RESEARCH.md §Open Question #5).
    const routeRateLimit = createHttpRouteRateLimit();
    const rateLimit = createRateLimitMiddleware({ redis });

    // codeql[js/missing-rate-limiting]: createRateLimitMiddleware gates this route before the transport handler.
    app.get(
      '/t/:tenantId/sse',
      seedTenantContext,
      routeRateLimit,
      authSelector,
      rateLimit,
      legacySseGet
    );
    app.post(
      '/t/:tenantId/messages',
      seedTenantContext,
      routeRateLimit,
      authSelector,
      toolsListFilter,
      rateLimit,
      legacySsePost
    );

    // codeql[js/missing-rate-limiting]: createRateLimitMiddleware gates this route before the transport handler.
    app.post(
      '/t/:tenantId/mcp',
      seedTenantContext,
      routeRateLimit,
      authSelector,
      toolsListFilter,
      rateLimit,
      streamableHttp
    );

    // codeql[js/missing-rate-limiting]: createRateLimitMiddleware gates this route before the transport handler.
    app.get(
      '/t/:tenantId/mcp',
      seedTenantContext,
      routeRateLimit,
      authSelector,
      rateLimit,
      streamableHttp
    );

    // codeql[js/missing-rate-limiting]: createRateLimitMiddleware gates this route before the transport handler.
    app.delete(
      '/t/:tenantId/mcp',
      seedTenantContext,
      routeRateLimit,
      authSelector,
      rateLimit,
      streamableHttp
    );
    // endregion:phase6-rate-limit

    // region:phase4-webhook-receiver
    // Plan 04-07: Microsoft Graph change-notification receiver (WEBHK-01 +
    // WEBHK-02). Mounted AFTER the /mcp routes but BEFORE the implicit 404.
    // Body-parser limit 1 MiB per D-16 (rich-notification spec caps at 200 KB,
    // 5x buffer). loadTenant already applies at the /t/:tenantId level
    // (line 1096 above) — we re-list it here for explicitness and to match
    // the plan-04-07 middleware chain exactly. The `app.use('/t/:tenantId',
    // loadTenant)` pass runs first and short-circuits on a 404 or bad GUID,
    // so the route-specific pass is a no-op on the happy path.
    //
    // DEK sourcing: getDekForTenant is the warm path; handler falls back to
    // unwrapTenantDek(wrapped_dek, kek) on cold pool so webhook delivery
    // does NOT force an MSAL acquire (the webhook is a distinct code path
    // from outbound Graph calls).
    try {
      const { createWebhookHandler } = await import('./lib/admin/webhooks.js');
      const { loadKek: loadKekForWebhook } = await import('./lib/crypto/kek.js');
      const webhookHandler = createWebhookHandler({
        pgPool: pg,
        redis,
        tenantPool,
        kek: await loadKekForWebhook(),
      });
      // codeql[js/missing-rate-limiting]: routeRateLimit gates webhook delivery before body parsing and DB work.
      app.post(
        '/t/:tenantId/notifications',
        routeRateLimit,
        // body-parser's NextHandleFunction signature predates Express 5's
        // RequestHandler (IncomingMessage vs. Request). At runtime both
        // accept the same req/res so the cast is safe; the type mismatch
        // is a known @types/body-parser gap against @types/express 5.x.
        express.json({ limit: '1mb' }) as unknown as RequestHandler,
        loadTenant,
        webhookHandler
      );
      logger.info('Phase 4: /t/:tenantId/notifications webhook receiver mounted');
    } catch (err) {
      // Fall through — webhook receiver is optional (no tenant can create a
      // subscription without the plan-04-08 MCP tools landing). A KEK-load
      // failure or a webhooks.js import failure logs warn and skips the
      // mount so the rest of the tenant surface keeps serving.
      logger.warn(
        { err: (err as Error).message },
        'Phase 4: webhook receiver mount failed (webhook deliveries will 404)'
      );
    }
    // endregion:phase4-webhook-receiver

    logger.info('Phase 3 tenant routes mounted under /t/:tenantId/*');
  }

  async initialize(version: string): Promise<void> {
    this.secrets = await getSecrets();
    this.version = version;

    // Detect multi-account mode and cache account names for schema enum
    try {
      this.multiAccount = await this.authManager.isMultiAccount();
      if (this.multiAccount) {
        const accounts = await this.authManager.listAccounts();
        this.accountNames = accounts.map((a) => a.username).filter((u): u is string => !!u);
        logger.info(
          `Multi-account mode detected (${this.accountNames.length} accounts): "account" parameter will be injected into all tool schemas`
        );
      }
    } catch (err) {
      logger.warn(`Failed to detect multi-account mode: ${(err as Error).message}`);
    }

    const outputFormat = this.options.toon ? 'toon' : 'json';
    this.graphClient = new GraphClient(this.authManager, this.secrets, outputFormat);

    if (!this.options.http) {
      this.server = this.createMcpServer();
    }

    if (this.options.discovery) {
      logger.info('Discovery mode enabled (experimental) - registering discovery tool only');
    }
  }

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Microsoft 365 MCP Server starting...');

    // Debug: Check if secrets are loaded
    logger.info('Secrets Check:', {
      CLIENT_ID: this.secrets?.clientId ? `${this.secrets.clientId.substring(0, 8)}...` : 'NOT SET',
      CLIENT_SECRET: this.secrets?.clientSecret ? 'SET' : 'NOT SET',
      TENANT_ID: this.secrets?.tenantId || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    });

    if (this.options.readOnly) {
      logger.info('Server running in READ-ONLY mode. Write operations are disabled.');
    }

    if (this.options.http) {
      const { host, port } = parseHttpOption(this.options.http);

      const app = express();
      app.set('trust proxy', resolveTrustProxySetting());

      // Health endpoints (OPS-03 / OPS-04) — MUST be mounted BEFORE pino-http,
      // CORS, body parsers, and ANY auth middleware so that:
      //   1. Health probes never exercise auth (T-01-04b: broken auth config
      //      must not fail the liveness probe).
      //   2. pino-http autoLogging.ignore is a belt-and-braces guard; mounting
      //      first means even a regression in the ignore predicate cannot spam
      //      2880 health-probe log lines/day (T-01-04a).
      //   3. OPTIONS preflight on /healthz does not hit CORS origin validation
      //      that might 403 in prod.
      // Phase 3 (plan 03-01) pushes Postgres readiness via src/index.ts before
      // server.start(); sibling Phase 3 plans (03-02 Redis, 03-05 tenant
      // pool) push their own. Phase 6 will push "at least one tenant loaded".
      // Phase 1 baseline has no checks — default empty array is correct.
      mountHealth(app, this.readinessChecks);

      // pino-http request logging — MUST be registered BEFORE express.json() so
      // that req.id is stamped on the raw request before body parsing starts.
      app.use(
        pinoHttp({
          logger: rawPinoLogger,
          genReqId: () => nanoid(),
          autoLogging: {
            ignore: (req) => {
              const url = req.url ?? '';
              // Skip access logs for health-check endpoints (plan 01-04 mounts these).
              return url.startsWith('/healthz') || url.startsWith('/readyz');
            },
          },
          customProps: requestLogProps,
        })
      );

      // Populate the shared AsyncLocalStorage so any downstream handler can
      // retrieve the correlation IDs without receiving them as function arguments.
      app.use((req, _res, next) => {
        // pino-http stamps req.id as string|number; we assert string here because
        // genReqId always returns nanoid() which is a string.
        requestContext.run({ requestId: req.id as string, tenantId: null }, next);
      });

      // Keep the global parser small because it runs before tenant auth and
      // rate limiting. Operators that intentionally expose large HTTP MCP
      // upload payloads can opt in with MS365_MCP_BODY_PARSER_LIMIT, but the
      // default must fail closed for unauthenticated requests.
      const bodyParserLimit = process.env.MS365_MCP_BODY_PARSER_LIMIT || '1mb';
      // body-parser's NextHandleFunction predates Express 5's RequestHandler;
      // the cast bridges the @types gap. See the webhook-receiver mount for
      // the matching discussion.
      app.use(express.json({ limit: bodyParserLimit }) as unknown as RequestHandler);
      app.use(
        express.urlencoded({ extended: true, limit: bodyParserLimit }) as unknown as RequestHandler
      );

      // Public URL resolution for browser-facing OAuth endpoints.
      //
      // When running behind a reverse proxy, the request's Host header only
      // reflects the public origin if the client reached the server through
      // the proxy. If a client (e.g. Open WebUI) talks to the server over
      // an internal Docker hostname, Host is that internal name, so the
      // authorize URL we hand back to the user's browser would be
      // unresolvable from outside. Setting MS365_MCP_PUBLIC_URL pins the
      // browser-facing origin while the server-to-server endpoints
      // (token, register, resource) stay on the request origin so clients
      // that reach us internally don't need NAT loopback through the proxy.
      //
      // DEPRECATED: --base-url / MS365_MCP_BASE_URL. Use --public-url /
      // MS365_MCP_PUBLIC_URL instead. The deprecated names are still read
      // here so existing configurations don't crash at startup, but they
      // will be removed in a future release. Note that the original
      // --base-url was effectively a no-op in practice: it was plumbed
      // through the SDK's mcpAuthRouter, whose metadata endpoint is
      // shadowed by the custom handler below, so no deployment relied
      // on its actual semantics.
      const publicUrlRaw =
        this.options.publicUrl ||
        process.env.MS365_MCP_PUBLIC_URL ||
        this.options.baseUrl ||
        process.env.MS365_MCP_BASE_URL ||
        null;
      const publicBase = publicUrlRaw ? new URL(publicUrlRaw).href.replace(/\/$/, '') : null;

      // Redirect-URI allowlist policy (plan 01-06 / D-02) and CORS mode gate
      // (plan 01-07 / SECUR-04). Both read the same `isProdMode` flag and
      // `publicUrlHost`; computing them ONCE here keeps the hot path free of
      // per-request env parsing. Phase 3 will extend this to a per-tenant
      // allowlist without touching createRegisterHandler / createCorsMiddleware.
      const publicUrlHost = publicBase ? new URL(publicBase).hostname : null;
      const isProdMode = process.env.NODE_ENV === 'production';

      // Plan 06+ DCR: third-party MCP connectors (Claude.ai, etc.) register
      // redirect_uris on their own domain via /register. Without an explicit
      // allowlist, the prod-mode validator rejects anything outside
      // publicUrlHost. Operators set this CSV env to the hosts they trust
      // for DCR (e.g. `claude.ai,chatgpt.com`).
      const oauthRedirectHosts = (process.env.MS365_MCP_OAUTH_REDIRECT_HOSTS ?? '')
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter((h) => h.length > 0);

      // CORS policy (plan 01-07 / D-02 / SECUR-04). Dev mode echoes ACAO to
      // any http(s)://localhost:* / http(s)://127.0.0.1:* origin; prod mode
      // requires an exact allowlist match against MS365_MCP_CORS_ORIGINS
      // (comma-separated). The deprecated singular MS365_MCP_CORS_ORIGIN
      // is honored with a warn log. src/index.ts fails-fast with exit(78)
      // in prod HTTP mode when the resolved allowlist is empty.
      const corsMode: CorsMode = isProdMode ? 'prod' : 'dev';
      const corsAllowlist = computeCorsAllowlist();
      app.use(createCorsMiddleware({ mode: corsMode, allowlist: corsAllowlist }));

      // ── Phase 3 plan 03-08: per-tenant /t/:tenantId/* router ─────────────
      //
      // Mounting order is strict — these routes MUST be declared BEFORE the
      // /.well-known/* discovery endpoints so "most specific path" wins:
      // /t/:tenantId/.well-known/oauth-authorization-server returns the
      // tenant-scoped metadata; /.well-known/oauth-authorization-server
      // keeps the legacy singleton behaviour for v1 compatibility.
      //
      // Wiring requires the Phase 3 substrate (Postgres, Redis, TenantPool)
      // — stdio / dev deployments without those can skip the mount entirely.
      // isHttpMode is already guaranteed here (we are inside `if
      // (this.options.http)`), so dependency resolution below is safe.
      await this.mountTenantRoutes(app, publicBase, oauthRedirectHosts);

      const oauthProvider = new MicrosoftOAuthProvider(this.authManager, this.secrets!);
      const oauthMetadataRateLimit = createHttpRouteRateLimit();
      const legacyOauthRouteRateLimit = createHttpRouteRateLimit();

      // OAuth Authorization Server Discovery
      app.get(
        '/.well-known/oauth-authorization-server',
        oauthMetadataRateLimit,
        async (req, res) => {
          const protocol = req.secure ? 'https' : 'http';
          const requestOrigin = `${protocol}://${req.get('host')}`;
          const externalBase = publicBase ?? requestOrigin;

          const scopes = buildScopesFromEndpoints(this.options.orgMode, this.options.enabledTools);

          res.json(
            buildOAuthAuthorizationServerMetadata({
              publicBaseUrl: externalBase,
              scopes,
              version: this.version,
              dynamicRegistration: this.options.enableDynamicRegistration,
              grantTypesSupported:
                process.env.MS365_MCP_LEGACY_OAUTH_REFRESH === '1'
                  ? ['authorization_code', 'refresh_token']
                  : ['authorization_code'],
            })
          );
        }
      );

      // OAuth Protected Resource Discovery
      app.get('/.well-known/oauth-protected-resource', oauthMetadataRateLimit, async (req, res) => {
        const protocol = req.secure ? 'https' : 'http';
        const requestOrigin = `${protocol}://${req.get('host')}`;
        const externalBase = publicBase ?? requestOrigin;

        const scopes = buildScopesFromEndpoints(this.options.orgMode, this.options.enabledTools);

        res.json(
          buildOAuthProtectedResourceMetadata({
            publicBaseUrl: externalBase,
            scopes,
            version: this.version,
          })
        );
      });

      if (this.options.enableDynamicRegistration) {
        // Plan 06+ DCR: extraAllowedHosts opens the validator to third-party
        // MCP connectors whose redirect_uri lives off-host (Claude.ai etc.).
        app.post(
          '/register',
          legacyOauthRouteRateLimit,
          createRegisterHandler(
            {
              mode: isProdMode ? 'prod' : 'dev',
              publicUrlHost,
              extraAllowedHosts: oauthRedirectHosts,
            },
            {
              supportedGrantTypes:
                process.env.MS365_MCP_LEGACY_OAUTH_REFRESH === '1'
                  ? ['authorization_code', 'refresh_token']
                  : ['authorization_code'],
            }
          )
        );
      }

      // Authorization endpoint - redirects to Microsoft
      // Implements two-leg PKCE: client↔server and server↔Microsoft are independent
      app.get('/authorize', legacyOauthRouteRateLimit, async (req, res) => {
        const url = new URL(req.url!, `${req.protocol}://${req.get('host')}`);
        const tenantId = this.secrets?.tenantId || 'common';
        const clientId = this.secrets!.clientId;
        const cloudEndpoints = getCloudEndpoints(this.secrets!.cloudType);
        const microsoftAuthUrl = new URL(
          `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/authorize`
        );

        // Extract client's PKCE parameters (from claude.ai or other MCP client)
        const clientCodeChallenge = url.searchParams.get('code_challenge');
        const clientCodeChallengeMethod = url.searchParams.get('code_challenge_method');
        const state = url.searchParams.get('state');

        if (!clientCodeChallenge || !state) {
          res.status(400).json({
            error: 'invalid_request',
            error_description: 'code_challenge and state are required for two-leg PKCE.',
          });
          return;
        }

        // Forward parameters that Microsoft OAuth 2.0 v2.0 supports,
        // but NOT code_challenge/code_challenge_method — we generate our own for Microsoft
        LEGACY_FORWARDED_AUTHORIZE_PARAMS.forEach((param) => {
          const value = url.searchParams.get(param);
          if (value) {
            microsoftAuthUrl.searchParams.set(param, value);
          }
        });

        // Two-leg PKCE (plan 03-03, SECUR-03):
        // Persist {state, clientCodeChallenge, serverCodeVerifier, ...} via
        // `pkceStore.put` keyed by (tenantId, clientCodeChallenge). Redis SET
        // NX EX 600 enforces TTL (no opportunistic cleanup loop required —
        // Redis auto-evicts stale entries) and rejects duplicate challenges
        // rather than silently overwriting. /token later computes
        // sha256(client_verifier) and does a single O(1) takeByChallenge.
        const serverCodeVerifier = crypto.randomBytes(32).toString('base64url');
        let serverCodeChallenge = pkceChallengeForVerifier(serverCodeVerifier);

        const redirectUri = url.searchParams.get('redirect_uri') ?? '';
        const pkceEntry: PkceEntry = {
          state,
          clientCodeChallenge,
          clientCodeChallengeMethod: clientCodeChallengeMethod || 'S256',
          serverCodeVerifier,
          clientId,
          redirectUri,
          tenantId: LEGACY_SINGLE_TENANT_KEY,
          createdAt: Date.now(),
          forwardedAuthorizeParams: collectForwardedAuthorizeParams(url),
        };
        const ok = await this.pkceStore.put(LEGACY_SINGLE_TENANT_KEY, pkceEntry);

        if (!ok) {
          const existing = await this.pkceStore.getByChallenge(
            LEGACY_SINGLE_TENANT_KEY,
            clientCodeChallenge
          );
          if (existing && isSameAuthorizeRequest(existing, pkceEntry)) {
            serverCodeChallenge = pkceChallengeForVerifier(existing.serverCodeVerifier);
            logger.info(
              {
                state: state.substring(0, 8) + '...',
                challengePrefix: clientCodeChallenge.substring(0, 8) + '...',
              },
              'Legacy /authorize: reused existing challenge for duplicate authorize retry'
            );
          } else {
            logger.warn(
              { challengePrefix: clientCodeChallenge.substring(0, 8) + '...' },
              'PKCE challenge collision on put'
            );
            res.status(400).json({
              error: 'pkce_challenge_collision',
              error_description:
                'An outstanding authorization request already uses this code_challenge; regenerate and retry.',
            });
            return;
          }
        }

        // Send our server-generated code_challenge to Microsoft
        microsoftAuthUrl.searchParams.set('code_challenge', serverCodeChallenge);
        microsoftAuthUrl.searchParams.set('code_challenge_method', 'S256');

        logger.info('Two-leg PKCE: stored client challenge, generated server challenge', {
          state: state.substring(0, 8) + '...',
        });

        // Use our Microsoft app's client_id
        microsoftAuthUrl.searchParams.set('client_id', clientId);

        // Ensure we have the minimal required scopes if none provided
        if (!microsoftAuthUrl.searchParams.get('scope')) {
          microsoftAuthUrl.searchParams.set('scope', 'User.Read Files.Read Mail.Read');
        }

        // Redirect to Microsoft's authorization page
        res.redirect(microsoftAuthUrl.toString());
      });

      // Token exchange endpoint — plan 01-07 factory-ized handler. All three
      // v1 log-site body leaks (info entry, grant_type missing, catch-block)
      // are scrubbed inside createTokenHandler; tests mount the same factory
      // on a minimal Express app to assert the invariant at the logger mock
      // call level. The factory is dependency-injected with secrets and the
      // per-instance PKCE store so the two-leg PKCE handshake continues to
      // work unchanged.
      app.post(
        '/token',
        createTokenHandler({
          secrets: this.secrets!,
          pkceStore: this.pkceStore,
        })
      );

      app.use(
        mcpAuthRouter({
          provider: oauthProvider,
          issuerUrl: new URL(publicBase ?? `http://localhost:${port}`),
        })
      );

      // Microsoft Graph MCP endpoints with bearer token auth
      //
      // Plan 03-07 (SECUR-02): the v1 legacy bearer middleware that read the
      // refresh-token custom header is gone. This inline middleware performs
      // ONLY the access-token extraction that the /mcp streamable-HTTP handler
      // needs. The refresh-token custom header is NOT read — HTTP-mode
      // refresh state lives in the encrypted SessionStore and the Graph 401
      // refresh path consults the store rather than any header.
      //
      // 03-09 replaces this legacy /mcp mount with the full per-tenant
      // /t/:tenantId/mcp route + authSelector (createBearerMiddleware +
      // createAuthSelectorMiddleware). Until then, this keeps the v1 HTTP
      // route behaviorally compatible WITHOUT the header-read security hole.
      // CR-03 fix: enforce verified tid check on the legacy /mcp mount
      // (same tenant discipline as createBearerMiddleware in
      // src/lib/microsoft-auth.ts). Without this, an operator who forgets to
      // configure tenants in Postgres but still starts the server in HTTP
      // mode gets a working /mcp endpoint that routes to whatever single
      // tenant the env vars point at — the opposite of the multi-tenant
      // isolation promise. When MS365_MCP_TENANT_ID is set to a real tenant
      // GUID (not 'common'), reject any inbound bearer whose JWT tid does
      // not match. Plan 03-09 retires this entire legacy mount; until then,
      // this is the inline guard.
      const legacySecrets = this.secrets;
      const legacyMcpRouteRateLimit = createHttpRouteRateLimit();
      const legacyMcpRateLimit = createRateLimitMiddleware({ redis: getRedis() });
      const seedLegacyRateLimitTenant: RequestHandler = (req, _res, next) => {
        const tenantReq = req as Request & { tenant?: TenantRow };
        tenantReq.tenant ??= { id: LEGACY_SINGLE_TENANT_KEY, rate_limits: null } as TenantRow;
        next();
      };
      const legacyMcpAccessTokenExtractor = async (
        req: Request & { microsoftAuth?: { accessToken: string } },
        res: Response,
        next: express.NextFunction
      ): Promise<void> => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.setHeader(
            'WWW-Authenticate',
            buildWwwAuthenticate({
              req,
              error: 'bearer_token_required',
              errorDescription: 'Bearer token required',
            })
          );
          res.status(401).json({ error: 'Missing or invalid access token' });
          return;
        }
        const token = authHeader.substring(7);

        const expectedTid = legacySecrets?.tenantId;
        if (expectedTid && expectedTid !== 'common') {
          try {
            const payload = await verifyMicrosoftBearerToken({
              token,
              tenantId: expectedTid,
              clientId: legacySecrets?.clientId,
              cloudType: legacySecrets?.cloudType ?? 'global',
            });
            if (typeof payload.tid !== 'string') {
              res.setHeader(
                'WWW-Authenticate',
                buildWwwAuthenticate({
                  req,
                  error: 'invalid_token',
                  errorDescription: 'Invalid token',
                })
              );
              res.status(401).json({ error: 'invalid_token', detail: 'missing_tid_claim' });
              return;
            }
            if (payload.tid.toLowerCase() !== expectedTid.toLowerCase()) {
              res.setHeader(
                'WWW-Authenticate',
                buildWwwAuthenticate({
                  req,
                  error: 'invalid_token',
                  errorDescription: 'Invalid token',
                })
              );
              res.status(401).json({
                error: 'tenant_mismatch',
                detail: 'JWT tid does not match configured MS365_MCP_TENANT_ID',
              });
              return;
            }
          } catch (err) {
            logger.info({ err: (err as Error).message }, 'legacy /mcp: JWT verification failed');
            res.setHeader(
              'WWW-Authenticate',
              buildWwwAuthenticate({
                req,
                error: 'invalid_token',
                errorDescription: 'Invalid token',
              })
            );
            res.status(401).json({ error: 'invalid_token' });
            return;
          }
        }

        req.microsoftAuth = { accessToken: token };
        next();
      };

      // Handle both GET and POST methods as required by MCP Streamable HTTP specification
      // codeql[js/missing-rate-limiting]: legacyMcpRateLimit gates this route before bearer-token handling.
      app.get(
        '/mcp',
        legacyMcpRouteRateLimit,
        seedLegacyRateLimitTenant,
        legacyMcpRateLimit,
        legacyMcpAccessTokenExtractor,
        async (req: Request & { microsoftAuth?: { accessToken: string } }, res: Response) => {
          const handler = async () => {
            const server = this.createMcpServer();
            const transport = new ExpressStreamableHTTPServerTransport({
              sessionIdGenerator: undefined, // Stateless mode
            });

            const cleanup = onceAsync(() =>
              Promise.all([transport.close(), server.close()]).then(() => undefined)
            );
            res.once('close', () => {
              void cleanup();
            });

            await server.connect(transport);
            await transport.handleRequest(req as any, res as any, undefined);
          };

          try {
            if (req.microsoftAuth) {
              // Merge access token into the existing ALS context (which already
              // carries requestId + tenantId from the pino-http middleware
              // above). Refresh token is NOT populated; the Graph 401 handler
              // consults SessionStore instead of reading a custom request
              // header (plan 03-07, SECUR-02).
              const existing = getRequestTokens() ?? {};
              await requestContext.run(
                {
                  ...existing,
                  accessToken: req.microsoftAuth.accessToken,
                },
                handler
              );
            } else {
              await handler();
            }
          } catch (error) {
            logger.error('Error handling MCP GET request:', error);
            if (!res.headersSent) {
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal server error',
                },
                id: null,
              });
            }
          }
        }
      );

      // codeql[js/missing-rate-limiting]: legacyMcpRateLimit gates this route before bearer-token handling.
      app.post(
        '/mcp',
        legacyMcpRouteRateLimit,
        seedLegacyRateLimitTenant,
        legacyMcpRateLimit,
        legacyMcpAccessTokenExtractor,
        async (req: Request & { microsoftAuth?: { accessToken: string } }, res: Response) => {
          const handler = async () => {
            const server = this.createMcpServer();
            const transport = new ExpressStreamableHTTPServerTransport({
              sessionIdGenerator: undefined, // Stateless mode
            });

            const cleanup = onceAsync(() =>
              Promise.all([transport.close(), server.close()]).then(() => undefined)
            );
            res.once('close', () => {
              void cleanup();
            });

            await server.connect(transport);
            await transport.handleRequest(req as any, res as any, req.body);
          };

          try {
            if (req.microsoftAuth) {
              // Merge access token into the existing ALS context (requestId +
              // tenantId from pino-http). Refresh token NOT populated — the
              // Graph 401 path consults SessionStore instead (plan 03-07).
              const existing = getRequestTokens() ?? {};
              await requestContext.run(
                {
                  ...existing,
                  accessToken: req.microsoftAuth.accessToken,
                },
                handler
              );
            } else {
              await handler();
            }
          } catch (error) {
            logger.error('Error handling MCP POST request:', error);
            if (!res.headersSent) {
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal server error',
                },
                id: null,
              });
            }
          }
        }
      );

      // Health check endpoint
      app.get('/', (req, res) => {
        res.send('Microsoft 365 MCP Server is running');
      });

      // Bind the http.Server return value so we can register graceful-shutdown
      // hooks against it (plan 01-05). The shutdown registry closes every
      // registered listener (main HTTP and optional metrics) on the same signal.
      let httpServer: import('node:http').Server;
      if (host) {
        httpServer = app.listen(port, host, () => {
          logger.info(`Server listening on ${host}:${port}`);
          logger.info(`  - MCP endpoint: http://${host}:${port}/mcp`);
          logger.info(`  - OAuth endpoints: http://${host}:${port}/auth/*`);
          logger.info(
            `  - OAuth discovery: http://${host}:${port}/.well-known/oauth-authorization-server`
          );
        });
      } else {
        httpServer = app.listen(port, () => {
          logger.info(`Server listening on all interfaces (0.0.0.0:${port})`);
          logger.info(`  - MCP endpoint: http://localhost:${port}/mcp`);
          logger.info(`  - OAuth endpoints: http://localhost:${port}/auth/*`);
          logger.info(
            `  - OAuth discovery: http://localhost:${port}/.well-known/oauth-authorization-server`
          );
        });
      }
      registerShutdownHooks(httpServer, logger);

      // region:phase6-metrics-server (filled by 06-03 — OPS-07)
      // Host the PrometheusExporter's getMetricsRequestHandler behind an
      // optional Bearer gate on a dedicated port (default 9464 per D-08),
      // and wire the mcp_oauth_pkce_store_size observable gauge to the active
      // PkceStore instance. Dynamic imports so the module-load cost is only
      // paid when operators actually enable Prometheus.
      if (
        process.env.MS365_MCP_PROMETHEUS_ENABLED === '1' ||
        process.env.MS365_MCP_PROMETHEUS_ENABLED === 'true'
      ) {
        try {
          const { prometheusExporter } = await import('./lib/otel.js');
          if (prometheusExporter) {
            const { createMetricsServer } = await import('./lib/metrics-server/metrics-server.js');
            const { wirePkceStoreGauge } = await import('./lib/otel-metrics.js');
            const metricsPortEnv = process.env.MS365_MCP_METRICS_PORT;
            const metricsPort =
              metricsPortEnv !== undefined && metricsPortEnv !== '' ? Number(metricsPortEnv) : 9464;
            const metricsServer = createMetricsServer(prometheusExporter, {
              port: metricsPort,
              bearerToken: process.env.MS365_MCP_METRICS_BEARER ?? null,
              host: process.env.MS365_MCP_METRICS_HOST,
            });
            // Attach mcp_oauth_pkce_store_size — observable gauge polls
            // pkceStore.size() on each collection interval.
            wirePkceStoreGauge(this.pkceStore);
            // Register shutdown hook so graceful-shutdown (plan 01-05) closes
            // the metrics listener alongside the main HTTP server.
            registerShutdownHooks(metricsServer, logger);
          } else {
            logger.warn(
              'plan 06-03: MS365_MCP_PROMETHEUS_ENABLED is truthy but prometheusExporter is undefined — check OTel bootstrap (src/lib/otel.ts)'
            );
          }
        } catch (err) {
          logger.error(
            { err: (err as Error).message },
            'plan 06-03: failed to start metrics server'
          );
        }
      }
      // endregion:phase6-metrics-server
    } else {
      const transport = new StdioServerTransport();
      await this.server!.connect(transport);
      logger.info('Server connected to stdio transport');
    }
  }
}

export default MicrosoftGraphServer;

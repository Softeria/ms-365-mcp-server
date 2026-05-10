import { AsyncLocalStorage } from 'node:async_hooks';
import type { ClientCapabilityProfile } from './lib/mcp-capabilities/profile.js';
import type { TenantRow } from './lib/tenant/tenant-row.js';

/**
 * Phase 3 plan 03-05 addition: authentication flow carried in request
 * context. Populated by:
 *   - delegated  — 03-06 OAuth callback after MSAL acquire
 *   - app-only   — 03-06 client-credentials middleware
 *   - bearer     — 03-06 bearer pass-through middleware
 *   - device-code — stdio interactive auth (AuthManager.acquireTokenByDeviceCode)
 */
export type AuthFlow = 'delegated' | 'app-only' | 'bearer' | 'device-code';

export interface RequestContext {
  accessToken?: string; // was required — now OPTIONAL (non-HTTP callers may not set it)
  clientAccessToken?: string; // Stable MCP bearer presented by the HTTP client.
  refreshToken?: string;
  // Phase 1 additions:
  requestId?: string;
  tenantId?: string | null; // Phase 1 placeholder; set by 03-08 loadTenant middleware
  tenantRow?: TenantRow;
  // Phase 2 additions (plan 02-01 scaffold; populated by 02-02 RetryHandler):
  retryCount?: number; // Number of retries performed by RetryHandler (02-02)
  lastStatus?: number; // HTTP status of the final response returned by the pipeline
  // Reserved for Phase 6 auto-batch coalescer (D-07); 02-01 only declares the shape.
  graph?: {
    coalesce?: boolean;
  };
  // Phase 3 plan 03-05 additions — populated by 03-06 auth middlewares:
  flow?: AuthFlow; // which identity flow produced this request
  authClientId?: string; // tenant-row client_id that authenticated the call (audit correlation)
  // Phase 5 plan 05-04 additions — populated by server.ts at /t/:tenantId/mcp
  // entry (HTTP mode) + src/index.ts at stdio bootstrap (stdio mode). Consumed
  // by dispatch-guard (src/lib/tool-selection/dispatch-guard.ts) at the top
  // of executeGraphTool (src/graph-tools.ts). TENANT-08 isolation.
  enabledToolsSet?: ReadonlySet<string>;
  enabledToolsExplicit?: boolean;
  presetVersion?: string;
  // Phase 5.1 plan 05.1-06 additions — populated by loadTenant middleware
  // (src/lib/tenant/load-tenant.ts) from the tenants row. Consumed by
  // src/lib/dispatch/product-routing.ts when the tool alias carries a
  // known product prefix (__powerbi__ / __pwrapps__ / __pwrauto__ /
  // __exo__ / __spadmin__). Both fields are optional — only the `exo`
  // and `sp-admin` products consume them; other products tolerate absent.
  /**
   * Tenant's Azure AD tenant ID (GUID). Required for Exchange Admin
   * (`__exo__*`) dispatch — substituted into
   * `https://outlook.office365.com/adminapi/beta/{tenantId}`. Validated
   * against UUID regex before substitution (T-5.1-05-f).
   *
   * Sourced from `tenants.tenant_id` (DB column — existing). In HTTP mode,
   * loadTenant middleware populates this from the loaded row.
   */
  tenantAzureId?: string;
  /**
   * Tenant's single-label SharePoint hostname. Required for SharePoint
   * Admin (`__spadmin__*`) dispatch — substituted into the tenant-scoped
   * base URL and audience scope. Validated against Zod
   * `/^[a-z0-9-]{1,63}$/` before URL / scope construction (T-5.1-06-c).
   *
   * Sourced from `tenants.sharepoint_domain` (Task 3 migration
   * 20260801000000). `null` when the tenant hasn't configured SharePoint
   * admin access; dispatch returns a structured MCP tool error with
   * `code: sp_admin_not_configured` directing operators to PATCH the
   * tenant row.
   */
  sharepointDomain?: string | null;
  /**
   * Plan 06-02 (OPS-05, D-06). Full tool alias captured at dispatch time and
   * consumed by GraphClient.makeRequest to emit `tool.alias` span attribute.
   * The metric label uses the workload prefix (labelForTool(alias)); the span
   * attribute keeps the full alias for high-fidelity trace queries.
   */
  toolAlias?: string;
  /**
   * Phase 8 session/request capability profile. Ephemeral only: seeded from
   * Streamable HTTP initialize/session data or stdio defaults and never
   * persisted to Postgres.
   */
  capabilityProfile?: ClientCapabilityProfile;
  /** Authenticated user/session owner for user-scoped editable skills. */
  ownerSubject?: string;
}

const REQUEST_CONTEXT_KEY = Symbol.for('ms-365-mcp-server.requestContext');

type RequestContextGlobal = typeof globalThis & {
  [REQUEST_CONTEXT_KEY]?: AsyncLocalStorage<RequestContext>;
};

const requestContextGlobal = globalThis as RequestContextGlobal;
export const requestContext =
  requestContextGlobal[REQUEST_CONTEXT_KEY] ?? new AsyncLocalStorage<RequestContext>();
requestContextGlobal[REQUEST_CONTEXT_KEY] = requestContext;

export function getRequestTokens(): RequestContext | undefined {
  return requestContext.getStore();
}

export function getRequestOwnerSubject(): string | undefined {
  const value = requestContext.getStore()?.ownerSubject;
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Return the current request's auth flow (delegated | app-only | bearer |
 * device-code), or undefined outside a request context. Used by audit
 * writers (03-10) and per-flow OTel spans.
 */
export function getFlow(): AuthFlow | undefined {
  return requestContext.getStore()?.flow;
}

/**
 * Phase 5 plan 05-04 helper: surface the tenant triple (id, enabled set,
 * preset version) for dispatch-guard invocation inside `executeGraphTool`.
 * Returns the three fields that the guard needs, leaving other context
 * fields private to their respective consumers.
 *
 * Outside an active request context, all three fields are undefined —
 * callers MUST treat that as a fail-closed signal (checkDispatch does).
 */
export function getRequestTenant(): {
  id?: string;
  enabledToolsSet?: ReadonlySet<string>;
  enabledToolsExplicit?: boolean;
  presetVersion?: string;
} {
  const ctx = requestContext.getStore();
  return {
    id: ctx?.tenantId ?? undefined,
    enabledToolsSet: ctx?.enabledToolsSet,
    enabledToolsExplicit: ctx?.enabledToolsExplicit,
    presetVersion: ctx?.presetVersion,
  };
}

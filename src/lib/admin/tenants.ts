/**
 * Admin /tenants CRUD + rotate-secret + cryptoshred cascade (plan 04-02,
 * ADMIN-01, D-10/D-12/D-13/D-14).
 *
 * Endpoints:
 *   POST   /admin/tenants              — create (insert row + wrap fresh DEK in one txn)
 *   GET    /admin/tenants              — list (cursor pagination; wrapped_dek OMITTED)
 *   GET    /admin/tenants/:id          — get single (wrapped_dek OMITTED)
 *   PATCH  /admin/tenants/:id          — partial update + publish invalidation
 *   PATCH  /admin/tenants/:id/rotate-secret — mint new DEK + evict pool + publish
 *   PATCH  /admin/tenants/:id/disable  — cryptoshred cascade (wrapped_dek=NULL,
 *                                        api_keys revoked, Redis cache+pkce scanned)
 *   DELETE /admin/tenants/:id          — cryptoshred + DELETE FROM tenants (CASCADE)
 *
 * Security invariants:
 *   - wrapped_dek NEVER SELECTed into any response body — TENANT_SELECT_COLUMNS
 *     explicitly omits it. Only the insert / disable / delete paths touch it
 *     and only via NULL-assignment or UPDATE with parameterized JSONB.
 *   - audit_log.meta NEVER contains raw DEK bytes or wrapped_dek JSON. Hashes
 *     (wrappedDekHash) identify rotations without revealing the envelope.
 *   - GUID regex validation runs BEFORE scanDel pattern construction so a
 *     caller-controlled :id=`*` cannot expand into mcp:cache:*:* (WR-04 /
 *     T-04-05).
 *   - Redis readiness guard refuses to queue cryptoshred commands against a
 *     reconnecting client — Pitfall 6 from Phase 3 RESEARCH.md:760. Queued
 *     commands would re-execute after a later request re-populates the cache.
 *   - RBAC is SQL-param enforced, not result-filter enforced: the effective
 *     tenant filter is injected into the WHERE clause. Tests fail closed on
 *     the no-info-leak path by returning 404 on cross-tenant GET/PATCH rather
 *     than 403 (D-13).
 *   - validateRedirectUri runs BEFORE any DB write on both POST and PATCH;
 *     invalid URIs return 400 with the offending URI redacted to prevent
 *     echoing javascript:/data: payloads back to the caller (T-04-04a).
 *
 * Phase 3 primitives reused (plan is glue code, not new primitives):
 *   - generateTenantDek(kek)        src/lib/crypto/dek.ts
 *   - publishTenantInvalidation     src/lib/tenant/tenant-invalidation.ts
 *   - tenantPool.evict(tenantId)    src/lib/tenant/tenant-pool.ts
 *   - writeAudit / writeAuditStandalone  src/lib/audit.ts
 *   - validateRedirectUri           src/lib/redirect-uri.ts
 *   - withTransaction               src/lib/postgres.ts
 *
 * Cryptoshred cascade (from bin/disable-tenant.mjs:97-218, verbatim):
 *   1. UPDATE tenants SET disabled_at=NOW(), wrapped_dek=NULL
 *   2. UPDATE api_keys SET revoked_at=NOW() WHERE tenant_id=$1 (same txn)
 *   3. scanDel mcp:cache:{tid}:* (post-commit, retryable)
 *   4. scanDel mcp:pkce:{tid}:*  (post-commit, retryable)
 *   5. tenantPool.evict(tid)     (synchronous)
 *   6. publishTenantInvalidation (cross-replica LRU eviction)
 *   7. writeAuditStandalone      (own connection — never throws)
 *
 * DELETE adds: scanDel mcp:webhook:dedup:*{tid}* + DELETE FROM tenants
 *   (FK CASCADE flushes audit_log, api_keys, delta_tokens, subscriptions).
 *   NOTE: The admin.tenant.delete audit row is written BEFORE the DELETE so
 *   it FK-cascades with the tenant. Durability is provided by a pino info
 *   log — captured by OTel export for external observability. Documented
 *   trade-off (T-04-05f) of the FK-CASCADE cryptoshred design.
 */
import { Router, type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withTransaction } from '../postgres.js';
import { writeAudit, writeAuditStandalone } from '../audit.js';
import {
  problemBadRequest,
  problemConflict,
  problemForbidden,
  problemInternal,
  problemNotFound,
  problemJson,
} from './problem-json.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import { generateTenantDek } from '../crypto/dek.js';
import { validateRedirectUri, type RedirectUriPolicy } from '../redirect-uri.js';
import { publishTenantInvalidation } from '../tenant/tenant-invalidation.js';
import {
  publishResourcesListChanged,
  publishToolsListChanged,
} from '../mcp-notifications/events.js';
import { API_KEY_REVOKE_CHANNEL, evictApiKeyFromCacheByKeyId } from './api-keys.js';
import logger from '../../logger.js';
import type { AdminRouterDeps } from './router.js';
import type { RedisClient } from '../redis.js';
import { DEFAULT_PRESET_VERSION } from '../tool-selection/preset-loader.js';
import {
  computeSyncedAllowedScopes,
  fetchConsentedGraphDelegatedScopes,
  normalizeGraphDelegatedScopes,
} from './scope-sync.js';

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * Wire row returned by every tenants endpoint. snake_case per D-14. The
 * wrapped_dek field is intentionally ABSENT — TENANT_SELECT_COLUMNS omits it
 * at the SQL boundary so it cannot be accidentally serialised.
 */
export interface TenantWireRow {
  id: string;
  mode: 'delegated' | 'app-only' | 'bearer';
  client_id: string;
  client_secret_ref: string | null;
  tenant_id: string;
  cloud_type: 'global' | 'china';
  redirect_uri_allowlist: string[];
  cors_origins: string[];
  allowed_scopes: string[];
  enabled_tools: string | null;
  /**
   * Plan 05-03 (D-19). Pinned preset version — defaults to 'essentials-v1'
   * on POST /admin/tenants when the body omits it; operators bump via PATCH.
   */
  preset_version: string;
  /**
   * Plan 5.1-06 (T-5.1-06-c). Single-label SharePoint hostname
   * (e.g. `contoso`) used by `__spadmin__*` dispatch to substitute into
   * both baseUrl and audience scope. NULL when unset; dispatch returns
   * a structured MCP tool error (`sp_admin_not_configured`) directing
   * operators to PATCH this field.
   */
  sharepoint_domain: string | null;
  /**
   * Plan 06-04 (D-11). Per-tenant rate-limit overrides. NULL inherits the
   * platform defaults from MS365_MCP_DEFAULT_REQ_PER_MIN and
   * MS365_MCP_DEFAULT_GRAPH_POINTS_PER_MIN env vars at consume time
   * (src/lib/rate-limit/defaults.ts::resolveRateLimits).
   */
  rate_limits: { request_per_min: number; graph_points_per_min: number } | null;
  slug: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Admin identity attached by the dual-stack middleware (plan 04-04). Local
 * shape mirrors AdminIdentity union members so we don't import them and
 * avoid a cycle.
 */
interface AdminContext {
  actor: string;
  source: 'entra' | 'api-key';
  tenantScoped: string | null;
}

// Express 5's IRouterMatcher infers P from the path literal. Using
// `Request<any, any, any, any>` sidesteps the overload mismatch for custom
// handler signatures; admin.* and req.id are declaration-merged globally in
// src/lib/admin/auth/dual-stack.ts, so RequestWithAdmin stays a thin alias.
type RequestWithAdmin = Request<any, any, any, any>;

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * RFC 4122 GUID regex — copied from src/lib/tenant/load-tenant.ts so Postgres
 * param types stay consistent with the routing layer. Shields scanDel pattern
 * construction from caller-controlled wildcard injection (WR-04).
 */
const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GRAPH_SCOPE_SYNC_TOKEN_HEADER = 'x-ms365-graph-token';

/**
 * Explicit column list for SELECT. wrapped_dek INTENTIONALLY omitted — the
 * envelope never travels over the wire. client_secret_ref is an env-var /
 * Key-Vault REFERENCE, not the secret value, so it is safe to return.
 */
const TENANT_SELECT_COLUMNS = `
  id, mode, client_id, client_secret_ref, tenant_id, cloud_type,
  redirect_uri_allowlist, cors_origins, allowed_scopes, enabled_tools,
  preset_version,
  sharepoint_domain,
  rate_limits,
  slug, disabled_at, created_at, updated_at
`;

// ── Zod validators (snake_case wire) ────────────────────────────────────────

/**
 * Plan 06-04 (D-11). Per-tenant rate-limit override shape validated on admin
 * PATCH. Positive-int + sensible caps (defense against `Infinity`, `-1`,
 * accidental `'100'` string, T-06-04-b). `strict()` rejects extra keys so
 * typos in operator JSON fail loud rather than silently drift.
 */
const RateLimitsZod = z
  .object({
    request_per_min: z.number().int().positive().max(1_000_000),
    graph_points_per_min: z.number().int().positive().max(10_000_000),
  })
  .strict();

const CreateTenantZod = z.object({
  mode: z.enum(['delegated', 'app-only', 'bearer']),
  client_id: z.string().min(1).max(256),
  client_secret_ref: z.string().min(1).max(256).optional().nullable(),
  tenant_id: z.string().regex(TENANT_GUID, 'invalid Entra tenant GUID'),
  cloud_type: z.enum(['global', 'china']).default('global'),
  redirect_uri_allowlist: z.array(z.string().url()).default([]),
  cors_origins: z.array(z.string().url()).default([]),
  allowed_scopes: z.array(z.string().min(1).max(256)).default([]),
  enabled_tools: z.string().max(8192).optional().nullable(),
  // Plan 05-03 (D-19). Preset identifier — lowercase alphanumeric + hyphen,
  // max 64 chars to match the migration column width budget. Optional on
  // incoming body; DB DEFAULT 'essentials-v1' supplies the baseline.
  preset_version: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'preset_version must be lowercase alphanumeric + hyphen')
    .optional(),
  // Plan 5.1-06 (T-5.1-06-c). Single-label SharePoint hostname for
  // __spadmin__* dispatch. Defense-in-depth regex: lowercase alphanumeric
  // plus dashes, 1-63 chars. Rejects dots (URL injection shape),
  // uppercase, slashes, and special chars. Dispatch re-applies the same
  // regex before URL / scope construction. Nullable + optional — absence
  // is how most tenants start.
  sharepoint_domain: z
    .string()
    .regex(/^[a-z0-9-]{1,63}$/, {
      message: 'sharepoint_domain must be lowercase alphanumeric + dashes, 1-63 chars',
    })
    .nullable()
    .optional(),
  // Plan 06-04 (D-11). Per-tenant rate-limit override. Null/absent = platform
  // defaults apply at consume time (MS365_MCP_DEFAULT_* env vars).
  rate_limits: RateLimitsZod.nullable().optional(),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .nullable(),
});

const PatchTenantZod = CreateTenantZod.partial().strict();

const SyncScopesZod = z
  .object({
    dry_run: z.boolean().default(false),
    replace_all: z.boolean().default(false),
    graph_scopes: z.array(z.string().min(1).max(256)).optional(),
  })
  .strict();

const ListTenantsZod = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  include_disabled: z
    .union([z.boolean(), z.string()])
    .optional()
    .default(false)
    .transform((v) => v === true || v === 'true' || v === '1'),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise a tenants row into the public wire shape. Handles pg-mem's
 * string-typed JSONB columns as well as real pg's parsed-object columns.
 */
export function tenantRowToWire(row: {
  id: string;
  mode: string;
  client_id: string;
  client_secret_ref: string | null;
  tenant_id: string;
  cloud_type: string;
  redirect_uri_allowlist: unknown;
  cors_origins: unknown;
  allowed_scopes: unknown;
  enabled_tools: string | null;
  preset_version?: string | null;
  sharepoint_domain?: string | null;
  rate_limits?: unknown;
  slug: string | null;
  disabled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}): TenantWireRow {
  const parseJsonbArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v as string[];
    if (typeof v === 'string' && v.length > 0) {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const toIso = (d: Date | string | null): string | null => {
    if (d === null) return null;
    if (d instanceof Date) return d.toISOString();
    return String(d);
  };
  const toIsoNonNull = (d: Date | string): string => {
    if (d instanceof Date) return d.toISOString();
    return String(d);
  };

  // Plan 05-03 (D-19). pg-mem emits '' when a TEXT NOT NULL DEFAULT is read
  // in an edge case; real Postgres returns the default string. Coalesce to
  // 'essentials-v1' defensively so the wire shape is always meaningful.
  const presetVersion =
    typeof row.preset_version === 'string' && row.preset_version.length > 0
      ? row.preset_version
      : 'essentials-v1';

  // Plan 06-04 (D-11). JSONB comes from pg as a parsed object, from pg-mem as
  // a string. Normalise to either the typed object shape or null. Malformed
  // JSON is treated as null (defensive — admin PATCH Zod validates on write,
  // so this only defends against manual DB corruption).
  const parseRateLimits = (
    v: unknown
  ): { request_per_min: number; graph_points_per_min: number } | null => {
    if (v === null || v === undefined) return null;
    let candidate: unknown = v;
    if (typeof v === 'string') {
      if (v.length === 0) return null;
      try {
        candidate = JSON.parse(v);
      } catch {
        return null;
      }
    }
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      typeof (candidate as { request_per_min?: unknown }).request_per_min === 'number' &&
      typeof (candidate as { graph_points_per_min?: unknown }).graph_points_per_min === 'number'
    ) {
      const o = candidate as { request_per_min: number; graph_points_per_min: number };
      return {
        request_per_min: o.request_per_min,
        graph_points_per_min: o.graph_points_per_min,
      };
    }
    return null;
  };

  return {
    id: row.id,
    mode: row.mode as 'delegated' | 'app-only' | 'bearer',
    client_id: row.client_id,
    client_secret_ref: row.client_secret_ref,
    tenant_id: row.tenant_id,
    cloud_type: row.cloud_type as 'global' | 'china',
    redirect_uri_allowlist: parseJsonbArray(row.redirect_uri_allowlist),
    cors_origins: parseJsonbArray(row.cors_origins),
    allowed_scopes: parseJsonbArray(row.allowed_scopes),
    enabled_tools: row.enabled_tools,
    preset_version: presetVersion,
    // Plan 5.1-06 — pass through unchanged. NULL → null (distinction
    // matters: dispatch treats NULL as "not configured" and returns
    // `sp_admin_not_configured` MCP tool error).
    sharepoint_domain: row.sharepoint_domain ?? null,
    // Plan 06-04 (D-11). Pass through parsed JSONB or null.
    rate_limits: parseRateLimits(row.rate_limits),
    slug: row.slug,
    disabled_at: toIso(row.disabled_at),
    created_at: toIsoNonNull(row.created_at),
    updated_at: toIsoNonNull(row.updated_at),
  };
}

/**
 * Build the RedirectUriPolicy used by both POST and PATCH validators. Reads
 * the same env vars as src/server.ts so admin + registration surfaces stay
 * coherent (no divergence between which hosts are allowlisted).
 */
function buildRedirectUriPolicy(): RedirectUriPolicy {
  const isDev =
    process.env.NODE_ENV === 'development' || process.env.MS365_MCP_REDIRECT_URI_MODE === 'dev';
  const publicUrl = process.env.MS365_MCP_PUBLIC_URL ?? process.env.MS365_MCP_BASE_URL ?? null;
  let publicUrlHost: string | null = null;
  if (publicUrl) {
    try {
      publicUrlHost = new URL(publicUrl).hostname;
    } catch {
      publicUrlHost = null;
    }
  }
  return {
    mode: isDev ? 'dev' : 'prod',
    publicUrlHost,
  };
}

/**
 * Classify a validator rejection into a category safe to send back on the
 * wire. Never echoes the raw `reason` string because it may contain the
 * offending URI, its scheme (javascript:, data:, file:), or the rejected
 * hostname — any of which would let an attacker confirm a payload round-tripped.
 */
function redactedRejectionCategory(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes('forbidden scheme')) return 'scheme not allowed';
  if (lower.includes('non-http')) return 'scheme not allowed';
  if (lower.includes('not a valid url')) return 'malformed URL';
  if (lower.includes('host not in allowlist')) return 'host not in allowlist';
  return 'rejected';
}

/**
 * Validate every redirect URI against policy. On first violation emits a 400
 * problem+json with the offending URI REDACTED — javascript:/data: payloads
 * must never echo back in the response body (T-04-04a mitigation).
 */
function assertValidRedirectUris(
  res: Response,
  list: string[],
  policy: RedirectUriPolicy,
  instance: string | undefined
): boolean {
  for (const uri of list) {
    const result = validateRedirectUri(uri, policy);
    if (!result.ok) {
      problemJson(res, 400, 'invalid_redirect_uri', {
        title: 'Invalid redirect_uri',
        detail: `redirect_uri rejected: ${redactedRejectionCategory(result.reason)}`,
        instance,
        extensions: { invalid_uri: '<redacted>' },
      });
      return false;
    }
  }
  return true;
}

/**
 * Redis readiness guard — returns false + emits 503 problem+json if the
 * client is in a state where queued commands could leak post-reconnect
 * (Pitfall 6). 'ready' and 'wait' (lazyConnect pre-connect) are both safe.
 */
function redisReadyOrAbort(
  res: Response,
  redis: RedisClient,
  instance: string | undefined
): boolean {
  const status = (redis as unknown as { status?: string }).status;
  if (status !== undefined && status !== 'ready' && status !== 'wait') {
    res.setHeader('Retry-After', '5');
    problemJson(res, 503, 'redis_unavailable', {
      title: 'Service Unavailable',
      detail: `redis not ready (status: ${status})`,
      instance,
      extensions: { redis_status: status },
    });
    return false;
  }
  return true;
}

/**
 * sha256(JSON(envelope))[:16] — used in admin.tenant.rotate-secret audit meta
 * to prove the envelope rotated without leaking the envelope bytes themselves.
 */
function wrappedDekHash(wrappedDek: unknown): string {
  return createHash('sha256').update(JSON.stringify(wrappedDek)).digest('hex').slice(0, 16);
}

/**
 * RBAC helper. Returns true if the admin is allowed to target the given
 * tenant id. tenantScoped=null (global) is always allowed.
 */
function canActOnTenant(admin: AdminContext, tenantId: string | null): boolean {
  if (admin.tenantScoped === null) return true;
  return tenantId !== null && admin.tenantScoped === tenantId;
}

function parseAllowedScopes(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function readGraphBearerToken(req: RequestWithAdmin): string | null {
  const raw = req.headers[GRAPH_SCOPE_SYNC_TOKEN_HEADER];
  const header = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.substring(7).trim();
  return token.length > 0 ? token : null;
}

// ── scanDel (exported — reused by plan 04-07 webhook dedup cleanup path) ───

/**
 * WR-03 SCAN-based deletion. Copied verbatim from bin/disable-tenant.mjs:97-109
 * so the cryptoshred contract is identical between CLI and HTTP paths. SCAN
 * iterates in COUNT-sized batches and yields between cursor advances, unlike
 * KEYS which blocks the Redis single-threaded command queue over the entire
 * keyspace.
 */
export async function scanDel(redis: RedisClient, pattern: string): Promise<number> {
  let cursor = '0';
  let totalDeleted = 0;
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = next;
    if (batch.length > 0) {
      totalDeleted += await redis.del(...batch);
    }
  } while (cursor !== '0');
  return totalDeleted;
}

async function evictRevokedApiKeys(
  redis: RedisClient,
  keyIds: readonly string[],
  tenantId: string,
  operation: 'disable' | 'delete'
): Promise<void> {
  for (const [keyIndex, keyId] of keyIds.entries()) {
    try {
      evictApiKeyFromCacheByKeyId(keyId);
    } catch (err) {
      logger.warn(
        { tenantId, keyIndex, err: (err as Error).message },
        `admin-tenants: api-key cache eviction failed on ${operation}`
      );
    }
    try {
      await redis.publish(API_KEY_REVOKE_CHANNEL, keyId);
    } catch (err) {
      logger.warn(
        { tenantId, keyIndex, err: (err as Error).message },
        `admin-tenants: api-key revoke publish failed on ${operation}`
      );
    }
  }
}

// ── Router factory ──────────────────────────────────────────────────────────

/**
 * Build the /admin/tenants sub-router. Captures deps in a closure so callers
 * hand a single Express router to `createAdminRouter` via
 * `r.use('/tenants', createTenantsRoutes(deps))`.
 */
export function createTenantsRoutes(deps: AdminRouterDeps): Router {
  const r = Router();

  const policy = buildRedirectUriPolicy();

  // POST / — create
  // codeql[js/missing-rate-limiting]: createAdminRouter mounts createAdminRouteRateLimit before this sub-router.
  r.post('/', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    // RBAC: tenant-scoped admin cannot create tenants (T-04-04)
    if (admin.tenantScoped !== null) {
      problemForbidden(res, req.id);
      return;
    }

    const parsed = CreateTenantZod.safeParse(req.body);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((e) => e.message).join('; '), req.id);
      return;
    }
    const body = parsed.data;

    // redirect_uri validation BEFORE any DB write — T-04-04a
    if (!assertValidRedirectUris(res, body.redirect_uri_allowlist, policy, req.id)) {
      return;
    }

    const newId = randomUUID();
    let wrappedDek: unknown;
    try {
      wrappedDek = generateTenantDek(deps.kek).wrappedDek;
    } catch (err) {
      logger.error(
        { err: (err as Error).message },
        'admin-tenants: generateTenantDek failed during create'
      );
      problemInternal(res, req.id);
      return;
    }

    try {
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO tenants (
             id, mode, client_id, client_secret_ref, tenant_id, cloud_type,
             redirect_uri_allowlist, cors_origins, allowed_scopes, enabled_tools,
             preset_version,
             sharepoint_domain,
             rate_limits,
             wrapped_dek, slug
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13::jsonb, $14::jsonb, $15)`,
          [
            newId,
            body.mode,
            body.client_id,
            body.client_secret_ref ?? null,
            body.tenant_id,
            body.cloud_type,
            JSON.stringify(body.redirect_uri_allowlist),
            JSON.stringify(body.cors_origins),
            JSON.stringify(body.allowed_scopes),
            body.enabled_tools ?? null,
            // Phase 7 Plan 07-02: supported admin create path defaults to
            // discovery-v1 via the shared preset-loader constant. Existing
            // tenants are not rewritten, and explicit static presets still
            // persist verbatim.
            body.preset_version ?? DEFAULT_PRESET_VERSION,
            // Plan 5.1-06: optional + nullable. NULL default — operators
            // PATCH later when they want to enable __spadmin__ tools.
            body.sharepoint_domain ?? null,
            // Plan 06-04 (D-11): optional + nullable. NULL inherits from
            // MS365_MCP_DEFAULT_* env vars at consume time.
            body.rate_limits ? JSON.stringify(body.rate_limits) : null,
            JSON.stringify(wrappedDek),
            body.slug ?? null,
          ]
        );
        await writeAudit(client, {
          tenantId: newId,
          actor: admin.actor,
          action: 'admin.tenant.create',
          target: newId,
          ip: req.ip ?? null,
          requestId: req.id ?? 'unknown',
          result: 'success',
          meta: {
            tenantId: newId,
            mode: body.mode,
            cloudType: body.cloud_type,
            clientId: body.client_id,
          },
        });
      });
    } catch (err) {
      const msg = (err as Error).message;
      // Postgres unique-violation code is 23505; pg-mem raises "duplicate key"
      // in the message. Match both forms to surface the slug conflict cleanly.
      if ((err as { code?: string }).code === '23505' || /duplicate|unique|constraint/i.test(msg)) {
        problemConflict(res, 'slug_conflict', req.id);
        return;
      }
      logger.error({ err: msg, tenantId: newId }, 'admin-tenants: INSERT transaction failed');
      problemInternal(res, req.id);
      return;
    }

    try {
      const { rows } = await deps.pgPool.query(
        `SELECT ${TENANT_SELECT_COLUMNS} FROM tenants WHERE id = $1`,
        [newId]
      );
      if (rows.length === 0) {
        logger.error({ tenantId: newId }, 'admin-tenants: inserted row not found on read-back');
        problemInternal(res, req.id);
        return;
      }
      logger.info(
        { tenantId: newId, actor: admin.actor, mode: body.mode },
        'admin-tenants: created'
      );
      res.status(201).json(tenantRowToWire(rows[0]));
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: newId },
        'admin-tenants: read-back query failed after insert'
      );
      problemInternal(res, req.id);
    }
  });

  // GET / — cursor-paginated list
  // codeql[js/missing-rate-limiting]: createAdminRouter mounts createAdminRouteRateLimit before this sub-router.
  r.get('/', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    const parsed = ListTenantsZod.safeParse(req.query);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((e) => e.message).join('; '), req.id);
      return;
    }
    const { cursor: rawCursor, limit, include_disabled: includeDisabled } = parsed.data;

    // RBAC: forced tenant filter for scoped admins.
    const effectiveTenantFilter: string | null = admin.tenantScoped;

    let cursorTs: Date | null = null;
    let cursorId: string | null = null;
    if (rawCursor !== undefined) {
      const decoded = decodeCursor(rawCursor, deps.cursorSecret);
      if (!decoded) {
        problemBadRequest(res, 'invalid_cursor', req.id);
        return;
      }
      cursorTs = new Date(decoded.ts);
      cursorId = decoded.id;
    }

    try {
      const { rows } = await deps.pgPool.query(
        `SELECT ${TENANT_SELECT_COLUMNS} FROM tenants
          WHERE ($1::uuid IS NULL OR id = $1::uuid)
            AND ($2::boolean OR disabled_at IS NULL)
            AND (
              $3::timestamptz IS NULL
              OR (created_at < $3::timestamptz)
              OR (created_at = $3::timestamptz AND id < $4::uuid)
            )
          ORDER BY created_at DESC, id DESC
          LIMIT $5`,
        [effectiveTenantFilter, includeDisabled, cursorTs, cursorId, limit + 1]
      );

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      let nextCursor: string | null = null;
      if (hasMore && page.length > 0) {
        const last = page[page.length - 1];
        const ts = last.created_at instanceof Date ? last.created_at : new Date(last.created_at);
        nextCursor = encodeCursor({ ts: ts.getTime(), id: last.id }, deps.cursorSecret);
      }

      res.status(200).json({
        data: page.map(tenantRowToWire),
        next_cursor: nextCursor,
        has_more: hasMore,
      });
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'admin-tenants: list query failed');
      problemInternal(res, req.id);
    }
  });

  // GET /:id
  // codeql[js/missing-rate-limiting]: createAdminRouter mounts createAdminRouteRateLimit before this sub-router.
  r.get('/:id', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    const id = req.params.id;
    if (!TENANT_GUID.test(id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    // RBAC: scoped admin viewing other tenant → 404 (no-info-leak)
    if (!canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    try {
      const { rows } = await deps.pgPool.query(
        `SELECT ${TENANT_SELECT_COLUMNS} FROM tenants WHERE id = $1`,
        [id]
      );
      if (rows.length === 0) {
        problemNotFound(res, 'tenant', req.id);
        return;
      }
      res.status(200).json(tenantRowToWire(rows[0]));
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: get by id failed'
      );
      problemInternal(res, req.id);
    }
  });

  // POST /:id/sync-scopes — sync tenant.allowed_scopes from Graph delegated consent metadata.
  // This updates operator metadata only. It never revokes/clears OAuth or Graph
  // tokens/sessions; existing sessions keep their SessionStore record.scopes.
  // codeql[js/missing-rate-limiting]: createAdminRouter mounts createAdminRouteRateLimit before this sub-router.
  r.post('/:id/sync-scopes', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    const id = req.params.id;
    if (!TENANT_GUID.test(id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    const parsed = SyncScopesZod.safeParse(req.body ?? {});
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((e) => e.message).join('; '), req.id);
      return;
    }
    const body = parsed.data;

    type TenantScopeSyncRow = {
      id: string;
      tenant_id: string;
      client_id: string;
      cloud_type: 'global' | 'china';
      allowed_scopes: unknown;
      disabled_at: Date | null;
    };

    let row: TenantScopeSyncRow;
    try {
      const { rows } = await deps.pgPool.query<TenantScopeSyncRow>(
        `SELECT id, tenant_id, client_id, cloud_type, allowed_scopes, disabled_at FROM tenants WHERE id = $1`,
        [id]
      );
      if (rows.length === 0) {
        problemNotFound(res, 'tenant', req.id);
        return;
      }
      row = rows[0]!;
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: sync-scopes read failed'
      );
      problemInternal(res, req.id);
      return;
    }

    if (row.disabled_at !== null) {
      problemConflict(res, 'cannot_sync_disabled_tenant', req.id);
      return;
    }

    const previewExistingScopes = parseAllowedScopes(row.allowed_scopes);

    let fetchedGraphScopes: string[];
    let source: 'graph' | 'provided';
    try {
      if (body.graph_scopes !== undefined) {
        fetchedGraphScopes = normalizeGraphDelegatedScopes(body.graph_scopes);
        source = 'provided';
      } else {
        const graphBearerToken = readGraphBearerToken(req);
        if (!graphBearerToken) {
          problemBadRequest(res, 'missing_graph_token_or_graph_scopes', req.id);
          return;
        }
        const fetcher = deps.scopeSyncFetcher ?? fetchConsentedGraphDelegatedScopes;
        fetchedGraphScopes = await fetcher({
          tenantDirectoryId: row.tenant_id,
          clientId: row.client_id,
          cloudType: row.cloud_type,
          graphBearerToken,
        });
        source = 'graph';
      }
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: sync-scopes Graph fetch failed'
      );
      problemJson(res, 502, 'scope_sync_unavailable', {
        title: 'Scope sync unavailable',
        detail: 'Microsoft Graph delegated consent scopes could not be fetched',
        instance: req.id,
      });
      return;
    }

    if (body.dry_run) {
      const previewNextAllowedScopes = computeSyncedAllowedScopes({
        existingScopes: previewExistingScopes,
        fetchedGraphScopes,
        replaceAll: body.replace_all,
      });
      const previewAdded = previewNextAllowedScopes.filter(
        (scope) => !previewExistingScopes.includes(scope)
      );
      const previewRemoved = previewExistingScopes.filter(
        (scope) => !previewNextAllowedScopes.includes(scope)
      );
      res.status(200).json({
        id,
        dry_run: true,
        replace_all: body.replace_all,
        source,
        existing_allowed_scopes: previewExistingScopes,
        fetched_graph_scopes: fetchedGraphScopes,
        next_allowed_scopes: previewNextAllowedScopes,
        added: previewAdded,
        removed: previewRemoved,
      });
      return;
    }

    let existed = true;
    let disabledAfterLock = false;
    let nextAllowedScopes: string[] = [];
    let added: string[] = [];
    let removed: string[] = [];
    try {
      await withTransaction(async (client) => {
        const sel = await client.query<{
          id: string;
          allowed_scopes: unknown;
          disabled_at: Date | null;
        }>(`SELECT id, allowed_scopes, disabled_at FROM tenants WHERE id = $1 FOR UPDATE`, [id]);
        if (sel.rows.length === 0) {
          existed = false;
          return;
        }
        if (sel.rows[0]!.disabled_at !== null) {
          disabledAfterLock = true;
          return;
        }

        const lockedExistingScopes = parseAllowedScopes(sel.rows[0]!.allowed_scopes);
        nextAllowedScopes = computeSyncedAllowedScopes({
          existingScopes: lockedExistingScopes,
          fetchedGraphScopes,
          replaceAll: body.replace_all,
        });
        added = nextAllowedScopes.filter((scope) => !lockedExistingScopes.includes(scope));
        removed = lockedExistingScopes.filter((scope) => !nextAllowedScopes.includes(scope));

        await client.query(
          `UPDATE tenants SET allowed_scopes = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(nextAllowedScopes), id]
        );
        await writeAudit(client, {
          tenantId: id,
          actor: admin.actor,
          action: 'admin.tenant.sync-scopes',
          target: id,
          ip: req.ip ?? null,
          requestId: req.id ?? 'unknown',
          result: 'success',
          meta: {
            tenantId: id,
            source,
            replaceAll: body.replace_all,
            addedCount: added.length,
            removedCount: removed.length,
            sessionInvalidation: false,
          },
        });
      });
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: sync-scopes transaction failed'
      );
      problemInternal(res, req.id);
      return;
    }
    if (!existed) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (disabledAfterLock) {
      problemConflict(res, 'cannot_sync_disabled_tenant', req.id);
      return;
    }

    // AFTER commit: invalidate tenant metadata caches only. Do not revoke tokens,
    // delete PKCE/session/cache keys, or force OAuth/Graph session refresh.
    try {
      await publishTenantInvalidation(deps.redis, id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: publishTenantInvalidation failed on sync-scopes; TTL fallback'
      );
    }
    try {
      if (
        typeof (deps.tenantPool as unknown as { invalidate?: (id: string) => void }).invalidate ===
        'function'
      ) {
        (deps.tenantPool as unknown as { invalidate: (id: string) => void }).invalidate(id);
      } else {
        deps.tenantPool.evict(id);
      }
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: tenantPool invalidation threw on sync-scopes'
      );
    }

    logger.info(
      {
        tenantId: id,
        actor: admin.actor,
        source,
        addedCount: added.length,
        removedCount: removed.length,
      },
      'admin-tenants: synced allowed_scopes'
    );
    res.status(200).json({
      id,
      dry_run: false,
      replace_all: body.replace_all,
      source,
      allowed_scopes: nextAllowedScopes,
      fetched_graph_scopes: fetchedGraphScopes,
      added,
      removed,
    });
  });

  // PATCH /:id
  r.patch('/:id', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    const id = req.params.id;
    if (!TENANT_GUID.test(id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    const parsed = PatchTenantZod.safeParse(req.body);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((e) => e.message).join('; '), req.id);
      return;
    }
    const body = parsed.data;
    const fieldsChanged = Object.keys(body);
    if (fieldsChanged.length === 0) {
      problemJson(res, 400, 'empty_patch', {
        title: 'Empty patch',
        detail: 'at least one field required',
        instance: req.id,
      });
      return;
    }

    // redirect_uri validation BEFORE DB write
    if (
      body.redirect_uri_allowlist &&
      !assertValidRedirectUris(res, body.redirect_uri_allowlist, policy, req.id)
    ) {
      return;
    }

    // Build dynamic UPDATE with parameterized fields.
    const setParts: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const addSet = (col: string, value: unknown, jsonb = false): void => {
      if (jsonb) {
        setParts.push(`${col} = $${idx}::jsonb`);
      } else {
        setParts.push(`${col} = $${idx}`);
      }
      params.push(value);
      idx++;
    };
    if (body.mode !== undefined) addSet('mode', body.mode);
    if (body.client_id !== undefined) addSet('client_id', body.client_id);
    if (body.client_secret_ref !== undefined) addSet('client_secret_ref', body.client_secret_ref);
    if (body.tenant_id !== undefined) addSet('tenant_id', body.tenant_id);
    if (body.cloud_type !== undefined) addSet('cloud_type', body.cloud_type);
    if (body.redirect_uri_allowlist !== undefined)
      addSet('redirect_uri_allowlist', JSON.stringify(body.redirect_uri_allowlist), true);
    if (body.cors_origins !== undefined)
      addSet('cors_origins', JSON.stringify(body.cors_origins), true);
    if (body.allowed_scopes !== undefined)
      addSet('allowed_scopes', JSON.stringify(body.allowed_scopes), true);
    if (body.enabled_tools !== undefined) addSet('enabled_tools', body.enabled_tools);
    // Plan 05-03 (D-19). PATCH writes the new preset_version verbatim; no
    // auto-migration of enabled_tools here — that is an admin-owned decision.
    if (body.preset_version !== undefined) addSet('preset_version', body.preset_version);
    // Plan 5.1-06 (T-5.1-06-c). PATCH with null clears (dispatch falls back
    // to `sp_admin_not_configured` MCP error); PATCH with a validated
    // string updates. Zod has already applied the regex guard for non-null
    // values by this point.
    if (body.sharepoint_domain !== undefined) addSet('sharepoint_domain', body.sharepoint_domain);
    // Plan 06-04 (D-11). Per-tenant rate-limit override. `null` clears (falls
    // back to platform defaults); an object JSONB-writes via the same addSet
    // helper that sharepoint/allowed_scopes/etc. use. fieldsChanged picks up
    // 'rate_limits' automatically for the audit-log row.
    if (body.rate_limits !== undefined) {
      addSet(
        'rate_limits',
        body.rate_limits === null ? null : JSON.stringify(body.rate_limits),
        true /* jsonb */
      );
    }
    if (body.slug !== undefined) addSet('slug', body.slug);
    setParts.push(`updated_at = NOW()`);
    const whereIdx = idx;
    params.push(id);

    const presetVersionChanged = fieldsChanged.includes('preset_version');
    let existed = true;
    try {
      await withTransaction(async (client) => {
        const sel = await client.query<{ id: string }>(
          `SELECT id FROM tenants WHERE id = $1 FOR UPDATE`,
          [id]
        );
        if (sel.rows.length === 0) {
          existed = false;
          return;
        }
        await client.query(
          `UPDATE tenants SET ${setParts.join(', ')} WHERE id = $${whereIdx}`,
          params
        );
        await writeAudit(client, {
          tenantId: id,
          actor: admin.actor,
          action: 'admin.tenant.update',
          target: id,
          ip: req.ip ?? null,
          requestId: req.id ?? 'unknown',
          result: 'success',
          meta: { tenantId: id, fieldsChanged },
        });
      });
    } catch (err) {
      const msg = (err as Error).message;
      if ((err as { code?: string }).code === '23505' || /duplicate|unique|constraint/i.test(msg)) {
        problemConflict(res, 'slug_conflict', req.id);
        return;
      }
      logger.error({ err: msg, tenantId: id }, 'admin-tenants: patch transaction failed');
      problemInternal(res, req.id);
      return;
    }
    if (!existed) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    // AFTER commit: cross-replica + local LRU invalidation.
    try {
      await publishTenantInvalidation(deps.redis, id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: publishTenantInvalidation failed on patch; TTL fallback'
      );
    }
    try {
      // prefer invalidate (intent: "this tenant changed"); evict also fine
      if (
        typeof (deps.tenantPool as unknown as { invalidate?: (id: string) => void }).invalidate ===
        'function'
      ) {
        (deps.tenantPool as unknown as { invalidate: (id: string) => void }).invalidate(id);
      } else {
        deps.tenantPool.evict(id);
      }
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: tenantPool invalidation threw on patch'
      );
    }
    if (presetVersionChanged) {
      try {
        await publishToolsListChanged(deps.redis, id, 'preset-version-change');
        await publishResourcesListChanged(deps.redis, id, 'preset-version-change');
      } catch (err) {
        logger.warn(
          { tenantId: id, err: (err as Error).message },
          'admin-tenants: agentic list-change publish failed on preset patch'
        );
      }
    }

    try {
      const { rows } = await deps.pgPool.query(
        `SELECT ${TENANT_SELECT_COLUMNS} FROM tenants WHERE id = $1`,
        [id]
      );
      if (rows.length === 0) {
        problemNotFound(res, 'tenant', req.id);
        return;
      }
      logger.info({ tenantId: id, actor: admin.actor, fieldsChanged }, 'admin-tenants: updated');
      res.status(200).json(tenantRowToWire(rows[0]));
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: read-back after patch failed'
      );
      problemInternal(res, req.id);
    }
  });

  // PATCH /:id/rotate-secret — mint fresh DEK, evict pool, publish invalidation
  r.patch('/:id/rotate-secret', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }
    const id = req.params.id;
    if (!TENANT_GUID.test(id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!redisReadyOrAbort(res, deps.redis, req.id)) return;

    type Outcome =
      | { kind: 'ok'; oldHash: string; newHash: string; updatedAt: Date }
      | { kind: 'not_found' }
      | { kind: 'disabled' };

    let outcome: Outcome;
    try {
      outcome = await withTransaction<Outcome>(async (client) => {
        const sel = await client.query<{
          id: string;
          wrapped_dek: unknown;
          disabled_at: Date | null;
        }>(`SELECT id, wrapped_dek, disabled_at FROM tenants WHERE id = $1 FOR UPDATE`, [id]);
        if (sel.rows.length === 0) {
          return { kind: 'not_found' };
        }
        if (sel.rows[0].disabled_at !== null) {
          return { kind: 'disabled' };
        }
        const oldHash = wrappedDekHash(sel.rows[0].wrapped_dek);
        const { wrappedDek: newWrappedDek } = generateTenantDek(deps.kek);
        const upd = await client.query<{ updated_at: Date }>(
          `UPDATE tenants SET wrapped_dek = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING updated_at`,
          [JSON.stringify(newWrappedDek), id]
        );
        const newHash = wrappedDekHash(newWrappedDek);
        await writeAudit(client, {
          tenantId: id,
          actor: admin.actor,
          action: 'admin.tenant.rotate-secret',
          target: id,
          ip: req.ip ?? null,
          requestId: req.id ?? 'unknown',
          result: 'success',
          meta: { tenantId: id, oldWrappedDekHash: oldHash, newWrappedDekHash: newHash },
        });
        return {
          kind: 'ok',
          oldHash,
          newHash,
          updatedAt: upd.rows[0]!.updated_at,
        };
      });
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: rotate-secret transaction failed'
      );
      problemInternal(res, req.id);
      return;
    }

    if (outcome.kind === 'not_found') {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (outcome.kind === 'disabled') {
      problemConflict(res, 'cannot_rotate_disabled_tenant', req.id);
      return;
    }

    // AFTER commit: local + cross-replica pool eviction.
    try {
      deps.tenantPool.evict(id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: tenantPool.evict threw on rotate-secret'
      );
    }
    try {
      await publishTenantInvalidation(deps.redis, id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: publishTenantInvalidation failed on rotate-secret'
      );
    }

    const updated =
      outcome.updatedAt instanceof Date
        ? outcome.updatedAt.toISOString()
        : String(outcome.updatedAt);
    logger.info(
      {
        tenantId: id,
        actor: admin.actor,
        oldWrappedDekHash: outcome.oldHash,
        newWrappedDekHash: outcome.newHash,
      },
      'admin-tenants: rotate-secret succeeded'
    );
    res.status(200).json({ id, rotated_at: updated });
  });

  // PATCH /:id/disable — cryptoshred cascade
  r.patch('/:id/disable', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }
    const id = req.params.id;
    if (!TENANT_GUID.test(id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!redisReadyOrAbort(res, deps.redis, req.id)) return;

    type DisableOutcome =
      | {
          kind: 'ok';
          disabledAt: Date;
          revokeNoticeIds: string[];
          revokedCredentialCount: number;
        }
      | { kind: 'not_found' }
      | { kind: 'already_disabled' };

    let outcome: DisableOutcome;
    try {
      outcome = await withTransaction<DisableOutcome>(async (client) => {
        const sel = await client.query<{ id: string; disabled_at: Date | null }>(
          `SELECT id, disabled_at FROM tenants WHERE id = $1 FOR UPDATE`,
          [id]
        );
        if (sel.rows.length === 0) {
          return { kind: 'not_found' };
        }
        if (sel.rows[0].disabled_at !== null) {
          return { kind: 'already_disabled' };
        }
        const upd = await client.query<{ disabled_at: Date }>(
          `UPDATE tenants SET disabled_at = NOW(), wrapped_dek = NULL, updated_at = NOW()
             WHERE id = $1 RETURNING disabled_at`,
          [id]
        );
        const keyUpd = await client.query<{ id: string }>(
          `UPDATE api_keys SET revoked_at = NOW()
             WHERE tenant_id = $1 AND revoked_at IS NULL
             RETURNING id`,
          [id]
        );
        const revokeNoticeIds = keyUpd.rows.map((row) => row.id);
        return {
          kind: 'ok',
          disabledAt: upd.rows[0]!.disabled_at,
          revokeNoticeIds,
          revokedCredentialCount: keyUpd.rowCount ?? 0,
        };
      });
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: disable transaction failed'
      );
      problemInternal(res, req.id);
      return;
    }

    if (outcome.kind === 'not_found') {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (outcome.kind === 'already_disabled') {
      problemConflict(res, 'already_disabled', req.id);
      return;
    }

    // AFTER commit: scanDel cache + pkce, pool evict, publish, audit.
    let cacheKeysDeleted = 0;
    let pkceKeysDeleted = 0;
    try {
      cacheKeysDeleted = await scanDel(deps.redis, `mcp:cache:${id}:*`);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: scanDel(cache) failed on disable; ops can retry'
      );
    }
    try {
      pkceKeysDeleted = await scanDel(deps.redis, `mcp:pkce:${id}:*`);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: scanDel(pkce) failed on disable; ops can retry'
      );
    }
    try {
      deps.tenantPool.evict(id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: tenantPool.evict threw on disable'
      );
    }
    try {
      await publishTenantInvalidation(deps.redis, id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: publishTenantInvalidation failed on disable'
      );
    }
    const revokedCredentialCount = outcome.revokedCredentialCount;
    await evictRevokedApiKeys(deps.redis, outcome.revokeNoticeIds, id, 'disable');

    await writeAuditStandalone(deps.pgPool, {
      tenantId: id,
      actor: admin.actor,
      action: 'admin.tenant.disable',
      target: id,
      ip: req.ip ?? null,
      requestId: req.id ?? 'unknown',
      result: 'success',
      meta: {
        tenantId: id,
        cacheKeysDeleted,
        pkceKeysDeleted,
        revokedCredentialCount,
      },
    });

    logger.info(
      {
        tenantId: id,
        actor: admin.actor,
        cacheKeysDeleted,
        pkceKeysDeleted,
        revokedCredentialCount,
      },
      'admin-tenants: disabled'
    );
    res.status(200).json({
      id,
      disabled_at:
        outcome.disabledAt instanceof Date
          ? outcome.disabledAt.toISOString()
          : String(outcome.disabledAt),
    });
  });

  // DELETE /:id — global-admin only; full cryptoshred + DELETE (FK CASCADE)
  r.delete('/:id', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }
    // DELETE restricted to global admin (T-04-05c): tenant-scoped admins may
    // disable but cannot delete even their own tenant row.
    if (admin.tenantScoped !== null) {
      problemForbidden(res, req.id);
      return;
    }
    const id = req.params.id;
    if (!TENANT_GUID.test(id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }
    if (!redisReadyOrAbort(res, deps.redis, req.id)) return;

    type DelOutcome =
      | { kind: 'ok'; revokeNoticeIds: string[]; revokedCredentialCount: number }
      | { kind: 'not_found' };

    let outcome: DelOutcome;
    try {
      outcome = await withTransaction<DelOutcome>(async (client) => {
        const sel = await client.query<{ id: string }>(
          `SELECT id FROM tenants WHERE id = $1 FOR UPDATE`,
          [id]
        );
        if (sel.rows.length === 0) {
          return { kind: 'not_found' };
        }
        // Idempotent cryptoshred writes (handle both fresh + already-disabled
        // tenants). wrapped_dek=NULL is the key promise: after COMMIT there is
        // no recoverable ciphertext, even if the DELETE fails.
        await client.query(
          `UPDATE tenants SET disabled_at = COALESCE(disabled_at, NOW()), wrapped_dek = NULL, updated_at = NOW() WHERE id = $1`,
          [id]
        );
        const keyUpd = await client.query<{ id: string }>(
          `UPDATE api_keys SET revoked_at = NOW()
             WHERE tenant_id = $1 AND revoked_at IS NULL
             RETURNING id`,
          [id]
        );
        const revokeNoticeIds = keyUpd.rows.map((row) => row.id);
        const revokedCredentialCount = keyUpd.rowCount ?? 0;
        // Emit the delete audit row BEFORE DELETE FROM tenants so FK CASCADE
        // wipes it along with the tenant — keeps the audit trail internally
        // consistent (no orphan audit rows). External durability provided by
        // the post-commit pino info log below (T-04-05f trade-off).
        await writeAudit(client, {
          tenantId: id,
          actor: admin.actor,
          action: 'admin.tenant.delete',
          target: id,
          ip: req.ip ?? null,
          requestId: req.id ?? 'unknown',
          result: 'success',
          meta: { tenantId: id, revokedCredentialCount },
        });
        await client.query(`DELETE FROM tenants WHERE id = $1`, [id]);
        return { kind: 'ok', revokeNoticeIds, revokedCredentialCount };
      });
    } catch (err) {
      logger.error(
        { err: (err as Error).message, tenantId: id },
        'admin-tenants: delete transaction failed'
      );
      problemInternal(res, req.id);
      return;
    }

    if (outcome.kind === 'not_found') {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    // AFTER commit: Redis cleanup + pool evict + invalidation publish.
    let cacheKeysDeleted = 0;
    let pkceKeysDeleted = 0;
    let webhookDedupKeysDeleted = 0;
    try {
      cacheKeysDeleted = await scanDel(deps.redis, `mcp:cache:${id}:*`);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: scanDel(cache) failed on delete; ops can retry'
      );
    }
    try {
      pkceKeysDeleted = await scanDel(deps.redis, `mcp:pkce:${id}:*`);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: scanDel(pkce) failed on delete; ops can retry'
      );
    }
    // Webhook dedup keys hash tenantId into their suffix; best-effort wildcard
    // cleanup (tracked as deferred index in output docs).
    try {
      webhookDedupKeysDeleted = await scanDel(deps.redis, `mcp:webhook:dedup:*${id}*`);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: scanDel(webhook:dedup) failed on delete; ops can retry'
      );
    }
    try {
      deps.tenantPool.evict(id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: tenantPool.evict threw on delete'
      );
    }
    try {
      await publishTenantInvalidation(deps.redis, id);
    } catch (err) {
      logger.warn(
        { tenantId: id, err: (err as Error).message },
        'admin-tenants: publishTenantInvalidation failed on delete'
      );
    }
    const revokedCredentialCount = outcome.revokedCredentialCount;
    await evictRevokedApiKeys(deps.redis, outcome.revokeNoticeIds, id, 'delete');

    // Post-delete structured log — the durable record because the in-txn
    // audit row CASCADE-deletes with the tenant.
    logger.info(
      {
        event: 'admin.tenant.delete',
        tenantId: id,
        actor: admin.actor,
        cacheKeysDeleted,
        pkceKeysDeleted,
        webhookDedupKeysDeleted,
        revokedCredentialCount,
        requestId: req.id ?? 'unknown',
      },
      'admin-tenants: deleted'
    );

    res.status(200).json({ id, deleted_at: new Date().toISOString() });
  });

  return r;
}

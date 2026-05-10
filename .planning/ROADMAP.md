# Roadmap: ms-365-mcp-server v2 — Enterprise Multi-Tenant MCP Gateway

## Overview

A six-phase brownfield rewrite that converts the existing single-tenant CLI/HTTP MCP server into a Dockerized multi-tenant gateway exposing the full Microsoft Graph v1.0 surface (curated) to AI assistants across many Azure AD tenants. The build is bottom-up so every layer is durable before the layer above lands on it: harden the v1 baseline first, bolt on a Kiota-pattern Graph transport pipeline so multi-tenant doesn't multiply transport failures, build the multi-tenant identity & state substrate (Postgres + Redis, AuthManager pool, all four identity flows, tenant routing) on a stable transport, expose tenant lifecycle via an admin REST API + webhook receiver + delta-token persistence, expand coverage to ~5,000 v1.0 ops gated by per-tenant tool selection, and finish with operational observability + rate limiting + OAuth-surface verification. Each phase is independently shippable behind a feature flag and converges on the reference architecture in `.planning/research/ARCHITECTURE-MULTI-TENANT-SSE.md`.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Hardening** - Node 22 baseline, pino structured logging with PII redaction, hardened Dockerfile, /healthz + /readyz, graceful shutdown, and v1 OAuth-surface bug fixes that aren't blocked by multi-tenant
- [ ] **Phase 2: Graph Transport Middleware Pipeline** - Kiota-pattern middleware in graph-client (Retry/Backoff, BatchClient, PageIterator async-gen, UploadSession resumable, ETag plumbing, typed ODataError) so the transport is durable before multi-tenant amplifies any fragility
- [ ] **Phase 3: Multi-Tenant Identity & State Substrate** - Postgres tenant registry + Redis hot state + per-tenant AuthManager pool + URL-path tenant routing + all four identity flows (delegated OAuth, app-only, bearer pass-through, device code) + envelope-encrypted token storage
- [ ] **Phase 4: Admin API, Webhooks & Delta Persistence** - Admin REST API (dual-secured: Entra OAuth + rotatable API keys) for tenant + key + audit lifecycle, /notifications webhook receiver with HMAC validation, subscription helpers, delta-token persistence per tenant + resource
- [ ] **Phase 5: Graph Coverage Expansion & Per-Tenant Tool Selection** - Regenerated client against full Graph v1.0 + curated beta whitelist (~5,000 ops), default ~150-op essentials preset, per-tenant enabled_tools enforcement at dispatch and discovery, HIGH-priority workload coverage verified
- [ ] **Phase 5.1: Power Platform & M365 Admin Surface Expansion** (INSERTED) - Extend the generator pipeline beyond Microsoft Graph to cover Power BI REST API, Power Apps, Power Automate, Exchange Admin (PowerShell REST bridge), and SharePoint Tenant Admin. Each product gets a namespace prefix (`__powerbi__`, `__pwrapps__`, `__pwrauto__`, `__exo__`, `__spadmin__`), per-product essentials preset additions, admin-API workload selectors, and coverage harness thresholds.
- [x] **Phase 6: Operational Observability & Rate Limiting** - OpenTelemetry traces + metrics on every Graph request (tenant/tool/status/duration/retry-count), Prometheus /metrics endpoint, per-tenant rate limiting (request count + Graph token budget), and the integration test pass that closes v1's 0%-coverage OAuth surface (completed 2026-04-22)
- [x] **Phase 7: Agentic Tool Surface + Per-Tenant Memory** - Make discovery-mode the default for new tenants, expose MCP Resources/Prompts/Notifications/Logging/Completions, add per-tenant bookmarks/recipes/facts memory with admin APIs, and provide an opt-in migration path while preserving existing static-preset tenants unchanged. (completed 2026-04-25; external Claude.ai UX verification pending)
- [x] **Phase 8: Maximal MCP + Claude/Cowork Connector Surface** - Complete the practical MCP surface for hosted Claude.ai/Cowork connectors and power clients: editable skills as prompts, MCP Apps, structured outputs/output schemas, richer resources/completions/notifications, capability-gated sampling/elicitation/roots/tasks, transport parity, and connector naming/branding hardening for clients that ignore `serverInfo.name` or show generic names like `ToolHub`. (completed 2026-05-09; review fixes validated; full suite resource-inconclusive with exit 137)

## Phase Details

### Phase 1: Foundation & Hardening
**Goal**: A v2 single-tenant baseline that's safe to deploy in production, with all v1 known bugs that aren't architecturally blocked by multi-tenancy resolved, ready to be extended by every later phase.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-03, FOUND-04, OPS-01, OPS-02, OPS-03, OPS-04, OPS-09, OPS-10, AUTH-06, AUTH-07, SECUR-04, SECUR-05, SECUR-06, SECUR-07
**Success Criteria** (what must be TRUE):
  1. Operator can start the server in Docker as non-root with a read-only root filesystem on Node 22 LTS, and `docker inspect` shows a passing HEALTHCHECK without manual configuration
  2. Operator can `curl /healthz` and `/readyz` against a running server and receive deterministic 200/503 responses that reflect actual process and (in v2 baseline) local-resource readiness
  3. Operator can grep `info`-level production logs for full Graph URLs, request bodies, refresh tokens, or `grant_type` values and find none — only correlation-tagged structured JSON
  4. Operator can hit `/register` with a `javascript:` redirect_uri or unknown external host and the server rejects it with a 400, while concurrent registrations from a load-test return distinct, non-colliding `client_id` values
  5. Operator can SIGTERM the running container and observe in-flight requests draining, logs flushing, and the process exiting cleanly within 25 seconds — no aborted clients, no half-written logs
**Plans**: 9 plans
**UI hint**: no

Plans:
- [x] 01-01: Node 22 LTS baseline migration — bump `engines`, drop Node 18 polyfills, simplify CI matrix to 20+22, single Node version pinned across Dockerfile build & runtime stages
- [x] 01-02: Replace Winston with pino across all log call sites; introduce `requestId` + `tenantId` (default null) defaultMeta; add a redaction helper enforcing PII rules from CONCERNS.md (no full Graph URLs, no bodies, no refresh tokens, no Prefer/Content-Type at info)
- [x] 01-03: Harden Dockerfile — multi-stage with `npm ci`, BuildKit cache mounts, single Node 22-alpine base, non-root `nodejs` user (UID 1001), `tini` as PID 1, OCI labels, `HEALTHCHECK` directive
- [x] 01-04: Implement `/healthz` (always-200 liveness) and `/readyz` (deep readiness, baseline version checks process state — extended in Phase 3 for Postgres/Redis and Phase 6 for "at-least-one-tenant-loaded")
- [x] 01-05: Graceful shutdown — SIGTERM/SIGINT handler, readiness flip, socket drain with 25-second force-close, in-flight request awaiting; expose draining state to /readyz
- [x] 01-06: Dynamic-client-registration hardening — validate `redirect_uris` against scheme/host allowlist (reject `javascript:`, arbitrary external hosts), generate client IDs as `mcp-client-${crypto.randomBytes(8).toString('hex')}`, scrub registration payload from logs
- [x] 01-07: Token-endpoint security hardening — never log request body on `grant_type` errors or any `/token` failure path; replace default CORS `localhost:3000` leak with explicit per-deployment origin (per-tenant version lands in Phase 3)
- [x] 01-08: Remove `keytar` dependency — server-side token store only; document file-based fallback for stdio/CLI users with explicit operator warning; reference Docker Compose stack in repo (mcp-only at this phase; Postgres+Redis services added in Phase 3)
- [x] 01-09: V1 known-bug triage pass — go through CONCERNS.md, fix non-architectural items not covered by 01-01..01-08 (logger module-load-time mkdir crash on read-only FS, top-level stray test scripts, `getKeytar` race window pre-removal, `removeODataProps` unbounded recursion guard, `endpointsData.find` O(N²) startup map), explicitly defer architectural items (PKCE store externalization → Phase 3, 429 handling → Phase 2, etc.) with phase pointers in CONCERNS.md

### Phase 2: Graph Transport Middleware Pipeline
**Goal**: A durable, single-process Graph transport that handles throttling, transient failures, batched reads, paginated reads, resumable uploads, optimistic concurrency, and typed errors — so when multi-tenant amplifies request volume in Phase 3 a single user's burst doesn't cascade-fail an entire tenant.
**Depends on**: Phase 1 (uses pino logger + correlation IDs + readiness signal)
**Requirements**: MWARE-01, MWARE-02, MWARE-03, MWARE-04, MWARE-05, MWARE-06, MWARE-07
**Success Criteria** (what must be TRUE):
  1. AI assistant calling a tool against a Graph endpoint that returns 429 with `Retry-After: 5` waits ~5s and retries automatically, and the user sees a successful result rather than an error
  2. AI assistant calling a tool that hits 503 from AAD recovers transparently within bounded retries; an operator can scrape the metric showing the retry happened (instrumented in Phase 6)
  3. AI assistant requesting a list whose result spans 50,000 items receives a response that either contains all items, or contains a partial page set with an explicit `_truncated: true` flag and resumable `nextLink` — never silently truncated
  4. AI assistant uploading a 200 MB file via the upload-session helper resumes after a simulated mid-stream 503 from `nextExpectedRanges` and the final DriveItem is created intact
  5. AI assistant calling a Graph endpoint that returns a 4xx receives a structured `ODataError` with `code`, `message`, and Microsoft `requestId` available in MCP `_meta` so the user can paste the requestId into a Microsoft support ticket
**Plans**: 9 plans (7 original + 2 gap closure)
**UI hint**: no

Plans:
- [x] 02-01: Middleware-pipeline scaffold inside `src/graph-client.ts` — define a chainable `GraphMiddleware` interface, refactor `performRequest` to drive the chain in order, preserve the existing 401-refresh path as the innermost handler; add unit-test harness that injects fake middlewares
- [x] 02-02: RetryHandler middleware — parse `Retry-After` (seconds and HTTP-date), exponential backoff with full jitter, retry 408/429/500/502/503/504, bounded max-attempts cap (default 3, configurable), surface retry count + last status into request context for downstream metrics
- [x] 02-03: Typed ODataError middleware — parse `{error: {code, message, innerError: {requestId, clientRequestId, date}}}` from non-2xx Graph responses, wrap in a `GraphError` class, attach to the MCP error envelope and to `_meta`; preserve original status; replace the string-concat `Error` at `graph-client.ts:122-126`
- [x] 02-04: PageIterator async generator — replace `fetchAllPages` (`graph-tools.ts:400-449`) with `async function*` that yields pages, supports per-call `maxPages`, surfaces `nextLink` and a `_truncated: true` flag in the final response when a cap is hit, bubbles pagination errors to the caller instead of swallowing them
- [x] 02-05: BatchClient — `BatchRequestContent` + `BatchResponseContent` style helper that buffers up to 20 sub-requests with optional `dependsOn` chains, posts to `POST /$batch`, parses the JSON envelope back to per-sub-request results; expose as both an internal coalescer (auto-batch reads in a tick) and an explicit `batch()` MCP tool helper
- [x] 02-06: UploadSession resumable upload helper — chunk file into 320 KiB-aligned segments (configurable up to 60 MiB per chunk), PUT each with `Content-Range`, on 5xx GET session URL for `nextExpectedRanges` and resume; expose as the implementation behind `upload-large-attachment` and OneDrive/SharePoint upload tools; raise Express body-parser limits in lockstep so HTTP-mode requests carrying large bodies aren't truncated by the body-parser before reaching the helper
- [x] 02-07: ETag plumbing — propagate `If-Match` (PATCH/DELETE) and `If-None-Match` (GET) when caller supplies an ETag in tool params; auto-attach when a previous tool call surfaced `_etag` in `_meta`; document the round-trip in tool descriptions for known-ETag-bearing resources (DriveItem, Event, Message, Contact)

### Phase 3: Multi-Tenant Identity & State Substrate
**Goal**: A multi-tenant runtime where any registered tenant can serve a tool call through any of the four identity flows, with strict per-tenant token-cache isolation, runtime onboarding via Postgres-persisted config, hot state in Redis, URL-path tenant routing, and envelope-encrypted refresh tokens at rest. This is the architectural rewrite — every later phase depends on what lands here.
**Depends on**: Phase 2 (per-tenant retry budget needs middleware in place; multi-tenant on a fragile transport multiplies failures)
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04, TRANS-05, TENANT-01, TENANT-02, TENANT-03, TENANT-04, TENANT-05, TENANT-06, TENANT-07, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, SECUR-01, SECUR-02, SECUR-03
**Success Criteria** (what must be TRUE):
  1. Operator can insert a tenant row into Postgres (manual SQL at this phase; admin API lands in Phase 4) and immediately serve an MCP tool call at `/t/{tenantId}/mcp` without restarting the container, with the tenant-specific MSAL client lazy-instantiated on first request
  2. Two AI assistants holding tokens for different tenants can issue concurrent tool calls against the same MCP server and verify (via separate `userOid`-scoped responses) that no token is reused across the tenant boundary; PostgreSQL audit_log shows distinct `tenantId` for each
  3. The same MCP server instance can satisfy a request via delegated OAuth, app-only client credentials, bearer pass-through (with tenant-vs-`tid` validation), and device code from stdio — all four flows wired and exercised in integration tests
  4. Operator can disable a tenant via SQL (DELETE) and outstanding cached MSAL clients are evicted, the tenant's Redis keyspace prefix is cryptoshredded by deleting the per-tenant DEK, and subsequent requests to `/t/{tenantId}/mcp` return 404
  5. Operator can grep the Redis instance for cleartext refresh tokens and find none — every refresh token is wrapped with a per-tenant DEK, which is itself wrapped with a KEK sourced from env (KeyVault layering optional)
  6. Operator can shoot one server replica and a second replica picks up in-flight OAuth flows from Redis-stored PKCE state — the in-process O(N) PKCE scan is gone, replaced by an O(1) Redis lookup keyed by `clientCodeChallenge`
**Plans**: 10 plans
**UI hint**: no

Plans:
- [x] 03-01: Postgres tenant registry schema + migrations — `tenants(id, mode, client_id, client_secret_ref, tenant_id, cloud_type, created_at, updated_at, disabled_at, redirect_uri_allowlist, cors_origins, allowed_scopes, enabled_tools)`, `audit_log(id, tenant_id, actor, action, target, ip, request_id, result, ts)`, `delta_tokens(tenant_id, resource, delta_link, updated_at)`, `api_keys(id, tenant_id, name, key_hash, created_at, last_used_at, revoked_at)`; migration tooling in `bin/`; reference Docker Compose service for Postgres added to the stack from Phase 1
- [x] 03-02: Redis substrate — `RedisClient` wrapper in `src/lib/redis.ts` (ioredis), connection pool, key-prefix conventions (`mcp:pkce:`, `mcp:cache:{tenantId}:`, `mcp:rl:{tenantId}:`), TTL helpers; reference Docker Compose service for Redis added; falls back to in-memory Map for stdio mode so single-tenant CLI keeps working
- [x] 03-03: PKCE store externalization — replace `pkceStore: Map` (`src/server.ts:60-69`) with `RedisPkceStore` indexed by `clientCodeChallenge` for O(1) `/token` lookup (replaces O(N) scan + per-entry SHA-256), TTL 10m, opportunistic eviction removed, integration test for two concurrent PKCE flows
- [x] 03-04: Token-cache encryption substrate — AES-GCM envelope encryption module: per-tenant DEK generation, KEK loaded from `MS365_MCP_KEK` env (KeyVault optional injection); Redis stores `{wrappedDek, ciphertext, iv, authTag, savedAt}`; rotation procedure documented; cryptoshred-on-tenant-delete primitive
- [x] 03-05: AuthManager refactor to per-tenant pool — `AuthManager.create()` → `AuthManager.forTenant(tenantConfig)`; LRU-cached MSAL `ConfidentialClientApplication` (or `PublicClientApplication` for shared-app mode) per tenant; `ICachePlugin` implementation backed by Redis with envelope encryption from 03-04; cache key composition `mcp:cache:{tenantId}:{clientId}:{userOid|appOnly}:{scopeHash}`; explicit eviction API for `tenants TENANT-07`
- [x] 03-06: All-four-identity-flow wiring (single PR landing all four together to avoid double-touching AuthManager) — (a) Delegated OAuth (auth code + PKCE) per-tenant via tenant Entra; (b) app-only client credentials via `acquireTokenByClientCredential`; (c) bearer pass-through middleware that verifies `tid` claim against URL `tenantId` and forwards token to Graph as-is; (d) device code retained for stdio/CLI single-tenant; integration tests for each flow + a "concurrent flows" test in one process
- [x] 03-07: Refresh-token security migration — remove the `x-microsoft-refresh-token` custom header path entirely; refresh tokens move to opaque server-side session keyed by access-token hash, encrypted at rest via 03-04; document the breaking change for v1 HTTP-mode users
- [x] 03-08: URL-path tenant routing — Express router `/t/:tenantId/*` with `loadTenant` middleware that loads tenant config from Postgres (LRU cache, 1m TTL), populates `req.tenant` and `requestContext`, returns 404 on unknown tenants; refactor `MS365_MCP_PUBLIC_URL` plumbing to append `/t/{tenantId}` per-request so OAuth metadata documents publish per-tenant `issuer` correctly
- [x] 03-09: Three-transport mounting on the multi-tenant core — Streamable HTTP at `/t/{tenantId}/mcp`, legacy HTTP+SSE shim at `/t/{tenantId}/sse` + `/t/{tenantId}/messages` (kept for client-ecosystem transition window — flagged for retirement in v2.1), stdio transport preserved with `--tenant-id` flag (or env) selecting one tenant; all three concurrently expose the same MCP server surface backed by the same multi-tenant core
- [x] 03-10: Audit log writer — every OAuth flow event, every Graph error response (with `requestId` from MWARE-07), every tenant-scoped action gets an INSERT to `audit_log` with tenantId, action, requestId, result; admin-action logging stub (full admin-side logging completed in Phase 4); /readyz extended to require Postgres + Redis reachable AND at-least-one-tenant-loaded

### Phase 4: Admin API, Webhooks & Delta Persistence
**Goal**: A production multi-tenant deployment becomes operable: tenants and API keys can be onboarded, updated, disabled, and audited via REST without touching the DB; the server can receive Microsoft Graph change notifications per tenant with HMAC validation; and "what changed since last poll" stops being a full sweep because delta tokens persist per (tenant, resource).
**Depends on**: Phase 3 (admin API CRUDs against tenant registry, API key table, audit log; webhooks live under `/t/{tenantId}/notifications`)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, WEBHK-01, WEBHK-02, WEBHK-03, MWARE-08
**Success Criteria** (what must be TRUE):
  1. Operator can `POST /admin/tenants` from a script using only an Entra access token (admin app reg + group check) OR a rotatable API key in `X-Admin-Api-Key`, and the tenant is immediately reachable at `/t/{tenantId}/mcp` without container restart
  2. Operator can `POST /admin/api-keys`, receive a one-time-display key, use it on a subsequent admin call, then `POST /admin/api-keys/{id}/revoke` and verify subsequent uses return 401
  3. Operator can `GET /admin/audit?tenantId=X&since=...&action=...` and receive a paginated, filterable view of admin actions, OAuth events, and Graph errors with their `requestId` for correlation with Microsoft support
  4. Microsoft Graph can `POST /t/{tenantId}/notifications` with a `validationToken`, the server echoes it back within 10 seconds plain text 200 OK, and subsequent notification payloads with valid HMAC against the tenant's stored `clientState` are accepted while invalid HMACs are rejected with 401
  5. AI assistant calling a `delta`-supporting tool (e.g., "what's new in this user's mailbox") on the second invocation receives only the delta — the server pulled the persisted `@odata.deltaLink` from Postgres and resumed instead of full-sweeping
**Plans**: 9 plans
**UI hint**: no

Plans:
- [x] 04-01: Admin REST API skeleton — Express sub-router mounted at `/admin`, Zod validators, OpenAPI doc generated for the admin surface, error envelope conventions (RFC 7807 problem+json), CORS locked down (admin origin allowlist separate from per-tenant CORS from Phase 3)
- [x] 04-02: `/admin/tenants` CRUD — create (validates app-reg fields, enqueues admin-consent URL or accepts byo-secret), list (paginated, filter by mode/disabled), get, update (PATCH with partial fields), disable (sets disabled_at, evicts MSAL pool entry), delete (cryptoshred Redis cache prefix, drop audit fk-cascade decision documented), rotate-secret (revokes prior cache entries)
- [x] 04-03: `/admin/api-keys` CRUD — mint (returns plaintext once + stores hash), list (no plaintext), revoke (sets revoked_at, in-memory cache TTL respects revocation within 60s), rotate (mint+revoke as one transaction); document key format and expected client storage
- [x] 04-04: Admin auth dual-stack — (a) Entra OAuth admin route requiring admin app reg + configurable group-membership check via Graph `/me/memberOf` cached 5m, (b) API-key middleware reading `X-Admin-Api-Key` header against `api_keys` table; both populate `req.admin` with `{actor, source}` for audit-log entries
- [x] 04-05: `/admin/audit` query API — parameterized GET with `tenantId`, `since`, `until`, `action`, `actor`, paginated cursor; respects admin-side filtering (a tenant-scoped admin sees only their tenant's rows); read-only no PII leakage (request bodies remain redacted)
- [x] 04-06: Admin-action audit logging — every `/admin/*` mutation emits an audit_log row with admin identity, source IP, action, target, result; ADMIN-06 closes the loop on Phase 3's audit substrate
- [x] 04-07: Webhook receiver `/t/{tenantId}/notifications` — validation-token handshake (echo `validationToken` query param within 10s as plain text 200 OK on first POST); HMAC validation of subsequent payloads against tenant-stored `clientState` (reject 401 on mismatch, log audit entry); idempotency via `subscriptionId + changeType + ts` Redis key 24h TTL
- [x] 04-08: Subscription lifecycle MCP tools — `subscriptions-create` / `subscriptions-renew` / `subscriptions-delete` exposed as per-tenant tools with proper scope validation; per-tenant subscription registry in Postgres so renew jobs can run on cron later (renewal cron itself optional in this phase, documented for Phase 6 polish)
- [x] 04-09: Delta-token persistence (MWARE-08) — `delta_tokens(tenant_id, resource, delta_link)` writes on every successful delta GET; helper API `withDeltaToken(tenantId, resource, fn)` that loads-and-passes the stored token then writes back the new `@odata.deltaLink` from the response; integration tests for "first call full sweep, second call incremental"

### Phase 5: Graph Coverage Expansion & Per-Tenant Tool Selection
**Goal**: The MCP gateway exposes the full Graph v1.0 surface plus the full Graph beta surface (~14,000 ops total in the generated catalog — user override D-18), but each tenant only ever sees a curated subset — defaulting to a ~150-op essentials preset and expandable by workload or operation via the Phase 4 admin API. This is the phase that fulfills the "fully featured for my organization" promise without breaking MCP clients that cap context at ~100-200 tools.
**Depends on**: Phase 3 (per-tenant `enabled_tools` storage in `tenants` table + AuthManager scope construction), Phase 4 (admin API endpoint to mutate per-tenant tool selection)
**Requirements**: FOUND-02, COVRG-01, COVRG-02, COVRG-03, COVRG-04, COVRG-05, COVRG-06, TENANT-08
**Success Criteria** (what must be TRUE):
  1. Operator can run `npm run generate` and the resulting `src/generated/client.ts` contains every Graph v1.0 operation (~5,021) plus the curated beta whitelist (subscriptions, Copilot, Security, Compliance, selected Intune) — verifiable by counting endpoint records and spot-checking workload coverage against `.planning/research/GAP-GRAPH-API.md`
  2. AI assistant connecting to a freshly-onboarded tenant sees only the ~150-op essentials preset (Mail, Calendar, Files/OneDrive, Teams, Users, Groups, SharePoint Sites, Planner, ToDo) — `tools/list` returns ~150, not 5,000, and the client doesn't fall over
  3. Operator can `PATCH /admin/tenants/{id} {enabled_tools: {add: ['identity-and-access:*']}}` and the connected AI assistant immediately sees the Identity & Access workload (~809 ops) appear in `tools/list` on next reconnect — workload-level expansion works
  4. Operator can `PATCH /admin/tenants/{id} {enabled_tools: {add: ['users.list', 'users.update']}}` for individual ops, and only those two ops are added — operation-level granularity works
  5. AI assistant calling `get-tool-schema` on a tenant receives a filtered view that exactly matches the per-tenant `enabled_tools` set — no leakage of tools not enabled for that tenant
  6. Coverage audit verifies HIGH-priority workloads (Mail, Calendar, Files, Teams, Users, Groups, Sites, Identity & Access, Planner/ToDo, Search, Subscriptions) are present in the regenerated catalog above the targets in the gap analysis
**Plans**: 8 plans
**UI hint**: no

Plans:
- [x] 05-01: Generator pipeline upgrade (FOUND-02) — `bin/generate-graph-client.mjs` consumes the full Graph v1.0 OpenAPI spec (not the trimmed v1 endpoints.json subset); `bin/modules/simplified-openapi.mjs` policy decisions (depth caps, recursive-ref handling at scale) documented; CI guards against silent endpoint count regressions
- [x] 05-02: Full beta pipeline with `__beta__` prefix (D-18 user override) — `bin/modules/beta.mjs` pulls the full beta OpenAPI; tags every beta tool with `__beta__` prefix in alias; churn guard via `bin/.last-beta-snapshot.json` (exits non-zero on removed ops unless `MS365_MCP_ACCEPT_BETA_CHURN=1`); dispatch emits info pino log on every `__beta__*` invocation
- [x] 05-03: Default essentials preset (~150 ops) — explicit list under `src/presets/essentials.ts` covering Mail (read/send/move/delete), Calendar (CRUD/find-times), Files/OneDrive (CRUD/upload/share), Teams (channels/messages/meetings basics), Users (read/list), Groups (read/list/membership), SharePoint Sites (list/items/files), Planner/ToDo (CRUD); preset committed with rationale per op so future audits can re-evaluate
- [x] 05-04: Per-tenant `enabled_tools` enforcement at dispatch (TENANT-08) — `executeGraphTool` checks `req.tenant.enabled_tools` against the requested tool name and returns "tool not enabled for this tenant" 403-style error if absent; default-to-preset behavior on tenants with NULL `enabled_tools`; integration test that two tenants with different `enabled_tools` see different tool catalogs from the same server instance
- [x] 05-05: `tools/list` filtering — `registerGraphTools` is wrapped by a per-request filter that intersects the registered universe with the tenant's `enabled_tools` set; ensures `tools/list` never advertises tools the tenant can't actually call
- [x] 05-06: `get-tool-schema` discovery filtering (COVRG-05) — discovery's BM25 index either rebuilt per-tenant on first request (cached LRU), or filtered post-rank against `enabled_tools`; preserve the lazy-discovery mode option from v1
- [x] 05-07: Admin endpoint for tool selection — `PATCH /admin/tenants/{id}/enabled-tools` supports `{add: [...], remove: [...], set: [...]}` patches with workload (`users:*`) or operation (`users.list`) granularity; validates against the generated tool registry; emits audit-log entry; cache invalidation hooks the tenant's tool-list cache from 05-05
- [x] 05-08: Coverage verification harness — automated check that runs against the freshly-generated client and asserts HIGH-priority workload coverage thresholds from `.planning/research/GAP-GRAPH-API.md` (e.g., Mail >= 250 ops covered, Calendars >= 400, Teams >= 350, Users >= 250, etc.); fails CI if regression detected; produces a coverage report committed alongside the gap analysis

### Phase 5.1: Power Platform & M365 Admin Surface Expansion (INSERTED)
**Goal**: Extend the MCP gateway's coverage surface past Microsoft Graph into the Power Platform product family (Power BI, Power Apps, Power Automate) and the M365 admin backplanes (Exchange Admin PowerShell, SharePoint Tenant Admin) — using the same generator+preset+admin-selector pipeline Phase 5 hardened. Each product gets a grep-scannable namespace prefix (`__powerbi__`, `__pwrapps__`, `__pwrauto__`, `__exo__`, `__spadmin__`) so operators can audit, rate-limit, and toggle them per tenant with the existing tool-selection primitives. Phase 5.1 is shippable independently — any tenant can opt in product-by-product via admin API — and it unblocks operator scenarios that Graph alone cannot reach (Exchange mailbox admin, Power BI workspace + dataset management, SharePoint tenant-wide policy).
**Depends on**: Phase 5 (reuses generator pipeline, essentials-preset contract, admin-API enabled_tools enforcement, coverage harness)
**Requirements**: COVRG-07, COVRG-08, COVRG-09, COVRG-10, COVRG-11, COVRG-12, COVRG-13, COVRG-14
**Success Criteria** (what must be TRUE):
  1. Operator can run `npm run generate` and the resulting `src/generated/client.ts` contains every Power BI REST operation tagged `__powerbi__*`, every Power Apps operation tagged `__pwrapps__*`, every Power Automate operation tagged `__pwrauto__*`, every Exchange Admin cmdlet surface tagged `__exo__*`, and every SharePoint Tenant Admin operation tagged `__spadmin__*` — verifiable by grep-counting each prefix against a committed snapshot
  2. AI assistant connecting to a freshly-onboarded tenant sees ONLY the Graph-v1 essentials preset by default — no Power Platform or admin surface leaks without an explicit admin opt-in (Phase 4 `PATCH /admin/tenants/{id}/enabled-tools`)
  3. Operator can `PATCH /admin/tenants/{id} {enabled_tools: {add: ['powerbi:*']}}` and the connected AI assistant immediately sees every Power BI tool in `tools/list` after next reconnect — product-level selectors work identically to Phase 5 workload selectors
  4. Operator can `PATCH /admin/tenants/{id} {enabled_tools: {add: ['exo:mailbox-get', 'exo:mailbox-set']}}` for individual ops and only those two Exchange ops are added — operation-level granularity preserved across the new prefixes
  5. Exchange Admin PowerShell REST bridge authenticates with OAuth2 client-credentials + Exchange PowerShell token endpoint; a tool call routes to the cmdlet invocation surface (no on-VM PowerShell binary required)
  6. Per-product essentials preset additions (10–20 ops each) are committed to `src/presets/essentials-v1.json` with rationale per op; preset version stays `essentials-v1` but section counts grow proportionally — existing tenants see new ops on next regen without an admin migration
  7. Coverage harness asserts per-product thresholds from an extended `.planning/research/GAP-POWER-PLATFORM.md` baseline and fails CI on >10% workload regression, mirroring Phase 5's green-gate contract
**Plans**: 8 plans
**UI hint**: no

Plans:
- [ ] 5.1-01: Power BI generator — pull OpenAPI/Swagger from `learn.microsoft.com/rest/api/power-bi/` (or the msgraph-metadata-equivalent pinned snapshot), run through `simplified-openapi.mjs` full-surface policy, emit `__powerbi__*`-prefixed aliases into the main `client.ts`; reuses Phase 5 dedup + churn-guard + MCP 64-char-limit truncation patterns
- [ ] 5.1-02: Power Apps generator — pull Power Apps REST API spec from `api.powerplatform.com`, emit `__pwrapps__*`-prefixed aliases; document the cross-geography endpoint selection (discovery API) so per-tenant region hint can route correctly at runtime
- [ ] 5.1-03: Power Automate generator — pull Power Automate Management API from `api.flow.microsoft.com`, emit `__pwrauto__*`-prefixed aliases; handle the Flow DSL JSON type that doesn't schematize cleanly into Zod
- [ ] 5.1-04: Exchange Admin PowerShell REST bridge (`__exo__` prefix) — OAuth2 client-credentials flow against `outlook.office365.com/powershell-liveid` (or the new Exchange Online REST endpoint), cmdlet invocation wrapped as MCP tools (Get-Mailbox → `__exo__mailbox-get`, Set-Mailbox → `__exo__mailbox-set`, etc.); no on-host PowerShell binary; tool schemas derived from cmdlet parameter metadata
- [ ] 5.1-05: SharePoint Tenant Admin generator — pull SharePoint Tenant Admin CSOM/REST surface from `<tenant>-admin.sharepoint.com` (`Microsoft.Online.SharePoint.TenantAdministration` namespace), emit `__spadmin__*`-prefixed aliases; document the tenant-specific URL substitution (the `<tenant>` literal must be rewritten at dispatch time)
- [ ] 5.1-06: Per-product essentials preset additions — extend `src/presets/essentials-v1.json` with 10–20 flagship ops per product (e.g., Power BI: list-workspaces, get-dataset, refresh-dataset; Exchange: Get-Mailbox, Set-Mailbox, Get-MailboxStatistics; SharePoint: Get-SPOSite, Set-SPOSite); rationale field updated; total preset size grows but version stays `essentials-v1`
- [ ] 5.1-07: Admin API selector expansion — `registry-validator.ts` accepts `powerbi:*`, `pwrapps:*`, `pwrauto:*`, `exo:*`, `sp-admin:*` as product-level selectors in the workload position; `enabled-tools-parser.ts` resolves them against the new generated aliases; admin API PATCH round-trip test covers each new selector
- [ ] 5.1-08: Coverage harness thresholds per product — write `.planning/research/GAP-POWER-PLATFORM.md` baseline (op counts per product workload), extend `bin/modules/coverage-check.mjs` with per-product workload map, fail CI on >10% regression; commit a `bin/.last-powerplatform-snapshot.json` churn guard mirroring Phase 5's beta snapshot

### Phase 6: Operational Observability & Rate Limiting
**Goal**: A production multi-tenant deployment is observable, throttle-safe, and verifiably correct on the OAuth surface. Every Graph request emits an OTel trace and metric tagged by tenant + tool + status, Prometheus scrapes the metric set, per-tenant rate limits enforce request count + Graph token budget via Redis counters, and the integration test suite closes v1's 0%-coverage OAuth surface (PKCE concurrency, dynamic registration, multi-tenant token isolation).
**Depends on**: Phase 5 (rate limiter and metrics need the full multi-tenant + coverage surface to instrument)
**Requirements**: OPS-05, OPS-06, OPS-07, OPS-08
**Success Criteria** (what must be TRUE):
  1. Operator can hit `/metrics` on a running multi-tenant server and Prometheus-scrape per-tenant counters: `mcp_tool_calls_total{tenant,tool,status}`, `mcp_tool_duration_seconds{tenant,tool}`, `mcp_graph_throttled_total{tenant}`, `mcp_oauth_pkce_store_size`, `mcp_token_cache_hit_ratio{tenant}`, `mcp_active_streams{tenant}`
  2. Operator running an OTel collector receives traces for every Graph request with attributes `{tenant, tool, status, duration_ms, retry_count, http.status_code}` and the Microsoft `requestId` from MWARE-07 attached to the span
  3. Operator can configure a tenant's request budget (e.g., 1000 req/min, 50000 Graph-points/min) via admin API; AI assistant exceeding either receives a structured 429 from the gateway (with `Retry-After`) before any Graph call is made; metric `mcp_rate_limit_blocked_total{tenant,reason}` increments
  4. Integration test suite exercises: two concurrent PKCE flows interleaving on the same server, dynamic registration with valid + invalid `redirect_uris`, multi-tenant token isolation (two tenants holding tokens, no cross-tenant cache hit), tenant disable cascading to MSAL eviction + Redis cryptoshred — all green in CI
  5. Operator running `npm test -- --coverage` sees src/server.ts coverage above 70% (up from 0% in v1 per CONCERNS.md) on the OAuth-surface lines (PKCE store, /authorize, /token, /register, /.well-known/*)
**Plans**: 9 plans (7 original + 2 gap closure)
**UI hint**: no

Plans:
- [x] 06-01: OpenTelemetry SDK bootstrap — `instrumentation.ts` preloaded via `NODE_OPTIONS=--require ./instrumentation.js`, OTLP trace exporter, metric reader wired to PrometheusExporter on port 9464; auto-instrumentations for HTTP/Express/PG/IORedis with fs disabled; `serviceName: 'ms-365-mcp-server'`
- [x] 06-02: Per-Graph-request span and metric emission (OPS-05, OPS-06) — every `GraphClient.makeRequest` emits an OTel span and updates `mcp_tool_calls_total`/`mcp_tool_duration_seconds`/`mcp_graph_throttled_total` (incremented by RetryHandler from Phase 2); span attributes include `tenant.id`, `tool.name`, `http.status_code`, `graph.request_id` (from ODataError if present), `retry_count`
- [x] 06-03: Prometheus `/metrics` endpoint (OPS-07) — exposed by PrometheusExporter on dedicated port (default 9464, configurable); document scrape config; expose process metrics + custom MCP metrics; gate with optional Bearer auth for non-localhost deployments
- [x] 06-04: Per-tenant rate limiter (OPS-08) — Redis-backed sliding-window counter for request count (`mcp:rl:req:{tenantId}`); separate counter for Graph token budget (`mcp:rl:graph:{tenantId}`) accumulated from observed Graph throttle headers; admin API to configure per-tenant budgets (extends Phase 4); 429 response from gateway with `Retry-After` before any Graph call when budget exhausted
- [x] 06-05: OAuth-surface integration test suite (closes 0%-coverage gap from CONCERNS.md) — concurrent PKCE flow tests, dynamic-registration valid/invalid redirect_uri tests, /token error-path coverage (no body in logs verification), /well-known metadata correctness with and without `MS365_MCP_PUBLIC_URL`, multi-tenant token isolation tests; targets >70% coverage on src/server.ts
- [x] 06-06: Multi-tenant correctness regression suite — two-tenant concurrent-request test (verifies cache-key isolation by deliberately requesting same `userOid+scope` from different `tenantId` and asserting cache misses); tenant disable + Redis cryptoshred cascade test; bearer-pass-through `tid` mismatch test
- [x] 06-07: Operational documentation — runbook covering common alerts off the metric set, scrape-target reference Prometheus + Grafana JSON dashboard skeleton (operator-owned per PROJECT.md, but a starter committed under `docs/observability/`), per-tenant rate-limit tuning guide, audit-log query cookbook, KEK rotation procedure, reverse-proxy reference configs (Caddy primary, nginx + Traefik secondary) with SSE buffering directives
- [x] 06-08: **Gap closure** — wire Prometheus `/metrics` endpoint into `src/server.ts` startup (closes 06-03 Task 3) — `region:phase6-metrics-server` block + `wirePkceStoreGauge(this.pkceStore)` + additive SIGTERM/SIGINT shutdown hook + self-contained Tier B integration test (closes VERIFICATION.md gap 1, unblocks ROADMAP SC#1)
- [x] 06-09: **Gap closure** — rate-limit middleware + retry observe hook + server chain wiring (closes 06-04 Task 3) — create `src/lib/rate-limit/middleware.ts` (two-budget gate + mcp_rate_limit_blocked_total emission + fail-closed 503), extend `src/lib/middleware/retry.ts` with `parseResourceUnit` + `observe()` fire-and-forget at 2xx return sites (D-05), add `region:phase6-rate-limit` mount on `/t/:tenantId/mcp` POST + GET chains (closes VERIFICATION.md gap 2, unblocks ROADMAP SC#3)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Hardening | 0/9 | Not started | - |
| 2. Graph Transport Middleware Pipeline | 0/7 | Not started | - |
| 3. Multi-Tenant Identity & State Substrate | 0/10 | Not started | - |
| 4. Admin API, Webhooks & Delta Persistence | 0/9 | Not started | - |
| 5. Graph Coverage Expansion & Per-Tenant Tool Selection | 0/8 | Not started | - |
| 6. Operational Observability & Rate Limiting | 9/9 | Complete    | 2026-04-22 |
| 7. Agentic Tool Surface + Per-Tenant Memory | 12/12 | Complete    | 2026-04-25 |
| 8. Maximal MCP + Claude/Cowork Connector Surface | 14/14 | Complete    | 2026-05-09 |

### Phase 7: agentic-tool-surface: discovery default + MCP Resources/Prompts/Notifications/Logging/Completions + per-tenant bookmarks/recipes/facts memory + admin API + opt-in migration. Skips Tasks/Elicitation/Sampling/Roots (no claude.ai client). Full SPEC.md / PLAN.md to be filled in /gsd-plan-phase.

**Goal:** Transform the gateway from a curated static tool-list model into an agentic discovery surface where new tenants default to a 12-tool discovery preset, use MCP Resources/Prompts/Notifications/Logging/Completions to navigate the full catalog, and persist per-tenant bookmarks, recipes, and facts without changing existing static-preset tenants.
**Requirements**: Phase 7 SPEC acceptance criteria 1-11
**Depends on:** Phase 6
**Plans:** 12 plans

Plans:
- [x] 07-01: Additive Postgres migrations for tenant_tool_bookmarks, tenant_tool_recipes, tenant_facts, and optional pgvector support
- [x] 07-02: discovery-v1 visible preset, tenant defaults, and separate discovery catalog resolver
- [x] 07-03: Bookmark memory tools, admin subrouter, BM25 boost over discoveryCatalogSet, invalidation, and isolation tests
- [x] 07-04: Recipe memory tools, admin subrouter, run-recipe dispatch, and isolation tests
- [x] 07-05: Fact memory tools, aggregate memory/admin registration, optional-pgvector recall gate, and exact 12-tool surface tests
- [x] 07-06: Static MCP resource catalog markdown and manifest
- [x] 07-07: MCP prompt loader, bounded renderer, and discovery-only registration hook
- [x] 07-08: Stateful MCP Notifications for tool-list/resource-list/resource-update/message events with Streamable HTTP session reuse
- [x] 07-09: MCP Logging and Completions capabilities with per-session log level and discoveryCatalogSet alias completion
- [x] 07-10: Discovery migration CLI, opt-in docs, E2E discovery smoke, and static-mode regression checks
- [x] 07-11: MCP Resources URI parsing, read dispatch, endpoint schema resources, templates, and discovery-only registration
- [x] 07-12: 10 canned MCP prompt workflow markdown templates and exact prompt-count tests

### Phase 8: maximal-mcp-claude-connector-surface: editable skills as prompts + MCP Apps + structured outputs + richer resources/completions/notifications + sampling/elicitation/roots where client-capable + connector naming hardening for Claude/Cowork `serverInfo.name` ignore / `ToolHub` display. Full SPEC.md to be filled into /gsd-plan-phase.

**Goal:** Make ms-365-mcp-server the most complete practical Microsoft 365 MCP gateway for Claude.ai/Cowork hosted connectors and power clients by closing the remaining MCP surface gaps while preserving discovery mode, tenant isolation, and graceful client-specific degradation.
**Requirements**: Phase 8 SPEC acceptance criteria 1-30
**Depends on:** Phase 7
**Plans:** 14 plans

Plans:
- [x] 08-01: Capability profile and connector diagnostics — session profile, diagnostic tool/resource, client matrix tests
- [x] 08-02: Connector identity/naming hardening — env/config, metadata propagation, `.well-known/mcp-connector`, connector-doctor, ToolHub regression tests
- [x] 08-03: Structured output and output schemas — result envelope, schemas, prioritized meta-tool + Graph-family coverage
- [x] 08-04: Tool annotations, progress, cancellation, safe-write classifier — annotations, progress notifications, AbortController, confirmation-required fallback
- [x] 08-05: Editable skill schema and prompt integration — migrations, built-in + DB prompt registry, `prompts.listChanged=true`
- [x] 08-06: Skill tools and skill resources — list/get/save/delete/fork/render/import/export/validate plus `m365://tenant/.../skills` resources
- [x] 08-07: Skill packs and memory convergence — recipes/bookmarks/facts integration, pack import/export, built-in packs, isolation tests
- [x] 08-08: MCP Apps foundation — `ui://` resource serving, CSP/sandbox, app asset pipeline, app fallback contract
- [x] 08-09: App dashboards — inbox, calendar, Teams, file search, permissions, diagnostics, skill editor views
- [x] 08-10: Rich resources and resource templates — `m365://` canonical scheme, Graph-backed read-only resources, resource links
- [x] 08-11: Subscriptions and notifications expansion — prompts/list_changed, Graph webhook/delta resource updates, coalescing
- [x] 08-12: Rich completions — explicit capability and typeahead providers for aliases/skills/recipes/accounts/M365 objects
- [x] 08-13: Sampling, elicitation, roots — capability-gated clients, policies, deterministic fallbacks, tests
- [x] 08-14: Transport parity, docs, migration, and Claude.ai/Cowork smoke — SSE decision, stdio advanced support, admin enablement, docs, connector-doctor, E2E

---

*Roadmap created: 2026-04-18 from PROJECT.md + REQUIREMENTS.md (60+ v1 requirements) + research summary (6-phase proposal) + brownfield codebase audit*

---
phase: quick
plan: 260605-hp9
subsystem: claude-ai-connector-readiness
tags: [oauth, dcr, refresh-tokens, connector-readiness, security]
dependency_graph:
  requires: [tenant-oauth, durable-dcr, session-store, redis-refresh-handles]
  provides: [opaque-gateway-refresh-token-hardening, dcr-log-redaction, oauth-metadata-consistency]
  affects: [src/lib/oauth/tenant-handlers.ts, src/lib/oauth/register-handler.ts, src/lib/connector-identity/metadata.ts, src/server.ts]
tech_stack:
  added: []
  patterns: [lookup-validate-refresh-then-consume, msal-cache-backed-silent-refresh, bounded-log-metadata]
key_files:
  created: []
  modified:
    - src/lib/oauth/tenant-handlers.ts
    - src/lib/oauth/register-handler.ts
    - src/lib/connector-identity/metadata.ts
    - src/server.ts
    - test/auth/delegated-oauth.test.ts
    - test/oauth-register-hardening.test.ts
    - test/oauth-metadata-paths.test.ts
decisions:
  - Durable DCR defaults include authorization_code and refresh_token because hosted connector sessions receive opaque gateway refresh tokens.
  - Gateway refresh handles are consumed only after request binding validation and successful MSAL refresh.
  - Root OAuth metadata advertises refresh_token only when legacy root refresh support is enabled.
metrics:
  completed_date: 2026-06-05
  task_commits: 1
---

# Quick Plan 260605-hp9: Claude AI Connector Readiness Summary

OAuth connector refresh handling was hardened so opaque gateway refresh tokens are durable, client-bound, cache-refresh capable, and not destroyed by malformed refresh attempts.

## Completed Work

### OAuth refresh hardening

- Changed tenant refresh-token grant handling to perform a non-consuming lookup first.
- Validated submitted `client_id` and dynamic-client registration eligibility before consuming the gateway refresh handle.
- Refreshed delegated sessions through the raw authority refresh token when present, or through MSAL cache-backed `acquireTokenSilent({ forceRefresh: true })` when MSAL does not expose a raw refresh token.
- Consumes/rotates the gateway refresh handle only after a successful Microsoft/MSAL refresh.
- Preserves single-use behavior after successful refresh while avoiding session loss on invalid client binding.

### Durable DCR consistency

- Defaulted dynamic client registrations to `['authorization_code', 'refresh_token']` so hosted connectors that omit `grant_types` can use the refresh tokens the gateway issues.
- Kept refresh-grant enforcement for dynamic clients.

### Log privacy

- Removed raw `client_name` from dynamic registration logs.
- Replaced it with bounded metadata: presence, hash, length, grant count, and redirect URI counts.

### Metadata correctness

- Parameterized OAuth authorization-server metadata grant support.
- Tenant OAuth metadata continues to advertise refresh-token support.
- Root legacy OAuth metadata advertises `refresh_token` only when `MS365_MCP_LEGACY_OAUTH_REFRESH=1` enables root refresh grants.

## Verification

- `npx vitest run /home/yui/Documents/ms-365-mcp-server/test/auth/delegated-oauth.test.ts /home/yui/Documents/ms-365-mcp-server/test/oauth-register-hardening.test.ts /home/yui/Documents/ms-365-mcp-server/test/oauth-metadata-paths.test.ts` — PASS (31 tests)
- `npm run lint` — PASS with pre-existing warnings only
- `npm run build` — PASS
- `npm test` — FAIL in pre-existing `src/lib/admin/__tests__/api-keys.verify.test.ts` setup because pg-mem lacks `jsonb_typeof(jsonb)` while applying the `oauth_clients` migration. The failure is outside the OAuth refresh/DCR files changed in this pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unusable opaque refresh tokens when MSAL does not expose raw refresh tokens**
- **Found during:** Review pass 2 / completion critic
- **Issue:** Authorization-code exchange returned a gateway `refresh_token` even though the stored session normally lacked `record.refreshToken`, causing subsequent refresh grants to fail.
- **Fix:** Reused the cache-backed MSAL refresh pattern by deserializing stored MSAL cache and using `acquireTokenSilent` with the stored account home id.
- **Files modified:** `src/lib/oauth/tenant-handlers.ts`, `test/auth/delegated-oauth.test.ts`
- **Commit:** 5572624

**2. [Rule 1 - Bug] Prevented invalid refresh requests from burning the one-time gateway refresh handle**
- **Found during:** Review pass 2 / completion critic
- **Issue:** `consumeGatewayRefreshSession` deleted the refresh handle before client binding checks and before upstream refresh success.
- **Fix:** Switched to lookup-first validation, then consume-after-success with hash comparison before rotation.
- **Files modified:** `src/lib/oauth/tenant-handlers.ts`, `test/auth/delegated-oauth.test.ts`
- **Commit:** 5572624

**3. [Rule 2 - Security] Removed raw dynamic client names from logs**
- **Found during:** Review pass 2
- **Issue:** DCR logged raw `client_name`, which can contain PII or customer-identifying data.
- **Fix:** Log only hash/length/presence and bounded counts.
- **Files modified:** `src/lib/oauth/register-handler.ts`, `test/oauth-register-hardening.test.ts`
- **Commit:** 5572624

**4. [Rule 1 - Bug] Aligned DCR defaults and OAuth metadata with refresh-token behavior**
- **Found during:** Review pass 2 / completion critic
- **Issue:** Default DCR clients could receive refresh tokens they were not registered to use; root OAuth metadata advertised refresh support even when root `/token` rejected refresh.
- **Fix:** Default DCR grants now include refresh support; metadata grant support is configurable and root metadata omits refresh unless the legacy refresh flag is enabled.
- **Files modified:** `src/lib/oauth/register-handler.ts`, `src/lib/connector-identity/metadata.ts`, `src/server.ts`, `test/oauth-metadata-paths.test.ts`
- **Commit:** 5572624

## Deferred Issues

The completion critic listed broader HP9 scope items that were not part of the confirmed OAuth/DCR findings fixed in this pass, including hosted-profile result shaping, binary-resource handoff, runtime schema parity, catalog gates, companion prompt safety, metrics binding gates, and full log-redaction audit coverage. Those artifacts remain deferred for a dedicated HP9 completion pass.

## Known Stubs

None introduced by this fix pass.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: oauth-refresh | src/lib/oauth/tenant-handlers.ts | Refresh grant path now performs cache-backed delegated token refresh and gateway refresh-token rotation. |
| threat_flag: oauth-metadata | src/lib/connector-identity/metadata.ts | Authorization-server metadata now accepts per-route supported grant types. |

## Final Operations Update

- **Additional changed files:** `test/integration/oauth-surface/delegated-real-handlers.int.test.ts`, `src/server.ts`.
- **Additional commits:**
  - `1898eb3` — `style: format delegated OAuth integration test`
  - `f062d79` — `fix: rate limit root dynamic registration`
- **Local gates:**
  - `npm run lint` — PASS with 174 pre-existing warnings and 0 errors.
  - `npm run format:check` — PASS.
  - `npm run build` — PASS.
  - `npx vitest run /home/yui/Documents/ms-365-mcp-server/test/auth/delegated-oauth.test.ts /home/yui/Documents/ms-365-mcp-server/test/oauth-register-hardening.test.ts /home/yui/Documents/ms-365-mcp-server/test/oauth-metadata-paths.test.ts` — PASS (31 tests).
  - `MS365_MCP_INTEGRATION=1 npx vitest run /home/yui/Documents/ms-365-mcp-server/test/integration/oauth-surface/delegated-real-handlers.int.test.ts` — PASS (9 tests).
  - `npm test` — PASS across 187 batched test files.
- **Graphify:** `graphify update /home/yui/Documents/ms-365-mcp-server` completed; `gsd-tools graphify status` reported `stale: false`, but still reported `commit_stale: true` from an older cached build record (`built_at_commit: d32a85b`) despite `GRAPH_REPORT.md` being rebuilt from the current commit. No graphify files had git diffs to commit.
- **Push result:** `git push origin dev` completed; latest pushed head before this summary update was `f062d79`.
- **CI result:** PR 18 checks for `f062d79` passed: Build, Docker image, container smoke test, Integration tests, OAuth-surface coverage gate (D-10), CodeQL, and Analyze all passed. Deploy to Coolify was skipped by workflow rules.
- **PR comments/reviews:** No issue comments were present. Existing automated Codex reviews were on older commits only; no current blocking review comments were present for the latest head.
- **Repository hygiene:** `.claude/settings.json` remained unstaged and uncommitted throughout final operations.

## Self-Check: PASSED

- Modified files exist.
- Commits `5572624`, `1898eb3`, and `f062d79` exist.
- `.claude/settings.json` was not staged or committed.

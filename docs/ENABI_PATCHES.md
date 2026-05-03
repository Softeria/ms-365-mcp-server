# Enabi local patches

This file lists every change Enabi has made on top of `softeria/ms-365-mcp-server`. When reviewing an upstream-sync PR, expect these diffs to **persist** — they should never be reverted by a merge.

## Files Enabi added

| File | Purpose |
|------|---------|
| `src/enabi-allowlist.ts` | Hardcoded allowlist of registered tools. Anything not on the list fails to register. |
| `bin/enabi-build-client.mjs` | Builds `src/generated/client.ts` from our trimmed `endpoints.json`. Replaces upstream's `npm run generate`. |
| `bin/enabi-audit-capabilities.mjs` | CI script comparing registered tools and scopes against `docs/CAPABILITY_BASELINE.json`. |
| `docs/CAPABILITY_BASELINE.json` | The frozen list of tools and scopes. CI fails if anything diverges. |
| `docs/INVESTIGATION.md` | Phase 1 audit report. |
| `docs/SCOPES.md` | Scope justifications. |
| `docs/ENABI_PATCHES.md` | This file. |
| `docs/UPSTREAM_SYNC.md` | Runbook for the weekly upstream-sync PR review. |
| `docs/INSTALL.md` | Install guide for Enabi employees. |
| `docs/AZURE_APP_SETUP.md` | One-time Azure AD app registration procedure for the Enabi tenant. |
| `docs/MIGRATION.md` | Runbook for moving employees off the upstream Softeria install onto the Enabi fork. |
| `scripts/install.sh` | One-line `curl \| bash` installer that clones the Enabi fork, builds, writes `.env` with the Enabi Azure app IDs, and registers with Claude Desktop. |
| `.github/workflows/ci.yml` | Lint, audit, secret-scan, dependency-scan on every PR. (Phase 3) |
| `.github/workflows/upstream-sync.yml` | Weekly automated PR fetching `upstream/main`. (Phase 4) |
| `renovate.json` | Pinned-dependency updates with no auto-merge. (Phase 3) |

## Files Enabi modified

| File | What changed | Conflict risk on upstream sync |
|------|--------------|-------------------------------|
| `src/endpoints.json` | Trimmed from 270 → 75 endpoints. `Mail.Read.Shared` moved from `workScopes` to `scopes` for the 3 shared-mailbox endpoints. | **HIGH** — every upstream `npm run generate` run regenerates this file. The upstream-sync PR will likely show a huge diff. **Always discard upstream changes to this file** unless you're deliberately adding tools. |
| `src/graph-tools.ts` | Imports `ALLOWED_TOOLS`, refuses to register non-allowlisted tools (in both `registerGraphTools` and `buildToolsRegistry`). Removed `parse-teams-url` registration. | Medium — upstream churn here will conflict with our allowlist enforcement. Re-apply the allowlist gate after merging. |
| `src/auth.ts` | `buildScopesFromEndpoints` skips non-allowlisted tools, so scopes never include rejected endpoints' permissions. | Medium |
| `src/cloud-config.ts` | `getDefaultClientId()` throws instead of returning Softeria's default. Forces `MS365_MCP_CLIENT_ID` to be set. | Low |
| `package.json` | Renamed to `@enabi/m365-mcp-server`, replaced `generate` script with `build:client`, added `audit:capabilities` script. | Low |
| `.gitignore` | Removed `src/generated/client.ts` exclusion (we commit it now). | Low |

## Files Enabi removed

| File | Why |
|------|-----|
| `glama.json` | Glama MCP-registry metadata, not relevant to a private fork. |

## Files Enabi neutralized but kept

| File | Status |
|------|--------|
| `bin/generate-graph-client.mjs` | **Never run.** Would re-download the full Graph OpenAPI spec and regenerate all 270 endpoints. Kept on disk only to minimize merge conflicts. |
| `bin/modules/*.mjs` | Same — supporting modules for the disabled generator. |
| `src/lib/teams-url-parser.ts` | Still on disk but no longer imported anywhere. Safe to delete in a future cleanup. |

## Invariants the upstream-sync review must verify

1. `src/endpoints.json` contains **exactly** the 75 toolNames listed in `docs/CAPABILITY_BASELINE.json` under `tools` (minus the 6 auth tools).
2. `src/enabi-allowlist.ts` is unchanged unless the PR explicitly adds or removes tools with justification.
3. `npm run audit:capabilities` exits 0.
4. No new `dependencies` in `package.json` outside the allowlist documented in `docs/UPSTREAM_SYNC.md`.
5. No new `fetch(...)` or `http.request(...)` calls to non-Microsoft hosts.
6. No new external script imports (`<script src="https://...">`) in any HTML template.

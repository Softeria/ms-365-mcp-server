# Quick Task 260604-bga Summary

## Task

Fix false-positive dashboard/resource prerequisites where stronger read scopes such as `Mail.ReadWrite` should satisfy read requirements like `Mail.Read`, and ensure discovery-mode dashboard prerequisite checks do not confuse visible discovery meta-tools with generated Graph aliases.

## Result

Status: complete

## Changes

- Added regression coverage for dashboard prerequisite warnings when `Mail.ReadWrite` satisfies `Mail.Read`.
- Added regression coverage for Graph-backed mail resources using `Mail.ReadWrite` against a `Mail.Read` requirement.
- Added a dashboard regression ensuring discovery-mode visible meta-tools do not make generated dashboard aliases appear unavailable.
- Added a dashboard invariant test keeping generated prerequisites on canonical endpoint aliases.
- Added shared side-effect-free scope helper in `src/lib/scope-satisfaction.ts`.
- Wired dashboard and Graph-backed resource scope gates through the shared helper.
- Updated dashboard tool prerequisite logic to evaluate generated aliases through `resolveDiscoveryCatalog()` for discovery surfaces.
- Propagated `enabledToolsExplicit` into dashboard tenant context so explicit allowlists continue to fail closed.

## Changed Files

- `/home/yui/Documents/ms-365-mcp-server/test/dashboard-fallbacks.test.ts`
- `/home/yui/Documents/ms-365-mcp-server/test/mcp-resources/resources-surface.test.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/lib/scope-satisfaction.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/lib/mcp-dashboards/data.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/lib/mcp-dashboards/tools.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/lib/mcp-resources/graph-backed.ts`
- `/home/yui/Documents/ms-365-mcp-server/.planning/STATE.md`

## Verification

- `npx vitest run test/dashboard-fallbacks.test.ts test/mcp-resources/resources-surface.test.ts` — PASS (20), FAIL (0)
- `npx vitest run test/dashboard-fallbacks.test.ts test/app-dashboards.test.ts` — PASS (9), FAIL (0)
- `npx vitest run test/dashboard-fallbacks.test.ts test/mcp-resources/resources-surface.test.ts test/app-dashboards.test.ts` — PASS (23), FAIL (0)
- `npm run lint` — PASS with existing warnings (162 warnings, 0 errors)
- `npm run build` — PASS
- `graphify update /home/yui/Documents/ms-365-mcp-server` — completed; rebuilt graph files in `graphify-out`
- `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs graphify status --cwd /home/yui/Documents/ms-365-mcp-server` — reported stale metadata despite graphify update: `stale: true`, `commit_stale: true`, `current_commit: a423a48`, `built_at_commit: 7c494eb`, `commits_behind: 22`

## Commits

- `02249d1 test(260604-bga): add dashboard prerequisite regressions`
- `a423a48 fix(260604-bga): honor stronger read scopes`

## Notes

- No push or deploy was performed.
- `ROADMAP.md` was not modified.
- Pre-existing modified file `/home/yui/Documents/ms-365-mcp-server/.claude/settings.json` was left untouched and uncommitted.
- Graphify CLI update completed, but GSD graphify status still reports stale metadata; this is reported rather than hidden.

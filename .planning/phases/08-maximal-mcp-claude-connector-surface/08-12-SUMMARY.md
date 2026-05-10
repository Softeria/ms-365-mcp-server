---
phase: 08-maximal-mcp-claude-connector-surface
plan: 08-12
subsystem: mcp
tags: [mcp, completions, discovery, microsoft-graph, tenant-isolation]

requires:
  - phase: 07-agentic-tool-surface
    provides: discovery catalog, MCP prompts/resources, request-scoped tenant context
provides:
  - Explicit MCP completion capability registration
  - Tenant-scoped local completion providers for prompts and resources
  - Bounded Graph-backed completion providers with isolated cache keys
affects: [phase-08, mcp-prompts, mcp-resources, discovery, tenant-isolation]

tech-stack:
  added: []
  patterns:
    - MCP SDK completion handler registration through guarded private method access
    - Completion cache keys include tenant, session, account, provider, query, enabled tools, and capability profile

key-files:
  created:
    - src/lib/mcp-completions/cache.ts
    - src/lib/mcp-completions/providers.ts
    - test/mcp-completions.test.ts
    - test/completion-isolation.test.ts
  modified:
    - src/lib/mcp-completions/handlers.ts
    - src/lib/mcp-completions/register.ts
    - src/lib/mcp-prompts/register.ts
    - src/lib/mcp-resources/register.ts

key-decisions:
  - "Preserved MAX_COMPLETION_VALUES at 20 to maintain existing completion contract tests while staying below MCP's 100-value cap."
  - "Graph-backed completion calls fail closed unless backing discovery tool and tenant scopes allow lookup."
  - "Completion cache isolation includes request/session and auth account identifiers to prevent tenant, session, or account leakage."

patterns-established:
  - "Local completion providers read request tenant context and return [] when context is missing."
  - "Graph-backed providers use bounded $top/$select Graph requests and parse only display-safe labels/IDs."
  - "Prompt and resource completion wiring delegates to shared providers via src/lib/mcp-completions/handlers.ts re-exports."

requirements-completed:
  - Phase 8 SPEC AC 20
  - Phase 8 SPEC AC 21
  - Phase 8 SPEC AC 26
  - Phase 8 SPEC AC 27
  - Phase 8 SPEC AC 30

duration: 32min
completed: 2026-05-09
---

# Phase 08 Plan 12: MCP Completions Summary

**Tenant-safe MCP completions now cover local discovery/memory/skill/account values plus bounded Microsoft 365 object lookups.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-05-09T00:11:44Z
- **Completed:** 2026-05-09T00:49:00Z
- **Tasks:** 2
- **Files modified:** 8 implementation/test files plus this summary and state metadata

## Accomplishments

- Registered explicit MCP completion handling so the SDK advertises completions and services `completion/complete` requests.
- Added local providers for tenant id, account, alias, skill name, recipe name, bookmark label/alias, and fact scope, with tenant/owner scoping and fail-closed defaults.
- Added Graph-backed providers for users, groups, teams, channels, sites, drives, mail folders, calendars, and events using small `$top`/`$select` requests and discovery/scope gates.
- Added an isolated completion cache keyed by tenant, session, account, provider, query, enabled-tool set, and capability profile.
- Wired completions into prompt arguments and Graph-backed resource templates.

## Task Commits

1. **Task 1 + 2: Explicit/local and Graph-backed completions** - `1d7df0f` (feat)

## Files Created/Modified

- `src/lib/mcp-completions/cache.ts` - Short-TTL in-memory cache with tenant/session/account/tool/capability isolation.
- `src/lib/mcp-completions/providers.ts` - Shared local and Graph-backed completion providers.
- `src/lib/mcp-completions/handlers.ts` - Compatibility re-export surface for completion providers.
- `src/lib/mcp-completions/register.ts` - Explicit SDK completion handler/capability registration.
- `src/lib/mcp-prompts/register.ts` - Prompt argument completion wiring for skills, recipes, bookmarks, and fact scopes.
- `src/lib/mcp-resources/register.ts` - Resource template completion wiring for Graph-backed identifiers.
- `test/mcp-completions.test.ts` - Local provider tenant/owner/gating tests.
- `test/completion-isolation.test.ts` - Graph-backed cache isolation, fail-closed, and bounded-request tests.

## Decisions Made

- Kept `MAX_COMPLETION_VALUES` at 20 because existing completion contract tests assert that cap, and it remains stricter than MCP's 100-value hard cap.
- Used existing discovery catalog resolution for alias/tool visibility so completions align with tenant-enabled discovery surfaces.
- Used endpoint metadata from `src/endpoints.json` for scope checks, with read-write scopes satisfying read scopes.

## Deviations from Plan

None - plan goals executed as specified. Task commits were combined because shared provider files implement local and Graph-backed providers together.

## Issues Encountered

- Existing completion contract tests failed when the completion cap was raised to 100; restored the existing 20-value cap.
- TypeScript rejected direct extension of `McpServer` because `setCompletionRequestHandler` is private in SDK typings; fixed by casting through a narrow standalone optional method type.
- ESLint flagged unnecessary escaped quotes in the Graph `$search` builder; fixed the template literal.

## Verification

- `npm --prefix /home/yui/Documents/ms-365-mcp-server exec -- vitest run test/mcp-completions.test.ts` - passed (3 tests)
- `npm --prefix /home/yui/Documents/ms-365-mcp-server exec -- vitest run test/completion-isolation.test.ts test/mcp-completions.test.ts` - passed (6 tests)
- `npm --prefix /home/yui/Documents/ms-365-mcp-server exec -- vitest run test/mcp-completions/completions.test.ts` - passed (8 tests)
- `npm --prefix /home/yui/Documents/ms-365-mcp-server exec -- tsc --noEmit` - passed
- `npm --prefix /home/yui/Documents/ms-365-mcp-server exec -- eslint src/lib/mcp-completions/handlers.ts src/lib/mcp-completions/register.ts src/lib/mcp-completions/cache.ts src/lib/mcp-completions/providers.ts src/lib/mcp-prompts/register.ts src/lib/mcp-resources/register.ts test/mcp-completions.test.ts test/completion-isolation.test.ts` - passed
- `npm --prefix /home/yui/Documents/ms-365-mcp-server exec -- prettier --check src/lib/mcp-completions/handlers.ts src/lib/mcp-completions/register.ts src/lib/mcp-completions/cache.ts src/lib/mcp-completions/providers.ts src/lib/mcp-prompts/register.ts src/lib/mcp-resources/register.ts test/mcp-completions.test.ts test/completion-isolation.test.ts` - passed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 08-13 can build on explicit MCP completions and the shared tenant-safe completion provider surface.

---
*Phase: 08-maximal-mcp-claude-connector-surface*
*Completed: 2026-05-09*

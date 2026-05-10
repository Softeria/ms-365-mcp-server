---
phase: 08-maximal-mcp-claude-connector-surface
plan: 06
subsystem: mcp-skills-tools-resources
tags: [mcp, skills, resources, validation, notifications, vitest]
requires:
  - phase: 08-maximal-mcp-claude-connector-surface
    provides: "08-05 editable skill schema/store and 08-03 structured result envelope"
provides:
  - "Discovery-mode skill tool suite for list/get/save/delete/fork/render/validate/import/export"
  - "Tenant-scoped skill validation for enabled tools, memory references, resources, and high-risk write metadata"
  - "Canonical m365://tenant/{tenantId}/skills resources with mcp:// compatibility aliases"
  - "Skill mutation notifications for prompts/list_changed and resources/updated"
affects: [mcp-skills, mcp-resources, mcp-notifications, tenant-surface]
tech-stack:
  added: []
  patterns:
    - "Skill resources always assert tenant ownership before store reads."
    - "Published skill saves fail closed on invalid references while unpublished drafts can persist with warnings."
key-files:
  created:
    - src/lib/mcp-skills/tools.ts
    - src/lib/mcp-skills/resources.ts
    - src/lib/mcp-skills/validation.ts
    - test/skills-tools.test.ts
    - test/skills-resources.test.ts
  modified:
    - src/lib/mcp-skills/store.ts
    - src/lib/mcp-resources/uri.ts
    - src/lib/mcp-resources/register.ts
    - src/lib/mcp-resources/read.ts
    - src/server.ts
    - src/request-context.ts
    - src/lib/postgres.ts
key-decisions:
  - "Disabled tenant skill rows suppress same-name built-ins for that tenant, allowing delete-skill to hide forked built-ins without affecting other tenants."
  - "Resource reads return canonical m365:// URIs even when clients use mcp:// compatibility aliases."
  - "Pool/request-context singletons are anchored on globalThis so vi.resetModules tests and dynamic imports share injected test state."
patterns-established:
  - "Skill tool mutations publish prompt and resource updates together."
  - "Discovery tenants get m365 skill resource list/templates; static tenants keep prior resource surface."
requirements-completed:
  - Phase 8 SPEC AC 10
  - Phase 8 SPEC AC 11
  - Phase 8 SPEC AC 12
  - Phase 8 SPEC AC 13
  - Phase 8 SPEC AC 24
  - Phase 8 SPEC AC 26
  - Phase 8 SPEC AC 30
duration: 60min
completed: 2026-05-08
---

# Phase 08 Plan 06: Skill Tools and Resources Summary

Editable skills are now available through MCP tools and canonical skill resources with tenant isolation, reference validation, safe-write metadata, and change notifications.

## Performance

- **Duration:** 60 min
- **Started:** 2026-05-08T17:30:00Z
- **Completed:** 2026-05-08T18:30:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Added skill CRUD/render/validate/import/export MCP tool registration for discovery-mode tenants.
- Added validation for referenced enabled tools, recipes, bookmarks, facts, resources, and high-risk write tools.
- Added draft-vs-published behavior: invalid published saves are blocked; invalid drafts persist with validation warnings.
- Added canonical `m365://tenant/{tenantId}/skills/...` resource reads for skill indexes, markdown, schema, and skill-pack payloads.
- Preserved `mcp://tenant/{tenantId}/...` compatibility aliases while returning canonical `m365://` response URIs.
- Registered m365 skill resources/templates only for discovery-surface tenants.
- Wired skill tools into the discovery MCP server surface and mutation notifications.
- Hardened module-reset test behavior for Postgres pool and request context singletons.

## Task Commits

1. **Task 1+2 RED:** `429eb27` test(08-06): add failing editable skill surface tests
2. **Task 1+2 GREEN:** `bb417cf` feat(08-06): expose editable skill tools and resources

## Files Created/Modified

- `test/skills-tools.test.ts` - skill tool fork/save/render/list/delete, draft validation, high-risk metadata, and notification coverage.
- `test/skills-resources.test.ts` - canonical m365 resource reads, mcp alias compatibility, tenant isolation, invalid URI, and discovery registration coverage.
- `src/lib/mcp-skills/tools.ts` - skill MCP tool suite and mutation notifications.
- `src/lib/mcp-skills/resources.ts` - skill resource response helpers and canonical URI generation.
- `src/lib/mcp-skills/validation.ts` - skill schema/reference/safe-write validation.
- `src/lib/mcp-skills/store.ts` - record-level skill queries, save, disable, and prompt conversion helpers.
- `src/lib/mcp-resources/uri.ts` - m365 scheme and skill resource URI parsing.
- `src/lib/mcp-resources/read.ts` - skill resource read dispatch with tenant ownership check.
- `src/lib/mcp-resources/register.ts` - discovery-only m365 skill resources/templates.
- `src/server.ts` - discovery-surface skill tool registration.
- `src/request-context.ts` - global AsyncLocalStorage singleton for reset-safe request context.
- `src/lib/postgres.ts` - global Postgres pool singleton for reset-safe test injection.
- `.planning/STATE.md` - plan progress updated.
- `.planning/ROADMAP.md` - 08-06 marked complete.

## Validation Evidence

- `npx vitest run test/skills-tools.test.ts test/skills-resources.test.ts` — PASS (7 tests).
- `npx eslint test/skills-tools.test.ts test/skills-resources.test.ts src/lib/mcp-skills/tools.ts src/lib/mcp-skills/resources.ts src/lib/mcp-skills/validation.ts src/lib/mcp-skills/store.ts src/lib/mcp-resources/uri.ts src/lib/mcp-resources/read.ts src/lib/mcp-resources/register.ts src/request-context.ts src/lib/postgres.ts` — PASS (no issues).
- `npm run build` — PASS.

## Decisions Made

- Deleted/forked built-ins are represented by disabled tenant rows, so the tenant no longer sees that built-in while other tenants still do.
- `import-skill-pack` remains a safe fallback entry point in this plan; deeper pack manifest semantics move to 08-07.
- m365 skill resources are discovery-only in resources/list/templates to avoid changing static tenant surfaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Test harness isolation] Stabilized singletons across `vi.resetModules()`**
- **Found during:** Skill tool GREEN tests.
- **Issue:** Dynamic imports after `vi.resetModules()` created fresh `requestContext` and Postgres singleton instances, losing test tenant context and pg-mem pool injection.
- **Fix:** Anchored both singletons on `globalThis` symbols.
- **Files modified:** `src/request-context.ts`, `src/lib/postgres.ts`
- **Verification:** Skill tool/resource tests pass.
- **Committed in:** `bb417cf`

**2. [pg-mem compatibility] Replaced `IS NOT DISTINCT FROM` in skill writes**
- **Found during:** Skill tool GREEN tests.
- **Issue:** pg-mem could not parse `IS NOT DISTINCT FROM` in skill save/delete queries.
- **Fix:** Generated explicit `owner_subject IS NULL` or `owner_subject = $2` predicates from validated owner state.
- **Files modified:** `src/lib/mcp-skills/store.ts`
- **Verification:** Skill tool/resource tests pass.
- **Committed in:** `bb417cf`

**Total deviations:** 2 auto-fixed.
**Impact on plan:** No scope reduction; both fixes support deterministic tenant-isolated tests.

## Issues Encountered

- Full `npm run lint` still reports pre-existing repository warnings and two now-fixed errors in the new test file. Changed-file ESLint passes with no issues.
- The implementation commit spans both plan tasks because Task 2 resource wiring and Task 1 tool validation/shareable store helpers were interdependent; the RED tests were still committed separately before GREEN.

## Known Stubs

- `import-skill-pack` accepts the payload and returns a fallback warning without applying a manifest. Full pack semantics are scheduled in 08-07.

## Threat Flags

None beyond the plan threat model. Tenant ownership is checked before skill resource reads, and published skill saves fail closed on invalid references.

## User Setup Required

None.

## Next Phase Readiness

- Ready for 08-07 skill pack and memory convergence to replace fallback pack import/export with manifest-aware behavior.
- Graphify was refreshed after source changes and should be checked for stale status before final handoff.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/08-maximal-mcp-claude-connector-surface/08-06-SUMMARY.md`.
- Task commits exist: `429eb27`, `bb417cf`.
- Plan validation commands passed and are recorded above.

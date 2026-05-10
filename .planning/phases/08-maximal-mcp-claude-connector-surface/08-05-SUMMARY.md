---
phase: 08-maximal-mcp-claude-connector-surface
plan: 05
subsystem: mcp-prompts-skills
tags: [mcp, prompts, skills, postgres, zod, notifications, vitest]
requires:
  - phase: 08-maximal-mcp-claude-connector-surface
    provides: "08-01/08-04 discovery tenant policy and Phase 7 MCP prompt/notification foundations"
provides:
  - "Additive tenant_skills schema with tenant ownership, owner visibility, source/version fields, and indexes"
  - "Zod validation and escaped bounded rendering for editable skill prompt bodies"
  - "Prompt registry merge for bundled read-only prompts plus DB-backed visible skills"
  - "prompts/list_changed event publisher and Phase 8 listChanged capability gating"
affects: [mcp-prompts, mcp-skills, mcp-notifications, tenant-memory]
tech-stack:
  added: []
  patterns:
    - "Tenant skill SQL always starts with tenant_id predicate and optional owner visibility predicate"
    - "Built-in prompts remain read-only while tenant skills render with escaped substitutions"
key-files:
  created:
    - migrations/20261101000000_tenant_skills.sql
    - src/lib/mcp-skills/schema.ts
    - src/lib/mcp-skills/store.ts
    - src/lib/mcp-skills/register-prompts.ts
    - test/skills-schema.test.ts
    - test/mcp-prompts.test.ts
  modified:
    - src/lib/mcp-prompts/register.ts
    - src/lib/mcp-notifications/events.ts
key-decisions:
  - "Down migration is intentionally a no-op because Phase 8 requires additive-only schema changes and acceptance forbids DROP/TRUNCATE in this migration."
  - "Editable skill prompt capability is gated by enableEditableSkills so static-preset prompt behavior remains listChanged=false."
patterns-established:
  - "Skill rows convert to PromptTemplateDefinition at the MCP prompt boundary."
  - "Skill template substitutions are escaped separately from legacy bundled prompt rendering."
requirements-completed:
  - Phase 8 SPEC AC 9
  - Phase 8 SPEC AC 10
  - Phase 8 SPEC AC 11
  - Phase 8 SPEC AC 26
  - Phase 8 SPEC AC 30
duration: 35min
completed: 2026-05-08
---

# Phase 08 Plan 05: Editable Skills as MCP Prompts Summary

**Tenant/user editable skills now have additive Postgres storage, Zod validation, escaped rendering, and MCP prompt registry integration with prompt list-change notifications.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-08T00:00:00Z
- **Completed:** 2026-05-08T00:35:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `tenant_skills` additive schema with tenant FK, owner subject, name/title/description, frontmatter/body/arguments, visibility/source/version fields, enabled/timestamps, uniqueness, and tenant indexes.
- Added MCP-safe skill validation and escaped bounded template rendering to prevent user-editable prompt bodies from injecting raw HTML-like substitutions.
- Added tenant/user visibility store helpers and prompt conversion for DB-backed skills.
- Extended MCP prompt registration to merge bundled prompts with visible skill prompts when editable skills are enabled, while preserving static behavior with `prompts.listChanged=false`.
- Added `notifications/prompts/list_changed` publisher for future skill create/update/delete/import/fork operations.

## Task Commits

1. **Task 1 RED:** `9860b12` test(08-05): add failing tenant skills schema tests
2. **Task 1 GREEN:** `0ca323e` feat(08-05): add tenant skills schema
3. **Task 2 RED:** `ddd06bf` test(08-05): add failing skill prompt registry tests
4. **Task 2 GREEN:** `3073a7c` feat(08-05): merge skill prompts into MCP registry

## Files Created/Modified

- `migrations/20261101000000_tenant_skills.sql` - additive tenant-owned skills table and indexes.
- `src/lib/mcp-skills/schema.ts` - MCP-safe name/content schemas and escaped renderer.
- `src/lib/mcp-skills/store.ts` - tenant-scoped visible skill query helpers and row-to-prompt conversion.
- `src/lib/mcp-skills/register-prompts.ts` - prompt merge/render helpers for built-in and DB-backed skills.
- `src/lib/mcp-prompts/register.ts` - editable-skills merge point and listChanged capability gate.
- `src/lib/mcp-notifications/events.ts` - `prompts/list_changed` event type and publisher.
- `test/skills-schema.test.ts` - hermetic migration/schema/rendering tests.
- `test/mcp-prompts.test.ts` - prompt merge, isolation predicate, rendering, and notification tests.

## Validation Evidence

- `npx vitest run test/skills-schema.test.ts` — PASS (5 tests).
- `npx vitest run test/mcp-prompts.test.ts test/skills-schema.test.ts` — PASS (10 tests).
- `! grep -R "DROP TABLE\|ALTER TABLE .* DROP\|TRUNCATE" migrations/20261101000000_tenant_skills.sql` — PASS (no matches).
- `npx tsc --noEmit` — PASS after regenerating missing generated Graph client artifacts in this worktree.
- `npm run lint` — PASS with existing warnings only.
- `npm run build` — PASS.

## Decisions Made

- Used a no-op Down Migration so the migration file itself satisfies the additive-only acceptance gate.
- Kept DB loading as a store/helper boundary and made registry merging dependency-injected (`loadSkillPrompts`, `enableEditableSkills`) so static tenants retain the exact previous capability shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security/Additive Schema] Removed destructive down migration**
- **Found during:** Task 1 acceptance gate.
- **Issue:** A conventional `DROP TABLE IF EXISTS tenant_skills` down migration caused the required destructive-schema grep to match.
- **Fix:** Replaced the down migration body with a no-op comment to enforce the phase's additive-only schema policy.
- **Files modified:** `migrations/20261101000000_tenant_skills.sql`
- **Verification:** Destructive grep returned no matches.
- **Committed in:** `0ca323e`

**Total deviations:** 1 auto-fixed (Rule 2).
**Impact on plan:** Strengthened the explicit additive-only guarantee; no scope creep.

## Issues Encountered

- The isolated worktree lacked generated Graph client artifacts needed by `src/lib/mcp-completions/handlers.ts`; ran `npm run generate`, then `npx tsc --noEmit` passed. Generated artifacts are gitignored and were not committed.
- `pg-mem` does not support every Postgres catalog/operator used by production migrations, so migration validation uses executable DDL plus insert/constraint behavior and direct migration SQL assertions for index names.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model. The new SQL/store surface is tenant-scoped and covered by isolation predicate tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for dependent skill CRUD/tools/resources work to call the store and publish `prompts/list_changed` on mutations.
- Orchestrator should refresh graphify after merging this worktree because source code changed.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/08-maximal-mcp-claude-connector-surface/08-05-SUMMARY.md`.
- Task commits exist: `9860b12`, `0ca323e`, `ddd06bf`, `3073a7c`.
- Plan validation commands passed and are recorded above.

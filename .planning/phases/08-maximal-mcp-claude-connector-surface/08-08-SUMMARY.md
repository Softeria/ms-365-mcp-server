---
phase: 08-maximal-mcp-claude-connector-surface
plan: 08
subsystem: mcp-apps
status: complete
completed_at: "2026-05-08"
tags:
  - mcp
  - apps
  - resources
  - security
  - vitest
requirements_completed:
  - Phase 8 SPEC AC 15
  - Phase 8 SPEC AC 16
  - Phase 8 SPEC AC 26
  - Phase 8 SPEC AC 27
  - Phase 8 SPEC AC 30
key_files:
  - src/lib/mcp-apps/assets.ts
  - src/lib/mcp-apps/register.ts
  - src/lib/mcp-apps/security.ts
  - src/apps/app-shell.html
  - src/server.ts
  - tsup.config.ts
  - test/mcp-apps.test.ts
  - test/app-resource-security.test.ts
---

# 08-08 Summary: MCP Apps foundation

## Accomplishments

- Added discovery-gated MCP Apps foundation with seven `ui://m365/*.html` dashboard resources.
- Added secure static app shell asset and asset reader for registered app resources.
- Added strict Apps MIME, CSP, sandbox metadata, app payload secret checks, HTML snippet sanitizer, and recursive asset scanner.
- Added app view tools that return text, structured JSON, `m365://` resources, and optional `ui://` metadata when Apps are effective.
- Preserved exact non-Apps fallback copy without marking fallback responses as errors.
- Ensured static-preset tenants do not expose app tools or app resources by default.
- Extended `tsup` asset copy pipeline so `src/apps` HTML/CSS/JS/SVG assets are copied into `dist/apps`.

## Task commits

- `0c969af test(08-08): add failing MCP apps foundation tests`
- `0c361f0 feat(08-08): add MCP apps foundation`

## Files created

- `src/apps/app-shell.html`
- `src/lib/mcp-apps/assets.ts`
- `src/lib/mcp-apps/register.ts`
- `src/lib/mcp-apps/security.ts`
- `test/mcp-apps.test.ts`
- `test/app-resource-security.test.ts`

## Files modified

- `src/server.ts`
- `tsup.config.ts`

## Validation evidence

- `NODE_OPTIONS=--max-old-space-size=12288 npx vitest run test/mcp-apps.test.ts` — PASS (5), FAIL (0)
- `NODE_OPTIONS=--max-old-space-size=12288 npx vitest run test/mcp-apps.test.ts test/app-resource-security.test.ts` — PASS (9), FAIL (0)
- `npm run build` — PASS
- `npx eslint test/mcp-apps.test.ts test/app-resource-security.test.ts src/lib/mcp-apps/assets.ts src/lib/mcp-apps/register.ts src/lib/mcp-apps/security.ts tsup.config.ts` — PASS, no issues

## Decisions

- Used repo-owned static HTML assets instead of adding an MCP Apps helper dependency.
- Reused one secure shell (`app-shell.html`) for all registered app dashboards; app-specific data is supplied through tool results and linked resources.
- Registered Apps only for discovery-surface tenants so static presets remain unchanged.
- Included both `_meta.ui.resourceUri` and `_meta['ui/resourceUri']` compatibility metadata for Apps-capable clients.
- Kept exact UI-spec fallback copy as warning/text when Apps are unsupported.

## Deviations

- Plan 08-08 was executed before 08-07 because user explicitly requested 08-08. Roadmap leaves 08-07 pending.
- App view tool backing data is foundational placeholder data; full dashboard data population is deferred to 08-09.

## Known stubs

- App view tools currently return empty `items: []` payloads and placeholder `m365://tenant/current/apps/{slug}.json` resource links. This is intentional foundation scaffolding for 08-09 dashboard implementation.

## Issues encountered

- Initial RED tests failed due missing `mcp-apps` modules, as expected.
- Targeted tests initially exhausted heap because importing `src/server.ts` pulled in the large generated client. Fixed by mocking `../src/generated/client.js` in the Apps test.
- Resource list metadata initially omitted `mimeType`; fixed by importing `APP_MIME_TYPE` from `security.ts` where it is defined.

## Threat flags

- No token or secret markers are accepted in app assets or fallback payloads.
- External HTTP(S) script URLs are rejected by asset validation.
- App resource URI parsing accepts only known `ui://m365/{dashboard}.html` resources with no query/hash/credentials/port.
- Static tenants remain isolated from new Apps resources/tools.

## Self-check

- Phase 8 SPEC AC 15 covered by registered Apps `ui://` resources and app view metadata.
- Phase 8 SPEC AC 16 covered by strict CSP/sandbox metadata, static asset scanner, and tests.
- Phase 8 SPEC AC 26 covered by static-preset regression test.
- Phase 8 SPEC AC 27 covered by text/structured/resource fallback contract.
- Phase 8 SPEC AC 30 covered by app resource security tests.

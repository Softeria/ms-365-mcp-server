# 08-01 Summary: Capability negotiation foundation and connector diagnostics

## Result

Completed plan 08-01 for Phase 8 capability negotiation foundation.

## Tasks completed

### Task 1: Effective capability profile foundation

- Added capability profile types and effective gate computation.
- Added conservative defaults for unknown or under-advertised clients.
- Preserved tool-only behavior for static tenants when Phase 8 is disabled.
- Covered transport-specific capability behavior for Streamable HTTP, stdio, and legacy SSE.
- Ensured profile and gate objects are immutable.

### Task 2: Session/request profiles and diagnostics surface

- Added optional request-context capability profile support.
- Added Streamable HTTP session registry capability profile storage.
- Captured initialize-time advertised capabilities into immutable session profiles.
- Added helpers to resolve profiles from Streamable HTTP sessions or request context.
- Added `connector-diagnostics` discovery tool with text and structured JSON output.
- Redacted request-like secrets, tokens, cookies, raw Graph bodies, and PII-heavy tenant labels from diagnostics.
- Registered diagnostics in discovery-mode MCP server construction.

## Validation

Passed:

```bash
npx vitest run test/capability-profile.test.ts test/connector-diagnostics.test.ts
```

Passed:

```bash
npx vitest run test/capability-profile.test.ts test/connector-diagnostics.test.ts test/transports/streamable-http.test.ts test/transports/three-transport-smoke.test.ts
```

Result: 17 tests passed, 0 failed.

Passed:

```bash
npm run build
```

Persistence check passed with 0 matches:

```bash
rg "INSERT.*capability|tenant_capability" src migrations test -n || true
```

Full-suite note:

```bash
npm run test -- --run
```

Full suite was attempted after generating the gitignored `src/generated/client.ts`. Remaining failures were unrelated startup/fail-fast child-process tests returning `status: null`, outside the 08-01 capability/diagnostics path.

## Commits

- `9be4047 test(08-01): add failing capability profile tests`
- `1f2b472 feat(08-01): add capability profile gates`
- `253514f test(08-01): add failing connector diagnostics tests`
- `4018a98 feat(08-01): add connector diagnostics surface`

## Changed files

- `.gitignore`
- `.planning/phases/08-maximal-mcp-claude-connector-surface/08-01-SUMMARY.md`
- `src/lib/mcp-capabilities/diagnostics.ts`
- `src/lib/mcp-capabilities/profile.ts`
- `src/lib/mcp-capabilities/session-profile.ts`
- `src/lib/mcp-notifications/session-registry.ts`
- `src/lib/transports/streamable-http.ts`
- `src/request-context.ts`
- `src/server.ts`
- `test/capability-profile.test.ts`
- `test/connector-diagnostics.test.ts`

## Notes

- No production persistence was added for client capability profiles.
- `.planning/STATE.md` and `.planning/ROADMAP.md` were not updated.
- `src/generated/client.ts` was generated locally for validation but remains gitignored and uncommitted.
- Code changed in worktree; orchestrator should refresh graphify after merge.

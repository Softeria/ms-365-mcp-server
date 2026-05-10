# 08-14 Summary — Maximal MCP Claude Connector Surface

## Objective

Close Phase 08 with an explicit connector surface decision, transport smoke coverage, connector-doctor validation, and operator-facing documentation for Claude connector rollout.

## Completed

- Made Streamable HTTP at `/t/:tenantId/mcp` the documented canonical hosted Phase 08 connector path.
- Kept legacy SSE as an explicit limited/deprecated compatibility shim.
  - Legacy SSE initialize now advertises only `tools`.
  - Unsupported legacy SSE calls return the Phase 08 migration hint for `/t/{tenantId}/mcp`.
- Added stdio capability-profile helper coverage so roots, sampling, and elicitation are effective only when client initialize capabilities advertise them; Apps remain disabled for stdio.
- Added Phase 08 transport smoke coverage for:
  - Streamable HTTP initialize and discovery tool-only loop.
  - Legacy SSE tools-only limited support.
  - stdio advanced capability gating.
- Added connector-doctor CLI tenant display-name wiring through `--tenant-display-name`.
- Added connector smoke coverage for:
  - Local OAuth/connector metadata pass with matching tenant connector names.
  - Clear failure when server-owned connector metadata diverges to `ToolHub`.
- Added operator docs for:
  - Streamable HTTP connector URL.
  - Legacy SSE deprecation path.
  - Claude Code/Desktop/Claude.ai/API support matrix from current evidence.
  - Static-preset tenants remaining unchanged unless explicitly Phase 08-enabled.
  - Tool-only fallback loop: `search-tools` -> `get-tool-schema` -> `execute-tool`.
  - Apps, skills, structured output, notifications, roots, sampling, and elicitation policy.

## Files changed

- `/home/yui/Documents/ms-365-mcp-server/src/lib/transports/legacy-sse.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/lib/transports/stdio.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/cli.ts`
- `/home/yui/Documents/ms-365-mcp-server/src/index.ts`
- `/home/yui/Documents/ms-365-mcp-server/test/transports/phase-08-transport-smoke.test.ts`
- `/home/yui/Documents/ms-365-mcp-server/test/connector-smoke.test.ts`
- `/home/yui/Documents/ms-365-mcp-server/README.md`
- `/home/yui/Documents/ms-365-mcp-server/docs/phase-08-connector.md`
- `/home/yui/Documents/ms-365-mcp-server/docs/phase-08-skills-apps.md`

## Validation

Passed:

```bash
npx vitest run test/connector-smoke.test.ts
npx vitest run test/transports/phase-08-transport-smoke.test.ts test/connector-smoke.test.ts
npm run build
```

Full suite attempted:

```bash
npm test
```

Result: process killed with exit code 137. The captured failure output contained `Killed` and no assertion failure before termination, so this run is resource-inconclusive.

## Commits

- `4f4c2d0 feat(08-14): finalize transport parity smokes`
- `460962f feat(08-14): add connector enablement smoke`
- `8e9a7f0 chore(08-14): format transport smoke files`

## Notes

- Existing unrelated dirty files were left untouched.
- `STATE.md` already had uncommitted changes before this task; this summary records task completion without overwriting that continuation state.

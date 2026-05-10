# Plan 08-03 Summary

## Result

Implemented Phase 8 structured MCP result envelopes and output schemas for discovery and memory tools while preserving text-only client compatibility.

## Changes

- Added schema-valid `structuredContent` coverage for discovery tools:
  - `search-tools`
  - `get-tool-schema`
  - `execute-tool`
- Added output schema registration for discovery and memory tools.
- Preserved existing JSON `content[0].text` payloads for legacy callers and existing tests.
- Added memory tool structured result envelopes for bookmark, recipe, and fact tool groups.
- Added tests for envelope helpers, secret stripping, output schema publication, and discovery tool structured results.
- Kept forbidden result keys out of structured data and metadata:
  - `accessToken`
  - `refreshToken`
  - `clientSecret`
  - `Authorization`

## Commits

- `0ae4f71 test(08-03): add failing structured output envelope tests`
- `66ee4b7 feat(08-03): add structured result envelopes`
- `4d7c6d8 test(08-03): add failing discovery output schema tests`
- `b6c1d0a feat(08-03): add structured outputs to MCP tools`

## Validation

Passed:

- `npm --prefix /home/yui/Documents/ms-365-mcp-server/.claude/worktrees/agent-a5bce9c1ccce6e471 run test -- --run test/tool-schema.test.ts test/tool-selection/discovery-v1-surface.test.ts test/structured-output.test.ts test/lib/memory/bookmarks.test.ts test/lib/memory/facts.test.ts test/lib/memory/recipes.test.ts`
  - 6 files passed
  - 63 tests passed
- `npm --prefix /home/yui/Documents/ms-365-mcp-server/.claude/worktrees/agent-a5bce9c1ccce6e471 run lint`
  - 0 errors
  - existing warnings remain outside this plan scope
- `npm --prefix /home/yui/Documents/ms-365-mcp-server/.claude/worktrees/agent-a5bce9c1ccce6e471 run format:check`
- `npm --prefix /home/yui/Documents/ms-365-mcp-server/.claude/worktrees/agent-a5bce9c1ccce6e471 run build`

Full-suite note:

- `npm --prefix /home/yui/Documents/ms-365-mcp-server/.claude/worktrees/agent-a5bce9c1ccce6e471 run test -- --run` failed on pre-existing startup fail-fast coverage:
  - `test/public-url-failfast.test.ts` expected exit code `78`, got `null`.
- Re-running with `--bail=1` confirmed the first failure is in `test/public-url-failfast.test.ts`, not in the Phase 8 structured output changes.

## Graphify

Code changed in this worktree. Orchestrator should refresh graph after wave merge.

`graphify_refresh_needed: true`

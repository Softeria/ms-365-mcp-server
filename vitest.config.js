import { defineConfig } from 'vitest/config';

// Integration tests (*.int.test.* + test/integration/**) require Postgres,
// Redis, or real MSAL/OAuth state that unit tests shouldn't assume. They
// are opted-in via MS365_MCP_INTEGRATION=1 so the default `npm test`
// surface stays fast and hermetic. CI pipelines that start the real
// services run `MS365_MCP_INTEGRATION=1 npm test` (or `npm run test:int`).
const RUN_INTEGRATION = process.env.MS365_MCP_INTEGRATION === '1';

const INTEGRATION_PATTERNS = [
  '**/*.int.test.*',
  'test/integration/**/*.test.*',
  // Legacy plan-03 tests that boot the server and exercise Redis-backed
  // token storage end-to-end. Moved here rather than renamed to keep
  // git blame clean.
  'test/token-endpoint.test.ts',
];

// 2026-04-24: nine test files timed out on Node 20/22 GitHub Actions runners
// while passing on Node 22 and Node 25 locally. Common thread: each test
// calls a timer / async hook that never resolves (vitest testTimeout 45 s
// trips). Root cause is CI-runner-specific — likely a NodeSDK global-meter
// registration started by a prior test file interacting with
// PeriodicExportingMetricReader.forceFlush(); timer semantics under the
// vitest singleThread pool; or pg-mem pool teardown. The behavior cannot
// be reproduced locally (verified Node 22.22.0 + same vitest 3.2.4).
// Quarantine is now explicit only; protected CI must run the security-critical
// isolation/auth tests unless a maintainer deliberately sets this override.
const EXPLICIT_FLAKY_QUARANTINE =
  process.env.MS365_MCP_SKIP_CI_FLAKY === '1'
    ? [
        // OTel instrument registry / span tests — PeriodicExportingMetricReader
        // forceFlush() hangs on CI when a prior file installed NodeSDK's
        // global MeterProvider. Local: pass in ~30ms.
        'test/lib/otel-metrics.test.ts',
        'test/lib/graph-client.span.test.ts',
        'test/lib/middleware/retry.span.test.ts',
        // Timer-dependent tests — setTimeout / fake timers that never fire
        // on CI. Local: pass in <100ms. Un-quarantine attempt 2026-04-24
        // via global useRealTimers reset did NOT fix the hang — root cause
        // is not a vi.useFakeTimers leak. Keeping the global reset in
        // test/setup.ts as a defensive measure; re-quarantining pending
        // deeper investigation (see task #8).
        'test/lib/rate-limit/sliding-window.test.ts',
        'test/transports/legacy-sse.test.ts',
        'test/tool-selection/per-tenant-bm25.test.ts',
        // AsyncLocalStorage / request-context isolation tests — hang at the
        // first concurrent Promise.all. Local: pass in ~100ms.
        'test/request-context.test.ts',
        'test/logger-correlation.test.ts',
        // Node 20 matrix only — audit-integration uses pg-mem + server.ts
        // factories that never yield on Node 20 runners.
        'test/audit/audit-integration.test.ts',
        // Integration-tier .int.test.ts files that pass locally on Node 22
        // (verified 2026-04-24 with MS365_MCP_INTEGRATION=1 + testcontainers
        // warm) but time out on GitHub Actions runners under the same
        // Node 22.x + vitest 3.2.4 + singleThread config. The Integration
        // workflow keeps RUN_INTEGRATION=1 so non-quarantined .int tests
        // still run; Build workflow already excludes .int via
        // INTEGRATION_PATTERNS.
        //   - audit emission fire-and-forget never visible to the Pool.query
        //     check under the runner's scheduler.
        'test/integration/four-flows.test.ts',
        'test/integration/tenant-disable-cascade.test.ts',
        //   - ALS isolation under concurrent Promise.all — runner-specific
        //     scheduling surfaces a theoretical leak that doesn't happen
        //     locally.
        'test/tool-selection/dispatch-two-tenant.int.test.ts',
        'test/tool-selection/tools-list-filter.int.test.ts',
        //   - OAuth tid-mismatch middleware + audit write path.
        'test/integration/multi-tenant/bearer-tid-mismatch.int.test.ts',
        //   - Redis pub/sub propagation under 100 ms — runner clock skew.
        'src/lib/admin/__tests__/api-keys.revoke.int.test.ts',
      ]
    : [];

// The generated Microsoft Graph client under src/generated/client.ts is
// ~46 MB and is transitively imported by most server-level tests
// (src/server.ts -> src/graph-tools.ts -> src/generated/client.ts). Each
// vitest fork must be big enough to keep it in memory + run its own
// test setup; 8 GB is the empirical floor discovered while stabilising
// Phase 5's regenerated client.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    // Auto-unstub vi.stubGlobal('fetch', ...) between tests and files so
    // mail-folders.test.ts (and siblings) cannot leak their mocked fetch
    // onto bearer-auth / rate-limit / transports tests that rely on the
    // native fetch. Observed before this setting: `await fetch(...)`
    // returned undefined in those tests → `Cannot read properties of
    // undefined (reading 'status')`. Paired with the stubGlobal rewrite
    // of every `global.fetch = vi.fn()` raw assignment.
    unstubGlobals: true,
    // Plan 06-05 (D-07): vitest globalSetup that boots Postgres + Redis
    // Testcontainers once per process and hands URLs to .int.test.ts files
    // via project.provide() / vitest.inject(). Gated by the same
    // MS365_MCP_INTEGRATION=1 flag as the integration-tier exclude list so
    // `npm test` (unit-only) pays ZERO Docker cost — the hook is not even
    // registered when the gate is off.
    globalSetup: RUN_INTEGRATION ? ['./test/setup/integration-globalSetup.ts'] : [],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/**',
      ...(RUN_INTEGRATION ? [] : INTEGRATION_PATTERNS),
      ...EXPLICIT_FLAKY_QUARANTINE,
    ],
    // Run one test file at a time, but keep Vitest in isolated worker mode.
    // `singleThread: true` sends every file to one long-lived worker; with the
    // generated 46 MB Graph client that worker's RSS grows until CI/local OOM.
    // `fileParallelism: false` still serializes execution while allowing Vitest
    // to recycle the worker between isolated files.
    pool: 'threads',
    fileParallelism: false,
    poolOptions: {
      threads: {
        isolate: true,
      },
    },
    // Per-file isolation (fresh VM context + module registry). Required
    // because many tests use top-level `vi.mock('../../src/logger.js')`
    // and similar hoisted mocks — those leak across files under
    // `isolate: false` and produce false failures. Memory pressure from
    // re-parsing src/generated/client.ts per file is absorbed by the 8 GB
    // execArgv above; see `HEAP_MB`.
    isolate: true,
    // The cold-import cost of src/generated/client.ts (tsx transform on a
    // 46 MB file) can push the first test that lands on a fresh VM context
    // past the default 5 s timeout. Middleware tests that dynamic-import
    // tenant / registry modules are the usual victim — they pay the parse
    // cost + the await round-trip before any assertion. 45 s is
    // comfortably over the observed cold-import wall time.
    testTimeout: 45_000,
    hookTimeout: 45_000,
    // Plan 06-05 D-10: coverage narrowed to OAuth surface files so the post-
    // processor (bin/check-oauth-coverage.mjs) operates on small statement maps.
    coverage: {
      provider: 'v8',
      include: [
        'src/server.ts',
        'src/lib/oauth/register-handler.ts',
        'src/lib/oauth/token-handler.ts',
        'src/lib/oauth/tenant-handlers.ts',
      ],
      reporter: ['json', 'lcov', 'text'],
    },
  },
});

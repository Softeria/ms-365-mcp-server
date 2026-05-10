#!/usr/bin/env node
import './lib/otel.js'; // MUST be first import — registers OTel instrumentation hooks before anything else loads
// Note: OTel reads OTEL_EXPORTER_OTLP_ENDPOINT from process.env at SDK start time.
// This MUST run BEFORE dotenv/config so that in production the env var comes from
// the real environment (systemd / Docker / CI), not from .env.
import 'dotenv/config';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, type CommandOptions } from './cli.js';
import logger from './logger.js';
import { parseHttpOption } from './lib/http-option.js';
// NOTE: AuthManager and MicrosoftGraphServer are dynamic-imported below inside
// main() so the ~45 MB src/generated/client.ts (pulled transitively through
// server.ts) is NOT parsed during --health-check probes or before the
// fail-fast prod-HTTP config validation. See validateProdHttpConfig and plan
// 01-07 SECUR-04: the fail-fast must exit within the 10 s timeout of
// test/startup-validation.test.ts, which a cold tsx transform of the generated
// client violates on CI runners.
import { registerShutdownHooks } from './lib/shutdown.js';
import type { ReadinessCheck } from './lib/health.js';
import * as postgres from './lib/postgres.js';
import * as redisClient from './lib/redis.js';
import { RedisPkceStore } from './lib/pkce-store/redis-store.js';
import { MemoryPkceStore } from './lib/pkce-store/memory-store.js';
import type { PkceStore } from './lib/pkce-store/pkce-store.js';
import { version } from './version.js';
import { connectorDoctor } from './lib/connector-identity/metadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Probe /healthz and return an exit code suitable for Docker HEALTHCHECK.
 *
 * Behaviour:
 *   - stdio mode (no --http): exits 0 — the stdio transport is invoked
 *     per-request by the MCP client, so process-is-alive is the only
 *     meaningful liveness signal.
 *   - HTTP mode: HTTP GET /healthz on the configured port with 3s timeout.
 *     Exit 0 on HTTP 200, exit 1 on any other status, connection refused,
 *     or timeout.
 *
 * This short-circuit MUST NOT initialize MSAL, load secrets, or start a
 * server — it is invoked by the Docker HEALTHCHECK every 30s and must be
 * cheap.
 */
async function runHealthCheck(args: CommandOptions): Promise<number> {
  if (!args.http) {
    // stdio mode: no HTTP server to probe. If we reached this line, the
    // process is alive and healthy enough to execute Node.
    return 0;
  }

  const { host, port } = parseHttpOption(args.http);
  const probeHost = host ?? '127.0.0.1';

  return new Promise<number>((resolve) => {
    const req = http.get({ hostname: probeHost, port, path: '/healthz', timeout: 3000 }, (res) => {
      // Drain the response so the socket closes cleanly.
      res.resume();
      resolve(res.statusCode === 200 ? 0 : 1);
    });
    req.on('error', () => resolve(1));
    req.on('timeout', () => {
      req.destroy();
      resolve(1);
    });
  });
}

/**
 * Sysexits EX_CONFIG — "the configuration file was invalid in some way"
 * (https://man.openbsd.org/sysexits.3). Used for fail-fast exits when a
 * required production env var is missing. Distinct from the generic exit 1
 * so operators + Docker restart policies can differentiate config errors
 * from transient crashes.
 */
const EX_CONFIG = 78;

/**
 * Advisory probe for v1 OS-keychain (keytar) leftovers on stdio startup
 * (SECUR-07 / D-04). Runs ONLY when:
 *   - we're in stdio mode (HTTP/SSE transports never used the keychain)
 *   - the file-based token cache does not yet exist (so the probe is a
 *     one-time nudge, not recurring startup noise)
 *
 * The probe is spawned as a separate process so a missing keytar does
 * not pull the native module into our address space. Exit code is
 * advisory only (2 = leftovers present); the server continues regardless
 * so a broken or missing probe cannot block startup.
 */
async function maybeProbeKeytarLeftovers(args: CommandOptions): Promise<void> {
  if (args.http) return;
  try {
    const { getTokenCachePath } = await import('./auth.js');
    const cachePath = getTokenCachePath();
    if (existsSync(cachePath)) return;

    // Dev (src/index.ts) and prod (dist/index.js) resolve the same relative path.
    const probePath = path.resolve(__dirname, '..', 'bin', 'check-keytar-leftovers.cjs');
    if (!existsSync(probePath)) return;

    // Advisory: the probe writes to stderr if leftovers are detected. Result
    // is intentionally ignored — a probe failure is never fatal.
    const result = spawnSync(process.execPath, [probePath], { stdio: 'inherit' });
    void result;
  } catch {
    // Probe failures must not block server startup.
  }
}

/**
 * Fail-fast validation for production HTTP-mode config (plan 01-07 /
 * D-02 / SECUR-04).
 *
 * In prod HTTP mode both MS365_MCP_PUBLIC_URL and an explicit CORS
 * allowlist MUST be set — running half-configured would silently produce
 * broken OAuth metadata (unreachable issuer URLs) and/or an open-gate
 * CORS posture. We exit EX_CONFIG (78) before any server resources are
 * allocated so the operator gets a loud, early error with remediation
 * guidance.
 *
 * Stdio mode skips both checks: those env vars are HTTP-only. Dev mode
 * (NODE_ENV != 'production') is permissive — loopback is auto-allowed
 * and OAuth metadata uses the request origin.
 *
 * The deprecated singular MS365_MCP_CORS_ORIGIN (v1) and
 * MS365_MCP_BASE_URL (v1) are honored as fallbacks so existing
 * deployments don't break on upgrade — they emit a warn log in
 * src/server.ts at startup (computeCorsAllowlist / publicBase resolution).
 */
function validateProdHttpConfig(args: CommandOptions): void {
  if (!args.http) return;
  if (process.env.NODE_ENV !== 'production') return;

  const hasPublicUrl =
    !!process.env.MS365_MCP_PUBLIC_URL?.trim() || !!process.env.MS365_MCP_BASE_URL?.trim();
  if (!hasPublicUrl) {
    const message =
      'MS365_MCP_PUBLIC_URL is required in production HTTP mode (NODE_ENV=production). ' +
      'Set it to the externally-reachable origin (e.g., https://mcp.example.com). ' +
      'Deprecated MS365_MCP_BASE_URL is accepted as a fallback. ' +
      'Dev mode (NODE_ENV != production) permits it to be unset.';
    logger.error(message);
    // Secondary write to stderr so tests can grep the variable name even
    // when pino's transport routes the log record to stdout in prod mode.
    process.stderr.write(`[STARTUP CONFIG ERROR] ${message}\n`);
    process.exit(EX_CONFIG); // process.exit(78) — sysexits EX_CONFIG
  }

  const hasPluralCors = !!process.env.MS365_MCP_CORS_ORIGINS?.trim();
  const hasSingularCors = !!process.env.MS365_MCP_CORS_ORIGIN?.trim();
  if (!hasPluralCors && !hasSingularCors) {
    const message =
      'MS365_MCP_CORS_ORIGINS is required in production HTTP mode (NODE_ENV=production). ' +
      'Set it to a comma-separated list of allowed origins ' +
      '(e.g., https://app.example.com,https://desktop.example.com). ' +
      'Deprecated MS365_MCP_CORS_ORIGIN (singular) is accepted as a fallback. ' +
      'Dev mode (NODE_ENV != production) permits it to be unset (any http://localhost:* origin is auto-allowed).';
    logger.error(message);
    process.stderr.write(`[STARTUP CONFIG ERROR] ${message}\n`);
    process.exit(EX_CONFIG); // process.exit(78) — sysexits EX_CONFIG
  }
}

/**
 * Plan 04-08 renewal-cron handle. Module-level so the Phase 3 shutdown
 * orchestrator can stop it between server.close (Phase 1) and
 * tenantPool.drain (Phase 3) per the RESEARCH.md:1348-1358 shutdown order.
 * Null when the cron wasn't enabled via MS365_MCP_SUBSCRIPTION_CRON.
 */
let subscriptionCronHandle: { stop(): Promise<void> } | null = null;

/**
 * Phase 3 (plan 03-01 Task 2) graceful-shutdown orchestrator.
 *
 * Runs in parallel with the Phase 1 shutdown handler installed by
 * `registerShutdownHooks()`. The Phase 1 handler owns server.close +
 * pino.flush + OTel shutdown; this orchestrator owns Phase 3 substrate
 * teardown in the order documented in 03-CONTEXT.md: tenantPool.drain →
 * redis.quit → pg.end. pkce-store and kek have no runtime shutdown — Redis
 * TTL handles PKCE entries, and the KEK buffer is statically bound.
 *
 * The `region:phase3-shutdown-*` markers create the same disjoint-edit
 * contract as the startup anchors: sibling plans fill their own region only.
 */
async function phase3ShutdownOrchestrator(): Promise<void> {
  try {
    // region:phase4-sub-cron-teardown (filled by 04-08)
    // Plan 04-08: subscription renewal cron teardown — runs BEFORE
    // tenant-pool drain per RESEARCH.md:1348-1358 so any in-flight renewal
    // loop can complete (using a still-warm tenant pool) before the pool is
    // emptied. Idempotent — handle is null when the cron was never started.
    if (subscriptionCronHandle) {
      try {
        const { stopRenewalCron } = await import('./lib/admin/subscriptions.js');
        await stopRenewalCron(subscriptionCronHandle);
      } catch (err) {
        logger.warn({ err: (err as Error).message }, 'subscription cron stop failed (non-fatal)');
      }
      subscriptionCronHandle = null;
    }
    // endregion:phase4-sub-cron-teardown

    // region:phase3-shutdown-tenant-pool (filled by 03-05)
    // Plan 03-05: TenantPool teardown — FIRST step per CONTEXT.md order:
    // tenantPool.drain → redis.shutdown → pg.shutdown. Draining the MSAL pool
    // first lets any pending Redis cache writes complete before the client is
    // quit. Idempotent — safe to call even when no pool was constructed.
    const { shutdown: tenantPoolShutdown } = await import('./lib/tenant/tenant-pool.js');
    await tenantPoolShutdown();
    // endregion:phase3-shutdown-tenant-pool

    // region:phase3-shutdown-redis       (filled by 03-02)
    // Plan 03-02: Redis teardown — runs BEFORE postgres (ordering enforced by
    // anchor position: shutdown-tenant-pool → shutdown-redis → shutdown-postgres).
    // redisClient.shutdown() is idempotent — safe to call even when the client
    // was never constructed (stdio mode or HTTP mode that crashed pre-bootstrap).
    await redisClient.shutdown();
    // endregion:phase3-shutdown-redis

    // region:phase3-shutdown-postgres    (filled by 03-01 Task 2 — THIS plan)
    await postgres.shutdown();
    // endregion:phase3-shutdown-postgres
  } catch (err) {
    // Shutdown errors must not throw out of the signal handler — swallow
    // and log so the Phase 1 shutdown handler can still exit cleanly.
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'phase3ShutdownOrchestrator: error during teardown (non-fatal)'
    );
  }
}

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    // --health-check short-circuit for Docker HEALTHCHECK (OPS-03).
    // MUST run BEFORE AuthManager creation or secrets loading — the probe is
    // invoked every 30s and must stay cheap. It also MUST exit before any
    // side-effectful startup (MSAL, secrets, logger file IO) so a broken
    // config cannot cause the probe to hang or fail spuriously.
    if (args.healthCheck) {
      const exitCode = await runHealthCheck(args);
      process.exit(exitCode);
    }

    if (args.connectorDoctor) {
      const result = await connectorDoctor({
        publicBaseUrl: args.connectorDoctor,
        publicUrl: args.connectorDoctor,
        tenantId: args.tenantId ?? process.env.MS365_MCP_TENANT_ID,
        tenantDisplayName: args.tenantDisplayName,
        observedName: args.observedName,
        version,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'fail' ? 1 : 0);
    }

    // Fail-fast validation for production HTTP-mode config (plan 01-07 /
    // D-02). MUST run AFTER the --health-check short-circuit (so the probe
    // stays cheap on healthy containers) but BEFORE any MSAL / secrets /
    // server bootstrapping (so a misconfigured deployment exits cleanly
    // without allocating resources). Stdio mode + dev mode are permissive.
    validateProdHttpConfig(args);

    // Heavy modules are loaded AFTER the fail-fast so a misconfigured prod
    // deployment exits in <1 s rather than waiting for the tsx transform of
    // src/generated/client.ts (~45 MB, pulled transitively via server.ts).
    // See test/startup-validation.test.ts 10 s timeout.
    const [authModule, serverModule] = await Promise.all([
      import('./auth.js'),
      import('./server.js'),
    ]);
    const AuthManager = authModule.default;
    const { buildScopesFromEndpoints } = authModule;
    const MicrosoftGraphServer = serverModule.default;

    // Register graceful-shutdown hooks early (plan 01-05 / OPS-09). In stdio
    // mode the null server skips server.close() but still flushes pino +
    // OTel on Ctrl-C. In HTTP mode this call is a pre-listen safety net —
    // src/server.ts re-registers with the real http.Server once app.listen
    // returns, and registerShutdownHooks's removeAllListeners guard makes
    // that later registration win.
    registerShutdownHooks(null, logger);

    const includeWorkScopes = args.orgMode || false;
    if (includeWorkScopes) {
      logger.info('Organization mode enabled - including work account scopes');
    }

    const readOnly = args.readOnly || false;
    const scopes = buildScopesFromEndpoints(includeWorkScopes, args.enabledTools, readOnly);

    if (args.listPermissions) {
      const sorted = [...scopes].sort((a, b) => a.localeCompare(b));
      const mode = includeWorkScopes ? 'org' : 'personal';
      const filter = args.enabledTools ? args.enabledTools : undefined;
      console.log(JSON.stringify({ mode, readOnly, filter, permissions: sorted }, null, 2));
      process.exit(0);
    }

    // ── Phase 3 bootstrap scaffolding (plan 03-01 Task 2) ─────────────────
    // The `region:phase3-*` markers below create a disjoint edit contract
    // for the sibling wave-2/3 plans (03-02, 03-03, 03-04, 03-05). Each
    // sibling plan's Task 2 edits ONLY inside its own region; surrounding
    // bootstrap code is off-limits. The marker comments are LOAD-BEARING —
    // do not delete them. grep counts must remain exactly 2 per name.
    //
    // Startup order (per 03-CONTEXT.md): postgres → redis → kek → pkce-store
    // → tenant-pool. Only HTTP mode needs these substrates; stdio reuses the
    // file-backed token cache + in-memory PKCE per D-04.
    const isHttpMode = Boolean(args.http);
    const readinessChecks: ReadinessCheck[] = [];

    // region:phase3-postgres  (filled by 03-01 Task 2 — THIS plan)
    // Plan 03-01: Postgres bootstrap — runs BEFORE Redis (03-02), migrations (03-01 bin/migrate),
    // tenant-pool (03-05), transports (03-09).
    if (isHttpMode) {
      postgres.getPool(); // throws fast if env missing
      readinessChecks.push(postgres.readinessCheck);
    }
    // endregion:phase3-postgres

    // region:phase3-redis       (filled by 03-02 Task 2)
    // Plan 03-02: Redis bootstrap — runs AFTER pg (03-01), BEFORE tenant-pool (03-05).
    // getRedis() is idempotent + lazyConnect, so this line constructs the client but
    // does NOT open a TCP connection yet. readinessCheck is pushed into the Phase 1
    // readinessChecks[] array so /readyz reflects Redis reachability in HTTP mode.
    // In stdio mode (or when MS365_MCP_REDIS_URL is unset), getRedis() returns the
    // MemoryRedisFacade and /readyz is not wired (no HTTP server listening).
    if (isHttpMode) {
      redisClient.getRedis();
      readinessChecks.push(redisClient.readinessCheck);
    }
    // endregion:phase3-redis

    // region:phase3-kek         (filled by 03-04 Task 2 — THIS plan)
    // Plan 03-04: KEK bootstrap — load once at startup so production config
    // errors (missing MS365_MCP_KEK + MS365_MCP_KEYVAULT_URL) surface before
    // any tenant work. The unwrapped KEK is consumed by TenantPool (03-05) to
    // unwrap each tenant's wrapped_dek envelope on demand.
    if (isHttpMode) {
      const { loadKek } = await import('./lib/crypto/kek.js');
      await loadKek();
    }
    // endregion:phase3-kek

    // region:phase3-pkce-store  (filled by 03-03 Task 2)
    // Plan 03-03: PkceStore bootstrap — constructed ONCE, injected into
    // MicrosoftGraphServer via the deps bag. HTTP mode uses Redis as the
    // source of truth so multiple replicas see the same PKCE state (ROADMAP
    // SC#6). Stdio mode uses the Map-backed MemoryPkceStore (single process,
    // no external Redis required). The interface is identical across modes —
    // /authorize + /token handlers do not fork by transport.
    const pkceStore: PkceStore = isHttpMode
      ? new RedisPkceStore(redisClient.getRedis())
      : new MemoryPkceStore();
    // endregion:phase3-pkce-store

    // region:phase3-tenant-pool (filled by 03-05 Task 2/3)
    // Plan 03-05: TenantPool bootstrap — runs LAST among the phase3 substrates
    // because it consumes the KEK loader (from the kek anchor above) and
    // redisClient.getRedis() (from the redis anchor above). LRU 200 + 30min
    // idle + 60s sweep timer (unref'd). Stdio mode skips — its single-user
    // file-backed token cache remains the canonical path per D-04.
    //
    // Plan 03-10 (TENANT-06): push tenantsLoadedCheck into the readiness
    // chain so /readyz flips to 503 on a freshly-deployed empty Postgres.
    // Phase 4 admin API onboards the first tenant; before that, /readyz
    // correctly reports not_ready.
    if (isHttpMode) {
      const { loadKek } = await import('./lib/crypto/kek.js');
      const { initTenantPool } = await import('./lib/tenant/tenant-pool.js');
      initTenantPool(redisClient.getRedis(), await loadKek());
      const { tenantsLoadedCheck } = await import('./lib/health.js');
      readinessChecks.push(tenantsLoadedCheck(postgres.getPool()));
    }
    // endregion:phase3-tenant-pool

    // ── Phase 3 plan 03-09 Task 2: stdio --tenant-id loader ─────────────
    // When stdio mode is configured with a tenantId (via --tenant-id CLI
    // flag or MS365_MCP_TENANT_ID env var), load the tenant row from
    // Postgres up front. This enables delegated/app-only from stdio against
    // a pre-configured tenant while preserving the legacy
    // AuthManager.create() + file-backed token cache path for the default
    // (no tenant-id) stdio use case.
    //
    // 03-09 supersedes the 03-06 seam (MS365_MCP_TENANT_ID_HTTP env var):
    // the `--tenant-id` CLI flag is now the primary entrypoint, with
    // MS365_MCP_TENANT_ID as the env fallback (standard naming) and
    // MS365_MCP_TENANT_ID_HTTP retained as a deprecated transition alias.
    //
    // On tenant_not_found the process exits 1 — the operator asked for a
    // specific tenant and we can't honour that; silent fallback to the
    // legacy path would mask a config error and run under the wrong
    // identity. Missing Postgres substrate (DATABASE_URL unset) logs a
    // warn + falls back to legacy, since stdio use from a dev laptop
    // without pg running is an explicitly-supported path.
    if (!isHttpMode) {
      const tenantIdArg =
        (args as CommandOptions).tenantId ??
        process.env.MS365_MCP_TENANT_ID ??
        process.env.MS365_MCP_TENANT_ID_HTTP;
      if (tenantIdArg) {
        if (!process.env.MS365_MCP_DATABASE_URL) {
          logger.warn(
            { tenantId: tenantIdArg },
            'stdio --tenant-id set but MS365_MCP_DATABASE_URL is unset; falling back to legacy single-tenant AuthManager'
          );
        } else {
          try {
            const pool = postgres.getPool();
            const { rows } = await pool.query(
              'SELECT id, mode, client_id FROM tenants WHERE id = $1 AND disabled_at IS NULL',
              [tenantIdArg]
            );
            if (!rows[0]) {
              console.error(`tenant_not_found: ${tenantIdArg}`);
              process.exit(1);
            }
            logger.info({ tenantId: tenantIdArg, mode: rows[0].mode }, 'stdio tenant loaded');
          } catch (err) {
            // pg pool errors (connection refused, bad credentials) are
            // operator-level problems — loud failure preserves the "you
            // asked for a tenant, we couldn't honour it" contract.
            console.error(`stdio --tenant-id load failed: ${(err as Error).message}`);
            process.exit(1);
          }
        }
      }
    }

    const authManager = await AuthManager.create(scopes);
    await authManager.loadTokenCache();

    if (args.authBrowser) {
      authManager.setUseInteractiveAuth(true);
      logger.info('Browser-based interactive auth enabled');
    }

    if (args.login) {
      if (args.authBrowser) {
        await authManager.acquireTokenInteractive();
      } else {
        await authManager.acquireTokenByDeviceCode();
      }
      logger.info('Login completed, testing connection with Graph API...');
      const result = await authManager.testLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.verifyLogin) {
      logger.info('Verifying login...');
      const result = await authManager.testLogin();
      console.log(JSON.stringify(result));
      process.exit(0);
    }

    if (args.logout) {
      await authManager.logout();
      console.log(JSON.stringify({ message: 'Logged out successfully' }));
      process.exit(0);
    }

    if (args.listAccounts) {
      const accounts = await authManager.listAccounts();
      const selectedAccountId = authManager.getSelectedAccountId();
      const result = accounts.map((account) => ({
        id: account.homeAccountId,
        username: account.username,
        name: account.name,
        selected: account.homeAccountId === selectedAccountId,
      }));
      console.log(JSON.stringify({ accounts: result }));
      process.exit(0);
    }

    if (args.selectAccount) {
      const success = await authManager.selectAccount(args.selectAccount);
      if (success) {
        console.log(JSON.stringify({ message: `Selected account: ${args.selectAccount}` }));
      } else {
        console.log(JSON.stringify({ error: `Account not found: ${args.selectAccount}` }));
        process.exit(1);
      }
      process.exit(0);
    }

    if (args.removeAccount) {
      const success = await authManager.removeAccount(args.removeAccount);
      if (success) {
        console.log(JSON.stringify({ message: `Removed account: ${args.removeAccount}` }));
      } else {
        console.log(JSON.stringify({ error: `Account not found: ${args.removeAccount}` }));
        process.exit(1);
      }
      process.exit(0);
    }

    // Advisory probe for v1 OS-keychain leftovers (SECUR-07 / D-04). Stdio
    // only; skipped when the file cache already exists. Runs AFTER auth
    // bootstrap so we've already confirmed tokens would have loaded from
    // the file cache — if we got here without tokens, the probe can tell
    // the user how to migrate them.
    await maybeProbeKeytarLeftovers(args);

    // Plan 05-04 TENANT-08 (Pitfall 8): seed the stdio-mode dispatch-guard
    // fallback. StdioServerTransport dispatches tool calls outside the ALS
    // frame established here, so we cannot rely on requestContext.run() to
    // carry the tenant triple. Instead register a module-level fallback that
    // dispatch-guard consults when ALS is empty.
    //
    //   --tenant-id set: load the row from Postgres (already done at line
    //     371-403 above) and compute enabled_tools_set via the parser.
    //   --tenant-id absent (legacy stdio): register a permissive fallback
    //     that mirrors the full registered tool surface — the v1-era
    //     `--enabled-tools` regex filter at registerGraphTools time is the
    //     sole source of truth in legacy mode. This preserves backwards
    //     compatibility without falling open on HTTP mode (HTTP mode always
    //     populates ALS via loadTenant + seedTenantContext).
    if (!isHttpMode) {
      const { setStdioFallback } = await import('./lib/tool-selection/dispatch-guard.js');
      const tenantIdArg =
        (args as CommandOptions).tenantId ??
        process.env.MS365_MCP_TENANT_ID ??
        process.env.MS365_MCP_TENANT_ID_HTTP;
      if (tenantIdArg && process.env.MS365_MCP_DATABASE_URL) {
        try {
          const pool = postgres.getPool();
          const { rows } = await pool.query<{
            enabled_tools: string | null;
            preset_version: string;
          }>(
            'SELECT enabled_tools, preset_version FROM tenants WHERE id = $1 AND disabled_at IS NULL',
            [tenantIdArg]
          );
          if (rows[0]) {
            const { computeEnabledToolsSet } =
              await import('./lib/tool-selection/enabled-tools-parser.js');
            const set = computeEnabledToolsSet(rows[0].enabled_tools, rows[0].preset_version);
            setStdioFallback({
              enabledToolsSet: set,
              enabledToolsExplicit: rows[0].enabled_tools !== null,
              tenantId: tenantIdArg,
              presetVersion: rows[0].preset_version,
            });
            logger.info(
              { tenantId: tenantIdArg, presetVersion: rows[0].preset_version, toolCount: set.size },
              'stdio dispatch-guard fallback registered from tenant row'
            );
          }
        } catch (err) {
          logger.warn(
            { tenantId: tenantIdArg, err: (err as Error).message },
            'stdio dispatch-guard fallback: tenant row load failed; falling back to permissive set'
          );
        }
      }
      // Legacy mode (or tenant-id row load failed): register a permissive
      // fallback covering the full registry. The existing --enabled-tools
      // regex filter at registerGraphTools time already narrows the surface.
      const { api } = await import('./generated/client.js');
      const { setStdioFallback: setFallback } =
        await import('./lib/tool-selection/dispatch-guard.js');
      if (!tenantIdArg || !process.env.MS365_MCP_DATABASE_URL) {
        const allAliases = new Set<string>(
          api.endpoints
            .map((e) => e.alias)
            .filter((a): a is string => typeof a === 'string' && a.length > 0)
        );
        // Add the synthetic tools registered beyond api.endpoints (parse-
        // teams-url, graph-batch, graph-upload-large-file, search-tools,
        // get-tool-schema, execute-tool, list-accounts). These are also
        // filtered by the v1 --enabled-tools regex at registration time;
        // the dispatch-guard must accept them when they DO register.
        for (const synthetic of [
          'parse-teams-url',
          'graph-batch',
          'graph-upload-large-file',
          'search-tools',
          'get-tool-schema',
          'execute-tool',
          'list-accounts',
        ]) {
          allAliases.add(synthetic);
        }
        setFallback({
          enabledToolsSet: Object.freeze(allAliases),
          enabledToolsExplicit: false,
          tenantId: 'stdio-legacy',
          presetVersion: 'stdio-legacy',
        });
      }
    }

    const server = new MicrosoftGraphServer(authManager, args, readinessChecks, { pkceStore });
    await server.initialize(version);
    await server.start();

    // region:phase4-subscription-cron (filled by 04-08)
    // Plan 04-08 (WEBHK-03, D-17): optional in-process subscription renewal
    // cron. Gated on MS365_MCP_SUBSCRIPTION_CRON env var — absence leaves the
    // cron off (default) so deployments that run multiple replicas don't
    // need a distributed lock. When enabled, emits a startup WARN so the
    // operator sees the single-replica constraint in the log aggregator.
    //
    // Only HTTP mode runs the cron: the tenant-pool + Postgres substrate is
    // the prerequisite. Stdio mode has no tenant registry to scan.
    if (isHttpMode && process.env.MS365_MCP_SUBSCRIPTION_CRON) {
      try {
        const { startRenewalCron } = await import('./lib/admin/subscriptions.js');
        const { getTenantPool } = await import('./lib/tenant/tenant-pool.js');
        const { loadKek } = await import('./lib/crypto/kek.js');
        const { getSecrets } = await import('./secrets.js');
        const { default: GraphClient } = await import('./graph-client.js');

        const tenantPool = getTenantPool();
        if (!tenantPool) {
          throw new Error('tenant pool not initialized');
        }
        const kek = await loadKek();
        const secrets = await getSecrets();
        const graphClient = new GraphClient(authManager, secrets);

        subscriptionCronHandle = startRenewalCron({
          pgPool: postgres.getPool(),
          tenantPool,
          graphClient,
          kek,
        });
        logger.warn(
          'Single-replica subscription cron enabled — do not run on multiple replicas without distributed lock'
        );
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          'subscription cron failed to start (non-fatal); continuing without renewal'
        );
      }
    }
    // endregion:phase4-subscription-cron

    // Phase 3 (plan 03-01 Task 2) — register a secondary SIGTERM/SIGINT
    // handler AFTER server.start() so it stacks on top of the handler
    // installed inside server.start() by registerShutdownHooks(). Both
    // handlers fire in parallel; registering here means no later
    // `removeAllListeners` call wipes ours. Per 03-CONTEXT graceful-shutdown
    // order: tenantPool.drain → redis.quit → pg.end → (pino flush + OTel
    // shutdown handled by shutdown.ts).
    if (isHttpMode) {
      const invokePhase3Shutdown = (): void => {
        void phase3ShutdownOrchestrator();
      };
      process.on('SIGTERM', invokePhase3Shutdown);
      process.on('SIGINT', invokePhase3Shutdown);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error(`Startup error: ${message}`);
    console.error(stack ?? message);
    process.exit(1);
  }
}

main();

/**
 * Postgres pool singleton (plan 03-01).
 *
 * Constructed once at process init from src/index.ts AFTER OTel + logger but
 * BEFORE migrations + tenant-pool. Provides a `pg.Pool` with min=2/max=20 (per
 * D-11) and exposes `getPool()`, `withTransaction(client => ...)`, a
 * `readinessCheck` that pushes into the Phase 1 `readinessChecks[]` hook, and
 * a `shutdown()` registered into the graceful-shutdown sequence.
 *
 * Connection-string precedence: MS365_MCP_DATABASE_URL > individual PG* vars
 * (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE — consumed natively by the
 * `pg` driver when `connectionString` is unset). When NEITHER is set in HTTP
 * mode, `getPool()` throws at first call so callers fail fast.
 *
 * Lifecycle:
 *   - getPool() lazy-initializes on first call.
 *   - shutdown() awaits `pool.end()` and is registered into the
 *     graceful-shutdown sequence at src/index.ts (after tenantPool.drain,
 *     before logger.flush — see src/lib/shutdown.ts T-01-05 ordering notes).
 *
 * Pitfall avoidance (RESEARCH.md Pitfall 4 — pg.Pool connection leak on
 * transaction failure): every transaction wrapper uses try/finally around
 * the release() call — never in a happy-path-only branch or pool exhaustion
 * is a one-bug-away outage. `withTransaction` is the ONLY path callers
 * should use for multi-statement transactions; ad-hoc `pool.connect()` is
 * a leak waiting to happen.
 *
 * Threat dispositions (plan 03-01 <threat_model>):
 *   - T-03-01-02 (MS365_MCP_DATABASE_URL leak): the connection string is
 *     added to REDACT_PATHS (src/logger.ts) so pino never serializes it.
 *   - T-03-01-03 (pool exhaustion on rollback): mitigated by the
 *     release-in-finally contract below.
 */
import { Pool, type PoolClient } from 'pg';
import logger from '../logger.js';

const POSTGRES_POOL_KEY = Symbol.for('ms-365-mcp-server.postgresPool');

type PostgresGlobal = typeof globalThis & { [POSTGRES_POOL_KEY]?: Pool | null };
const postgresGlobal = globalThis as PostgresGlobal;

type AfterCommitCallback = () => void | Promise<void>;
const afterCommitCallbacks = new WeakMap<PoolClient, AfterCommitCallback[]>();

const DEFAULT_MAX = 20;
const DEFAULT_MIN = 2;
const IDLE_TIMEOUT_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 5_000;

export function getPool(): Pool {
  if (postgresGlobal[POSTGRES_POOL_KEY]) return postgresGlobal[POSTGRES_POOL_KEY];
  const connectionString = process.env.MS365_MCP_DATABASE_URL;
  if (!connectionString && !process.env.PGHOST) {
    throw new Error(
      'MS365_MCP_DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE) is required. ' +
        'Set it in .env or use stdio mode with no Postgres.'
    );
  }
  const max = Number.parseInt(process.env.MS365_MCP_DB_POOL_MAX ?? String(DEFAULT_MAX), 10);
  const poolInstance = new Pool({
    connectionString,
    min: DEFAULT_MIN,
    max: Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  poolInstance.on('error', (err) => {
    logger.error({ err: err.message }, 'pg pool idle-client error');
  });
  postgresGlobal[POSTGRES_POOL_KEY] = poolInstance;
  return poolInstance;
}

/**
 * Run `fn` inside BEGIN/COMMIT/ROLLBACK. The client is released in a
 * finally block regardless of outcome — this is the only correct transaction
 * path (RESEARCH.md Pitfall 4).
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    afterCommitCallbacks.set(client, []);
    const result = await fn(client);
    await client.query('COMMIT');
    const callbacks = afterCommitCallbacks.get(client) ?? [];
    afterCommitCallbacks.delete(client);
    for (const callback of callbacks) {
      try {
        await callback();
      } catch (err) {
        logger.warn({ err: (err as Error).message }, 'pg after-commit callback failed');
      }
    }
    return result;
  } catch (err) {
    afterCommitCallbacks.delete(client);
    try {
      await client.query('ROLLBACK');
    } catch {
      // best-effort rollback — original error already in flight
    }
    throw err;
  } finally {
    client.release();
  }
}

export function scheduleAfterCommit(client: PoolClient, callback: AfterCommitCallback): void {
  const callbacks = afterCommitCallbacks.get(client);
  if (!callbacks) return;
  callbacks.push(callback);
}

/**
 * Graceful-shutdown hook: awaits `pool.end()` and nulls the cached pool so
 * subsequent `getPool()` calls reconstruct a fresh pool (useful for tests +
 * defensive behaviour during hot-reload dev loops). Idempotent — a second
 * call when the pool is already null is a no-op.
 */
export async function shutdown(): Promise<void> {
  if (!postgresGlobal[POSTGRES_POOL_KEY]) return;
  const p = postgresGlobal[POSTGRES_POOL_KEY];
  postgresGlobal[POSTGRES_POOL_KEY] = null;
  try {
    await p.end();
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'pg pool shutdown error');
  }
}

/**
 * Readiness probe. Pushed into the Phase 1 `readinessChecks[]` array from
 * src/index.ts so `/readyz` flips to 503 when Postgres is unreachable.
 * Returns false on any error (never throws out of this function) — matches
 * the Phase 1 contract that a thrown error counts as "not ready".
 */
export async function readinessCheck(): Promise<boolean> {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Test-only: replace the cached pool with one supplied by the test (pg-mem
 * or testcontainers-pg). Production callers MUST use getPool() — this export
 * exists solely so vitest tests can inject a deterministic Pool without
 * needing MS365_MCP_DATABASE_URL set in the test environment.
 */
export function __setPoolForTesting(p: Pool | null): void {
  postgresGlobal[POSTGRES_POOL_KEY] = p;
}

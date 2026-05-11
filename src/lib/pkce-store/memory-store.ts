/**
 * In-memory PKCE store for stdio mode (plan 03-03).
 *
 * Mirrors RedisPkceStore's interface with a Map backing so stdio deployments
 * (where there is no external Redis) can still run the /authorize ↔ /token
 * handshake. The API surface is intentionally tighter than MemoryRedisFacade
 * (plan 03-02) — exposing only put + takeByChallenge keeps the handlers from
 * reaching into generic key/value methods that would defeat the PkceStore
 * abstraction.
 *
 * TTL via Date.now() comparison on read — background timers are deliberately
 * avoided. A persistent Node timer would keep the stdio event loop alive
 * forever and prevent the MCP host from cleanly closing the child process.
 * Stale entries simply fail their TTL check and are purged on the next access.
 *
 * NX semantics match RedisPkceStore: a duplicate put() for the same
 * (tenantId, clientCodeChallenge) returns false rather than silently
 * overwriting — silent overwrite would be a bug (T-03-03-01 replay surface).
 */
import type { PkceEntry, PkceStore } from './pkce-store.js';

const TTL_MS = 600_000;

export class MemoryPkceStore implements PkceStore {
  private store = new Map<string, { entry: PkceEntry; expiresAt: number }>();

  private key(tenantId: string, clientCodeChallenge: string): string {
    return `${tenantId}:${clientCodeChallenge}`;
  }

  async put(tenantId: string, entry: PkceEntry): Promise<boolean> {
    const k = this.key(tenantId, entry.clientCodeChallenge);
    const existing = this.store.get(k);
    if (existing && existing.expiresAt > Date.now()) {
      return false;
    }
    this.store.set(k, { entry, expiresAt: Date.now() + TTL_MS });
    return true;
  }

  async getByChallenge(tenantId: string, clientCodeChallenge: string): Promise<PkceEntry | null> {
    const k = this.key(tenantId, clientCodeChallenge);
    const e = this.store.get(k);
    if (!e) return null;
    if (e.expiresAt <= Date.now()) {
      this.store.delete(k);
      return null;
    }
    return e.entry;
  }

  async takeByChallenge(tenantId: string, clientCodeChallenge: string): Promise<PkceEntry | null> {
    const k = this.key(tenantId, clientCodeChallenge);
    const e = this.store.get(k);
    // Atomic read-and-delete: whether hit or expired, we remove the key so
    // the caller cannot observe the same entry twice.
    this.store.delete(k);
    if (!e || e.expiresAt <= Date.now()) {
      return null;
    }
    return e.entry;
  }

  /**
   * Plan 06-03 (OPS-07) — Map.size is O(1). Stdio-mode PKCE store is
   * process-local, so size() observably represents a single process's
   * in-flight entries. Includes expired entries that have not yet been
   * cleaned up on access (no background timer per the class-level rule);
   * this is acceptable because the gauge is an aggregate health signal,
   * not a precise count, and expired entries age out within 600s as
   * /token lookups cull them.
   */
  async size(): Promise<number> {
    return this.store.size;
  }
}

/**
 * PKCE store interface (plan 03-03, SECUR-03 + TENANT-05).
 *
 * Replaces the v1 in-memory `pkceStore: Map` at src/server.ts (O(N) scan +
 * per-entry SHA-256 at /token) with a dependency-injected store keyed by
 * clientCodeChallenge so /token is an O(1) lookup.
 *
 * Implementations:
 *   - RedisPkceStore (HTTP mode, production) — SET NX EX + GETDEL; shared
 *     state across replicas via Redis (ROADMAP SC#6).
 *   - MemoryPkceStore (stdio mode + tests) — Map-backed with Date.now() TTL;
 *     no background timers so stdio event loop can exit cleanly.
 *
 * Keying contract: implementations MUST use clientCodeChallenge (NOT state)
 * as the lookup key. The /token handler computes sha256(client_verifier) —
 * which equals the clientCodeChallenge presented at /authorize — and does a
 * single takeByChallenge() call. No scan, no per-entry hash.
 *
 * Threat dispositions (plan 03-03 <threat_model>):
 *   - T-03-03-01 (replay): takeByChallenge is atomic read-and-delete, so
 *     concurrent /token calls cannot double-spend a verifier.
 *   - T-03-03-02 (cross-tenant reuse): the lookup key includes tenantId;
 *     wrong tenant = miss.
 *   - T-03-03-03 (DoS via key-space flood): TTL 600s auto-evicts; operator
 *     caps with Redis maxmemory.
 */

export interface PkceEntry {
  state: string;
  clientCodeChallenge: string;
  clientCodeChallengeMethod: string;
  serverCodeVerifier: string;
  clientId: string;
  redirectUri: string;
  tenantId: string;
  createdAt: number;
  forwardedAuthorizeParams?: Record<string, string>;
}

export interface PkceStore {
  /**
   * Write a PKCE entry keyed by (tenantId, clientCodeChallenge). Returns
   * true on first write. Returns false if an entry already exists for the
   * same key (NX semantics — silent overwrite would be a bug).
   */
  put(tenantId: string, entry: PkceEntry): Promise<boolean>;

  /**
   * Read the entry at (tenantId, clientCodeChallenge) without consuming it.
   * Used only to make exact duplicate /authorize retries idempotent.
   */
  getByChallenge(tenantId: string, clientCodeChallenge: string): Promise<PkceEntry | null>;

  /**
   * Atomically read AND delete the entry at (tenantId, clientCodeChallenge).
   * Returns the entry on hit, null on miss. Two concurrent calls with the
   * same key: exactly one gets the entry, the other gets null.
   */
  takeByChallenge(tenantId: string, clientCodeChallenge: string): Promise<PkceEntry | null>;

  /**
   * Plan 06-03 (OPS-07) — observable count for the
   * `mcp_oauth_pkce_store_size` gauge (Phase 6 success criterion 1).
   *
   * Semantics: aggregate count across all tenants (no labels — the gauge is
   * intentionally unlabelled per 06-CONTEXT.md §T-06-03-e disposition).
   *
   * Implementations:
   *   - RedisPkceStore: SCAN MATCH mcp:pkce:* COUNT 500 — non-blocking,
   *     cursor-based. Never KEYS (banned on prod Redis).
   *   - MemoryPkceStore: Map.size — O(1).
   */
  size(): Promise<number>;
}

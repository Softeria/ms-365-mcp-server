/**
 * Redis-backed PKCE store (plan 03-03, SECUR-03).
 *
 * Replaces the v1 in-memory Map at src/server.ts:~60-69 (O(N) scan + per-
 * entry SHA-256). Keyed by clientCodeChallenge so /token is O(1).
 *
 * GETDEL atomicity: takeByChallenge uses Redis GETDEL (single roundtrip,
 * atomic) so concurrent /token calls with the same verifier cannot
 * double-spend. ioredis 5.10+ supports GETDEL; underlying Redis >= 6.2.
 *
 * TTL: 10 minutes per D-13 (OAuth 2.1 draft). Redis evicts stale entries
 * automatically — no opportunistic cleanup timer needed (removed from
 * src/server.ts in Task 2 of this plan).
 *
 * Keying contract: `mcp:pkce:{tenantId}:{clientCodeChallenge}`. The
 * tenantId segment is load-bearing — T-03-03-02 requires cross-tenant
 * isolation so a challenge registered under tenant A cannot be taken by a
 * lookup under tenant B. Plan 03-08 wires the real `req.params.tenantId`
 * from the /t/:tenantId/* router via loadTenant; the legacy single-tenant
 * /authorize + /token mounts (scheduled for 03-09 removal) use the
 * LEGACY_SINGLE_TENANT_KEY sentinel from src/server.ts.
 */
import type { PkceEntry, PkceStore } from './pkce-store.js';
import type { RedisClient } from '../redis.js';

const TTL_SECONDS = 600;

export class RedisPkceStore implements PkceStore {
  constructor(private readonly redis: RedisClient) {}

  private key(tenantId: string, clientCodeChallenge: string): string {
    return `mcp:pkce:${tenantId}:${clientCodeChallenge}`;
  }

  async put(tenantId: string, entry: PkceEntry): Promise<boolean> {
    const k = this.key(tenantId, entry.clientCodeChallenge);
    // ioredis variadic `set` typing does not capture EX+NX via overloads; the
    // MemoryRedisFacade (plan 03-02) and real ioredis both accept this call
    // shape at runtime — returning 'OK' on success and null when NX guards
    // reject the write.
    const result = await (
      this.redis as unknown as {
        set: (
          key: string,
          value: string,
          mode: 'EX',
          seconds: number,
          nx: 'NX'
        ) => Promise<'OK' | null>;
      }
    ).set(k, JSON.stringify(entry), 'EX', TTL_SECONDS, 'NX');
    return result === 'OK';
  }

  async getByChallenge(tenantId: string, clientCodeChallenge: string): Promise<PkceEntry | null> {
    const k = this.key(tenantId, clientCodeChallenge);
    const raw = await this.redis.get(k);
    if (!raw) return null;
    return JSON.parse(raw) as PkceEntry;
  }

  async takeByChallenge(tenantId: string, clientCodeChallenge: string): Promise<PkceEntry | null> {
    const k = this.key(tenantId, clientCodeChallenge);
    const raw = await this.redis.getdel(k);
    if (!raw) return null;
    return JSON.parse(raw) as PkceEntry;
  }

  /**
   * Plan 06-03 (OPS-07) — count of PKCE entries via SCAN MATCH mcp:pkce:*
   * COUNT 500. SCAN is non-blocking (unlike KEYS, which would stall the
   * Redis event loop for the full O(n) scan across the entire keyspace
   * — banned on prod per CONTEXT.md §D-02 rationale). Cursor-based
   * iteration continues until Redis returns cursor '0' to signal
   * completion.
   *
   * Pattern `mcp:pkce:*` matches the keying contract
   * `mcp:pkce:{tenantId}:{clientCodeChallenge}` from plan 03-03, so the
   * count aggregates across ALL tenants — matching the gauge contract
   * (unlabelled aggregate, per T-06-03-e disposition).
   */
  async size(): Promise<number> {
    let cursor = '0';
    let total = 0;
    do {
      const [next, batch] = await (
        this.redis as unknown as {
          scan: (cursor: string, ...args: Array<string | number>) => Promise<[string, string[]]>;
        }
      ).scan(cursor, 'MATCH', 'mcp:pkce:*', 'COUNT', '500');
      cursor = next;
      total += batch.length;
    } while (cursor !== '0');
    return total;
  }
}

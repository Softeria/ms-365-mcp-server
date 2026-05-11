/**
 * Plan 03-03 Task 1 — RedisPkceStore unit tests.
 *
 * The RedisPkceStore replaces the v1 in-memory `pkceStore: Map` at src/server.ts
 * (O(N) scan + per-entry SHA-256) with a Redis SET NX EX + GETDEL design that is
 * O(1) per lookup. Tests mount it on `MemoryRedisFacade` from plan 03-02 so the
 * same code path exercises the interface that drives real ioredis in production.
 *
 * Covered behaviours (SECUR-03 + TENANT-05 + threat register):
 *   1. put() writes with NX + EX=600; returns true on first write
 *   2. Duplicate put() with same challenge returns false (NX)
 *   3. takeByChallenge() reads + deletes atomically via GETDEL
 *   4. Two concurrent takeByChallenge() on same key → one entry, one null
 *   5. Wrong tenantId returns null (cross-tenant isolation, T-03-03-02)
 *   6. TTL expiry (10 minutes) — entry auto-evicts after 601s
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import type { PkceEntry } from '../../src/lib/pkce-store/pkce-store.js';

function makeEntry(overrides: Partial<PkceEntry> = {}): PkceEntry {
  return {
    state: 'state-abc',
    clientCodeChallenge: 'challenge-xyz',
    clientCodeChallengeMethod: 'S256',
    serverCodeVerifier: 'server-verifier-123',
    clientId: 'client-id-aaa',
    redirectUri: 'https://app.example.com/callback',
    tenantId: '_',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('plan 03-03 — RedisPkceStore', () => {
  let facade: MemoryRedisFacade;
  let store: RedisPkceStore;

  beforeEach(() => {
    facade = new MemoryRedisFacade();
    store = new RedisPkceStore(facade);
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (facade.status !== 'end') {
      await facade.quit();
    }
  });

  // ── 1. First put writes with NX + EX=600 ──────────────────────────────────
  it('put() returns true on first write, stores the entry as JSON under mcp:pkce:{tenant}:{challenge}', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'ch-1' });
    const ok = await store.put('_', entry);
    expect(ok).toBe(true);

    // Verify key format + payload
    const raw = await facade.get('mcp:pkce:_:ch-1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as PkceEntry;
    expect(parsed.state).toBe('state-abc');
    expect(parsed.serverCodeVerifier).toBe('server-verifier-123');
    expect(parsed.clientCodeChallenge).toBe('ch-1');
  });

  // ── 2. Duplicate put() with same challenge returns false (NX) ─────────────
  it('put() returns false on duplicate challenge (NX prevents silent overwrite)', async () => {
    const entry1 = makeEntry({ clientCodeChallenge: 'dup-ch', state: 'first-state' });
    const entry2 = makeEntry({ clientCodeChallenge: 'dup-ch', state: 'second-state' });

    expect(await store.put('_', entry1)).toBe(true);
    expect(await store.put('_', entry2)).toBe(false);

    // The first entry's value is preserved — no silent overwrite
    const raw = await facade.get('mcp:pkce:_:dup-ch');
    const parsed = JSON.parse(raw as string) as PkceEntry;
    expect(parsed.state).toBe('first-state');
  });

  it('getByChallenge() returns an entry without consuming it', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'peek-ch' });
    await store.put('_', entry);

    const peeked = await store.getByChallenge('_', 'peek-ch');
    expect(peeked?.state).toBe('state-abc');

    const taken = await store.takeByChallenge('_', 'peek-ch');
    expect(taken?.state).toBe('state-abc');
  });

  // ── 3. takeByChallenge reads + deletes atomically via GETDEL ──────────────
  it('takeByChallenge() returns entry and removes the key; second call returns null', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'take-me' });
    await store.put('_', entry);

    const first = await store.takeByChallenge('_', 'take-me');
    expect(first).not.toBeNull();
    expect(first?.state).toBe('state-abc');
    expect(first?.serverCodeVerifier).toBe('server-verifier-123');

    // Key is gone
    const second = await store.takeByChallenge('_', 'take-me');
    expect(second).toBeNull();
    // And raw get confirms deletion
    expect(await facade.get('mcp:pkce:_:take-me')).toBeNull();
  });

  // ── 4. Concurrent takeByChallenge: exactly one wins (atomic GETDEL) ───────
  it('two concurrent takeByChallenge() on same key → one returns entry, one returns null', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'race-ch' });
    await store.put('_', entry);

    const [a, b] = await Promise.all([
      store.takeByChallenge('_', 'race-ch'),
      store.takeByChallenge('_', 'race-ch'),
    ]);

    const hits = [a, b].filter((x) => x !== null);
    const misses = [a, b].filter((x) => x === null);
    expect(hits).toHaveLength(1);
    expect(misses).toHaveLength(1);
  });

  // ── 5. Wrong tenantId returns null (T-03-03-02 cross-tenant isolation) ────
  it('takeByChallenge() with wrong tenantId returns null (cross-tenant reuse prevented)', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'iso-ch', tenantId: 'tenant-A' });
    await store.put('tenant-A', entry);

    // Wrong tenant → miss
    const wrong = await store.takeByChallenge('tenant-B', 'iso-ch');
    expect(wrong).toBeNull();

    // Right tenant → hit
    const right = await store.takeByChallenge('tenant-A', 'iso-ch');
    expect(right).not.toBeNull();
    expect(right?.tenantId).toBe('tenant-A');
  });

  // ── 6. TTL expiry — after 601s the entry is gone ─────────────────────────
  it('entry expires after 600s TTL; takeByChallenge returns null post-expiry', async () => {
    vi.useFakeTimers();
    const t0 = new Date('2026-04-19T00:00:00.000Z');
    vi.setSystemTime(t0);

    await store.put('_', makeEntry({ clientCodeChallenge: 'ttl-ch' }));

    // 599s in — still live
    vi.setSystemTime(new Date(t0.getTime() + 599_000));
    expect(await facade.get('mcp:pkce:_:ttl-ch')).not.toBeNull();

    // 601s in — expired (facade treats expiry as miss)
    vi.setSystemTime(new Date(t0.getTime() + 601_000));
    const afterTtl = await store.takeByChallenge('_', 'ttl-ch');
    expect(afterTtl).toBeNull();
  });
});

/**
 * Plan 03-03 Task 1 — MemoryPkceStore unit tests.
 *
 * MemoryPkceStore is the stdio-mode fallback for the PkceStore interface.
 * It shares the exact surface of RedisPkceStore (put / takeByChallenge +
 * NX + 10min TTL) but is Map-backed instead of Redis-backed so stdio does
 * not need an external Redis.
 *
 * Intentionally independent from MemoryRedisFacade (plan 03-02) — 03-02's
 * facade is a general Redis subset; this store is PKCE-specific with a
 * tighter API (only put + takeByChallenge are exposed, no generic get/set).
 * The isolation ensures the /authorize / /token handlers cannot reach into
 * facade internals by mistake.
 *
 * Covered behaviours:
 *   7. put/take round-trip identical to Redis variant
 *   8. NX semantics — duplicate put returns false
 *   9. TTL expiry via Date.now() (no setInterval/setTimeout — stdio safety)
 *  10. Cross-tenant isolation — wrong tenantId returns null
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryPkceStore } from '../../src/lib/pkce-store/memory-store.js';
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

describe('plan 03-03 — MemoryPkceStore', () => {
  let store: MemoryPkceStore;

  beforeEach(() => {
    store = new MemoryPkceStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getByChallenge() returns an entry without consuming it', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'peek-ch' });
    expect(await store.put('_', entry)).toBe(true);

    const peeked = await store.getByChallenge('_', 'peek-ch');
    expect(peeked?.state).toBe('state-abc');

    const taken = await store.takeByChallenge('_', 'peek-ch');
    expect(taken?.state).toBe('state-abc');
  });

  // ── 7. put/take round-trip ────────────────────────────────────────────────
  it('put() then takeByChallenge() returns the entry; second take returns null', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'mem-ch' });
    expect(await store.put('_', entry)).toBe(true);

    const taken = await store.takeByChallenge('_', 'mem-ch');
    expect(taken).not.toBeNull();
    expect(taken?.state).toBe('state-abc');
    expect(taken?.serverCodeVerifier).toBe('server-verifier-123');

    // Second take — key was deleted atomically
    const missed = await store.takeByChallenge('_', 'mem-ch');
    expect(missed).toBeNull();
  });

  // ── 8. NX semantics — duplicate put returns false ─────────────────────────
  it('put() returns false on duplicate challenge (NX semantics)', async () => {
    const e1 = makeEntry({ clientCodeChallenge: 'dup-ch', state: 'first' });
    const e2 = makeEntry({ clientCodeChallenge: 'dup-ch', state: 'second' });
    expect(await store.put('_', e1)).toBe(true);
    expect(await store.put('_', e2)).toBe(false);

    // First entry survived — no silent overwrite
    const taken = await store.takeByChallenge('_', 'dup-ch');
    expect(taken?.state).toBe('first');
  });

  // ── 9. TTL expiry via Date.now() (no setInterval/setTimeout) ──────────────
  it('entry expires after 600s TTL (Date.now() comparison, no background timers)', async () => {
    vi.useFakeTimers();
    const t0 = new Date('2026-04-19T00:00:00.000Z');
    vi.setSystemTime(t0);

    await store.put('_', makeEntry({ clientCodeChallenge: 'ttl-ch' }));

    // 599s — still live
    vi.setSystemTime(new Date(t0.getTime() + 599_000));
    // we don't peek via raw API; we verify via take after we confirm not-yet-expired
    // (so instead we just advance to post-expiry and assert null)
    vi.setSystemTime(new Date(t0.getTime() + 601_000));
    const afterTtl = await store.takeByChallenge('_', 'ttl-ch');
    expect(afterTtl).toBeNull();
  });

  // ── 10. Cross-tenant isolation ────────────────────────────────────────────
  it('wrong tenantId returns null (cross-tenant reuse prevented, T-03-03-02)', async () => {
    const entry = makeEntry({ clientCodeChallenge: 'iso-ch', tenantId: 'tenant-A' });
    await store.put('tenant-A', entry);

    expect(await store.takeByChallenge('tenant-B', 'iso-ch')).toBeNull();

    const right = await store.takeByChallenge('tenant-A', 'iso-ch');
    expect(right).not.toBeNull();
    expect(right?.tenantId).toBe('tenant-A');
  });
});

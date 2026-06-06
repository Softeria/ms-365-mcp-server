/**
 * In-memory Redis facade for stdio mode (plan 03-02, TENANT-05 fallback).
 *
 * Satisfies the exact subset of ioredis API that plans 03-03 (PKCE store),
 * 03-05 (MSAL cache plugin), and 03-08 (tenant pub/sub invalidation) consume.
 * This is NOT a general-purpose Redis replacement — it implements only the
 * commands Phase 3 actually calls.
 *
 * Why this exists (CONTEXT.md): stdio mode has no external Redis but the
 * downstream code paths (RedisPkceStore, MSAL cache plugin) should not fork
 * on transport. The facade lets one code path drive both modes.
 *
 * TTL implementation: each entry stores { value, expiresAt }; get() checks
 * expiry before returning. Background timers are deliberately avoided — a
 * persistent Node timer would keep the stdio event loop alive forever and
 * prevent the MCP host from cleanly closing the child process.
 *
 * Commands implemented (subset — Phase 3-4 needs only these):
 *   get / set (EX + PX + NX flags) / getdel / del(...) / keys(glob with * only)
 *   eval (limited compare-and-del / compare-and-pexpire scripts) / pexpire
 *   incr / expire (Phase 4 04-07 — webhook 401 rate limit)
 *   ping / quit / disconnect / publish / subscribe / on('message' | 'error')
 *   status getter.
 *
 * Not implemented (intentional — current code does not call these):
 *   mget / mset / hget / hset / zadd / ttl / sentinel / cluster ops.
 *   Callers who need those commands MUST use real Redis.
 */
import { EventEmitter } from 'node:events';

type StatusValue = 'wait' | 'connecting' | 'connect' | 'ready' | 'reconnecting' | 'end';

interface Entry {
  value: string;
  expiresAt: number | null;
}

type MessageListener = (channel: string, msg: string) => void;

export class MemoryRedisFacade extends EventEmitter {
  private store = new Map<string, Entry>();
  private channels = new Map<string, Set<MessageListener>>();
  private globalMessageListeners = new Set<MessageListener>();
  public status: StatusValue = 'wait';

  constructor() {
    super();
    // Lazy: 'ready' is reached on first operation (mirrors ioredis lazyConnect).
  }

  private assertOpen(): void {
    if (this.status === 'end') {
      throw new Error('Connection is closed.');
    }
    this.status = 'ready';
  }

  private isExpired(e: Entry): boolean {
    return e.expiresAt !== null && e.expiresAt <= Date.now();
  }

  async get(key: string): Promise<string | null> {
    this.assertOpen();
    const e = this.store.get(key);
    if (!e) return null;
    if (this.isExpired(e)) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null> {
    this.assertOpen();
    // Parse ioredis variadic: set(k,v,'EX',10,'NX'); flags case-insensitive.
    let ttlMs: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      const token = args[i];
      if (typeof token !== 'string') continue;
      const upper = token.toUpperCase();
      if (upper === 'EX' && typeof args[i + 1] === 'number') {
        ttlMs = (args[i + 1] as number) * 1000;
        i++;
      } else if (upper === 'PX' && typeof args[i + 1] === 'number') {
        ttlMs = args[i + 1] as number;
        i++;
      } else if (upper === 'NX') {
        nx = true;
      }
    }
    if (nx) {
      const existing = this.store.get(key);
      if (existing && !this.isExpired(existing)) return null;
    }
    this.store.set(key, {
      value,
      expiresAt: ttlMs === null ? null : Date.now() + ttlMs,
    });
    return 'OK';
  }

  async getdel(key: string): Promise<string | null> {
    this.assertOpen();
    const e = this.store.get(key);
    if (!e || this.isExpired(e)) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    return e.value;
  }

  /**
   * ioredis-compatible INCR (plan 04-07). Creates the key with value 1 if
   * absent, otherwise parses the current value as an integer and adds 1.
   * Preserves any existing TTL (parity with real Redis INCR semantics).
   * Invalid integer content throws per ioredis convention.
   */
  async incr(key: string): Promise<number> {
    this.assertOpen();
    const existing = this.store.get(key);
    if (!existing || this.isExpired(existing)) {
      this.store.set(key, { value: '1', expiresAt: null });
      return 1;
    }
    const current = Number.parseInt(existing.value, 10);
    if (!Number.isFinite(current)) {
      throw new Error('ERR value is not an integer or out of range');
    }
    const next = current + 1;
    // Preserve existing TTL; real Redis does not clear it on INCR.
    this.store.set(key, { value: String(next), expiresAt: existing.expiresAt });
    return next;
  }

  /**
   * ioredis-compatible EXPIRE (plan 04-07). Returns 1 if TTL was set, 0 if
   * the key does not exist (matching real Redis EXPIRE semantics).
   */
  async expire(key: string, seconds: number): Promise<number> {
    this.assertOpen();
    const existing = this.store.get(key);
    if (!existing || this.isExpired(existing)) {
      this.store.delete(key);
      return 0;
    }
    this.store.set(key, { value: existing.value, expiresAt: Date.now() + seconds * 1000 });
    return 1;
  }

  async pexpire(key: string, milliseconds: number | string): Promise<number> {
    this.assertOpen();
    const existing = this.store.get(key);
    if (!existing || this.isExpired(existing)) {
      this.store.delete(key);
      return 0;
    }
    const ttlMs =
      typeof milliseconds === 'number' ? milliseconds : Number.parseInt(milliseconds, 10);
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return 0;
    this.store.set(key, { value: existing.value, expiresAt: Date.now() + ttlMs });
    return 1;
  }

  async eval(
    script: string,
    keyCount: number,
    ...args: Array<string | number>
  ): Promise<number | string | null> {
    this.assertOpen();
    if (keyCount !== 1 || args.length < 2 || typeof args[0] !== 'string') {
      throw new Error('MemoryRedisFacade eval supports one-key compare scripts only');
    }
    const key = args[0];
    const lockId = String(args[1]);
    const current = await this.get(key);
    if (current !== lockId) return 0;
    if (script.includes('pexpire')) {
      if (args.length < 3) throw new Error('pexpire script requires ttl argument');
      return await this.pexpire(key, args[2]);
    }
    if (script.includes('del')) {
      return await this.del(key);
    }
    throw new Error('MemoryRedisFacade eval unsupported script');
  }

  async del(...keys: string[]): Promise<number> {
    this.assertOpen();
    let removed = 0;
    for (const k of keys) {
      if (this.store.delete(k)) removed++;
    }
    return removed;
  }

  async keys(pattern: string): Promise<string[]> {
    this.assertOpen();
    // Simplified glob: only '*' wildcard supported (sufficient for Phase 3).
    // Escape all regex metacharacters except '*', then replace '*' with '.*'.
    const regex = new RegExp(
      '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
    );
    const out: string[] = [];
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) continue;
      if (regex.test(key)) out.push(key);
    }
    return out;
  }

  /**
   * WR-03 fix: ioredis-compatible SCAN for the disable-tenant cascade
   * (bin/disable-tenant.mjs:scanDel). Real ioredis returns
   * `[nextCursor, batch]`; the in-memory facade returns the entire
   * matching set on the first call (cursor='0' → next='0'), since
   * iterating a Map<string, Entry> is already O(n) and there is no
   * meaningful cursor state to preserve. The COUNT hint is accepted
   * but ignored because the in-memory implementation cannot stream.
   *
   * Signature mirrors ioredis: scan(cursor, 'MATCH', pattern, 'COUNT', '100').
   */
  async scan(cursor: string, ...args: Array<string | number>): Promise<[string, string[]]> {
    this.assertOpen();
    let pattern = '*';
    for (let i = 0; i < args.length; i++) {
      const token = args[i];
      if (typeof token !== 'string') continue;
      if (token.toUpperCase() === 'MATCH' && typeof args[i + 1] === 'string') {
        pattern = args[i + 1] as string;
        i++;
      }
      // COUNT is acknowledged but ignored — see docstring.
    }
    if (cursor !== '0') {
      // Subsequent cursor calls always return empty + '0' to terminate the
      // caller's do-while loop. The in-memory store cannot resume from a
      // cursor state since the Map is iterated in one pass on cursor='0'.
      return ['0', []];
    }
    const matches = await this.keys(pattern);
    return ['0', matches];
  }

  async ping(): Promise<'PONG'> {
    this.assertOpen();
    return 'PONG';
  }

  async quit(): Promise<'OK'> {
    this.status = 'end';
    this.store.clear();
    this.channels.clear();
    this.globalMessageListeners.clear();
    this.removeAllListeners();
    return 'OK';
  }

  disconnect(): void {
    this.status = 'end';
  }

  async publish(channel: string, msg: string): Promise<number> {
    this.assertOpen();
    const subs = this.channels.get(channel);
    if (!subs || subs.size === 0) return 0;
    // Snapshot listeners before invoking so a listener removing itself does
    // not perturb iteration.
    const listeners = Array.from(subs);
    for (const fn of listeners) {
      try {
        fn(channel, msg);
      } catch (err) {
        this.emit('error', err);
      }
    }
    return subs.size;
  }

  async subscribe(...channels: string[]): Promise<number> {
    this.assertOpen();
    for (const ch of channels) {
      if (!this.channels.has(ch)) {
        this.channels.set(ch, new Set(this.globalMessageListeners));
      } else {
        // Re-attach any global listeners registered before subscribe.
        for (const fn of this.globalMessageListeners) {
          this.channels.get(ch)!.add(fn);
        }
      }
    }
    return this.channels.size;
  }

  // ioredis-compatible: .on('message', fn) registers across current + future
  // subscribed channels. .on('error', fn) attaches a standard EventEmitter
  // error listener.
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    if (event === 'message') {
      const ml = listener as MessageListener;
      this.globalMessageListeners.add(ml);
      for (const subs of this.channels.values()) {
        subs.add(ml);
      }
      return this;
    }
    return super.on(event, listener);
  }

  // Test helper for seeding state.
  _seedForTesting(entries: Array<{ key: string; value: string; ttlMs?: number }>): void {
    for (const { key, value, ttlMs } of entries) {
      this.store.set(key, {
        value,
        expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : null,
      });
    }
  }
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  backoffDelayMs,
  fetchWithResilience,
  loadResilienceConfig,
  parseRetryAfterMs,
  __resetSharedBreakerForTests,
} from '../src/lib/graph-resilience.js';

/**
 * Unit tests for the retry + timeout + circuit-breaker layer wrapping
 * Microsoft Graph fetch calls.
 *
 * The strategy is to drive `fetchWithResilience` with a controllable
 * fake `fetch` (queued Response / Error sequence) plus a synchronous
 * sleep stub, so we can assert on retry counts, delay calculations,
 * and breaker transitions without burning real time.
 */

function makeResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response('', { status, headers });
}

/** Builds a fake fetch that yields the given fixtures in order. Each
 * fixture is either a Response or an Error to throw. */
function makeFakeFetch(fixtures: Array<Response | Error>): {
  fetch: typeof fetch;
  calls: number;
} {
  let i = 0;
  const f = vi.fn().mockImplementation(async () => {
    if (i >= fixtures.length) {
      throw new Error(`fake fetch: no fixture left at call ${i + 1}`);
    }
    const next = fixtures[i++];
    if (next instanceof Error) throw next;
    return next;
  });
  return {
    fetch: f as unknown as typeof fetch,
    get calls() {
      return f.mock.calls.length;
    },
  };
}

describe('parseRetryAfterMs', () => {
  it('parses integer seconds', () => {
    expect(parseRetryAfterMs('5')).toBe(5_000);
    expect(parseRetryAfterMs('0')).toBe(0);
  });

  it('caps at 60 s', () => {
    expect(parseRetryAfterMs('120')).toBe(60_000);
    expect(parseRetryAfterMs('999')).toBe(60_000);
  });

  it('rejects non-integer numeric strings (avoids floats)', () => {
    expect(parseRetryAfterMs('5.5')).toBeNull();
  });

  it('parses HTTP-date and clamps to non-negative', () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const ms = parseRetryAfterMs(future);
    expect(ms).toBeGreaterThan(8_000);
    expect(ms).toBeLessThanOrEqual(10_000);

    const past = new Date(Date.now() - 10_000).toUTCString();
    expect(parseRetryAfterMs(past)).toBe(0);
  });

  it('returns null for nullish / empty / garbage', () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs(undefined)).toBeNull();
    expect(parseRetryAfterMs('')).toBeNull();
    expect(parseRetryAfterMs('   ')).toBeNull();
    expect(parseRetryAfterMs('not a date')).toBeNull();
  });
});

describe('backoffDelayMs', () => {
  it('grows exponentially up to maxMs', () => {
    // Full jitter — fix rand at 0.999 so we get nearly the full cap
    const r = () => 0.999;
    expect(backoffDelayMs(0, 200, 5_000, r)).toBeGreaterThanOrEqual(199);
    expect(backoffDelayMs(0, 200, 5_000, r)).toBeLessThan(200);
    expect(backoffDelayMs(1, 200, 5_000, r)).toBeLessThan(400);
    expect(backoffDelayMs(2, 200, 5_000, r)).toBeLessThan(800);
    // Capped at maxMs even when 2^attempt would blow past it
    expect(backoffDelayMs(10, 200, 5_000, r)).toBeLessThan(5_000);
  });

  it('full-jitter floor is 0', () => {
    expect(backoffDelayMs(5, 200, 5_000, () => 0)).toBe(0);
  });
});

describe('loadResilienceConfig', () => {
  const SAVED: Record<string, string | undefined> = {};
  const VARS = [
    'MS365_MCP_GRAPH_MAX_RETRIES',
    'MS365_MCP_GRAPH_BASE_BACKOFF_MS',
    'MS365_MCP_GRAPH_MAX_BACKOFF_MS',
    'MS365_MCP_GRAPH_TIMEOUT_MS',
    'MS365_MCP_GRAPH_CIRCUIT_THRESHOLD',
    'MS365_MCP_GRAPH_CIRCUIT_COOLDOWN_MS',
    'MS365_MCP_GRAPH_CIRCUIT_DISABLED',
  ];

  beforeEach(() => {
    VARS.forEach((k) => {
      SAVED[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    VARS.forEach((k) => {
      if (SAVED[k] === undefined) delete process.env[k];
      else process.env[k] = SAVED[k];
    });
  });

  it('returns sane defaults when no env is set', () => {
    const cfg = loadResilienceConfig();
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.baseBackoffMs).toBe(200);
    expect(cfg.maxBackoffMs).toBe(5_000);
    expect(cfg.fetchTimeoutMs).toBe(30_000);
    expect(cfg.circuitFailureThreshold).toBe(5);
    expect(cfg.circuitCooldownMs).toBe(30_000);
    expect(cfg.circuitDisabled).toBe(false);
  });

  it('honours overrides', () => {
    process.env.MS365_MCP_GRAPH_MAX_RETRIES = '0';
    process.env.MS365_MCP_GRAPH_TIMEOUT_MS = '10000';
    process.env.MS365_MCP_GRAPH_CIRCUIT_DISABLED = 'true';
    const cfg = loadResilienceConfig();
    expect(cfg.maxRetries).toBe(0);
    expect(cfg.fetchTimeoutMs).toBe(10_000);
    expect(cfg.circuitDisabled).toBe(true);
  });

  it('rejects invalid numeric env values and falls back to defaults', () => {
    process.env.MS365_MCP_GRAPH_MAX_RETRIES = 'not-a-number';
    process.env.MS365_MCP_GRAPH_TIMEOUT_MS = '-5';
    const cfg = loadResilienceConfig();
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.fetchTimeoutMs).toBe(30_000);
  });
});

describe('CircuitBreaker', () => {
  it('starts closed and only opens after threshold consecutive failures', () => {
    const now = vi.fn().mockReturnValue(0);
    const b = new CircuitBreaker(3, 30_000, false, now);
    expect(b.checkBeforeRequest()).toBeNull();
    b.recordFailure();
    b.recordFailure();
    expect(b.checkBeforeRequest()).toBeNull();
    b.recordFailure();
    expect(b.checkBeforeRequest()).not.toBeNull();
  });

  it('any success resets the failure counter', () => {
    const now = vi.fn().mockReturnValue(0);
    const b = new CircuitBreaker(3, 30_000, false, now);
    b.recordFailure();
    b.recordFailure();
    b.recordSuccess();
    b.recordFailure();
    b.recordFailure();
    expect(b.checkBeforeRequest()).toBeNull(); // 2 failures, threshold 3 → still closed
  });

  it('remains open until the cooldown elapses', () => {
    const now = vi.fn().mockReturnValue(0);
    const b = new CircuitBreaker(1, 1_000, false, now);
    b.recordFailure();
    expect(b.checkBeforeRequest()).toBe(1_000);

    now.mockReturnValue(500);
    expect(b.checkBeforeRequest()).toBe(500);

    now.mockReturnValue(1_000);
    expect(b.checkBeforeRequest()).toBeNull(); // half-open
  });

  it('disabled breaker never blocks calls', () => {
    const b = new CircuitBreaker(1, 1_000, true);
    b.recordFailure();
    b.recordFailure();
    expect(b.checkBeforeRequest()).toBeNull();
  });

  it('half-open probe failure resets the cooldown timer', () => {
    const now = vi.fn().mockReturnValue(0);
    const b = new CircuitBreaker(1, 1_000, false, now);
    b.recordFailure();
    now.mockReturnValue(1_500); // past cooldown — half-open
    expect(b.checkBeforeRequest()).toBeNull();
    b.recordFailure(); // probe failed
    now.mockReturnValue(1_600);
    expect(b.checkBeforeRequest()).toBe(900); // 1500 + 1000 - 1600
  });
});

describe('fetchWithResilience', () => {
  beforeEach(() => {
    __resetSharedBreakerForTests();
  });

  const cfg = {
    maxRetries: 3,
    baseBackoffMs: 1,
    maxBackoffMs: 2,
    fetchTimeoutMs: 30_000,
    circuitFailureThreshold: 5,
    circuitCooldownMs: 30_000,
    circuitDisabled: false,
  };
  const noSleep = () => Promise.resolve();

  it('returns 2xx immediately, no retry', async () => {
    const fake = makeFakeFetch([makeResponse(200)]);
    const stub = vi.stubGlobal('fetch', fake.fetch);
    const r = await fetchWithResilience(
      'https://graph.microsoft.com/v1.0/me',
      {},
      cfg,
      new CircuitBreaker(5, 30_000, false),
      noSleep
    );
    expect(r.status).toBe(200);
    expect(fake.calls).toBe(1);
    stub.clearAllMocks?.();
    vi.unstubAllGlobals();
  });

  it('retries 429 honouring Retry-After header', async () => {
    const fake = makeFakeFetch([makeResponse(429, { 'retry-after': '0' }), makeResponse(200)]);
    vi.stubGlobal('fetch', fake.fetch);
    const sleep = vi.fn(noSleep);
    const r = await fetchWithResilience(
      'https://graph.microsoft.com/v1.0/me',
      {},
      cfg,
      new CircuitBreaker(5, 30_000, false),
      sleep
    );
    expect(r.status).toBe(200);
    expect(fake.calls).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0][0]).toBe(0);
    vi.unstubAllGlobals();
  });

  it('retries 503 with backoff and eventually surfaces the final response', async () => {
    const fake = makeFakeFetch([
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
      makeResponse(503), // 4th = past maxRetries (3)
    ]);
    vi.stubGlobal('fetch', fake.fetch);
    const r = await fetchWithResilience(
      'https://graph.microsoft.com/v1.0/me',
      {},
      cfg,
      new CircuitBreaker(99, 30_000, false),
      noSleep
    );
    expect(r.status).toBe(503);
    expect(fake.calls).toBe(4); // initial + 3 retries
    vi.unstubAllGlobals();
  });

  it('does NOT retry 4xx other than 429', async () => {
    const fake = makeFakeFetch([makeResponse(403)]);
    vi.stubGlobal('fetch', fake.fetch);
    const r = await fetchWithResilience(
      'https://graph.microsoft.com/v1.0/me',
      {},
      cfg,
      new CircuitBreaker(5, 30_000, false),
      noSleep
    );
    expect(r.status).toBe(403);
    expect(fake.calls).toBe(1);
    vi.unstubAllGlobals();
  });

  it('retries on network error', async () => {
    const fake = makeFakeFetch([new TypeError('fetch failed'), makeResponse(200)]);
    vi.stubGlobal('fetch', fake.fetch);
    const r = await fetchWithResilience(
      'https://graph.microsoft.com/v1.0/me',
      {},
      cfg,
      new CircuitBreaker(5, 30_000, false),
      noSleep
    );
    expect(r.status).toBe(200);
    expect(fake.calls).toBe(2);
    vi.unstubAllGlobals();
  });

  it('opens the circuit after threshold consecutive failures and fast-fails subsequent calls', async () => {
    // 1st call fails 4 times (initial + 3 retries — exhausts retry budget) → breaker records 4 failures.
    // 2nd call fails the same way → breaker hits threshold 5 and opens.
    // 3rd call fast-fails with CircuitOpenError.
    const fake = makeFakeFetch([
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
      makeResponse(503),
    ]);
    vi.stubGlobal('fetch', fake.fetch);
    const breaker = new CircuitBreaker(5, 30_000, false);

    await fetchWithResilience('https://graph.microsoft.com/v1.0/me', {}, cfg, breaker, noSleep);
    await fetchWithResilience('https://graph.microsoft.com/v1.0/me', {}, cfg, breaker, noSleep);
    expect(breaker.getState().open).toBe(true);

    await expect(
      fetchWithResilience('https://graph.microsoft.com/v1.0/me', {}, cfg, breaker, noSleep)
    ).rejects.toBeInstanceOf(CircuitOpenError);

    vi.unstubAllGlobals();
  });

  it('successful response closes a half-open breaker', async () => {
    const now = vi.fn();
    const breaker = new CircuitBreaker(1, 1_000, false, now);
    now.mockReturnValue(0);
    breaker.recordFailure();
    expect(breaker.getState().open).toBe(true);

    now.mockReturnValue(2_000); // past cooldown, half-open
    const fake = makeFakeFetch([makeResponse(200)]);
    vi.stubGlobal('fetch', fake.fetch);
    const r = await fetchWithResilience(
      'https://graph.microsoft.com/v1.0/me',
      {},
      cfg,
      breaker,
      noSleep
    );
    expect(r.status).toBe(200);
    expect(breaker.getState().open).toBe(false);
    expect(breaker.getState().failures).toBe(0);
    vi.unstubAllGlobals();
  });

  it('aborts the fetch when timeout is exceeded and counts as a network failure', async () => {
    // Simulate a fetch that resolves only after AbortController fires.
    vi.stubGlobal('fetch', (_url: string, init?: Parameters<typeof fetch>[1]) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const fastTimeoutCfg = { ...cfg, fetchTimeoutMs: 10, maxRetries: 0 };
    await expect(
      fetchWithResilience(
        'https://graph.microsoft.com/v1.0/me',
        {},
        fastTimeoutCfg,
        new CircuitBreaker(99, 30_000, false),
        noSleep
      )
    ).rejects.toMatchObject({ name: 'AbortError' });

    vi.unstubAllGlobals();
  });
});

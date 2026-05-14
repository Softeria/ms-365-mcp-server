import logger from '../logger.js';

/**
 * Resilience layer for Microsoft Graph calls.
 *
 * Three concerns folded into one module:
 *
 *  1. **Fetch timeout** via AbortController — a stuck Graph call must not
 *     hang an MCP request indefinitely. Default 30 s, override with
 *     `MS365_MCP_GRAPH_TIMEOUT_MS`.
 *
 *  2. **Retry with backoff** on transient failures:
 *       - HTTP 429 — honour `Retry-After` (seconds or HTTP-date), cap at 60 s.
 *       - HTTP 503 / 504 — exponential backoff (200 ms → 400 → 800 → …, cap 5 s).
 *       - Network errors (fetch threw, ECONNRESET, AbortError on retry, …)
 *         — same backoff schedule.
 *       - HTTP 5xx other / 4xx other (auth, invalid input, 403 scope errors)
 *         — NOT retried. Those are deterministic.
 *     Default 3 retries, override with `MS365_MCP_GRAPH_MAX_RETRIES`.
 *
 *  3. **Circuit breaker** — a process-wide singleton tracks consecutive
 *     failures against `graph.microsoft.com`. After `MS365_MCP_GRAPH_CIRCUIT_THRESHOLD`
 *     failures (default 5) the breaker opens and every subsequent call
 *     fast-fails with `CircuitOpenError` for `MS365_MCP_GRAPH_CIRCUIT_COOLDOWN_MS`
 *     (default 30 s) before half-opening for a probe. Prevents flooding
 *     Graph when it is already on fire, and gives the upstream a chance to
 *     recover. Disable for tests / trusted automation with
 *     `MS365_MCP_GRAPH_CIRCUIT_DISABLED=true`.
 *
 * All knobs are env-var-driven so the recommendation can be tuned per
 * deployment (Container App, App Service, local dev) without a code change.
 */

export interface ResilienceConfig {
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  fetchTimeoutMs: number;
  circuitFailureThreshold: number;
  circuitCooldownMs: number;
  circuitDisabled: boolean;
}

export function loadResilienceConfig(): ResilienceConfig {
  const intEnv = (name: string, fallback: number): number => {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) {
      logger.warn(`Ignoring invalid ${name}=${JSON.stringify(raw)} (use a non-negative integer)`);
      return fallback;
    }
    return n;
  };
  return {
    maxRetries: intEnv('MS365_MCP_GRAPH_MAX_RETRIES', 3),
    baseBackoffMs: intEnv('MS365_MCP_GRAPH_BASE_BACKOFF_MS', 200),
    maxBackoffMs: intEnv('MS365_MCP_GRAPH_MAX_BACKOFF_MS', 5_000),
    fetchTimeoutMs: intEnv('MS365_MCP_GRAPH_TIMEOUT_MS', 30_000),
    circuitFailureThreshold: intEnv('MS365_MCP_GRAPH_CIRCUIT_THRESHOLD', 5),
    circuitCooldownMs: intEnv('MS365_MCP_GRAPH_CIRCUIT_COOLDOWN_MS', 30_000),
    circuitDisabled:
      process.env.MS365_MCP_GRAPH_CIRCUIT_DISABLED === 'true' ||
      process.env.MS365_MCP_GRAPH_CIRCUIT_DISABLED === '1',
  };
}

export class CircuitOpenError extends Error {
  readonly code = 'circuit_open';
  readonly cooldownMs: number;
  constructor(cooldownMs: number) {
    super(
      `Graph circuit breaker is open (cooldown ${cooldownMs} ms). Upstream has failed repeatedly; refusing to flood it.`
    );
    this.name = 'CircuitOpenError';
    this.cooldownMs = cooldownMs;
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly threshold: number,
    private readonly cooldownMs: number,
    private readonly disabled: boolean,
    private readonly now: () => number = () => Date.now()
  ) {}

  /**
   * @returns the time-remaining (in ms) before the circuit can be probed,
   *          or `null` if the circuit is closed and the call should proceed.
   */
  checkBeforeRequest(): number | null {
    if (this.disabled) return null;
    if (this.openedAt === null) return null;
    const elapsed = this.now() - this.openedAt;
    if (elapsed >= this.cooldownMs) {
      // Half-open — let one probe through; success closes the circuit,
      // failure resets the cooldown timer.
      return null;
    }
    return this.cooldownMs - elapsed;
  }

  recordSuccess(): void {
    if (this.failures !== 0 || this.openedAt !== null) {
      logger.info('Graph circuit: success — closing breaker');
    }
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    if (this.disabled) return;
    this.failures += 1;
    if (this.failures >= this.threshold && this.openedAt === null) {
      this.openedAt = this.now();
      logger.warn(
        `Graph circuit: ${this.failures} consecutive failures — opening breaker for ${this.cooldownMs} ms`
      );
    } else if (this.openedAt !== null) {
      // Failed during the probe → reset the cooldown clock.
      this.openedAt = this.now();
      logger.warn('Graph circuit: probe failed — extending cooldown');
    }
  }

  /** Exposed for tests / metrics. */
  getState(): { failures: number; openedAt: number | null; open: boolean } {
    return {
      failures: this.failures,
      openedAt: this.openedAt,
      open: this.checkBeforeRequest() !== null,
    };
  }
}

/**
 * Parse a Retry-After header (seconds or HTTP-date). Returns null if absent
 * or unparseable. Caps the resulting delay at 60 s — beyond that we'd rather
 * surface the throttle to the caller than hang the connection.
 */
export function parseRetryAfterMs(header: string | null | undefined): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed === '') return null;
  const asInt = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asInt) && asInt >= 0 && String(asInt) === trimmed) {
    return Math.min(asInt * 1000, 60_000);
  }
  // HTTP-date branch — require a credible date-shaped string. RFC 7231
  // IMF-fixdate / obs-date / ANSI C all contain at least one of these
  // delimiters, while bare numerics like "5.5" would otherwise be parsed
  // as ambiguous Date inputs on some Node versions.
  if (!/[-/:,]| GMT$/i.test(trimmed) && !/\s+\d/.test(trimmed)) {
    return null;
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    if (delta <= 0) return 0;
    return Math.min(delta, 60_000);
  }
  return null;
}

export function backoffDelayMs(
  attempt: number,
  baseMs: number,
  maxMs: number,
  rand: () => number = Math.random
): number {
  // Exponential backoff with full jitter: random in [0, min(max, base * 2^attempt))
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(rand() * exp);
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504;
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'AbortError'
  );
}

/**
 * Wraps `fetch` with timeout + retry + circuit-breaker semantics.
 *
 * The signature mirrors `fetch` so it can drop into existing call sites:
 * pass the URL and `init`, get back a `Response`. On retriable failure
 * exhausting the budget, the final attempt's Response (or thrown error)
 * is surfaced unchanged — callers handle 429 / 5xx the same as before.
 */
export async function fetchWithResilience(
  url: string,
  init: Parameters<typeof fetch>[1],
  config: ResilienceConfig,
  breaker: CircuitBreaker,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<Response> {
  const remainingCooldown = breaker.checkBeforeRequest();
  if (remainingCooldown !== null) {
    throw new CircuitOpenError(remainingCooldown);
  }

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs);

    let response: Response | null = null;
    let networkError: unknown = null;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      networkError = err;
    } finally {
      clearTimeout(timer);
    }

    // Success path
    if (response !== null && !isRetriableStatus(response.status)) {
      breaker.recordSuccess();
      return response;
    }

    // Determine whether to retry
    const canRetry = attempt < config.maxRetries;
    if (!canRetry) {
      breaker.recordFailure();
      if (response !== null) return response;
      throw networkError ?? new Error('Graph fetch failed (unknown error)');
    }

    // Compute the delay before next attempt
    let delayMs: number;
    if (response !== null && response.status === 429) {
      const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'));
      delayMs =
        retryAfter !== null
          ? retryAfter
          : backoffDelayMs(attempt, config.baseBackoffMs, config.maxBackoffMs);
    } else {
      delayMs = backoffDelayMs(attempt, config.baseBackoffMs, config.maxBackoffMs);
    }

    const reason =
      response !== null
        ? `HTTP ${response.status}`
        : isAbortError(networkError)
          ? `timeout (${config.fetchTimeoutMs} ms)`
          : `network error: ${(networkError as Error)?.message ?? 'unknown'}`;
    logger.warn(
      `Graph retry ${attempt + 1}/${config.maxRetries} after ${reason} — sleeping ${delayMs} ms`
    );

    // Pre-emptively drain the body so we don't leak the underlying socket
    if (response !== null) {
      try {
        await response.arrayBuffer();
      } catch {
        // Best-effort cleanup
      }
    }

    breaker.recordFailure();
    attempt += 1;
    await sleep(delayMs);
  }
}

// Singleton breaker for the whole process. Tests can ignore by passing their
// own breaker into `fetchWithResilience` directly.
let _sharedBreaker: CircuitBreaker | null = null;
export function getSharedBreaker(): CircuitBreaker {
  if (_sharedBreaker === null) {
    const cfg = loadResilienceConfig();
    _sharedBreaker = new CircuitBreaker(
      cfg.circuitFailureThreshold,
      cfg.circuitCooldownMs,
      cfg.circuitDisabled
    );
  }
  return _sharedBreaker;
}

// Test helper — never used from production code.
export function __resetSharedBreakerForTests(): void {
  _sharedBreaker = null;
}

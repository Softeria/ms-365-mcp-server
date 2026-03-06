/**
 * In-memory per-user rate limiter.
 * Limits each userId to `limit` requests per `windowMs` milliseconds.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(userId: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Graph middleware pipeline type contracts (Plan 02-01).
 *
 * Each middleware implements the onion-model interface: it receives the
 * current `GraphRequest` and a `next` callable that, when awaited, yields
 * the response from the inner chain. Middleware may inspect / mutate the
 * request BEFORE calling next(), inspect / transform the response AFTER
 * next() resolves, or short-circuit by returning a Response without calling
 * next() at all.
 *
 * Design notes:
 *   - `next` is a closure-bound callable passed as an argument (not a field
 *     on the interface). This matches Koa-style async middleware and avoids
 *     the Kiota pitfall where middleware ordering is mutation-based (Kiota's
 *     `next` is set by a factory at registration time; ours is composed
 *     functionally by src/lib/middleware/pipeline.ts).
 *   - The pipeline driver composes a concrete chain at GraphClient
 *     construction time; middleware implementations are immutable.
 *   - `_skipRetry` is an internal marker set by UploadSession (plan 02-06)
 *     so the RetryHandler middleware (plan 02-02) can bypass retry wrapping
 *     on chunk PUTs — those have their own resume-from-nextExpectedRanges
 *     protocol per D-08 and double-retrying would break the upload.
 */

export interface GraphRequest {
  /** Absolute URL including cloud endpoint + /v1.0 + endpoint path. */
  url: string;
  /** HTTP method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'. */
  method: string;
  /** Mutable header map; middleware may add or remove headers. */
  headers: Record<string, string>;
  /**
   * Request body (JSON string for most Graph calls; Buffer for upload chunks).
   * Omitted on safe-method requests (GET / HEAD / OPTIONS).
   */
  body?: string | Buffer;
  signal?: AbortSignal;
  /**
   * Internal marker: when true, RetryHandler (02-02) passes the request through
   * without retry wrapping. Set by UploadSession (02-06) on chunk PUTs.
   */
  _skipRetry?: boolean;
}

export interface GraphMiddleware {
  /** Stable identifier used for OTel span naming (`graph.middleware.{name}`). */
  readonly name: string;
  execute(req: GraphRequest, next: () => Promise<Response>): Promise<Response>;
}

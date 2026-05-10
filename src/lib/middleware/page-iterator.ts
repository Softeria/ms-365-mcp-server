/**
 * PageIterator (MWARE-04) — async-generator pagination over Microsoft Graph
 * `@odata.nextLink` chains. Plan 02-04.
 *
 * Replaces the v1 inline loop at src/graph-tools.ts:400-461 which silently
 * swallowed mid-stream errors and truncated at a hard-coded 10_000-item
 * ceiling (CONCERNS.md "fetchAllPages swallows pagination errors"). The new
 * implementation:
 *
 *   - Yields pages via async generator so callers can `for await` or `break`
 *     early; errors bubble naturally via JS throw. No catch-and-continue.
 *   - Provides a buffered `fetchAllPages` wrapper that concatenates `.value`
 *     across pages AND attaches `_truncated: true` + `_nextLink: <cursor>`
 *     when the maxPages cap is hit (D-06 truncation envelope).
 *   - Default maxPages is 20 (D-06); configurable per-call (opts.maxPages) or
 *     globally via MS365_MCP_MAX_PAGES env var (numeric, positive).
 *   - Hardcoded ceiling of 1000 pages (anti-DoS; T-02-04a mitigation).
 *   - v1's 10_000 hard-coded `maxItems` ceiling is REMOVED per D-06 — the
 *     pagination contract is now `maxPages` alone (simpler, more honest).
 *
 * Each page fetch goes through the full middleware chain (Retry + ODataError
 * + TokenRefresh) because the iterator only calls `client.graphRequest()`,
 * which threads through the pipeline. A 500 on page 5 surfaces as a typed
 * `GraphServerError` thrown from the generator; the caller's `for await`
 * unwinds naturally.
 *
 * NOTE on placement: this module lives under `src/lib/middleware/` for
 * organizational symmetry with the other Graph transport helpers, but
 * `pageIterator` is NOT a GraphMiddleware (it doesn't implement the
 * `execute(req, next)` interface). It's a helper that CALLS through the
 * middleware chain per page.
 */

import logger from '../../logger.js';
import type GraphClient from '../../graph-client.js';
import { emitProgress, type ProgressNotificationSender } from '../mcp-progress/progress.js';
import { isOperationCancelled, type OperationKey } from '../mcp-progress/cancellation.js';
import type { ClientCapabilityProfile } from '../mcp-capabilities/profile.js';

const DEFAULT_MAX_PAGES = 20;
const HARD_CEILING_PAGES = 1000;

/**
 * Subset of GraphClient's GraphRequestOptions used by the iterator. We keep
 * this loose (`[key: string]: unknown`) so callers can pass through the same
 * options record used for the initial request (access token, queryParams,
 * headers, excludeResponse, etc.) without us having to mirror every field.
 */
export interface GraphRequestOptionsLike {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  queryParams?: Record<string, string>;

  [key: string]: unknown;
}

export interface PageIteratorOptions {
  /** Override the default maxPages (20) or the env-configured value. */
  maxPages?: number;
  /**
   * Optional pre-fetched first page JSON. When supplied, the iterator does
   * NOT issue its own initial `client.graphRequest(initialPath)` call —
   * instead it yields this value as page 0 and then follows `@odata.nextLink`
   * from there. Used by `src/graph-tools.ts` executeGraphTool so the initial
   * fetch already made by the tool handler is reused, avoiding a duplicate
   * network round-trip when `params.fetchAllPages === true`.
   */
  seedFirstPage?: Record<string, unknown>;
  progressToken?: string | number;
  sendNotification?: ProgressNotificationSender;
  capabilityProfile?: ClientCapabilityProfile;
  operationKey?: OperationKey;
  signal?: AbortSignal;
}

export interface PageResult {
  /** Parsed JSON body of the page (the full response envelope). */
  json: Record<string, unknown>;
  /** 0-based page index. First page is 0. */
  pageIndex: number;
}

export interface FetchAllPagesResult {
  value: unknown[];
  _truncated?: true;
  _nextLink?: string;
  _cancelled?: true;
  _partialResourceUri?: string;

  [key: string]: unknown;
}

/**
 * Resolve maxPages from (in priority order): per-call opts, env var, default.
 *
 * Per-call maxPages > HARD_CEILING_PAGES throws — callers must not opt into
 * unbounded fetching even by mistake. Env-var values that exceed the ceiling
 * or fail to parse fall back to the default with a warning — operators can
 * misconfigure without crashing the process.
 */
function resolveMaxPages(opts: PageIteratorOptions | undefined): number {
  const perCall = opts?.maxPages;
  if (perCall !== undefined) {
    if (!Number.isFinite(perCall) || perCall <= 0) {
      throw new Error(`maxPages must be a positive finite number; got ${perCall}`);
    }
    const n = Math.floor(perCall);
    if (n > HARD_CEILING_PAGES) {
      throw new Error(`maxPages ${n} exceeds hard ceiling ${HARD_CEILING_PAGES}`);
    }
    return n;
  }
  const raw = process.env.MS365_MCP_MAX_PAGES;
  if (raw !== undefined && raw !== '') {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= HARD_CEILING_PAGES) {
      return parsed;
    }
    logger.warn(
      `Ignoring invalid MS365_MCP_MAX_PAGES=${JSON.stringify(raw)} ` +
        `(expected positive integer <= ${HARD_CEILING_PAGES}); falling back to default ${DEFAULT_MAX_PAGES}`
    );
  }
  return DEFAULT_MAX_PAGES;
}

/**
 * Async generator yielding Graph response pages.
 *
 * Errors from `client.graphRequest` throw via standard JS semantics; the
 * consumer's `for await` naturally unwinds on the first throw. This is the
 * structural fix for the v1 bug (src/graph-tools.ts:458) that wrapped the
 * loop in a catch-and-continue and silently returned partial results.
 *
 * The generator is LAZY — breaking out of the `for await` stops fetching
 * (Test 5). It fetches at most `maxPages + 1` pages internally so the
 * buffered `fetchAllPages` wrapper can detect "one more page existed beyond
 * the cap" and surface `_truncated: true` + `_nextLink` in the envelope.
 * Callers using the generator directly should treat any (maxPages + 1)-th
 * yield as the truncation cursor and not append its items.
 */
export async function* pageIterator(
  initialPath: string,
  options: GraphRequestOptionsLike,
  client: GraphClient,
  opts: PageIteratorOptions = {}
): AsyncGenerator<PageResult, void, void> {
  const maxPages = resolveMaxPages(opts);
  const seed = opts.seedFirstPage;
  const signal = opts.signal;
  let currentPath: string | undefined = initialPath;
  let currentOptions: GraphRequestOptionsLike = options;
  let pageIndex = 0;

  // If a seed was provided, yield it as page 0 and jump to its nextLink
  // without issuing a duplicate request.
  if (seed !== undefined) {
    if (signal?.aborted) return;
    yield { json: seed, pageIndex: 0 };
    pageIndex = 1;
    const seedNextLink = seed['@odata.nextLink'];
    if (typeof seedNextLink !== 'string' || seedNextLink.length === 0) return;
    const url = new URL(seedNextLink);
    const nextPath = url.pathname.replace('/v1.0', '');
    const nextQueryParams: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      nextQueryParams[k] = v;
    }
    currentPath = nextPath;
    currentOptions = { ...options, queryParams: nextQueryParams };
  }

  while (currentPath) {
    // Stop at maxPages + 1 iterations — one extra so fetchAllPages can detect
    // truncation without itself issuing another request.
    if (pageIndex > maxPages) return;
    if (signal?.aborted) return;

    const response = await client.graphRequest(currentPath, { ...currentOptions, signal });
    const text = response?.content?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) return;

    const json = JSON.parse(text) as Record<string, unknown>;
    yield { json, pageIndex };
    pageIndex++;

    const nextLink = json['@odata.nextLink'];
    if (typeof nextLink !== 'string' || nextLink.length === 0) return;

    // Parse nextLink into path + query (preserves v1 URL-mutation path).
    // new URL() throws on malformed input — the throw propagates to the
    // caller, consistent with the "errors bubble" contract.
    const url = new URL(nextLink);
    const nextPath = url.pathname.replace('/v1.0', '');
    const nextQueryParams: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      nextQueryParams[k] = v;
    }
    // Immutable merge — keep original options for token/headers/etc., replace
    // only the queryParams with the nextLink-derived ones.
    currentPath = nextPath;
    currentOptions = { ...options, queryParams: nextQueryParams };
  }
}

/**
 * Buffered wrapper over `pageIterator` — consumes the generator,
 * concatenates `.value` across pages, and attaches `_truncated: true` +
 * `_nextLink` when the cap is hit.
 *
 * Implementation note: the underlying iterator walks up to `maxPages + 1`
 * pages. If a (maxPages + 1)-th page is emitted, this wrapper does NOT
 * append its items — it uses that page solely to extract the `_nextLink`
 * cursor. Non-value metadata from the FIRST page (e.g., `@odata.context`) is
 * preserved on the returned envelope so callers see the same shape v1
 * returned minus the mid-stream-silent-swallow bug.
 */
export async function fetchAllPages(
  initialPath: string,
  options: GraphRequestOptionsLike,
  client: GraphClient,
  opts: PageIteratorOptions = {}
): Promise<FetchAllPagesResult> {
  const maxPages = resolveMaxPages(opts);
  const allItems: unknown[] = [];
  let lastNextLink: string | undefined;
  let truncated = false;
  let cancelled = false;
  let firstPageExtras: Record<string, unknown> = {};

  for await (const { json, pageIndex } of pageIterator(initialPath, options, client, {
    maxPages,
    seedFirstPage: opts.seedFirstPage,
    signal: opts.signal,
  })) {
    if (opts.signal?.aborted || (opts.operationKey && isOperationCancelled(opts.operationKey))) {
      cancelled = true;
      break;
    }
    if (pageIndex === 0) {
      // Capture non-value fields from the first page (e.g., @odata.count,
      // @odata.context) so the envelope returned to callers preserves them.
      const { value: _value, '@odata.nextLink': _nl, ...rest } = json;
      void _value;
      void _nl;
      firstPageExtras = rest;
    }

    if (pageIndex >= maxPages) {
      // This is the (maxPages + 1)-th page we pulled solely to detect
      // truncation. We do NOT append its items — the caller asked for
      // exactly maxPages of data.
      const nextLink = json['@odata.nextLink'];
      lastNextLink = typeof nextLink === 'string' ? nextLink : undefined;
      truncated = true;
      break;
    }

    if (Array.isArray(json.value)) {
      allItems.push(...json.value);
    }
    const nextLink = json['@odata.nextLink'];
    lastNextLink = typeof nextLink === 'string' ? nextLink : undefined;

    if (opts.progressToken !== undefined) {
      await emitProgress(opts.sendNotification, opts.capabilityProfile, {
        progressToken: opts.progressToken,
        progress: pageIndex + 1,
        message: `Fetched ${pageIndex + 1} page${pageIndex === 0 ? '' : 's'}`,
      });
    }
  }

  const result: FetchAllPagesResult = {
    ...firstPageExtras,
    value: allItems,
  };

  if (truncated) {
    result._truncated = true;
    if (lastNextLink !== undefined) {
      result._nextLink = lastNextLink;
    }
  }

  if (cancelled) {
    result._cancelled = true;
    if (
      opts.operationKey?.tenantId &&
      opts.operationKey.requestId &&
      opts.operationKey.progressToken
    ) {
      const tenantId = encodeURIComponent(opts.operationKey.tenantId);
      const requestId = encodeURIComponent(opts.operationKey.requestId);
      const progressToken = encodeURIComponent(opts.operationKey.progressToken);
      result._partialResourceUri = `m365://tenant/${tenantId}/partial/${requestId}/${progressToken}.json`;
    }
  }

  logger.info(
    `Pagination complete: items=${allItems.length} truncated=${truncated} maxPages=${maxPages}`
  );
  return result;
}

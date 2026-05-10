import logger from './logger.js';
import AuthManager from './auth.js';
import { encode as toonEncode } from '@toon-format/toon';
import type { AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { getRequestTokens, requestContext } from './request-context.js';
import { composePipeline } from './lib/middleware/pipeline.js';
import { TokenRefreshMiddleware } from './lib/middleware/token-refresh.js';
import { ODataErrorHandler } from './lib/middleware/odata-error.js';
import { RetryHandler } from './lib/middleware/retry.js';
import { ETagMiddleware } from './lib/middleware/etag.js';
import { GraphError } from './lib/graph-errors.js';
import type { GraphRequest } from './lib/middleware/types.js';
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import {
  mcpToolCallsTotal,
  mcpToolDurationSeconds,
  mcpGraphThrottledTotal,
  labelForTool,
} from './lib/otel-metrics.js';

/**
 * Plan 06-02 — module-level tracer for the graph.request parent span.
 * Distinct scope from the `'graph-middleware'` tracer used by ETag / Retry /
 * ODataError / TokenRefresh child spans (plans 02-02 / 02-03 / 02-07): those
 * are per-middleware spans nested under this parent when the pipeline runs.
 */
const graphRequestTracer = trace.getTracer('ms-365-mcp-server');

/**
 * Maximum recursion depth for `removeODataProps`. A well-formed Graph response
 * is shallow (typically < 10 levels); 100 is a comfortable safety ceiling that
 * guards against pathological or adversarial payloads stack-overflowing the
 * process. Deeper levels are silently truncated — the caller gets the top-100
 * layers with @odata.* stripped and the rest passed through as-is.
 */
const MAX_REMOVE_ODATA_DEPTH = 100;

/**
 * Recursively strip `@odata.*` properties from a Graph response, preserving
 * `@odata.nextLink` (pagination contract — see test/odata-nextlink.test.ts).
 *
 * Depth-guarded at MAX_REMOVE_ODATA_DEPTH and cycle-guarded via a WeakSet so
 * self-referencing payloads (malicious or buggy upstream responses) cannot
 * stack-overflow the Node runtime (T-01-09a DoS mitigation).
 *
 * Returns a new object; does not mutate `obj`. Primitives pass through
 * unchanged. Arrays are mapped element-wise.
 *
 * Formerly defined as two inline `const` declarations inside
 * `formatJsonResponse` (src/graph-client.ts lines 303-313 and 339-349 in
 * v1) — hoisted to a single module-level implementation by Plan 01-09.
 */
export function removeODataProps<T>(obj: T, depth = 0, seen: WeakSet<object> = new WeakSet()): T {
  if (depth > MAX_REMOVE_ODATA_DEPTH) return obj;
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (seen.has(obj as object)) return obj;
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => removeODataProps(item, depth + 1, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key.startsWith('@odata.') && key !== '@odata.nextLink') continue;
    result[key] = removeODataProps(value, depth + 1, seen);
  }
  return result as T;
}

/**
 * Returns true if the given HTTP Content-Type header indicates a binary
 * payload that must not be decoded as UTF-8 text. Graph returns binary for
 * endpoints like /me/photo/$value, /chats/.../hostedContents/{id}/$value, and
 * /drives/.../items/{id}/content, among others.
 */
export function isBinaryContentType(contentType: string): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase().split(';')[0].trim();
  if (!lower) return false;
  if (
    lower.startsWith('image/') ||
    lower.startsWith('video/') ||
    lower.startsWith('audio/') ||
    lower.startsWith('font/')
  ) {
    return true;
  }
  if (lower === 'application/octet-stream' || lower === 'application/pdf') {
    return true;
  }
  if (lower.startsWith('application/zip') || lower.startsWith('application/x-zip')) {
    return true;
  }
  // Office document MIME types and other vendor-specific binary formats.
  if (lower.startsWith('application/vnd.') || lower.startsWith('application/x-')) {
    // Be conservative: exclude MIME types that use the structured-syntax suffix
    // to declare a text serialization (e.g. application/vnd.api+json).
    if (lower.endsWith('+json') || lower.endsWith('+xml') || lower.endsWith('+text')) {
      return false;
    }
    return true;
  }
  return false;
}

export function sanitizeGraphUrlForLog(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}${parsed.search ? '?<redacted>' : ''}`;
  } catch {
    const marker = rawUrl.search(/[?#]/);
    return marker === -1 ? rawUrl : `${rawUrl.slice(0, marker)}?<redacted>`;
  }
}

interface GraphRequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  queryParams?: Record<string, string | number | boolean | null | undefined>;
  rawResponse?: boolean;
  includeHeaders?: boolean;
  excludeResponse?: boolean;
  accessToken?: string;
  refreshToken?: string;
  baseUrl?: string;
  signal?: AbortSignal;

  [key: string]: unknown;
}

interface ContentItem {
  type: 'text';
  text: string;

  [key: string]: unknown;
}

interface McpResponse {
  content: ContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;

  [key: string]: unknown;
}

class GraphClient {
  private authManager: AuthManager;
  private secrets: AppSecrets;
  private readonly outputFormat: 'json' | 'toon' = 'json';
  /**
   * Phase 2 middleware pipeline. Middlewares compose outer-to-inner; the
   * terminal handler performs the raw `fetch()` call. Subsequent Phase 2 plans
   * slot their middleware into the array in the specified order (see
   * 02-CONTEXT.md Pattern E "Chain Ordering Invariant"). Order is
   * load-bearing; changes here require a test update.
   */
  private readonly pipeline: (req: GraphRequest) => Promise<Response>;

  constructor(
    authManager: AuthManager,
    secrets: AppSecrets,
    outputFormat: 'json' | 'toon' = 'json'
  ) {
    this.authManager = authManager;
    this.secrets = secrets;
    this.outputFormat = outputFormat;

    // Phase 2 middleware pipeline. Middlewares compose outer-to-inner:
    //   - ETagMiddleware (02-07)                  — outermost
    //   - RetryHandler (02-02)
    //   - ODataErrorHandler (02-03)
    //   - TokenRefreshMiddleware (02-01)          — innermost
    // Order is load-bearing; see 02-CONTEXT.md Pattern E and
    // 02-RESEARCH.md "Example 1: Wiring the pipeline in GraphClient". A
    // structural test in test/etag-middleware.test.ts asserts this order and
    // will fail if a refactor reshuffles the array.
    this.pipeline = composePipeline(
      [
        new ETagMiddleware(),
        new RetryHandler(),
        new ODataErrorHandler(),
        new TokenRefreshMiddleware(this.authManager, this.secrets),
      ],
      (req) => {
        // Node 18+ fetch (undici) accepts Buffer at runtime via the
        // TypedArray branch of BodyInit, but the DOM-lib's BodyInit union
        // doesn't include Buffer directly. Cast through `unknown` to keep
        // the single fetch-call site typed without widening GraphRequest
        // or referencing DOM-only global types (which the lint's no-undef
        // rule would flag).
        const init = {
          method: req.method,
          headers: req.headers,
          body: req.body as unknown,
          signal: req.signal,
        } as Parameters<typeof fetch>[1];
        return fetch(req.url, init);
      }
    );
  }

  async makeRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<unknown> {
    // Plan 06-02 (OPS-05, OPS-06): Every Graph call flows through this
    // chokepoint; we wrap it in a graph.request parent span + emit
    // mcp_tool_calls_total, mcp_tool_duration_seconds, mcp_graph_throttled_total
    // in the finally block. Cardinality guard (D-06): the `tool` label is the
    // workload prefix (labelForTool(alias)), NEVER the full alias. The full
    // alias is carried on the span as `tool.alias` for trace-query fidelity.
    const store = requestContext.getStore();
    const tenantId = store?.tenantId ?? 'unknown';
    const toolAlias = store?.toolAlias ?? 'unknown';
    const workload = labelForTool(toolAlias);

    return graphRequestTracer.startActiveSpan(
      'graph.request',
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'tenant.id': tenantId,
          'tool.name': workload,
          'tool.alias': toolAlias,
        },
      },
      async (span) => {
        const start = performance.now();
        let httpStatus = 0;
        try {
          const contextTokens = getRequestTokens();
          const accessToken =
            options.accessToken ??
            contextTokens?.accessToken ??
            (await this.authManager.getToken());

          if (!accessToken) {
            throw new Error('No access token available');
          }

          // 401-refresh is now owned by TokenRefreshMiddleware (innermost in the
          // pipeline). 4xx / 5xx typed-error parsing is owned by ODataErrorHandler
          // (02-03) — it throws a typed GraphError subclass on any non-2xx
          // response, so the 2xx path below is the only branch we reach here.
          // The pipeline returns the post-refresh / post-error-parse response.
          const response = await this.performRequest(endpoint, accessToken, options);
          httpStatus = (response as { status?: number }).status ?? 200;

          // Plan 06-02: surface Graph's `request-id` header on the span so
          // operators can correlate traces with Microsoft support tickets.
          const graphReqId =
            (response as { headers?: { get?: (k: string) => string | null } }).headers?.get?.(
              'request-id'
            ) ?? null;
          if (graphReqId) span.setAttribute('graph.request_id', graphReqId);

          const contentTypeHeader = response.headers?.get?.('content-type') || '';
          const isBinaryResponse = isBinaryContentType(contentTypeHeader);

          let result: any;

          if (isBinaryResponse) {
            // Binary payloads (images, video, pdf, octet-stream, etc.) must not be
            // decoded with response.text() — that performs a lossy UTF-8 decode and
            // replaces every high byte with U+FFFD, destroying the file. Read the
            // raw bytes and return them as base64 so callers can reconstruct them.
            const buffer = Buffer.from(await response.arrayBuffer());
            result = {
              message: 'OK!',
              contentType: contentTypeHeader,
              encoding: 'base64',
              contentLength: buffer.byteLength,
              contentBytes: buffer.toString('base64'),
            };
          } else {
            const text = await response.text();

            if (text === '') {
              result = { message: 'OK!' };
            } else {
              try {
                result = JSON.parse(text);
              } catch {
                result = { message: 'OK!', rawResponse: text };
              }
            }
          }

          // If includeHeaders is requested, add response headers to the result
          if (options.includeHeaders) {
            const etag = response.headers.get('ETag') || response.headers.get('etag');

            // Simple approach: just add ETag to the result if it's an object
            if (result && typeof result === 'object' && !Array.isArray(result)) {
              return {
                ...result,
                _etag: etag || 'no-etag-found',
              };
            }
          }

          return result;
        } catch (error) {
          // Capture HTTP status from typed GraphError when the pipeline threw
          // a 4xx/5xx; default to 0 for non-HTTP errors (network, token, etc.)
          httpStatus = (error as { statusCode?: number }).statusCode ?? 0;
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          // Load-bearing operator-triage log line — do NOT remove. Operators
          // depend on this log channel to correlate Graph failures.
          logger.error('Microsoft Graph API request failed:', error);
          throw error;
        } finally {
          const durationSec = (performance.now() - start) / 1000;
          span.setAttribute('http.status_code', httpStatus);
          span.setAttribute('retry.count', store?.retryCount ?? 0);
          mcpToolCallsTotal.add(1, {
            tenant: tenantId,
            tool: workload,
            status: String(httpStatus),
          });
          mcpToolDurationSeconds.record(durationSec, { tenant: tenantId, tool: workload });
          if (httpStatus === 429) {
            mcpGraphThrottledTotal.add(1, { tenant: tenantId });
          }
          span.end();
        }
      }
    );
  }

  /**
   * Builds a GraphRequest from the (endpoint, accessToken, options) tuple and
   * delegates to the Phase 2 middleware pipeline. The pipeline owns
   * 401-refresh (TokenRefreshMiddleware — innermost) and, once subsequent
   * Phase 2 plans land, retry / typed-error-parsing / ETag-plumbing concerns
   * as well. The raw `fetch()` call lives in the terminal handler wired up in
   * the constructor.
   */
  private async performRequest(
    endpoint: string,
    accessToken: string,
    options: GraphRequestOptions
  ): Promise<Response> {
    const cloudEndpoints = getCloudEndpoints(this.secrets.cloudType);
    const baseUrl = options.baseUrl ?? `${cloudEndpoints.graphApi}/v1.0`;
    const parsedBaseUrl = new URL(baseUrl);
    if (parsedBaseUrl.protocol !== 'https:') {
      throw new Error(`GraphClient baseUrl must use https: ${baseUrl}`);
    }
    const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const requestUrl = new URL(`${baseUrl.replace(/\/+$/, '')}${endpointPath}`);
    if (options.queryParams) {
      for (const [key, value] of Object.entries(options.queryParams)) {
        if (value === null || value === undefined) continue;
        requestUrl.searchParams.set(key, String(value));
      }
    }
    const url = requestUrl.toString();

    logger.info(`[GRAPH CLIENT] Final URL being sent to Microsoft: ${sanitizeGraphUrlForLog(url)}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const req: GraphRequest = {
      url,
      method: options.method || 'GET',
      headers,
      body: options.body,
      signal: options.signal,
    };
    return this.pipeline(req);
  }

  private serializeData(data: unknown, outputFormat: 'json' | 'toon', pretty = false): string {
    if (outputFormat === 'toon') {
      try {
        return toonEncode(data);
      } catch (error) {
        logger.warn(`Failed to encode as TOON, falling back to JSON: ${error}`);
        return JSON.stringify(data, null, pretty ? 2 : undefined);
      }
    }
    return JSON.stringify(data, null, pretty ? 2 : undefined);
  }

  async graphRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
    try {
      // CR-01 fix: pass options shape as a structured pino merging object so
      // redact paths (`*.access_token`, `*.refresh_token`,
      // `req.headers.authorization`) can match. JSON.stringify-ing the full
      // options object into the message string flattens the values to plain
      // text BEFORE pino sees them — pino traverses objects, not message
      // substrings, so the redact list cannot mask Authorization headers,
      // bodies, or token fields once they are interpolated. Shape booleans
      // are sufficient for operational triage.
      logger.info(
        {
          endpoint: sanitizeGraphUrlForLog(endpoint),
          method: options.method ?? 'GET',
          hasBody: Boolean(options.body),
          hasHeaders: Boolean(options.headers),
          includeHeaders: options.includeHeaders ?? false,
          rawResponse: options.rawResponse ?? false,
        },
        'Graph request'
      );

      // Use new OAuth-aware request method
      const result = await this.makeRequest(endpoint, options);

      return this.formatJsonResponse(result, options.rawResponse, options.excludeResponse);
    } catch (error) {
      // Typed GraphError from ODataErrorHandler (02-03) → surface structured
      // fields into _meta.graph so AI callers can paste requestId into a
      // Microsoft support ticket (Phase 2 Success Criteria #5).
      if (error instanceof GraphError) {
        // Plan 03-10 (TENANT-06): emit a graph.error audit row with the
        // Microsoft requestId so operators can correlate to a Microsoft
        // support ticket. Fire-and-forget; writeAuditStandalone falls back
        // to pino shadow log on DB error. Only emitted when a tenantId is
        // present on the request context (HTTP mode per-tenant path);
        // stdio / legacy single-tenant paths skip to avoid orphaning rows.
        void this.emitGraphErrorAudit(endpoint, error);

        let finalMessage = error.message;
        if (error.requiresOrgMode) {
          finalMessage +=
            '. This tool requires organization mode. Please restart with --org-mode flag.';
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: finalMessage,
                code: error.code,
                requestId: error.requestId,
              }),
            },
          ],
          isError: true,
          _meta: {
            graph: {
              code: error.code,
              statusCode: error.statusCode,
              requestId: error.requestId,
              clientRequestId: error.clientRequestId,
              date: error.date,
            },
          },
        };
      }
      // Fallback for non-GraphError (network errors, auth-resolution failures,
      // etc.). These never carry a Microsoft requestId so _meta.graph is omitted.
      logger.error(`Error in Graph API request: ${error}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
      };
    }
  }

  /**
   * Plan 03-10 (TENANT-06): fire-and-forget Graph error audit writer.
   *
   * Lazy-loads postgres + audit modules so the legacy single-tenant stdio
   * path (no pg available) never pays the import cost. Only emits when a
   * tenantId is present on the request context — Phase 3 HTTP mode sets
   * this via the loadTenant middleware; stdio requests leave it undefined
   * and skip audit.
   */
  private async emitGraphErrorAudit(endpoint: string, error: GraphError): Promise<void> {
    try {
      const ctx = getRequestTokens();
      const tenantId = ctx?.tenantId;
      if (!tenantId) return;

      const postgres = await import('./lib/postgres.js');
      const pgPool = postgres.getPool();
      const { writeAuditStandalone } = await import('./lib/audit.js');

      await writeAuditStandalone(pgPool, {
        tenantId,
        actor: 'system',
        action: 'graph.error',
        target: sanitizeGraphUrlForLog(endpoint),
        ip: null,
        requestId: ctx?.requestId ?? 'no-req-id',
        result: 'failure',
        meta: {
          code: error.code,
          message: error.message,
          graphRequestId: error.requestId,
          httpStatus: error.statusCode,
        },
      });
    } catch {
      // Audit write itself failed (postgres pool not constructed in stdio
      // mode, or pg is unreachable). writeAuditStandalone has its own
      // shadow-log fallback for DB errors; we swallow module-not-available
      // errors here so the Graph error path never fails on missing deps.
    }
  }

  formatJsonResponse(data: unknown, rawResponse = false, excludeResponse = false): McpResponse {
    // If excludeResponse is true, only return success indication
    if (excludeResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }, this.outputFormat) }],
      };
    }

    // Handle the case where data includes headers metadata
    if (data && typeof data === 'object' && '_headers' in data) {
      const responseData = data as {
        data: unknown;
        _headers: Record<string, string>;
        _etag?: string;
      };

      const meta: Record<string, unknown> = {};
      if (responseData._etag) {
        meta.etag = responseData._etag;
      }
      if (responseData._headers) {
        meta.headers = responseData._headers;
      }

      if (rawResponse) {
        return {
          content: [
            { type: 'text', text: this.serializeData(responseData.data, this.outputFormat) },
          ],
          _meta: meta,
        };
      }

      if (responseData.data === null || responseData.data === undefined) {
        return {
          content: [
            { type: 'text', text: this.serializeData({ success: true }, this.outputFormat) },
          ],
          _meta: meta,
        };
      }

      // Strip @odata.* properties (preserves @odata.nextLink) via module-level
      // helper with depth + WeakSet cycle guards (Plan 01-09 / T-01-09a).
      const stripped = removeODataProps(responseData.data);

      return {
        content: [{ type: 'text', text: this.serializeData(stripped, this.outputFormat, true) }],
        _meta: meta,
      };
    }

    // Original handling for backward compatibility
    if (rawResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData(data, this.outputFormat) }],
      };
    }

    if (data === null || data === undefined) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }, this.outputFormat) }],
      };
    }

    // Strip @odata.* properties (preserves @odata.nextLink) via module-level
    // helper with depth + WeakSet cycle guards (Plan 01-09 / T-01-09a).
    const stripped = removeODataProps(data);

    return {
      content: [{ type: 'text', text: this.serializeData(stripped, this.outputFormat, true) }],
    };
  }
}

export default GraphClient;
export { refreshSessionAndRetry } from './lib/session-refresh.js';

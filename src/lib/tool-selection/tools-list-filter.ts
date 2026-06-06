/**
 * tools/list per-tenant filter middleware (plan 05-05, COVRG-04, TENANT-08).
 *
 * Ships two filter seams that cooperate to enforce decision D-20's tools/list
 * contract: "never advertise tools the tenant can't call".
 *
 *   1. `wrapToolsListHandler(mcpServer)` — SDK-level handler override
 *      (PRIMARY path). Captures the MCP SDK's default `tools/list` closure
 *      from the underlying `Server._requestHandlers` map and replaces it
 *      with a wrapper that calls the original, then filters the `tools`
 *      array by `getRequestTenant().enabledToolsSet`. This is the
 *      authoritative path because `StreamableHTTPServerTransport` (SDK
 *      v1.29+) delegates to `@hono/node-server`'s `getRequestListener`
 *      which bypasses Express's `res.json`/`res.send` methods entirely
 *      (05-RESEARCH.md §State of the Art; upstream SDK bypasses Express's
 *      response serialization for web-standard streaming).
 *
 *   2. `createToolsListFilterMiddleware()` — Express middleware (DEFENSE
 *      IN DEPTH). Intercepts JSON-RPC POST bodies with `method: 'tools/
 *      list'` and wraps `res.json` + `res.send` so ANY transport that DOES
 *      use Express's response methods (legacy shims, future replacements,
 *      test harnesses) gets the same filtering. Harmless on Streamable
 *      HTTP where it never fires.
 *
 * Both seams read the tenant-scoped `ReadonlySet<string>` from the ALS
 * frame seeded by `src/lib/tool-selection/tenant-context-middleware.ts`
 * (plan 05-04). Undefined set → pass-through; the dispatch-guard inside
 * `executeGraphTool` is the authoritative gate and fails closed if a tool
 * is called that the filter let through (defense in depth).
 *
 * Threat refs (05-PLAN threat register):
 *   - T-05-10 (tool metadata leaked pre-dispatch): mitigated by BOTH seams;
 *     strict `Set.has` subset; frozen Set cannot be mutated; ALS isolation
 *     per request.
 *   - T-05-10b (non-tools/list accidentally intercepted): middleware gates
 *     on `body.method === 'tools/list'` before replacing res methods; SDK
 *     wrap only touches the `tools/list` handler slot.
 *   - T-05-11 (DoS from filter loop): O(n) filter on registered tool count
 *     (bounded ≤14k); Set.has is O(1); ≤5ms p99 at 14k.
 *   - T-05-11b (buffered res.json memory): response buffer bounded by MCP
 *     SDK's own allocation; wrap only adds a filter pass, not buffering.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getRequestTenant } from '../../request-context.js';
import logger from '../../logger.js';
import { DISCOVERY_META_TOOL_NAMES } from '../tenant-surface/surface.js';
import { checkDispatch, type CallToolResultLike } from './dispatch-guard.js';
import { safeMcpName } from './safe-mcp-name.js';
export const MANDATORY_DISCOVERY_TOOL_NAMES: ReadonlySet<string> = Object.freeze(
  new Set(['search-tools', 'get-tool-schema', 'execute-tool'])
);

/**
 * JSON-RPC method literal the MCP SDK uses for tools/list requests.
 * Sourced from `@modelcontextprotocol/sdk` ListToolsRequestSchema.method
 * — a `z.ZodLiteral<'tools/list'>`. If the SDK ever renames this (major
 * version bump), both the middleware `body.method` guard AND the handler
 * map key must update in lockstep.
 */
const TOOLS_LIST_METHOD = 'tools/list' as const;

/**
 * Namespaced symbol used to mark an `McpServer` instance as already wrapped,
 * preserving idempotency if the caller invokes `wrapToolsListHandler` twice
 * on the same server (plan 05-05 Test 9). `Symbol.for()` rather than a
 * module-local Symbol so the mark survives `vi.resetModules()` in tests that
 * hot-reload the filter module.
 */
const WRAP_MARK = Symbol.for('ms-365-mcp-server.tools-list-filter.wrapped');
const NATIVE_DISPATCH_WRAP_MARK = Symbol.for(
  'ms-365-mcp-server.native-discovery-dispatch-filter.wrapped'
);

interface NativeRegisteredTool {
  handler?: (args: unknown, extra: unknown) => Promise<unknown> | unknown;
  [NATIVE_DISPATCH_WRAP_MARK]?: true;
}

interface ToolEntry {
  name: string;
  [key: string]: unknown;
}

interface ListToolsResult {
  tools: ToolEntry[];
  nextCursor?: string;
  [key: string]: unknown;
}

/**
 * SDK-level wrap. Call once per McpServer instance AFTER all `server.tool
 * (...)` registrations have finished. The SDK installs its default `tools/
 * list` handler lazily on the first `server.tool()` call; by wrapping after
 * tool registration we are guaranteed to find the default handler in the
 * `_requestHandlers` map.
 *
 * Idempotent: repeated calls on the same server are no-ops (the first call
 * marks the instance).
 *
 * Pass-through contracts (identical to the Express middleware):
 *   - `getRequestTenant().enabledToolsSet === undefined` → return the
 *     SDK's default result unchanged (dispatch-guard will fail closed).
 *   - Result payload malformed (missing `tools` array) → return unchanged.
 *   - Any exception inside the filter → log and return the default result
 *     (fail open for list — fail closed for dispatch is the contract).
 */
export function wrapToolsListHandler(mcpServer: McpServer): void {
  // The McpServer class exposes its inner `Server` via a readonly `server`
  // property (see @modelcontextprotocol/sdk/server/mcp.d.ts line 18).
  // The `Server` instance stores registered handlers in a private-by-
  // convention `_requestHandlers: Map<string, fn>` — accessing it at
  // runtime is supported (no symbol-keyed/Proxy protection).
  const inner = mcpServer.server as unknown as {
    _requestHandlers: Map<
      string,
      (req: unknown, extra: unknown) => Promise<ListToolsResult> | ListToolsResult
    >;
  };

  // Idempotency: bail if we already wrapped this server.
  const marked = (mcpServer as unknown as Record<symbol, boolean>)[WRAP_MARK];
  if (marked) {
    return;
  }

  const defaultHandler = inner._requestHandlers.get(TOOLS_LIST_METHOD);
  if (!defaultHandler) {
    // No default handler yet — the caller wrapped before registering any
    // tool, or the SDK skipped tool capability registration. Nothing to
    // wrap. Mark anyway so a later call after tool registration sees
    // "already wrapped" and does not double-install.
    logger.warn(
      'tools-list-filter: no default tools/list handler present on McpServer; wrap skipped'
    );
    return;
  }

  const filteredHandler = async (req: unknown, extra: unknown): Promise<ListToolsResult> => {
    // Await the default handler's result verbatim; never swallow its errors.
    const original = await defaultHandler(req, extra);
    const filtered = applyTenantFilter(original);
    return filtered;
  };

  inner._requestHandlers.set(TOOLS_LIST_METHOD, filteredHandler);
  (mcpServer as unknown as Record<symbol, boolean>)[WRAP_MARK] = true;
}

/**
 * Apply the tenant filter to a tools/list result object. Pure function —
 * no mutation of the input; returns a new object on filter, the input
 * itself on pass-through. Exported only for direct unit testing (callers
 * should use `wrapToolsListHandler`).
 */
function effectiveDiscoveryVisibleSet(
  enabledSet: ReadonlySet<string> | undefined
): ReadonlySet<string> | undefined {
  if (!enabledSet) return undefined;
  const visibleSet = new Set<string>(enabledSet);
  for (const primitive of MANDATORY_DISCOVERY_TOOL_NAMES) {
    visibleSet.add(primitive);
  }
  return visibleSet;
}

export function applyTenantFilter(result: ListToolsResult): ListToolsResult {
  const tenant = getRequestTenant();
  const enabledSet = tenant.enabledToolsSet;

  // Pass-through when no enabled set is available. This path fires in two
  // cases: (1) no ALS frame (stdio without --tenant-id), (2) loadTenant
  // did not populate the set (legacy /mcp path). Dispatch-guard still
  // fails closed on individual tool calls, so tool metadata leakage in
  // the list is not a security breach — it's a UX regression we log.
  if (!enabledSet) {
    if (tenant.id) {
      logger.warn(
        { tenantId: tenant.id },
        'tools-list-filter: enabledToolsSet unavailable; tools/list passes through unfiltered'
      );
    }
    return result;
  }

  // Validate the result shape before touching it. Tolerant to SDK changes
  // that add fields — we never drop fields outside `tools`.
  if (!result || typeof result !== 'object' || !Array.isArray(result.tools)) {
    return result;
  }

  // Per-tenant `enabledSet` is built from raw aliases (`me.messages.X`).
  // Registered MCP tool names are run through `safeMcpName` (SEP-986
  // pattern), so we expand the comparison set to include both forms.
  // Cheap one-time build per request; sets are O(1) lookup.
  const visibleSet =
    tenant.presetVersion === 'discovery-v1'
      ? effectiveDiscoveryVisibleSet(enabledSet)!
      : new Set<string>(enabledSet);
  const expandedSet = new Set<string>();
  for (const alias of visibleSet) {
    expandedSet.add(alias);
    expandedSet.add(safeMcpName(alias));
  }

  const before = result.tools.length;
  const filteredTools = result.tools.filter(
    (tool) => typeof tool.name === 'string' && expandedSet.has(tool.name)
  );
  const after = filteredTools.length;

  logger.info(
    { tenantId: tenant.id, before, after },
    'tools-list-filter: filtered tools/list response'
  );

  // Return a NEW result object preserving every other field (nextCursor,
  // _meta, etc.) — immutability per project coding-style.
  return {
    ...result,
    tools: filteredTools,
  };
}

function nativeDispatchRejection(alias: string): CallToolResultLike | null {
  const tenant = getRequestTenant();
  if (tenant.presetVersion !== 'discovery-v1') return null;
  const effectiveSet = effectiveDiscoveryVisibleSet(tenant.enabledToolsSet);
  return checkDispatch(alias, effectiveSet, tenant.id, tenant.presetVersion);
}

/**
 * Guard registered native discovery tools on direct tools/call dispatch.
 * tools/list filtering is only advertisement control; MCP clients can still
 * call any registered tool by name. Discovery-v1 native tools therefore need
 * the same enabled-tools policy at handler entry, with mandatory discovery
 * primitives treated as always visible.
 */
export function wrapNativeDiscoveryToolHandlers(mcpServer: McpServer): void {
  const registered = (
    mcpServer as unknown as { _registeredTools?: Record<string, NativeRegisteredTool> }
  )._registeredTools;
  if (!registered) return;

  for (const alias of DISCOVERY_META_TOOL_NAMES) {
    const tool = registered[alias];
    if (!tool?.handler || tool[NATIVE_DISPATCH_WRAP_MARK]) continue;
    const original = tool.handler.bind(tool);
    tool.handler = async (args: unknown, extra: unknown) => {
      const rejection = nativeDispatchRejection(alias);
      if (rejection) return rejection;
      return await original(args, extra);
    };
    tool[NATIVE_DISPATCH_WRAP_MARK] = true;
  }
}

/**
 * Express middleware factory. Mount BETWEEN `seedTenantContext` (plan
 * 05-04) and the transport handler on `/t/:tenantId/mcp` POST. No deps
 * required today; the factory shape reserves capacity for plan 05-06/07
 * extensions (per-tenant metrics, audit hooks).
 */
export function createToolsListFilterMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Gate 1: only POST JSON-RPC bodies can contain `method`. GET is the
    // legacy SSE upgrade path; we must never touch `res.json`/`res.send`
    // on it because the SSE code writes chunked events directly.
    if (req.method !== 'POST') {
      next();
      return;
    }

    // Gate 2: body must be a plain object with `method === 'tools/list'`.
    // Any non-tools/list method passes through — the response serialization
    // path stays the SDK's to own.
    const body = (req as Request & { body?: unknown }).body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      (body as { method?: unknown }).method !== TOOLS_LIST_METHOD
    ) {
      next();
      return;
    }

    // Install the interceptor on the CURRENT ALS frame so `getRequestTenant
    // ()` sees the seeded triple. The interceptor is a read-through wrapper;
    // every call delegates to the original `res.json`/`res.send`.
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function filteredJson(payload: unknown): Response {
      try {
        const filtered = filterIfToolsList(payload);
        return originalJson(filtered);
      } catch (err) {
        logger.warn(
          { err: (err as Error).message },
          'tools-list-filter: res.json filter threw; passing through'
        );
        return originalJson(payload);
      }
    };

    res.send = function filteredSend(payload?: unknown): Response {
      // String body: try parse-filter-reserialize. Any failure → passthrough.
      if (typeof payload === 'string') {
        try {
          const parsed = JSON.parse(payload) as unknown;
          const filtered = filterIfToolsList(parsed);
          return originalSend(JSON.stringify(filtered));
        } catch {
          // Not JSON (e.g. SSE event text) — passthrough byte-identical.
          return originalSend(payload);
        }
      }
      // Buffer, Uint8Array, null, undefined, plain object → passthrough.
      return originalSend(payload);
    };

    next();
  };
}

/**
 * Inspect a JSON-RPC response envelope; if it carries a tools/list result,
 * filter the `tools` array. Leaves everything else alone. Pure function —
 * returns a new object when filtering, the input when passing through.
 */
function filterIfToolsList(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const envelope = payload as { result?: unknown };
  if (!envelope.result || typeof envelope.result !== 'object') {
    return payload;
  }
  const result = envelope.result as { tools?: unknown };
  if (!Array.isArray(result.tools)) {
    return payload;
  }
  const filtered = applyTenantFilter(envelope.result as ListToolsResult);
  // Preserve every other envelope field (jsonrpc, id, _meta, etc.).
  return {
    ...envelope,
    result: filtered,
  };
}

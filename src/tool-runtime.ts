import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import { getRequestContext } from './request-context.js';
import type { PolicyChecker } from './policy/index.js';
import {
  ALL_TOOLS,
  ODATA_PARAM_NAMES,
  utilityTools,
  type Tool,
  type ToolParam,
  type UtilityTool,
  type UtilityToolContext,
  type CallToolResult,
} from './tools/index.js';
import { toolCallLog, redactArgs, redactResponse } from './admin/tool-call-log.js';
import { ToolRefusal } from './tools/types.js';
import { MINIMAL_SELECT } from './tools/projections.js';
import { resolveEnabledToolsets, isToolEnabled, type ToolsetSelection } from './toolset-config.js';
import { getCloudEndpoints } from './cloud-config.js';
import { encodePathValue } from './tools/graph-path.js';
import { signCursor, verifyCursor, resolveTrustedNextLink } from './tools/contacts-cursor.js';
import { resolveAuthScopes } from './oauth/scopes.js';

/** Hard cap on Graph `$top` for list requests, configurable via env. */
function maxTopFromEnv(): number | undefined {
  const raw = process.env.MS365_MCP_MAX_TOP;
  if (raw === undefined || raw === '') return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    logger.warn(
      `Ignoring invalid MS365_MCP_MAX_TOP=${JSON.stringify(raw)} (use a positive integer)`
    );
    return undefined;
  }
  return n;
}

function clampTopQueryParam(queryParams: Record<string, string>): void {
  const cap = maxTopFromEnv();
  if (cap === undefined || queryParams['$top'] === undefined) return;
  const requested = Number.parseInt(queryParams['$top'], 10);
  if (!Number.isFinite(requested) || requested <= cap) return;
  logger.info(`Clamping $top from ${requested} to ${cap} (MS365_MCP_MAX_TOP)`);
  queryParams['$top'] = String(cap);
}

/** Positive-integer env override with a fallback, shared by the default-$top and response-ceiling knobs. */
function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    logger.warn(`Ignoring invalid ${name}=${JSON.stringify(raw)} (use a positive integer)`);
    return fallback;
  }
  return n;
}

/** Default page size injected for list GETs when the caller omits `$top`. */
function defaultTop(): number {
  return positiveIntFromEnv('MS365_MCP_DEFAULT_TOP', 15);
}

/**
 * Hard char ceiling for a single tool response. ~4 chars/token, so the default
 * ~100k chars approximates Claude Code's ~25k-token tool-response cap. A list
 * response over the ceiling is truncated at an element boundary and wrapped in
 * a marked envelope (see {@link shapeResponseSize}).
 */
function maxResponseChars(): number {
  return positiveIntFromEnv('MS365_MCP_MAX_RESPONSE_CHARS', 100_000);
}

/** A list tool exposes the OData `top` param; by-id reads do not. Used to gate default `$top`. */
function isListTool(tool: Tool): boolean {
  return tool.method === 'GET' && tool.params.some((p) => p.name === 'top');
}

/**
 * Enforce the response-size ceiling on a JSON list payload. Only collections
 * (`{ value: [...] }`) are reshaped — non-collection and non-JSON (binary)
 * responses are returned untouched. When over budget, items are dropped from
 * the end (halving) until the serialized envelope fits, and the result is
 * wrapped as `{ value, truncated, returnedCount, totalCount, hint }` — keeping
 * the Graph `value` key so callers/`fetchAllPages` shapes still match.
 *
 * The hint steers the model to NARROW the request (filter/search/top/select or a
 * tighter scope) rather than paginate: there is deliberately no continuation
 * cursor here. No tool using this generic path consumes one, and after a
 * `fetchAllPages` merge the `@odata.nextLink` is already gone — and even when
 * present it points *past* the dropped tail, so a cursor would skip the very
 * items that were truncated. Narrowing is the only correct continuation for
 * tools on this path. (Tools with {@link Tool.cursorPagination} — contact-list,
 * contact-folder-list — skip this function entirely and use
 * {@link shapeCursorResponse} instead, which DOES issue a safe, bound cursor.)
 *
 * Note: this runs on the already-serialized JSON text, mirroring the
 * `fetchAllPages` merge which also assumes JSON. In TOON output mode the text
 * is not JSON, so it is returned untouched — default `$top` + projection bound
 * those payloads instead.
 */
function shapeResponseSize(text: string): string {
  const cap = maxResponseChars();
  if (text.length <= cap) return text;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  const items = parsed['value'];
  if (!Array.isArray(items)) return text;

  let kept = items.length;
  let envelope: Record<string, unknown> = parsed;
  while (kept > 0) {
    envelope = {
      value: items.slice(0, kept),
      truncated: true,
      returnedCount: kept,
      totalCount: items.length,
      hint:
        `Response truncated to ${kept} of ${items.length} items to fit the context budget. ` +
        'Narrow the request ($filter/$search/$top/$select, or a tighter date/folder scope) to see the rest — there is no continuation cursor.',
    };
    const size = JSON.stringify(envelope).length;
    if (size <= cap || kept === 1) {
      if (kept === 1 && size > cap) {
        logger.warn(
          `Single item still exceeds the response-size ceiling (${size} > ${cap} chars); returning it anyway.`
        );
      }
      break;
    }
    kept = Math.floor(kept / 2);
  }
  logger.info(
    `Truncated list response from ${items.length} to ${kept} items (response-size ceiling)`
  );
  return JSON.stringify(envelope);
}

/**
 * Response shaping for list tools that opt into safe, server-issued cursor
 * pagination ({@link Tool.cursorPagination} — contact-list,
 * contact-folder-list) instead of the generic narrow-only truncation
 * envelope ({@link shapeResponseSize}). See `executeCursorPaginatedTool`
 * below for the request side and `src/tools/contacts-cursor.ts` for the
 * cursor format/binding rules.
 *
 * Operates on the RAW Graph object (from `graphClient.makeRequest`), not
 * pre-serialized text, and serializes each candidate envelope through
 * `graphClient.formatJsonResponse` — so the response-size ceiling is
 * enforced against the ACTUAL serialized envelope in whichever output
 * format is configured (JSON or TOON), never a JSON.stringify proxy that
 * would be meaningless once TOON-encoded.
 *
 * Contract: every response reports `hasMore` and, when true, a `cursor` —
 * an opaque, signed token the caller echoes back verbatim to continue.
 * `hasMore`/`cursor` are derived from Graph's own `@odata.nextLink`
 * (validated against the configured endpoint/API version/collection path,
 * never blindly trusted) and from how many rows of THIS already-fetched
 * page are still pending — never from arithmetic on a returned-item count,
 * so an empty Graph page that still carries a `nextLink` correctly reports
 * `hasMore: true` and a cursor that advances, per Graph's documented paging
 * contract (https://learn.microsoft.com/en-us/graph/paging): zero-result
 * pages are legal and must not be treated as exhaustion. A byte-budget
 * truncation withholds some of the pending rows and points the cursor at
 * REPLAYING this exact already-issued Graph request with an advanced local
 * offset — never at a reconstructed Graph-side skip.
 *
 * This is best-effort continuation, NOT a stable snapshot: Graph does not
 * offer a consistency token for contacts. The withheld-tail replay re-issues
 * the identical query; if the mailbox changes between the original fetch
 * and that replay (a contact added, deleted, or reordered), the replayed
 * page can differ from the original, and a row could occasionally be
 * skipped or duplicated — the same limitation any offset-based Graph paging
 * has under concurrent mutation. If even a single item cannot fit the
 * budget, this returns an error rather than ever returning a lossy partial
 * item or looping forever.
 */
function shapeCursorResponse(
  tool: Tool,
  graphClient: GraphClient,
  raw: unknown,
  excludeResponse: boolean,
  opts: {
    collectionPath: string;
    userKey: string;
    graphApiBase: string;
    cap: number;
    /** The exact path+query THIS Graph request itself used — stored verbatim in a withheldTail cursor so it can be replayed. */
    requestedPath: string;
    /** Items already delivered to the caller from this same fetched page in a prior withheldTail redemption (0 for a fresh/nextPage fetch). */
    offset: number;
    /** Set only when redeeming a withheldTail cursor: where to resume once this page's tail is exhausted. */
    thenResumePath?: string;
  }
): CallToolResult {
  if (excludeResponse) {
    return asCallToolResult(graphClient.formatJsonResponse(raw, false, true));
  }

  const malformedShapeError = (): CallToolResult => {
    logger.error(
      `${tool.name}: Graph response did not have the expected { value: [...] } collection shape; refusing`
    );
    return cursorErrorResult(
      tool,
      "Graph's response did not have the expected collection shape ({ value: [...] }). Refusing rather than " +
        'returning a malformed result.'
    );
  };
  // contact-list/contact-folder-list always return a Graph collection
  // ({ value: [...] }). A different shape here is unexpected upstream
  // behavior, not a legitimate response to shape — refuse rather than
  // returning a malformed "success" the caller can't distinguish from a
  // real (possibly empty) page.
  if (!isPlainRecord(raw)) return malformedShapeError();
  if (!Array.isArray(raw['value'])) return malformedShapeError();
  const rawItems = raw['value'];
  const pending = rawItems.slice(opts.offset);

  let graphNextResumePath: string | null;
  const nextLink = raw['@odata.nextLink'];
  if (nextLink != null && typeof nextLink !== 'string') {
    return cursorErrorResult(
      tool,
      'Graph returned malformed continuation metadata; refusing to report exhaustion.'
    );
  }
  if (typeof nextLink === 'string') {
    const resolved = resolveTrustedNextLink(nextLink, opts.graphApiBase, opts.collectionPath);
    if (resolved === null) {
      logger.error(
        `${tool.name}: @odata.nextLink did not match the expected Graph endpoint/API version/collection; refusing to follow or drop it`
      );
      return cursorErrorResult(
        tool,
        "This page's continuation link did not match the expected Graph endpoint, API version, or collection; " +
          'refusing rather than silently dropping pagination state or following an unexpected resource. Retry.'
      );
    }
    graphNextResumePath = resolved;
  } else {
    graphNextResumePath = opts.thenResumePath ?? null;
  }

  // Preserve any other top-level sibling metadata (e.g. `_etag` from
  // includeHeaders) that isn't the collection itself or its raw continuation
  // link — only `value` and `@odata.nextLink` are ours to manage.
  const rest = { ...raw };
  delete rest.value;
  delete rest['@odata.nextLink'];

  const buildEnvelope = (
    items: unknown[],
    truncated: boolean,
    cursor: string | undefined,
    hint: string | undefined
  ): Record<string, unknown> => {
    const envelope: Record<string, unknown> = {
      ...rest,
      value: items,
      returnedCount: items.length,
    };
    if (truncated) envelope.truncated = true;
    envelope.hasMore = truncated ? true : graphNextResumePath !== null;
    if (cursor !== undefined) envelope.cursor = cursor;
    if (hint !== undefined) envelope.hint = hint;
    return envelope;
  };
  const mintNextPage = (): string | undefined =>
    graphNextResumePath === null
      ? undefined
      : signCursor({
          v: 1,
          tool: tool.name,
          collectionPath: opts.collectionPath,
          userKey: opts.userKey,
          kind: 'nextPage',
          resumePath: graphNextResumePath,
        });
  const mintWithheldTail = (consumed: number): string =>
    signCursor({
      v: 1,
      tool: tool.name,
      collectionPath: opts.collectionPath,
      userKey: opts.userKey,
      kind: 'withheldTail',
      pagePath: opts.requestedPath,
      offset: opts.offset + consumed,
      thenResumePath: graphNextResumePath ?? undefined,
    });

  const fullEnvelope = buildEnvelope(pending, false, mintNextPage(), undefined);
  let formatted = graphClient.formatJsonResponse(fullEnvelope, false, false);
  if (formatted.content[0].text.length <= opts.cap) {
    return asCallToolResult(formatted);
  }

  let kept = pending.length;
  while (kept > 0) {
    const slice = pending.slice(0, kept);
    const envelope = buildEnvelope(
      slice,
      true,
      mintWithheldTail(slice.length),
      `Response truncated to ${slice.length} of ${pending.length} remaining fetched items to fit the context ` +
        'budget. Pass the cursor back to continue.'
    );
    formatted = graphClient.formatJsonResponse(envelope, false, false);
    if (formatted.content[0].text.length <= opts.cap) {
      return asCallToolResult(formatted);
    }
    kept = Math.floor(kept / 2);
  }

  // Even zero items didn't fit above when kept reached 0 — distinguish the
  // fixed cursor/hint/metadata overhead alone being too big (an operator
  // config issue: raise the ceiling) from a single oversized item (a data
  // issue: narrow $select), rather than reporting one generic message for
  // both ("diagnose, don't mask").
  const overheadEnvelope = buildEnvelope([], true, mintWithheldTail(0), 'x');
  const overheadFormatted = graphClient.formatJsonResponse(overheadEnvelope, false, false);
  if (overheadFormatted.content[0].text.length > opts.cap) {
    logger.error(
      `${tool.name}: the response-size ceiling (${opts.cap} chars) is too small to fit this tool's continuation cursor/metadata alone (${overheadFormatted.content[0].text.length} chars)`
    );
    return cursorErrorResult(
      tool,
      `the response-size ceiling (${opts.cap} chars) is too small to fit this tool's continuation cursor and ` +
        `metadata (~${overheadFormatted.content[0].text.length} chars) even with zero items. Raise ` +
        'MS365_MCP_MAX_RESPONSE_CHARS.'
    );
  }
  logger.error(
    `${tool.name}: a single item exceeds the response-size ceiling (${opts.cap} chars) and cannot be safely paginated.`
  );
  return cursorErrorResult(
    tool,
    'A single item exceeds the response-size ceiling and cannot be safely paginated. Narrow the request with ' +
      '$select to return fewer fields, or raise MS365_MCP_MAX_RESPONSE_CHARS.'
  );
}

function asCallToolResult(formatted: {
  content: { type: string; text: string }[];
  _meta?: Record<string, unknown>;
  isError?: boolean;
}): CallToolResult {
  return {
    content: formatted.content.map((item) => ({ type: 'text' as const, text: item.text })),
    _meta: formatted._meta,
    isError: formatted.isError,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cursorErrorResult(tool: Tool, message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: `${tool.name}: ${message}` }) }],
    isError: true,
  };
}

/**
 * Dedicated request/response flow for tools that opt into opaque,
 * server-issued cursor pagination ({@link Tool.cursorPagination} —
 * contact-list, contact-folder-list), entirely separate from the generic
 * flow below. GET-only, query-param-only, no body — the narrow subset these
 * tools need.
 *
 * Two request shapes:
 *  - Fresh page (`params.cursor` absent): resolve the path/query from
 *    `params` normally (pathResolver + declared query params + the usual
 *    default projection/page-size + the `MS365_MCP_MAX_TOP` clamp), call
 *    Graph via `graphClient.makeRequest` (the raw object, not pre-serialized
 *    text), then shape the response ({@link shapeCursorResponse}).
 *  - Resume (`params.cursor` present): verify the cursor was signed by this
 *    server and matches this exact tool + collection + caller, then replay
 *    its stored Graph path+query VERBATIM — never re-applying
 *    defaults/clamp, which would mutate an already-authoritative
 *    continuation query.
 *
 * `makeRequest` throws on a Graph-side failure (unlike `graphRequest`, which
 * catches and wraps); that throw is intentionally NOT caught here — it
 * propagates to `executeTool`'s existing catch-all, the same error path
 * every other tool already uses.
 */
async function executeCursorPaginatedTool(
  tool: Tool,
  graphClient: GraphClient,
  params: Record<string, unknown>,
  ctx: { upn: string | null; userOid?: string; startedAt: number }
): Promise<CallToolResult> {
  const userKey = ctx.userOid ?? ctx.upn ?? 'anonymous';

  const finish = (result: CallToolResult): CallToolResult => {
    toolCallLog.record({
      id: crypto.randomUUID(),
      ts: ctx.startedAt,
      upn: ctx.upn,
      toolName: tool.name,
      status: result.isError ? 'graph_error' : 'allowed',
      latencyMs: Date.now() - ctx.startedAt,
      argsExcerpt: redactArgs(params),
      responseExcerpt: result.isError ? null : redactResponse(result.content[0]?.text ?? null),
      errorText: result.isError ? redactResponse(result.content[0]?.text ?? null) : null,
    });
    return result;
  };

  if (params.fetchAllPages === true) {
    logger.warn(`fetchAllPages requested for ${tool.name}, which uses cursor pagination; refusing`);
    return finish(
      cursorErrorResult(
        tool,
        'fetchAllPages is not supported. Read cursor from this response and pass it back to continue; stop once ' +
          'hasMore is false. This paged continuation tracks the response-size ceiling correctly, which a ' +
          'merged multi-page export (which can itself hit that ceiling with no cursor) cannot.'
      )
    );
  }

  // Pure string computation (no Graph call) — also where contact-id/
  // folder-id/parent-folder-id safety validation happens (throws propagate
  // to executeTool's catch-all, same as any other path-resolver error).
  const collectionPath = tool.pathResolver ? tool.pathResolver(params) : tool.path;

  const headers: Record<string, string> = {};
  if (tool.requestHeaders) Object.assign(headers, tool.requestHeaders);
  const requestOptions: {
    method: string;
    headers: Record<string, string>;
    includeHeaders?: boolean;
  } = {
    method: 'GET',
    headers,
  };
  if (params.includeHeaders === true) requestOptions.includeHeaders = true;
  const excludeResponse = params.excludeResponse === true;

  const cap = maxResponseChars();
  const graphApiBase = getCloudEndpoints().graphApi;

  if (params.cursor !== undefined) {
    const decoded =
      typeof params.cursor === 'string' && params.cursor.length > 0
        ? verifyCursor(params.cursor, { tool: tool.name, collectionPath, userKey })
        : null;
    if (!decoded) {
      logger.warn(
        `${tool.name}: rejected cursor (invalid signature, shape, or tool/collection/caller mismatch)`
      );
      return finish(
        cursorErrorResult(
          tool,
          'this cursor is invalid, expired, or was not issued for this exact call (same folder scope, same ' +
            'caller). Omit cursor to start over from the beginning.'
        )
      );
    }

    const resumePath = decoded.kind === 'nextPage' ? decoded.resumePath : decoded.pagePath;
    logger.info(
      `Making graph request to ${resumePath} (cursor resume, ${decoded.kind}) with options: ${JSON.stringify(requestOptions)}`
    );
    const raw = await graphClient.makeRequest(resumePath, requestOptions);
    return finish(
      shapeCursorResponse(tool, graphClient, raw, excludeResponse, {
        collectionPath,
        userKey,
        graphApiBase,
        cap,
        requestedPath: resumePath,
        offset: decoded.kind === 'withheldTail' ? decoded.offset : 0,
        thenResumePath: decoded.kind === 'withheldTail' ? decoded.thenResumePath : undefined,
      })
    );
  }

  // Fresh first page.
  let path = collectionPath;
  const queryParams: Record<string, string> = {};
  const paramByName = new Map<string, ToolParam>();
  for (const p of tool.params) paramByName.set(p.name, p);
  for (const [paramName, paramValue] of Object.entries(params)) {
    if (CONTROL_PARAM_NAMES.has(paramName)) continue;
    if (tool.resolverParams?.includes(paramName)) continue;
    const def = paramByName.get(paramName);
    if (!def || def.location !== 'query') continue;
    if (paramValue === '' || paramValue == null) continue;
    queryParams[odataQueryKey(paramName)] = String(paramValue);
  }
  applyResponseDefaults(tool, queryParams, params);
  clampTopQueryParam(queryParams);
  if (Object.keys(queryParams).length > 0) {
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/gi, ',')}`)
      .join('&');
    path = `${path}?${queryString}`;
  }

  logger.info(`Making graph request to ${path} with options: ${JSON.stringify(requestOptions)}`);
  const raw = await graphClient.makeRequest(path, requestOptions);
  return finish(
    shapeCursorResponse(tool, graphClient, raw, excludeResponse, {
      collectionPath,
      userKey,
      graphApiBase,
      cap,
      requestedPath: path,
      offset: 0,
    })
  );
}

/**
 * Inject the default field projection and page size for read tools when the
 * caller omitted them. Projection is skipped when `response_format: 'detailed'`.
 */
function applyResponseDefaults(
  tool: Tool,
  queryParams: Record<string, string>,
  params: Record<string, unknown>
): void {
  const wantsDetailed = params.response_format === 'detailed';
  if (
    tool.projection &&
    tool.method === 'GET' &&
    !wantsDetailed &&
    queryParams['$select'] === undefined
  ) {
    queryParams['$select'] = MINIMAL_SELECT[tool.projection];
  }
  if (isListTool(tool) && queryParams['$top'] === undefined && params.fetchAllPages !== true) {
    queryParams['$top'] = String(defaultTop());
  }
}

/** Returns the Graph URL form (`$top`, `$filter`, ...) of an OData query param name. */
function odataQueryKey(rawName: string): string {
  const lower = rawName.toLowerCase();
  return ODATA_PARAM_NAMES.has(lower) ? `$${lower}` : rawName;
}

const CONTROL_PARAM_NAMES = new Set([
  'fetchAllPages',
  'includeHeaders',
  'excludeResponse',
  'timezone',
  'expandExtendedProperties',
  'response_format',
  'cursor',
]);

function policyDeniedResult(tool: Tool, upn: string | null): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: `Policy denied tool '${tool.name}' for user '${upn ?? 'unknown'}'.`,
          tip: 'Update policy.yaml or contact the operator to enable this tool for this user.',
        }),
      },
    ],
    isError: true,
  };
}

function preconditionFailedResult(tool: Tool, message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: `Server-side precondition failed for tool '${tool.name}': ${message}`,
          tip: 'This invariant is enforced in the MCP server runtime, not by tool description or policy. Adjust the tool call to satisfy it.',
        }),
      },
    ],
    isError: true,
  };
}

async function executeTool(
  tool: Tool,
  graphClient: GraphClient,
  params: Record<string, unknown>,
  policy?: PolicyChecker
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const ctx = getRequestContext();
  const upn = ctx?.userPrincipalName ?? null;
  // Long strings (base64 file content, message bodies) are summarized, not logged.
  logger.info(
    `Tool ${tool.name} called with params: ${JSON.stringify(params, (_k, v) =>
      typeof v === 'string' && v.length > 200 ? `[${v.length} chars]` : v
    )}`
  );

  if (policy && !policy.check({ userPrincipalName: upn, toolName: tool.name })) {
    logger.warn(
      `Policy denied tool ${tool.name} for ${upn ?? 'anonymous'} (oid=${ctx?.userOid ?? 'n/a'})`
    );
    toolCallLog.record({
      id: crypto.randomUUID(),
      ts: startedAt,
      upn,
      toolName: tool.name,
      status: 'denied_by_policy',
      latencyMs: Date.now() - startedAt,
      argsExcerpt: redactArgs(params),
      responseExcerpt: null,
      errorText: `Policy denied tool '${tool.name}' for user '${upn ?? 'unknown'}'.`,
    });
    return policyDeniedResult(tool, upn);
  }

  // Server-side guards run AFTER policy and BEFORE any outbound Graph call.
  // Throw from the precondition to refuse — tool descriptions are not
  // load-bearing for security; the runtime enforces invariants in code.
  if (tool.precondition) {
    try {
      await tool.precondition(graphClient, params, { policy, userPrincipalName: upn });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Precondition refused tool ${tool.name} for ${upn ?? 'anonymous'}: ${message}`);
      toolCallLog.record({
        id: crypto.randomUUID(),
        ts: startedAt,
        upn,
        toolName: tool.name,
        status: 'precondition_failed',
        latencyMs: Date.now() - startedAt,
        argsExcerpt: redactArgs(params),
        responseExcerpt: null,
        errorText: message,
      });
      return preconditionFailedResult(tool, message);
    }
  }

  try {
    if (tool.cursorPagination) {
      return await executeCursorPaginatedTool(tool, graphClient, params, {
        upn,
        userOid: ctx?.userOid,
        startedAt,
      });
    }

    if (tool.execute) {
      const raw = await tool.execute(graphClient, params, {
        policy,
        userPrincipalName: upn,
        userOid: ctx?.userOid,
      });
      const result = asCallToolResult(graphClient.formatJsonResponse(raw));
      toolCallLog.record({
        id: crypto.randomUUID(),
        ts: startedAt,
        upn,
        toolName: tool.name,
        status: 'allowed',
        latencyMs: Date.now() - startedAt,
        argsExcerpt: redactArgs(params),
        responseExcerpt: redactResponse(result.content[0]?.text ?? null),
        errorText: null,
      });
      return result;
    }

    const paramByName = new Map<string, ToolParam>();
    for (const p of tool.params) paramByName.set(p.name, p);

    let path = tool.pathResolver ? tool.pathResolver(params) : tool.path;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};
    let body: unknown = null;

    // Apply the tool's hard-coded request headers first; any header passed
    // through a ToolParam (location: 'header') in the params loop below will
    // override these by overwriting the same key.
    if (tool.requestHeaders) {
      for (const [k, v] of Object.entries(tool.requestHeaders)) headers[k] = v;
    }

    for (const [paramName, paramValue] of Object.entries(params)) {
      if (CONTROL_PARAM_NAMES.has(paramName)) continue;
      // Params consumed by a pathResolver are already baked into the path —
      // skip them so they don't leak to the query string or the unknown-param
      // path-placeholder fallback below.
      if (tool.resolverParams?.includes(paramName)) continue;

      const def = paramByName.get(paramName);

      if (!def) {
        if (path.includes(`{${paramName}}`)) {
          path = path.replace(`{${paramName}}`, encodePathValue(String(paramValue)));
          logger.info(`Unknown param ${paramName} matched path placeholder; substituted anyway`);
        }
        continue;
      }

      switch (def.location) {
        case 'path': {
          const shouldSkip = tool.skipEncoding?.includes(paramName) ?? false;
          const encoded = shouldSkip ? String(paramValue) : encodePathValue(String(paramValue));
          path = path.replace(`{${paramName}}`, encoded);
          break;
        }
        case 'query': {
          if (paramValue === '' || paramValue == null) break;
          queryParams[odataQueryKey(paramName)] = String(paramValue);
          break;
        }
        case 'header': {
          headers[paramName] = String(paramValue);
          break;
        }
        case 'body': {
          body = paramValue;
          break;
        }
      }
    }

    // Invariant: every `{placeholder}` must have been substituted (by the param
    // loop or by a pathResolver). A leftover means a malformed resolver or a
    // missing path param — the Graph call would fail; surface it loudly.
    const unresolved = path.match(/\{[^}]+\}/);
    if (unresolved) {
      logger.warn(
        `Tool ${tool.name} left an unsubstituted path placeholder ${unresolved[0]} — the Graph call will likely fail.`
      );
    }

    applyResponseDefaults(tool, queryParams, params);
    clampTopQueryParam(queryParams);

    const preferValues: string[] = [];

    if (tool.supportsTimezone && typeof params.timezone === 'string' && params.timezone !== '') {
      preferValues.push(`outlook.timezone="${params.timezone}"`);
    }

    const bodyFormat = process.env.MS365_MCP_BODY_FORMAT || 'text';
    if (bodyFormat !== 'html' && tool.method === 'GET') {
      preferValues.push(`outlook.body-content-type="${bodyFormat}"`);
    }

    if (preferValues.length > 0) {
      headers['Prefer'] = preferValues.join(', ');
    }

    if (tool.supportsExpandExtendedProperties && params.expandExtendedProperties === true) {
      const expandValue = 'singleValueExtendedProperties';
      queryParams['$expand'] = queryParams['$expand']
        ? `${queryParams['$expand']},${expandValue}`
        : expandValue;
    }

    if (tool.contentType) {
      headers['Content-Type'] = tool.contentType;
    }
    if (tool.acceptType) {
      headers['Accept'] = tool.acceptType;
    }

    if (Object.keys(queryParams).length > 0) {
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/gi, ',')}`)
        .join('&');
      path = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
    }

    const requestOptions: {
      method: string;
      headers: Record<string, string>;
      body?: string | Buffer | Uint8Array;
      rawResponse?: boolean;
      includeHeaders?: boolean;
      excludeResponse?: boolean;
    } = {
      method: tool.method,
      headers,
    };

    if (tool.method !== 'GET' && body) {
      if (tool.contentType === 'text/html') {
        if (typeof body === 'string') {
          requestOptions.body = body;
        } else if (typeof body === 'object' && body !== null && 'content' in body) {
          requestOptions.body = (body as { content: string }).content;
        } else {
          requestOptions.body = String(body);
        }
      } else {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
    }

    if (tool.returnDownloadUrl && path.endsWith('/content')) {
      path = path.replace(/\/content$/, '');
    } else if (path.includes('/content') || path.endsWith('/$value')) {
      requestOptions.rawResponse = true;
    }

    if (params.includeHeaders === true) requestOptions.includeHeaders = true;
    if (params.excludeResponse === true) requestOptions.excludeResponse = true;

    logger.info(`Making graph request to ${path} with options: ${JSON.stringify(requestOptions)}`);

    // `shape` condenses the raw Graph object to what an agent needs for its
    // next call (shapes keep the common $expand results they know about). The
    // caller opts out by asking for specific fields ($select), the full object
    // (response_format: 'detailed'), headers, or extended properties.
    // makeRequest throws on Graph errors, landing in the catch below.
    const shape =
      tool.shape &&
      !requestOptions.rawResponse &&
      params.response_format !== 'detailed' &&
      params.includeHeaders !== true &&
      !params.select &&
      params.expandExtendedProperties !== true
        ? tool.shape
        : undefined;
    const send = async (p: string) =>
      shape
        ? graphClient.formatJsonResponse(
            shape(await graphClient.makeRequest(p, requestOptions)),
            false,
            requestOptions.excludeResponse
          )
        : graphClient.graphRequest(p, requestOptions);
    const response = await send(path);

    const fetchAllPages = params.fetchAllPages === true;
    if (fetchAllPages && response?.content?.[0]?.text) {
      // The page merge below parses and re-serializes JSON. In TOON output mode
      // the response text is not JSON, so merging is impossible — refuse rather
      // than silently return only the first page (a data-completeness failure
      // that would let the model believe it has the full result set). See #19.
      if (graphClient.format === 'toon') {
        logger.error(`fetchAllPages requested in TOON output mode for ${tool.name}; refusing`);
        response.content[0].text = JSON.stringify({
          error:
            'fetchAllPages is not supported in TOON output mode: pages cannot be merged. ' +
            'Re-run the server in JSON output format (omit --toon / unset MS365_MCP_OUTPUT_FORMAT) ' +
            'to use fetchAllPages, or narrow the request with filter/search/top.',
        });
        response.isError = true;
      } else {
        try {
          const combined = JSON.parse(response.content[0].text);
          let allItems = combined.value || [];
          let nextLink = combined['@odata.nextLink'];
          let pageCount = 1;
          const maxPages = 100;
          const maxItems = 10_000;

          while (nextLink && pageCount < maxPages && allItems.length < maxItems) {
            logger.info(`Fetching page ${pageCount + 1} from: ${nextLink}`);
            const url = new URL(nextLink);
            const nextPath = url.pathname.replace('/v1.0', '') + url.search;
            const nextResponse = await send(nextPath);
            if (nextResponse?.content?.[0]?.text) {
              const next = JSON.parse(nextResponse.content[0].text);
              if (Array.isArray(next.value)) allItems = allItems.concat(next.value);
              nextLink = next['@odata.nextLink'];
              pageCount++;
            } else {
              break;
            }
          }

          if (pageCount >= maxPages) {
            logger.warn(`Reached maximum page limit (${maxPages}) for pagination`);
          }
          if (allItems.length >= maxItems) {
            logger.warn(
              `Reached maximum item limit (${maxItems}) for pagination — truncated at ${allItems.length} items`
            );
          }

          combined.value = allItems;
          if (combined['@odata.count']) combined['@odata.count'] = allItems.length;
          delete combined['@odata.nextLink'];

          response.content[0].text = JSON.stringify(combined);
          logger.info(
            `Pagination complete: collected ${allItems.length} items across ${pageCount} pages`
          );
        } catch (e) {
          // A parse/merge failure here means we cannot guarantee a complete
          // result set. Surface it as an error rather than falling through and
          // returning the (possibly partial) first page as a silent success. See #19.
          logger.error(`Error during pagination: ${e}`);
          response.content[0].text = JSON.stringify({
            error:
              `fetchAllPages failed to merge all pages for ${tool.name}: ${e}. ` +
              'The result is incomplete; do not treat it as the full set. ' +
              'Retry, or narrow the request with filter/search/top.',
          });
          response.isError = true;
        }
      }
    }

    // Enforce the response-size ceiling on JSON list payloads (binary/download
    // responses use rawResponse and are exempt). Runs after the fetchAllPages
    // merge so it bounds the merged result too. Tools with cursorPagination
    // never reach this flow — they return early via executeCursorPaginatedTool.
    if (!requestOptions.rawResponse && response?.content?.[0]?.text) {
      response.content[0].text = shapeResponseSize(response.content[0].text);
    }

    const result: CallToolResult = {
      content: response.content.map((item) => ({ type: 'text' as const, text: item.text })),
      _meta: response._meta,
      isError: response.isError,
    };
    const responseText = response.content[0]?.text ?? null;
    if (result.isError) {
      toolCallLog.record({
        id: crypto.randomUUID(),
        ts: startedAt,
        upn,
        toolName: tool.name,
        status: 'graph_error',
        latencyMs: Date.now() - startedAt,
        argsExcerpt: redactArgs(params),
        responseExcerpt: null,
        errorText: redactResponse(responseText),
      });
    } else {
      toolCallLog.record({
        id: crypto.randomUUID(),
        ts: startedAt,
        upn,
        toolName: tool.name,
        status: 'allowed',
        latencyMs: Date.now() - startedAt,
        argsExcerpt: redactArgs(params),
        responseExcerpt: redactResponse(responseText),
        errorText: null,
      });
    }
    return result;
  } catch (error) {
    const message = (error as Error).message;
    // A guard inside `execute` refused before writing: same outcome and audit
    // status as a Tool.precondition refusal.
    if (error instanceof ToolRefusal) {
      logger.warn(`Tool ${tool.name} refused for ${upn ?? 'anonymous'}: ${message}`);
      toolCallLog.record({
        id: crypto.randomUUID(),
        ts: startedAt,
        upn,
        toolName: tool.name,
        status: 'precondition_failed',
        latencyMs: Date.now() - startedAt,
        argsExcerpt: redactArgs(params),
        responseExcerpt: null,
        errorText: message,
      });
      return preconditionFailedResult(tool, message);
    }
    logger.error(`Error in tool ${tool.name}: ${message}`);
    toolCallLog.record({
      id: crypto.randomUUID(),
      ts: startedAt,
      upn,
      toolName: tool.name,
      status: 'graph_error',
      latencyMs: Date.now() - startedAt,
      argsExcerpt: redactArgs(params),
      responseExcerpt: null,
      errorText: redactResponse(message),
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Error in tool ${tool.name}: ${message}`,
          }),
        },
      ],
      isError: true,
    };
  }
}

function buildMcpParamSchema(tool: Tool): Record<string, z.ZodTypeAny> {
  const paramSchema: Record<string, z.ZodTypeAny> = {};
  for (const p of tool.params) paramSchema[p.name] = p.schema;

  if (tool.method === 'GET' && !tool.cursorPagination) {
    paramSchema['fetchAllPages'] = z
      .boolean()
      .describe(
        'Follow @odata.nextLink and merge up to 100 pages into one response. ' +
          'Can return enormous payloads — only when the user explicitly needs a full export. ' +
          'Prefer a small top first, then paginate or narrow with filter/search.'
      )
      .optional();
  }

  if (tool.cursorPagination) {
    paramSchema['cursor'] = z
      .string()
      .min(1)
      .describe(
        "Opaque continuation token from a previous call's response (its `cursor` field, present whenever " +
          'hasMore was true). Pass it back verbatim to fetch the next page; omit to start from the beginning. ' +
          'Other paging/filter params are ignored once a cursor is supplied — the cursor already pins the ' +
          'original query.'
      )
      .optional();
  }

  if (tool.projection || tool.shape) {
    paramSchema['response_format'] = z
      .enum(['minimal', 'detailed'])
      .describe(
        "Field detail. 'minimal' (default) returns a compact, high-signal field set; " +
          "'detailed' returns the full Graph object (more tokens, raw ids). Omit for minimal. " +
          'Not a confidentiality boundary — any caller allowed on this tool may request detailed.'
      )
      .optional();
  }

  paramSchema['includeHeaders'] = z
    .boolean()
    .describe('Include response headers (including ETag) in the response metadata')
    .optional();

  paramSchema['excludeResponse'] = z
    .boolean()
    .describe('Exclude the full response body and only return success or failure indication')
    .optional();

  if (tool.supportsTimezone) {
    paramSchema['timezone'] = z
      .string()
      .describe(
        'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo") for calendar event times. If not specified, times are returned in UTC.'
      )
      .optional();
  }

  if (tool.supportsExpandExtendedProperties) {
    paramSchema['expandExtendedProperties'] = z
      .boolean()
      .describe(
        'When true, expands singleValueExtendedProperties on each event. Use this to retrieve custom extended properties (e.g., sync metadata) stored on calendar events.'
      )
      .optional();
  }

  return paramSchema;
}

function registerUtilityToolWithMcp(
  server: McpServer,
  utility: UtilityTool,
  ctx: UtilityToolContext,
  policy?: PolicyChecker
): void {
  server.tool(
    utility.name,
    utility.description,
    utility.buildSchema(ctx),
    {
      title: utility.name,
      readOnlyHint: utility.readOnlyHint ?? true,
      openWorldHint: utility.openWorldHint ?? true,
    },
    async (params) => {
      const utilStartedAt = Date.now();
      const reqCtx = getRequestContext();
      const utilUpn = reqCtx?.userPrincipalName ?? null;

      if (policy) {
        if (
          !policy.check({
            userPrincipalName: utilUpn,
            toolName: utility.name,
          })
        ) {
          toolCallLog.record({
            id: crypto.randomUUID(),
            ts: utilStartedAt,
            upn: utilUpn,
            toolName: utility.name,
            status: 'denied_by_policy',
            latencyMs: Date.now() - utilStartedAt,
            argsExcerpt: redactArgs(params),
            responseExcerpt: null,
            errorText: `Policy denied tool '${utility.name}' for user '${utilUpn ?? 'unknown'}'.`,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Policy denied tool '${utility.name}' for user '${utilUpn ?? 'unknown'}'.`,
                }),
              },
            ],
            isError: true,
          };
        }
      }

      try {
        const utilResult = await utility.execute(params, ctx);
        const utilText =
          (utilResult as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? null;
        const isErr = (utilResult as { isError?: boolean }).isError === true;
        toolCallLog.record({
          id: crypto.randomUUID(),
          ts: utilStartedAt,
          upn: utilUpn,
          toolName: utility.name,
          status: isErr ? 'graph_error' : 'allowed',
          latencyMs: Date.now() - utilStartedAt,
          argsExcerpt: redactArgs(params),
          responseExcerpt: isErr ? null : redactResponse(utilText),
          errorText: isErr ? redactResponse(utilText) : null,
        });
        return utilResult;
      } catch (utilErr) {
        const utilMsg = (utilErr as Error).message;
        toolCallLog.record({
          id: crypto.randomUUID(),
          ts: utilStartedAt,
          upn: utilUpn,
          toolName: utility.name,
          status: 'graph_error',
          latencyMs: Date.now() - utilStartedAt,
          argsExcerpt: redactArgs(params),
          responseExcerpt: null,
          errorText: redactResponse(utilMsg),
        });
        throw utilErr;
      }
    }
  );
}

export interface RegisterToolsOptions {
  policy?: PolicyChecker;
  /**
   * Which toolsets to register. Defaults to the `MS365_MCP_TOOLSETS` env value
   * (unset = core only). Pass `'all'` to register everything (used by tests).
   */
  toolsets?: ToolsetSelection;
}

/**
 * Surface drift between the policy file and the registered tool set so operators
 * can reconcile the two control planes:
 *   - WARN: a policy allow/deny entry naming a tool that is not registered
 *     (toolset disabled or stale name) — calls would be denied as unknown.
 *   - INFO: how many registered tools are absent from defaults.allow (they fail
 *     closed until added to a per-user allow block — expected for write tools).
 */
function logPolicyRegistrationDrift(
  policy: PolicyChecker | undefined,
  registeredNames: Set<string>
): void {
  if (!policy?.summary) return;
  const summary = policy.summary();
  const policyNames = new Set<string>([
    ...summary.defaultAllow,
    ...summary.users.flatMap((u) => [...u.allow, ...u.deny]),
  ]);
  for (const name of policyNames) {
    if (!registeredNames.has(name)) {
      logger.warn(
        `Policy references tool '${name}' which is not registered (toolset disabled or renamed) — calls would be denied as unknown.`
      );
    }
  }
  const defaultAllow = new Set(summary.defaultAllow);
  const notInDefaults = [...registeredNames].filter((n) => !defaultAllow.has(n));
  if (notInDefaults.length > 0) {
    logger.info(
      `${notInDefaults.length} registered tool(s) are not in defaults.allow and will be denied until added to a policy allow block.`
    );
  }
}

export function registerTools(
  server: McpServer,
  graphClient: GraphClient,
  options: RegisterToolsOptions = {}
): number {
  let registeredCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const enabled = resolveEnabledToolsets(options.toolsets);
  const registeredNames = new Set<string>();

  for (const tool of ALL_TOOLS) {
    if (!isToolEnabled(tool, enabled)) {
      skippedCount++;
      continue;
    }
    const description = tool.llmTip
      ? `${tool.description}\n\n💡 TIP: ${tool.llmTip}`
      : tool.description;

    try {
      server.tool(
        tool.name,
        description,
        buildMcpParamSchema(tool),
        {
          title: tool.name,
          // A search is a POST that changes nothing. Deriving the hints from the
          // verb alone made `teams-message-search` advertise itself as
          // destructive, so a client that gates on the hint would prompt before
          // every search. `readOnly` is the tool's own word for it.
          readOnlyHint: tool.method === 'GET' || tool.readOnly === true,
          destructiveHint: tool.readOnly !== true && tool.method !== 'GET',
          openWorldHint: true,
        },
        async (params) => executeTool(tool, graphClient, params, options.policy)
      );
      registeredCount++;
      registeredNames.add(tool.name);
    } catch (error) {
      logger.error(`Failed to register tool ${tool.name}: ${(error as Error).message}`);
      failedCount++;
    }
  }

  // Utility tools always register (core utilities, no toolset gating).
  const utilityCtx: UtilityToolContext = { graphClient, requestedScopes: resolveAuthScopes() };
  for (const utility of utilityTools) {
    try {
      registerUtilityToolWithMcp(server, utility, utilityCtx, options.policy);
      registeredCount++;
      registeredNames.add(utility.name);
    } catch (error) {
      logger.error(`Failed to register tool ${utility.name}: ${(error as Error).message}`);
      failedCount++;
    }
  }

  logPolicyRegistrationDrift(options.policy, registeredNames);
  logger.info(
    `Tool registration complete: ${registeredCount} registered, ${skippedCount} skipped (toolset disabled), ${failedCount} failed`
  );
  return registeredCount;
}

/** Test seam: lets tests invoke the runtime against a Tool definition without the McpServer registration path. */
export { executeTool };

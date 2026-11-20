import { z } from 'zod';
import type GraphClient from '../graph-client.js';
import type { ResourceKind } from './projections.js';
import type { PolicyChecker } from '../policy/index.js';

/**
 * Side-channel passed to a {@link ToolPrecondition} alongside the Graph client
 * and params. Carries the active policy and the authenticated caller so guards
 * can make policy-aware decisions (e.g. the same-domain send check) without the
 * runtime hard-coding tool names.
 */
export interface PreconditionContext {
  /** Active per-call policy, if one is configured. */
  policy?: PolicyChecker;
  /** Authenticated caller's UPN (the sender), or null when unknown. */
  userPrincipalName: string | null;
  /** Authenticated caller's Entra object id, when the session carries one. */
  userOid?: string;
}

/**
 * Where a {@link ToolParam} value goes in the outbound Graph request.
 */
export type ParamLocation = 'path' | 'query' | 'header' | 'body';

/**
 * Domain group a tool belongs to, for static (deployment-time) progressive
 * disclosure. A curated cross-domain "core" set always registers; the rest of
 * each domain is gated behind enabling that toolset (see `toolset-config.ts`).
 */
export type Toolset =
  | 'mail'
  | 'calendar'
  | 'files'
  | 'directory'
  | 'teams'
  | 'sharepoint'
  | 'contacts';

/**
 * Thrown by a {@link Tool.execute} guard to refuse a call before it writes
 * anything. The runtime reports it exactly like a {@link ToolPrecondition}
 * refusal (`precondition_failed`), not as a Graph error.
 */
export class ToolRefusal extends Error {}

/**
 * Server-side guard invoked before a tool's main Graph call. Throw to refuse
 * the call with a structured error returned to the model.
 *
 * Use for runtime invariants the underlying Graph endpoint does NOT enforce
 * but the tool description claims — for example, that a `/me/messages/{id}`
 * PATCH is only valid against drafts even though Graph accepts it for any
 * message. Tool descriptions are advisory; preconditions are authoritative.
 */
export type ToolPrecondition = (
  graphClient: GraphClient,
  params: Record<string, unknown>,
  ctx: PreconditionContext
) => Promise<void>;

/**
 * One parameter on a hand-written {@link Tool}. The Zod schema carries the
 * LLM-facing description (`schema.describe(...)`) and its required-ness
 * (`.optional()` for optional params).
 *
 * For body params, the convention is a single param named `body` whose schema
 * describes the request payload shape.
 */
export interface ToolParam {
  /**
   * Parameter name as the LLM sees it. For path params this must match the
   * placeholder in {@link Tool.path} (e.g. `message-id` to match `{message-id}`).
   * OData query params are exposed without the leading `$` (many MCP clients
   * cannot send `$` in identifier names); the runtime restores it for the
   * Graph URL.
   */
  name: string;
  location: ParamLocation;
  schema: z.ZodTypeAny;
}

/**
 * Tool definition consumed by the runtime in `tool-runtime.ts`. Areté
 * hand-writes one of these per Graph endpoint we expose; the upstream
 * generator-driven approach is gone in this rewrite.
 */
export interface Tool {
  /** MCP tool name (kebab-case, stable identifier). */
  name: string;
  /** LLM-facing description. Keep concise; put long guidance in `llmTip`. */
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /**
   * Graph path with `{param-name}` placeholders. Resolved at request time
   * against the path params from {@link Tool.params}.
   */
  path: string;
  /**
   * Delegated Graph scopes required by this tool. Aggregated across the
   * tool surface to build the OAuth `scopes_supported` set.
   */
  scopes: string[];
  params: ToolParam[];
  /**
   * Optional longer guidance appended to the tool description as
   * `\n\n💡 TIP: <llmTip>`. Use for KQL syntax, $select recommendations,
   * etc. — anything that helps the model use the tool correctly.
   */
  llmTip?: string;
  /**
   * Resource kind for default field projection. Set on read/list tools so the
   * runtime injects a `Minimal*` `$select` when the caller omits one (and did
   * not pass `response_format: 'detailed'`). See {@link ResourceKind} /
   * `projections.ts`. Omit on tools that should return their full payload by
   * default (e.g. a by-id "get the full body" read).
   */
  projection?: ResourceKind;
  /** Calendar tools: adds the `timezone` MCP param mapping to Prefer header. */
  supportsTimezone?: boolean;
  /** Calendar tools: adds the `expandExtendedProperties` MCP param. */
  supportsExpandExtendedProperties?: boolean;
  /** Drive-content tools: strip `/content` suffix and return Graph's pre-redirect URL instead of the bytes. */
  returnDownloadUrl?: boolean;
  /** Override the default `application/json` content type for write endpoints. */
  contentType?: string;
  /** Override the default Accept header for non-JSON response endpoints. */
  acceptType?: string;
  /** Names of path params whose values must NOT be URL-encoded (function-style API calls). */
  skipEncoding?: string[];
  /**
   * Hard-coded request headers always sent on this tool's request. Used for
   * endpoints that require a fixed header — e.g. `ConsistencyLevel: eventual`
   * on `/users` to enable `$search` / advanced `$filter`.
   *
   * Tool-param headers (location: 'header') still override these, since the
   * params loop runs after the requestHeaders are applied.
   */
  requestHeaders?: Record<string, string>;
  /**
   * Marks a POST endpoint as logically read-only (e.g. a Microsoft Search query).
   * Drives the `readOnlyHint` / `destructiveHint` registration hints, which the
   * verb alone gets wrong for a search.
   */
  readOnly?: boolean;
  /**
   * Server-side guard run after policy.check and before the main Graph call.
   * Throw to refuse — the Graph call never fires. See {@link ToolPrecondition}.
   *
   * Use this for invariants we want enforced in code rather than relying on
   * the LLM to respect the tool description. Example: mail write tools that
   * should only touch drafts but whose underlying Graph endpoint accepts
   * any message id.
   */
  precondition?: ToolPrecondition;
  /**
   * Custom handler for a tool that needs more than one Graph call (e.g. read
   * current state, then write a server-computed body). Replaces the single
   * request the runtime would otherwise build from {@link Tool.params}; policy
   * and {@link Tool.precondition} still run first and the call is still logged.
   *
   * Call Graph through `graphClient.makeRequest` (raw object, throws on Graph
   * errors). Return the JSON value to hand the model; throw to fail the call.
   * {@link Tool.method}/{@link Tool.path} stay descriptive: they drive the
   * registration hints and docs, not the request.
   */
  execute?: (
    graphClient: GraphClient,
    params: Record<string, unknown>,
    ctx: PreconditionContext
  ) => Promise<unknown>;
  /**
   * Condense the raw Graph response for a non-list tool to the fields an agent
   * needs to understand the result and make its follow-up calls (ids, links,
   * the values it asked about) — never the whole Graph object. Runs on the
   * single-request path; list tools use {@link Tool.projection} instead.
   */
  shape?: (raw: unknown) => unknown;
  /**
   * Optional per-tool path builder. When present, the runtime uses its return
   * value as the Graph path instead of the static {@link Tool.path} template —
   * letting one tool select between path shapes by the presence of an id (e.g.
   * a list tool that targets `/me/messages` or `/me/mailFolders/{id}/messages`).
   *
   * It MUST return a fully-substituted path (no `{placeholder}` left). The param
   * names it consumes are declared in {@link Tool.resolverParams} so the runtime
   * skips them in the param loop and they never leak onto the query string.
   */
  pathResolver?: (params: Record<string, unknown>) => string;
  /** Param names consumed by {@link Tool.pathResolver}; skipped in the param loop. */
  resolverParams?: string[];
  /**
   * Domain group for static progressive disclosure. Usually assigned per-domain
   * in `tools/index.ts`; a tool may override. Tools in the curated core set
   * (`toolset-config.ts`) register regardless of this tag.
   */
  toolset?: Toolset;
  /**
   * Opt this GET list tool into opaque, server-issued cursor pagination
   * (`{ value, returnedCount, hasMore, cursor?, truncated?, hint? }`)
   * instead of the generic narrow-only truncation envelope ({@link
   * shapeResponseSize} in `tool-runtime.ts`), via a dedicated request/
   * response flow (`executeCursorPaginatedTool` in `tool-runtime.ts`).
   * `hasMore`/`cursor` are derived from Graph's own `@odata.nextLink`
   * (validated against the configured endpoint/API version) and from how
   * many rows of an already-fetched page are still pending — never from
   * arithmetic on a returned-item count, so an empty Graph page that still
   * carries a `nextLink` correctly advances rather than appearing complete.
   * The cursor is HMAC-signed and bound to the exact tool, resolved
   * collection path, and caller — see `src/tools/contacts-cursor.ts`.
   * `fetchAllPages` is refused outright (not exposed in the MCP schema,
   * not honored if sent anyway): a server-side multi-page merge can itself
   * hit the response-size ceiling with no cursor, undermining this
   * contract. Use for collections callers may need to page through
   * completely (e.g. `contact-list`).
   */
  cursorPagination?: boolean;
}

/**
 * Standard OData $-prefixed query parameters reused across Graph tools.
 * Each Tool that supports paging/filtering opts in by spreading the relevant
 * entries into its `params` array. Descriptions match the spec-gap guidance
 * carried over from the upstream graph-tools schema overrides.
 */
export const OData = {
  filter: {
    name: 'filter',
    location: 'query',
    schema: z
      .string()
      .describe(
        'OData $filter expression. Add count=true for advanced filters (flag/flagStatus, contains()). Cannot combine with search.'
      )
      .optional(),
  },
  search: {
    name: 'search',
    location: 'query',
    schema: z
      .string()
      .describe('KQL $search query — wrap value in double quotes. Cannot combine with filter.')
      .optional(),
  },
  select: {
    name: 'select',
    location: 'query',
    schema: z
      .string()
      .describe('Comma-separated fields to return ($select), e.g. id,subject,from,receivedDateTime')
      .optional(),
  },
  orderby: {
    name: 'orderby',
    location: 'query',
    schema: z.string().describe('$orderby sort expression, e.g. receivedDateTime desc').optional(),
  },
  top: {
    name: 'top',
    location: 'query',
    schema: z
      .number()
      .describe(
        'Page size ($top). Start small (e.g. 5–15) so responses fit the model context; ' +
          'raise only if needed. Use select to return fewer fields per item. ' +
          'For more rows, use @odata.nextLink from the response instead of a very large top.'
      )
      .optional(),
  },
  skip: {
    name: 'skip',
    location: 'query',
    schema: z
      .number()
      .describe('Items to $skip for pagination. Not supported with search.')
      .optional(),
  },
  count: {
    name: 'count',
    location: 'query',
    schema: z
      .boolean()
      .describe(
        'Set true to enable advanced query mode (ConsistencyLevel: eventual). Required for complex $filter on flag/flagStatus or contains().'
      )
      .optional(),
  },
  expand: {
    name: 'expand',
    location: 'query',
    schema: z
      .string()
      .describe(
        'Comma-separated $expand navigation properties to expand inline, e.g. attachments,extensions'
      )
      .optional(),
  },
} as const satisfies Record<string, ToolParam>;

/** Set of OData query param base names (without `$`). The runtime prepends `$` when building the Graph URL. */
export const ODATA_PARAM_NAMES = new Set([
  'filter',
  'search',
  'select',
  'orderby',
  'skip',
  'top',
  'count',
  'expand',
  'format',
]);

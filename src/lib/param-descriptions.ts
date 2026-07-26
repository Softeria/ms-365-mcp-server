/**
 * Single source of truth for the parameter description text that both
 * `registerGraphTools` (normal MCP registration, wraps these in Zod schemas)
 * and `describeToolSchema` / `get-tool-schema` (--discovery mode) surface to
 * an LLM. These parameters carry spec-gap guidance that goes well beyond
 * what Microsoft's OpenAPI spec says (see the $expand case below), so it is
 * critical that both code paths describe them identically — an LLM using
 * --discovery mode should see exactly what an LLM using normal registration
 * sees. Keeping the text here, instead of inlined at each call site, makes it
 * structurally impossible for the two paths to drift out of sync again.
 *
 * Some of these parameters are conditional (only added to a tool's schema
 * under certain circumstances); the functions here also encode those
 * conditions so both call sites apply them identically.
 */
import logger from '../logger.js';

/**
 * Delta tools where Graph does NOT support `$top`. The calendarView delta function
 * lists `$top` neither as supported nor among its rejected params; page size is
 * controlled via `Prefer: odata.maxpagesize` instead. By contrast message/driveItem/site
 * delta explicitly document `$top` support, so it must be preserved for those.
 * See https://learn.microsoft.com/en-us/graph/api/event-delta
 */
export const TOP_UNSUPPORTED_DELTA_TOOLS = new Set([
  'list-calendar-events-delta',
  'list-calendar-view-delta',
]);

/** True when `$top`/`top` must be omitted entirely from a tool's schema. */
export function shouldOmitTopParam(toolAlias: string): boolean {
  return TOP_UNSUPPORTED_DELTA_TOOLS.has(toolAlias);
}

/**
 * Whether `fetchAllPages` is permitted. Defaults to true; set MS365_MCP_ALLOW_PAGINATION
 * to 0/false/no to disable multi-page following entirely (returns the first page only).
 */
export function paginationAllowed(): boolean {
  const raw = process.env.MS365_MCP_ALLOW_PAGINATION;
  if (raw === undefined || raw === '') return true;
  return !/^(0|false|no)$/i.test(raw.trim());
}

export const DEFAULT_MAX_PAGES = 100;

/** Reads a positive-integer env var, falling back to `defaultValue` when unset or invalid. */
export function positiveIntFromEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    logger.warn(`Ignoring invalid ${name}=${JSON.stringify(raw)} (use a positive integer)`);
    return defaultValue;
  }
  return n;
}

/** Current `fetchAllPages` page cap, honoring MS365_MCP_MAX_PAGES. */
export function getMaxPages(): number {
  return positiveIntFromEnv('MS365_MCP_MAX_PAGES', DEFAULT_MAX_PAGES);
}

/** Whether a tool is eligible for the synthetic `fetchAllPages` parameter. */
export function isFetchAllPagesApplicable(tool: { method: string; path: string }): boolean {
  return tool.method.toUpperCase() === 'GET' && tool.path.includes('/') && paginationAllowed();
}

export const FILTER_PARAM_DESCRIPTION =
  'OData filter expression. Add $count=true for advanced filters (flag/flagStatus, contains()). Cannot combine with $search.';

export const SEARCH_PARAM_DESCRIPTION =
  'KQL search query — wrap value in double quotes. Cannot combine with $filter.';

export const SELECT_PARAM_DESCRIPTION =
  'Comma-separated fields to return, e.g. id,subject,from,receivedDateTime';

// The spec describes every $expand as "Expand related entities", which says nothing about
// what is expandable. Models pass non-navigation properties — message body is the one I
// hit repeatedly — and Graph answers 400 "Parsing OData Select and Expand failed".
export const EXPAND_PARAM_DESCRIPTION =
  'Navigation properties to inline, e.g. attachments on a message or event. Only ' +
  'navigation properties can be expanded: expanding a non-navigation property such ' +
  'as a message body fails with "Parsing OData Select and Expand failed", and an ' +
  'unsupported value may be ignored rather than reported. Request ordinary fields ' +
  'with $select instead.';

export const ORDERBY_PARAM_DESCRIPTION = 'Sort expression, e.g. receivedDateTime desc';

export const TOP_PARAM_DESCRIPTION =
  'Page size (Graph $top). Start small (e.g. 5–15) so responses fit the model context; ' +
  'raise only if needed. Use $select to return fewer fields per item. ' +
  'For more rows, use @odata.nextLink from the response instead of a very large $top.';

export const SKIP_PARAM_DESCRIPTION = 'Items to skip for pagination. Not supported with $search.';

export const COUNT_PARAM_DESCRIPTION =
  'Set true to enable advanced query mode (ConsistencyLevel: eventual). Required for complex $filter on flag/flagStatus or contains().';

export const CONFIRM_PARAM_DESCRIPTION =
  'For destructive operations when the confirm gate is enabled (MS365_MCP_REQUIRE_CONFIRM=true; off by default). ' +
  'Set to true only after the user has explicitly approved this action. ' +
  'When the gate is on, calls without confirm: true return { error: "confirmation_required" } without touching user data.';

export const TIMEZONE_PARAM_DESCRIPTION =
  'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo") for calendar event times. If not specified, times are returned in UTC.';

export const EXPAND_EXTENDED_PROPERTIES_PARAM_DESCRIPTION =
  'When true, expands singleValueExtendedProperties on each event. Use this to retrieve custom extended properties (e.g., sync metadata) stored on calendar events.';

/**
 * Layer 2 of multi-account support: account names are surfaced in the description
 * (not as a strict enum) so the LLM sees available accounts upfront without a
 * round-trip, but accounts added mid-session via --login are still accepted —
 * getTokenForAccount() handles validation at runtime.
 */
export function getAccountParamDescription(accountNames: string[]): string {
  const accountHint = accountNames.length > 0 ? `Known accounts: ${accountNames.join(', ')}. ` : '';
  return (
    `${accountHint}Microsoft account email to use for this request. ` +
    `Required when multiple accounts are configured. ` +
    `Use the list-accounts tool to discover all currently available accounts.`
  );
}

export function getFetchAllPagesParamDescription(maxPages: number): string {
  return (
    `Follow @odata.nextLink and merge up to ${maxPages} pages into one response. ` +
    'Can return enormous payloads—only when the user explicitly needs a full export. ' +
    'Prefer a small $top first, then paginate or narrow with $filter/$search.'
  );
}

/** Maps a bare or `$`-prefixed OData param name to its shared description text. */
export function getODataParamDescription(bareName: string): string | undefined {
  switch (bareName) {
    case 'filter':
      return FILTER_PARAM_DESCRIPTION;
    case 'search':
      return SEARCH_PARAM_DESCRIPTION;
    case 'select':
      return SELECT_PARAM_DESCRIPTION;
    case 'expand':
      return EXPAND_PARAM_DESCRIPTION;
    case 'orderby':
      return ORDERBY_PARAM_DESCRIPTION;
    case 'top':
      return TOP_PARAM_DESCRIPTION;
    case 'skip':
      return SKIP_PARAM_DESCRIPTION;
    case 'count':
      return COUNT_PARAM_DESCRIPTION;
    default:
      return undefined;
  }
}

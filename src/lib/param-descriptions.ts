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

/** The query contract fields of an endpoints.json entry. */
export interface QueryParamConfig {
  queryParams?: readonly string[];
  maxTop?: number;
}

/** False when the endpoint's `queryParams` leaves out `bareName` (bare, lowercase). */
export function isQueryParamSupported(
  config: QueryParamConfig | undefined,
  bareName: string
): boolean {
  return config?.queryParams?.some((name) => name.toLowerCase() === bareName) ?? true;
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

// A sentence paired with the query option it points at is left out where the tool doesn't
// take that option, so no description sends the model to something Graph rejects.
type Sentence = string | readonly [text: string, option: string];

function describeWith(sentences: readonly Sentence[], config?: QueryParamConfig): string {
  return sentences
    .filter((s) => typeof s === 'string' || isQueryParamSupported(config, s[1]))
    .map((s) => (typeof s === 'string' ? s : s[0]))
    .join(' ');
}

const FILTER_SENTENCES: readonly Sentence[] = [
  'OData filter expression.',
  ['Add $count=true for advanced filters (flag/flagStatus, contains()).', 'count'],
  ['Cannot combine with $search.', 'search'],
];

// Reaches ~100 tools, most of them calendar/OneNote/SharePoint/Teams/Planner, so it stays
// short. Mail quoting is repaired server-side by normalizeSearchQueryParam, which is why
// this no longer spells the mail rule out; directory has no such repair, so it gets a clause.
const SEARCH_SENTENCES: readonly Sentence[] = [
  'KQL search query in one pair of double quotes; directory (users/groups) instead quotes each clause with no outer pair.',
  ['Cannot combine with $filter.', 'filter'],
];

export const SELECT_PARAM_DESCRIPTION =
  'Comma-separated fields to return, e.g. id,subject,from,receivedDateTime';

// The spec describes every $expand as "Expand related entities", which says nothing about
// what is expandable. Models pass non-navigation properties — message body is the one I
// hit repeatedly — and Graph answers 400 "Parsing OData Select and Expand failed".
// The one-relationship limit is in Microsoft's docs but not the spec, and the array
// schema invites passing several.
const EXPAND_SENTENCES: readonly Sentence[] = [
  'Navigation properties to inline, e.g. attachments on a message or event.',
  'Only navigation properties can be expanded: expanding a non-navigation property such as a message body fails with "Parsing OData Select and Expand failed".',
  ['Request ordinary fields with $select instead.', 'select'],
  'Some APIs accept only one relationship per request, so prefer a single value.',
  'Some relationships support nested selection, e.g. children($select=id,name).',
];

export const ORDERBY_PARAM_DESCRIPTION = 'Sort expression, e.g. receivedDateTime desc';

const TOP_SENTENCES: readonly Sentence[] = [
  'Page size (Graph $top).',
  'Start small (e.g. 5–15) so responses fit the model context; raise only if needed.',
  ['Use $select to return fewer fields per item.', 'select'],
  'For more rows, use @odata.nextLink from the response instead of a very large $top.',
];

const SKIP_SENTENCES: readonly Sentence[] = [
  'Items to skip for pagination.',
  ['Not supported with $search.', 'search'],
];

// Reaches ~100 tools, like $search, so it stays short. It asks for the whole link because
// normalizeSkiptokenQueryParam in graph-tools.ts reads both $skiptoken and $skip out of it.
export const SKIPTOKEN_PARAM_DESCRIPTION =
  'Next page: the @odata.nextLink from the previous response. Keep the other arguments the same.';

// Query options that only exist on a collection, which are used to determine if
// skiptoken pagination is allowed
const COLLECTION_QUERY_PARAMS = new Set(['top', 'filter', 'orderby', 'count']);

// Whether a tool returns a collection and can take a `skiptoken`: as listed in its
// queryParams, otherwise guessed from the parameter names in its schema.
export function isSkiptokenApplicable(
  tool: { method: string },
  paramNames: Iterable<string>,
  config?: QueryParamConfig
): boolean {
  if (tool.method.toUpperCase() !== 'GET') return false;
  if (config?.queryParams) return isQueryParamSupported(config, 'skiptoken');
  for (const name of paramNames) {
    if (COLLECTION_QUERY_PARAMS.has(name.replace(/^\$/, '').toLowerCase())) return true;
  }
  return false;
}

export const COUNT_PARAM_DESCRIPTION =
  'Set true to enable advanced query mode (ConsistencyLevel: eventual). Required for complex $filter on flag/flagStatus or contains(). The response then includes @odata.count, the total for the filtered collection, which can exceed the items returned when fetchAllPages hits its page/item cap.';

export const MEMBER_NAME_PARAM_DESCRIPTION =
  "Case-insensitive text to match against each member's displayName and email. Applied after $select projection, so only fields you can see are matched. Without fetchAllPages only the fetched page is filtered, and @odata.count still reports the unfiltered total.";

export const CONFIRM_PARAM_DESCRIPTION =
  'For destructive operations when the confirm gate is enabled (MS365_MCP_REQUIRE_CONFIRM=true; off by default). ' +
  'Set to true only after the user has explicitly approved this action. ' +
  'When the gate is on, calls without confirm: true return { error: "confirmation_required" } without touching user data.';

export const TIMEZONE_PARAM_DESCRIPTION =
  'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo") for calendar event times. If not specified, times are returned in UTC.';

export const EXPAND_EXTENDED_PROPERTIES_PARAM_DESCRIPTION =
  'When true, expands singleValueExtendedProperties on each event. Use this to retrieve custom extended properties (e.g., sync metadata) stored on calendar events.';

export function getAcceptParamDescription(acceptType: string): string {
  return (
    `Accept header for the response representation. Defaults to "${acceptType}". ` +
    'Only set this when Graph asks for a different format — e.g. a 403 SpeakerAttributionNotAllowed ' +
    'on transcript content names the media type to retry with.'
  );
}

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

export function getFetchAllPagesParamDescription(
  maxPages: number,
  config?: QueryParamConfig
): string {
  const narrowing = ['filter', 'search']
    .filter((option) => isQueryParamSupported(config, option))
    .map((option) => `$${option}`)
    .join('/');
  const advice = isQueryParamSupported(config, 'top')
    ? `Prefer a small $top first, then paginate${narrowing ? ` or narrow with ${narrowing}` : ''}.`
    : narrowing && `Narrow with ${narrowing} first.`;
  return [
    `Follow @odata.nextLink and merge up to ${maxPages} pages into one response.`,
    'Can return enormous payloads—only when the user explicitly needs a full export.',
    advice,
  ]
    .filter(Boolean)
    .join(' ');
}

/** The shared description text for a bare OData param name, worded for this endpoint. */
export function getODataParamDescription(
  bareName: string,
  config?: QueryParamConfig
): string | undefined {
  switch (bareName) {
    case 'filter':
      return describeWith(FILTER_SENTENCES, config);
    case 'search':
      return describeWith(SEARCH_SENTENCES, config);
    case 'select':
      return SELECT_PARAM_DESCRIPTION;
    case 'expand':
      return describeWith(EXPAND_SENTENCES, config);
    case 'orderby':
      return ORDERBY_PARAM_DESCRIPTION;
    case 'top':
      return describeWith(TOP_SENTENCES, config);
    case 'skip':
      return describeWith(SKIP_SENTENCES, config);
    case 'count':
      return COUNT_PARAM_DESCRIPTION;
    default:
      return undefined;
  }
}

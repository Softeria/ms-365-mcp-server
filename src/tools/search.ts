import { z } from 'zod';
import type { Tool } from './types.js';

/**
 * Body for a Microsoft Search (`POST /search/query`) tool. Graph wants the full
 * envelope; everything but the query string is defaulted so a plain search is a
 * one-field call. Each tool pins its own `entityTypes` so one tool can never be
 * pointed at another domain's index.
 */
export function searchRequestSchema(opts: {
  entityTypes: z.ZodTypeAny;
  queryDescription: string;
  maxSize: number;
  /** Graph honors `enableTopResults` only for message and chatMessage searches. */
  topResults?: boolean;
}) {
  const request = z.object({
    entityTypes: opts.entityTypes,
    query: z.object({ queryString: z.string().describe(opts.queryDescription) }),
    from: z.number().int().min(0).default(0).describe('Offset for paging.'),
    size: z
      .number()
      .int()
      .min(1)
      .max(opts.maxSize)
      .default(Math.min(25, opts.maxSize))
      .describe(`Hits per page, max ${opts.maxSize}.`),
  });
  const withTopResults = opts.topResults
    ? request.extend({
        enableTopResults: z
          .boolean()
          .optional()
          .describe('Rank by relevance instead of newest-first.'),
      })
    : request;
  return z
    .object({ requests: z.array(withTopResults).length(1) })
    .describe('Microsoft Search request envelope.');
}

interface SearchHit {
  hitId?: string;
  summary?: string;
  resource?: Record<string, unknown>;
}

interface SearchResponse {
  value?: { hitsContainers?: { hits?: SearchHit[]; moreResultsAvailable?: boolean }[] }[];
}

/** Per-hit snippet cap; Graph summaries are highlight excerpts, normally a few hundred chars. */
const MAX_SUMMARY_CHARS = 1_000;
/** Char budget for the flattened hit list. Hits past it are left for the next page, not dropped. */
const HITS_CHAR_BUDGET = 50_000;

/**
 * `Tool.execute` handler for a Microsoft Search tool: POSTs the validated
 * envelope, then flattens Graph's `value[0].hitsContainers[0].hits[]` into
 * `{ hits, moreResultsAvailable, nextFrom?, truncated? }`, keeping only the
 * fields `pick` returns per hit. `execute` results bypass the runtime's
 * response-size ceiling (which only trims a top-level `value`), so this
 * handler bounds its own output: summaries are capped, and once the hit list
 * reaches the budget the remaining hits are omitted with `nextFrom` pointing
 * at the first omitted one, so a follow-up call resumes without losing any.
 */
export function flattenedSearch(
  pick: (resource: Record<string, unknown>) => Record<string, unknown>
): NonNullable<Tool['execute']> {
  return async (graphClient, params) => {
    const body = params['body'] as { requests?: { from?: number }[] } | undefined;
    const raw = (await graphClient.makeRequest('/search/query', {
      method: 'POST',
      body: JSON.stringify(body),
    })) as SearchResponse | null;
    const container = raw?.value?.[0]?.hitsContainers?.[0];
    const allHits = container?.hits ?? [];
    const hits: Record<string, unknown>[] = [];
    let used = 0;
    for (const hit of allHits) {
      const summary =
        hit.summary && hit.summary.length > MAX_SUMMARY_CHARS
          ? `${hit.summary.slice(0, MAX_SUMMARY_CHARS)}…`
          : hit.summary;
      const flat = { ...pick(hit.resource ?? {}), hitId: hit.hitId, summary };
      const size = JSON.stringify(flat).length;
      if (hits.length > 0 && used + size > HITS_CHAR_BUDGET) break;
      hits.push(flat);
      used += size;
    }
    const truncated = hits.length < allHits.length;
    const moreResultsAvailable = truncated || container?.moreResultsAvailable === true;
    const from = body?.requests?.[0]?.from ?? 0;
    return {
      hits,
      moreResultsAvailable,
      ...(moreResultsAvailable ? { nextFrom: from + hits.length } : {}),
      ...(truncated
        ? {
            truncated: true,
            hint: `Response size budget reached after ${hits.length} of ${allHits.length} hits; resend with from = nextFrom for the rest.`,
          }
        : {}),
    };
  };
}

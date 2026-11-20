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

/**
 * `Tool.execute` handler for a Microsoft Search tool: POSTs the validated
 * envelope, then flattens Graph's `value[0].hitsContainers[0].hits[]` into
 * `{ hits, moreResultsAvailable, nextFrom? }`, keeping only the fields `pick`
 * returns per hit. The raw search resource carries full identity sets and
 * SharePoint ids per hit, which the response-size ceiling (it only trims a
 * top-level `value`) would not bound.
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
    const hits = (container?.hits ?? []).map((hit) => ({
      ...pick(hit.resource ?? {}),
      hitId: hit.hitId,
      summary: hit.summary,
    }));
    const moreResultsAvailable = container?.moreResultsAvailable === true;
    const from = body?.requests?.[0]?.from ?? 0;
    return {
      hits,
      moreResultsAvailable,
      ...(moreResultsAvailable ? { nextFrom: from + hits.length } : {}),
    };
  };
}

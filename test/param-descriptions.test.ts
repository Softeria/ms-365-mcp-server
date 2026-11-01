import { describe, expect, it } from 'vitest';
import {
  getFetchAllPagesParamDescription,
  getODataParamDescription,
  isQueryParamSupported,
} from '../src/lib/param-descriptions.js';

describe('query param descriptions follow the endpoint queryParams', () => {
  // The text every tool without queryParams got before descriptions were derived from them
  const unrestricted: Record<string, string> = {
    filter:
      'OData filter expression. Add $count=true for advanced filters (flag/flagStatus, contains()). Cannot combine with $search.',
    search:
      'KQL search query in one pair of double quotes; directory (users/groups) instead quotes each clause with no outer pair. Cannot combine with $filter.',
    expand:
      'Navigation properties to inline, e.g. attachments on a message or event. Only navigation properties can be expanded: expanding a non-navigation property such as a message body fails with "Parsing OData Select and Expand failed". Request ordinary fields with $select instead. Some APIs accept only one relationship per request, so prefer a single value. Some relationships support nested selection, e.g. children($select=id,name).',
    top: 'Page size (Graph $top). Start small (e.g. 5–15) so responses fit the model context; raise only if needed. Use $select to return fewer fields per item. For more rows, use @odata.nextLink from the response instead of a very large $top.',
    skip: 'Items to skip for pagination. Not supported with $search.',
  };

  it.each(Object.entries(unrestricted))(
    'keeps the full %s text without queryParams',
    (name, text) => {
      expect(getODataParamDescription(name)).toBe(text);
      expect(getODataParamDescription(name, {})).toBe(text);
    }
  );

  it('drops only the sentences about options the endpoint leaves out', () => {
    const config = { queryParams: ['top', 'skip', 'filter', 'expand'] };
    expect(getODataParamDescription('filter', config)).toBe('OData filter expression.');
    expect(getODataParamDescription('skip', config)).toBe('Items to skip for pagination.');
    expect(getODataParamDescription('top', config)).not.toContain('$select');
    expect(getODataParamDescription('expand', config)).not.toContain('Request ordinary fields');
    expect(getODataParamDescription('expand', config)).toContain('children($select=id,name)');
    expect(getODataParamDescription('search', { queryParams: ['search'] })).not.toContain(
      '$filter'
    );
  });

  it('words the fetchAllPages advice from what the endpoint takes', () => {
    const head =
      'Follow @odata.nextLink and merge up to 7 pages into one response. Can return enormous payloads—only when the user explicitly needs a full export.';
    expect(getFetchAllPagesParamDescription(7)).toBe(
      `${head} Prefer a small $top first, then paginate or narrow with $filter/$search.`
    );
    expect(getFetchAllPagesParamDescription(7, { queryParams: ['top', 'filter'] })).toBe(
      `${head} Prefer a small $top first, then paginate or narrow with $filter.`
    );
    expect(getFetchAllPagesParamDescription(7, { queryParams: ['top', 'skiptoken'] })).toBe(
      `${head} Prefer a small $top first, then paginate.`
    );
    expect(getFetchAllPagesParamDescription(7, { queryParams: ['filter'] })).toBe(
      `${head} Narrow with $filter first.`
    );
    expect(getFetchAllPagesParamDescription(7, { queryParams: [] })).toBe(head);
  });

  it('matches queryParams names case-insensitively, as the bare lowercase name', () => {
    const config = { queryParams: ['startDateTime', 'skiptoken'] };
    expect(isQueryParamSupported(config, 'startdatetime')).toBe(true);
    expect(isQueryParamSupported(config, 'top')).toBe(false);
    expect(isQueryParamSupported(undefined, 'top')).toBe(true);
  });
});

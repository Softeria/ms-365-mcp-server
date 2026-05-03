import { describe, expect, it } from 'vitest';
import {
  buildToolsRegistry,
  buildDiscoverySearchIndex,
  scoreDiscoveryQuery,
} from '../src/graph-tools.js';

/**
 * Golden-query eval for discovery search. Each case asserts that the expected tool
 * appears in the top-N results for a natural-language query a user is likely
 * to phrase. The live tool registry is used (no mocks) so regressions in endpoint
 * descriptions, llmTips, or the ranking weights surface here.
 */
const registry = buildToolsRegistry(false, true);
const index = buildDiscoverySearchIndex(registry);

function topN(query: string, n: number): string[] {
  return scoreDiscoveryQuery(query, index)
    .slice(0, n)
    .map((r) => r.id);
}

type Case = { query: string; expect: string; inTop?: number };

const cases: Case[] = [
  // Mail
  { query: 'send email', expect: 'send-mail', inTop: 5 },
  { query: 'send mail', expect: 'send-mail', inTop: 3 },
  { query: 'list unread mail', expect: 'list-mail-messages', inTop: 5 },
  { query: 'list messages', expect: 'list-mail-messages', inTop: 5 },
  { query: 'read mail message', expect: 'get-mail-message', inTop: 5 },
  { query: 'delete mail', expect: 'delete-mail-message', inTop: 5 },
  { query: 'list mail folders', expect: 'list-mail-folders', inTop: 3 },
  // Calendar
  { query: 'create calendar event', expect: 'create-calendar-event', inTop: 5 },
  { query: 'create event', expect: 'create-calendar-event', inTop: 5 },
  { query: 'list calendars', expect: 'list-calendars', inTop: 3 },
  { query: 'list calendar events', expect: 'list-calendar-events', inTop: 5 },
  { query: 'accept event', expect: 'accept-calendar-event', inTop: 5 },
  // Enabi fork: Teams / Excel / OneDrive / Users / file-content endpoints are
  // out of scope and were removed from the registry. Cases referencing them
  // were dropped here. Re-add if those scopes ever return.
  // Files (mail folders only)
  { query: 'list folders', expect: 'list-mail-folders', inTop: 10 },
  // Contacts
  { query: 'list contacts', expect: 'list-outlook-contacts', inTop: 5 },
  { query: 'create contact', expect: 'create-outlook-contact', inTop: 5 },
];

describe('discovery search (golden queries)', () => {
  for (const c of cases) {
    const n = c.inTop ?? 5;
    it(`"${c.query}" → ${c.expect} in top ${n}`, () => {
      if (!registry.has(c.expect)) {
        throw new Error(
          `Test fixture error: expected tool "${c.expect}" is not in the registry. ` +
            `Update the golden-query case or add the endpoint.`
        );
      }
      const top = topN(c.query, n);
      expect(top, `top ${n} for "${c.query}"`).toContain(c.expect);
    });
  }

  it('returns empty for gibberish queries', () => {
    expect(scoreDiscoveryQuery('zzzqqqxxxfoobarbaz', index)).toEqual([]);
  });

  it('covers at least 80% of golden queries in top 5', () => {
    let hits = 0;
    for (const c of cases) {
      if (topN(c.query, 5).includes(c.expect)) hits++;
    }
    const ratio = hits / cases.length;
    expect(ratio, `hit ratio ${(ratio * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.8);
  });
});

import { describe, expect, it } from 'vitest';
import { buildBM25Index, scoreQuery, tokenize } from '../src/lib/bm25.js';

describe('tokenize', () => {
  it('splits on hyphens', () => {
    expect(tokenize('send-mail')).toEqual(['send', 'mail']);
  });

  it('splits on camelCase boundaries', () => {
    expect(tokenize('listMailMessages')).toEqual(['list', 'mail', 'messages']);
  });

  it('splits on underscores and whitespace', () => {
    expect(tokenize('create_calendar event')).toEqual(['create', 'calendar', 'event']);
  });

  it('splits on path separators and function-call punctuation', () => {
    expect(tokenize('/me/events/delta()')).toEqual(['me', 'events', 'delta']);
  });

  it('lowercases everything', () => {
    expect(tokenize('SendMail')).toEqual(['send', 'mail']);
  });

  it('returns empty array for empty/missing input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe('BM25 scoring', () => {
  const docs = [
    { id: 'send-mail', tokens: tokenize('send-mail /me/sendMail Send the message') },
    { id: 'list-mail-messages', tokens: tokenize('list-mail-messages /me/messages List messages') },
    {
      id: 'create-event',
      tokens: tokenize('create-event /me/events Create a calendar event'),
    },
    {
      id: 'share-drive-item',
      tokens: tokenize('share-drive-item /drives/items/invite Send a sharing invitation email'),
    },
  ];
  const index = buildBM25Index(docs);

  it('finds hyphenated tools via natural-language query', () => {
    const ranked = scoreQuery('send email', index);
    const top = ranked.map((r) => r.id);
    expect(top).toContain('send-mail');
    expect(top).toContain('share-drive-item');
  });

  it('ranks the tool whose name matches the query ahead of incidental mentions', () => {
    const ranked = scoreQuery('send mail', index);
    expect(ranked[0].id).toBe('send-mail');
  });

  it('finds calendar-event tool via multi-word query', () => {
    const ranked = scoreQuery('create calendar event', index);
    expect(ranked[0].id).toBe('create-event');
  });

  it('returns empty when no query token matches any document', () => {
    expect(scoreQuery('xyzzyfoobar', index)).toEqual([]);
  });

  it('returns empty when the query tokenizes to nothing', () => {
    expect(scoreQuery('   ', index)).toEqual([]);
  });
});

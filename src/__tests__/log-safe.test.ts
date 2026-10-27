import { describe, it, expect } from 'vitest';
import { describeShape, describeUrl, describeError, serializedSize } from '../lib/log-safe.js';
import { GraphApiError } from '../graph-client.js';

// Sentinel text that must never reach a log line.
const SECRET = 'SENTINEL-the quarterly numbers are bad, do not forward';

describe('log-safe', () => {
  it('describes parameters by shape, never by value', () => {
    const out = describeShape({
      top: 10,
      filter: `subject eq '${SECRET}'`,
      search: `"${SECRET}"`,
      body: { subject: SECRET, body: { contentType: 'html', content: SECRET } },
      ids: [SECRET, SECRET],
      flag: true,
      nothing: null,
    });
    expect(out).not.toContain(SECRET);
    expect(out).toContain('top: 10');
    expect(out).toContain(`filter: string(${SECRET.length + 13})`);
    expect(out).toContain('body: object(2 keys)');
    expect(out).toContain('ids: array(2)');
    expect(out).toContain('flag: true');
    expect(out).toContain('nothing: null');
  });

  it('describes a string or array at the top level without its content', () => {
    expect(describeShape(SECRET)).toBe(`string(${SECRET.length})`);
    expect(describeShape([SECRET])).toBe('array(1)');
  });

  it('caps the number of keys it lists', () => {
    const wide = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i]));
    const out = describeShape(wide);
    expect(out).toContain('… +10 more');
  });

  it('drops the query string from a URL and keeps the parameter names', () => {
    const url = `https://graph.microsoft.com/v1.0/me/messages?$search=%22${encodeURIComponent(SECRET)}%22&$top=5&$select=id`;
    const out = describeUrl(url);
    expect(out).not.toContain(SECRET);
    expect(out).not.toContain(encodeURIComponent(SECRET));
    expect(out).toBe(
      'https://graph.microsoft.com/v1.0/me/messages [query: $search, $top, $select]'
    );
    expect(describeUrl('/me/messages')).toBe('/me/messages');
  });

  it('describes a Graph error by status and code, never by message', () => {
    const err = new GraphApiError(`Invalid filter clause: ${SECRET}`, 400, 'BadRequest');
    const out = describeError(err);
    expect(out).toBe('GraphApiError status=400 code=BadRequest');
    expect(out).not.toContain(SECRET);
  });

  it('describes other errors by name and code only', () => {
    const err = Object.assign(new Error(`connect failed while sending ${SECRET}`), {
      code: 'ECONNRESET',
    });
    expect(describeError(err)).toBe('Error code=ECONNRESET');
    expect(describeError('not an error')).toBe('string');
  });

  it('reports a serialized size without the content', () => {
    expect(serializedSize({ a: 'bc' })).toBe(Buffer.byteLength('{"a":"bc"}'));
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(serializedSize(cyclic)).toBe(-1);
  });
});

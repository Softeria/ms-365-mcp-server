import { describe, it, expect } from 'vitest';
import {
  describeShape,
  describeUrl,
  describeError,
  describeStack,
  serializedSize,
} from '../lib/log-safe.js';
import { GraphApiError } from '../graph-client.js';

// Sentinel text that must never reach a log line, wherever it is put.
const SECRET = 'SENTINEL-the quarterly numbers are bad, do not forward';

describe('log-safe', () => {
  it('describes parameters by shape, never by value', () => {
    const out = describeShape({
      top: 10,
      filter: `subject eq '${SECRET}'`,
      search: `"${SECRET}"`,
      body: { subject: SECRET, body: { contentType: 'html', content: SECRET } },
      messageIds: [SECRET, SECRET],
      confirm: true,
      skiptoken: null,
    });
    expect(out).not.toContain(SECRET);
    expect(out).toContain('top: 10');
    expect(out).toContain(`filter: string(${SECRET.length + 13})`);
    expect(out).toContain('body: object(2 keys)');
    expect(out).toContain('messageIds: array(2)');
    expect(out).toContain('confirm: true');
    expect(out).toContain('skiptoken: null');
  });

  it('counts keys that are not on the known list instead of naming them', () => {
    const out = describeShape({ [SECRET]: 'x', top: 1, [`${SECRET}-2`]: 2 });
    expect(out).toBe('{top: 1, +2 other}');
  });

  it('describes a string or array at the top level without its content', () => {
    expect(describeShape(SECRET)).toBe(`string(${SECRET.length})`);
    expect(describeShape([SECRET])).toBe('array(1)');
  });

  it('masks every path segment that is not a fixed Graph word', () => {
    expect(describeUrl(`/me/drive/root:/${SECRET}.txt:/content`)).toBe(
      '/me/drive/root:/{…}/content'
    );
    expect(describeUrl('/me/messages/AAMkAGVj-abc=/attachments/ATT1/$value')).toBe(
      '/me/messages/{…}/attachments/{…}/$value'
    );
    expect(describeUrl(`/users/${SECRET}@contoso.com/mailFolders/inbox/messages`)).toBe(
      '/users/{…}/mailFolders/inbox/messages'
    );
  });

  it('drops the query string and lists only $-prefixed OData names', () => {
    const url = `https://graph.microsoft.com/v1.0/me/messages?$search=%22${encodeURIComponent(SECRET)}%22&$top=5&${encodeURIComponent(SECRET)}=x`;
    const out = describeUrl(url);
    expect(out).not.toContain(SECRET);
    expect(out).not.toContain(encodeURIComponent(SECRET));
    expect(out).toBe(
      'https://graph.microsoft.com/v1.0/me/messages [query: $search, $top, +1 other]'
    );
    expect(describeUrl('/me/messages')).toBe('/me/messages');
  });

  it('never throws on malformed input', () => {
    expect(describeUrl('/me/messages?%malformed=x&%E0%A4%A=y')).toBe(
      '/me/messages [query: +2 other]'
    );
    expect(describeUrl('')).toBe('');
    expect(describeUrl(`http://${SECRET}/me`)).toBe('{origin}/me');
    expect(describeUrl(undefined as unknown as string)).toBe('undefined');
  });

  it('describes a Graph error by status and code, never by message', () => {
    const err = new GraphApiError(`Invalid filter clause: ${SECRET}`, 400, 'BadRequest');
    expect(describeError(err)).toBe('GraphApiError status=400 code=BadRequest');
  });

  it('shows only known error names, HTTP statuses and short codes', () => {
    const named = new Error(`connect failed while sending ${SECRET}`);
    named.name = SECRET;
    expect(describeError(Object.assign(named, { code: SECRET, status: 999 }))).toBe(
      `Error code=unlisted(${SECRET.length})`
    );
    expect(describeError(Object.assign(new Error('x'), { code: 7000215 }))).toBe(
      'Error code=7000215'
    );
    expect(describeError(Object.assign(new Error('x'), { code: 'ECONNRESET', status: 502 }))).toBe(
      'Error status=502 code=ECONNRESET'
    );
    expect(describeError(SECRET)).toBe('non-error(string)');
  });

  it('keeps stack frames but not the message line', () => {
    const frames = describeStack(new Error(`boom ${SECRET}`));
    expect(frames.length).toBeGreaterThan(0);
    for (const f of frames) {
      expect(f.startsWith('at ')).toBe(true);
      expect(f).not.toContain(SECRET);
    }
    expect(describeStack('x')).toEqual([]);
  });

  it('reports a serialized size without the content', () => {
    expect(serializedSize({ a: 'bc' })).toBe(Buffer.byteLength('{"a":"bc"}'));
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(serializedSize(cyclic)).toBe(-1);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import GraphClient from '../graph-client.js';
import { fetchWithResilience } from '../lib/graph-resilience.js';
import type AuthManager from '../auth.js';

vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/graph-resilience.js', () => ({
  fetchWithResilience: vi.fn(),
  getSharedBreaker: vi.fn(() => ({})),
  loadResilienceConfig: vi.fn(() => ({})),
}));

const fetchWithResilienceMock = vi.mocked(fetchWithResilience);

function createGraphClient() {
  return new GraphClient(
    {
      getToken: vi.fn().mockResolvedValue('token'),
    } as unknown as AuthManager,
    {
      clientId: 'client-id',
      tenantId: 'tenant-id',
      cloudType: 'global',
    }
  );
}

describe('GraphClient audit metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds HTTP status metadata to successful Graph responses', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await createGraphClient().graphRequest('/me');

    expect(result._meta).toMatchObject({ http_status: 200 });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 'user-1' });
  });

  it('derives result volume from a collection response', async () => {
    const body = JSON.stringify({
      value: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=3',
    });
    fetchWithResilienceMock.mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const result = await createGraphClient().graphRequest('/me/messages');

    expect(result._meta).toMatchObject({
      result_count: 3,
      result_has_more: true,
      response_bytes: Buffer.byteLength(body, 'utf8'),
    });
  });

  it('reports result_has_more false, not absent, for a complete collection', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(JSON.stringify({ value: [{ id: 'm1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await createGraphClient().graphRequest('/me/messages');

    // Explicitly false so a consumer can distinguish a complete result from a
    // response that was never a collection.
    expect(result._meta).toMatchObject({ result_count: 1, result_has_more: false });
  });

  it('omits result fields for a single-object response but still records size', async () => {
    const body = JSON.stringify({ id: 'user-1' });
    fetchWithResilienceMock.mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
    );

    const result = await createGraphClient().graphRequest('/me');

    expect(result._meta).toMatchObject({ response_bytes: Buffer.byteLength(body, 'utf8') });
    expect(result._meta).not.toHaveProperty('result_count');
    expect(result._meta).not.toHaveProperty('result_has_more');
  });

  it('records the pre-base64 byte count for binary content', async () => {
    const raw = Buffer.from('binary-attachment-payload-\u00ff\u00fe');
    fetchWithResilienceMock.mockResolvedValue(
      new Response(raw, {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })
    );

    const result = await createGraphClient().graphRequest('/me/messages/m1/$value');

    // The bytes transferred, not the ~1.37x larger base64 the caller receives.
    expect(result._meta).toMatchObject({ response_bytes: raw.byteLength });
  });

  describe('forceBinary', () => {
    // An OLE2 compound-document header (what a Word 97-2003 .doc starts with) plus
    // bytes that are not valid UTF-8. response.text() cannot round-trip this.
    const doc = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0xff, 0xfe, 0x00, 0x41,
    ]);

    it('returns base64 bytes for a content type outside the binary allowlist', async () => {
      fetchWithResilienceMock.mockResolvedValue(
        new Response(doc, { status: 200, headers: { 'content-type': 'application/msword' } })
      );

      const result = await createGraphClient().graphRequest(
        '/me/messages/m1/attachments/a1/$value',
        {
          rawResponse: true,
          forceBinary: true,
        }
      );

      const payload = JSON.parse(result.content[0].text);
      expect(payload).toMatchObject({
        contentType: 'application/msword',
        encoding: 'base64',
        contentLength: doc.byteLength,
      });
      expect(Buffer.from(payload.contentBytes, 'base64').equals(doc)).toBe(true);
      expect(payload).not.toHaveProperty('rawResponse');
      expect(result._meta).toMatchObject({ response_bytes: doc.byteLength });
    });
  });

  describe('never returns lossy text', () => {
    // Bodies that are not valid UTF-8, served under types that are NOT on the
    // binary allowlist and WITHOUT forceBinary. Before: decoded with response.text(),
    // every invalid sequence became U+FFFD and the file was unrecoverable.
    const cases: Array<{ name: string; contentType: string; body: Buffer }> = [
      {
        name: 'Word 97-2003 document',
        contentType: 'application/msword',
        body: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0xff, 0xfe, 0x00, 0x41]),
      },
      {
        name: 'RTF with Windows-1252 quotes',
        contentType: 'application/rtf',
        body: Buffer.from('{\\rtf1\\ansi \x93quoted\x94}', 'latin1'),
      },
      {
        name: '8-bit MIME message',
        contentType: 'message/rfc822',
        body: Buffer.from('Subject: caf\xe9\r\n\r\nna\xefve body\r\n', 'latin1'),
      },
      {
        name: 'text/plain in Windows-1252',
        contentType: 'text/plain; charset=windows-1252',
        body: Buffer.from('caf\xe9 \x96 dash', 'latin1'),
      },
    ];

    for (const c of cases) {
      it(`returns ${c.name} (${c.contentType}) as byte-identical base64`, async () => {
        fetchWithResilienceMock.mockResolvedValue(
          new Response(new Uint8Array(c.body), {
            status: 200,
            headers: { 'content-type': c.contentType },
          })
        );

        const result = await createGraphClient().graphRequest(
          '/me/messages/m1/attachments/a1/$value',
          {
            rawResponse: true,
          }
        );

        const payload = JSON.parse(result.content[0].text);
        expect(payload).not.toHaveProperty('rawResponse');
        expect(payload).toMatchObject({ encoding: 'base64', contentLength: c.body.byteLength });
        expect(Buffer.from(payload.contentBytes, 'base64').equals(c.body)).toBe(true);
        expect(result._meta).toMatchObject({ response_bytes: c.body.byteLength });
      });
    }

    it('still returns valid UTF-8 text as text, byte for byte, BOM included', async () => {
      const body = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('héllo\r\nwörld\n', 'utf8'),
      ]);
      fetchWithResilienceMock.mockResolvedValue(
        new Response(body, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      );

      const result = await createGraphClient().graphRequest(
        '/me/messages/m1/attachments/a1/$value',
        {
          rawResponse: true,
        }
      );

      const payload = JSON.parse(result.content[0].text);
      expect(payload).not.toHaveProperty('contentBytes');
      // response.text() would have dropped the byte-order mark; strict decoding keeps it.
      expect(Buffer.from(payload.rawResponse, 'utf8').equals(body)).toBe(true);
      expect(result._meta).toMatchObject({ response_bytes: body.byteLength });
    });

    it('still parses JSON, even with a leading byte-order mark', async () => {
      const body = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('{"id":"u1"}', 'utf8'),
      ]);
      fetchWithResilienceMock.mockResolvedValue(
        new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
      );

      const result = await createGraphClient().graphRequest('/me');

      expect(JSON.parse(result.content[0].text)).toEqual({ id: 'u1' });
    });
  });

  it('preserves HTTP status metadata when response headers are requested', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'task-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json', etag: 'W/"etag-1"' },
      })
    );

    const result = await createGraphClient().graphRequest('/me/planner/tasks/task-1', {
      includeHeaders: true,
    });

    expect(result._meta).toMatchObject({ http_status: 200 });
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      id: 'task-1',
      _etag: 'W/"etag-1"',
    });
  });

  it('adds HTTP status and Graph error code metadata to failed Graph responses', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'accessDenied',
            message: 'Access denied',
          },
        }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    const result = await createGraphClient().graphRequest('/me/drive');

    expect(result.isError).toBe(true);
    expect(result._meta).toMatchObject({
      http_status: 403,
      error_code: 'accessDenied',
    });
    expect(JSON.parse(result.content[0].text).error).toContain(
      'Microsoft Graph API error: 403 Forbidden'
    );
  });

  it('adds aggregate subrequest metadata to successful Graph batch responses', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            { id: '1', status: 200, body: { id: 'message-1' } },
            {
              id: '2',
              status: 403,
              body: { error: { code: 'accessDenied', message: 'Access denied' } },
            },
            {
              id: '3',
              status: 429,
              body: { error: { code: 'tooManyRequests', message: 'Slow down' } },
            },
            {
              id: '4',
              status: 403,
              body: { error: { code: 'accessDenied', message: 'Access denied' } },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    const result = await createGraphClient().graphRequest('/$batch', {
      method: 'POST',
      body: JSON.stringify({ requests: [] }),
    });

    expect(result.isError).toBeUndefined();
    expect(result._meta).toMatchObject({
      http_status: 200,
      graph_batch_subrequest_count: 4,
      graph_batch_http_status_counts: { '200': 1, '403': 2, '429': 1 },
      graph_batch_error_code_counts: { accessDenied: 2, tooManyRequests: 1 },
    });
  });
});

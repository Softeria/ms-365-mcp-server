import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import type { AuthManager } from '../src/auth.js';
import type { AppSecrets } from '../src/secrets.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const TOKEN = 'token-value';

/**
 * Graph does not always declare a length on `$value` byte responses. Reading the header
 * with `Number()` alone turns "absent" into 0, because `Number(null)` is 0 and
 * `Number.isFinite` accepts it, and the attachment route then sends `content-length: 0`
 * ahead of a body it goes on to stream. An absent length and a declared zero have to stay
 * distinguishable.
 */
describe('downloadStream content-length', () => {
  let client: GraphClient;

  function respondWith(headers: Record<string, string>): void {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(headers),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('bytes'));
          controller.close();
        },
      }),
      text: async () => '',
    }) as unknown as typeof fetch;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GraphClient(
      { getToken: vi.fn().mockResolvedValue(TOKEN) } as unknown as AuthManager,
      { cloudType: 'global' } as unknown as AppSecrets
    );
  });

  it('reports no length when Graph omits the header', async () => {
    respondWith({ 'content-type': 'application/octet-stream' });
    const stream = await client.downloadStream('/me/messages/1/$value');
    expect(stream.contentLength).toBeNull();
  });

  it('keeps a declared zero, which is not the same as an absent header', async () => {
    respondWith({ 'content-type': 'application/octet-stream', 'content-length': '0' });
    const stream = await client.downloadStream('/me/messages/1/$value');
    expect(stream.contentLength).toBe(0);
  });

  it('reports a declared length', async () => {
    respondWith({ 'content-type': 'application/octet-stream', 'content-length': '5' });
    const stream = await client.downloadStream('/me/messages/1/$value');
    expect(stream.contentLength).toBe(5);
  });

  // fetch asks for gzip by default and undici decodes the body, but leaves the header at
  // the compressed size. Forwarding it caps the response short of the bytes being streamed,
  // and the peer sees a 200 with a truncated file.
  it('reports no length when the body arrived encoded and was decoded for us', async () => {
    respondWith({
      'content-type': 'text/plain',
      'content-encoding': 'gzip',
      'content-length': '40',
    });
    const stream = await client.downloadStream('/me/messages/1/$value');
    expect(stream.contentLength).toBeNull();
  });

  it.each(['', '   ', 'chunked', '12abc', '-1', '1.5'])(
    'reports no length for a non-numeric header %j',
    async (value) => {
      respondWith({ 'content-type': 'application/octet-stream', 'content-length': value });
      const stream = await client.downloadStream('/me/messages/1/$value');
      expect(stream.contentLength).toBeNull();
    }
  );
});

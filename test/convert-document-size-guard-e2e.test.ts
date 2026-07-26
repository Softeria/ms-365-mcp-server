import { describe, expect, it } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import GraphClient, { GraphResponseTooLargeError } from '../src/graph-client.js';

/**
 * Real end-to-end proof (not mocked fetch/Response) that convert-document's size guard
 * actually stops a large Graph response from being fully consumed, wall-clock-wise.
 *
 * graph-client.ts's performRequest builds the request URL from cloudEndpoints + apiVersion
 * + the endpoint path, then calls the global `fetch`. Rather than reimplementing any of
 * makeRequest's logic, these tests override global.fetch to redirect to a real local HTTP
 * server while still invoking the real global fetch implementation underneath (undici) -
 * so the request goes over a real loopback TCP socket, through the real
 * fetchWithResilience/performRequest/makeRequest/readBodyWithLimit call chain, exactly as
 * convert-document exercises it in production (accessToken/URL construction aside, which
 * is untouched by this fix and already covered by pre-existing tests).
 *
 * Both servers are deliberately built so that "fully consume the body" would take far
 * longer than the assertions' timeouts - if the fix regressed to buffer-then-check, these
 * tests would time out rather than merely being slow, which is a much stronger signal than
 * a race on milliseconds.
 */

function startServer(
  handler: http.RequestListener
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: (server.address() as AddressInfo).port });
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

function makeClient(): GraphClient {
  return new GraphClient(
    { getToken: async () => 'fake-token' } as Parameters<typeof GraphClient>[0],
    { clientId: 'x', tenantId: 'common', cloudType: 'global' } as Parameters<typeof GraphClient>[1],
    'json'
  );
}

describe('convert-document size guard - real local HTTP server (e2e)', () => {
  it('rejects via Content-Length near-instantly, even though the server would take 20s+ to actually finish', async () => {
    const { server, port } = await startServer((req, res) => {
      res.writeHead(200, {
        'content-type': 'application/pdf',
        // Declares 50 MiB up front. A correctly-fixed client rejects from this header
        // alone and never asks for a single body byte.
        'content-length': String(50 * 1024 * 1024),
      });
      // Node buffers headers until the first write/end, so without this the client's
      // fetch() wouldn't even see the headers (let alone the body) until the 20s timer
      // fires below - flush them immediately so the test actually proves what it claims:
      // the client rejects from the header alone, well before the server sends any body.
      res.flushHeaders();
      // Never actually sends the 50 MiB (or even finishes) within the test's lifetime -
      // if the client incorrectly waited for the body, this test would time out.
      const timer = setTimeout(() => res.end(), 20_000);
      res.on('close', () => clearTimeout(timer));
    });

    const realFetch = global.fetch;
    global.fetch = ((_url: unknown, init?: Parameters<typeof fetch>[1]) =>
      realFetch(`http://127.0.0.1:${port}/oversized-with-content-length`, init)) as typeof fetch;

    try {
      const client = makeClient();
      const start = Date.now();

      await expect(
        client.makeRequest('/drives/d1/items/i1/content', { maxResponseBytes: 1_000_000 })
      ).rejects.toMatchObject({
        name: 'GraphResponseTooLargeError',
        detectedVia: 'content-length',
      });

      const elapsed = Date.now() - start;
      // The server needs 20s to naturally close; a correct fix returns in well under 1s.
      expect(elapsed).toBeLessThan(2_000);
    } finally {
      global.fetch = realFetch;
      await closeServer(server);
    }
  }, 25_000);

  it('aborts partway through a chunked (no Content-Length) body once the running total crosses the limit', async () => {
    const CHUNK_SIZE = 256 * 1024;
    const SAFETY_VALVE_BYTES = 200 * 1024 * 1024; // stop the server if a broken client never aborts
    let bytesWritten = 0;

    const { server, port } = await startServer((req, res) => {
      // No content-length header set -> Node serves this as chunked transfer-encoding,
      // exercising the streaming (no-Content-Length) branch of readBodyWithLimit.
      res.writeHead(200, { 'content-type': 'application/pdf' });
      const chunk = Buffer.alloc(CHUNK_SIZE, 7);
      const interval = setInterval(() => {
        bytesWritten += chunk.byteLength;
        res.write(chunk);
        if (bytesWritten >= SAFETY_VALVE_BYTES) {
          clearInterval(interval);
          res.end();
        }
      }, 20);
      // Client-side reader.cancel() closes the underlying socket; stop writing then.
      res.on('close', () => clearInterval(interval));
    });

    const realFetch = global.fetch;
    global.fetch = ((_url: unknown, init?: Parameters<typeof fetch>[1]) =>
      realFetch(`http://127.0.0.1:${port}/oversized-no-content-length`, init)) as typeof fetch;

    try {
      const client = makeClient();
      const maxResponseBytes = 1_000_000;
      const start = Date.now();

      await expect(
        client.makeRequest('/drives/d1/items/i1/content', { maxResponseBytes })
      ).rejects.toMatchObject({ name: 'GraphResponseTooLargeError', detectedVia: 'stream' });

      const elapsed = Date.now() - start;
      // Reaching the 200 MiB safety valve at 256 KiB/20ms would take ~16s; a correct
      // abort happens after ~4 chunks (~1 MiB), so this must return in well under that.
      expect(elapsed).toBeLessThan(3_000);
      // The server must not have been allowed to reach the safety valve - proof the
      // client actually stopped pulling instead of draining the whole (huge) stream.
      expect(bytesWritten).toBeLessThan(SAFETY_VALVE_BYTES);
    } finally {
      global.fetch = realFetch;
      await closeServer(server);
    }
  }, 25_000);
});

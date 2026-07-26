import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  GraphResponseTooLargeError,
  isBinaryContentType,
  readBodyWithLimit,
} from '../src/graph-client.js';

describe('isBinaryContentType', () => {
  it('returns false for empty/unknown content types', () => {
    expect(isBinaryContentType('')).toBe(false);
    expect(isBinaryContentType('application/json')).toBe(false);
    expect(isBinaryContentType('application/json; charset=utf-8')).toBe(false);
    expect(isBinaryContentType('text/plain')).toBe(false);
    expect(isBinaryContentType('text/html')).toBe(false);
    expect(isBinaryContentType('application/xml')).toBe(false);
  });

  it('returns true for image/* content types', () => {
    expect(isBinaryContentType('image/png')).toBe(true);
    expect(isBinaryContentType('image/jpeg')).toBe(true);
    expect(isBinaryContentType('image/gif')).toBe(true);
    expect(isBinaryContentType('image/webp')).toBe(true);
  });

  it('returns true for video/audio/font content types', () => {
    expect(isBinaryContentType('video/mp4')).toBe(true);
    expect(isBinaryContentType('audio/mpeg')).toBe(true);
    expect(isBinaryContentType('font/woff2')).toBe(true);
  });

  it('returns true for common binary application types', () => {
    expect(isBinaryContentType('application/octet-stream')).toBe(true);
    expect(isBinaryContentType('application/pdf')).toBe(true);
    expect(isBinaryContentType('application/zip')).toBe(true);
  });

  it('returns true for Office document vnd types', () => {
    expect(
      isBinaryContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe(true);
    expect(
      isBinaryContentType(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=binary'
      )
    ).toBe(true);
    expect(isBinaryContentType('application/vnd.ms-excel')).toBe(true);
  });

  it('treats vnd types with json/xml/text subtypes as non-binary', () => {
    expect(isBinaryContentType('application/vnd.api+json')).toBe(false);
    expect(isBinaryContentType('application/vnd.custom+xml')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isBinaryContentType('IMAGE/PNG')).toBe(true);
    expect(isBinaryContentType('Application/Octet-Stream')).toBe(true);
  });

  it('ignores parameters after the semicolon', () => {
    expect(isBinaryContentType('image/jpeg; charset=binary')).toBe(true);
    expect(isBinaryContentType('application/json; charset=utf-8')).toBe(false);
  });
});

describe('GraphClient binary response handling', () => {
  it('reads binary bytes via arrayBuffer and returns base64', async () => {
    // Lazy import so the module graph is fresh for each test run.
    const { default: GraphClient } = await import('../src/graph-client.js');

    // Build a fake JPEG: SOI marker + a tail string. The high bytes would be
    // corrupted by response.text() but must survive arrayBuffer decoding.
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xde, 0xad, 0xbe,
      0xef,
    ]);
    const expectedBase64 = Buffer.from(jpegBytes).toString('base64');

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(jpegBytes, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })) as typeof fetch;

    try {
      const mockAuth = {
        getToken: async () => 'fake-token',
      };
      const mockSecrets = {
        clientId: 'x',
        tenantId: 'common',
        cloudType: 'global',
      };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = (await client.makeRequest('/me/photo/$value')) as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result.contentType).toBe('image/jpeg');
      expect(result.encoding).toBe('base64');
      expect(result.contentLength).toBe(jpegBytes.byteLength);
      expect(result.contentBytes).toBe(expectedBase64);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns a JSON /content body verbatim when rawResponse is set (issue #546)', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');

    // Pretty-printed JSON that JSON.parse->JSON.stringify would not preserve
    // (indentation and trailing newline get dropped).
    const prettyJson = '{\n  "a": 1,\n  "b": 2\n}\n';

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(prettyJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    try {
      const mockAuth = {
        getToken: async () => 'fake-token',
      };
      const mockSecrets = {
        clientId: 'x',
        tenantId: 'common',
        cloudType: 'global',
      };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = (await client.makeRequest('/me/drive/items/x/content', {
        rawResponse: true,
      })) as Record<string, unknown>;

      expect(result.rawResponse).toBe(prettyJson);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('preserves a JSON /content body byte-for-byte through graphRequest (issue #546)', async () => {
    // End-to-end through graphRequest -> formatJsonResponse, the path the
    // download-bytes tool actually uses. The body must survive verbatim in the
    // serialized MCP content, not just at the makeRequest layer.
    const { default: GraphClient } = await import('../src/graph-client.js');

    const prettyJson = '{\n  "a": 1,\n  "b": 2\n}\n';

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(prettyJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    try {
      const mockAuth = {
        getToken: async () => 'fake-token',
      };
      const mockSecrets = {
        clientId: 'x',
        tenantId: 'common',
        cloudType: 'global',
      };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const response = await client.graphRequest('/me/drive/items/x/content', {
        rawResponse: true,
      });
      const payload = JSON.parse(response.content[0].text as string);

      expect(payload.rawResponse).toBe(prettyJson);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('still parses JSON bodies when rawResponse is not set', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response('{"value":42}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    try {
      const mockAuth = {
        getToken: async () => 'fake-token',
      };
      const mockSecrets = {
        clientId: 'x',
        tenantId: 'common',
        cloudType: 'global',
      };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = (await client.makeRequest('/me/messages')) as Record<string, unknown>;

      expect(result.value).toBe(42);
      expect(result.rawResponse).toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('rejects an oversized binary response via makeRequest when maxResponseBytes is set (Content-Length path)', async () => {
    // convert-document is the only caller that passes maxResponseBytes (see graph-tools.ts).
    // This proves makeRequest actually wires readBodyWithLimit in on that opt-in path.
    // The real body here is tiny (10 bytes) - the point is that the fix trusts the
    // Content-Length header and rejects without ever needing to look at the real bytes.
    const { default: GraphClient } = await import('../src/graph-client.js');
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(new Uint8Array(10), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-length': String(50 * 1024 * 1024),
        },
      })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      await expect(
        client.makeRequest('/drives/d1/items/i1/content', { maxResponseBytes: 1024 })
      ).rejects.toThrow(GraphResponseTooLargeError);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('still returns a binary response normally via makeRequest when maxResponseBytes is set but not exceeded', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-length': String(bytes.byteLength) },
      })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = (await client.makeRequest('/drives/d1/items/i1/content', {
        maxResponseBytes: 25 * 1024 * 1024,
      })) as Record<string, unknown>;

      expect(result.contentBytes).toBe(Buffer.from(bytes).toString('base64'));
      expect(result.contentLength).toBe(bytes.byteLength);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('rejects an oversized non-binary (e.g. RTF or plain-text) response when maxResponseBytes is set', async () => {
    // A real code-review finding: an earlier version of this guard covered only the
    // binary-response branch, on the assumption that convert-document only ever "really"
    // deals with binary content. But convert-document accepts arbitrary relative Graph
    // paths, and which branch a response takes is decided by its MIME type, not by the
    // caller's intent - a large text/plain or application/rtf attachment (application/rtf
    // does not match isBinaryContentType's rules) takes the text branch and was buffered
    // in full via response.text() before this fix, regardless of maxResponseBytes. Pinned
    // here with application/rtf specifically, since that's the concrete example that
    // proved the "only binary needs this" assumption wrong.
    const { default: GraphClient } = await import('../src/graph-client.js');

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response('not read', {
        status: 200,
        headers: {
          'content-type': 'application/rtf',
          'content-length': String(50 * 1024 * 1024),
        },
      })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      await expect(
        client.makeRequest('/me/messages/m1/attachments/a1/$value', { maxResponseBytes: 1024 })
      ).rejects.toThrow(GraphResponseTooLargeError);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('still returns a non-binary (JSON) response normally via makeRequest when maxResponseBytes is set but not exceeded', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const smallJson = JSON.stringify({ value: 'hello' });

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(smallJson, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': String(smallJson.length),
        },
      })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = (await client.makeRequest('/me/messages', {
        maxResponseBytes: 1_000_000,
      })) as Record<string, unknown>;

      expect(result.value).toBe(JSON.parse(smallJson).value);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('does not apply maxResponseBytes at all when the caller does not opt in (unset, pre-existing callers unaffected)', async () => {
    // download-bytes and every other pre-existing caller never passes maxResponseBytes, so
    // this must stay exactly as unguarded as it was before either fix - the point of this
    // test is that the option being *unset* is still a real, working escape hatch, not that
    // non-binary responses are unguarded when it *is* set (that was the bug just fixed above).
    const { default: GraphClient } = await import('../src/graph-client.js');
    const bigJson = JSON.stringify({ value: 'x'.repeat(2000) });

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(bigJson, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': String(bigJson.length),
        },
      })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = (await client.makeRequest('/me/messages')) as Record<string, unknown>;

      expect(result.value).toBe(JSON.parse(bigJson).value);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('readBodyWithLimit', () => {
  it('rejects a response whose Content-Length exceeds the limit without ever reading the body', async () => {
    let pulled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled = true;
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(50 * 1024 * 1024),
      },
    });

    let error: unknown;
    try {
      await readBodyWithLimit(response, 1024);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(GraphResponseTooLargeError);
    expect((error as GraphResponseTooLargeError).detectedVia).toBe('content-length');
    expect((error as GraphResponseTooLargeError).limitBytes).toBe(1024);
    expect((error as GraphResponseTooLargeError).reportedOrReadBytes).toBe(50 * 1024 * 1024);
    // The whole point of the Content-Length fast path: the stream is never pulled from.
    expect(pulled).toBe(false);
  });

  it('reads the body normally when Content-Length is under the limit', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const response = new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'content-length': String(bytes.byteLength) },
    });

    const buffer = await readBodyWithLimit(response, 1024);
    expect(buffer).toEqual(Buffer.from(bytes));
  });

  it('streams and reconstructs a body under the limit when Content-Length is absent', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5, 6])];
    let i = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(chunks[i++]);
        } else {
          controller.close();
        }
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });

    const buffer = await readBodyWithLimit(response, 1024);
    expect(buffer).toEqual(Buffer.from([1, 2, 3, 4, 5, 6]));
  });

  it('aborts a chunked body partway through once the running total crosses the limit (no Content-Length)', async () => {
    let chunksServed = 0;
    const totalChunks = 10;
    const chunkSize = 100;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunksServed < totalChunks) {
          chunksServed += 1;
          controller.enqueue(new Uint8Array(chunkSize).fill(chunksServed));
        } else {
          controller.close();
        }
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });

    // Crosses the limit partway through the 3rd 100-byte chunk (300 > 250).
    const maxBytes = 250;
    let error: unknown;
    try {
      await readBodyWithLimit(response, maxBytes);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(GraphResponseTooLargeError);
    expect((error as GraphResponseTooLargeError).detectedVia).toBe('stream');
    expect((error as GraphResponseTooLargeError).reportedOrReadBytes).toBe(300);
    // Aborted after the 3rd chunk - never drained all 10 (which would be 1000 bytes).
    expect(chunksServed).toBe(3);
  });
});

describe('GraphClient file downloads', () => {
  it('streams Graph response bytes straight to a new file', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ms365-download-'));
    const destination = path.join(tempDir, 'attachment.pdf');
    // High bytes (0xff, 0x00, 0x7f) would be mangled by a UTF-8 text decode;
    // streaming to disk must preserve them exactly.
    const fileBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0x00, 0x7f]);

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(fileBytes, {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })) as typeof fetch;

    try {
      const mockAuth = {
        getToken: async () => 'fake-token',
      };
      const mockSecrets = {
        clientId: 'x',
        tenantId: 'common',
        cloudType: 'global',
      };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      const result = await client.downloadToFile(
        '/me/messages/m1/attachments/a1/$value',
        destination
      );

      expect(result).toEqual({
        contentType: 'application/pdf',
        contentLength: fileBytes.byteLength,
      });
      expect(await readFile(destination)).toEqual(Buffer.from(fileBytes));
    } finally {
      global.fetch = originalFetch;
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('never overwrites an existing file and does not hit the network', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ms365-download-'));
    const destination = path.join(tempDir, 'existing.txt');
    await writeFile(destination, 'keep me');

    const originalFetch = global.fetch;
    let fetchCalled = false;
    global.fetch = (async () => {
      fetchCalled = true;
      return new Response('replacement', { status: 200 });
    }) as typeof fetch;

    try {
      const mockAuth = {
        getToken: async () => 'fake-token',
      };
      const mockSecrets = {
        clientId: 'x',
        tenantId: 'common',
        cloudType: 'global',
      };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      // The wx open fails before any request, so the original file survives.
      await expect(
        client.downloadToFile('/me/messages/m1/attachments/a1/$value', destination)
      ).rejects.toMatchObject({ code: 'EEXIST' });
      expect(fetchCalled).toBe(false);
      expect(await readFile(destination, 'utf8')).toBe('keep me');
    } finally {
      global.fetch = originalFetch;
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('removes the just-created file when the download fails', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ms365-download-'));
    const destination = path.join(tempDir, 'partial.bin');

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response('not found', {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      await expect(
        client.downloadToFile('/me/messages/m1/attachments/a1/$value', destination)
      ).rejects.toThrow(/404/);
      // wx creates the file up front, so a failed download must clean it up.
      await expect(readFile(destination)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      global.fetch = originalFetch;
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('maps a 403 scope error to the org-mode hint and leaves no file', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ms365-download-'));
    const destination = path.join(tempDir, 'forbidden.bin');

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response('Missing scope Mail.Read', { status: 403 })) as typeof fetch;

    try {
      const mockAuth = { getToken: async () => 'fake-token' };
      const mockSecrets = { clientId: 'x', tenantId: 'common', cloudType: 'global' };
      const client = new GraphClient(
        mockAuth as Parameters<typeof GraphClient>[0],
        mockSecrets as Parameters<typeof GraphClient>[1],
        'json'
      );

      await expect(
        client.downloadToFile('/me/messages/m1/attachments/a1/$value', destination)
      ).rejects.toThrow(/--org-mode/);
      await expect(readFile(destination)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      global.fetch = originalFetch;
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { isBinaryContentType } from '../src/graph-client.js';

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
});

describe('GraphClient file downloads', () => {
  it('streams Graph response bytes directly to a new file', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ms365-download-test-'));
    const destination = path.join(tempDir, 'attachment.pdf');
    const fileBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0x00, 0x7f]);
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(fileBytes, {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })) as typeof fetch;

    try {
      const client = new GraphClient(
        { getToken: async () => 'fake-token' } as Parameters<typeof GraphClient>[0],
        {
          clientId: 'x',
          tenantId: 'common',
          cloudType: 'global',
        } as Parameters<typeof GraphClient>[1]
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

  it('never overwrites an existing file', async () => {
    const { default: GraphClient } = await import('../src/graph-client.js');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ms365-download-test-'));
    const destination = path.join(tempDir, 'existing.txt');
    await writeFile(destination, 'keep me');
    const originalFetch = global.fetch;
    let fetchCalled = false;
    global.fetch = (async () => {
      fetchCalled = true;
      return new Response('replacement', { status: 200 });
    }) as typeof fetch;

    try {
      const client = new GraphClient(
        { getToken: async () => 'fake-token' } as Parameters<typeof GraphClient>[0],
        {
          clientId: 'x',
          tenantId: 'common',
          cloudType: 'global',
        } as Parameters<typeof GraphClient>[1]
      );

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
});

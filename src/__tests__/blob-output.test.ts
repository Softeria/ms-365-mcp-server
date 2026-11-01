import http from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../graph-client.js';
import { fetchWithResilience, loadResilienceConfig } from '../lib/graph-resilience.js';
import type AuthManager from '../auth.js';

vi.mock('../logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/graph-resilience.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/graph-resilience.js')>()),
  fetchWithResilience: vi.fn(),
}));

const fetchMock = vi.mocked(fetchWithResilience);

const client = () =>
  new GraphClient({ getToken: vi.fn().mockResolvedValue('token') } as unknown as AuthManager, {
    clientId: 'c',
    tenantId: 't',
    cloudType: 'global',
  });

const pdf = Buffer.from('%PDF-1.4 test bytes \u0000\u0001ÿ', 'latin1');
const opts = { forceBinary: true, maxBytes: 1024, blobOutput: { fileName: 'a b.pdf' } };

describe('blob output', () => {
  beforeEach(() => vi.clearAllMocks());

  it('answers a text block and an EmbeddedResource with the exact bytes', async () => {
    fetchMock.mockResolvedValue(
      new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf' } })
    );
    const res = await client().graphRequest('/me/messages/m/attachments/a/$value', opts);

    expect(JSON.parse(res.content[0].text)).toEqual({
      name: 'a b.pdf',
      contentType: 'application/pdf',
      size: pdf.length,
    });
    const item = res.content[1] as unknown as {
      type: string;
      resource: { uri: string; mimeType: string; blob: string };
    };
    expect(item.type).toBe('resource');
    expect(item.resource.uri).toBe('file:///a%20b.pdf');
    expect(item.resource.mimeType).toBe('application/pdf');
    expect(Buffer.from(item.resource.blob, 'base64').equals(pdf)).toBe(true);
  });

  it('keeps the old base64 JSON when blob output is not asked for', async () => {
    fetchMock.mockResolvedValue(
      new Response(pdf, { headers: { 'content-type': 'application/pdf' } })
    );
    const res = await client().graphRequest('/x/$value', { forceBinary: true });
    expect(res.content).toHaveLength(1);
    expect(JSON.parse(res.content[0].text).contentBytes).toBe(pdf.toString('base64'));
  });

  it('refuses a body over the cap by Content-Length without reading it', async () => {
    fetchMock.mockResolvedValue(
      new Response(Buffer.alloc(2048), { headers: { 'content-length': '2048' } })
    );
    const res = await client().graphRequest('/x/$value', opts);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('download limit of 1024 bytes');
  });

  it('stops reading a body over the cap when no length is declared', async () => {
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 512;
        controller.enqueue(new Uint8Array(512));
        if (pulled >= 1024 * 1024) controller.close();
      },
    });
    fetchMock.mockResolvedValue(new Response(body));
    const res = await client().graphRequest('/x/$value', opts);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('download limit of 1024 bytes');
    expect(pulled).toBeLessThan(16 * 1024);
  });

  it('accepts a body exactly at the cap', async () => {
    fetchMock.mockResolvedValue(new Response(Buffer.alloc(1024)));
    const res = await client().graphRequest('/x/$value', opts);
    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0].text).size).toBe(1024);
  });
});

describe('redirects that leave the Graph origin', () => {
  const servers: http.Server[] = [];
  const listen = (h: http.RequestListener) =>
    new Promise<string>((resolve) => {
      const s = http.createServer(h).listen(0, '127.0.0.1', () => {
        servers.push(s);
        resolve(`http://127.0.0.1:${(s.address() as AddressInfo).port}`);
      });
    });
  afterEach(() => servers.splice(0).forEach((s) => s.close()));

  it('arrive without the Authorization header', async () => {
    const real = await vi.importActual<typeof import('../lib/graph-resilience.js')>(
      '../lib/graph-resilience.js'
    );
    let seen: string | undefined = 'unset';
    const other = await listen((req, res) => {
      seen = req.headers.authorization;
      res.end('bytes');
    });
    const graph = await listen((_req, res) => {
      res.writeHead(302, { location: `${other}/file` }).end();
    });
    const res = await real.fetchWithResilience(
      `${graph}/v1.0/x`,
      { headers: { Authorization: 'Bearer secret' } },
      loadResilienceConfig(),
      real.getSharedBreaker()
    );
    expect(await res.text()).toBe('bytes');
    expect(seen).toBeUndefined();
  });
});

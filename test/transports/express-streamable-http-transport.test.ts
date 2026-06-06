import { afterEach, describe, expect, it, vi } from 'vitest';
import express, { type Request, type Response } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ExpressStreamableHTTPServerTransport } from '../../src/lib/transports/express-streamable-http-transport.js';

const webTransportMock = vi.hoisted(() => {
  const handleRequest = vi.fn<() => Promise<globalThis.Response>>();

  class MockWebStandardStreamableHTTPServerTransport {
    sessionId: string | undefined;
    onclose: (() => void) | undefined;
    onerror: ((error: Error) => void) | undefined;
    onmessage: unknown;

    async start(): Promise<void> {}

    async close(): Promise<void> {}

    async send(): Promise<void> {}

    async handleRequest(): Promise<globalThis.Response> {
      return handleRequest();
    }

    closeSSEStream(): void {}

    closeStandaloneSSEStream(): void {}
  }

  return {
    handleRequest,
    WebStandardStreamableHTTPServerTransport: MockWebStandardStreamableHTTPServerTransport,
  };
});

vi.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  WebStandardStreamableHTTPServerTransport:
    webTransportMock.WebStandardStreamableHTTPServerTransport,
}));

describe('ExpressStreamableHTTPServerTransport', () => {
  afterEach(() => {
    webTransportMock.handleRequest.mockReset();
  });

  it('flushes SSE headers before an idle stream emits body data', async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    webTransportMock.handleRequest.mockImplementationOnce(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
        },
      });

      return new globalThis.Response(body, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'text/event-stream',
        },
      });
    });

    const { server, url } = await startServer();
    const abortController = new AbortController();
    let response: globalThis.Response | undefined;

    try {
      response = await withTimeout(fetch(url, { signal: abortController.signal }), 2_000);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(controller).toBeDefined();
    } finally {
      abortController.abort();
      await response?.body?.cancel().catch(() => undefined);
      await closeServer(server);
    }
  });

  it('preserves duplicate Set-Cookie headers from the web response', async () => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', 'mcp.sid=one; Path=/; HttpOnly');
    headers.append('Set-Cookie', 'mcp.csrf=two; Path=/; HttpOnly');
    webTransportMock.handleRequest.mockResolvedValueOnce(
      new globalThis.Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers,
      })
    );

    const { server, url } = await startServer();

    try {
      const response = await withTimeout(fetchWithNodeHttp(url), 2_000);

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toEqual([
        'mcp.sid=one; Path=/; HttpOnly',
        'mcp.csrf=two; Path=/; HttpOnly',
      ]);
    } finally {
      await closeServer(server);
    }
  });
});

async function startServer(): Promise<{ server: http.Server; url: string }> {
  const app = express();
  app.get('/mcp', (req: Request, res: Response) => {
    const transport = new ExpressStreamableHTTPServerTransport();
    void transport.handleRequest(req, res).catch((error: unknown) => {
      if (res.headersSent) return;
      res.status(500).json({ error: (error as Error).message });
    });
  });

  const server = await new Promise<http.Server>((resolve) => {
    const listeningServer = http.createServer(app).listen(0, () => resolve(listeningServer));
  });
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/mcp` };
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function fetchWithNodeHttp(url: string): Promise<http.IncomingMessage> {
  return await new Promise<http.IncomingMessage>((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      response.once('end', () => resolve(response));
    });
    request.once('error', reject);
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('timed out waiting for response headers')),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

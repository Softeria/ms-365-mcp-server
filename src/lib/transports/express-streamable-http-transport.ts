import { Readable } from 'node:stream';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import {
  WebStandardStreamableHTTPServerTransport,
  type WebStandardStreamableHTTPServerTransportOptions,
} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';
import type {
  Transport,
  TransportSendOptions,
} from '@modelcontextprotocol/sdk/shared/transport.js';

export type ExpressStreamableHTTPServerTransportOptions =
  WebStandardStreamableHTTPServerTransportOptions;

export interface ExpressIncomingMessage extends IncomingMessage {
  auth?: AuthInfo;
  originalUrl?: string;
  protocol?: string;
}

/**
 * Express/Node adapter for the SDK's Web Standard Streamable HTTP transport.
 *
 * The SDK's Node wrapper builds a new Hono request listener for every
 * `handleRequest()` call. Hono attaches `finish` listeners to `ServerResponse`
 * for streamed request bodies, which showed up in production as repeated
 * MaxListenersExceeded warnings. This adapter keeps the SDK's protocol logic
 * but writes the returned Web `Response` to Express directly.
 */
export class ExpressStreamableHTTPServerTransport implements Transport {
  private readonly webTransport: WebStandardStreamableHTTPServerTransport;

  constructor(options: ExpressStreamableHTTPServerTransportOptions = {}) {
    this.webTransport = new WebStandardStreamableHTTPServerTransport(options);
  }

  get sessionId(): string | undefined {
    return this.webTransport.sessionId;
  }

  set onclose(handler: (() => void) | undefined) {
    this.webTransport.onclose = handler;
  }

  get onclose(): (() => void) | undefined {
    return this.webTransport.onclose;
  }

  set onerror(handler: ((error: Error) => void) | undefined) {
    this.webTransport.onerror = handler;
  }

  get onerror(): ((error: Error) => void) | undefined {
    return this.webTransport.onerror;
  }

  set onmessage(handler: Transport['onmessage']) {
    this.webTransport.onmessage = handler;
  }

  get onmessage(): Transport['onmessage'] {
    return this.webTransport.onmessage;
  }

  async start(): Promise<void> {
    await this.webTransport.start();
  }

  async close(): Promise<void> {
    await this.webTransport.close();
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    await this.webTransport.send(message, options);
  }

  async handleRequest(
    req: ExpressIncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown
  ): Promise<void> {
    const webRequest = toWebRequest(req, parsedBody);
    const webResponse = await this.webTransport.handleRequest(webRequest, {
      authInfo: req.auth,
      parsedBody,
    });
    await writeWebResponse(webResponse, res);
  }

  closeSSEStream(requestId: RequestId): void {
    this.webTransport.closeSSEStream(requestId);
  }

  closeStandaloneSSEStream(): void {
    this.webTransport.closeStandaloneSSEStream();
  }
}

function toWebRequest(req: ExpressIncomingMessage, parsedBody: unknown): Request {
  const headers = headersFromIncoming(req.headers);
  const method = req.method ?? 'GET';
  const url = absoluteRequestUrl(req);
  const init: ConstructorParameters<typeof Request>[1] = {
    method,
    headers,
  };

  if (method !== 'GET' && method !== 'HEAD' && parsedBody === undefined) {
    init.body = Readable.toWeb(req) as ReadableStream;
    (init as ConstructorParameters<typeof Request>[1] & { duplex: 'half' }).duplex = 'half';
  }

  return new Request(url, init);
}

function headersFromIncoming(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else {
      result.set(name, value);
    }
  }
  return result;
}

function absoluteRequestUrl(req: ExpressIncomingMessage): string {
  const path = req.originalUrl ?? req.url ?? '/';
  const host = firstHeader(req.headers.host) ?? 'localhost';
  const forwardedProto = firstHeaderToken(req.headers['x-forwarded-proto']);
  const protocol =
    normalizeHttpProtocol(forwardedProto) ?? normalizeHttpProtocol(req.protocol) ?? 'http';
  return new URL(path, `${protocol}://${host}`).toString();
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function firstHeaderToken(value: string | string[] | undefined): string | undefined {
  const header = firstHeader(value);
  const token = header?.split(',')[0]?.trim();
  return token && token.length > 0 ? token : undefined;
}

function normalizeHttpProtocol(value: string | undefined): 'http' | 'https' | undefined {
  if (value === 'http' || value === 'https') return value;
  return undefined;
}

const SET_COOKIE_HEADER = 'set-cookie';

function setResponseHeaders(headers: Headers, res: ServerResponse): void {
  const setCookieHeaders = getSetCookieHeaders(headers);
  headers.forEach((value, name) => {
    if (name.toLowerCase() === SET_COOKIE_HEADER && setCookieHeaders.length > 0) return;
    res.setHeader(name, value);
  });
  if (setCookieHeaders.length > 0) {
    res.setHeader(SET_COOKIE_HEADER, setCookieHeaders);
  }
}

function getSetCookieHeaders(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithCookies.getSetCookie === 'function') {
    return headersWithCookies.getSetCookie();
  }

  const value = headers.get(SET_COOKIE_HEADER);
  return value ? splitCombinedSetCookieHeader(value) : [];
}

function splitCombinedSetCookieHeader(value: string): string[] {
  const cookies: string[] = [];
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== ',') continue;
    if (!/^\s*[^=;,]+\s*=/.test(value.slice(index + 1))) continue;
    cookies.push(value.slice(start, index).trim());
    start = index + 1;
  }

  cookies.push(value.slice(start).trim());
  return cookies.filter((cookie) => cookie.length > 0);
}

async function writeWebResponse(response: Response, res: ServerResponse): Promise<void> {
  if (!res.headersSent) {
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    setResponseHeaders(response.headers, res);
  }

  const isEventStream =
    response.headers.get('content-type')?.toLowerCase().includes('text/event-stream') ?? false;

  if (!response.body) {
    res.end();
    return;
  }

  if (isEventStream && !res.headersSent && typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const body = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  await new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      body.removeListener('error', onBodyError);
      res.removeListener('finish', onFinish);
      res.removeListener('close', onClose);
    };
    const onFinish = (): void => {
      cleanup();
      resolve();
    };
    const onClose = (): void => {
      cleanup();
      body.destroy();
      resolve();
    };
    const onBodyError = (error: Error): void => {
      cleanup();
      if (!res.destroyed) res.destroy(error);
      reject(error);
    };

    body.once('error', onBodyError);
    res.once('finish', onFinish);
    res.once('close', onClose);
    body.pipe(res);
  });
}

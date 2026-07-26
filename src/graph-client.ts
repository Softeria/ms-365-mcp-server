import logger from './logger.js';
import AuthManager from './auth.js';
import { encode as toonEncode } from '@toon-format/toon';
import type { AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { getRequestTokens } from './request-context.js';
import {
  fetchWithResilience,
  getSharedBreaker,
  loadResilienceConfig,
} from './lib/graph-resilience.js';
import { open, stat, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';

/**
 * Returns true if the given HTTP Content-Type header indicates a binary
 * payload that must not be decoded as UTF-8 text. Graph returns binary for
 * endpoints like /me/photo/$value, /chats/.../hostedContents/{id}/$value, and
 * /drives/.../items/{id}/content, among others.
 */
export function isBinaryContentType(contentType: string): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase().split(';')[0].trim();
  if (!lower) return false;
  if (
    lower.startsWith('image/') ||
    lower.startsWith('video/') ||
    lower.startsWith('audio/') ||
    lower.startsWith('font/')
  ) {
    return true;
  }
  if (lower === 'application/octet-stream' || lower === 'application/pdf') {
    return true;
  }
  if (lower.startsWith('application/zip') || lower.startsWith('application/x-zip')) {
    return true;
  }
  // Office document MIME types and other vendor-specific binary formats.
  if (lower.startsWith('application/vnd.') || lower.startsWith('application/x-')) {
    // Be conservative: exclude MIME types that use the structured-syntax suffix
    // to declare a text serialization (e.g. application/vnd.api+json).
    if (lower.endsWith('+json') || lower.endsWith('+xml') || lower.endsWith('+text')) {
      return false;
    }
    return true;
  }
  return false;
}

interface GraphRequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string | Buffer | Uint8Array;
  rawResponse?: boolean;
  includeHeaders?: boolean;
  excludeResponse?: boolean;
  accessToken?: string;
  // Graph API version segment for the request path. Defaults to 'v1.0'; endpoints
  // declaring "apiVersion": "beta" in endpoints.json route to the /beta surface.
  apiVersion?: string;
  // Pin this response to JSON regardless of the configured format, so the
  // fetchAllPages merge can JSON.parse each page before re-encoding (#560).
  forceJsonOutput?: boolean;
  // Caps the binary response body makeRequest will hold in memory. Opt-in and unset by
  // default so every pre-existing caller (download-bytes, download-bytes-to-file's own
  // performRequest use, etc.) keeps buffering the whole body exactly as before. Only
  // convert-document passes this today, to stop a large accessible file from being fully
  // buffered (then base64-inflated) before its own post-fetch size cap gets a chance to
  // reject it. See readBodyWithLimit for the enforcement mechanics.
  maxResponseBytes?: number;

  [key: string]: unknown;
}

/**
 * Thrown by readBodyWithLimit when a response body is over the caller-supplied
 * `maxResponseBytes`. `detectedVia` records whether the rejection happened before any
 * bytes were read (trusted the `Content-Length` header) or partway through a stream (no
 * usable Content-Length, so bytes were counted as they arrived) — useful for tests and
 * logs, not load-bearing for callers.
 */
export class GraphResponseTooLargeError extends Error {
  constructor(
    public readonly limitBytes: number,
    public readonly reportedOrReadBytes: number,
    public readonly detectedVia: 'content-length' | 'stream'
  ) {
    super(
      detectedVia === 'content-length'
        ? `Response Content-Length is ${reportedOrReadBytes} bytes, over the ${limitBytes}-byte limit. Rejected before reading the body.`
        : `Response body exceeded the ${limitBytes}-byte limit after at least ${reportedOrReadBytes} bytes were read (no usable Content-Length header was sent); aborted before the full body was buffered.`
    );
    this.name = 'GraphResponseTooLargeError';
  }
}

/**
 * Reads `response`'s body into a single Buffer while enforcing `maxBytes`, without ever
 * holding a full over-limit body in memory.
 *
 * Two layers, cheapest first:
 *
 * 1. Trust a `Content-Length` response header when present: if it already exceeds
 *    `maxBytes`, cancel the body (`response.body.cancel()`, releasing the underlying
 *    connection instead of letting it silently drain) and reject immediately, without
 *    reading a single byte off the wire. Microsoft Graph's binary endpoints
 *    ($value/content/photo) are backed by Exchange/SharePoint/Azure Storage blobs whose
 *    exact size is known upfront (driveItem /content even 302-redirects to a
 *    preauthenticated blob URL that itself supports byte-range requests, which requires a
 *    known length — see learn.microsoft.com/en-us/graph/api/driveitem-get-content), so a
 *    real Content-Length is the common case, not a maybe.
 *
 * 2. Content-Length is still just a header a server chose to send, though — it can be
 *    absent under chunked transfer encoding, proxies that strip it, etc. When it's missing
 *    or unparseable, stream the body via the Web Streams reader, counting bytes as they
 *    arrive, and abort (`reader.cancel()`) the moment the running total crosses `maxBytes`
 *    — so an unbounded body without a Content-Length is still bounded to roughly
 *    `maxBytes` (plus at most one in-flight chunk) of peak memory, never fully buffered
 *    first.
 */
export async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
      throw new GraphResponseTooLargeError(maxBytes, declared, 'content-length');
    }
  }

  if (!response.body) {
    // No stream to read (e.g. a 200 with an empty body) — arrayBuffer() just resolves
    // empty; nothing to guard.
    return Buffer.from(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new GraphResponseTooLargeError(maxBytes, total, 'stream');
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

interface ContentItem {
  type: 'text';
  text: string;

  [key: string]: unknown;
}

interface McpResponse {
  content: ContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;

  [key: string]: unknown;
}

export interface GraphDownloadResult {
  contentType: string;
  contentLength: number;
}

class GraphClient {
  private authManager: AuthManager;
  private secrets: AppSecrets;
  private readonly outputFormat: 'json' | 'toon' = 'json';

  constructor(
    authManager: AuthManager,
    secrets: AppSecrets,
    outputFormat: 'json' | 'toon' = 'json'
  ) {
    this.authManager = authManager;
    this.secrets = secrets;
    this.outputFormat = outputFormat;
  }

  async makeRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<unknown> {
    const contextTokens = getRequestTokens();
    const accessToken =
      options.accessToken ?? contextTokens?.accessToken ?? (await this.authManager.getToken());

    if (!accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await this.performRequest(endpoint, accessToken, options);

      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('scope') || errorText.includes('permission')) {
          throw new Error(
            `Microsoft Graph API scope error: ${response.status} ${response.statusText} - ${errorText}. This tool requires organization mode. Please restart with --org-mode flag.`
          );
        }
        throw new Error(
          `Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      if (!response.ok) {
        throw new Error(
          `Microsoft Graph API error: ${response.status} ${response.statusText} - ${await response.text()}`
        );
      }

      const contentTypeHeader = response.headers?.get?.('content-type') || '';
      const isBinaryResponse = isBinaryContentType(contentTypeHeader);

      let result: any;

      if (isBinaryResponse) {
        // Binary payloads (images, video, pdf, octet-stream, etc.) must not be
        // decoded with response.text() — that performs a lossy UTF-8 decode and
        // replaces every high byte with U+FFFD, destroying the file. Read the
        // raw bytes and return them as base64 so callers can reconstruct them.
        //
        // maxResponseBytes is opt-in (only convert-document passes it): when unset, this
        // is exactly the old unconditional arrayBuffer() read, so download-bytes and every
        // other existing caller is unaffected. When set, readBodyWithLimit enforces it
        // without ever buffering a full over-limit body first — see its doc comment.
        const buffer =
          options.maxResponseBytes !== undefined
            ? await readBodyWithLimit(response, options.maxResponseBytes)
            : Buffer.from(await response.arrayBuffer());
        result = {
          message: 'OK!',
          contentType: contentTypeHeader,
          encoding: 'base64',
          contentLength: buffer.byteLength,
          contentBytes: buffer.toString('base64'),
        };
      } else {
        const text = await response.text();

        if (text === '') {
          result = { message: 'OK!' };
        } else if (options.rawResponse) {
          // download-bytes on /content wants the body verbatim. A JSON body
          // would otherwise round-trip through JSON.parse -> JSON.stringify,
          // which is lossy (whitespace, trailing newline, key order, number
          // formatting). Return the raw text instead. (issue #546)
          result = { message: 'OK!', rawResponse: text };
        } else {
          try {
            result = JSON.parse(text);
          } catch {
            result = { message: 'OK!', rawResponse: text };
          }
        }
      }

      // If includeHeaders is requested, add response headers to the result
      if (options.includeHeaders) {
        const etag = response.headers.get('ETag') || response.headers.get('etag');

        // Simple approach: just add ETag to the result if it's an object
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          return {
            ...result,
            _etag: etag || 'no-etag-found',
          };
        }
      }

      return result;
    } catch (error) {
      logger.error('Microsoft Graph API request failed:', error);
      throw error;
    }
  }

  /**
   * Stream Graph byte content straight to a file, without holding the whole
   * payload in memory. download-bytes-to-file uses this for big mail attachments
   * and meeting recordings, where makeRequest's base64 buffering would blow up
   * memory or hit V8's max string length. Creates the file with wx + 0o600 (never
   * overwrites) and removes a partial file if the transfer fails.
   */
  async downloadToFile(
    endpoint: string,
    destinationPath: string,
    options: Pick<GraphRequestOptions, 'accessToken' | 'apiVersion'> = {}
  ): Promise<GraphDownloadResult> {
    const fileHandle = await open(destinationPath, 'wx', 0o600);
    let completed = false;

    try {
      const contextTokens = getRequestTokens();
      const accessToken =
        options.accessToken ?? contextTokens?.accessToken ?? (await this.authManager.getToken());
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await this.performRequest(endpoint, accessToken, options);
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('scope') || errorText.includes('permission')) {
          throw new Error(
            `Microsoft Graph API scope error: ${response.status} ${response.statusText} - ${errorText}. This tool requires organization mode. Please restart with --org-mode flag.`
          );
        }
        throw new Error(
          `Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
      if (!response.ok) {
        throw new Error(
          `Microsoft Graph API error: ${response.status} ${response.statusText} - ${await response.text()}`
        );
      }
      if (!response.body) {
        throw new Error('Microsoft Graph returned an empty response body');
      }

      await pipeline(response.body, fileHandle.createWriteStream());
      // Bytes are on disk now - a stat() hiccup past here must not delete them
      // (that also blocks a retry, since we never overwrite).
      completed = true;

      let contentLength: number;
      try {
        contentLength = (await stat(destinationPath)).size;
      } catch {
        const header = Number(response.headers.get('content-length'));
        contentLength = Number.isFinite(header) ? header : 0;
      }

      return {
        contentType: response.headers.get('content-type') || 'application/octet-stream',
        contentLength,
      };
    } catch (error) {
      logger.error('Microsoft Graph file download failed:', error);
      throw error;
    } finally {
      await fileHandle.close().catch(() => undefined);
      if (!completed) {
        await unlink(destinationPath).catch(() => undefined);
      }
    }
  }

  private async performRequest(
    endpoint: string,
    accessToken: string,
    options: GraphRequestOptions
  ): Promise<Response> {
    const cloudEndpoints = getCloudEndpoints(this.secrets.cloudType);
    const apiVersion = options.apiVersion || 'v1.0';
    const url = `${cloudEndpoints.graphApi}/${apiVersion}${endpoint}`;

    logger.info(`[GRAPH CLIENT] Final URL being sent to Microsoft: ${url}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetchWithResilience(
      url,
      {
        method: options.method || 'GET',
        headers,
        // Node's fetch accepts Buffer/Uint8Array; TS BodyInit doesn't.
        body: options.body as unknown as string,
      },
      loadResilienceConfig(),
      getSharedBreaker()
    );
  }

  private serializeData(data: unknown, outputFormat: 'json' | 'toon', pretty = false): string {
    if (outputFormat === 'toon') {
      try {
        return toonEncode(data);
      } catch (error) {
        logger.warn(`Failed to encode as TOON, falling back to JSON: ${error}`);
        return JSON.stringify(data, null, pretty ? 2 : undefined);
      }
    }
    return JSON.stringify(data, null, pretty ? 2 : undefined);
  }

  /**
   * Encode a value in the configured format (json/toon). The fetchAllPages merge
   * uses this to encode the combined result once, after parsing pages as JSON (#560).
   * Compact by default like JSON.stringify, so JSON-mode output is byte-identical.
   */
  serialize(data: unknown, pretty = false): string {
    return this.serializeData(data, this.outputFormat, pretty);
  }

  async graphRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
    try {
      // Redact accessToken from log output to prevent credential leakage (#601)
      const { accessToken: _redacted, ...safeOptions } = options;
      logger.info(
        `Calling ${endpoint} with options: ${JSON.stringify(safeOptions)}${_redacted ? ' [accessToken=REDACTED]' : ''}`
      );

      // Use new OAuth-aware request method
      const result = await this.makeRequest(endpoint, options);

      // forceJsonOutput keeps this body JSON so the fetchAllPages merge can parse
      // it; otherwise --toon would make the merge's JSON.parse throw (#560).
      const outputFormat = options.forceJsonOutput ? 'json' : this.outputFormat;

      return this.formatJsonResponse(
        result,
        options.rawResponse,
        options.excludeResponse,
        outputFormat
      );
    } catch (error) {
      logger.error(`Error in Graph API request: ${error}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
      };
    }
  }

  formatJsonResponse(
    data: unknown,
    rawResponse = false,
    excludeResponse = false,
    outputFormat: 'json' | 'toon' = this.outputFormat
  ): McpResponse {
    // If excludeResponse is true, only return success indication
    if (excludeResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }, outputFormat) }],
      };
    }

    // Handle the case where data includes headers metadata
    if (data && typeof data === 'object' && '_headers' in data) {
      const responseData = data as {
        data: unknown;
        _headers: Record<string, string>;
        _etag?: string;
      };

      const meta: Record<string, unknown> = {};
      if (responseData._etag) {
        meta.etag = responseData._etag;
      }
      if (responseData._headers) {
        meta.headers = responseData._headers;
      }

      if (rawResponse) {
        return {
          content: [{ type: 'text', text: this.serializeData(responseData.data, outputFormat) }],
          _meta: meta,
        };
      }

      if (responseData.data === null || responseData.data === undefined) {
        return {
          content: [{ type: 'text', text: this.serializeData({ success: true }, outputFormat) }],
          _meta: meta,
        };
      }

      // Remove OData properties
      const removeODataProps = (obj: Record<string, unknown>): void => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach((key) => {
            if (
              key.startsWith('@odata.') &&
              key !== '@odata.nextLink' &&
              key !== '@odata.deltaLink'
            ) {
              delete obj[key];
            } else if (typeof obj[key] === 'object') {
              removeODataProps(obj[key] as Record<string, unknown>);
            }
          });
        }
      };

      removeODataProps(responseData.data as Record<string, unknown>);

      return {
        content: [
          { type: 'text', text: this.serializeData(responseData.data, outputFormat, true) },
        ],
        _meta: meta,
      };
    }

    // Original handling for backward compatibility
    if (rawResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData(data, outputFormat) }],
      };
    }

    if (data === null || data === undefined) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }, outputFormat) }],
      };
    }

    // Remove OData properties
    const removeODataProps = (obj: Record<string, unknown>): void => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
          if (
            key.startsWith('@odata.') &&
            key !== '@odata.nextLink' &&
            key !== '@odata.deltaLink'
          ) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeODataProps(obj[key] as Record<string, unknown>);
          }
        });
      }
    };

    removeODataProps(data as Record<string, unknown>);

    return {
      content: [{ type: 'text', text: this.serializeData(data, outputFormat, true) }],
    };
  }
}

export default GraphClient;

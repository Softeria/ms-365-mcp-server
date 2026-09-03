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
import { applyMessageSignoffToRequest } from './lib/message-signoff.js';
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

  [key: string]: unknown;
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

interface GraphResponseMetadata {
  http_status: number;
  error_code?: string;
  graph_batch_subrequest_count?: number;
  graph_batch_http_status_counts?: Record<string, number>;
  graph_batch_error_code_counts?: Record<string, number>;
}

interface GraphRequestResult {
  data: unknown;
  metadata: GraphResponseMetadata;
}

export interface GraphDownloadResult {
  contentType: string;
  contentLength: number;
  httpStatus: number;
}

export class GraphApiError extends Error {
  readonly httpStatus: number;
  readonly graphErrorCode?: string;

  constructor(message: string, httpStatus: number, graphErrorCode?: string) {
    super(message);
    this.name = 'GraphApiError';
    this.httpStatus = httpStatus;
    this.graphErrorCode = graphErrorCode;
  }
}

function extractGraphErrorCode(errorText: string): string | undefined {
  try {
    const body = JSON.parse(errorText) as { error?: { code?: unknown }; code?: unknown };
    const code = body.error?.code ?? body.code;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

function definedMetadata(metadata: Partial<GraphResponseMetadata>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function extractGraphErrorCodeFromBody(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  const error = body.error;
  const code = isRecord(error) ? error.code : body.code;
  return typeof code === 'string' ? code : undefined;
}

function extractBatchMetadata(data: unknown): Partial<GraphResponseMetadata> {
  if (!isRecord(data) || !Array.isArray(data.responses)) return {};

  const httpStatusCounts: Record<string, number> = {};
  const errorCodeCounts: Record<string, number> = {};

  for (const item of data.responses) {
    if (!isRecord(item)) continue;
    const status = item.status;
    if (typeof status !== 'number' || !Number.isInteger(status)) continue;

    incrementCount(httpStatusCounts, String(status));

    if (status >= 400) {
      const errorCode = extractGraphErrorCodeFromBody(item.body);
      if (errorCode) {
        incrementCount(errorCodeCounts, errorCode);
      }
    }
  }

  return {
    graph_batch_subrequest_count: data.responses.length,
    ...(Object.keys(httpStatusCounts).length > 0
      ? { graph_batch_http_status_counts: httpStatusCounts }
      : {}),
    ...(Object.keys(errorCodeCounts).length > 0
      ? { graph_batch_error_code_counts: errorCodeCounts }
      : {}),
  };
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
    return (await this.makeRequestWithMetadata(endpoint, options)).data;
  }

  private async makeRequestWithMetadata(
    endpoint: string,
    options: GraphRequestOptions = {}
  ): Promise<GraphRequestResult> {
    const contextTokens = getRequestTokens();
    const accessToken =
      options.accessToken ?? contextTokens?.accessToken ?? (await this.authManager.getToken());

    if (!accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await this.performRequest(endpoint, accessToken, options);

      if (response.status === 403) {
        throw await this.createGraphApiError(response);
      }

      if (!response.ok) {
        throw await this.createGraphApiError(response);
      }

      const contentTypeHeader = response.headers?.get?.('content-type') || '';
      const isBinaryResponse = isBinaryContentType(contentTypeHeader);
      let metadata: GraphResponseMetadata = { http_status: response.status };

      let result: any;

      if (isBinaryResponse) {
        // Binary payloads (images, video, pdf, octet-stream, etc.) must not be
        // decoded with response.text() — that performs a lossy UTF-8 decode and
        // replaces every high byte with U+FFFD, destroying the file. Read the
        // raw bytes and return them as base64 so callers can reconstruct them.
        const buffer = Buffer.from(await response.arrayBuffer());
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

      if (endpoint === '/$batch') {
        metadata = { ...metadata, ...extractBatchMetadata(result) };
      }

      // If includeHeaders is requested, add response headers to the result
      if (options.includeHeaders) {
        const etag = response.headers.get('ETag') || response.headers.get('etag');

        // Simple approach: just add ETag to the result if it's an object
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          return {
            data: {
              ...result,
              _etag: etag || 'no-etag-found',
            },
            metadata,
          };
        }
      }

      return { data: result, metadata };
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
  /**
   * Fetch Graph binary content and hand back the undrained response stream.
   *
   * Same auth, same resilience and the same error mapping as `downloadToFile`,
   * which is the reason this exists rather than the attachment route calling
   * `fetch` for itself: token acquisition, the OBO/bearer context tokens, retry
   * and the 403-scope special case are all in `performRequest`, which is
   * private. Splitting them would give the route a second, quietly divergent
   * copy of the auth path.
   *
   * The caller owns the body from here and MUST consume or cancel it -- an
   * abandoned stream holds a socket open until the agent times out.
   */
  async downloadStream(
    endpoint: string,
    options: Pick<GraphRequestOptions, 'accessToken' | 'apiVersion'> = {}
  ): Promise<{
    body: NonNullable<Response['body']>;
    contentType: string;
    contentLength: number | null;
    contentDisposition: string | null;
  }> {
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

    const headerLength = Number(response.headers.get('content-length'));
    return {
      body: response.body,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentLength: Number.isFinite(headerLength) ? headerLength : null,
      contentDisposition: response.headers.get('content-disposition'),
    };
  }

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
        throw await this.createGraphApiError(response);
      }
      if (!response.ok) {
        throw await this.createGraphApiError(response);
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
        httpStatus: response.status,
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

  private async createGraphApiError(response: Response): Promise<GraphApiError> {
    const errorText = await response.text();
    const graphErrorCode = extractGraphErrorCode(errorText);
    const isPermissionOrScopeError =
      errorText.includes('scope') || errorText.includes('permission');

    if (response.status === 403 && isPermissionOrScopeError) {
      return new GraphApiError(
        `Microsoft Graph API scope error: ${response.status} ${response.statusText} - ${errorText}. This tool requires organization mode. Please restart with --org-mode flag.`,
        response.status,
        graphErrorCode
      );
    }

    return new GraphApiError(
      `Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`,
      response.status,
      graphErrorCode
    );
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

    const method = options.method || 'GET';
    // Signoff gate sits at the outbound chokepoint, keyed on method + path, so
    // every route to a message write - tool aliases, PATCH edits and $batch
    // sub-requests alike - passes through it.
    const body = applyMessageSignoffToRequest(method, endpoint, options.body);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetchWithResilience(
      url,
      {
        method,
        headers,
        // Node's fetch accepts Buffer/Uint8Array; TS BodyInit doesn't.
        body: body as unknown as string,
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
      const { data, metadata } = await this.makeRequestWithMetadata(endpoint, options);

      // forceJsonOutput keeps this body JSON so the fetchAllPages merge can parse
      // it; otherwise --toon would make the merge's JSON.parse throw (#560).
      const outputFormat = options.forceJsonOutput ? 'json' : this.outputFormat;

      return this.withResponseMetadata(
        this.formatJsonResponse(data, options.rawResponse, options.excludeResponse, outputFormat),
        metadata
      );
    } catch (error) {
      logger.error(`Error in Graph API request: ${error}`);
      const metadata =
        error instanceof GraphApiError
          ? definedMetadata({
              http_status: error.httpStatus,
              error_code: error.graphErrorCode,
            })
          : undefined;
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
        ...(metadata && Object.keys(metadata).length > 0 ? { _meta: metadata } : {}),
      };
    }
  }

  private withResponseMetadata(
    response: McpResponse,
    metadata: Partial<GraphResponseMetadata>
  ): McpResponse {
    const cleanMetadata = definedMetadata(metadata);
    if (Object.keys(cleanMetadata).length === 0) return response;

    return {
      ...response,
      _meta: {
        ...response._meta,
        ...cleanMetadata,
      },
    };
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

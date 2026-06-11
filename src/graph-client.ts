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
  if (lower === 'application/octet-stream' || lower === 'application/pdf') return true;
  if (lower.startsWith('application/zip') || lower.startsWith('application/x-zip')) return true;
  if (lower.startsWith('application/vnd.') || lower.startsWith('application/x-')) {
    if (lower.endsWith('+json') || lower.endsWith('+xml') || lower.endsWith('+text')) return false;
    return true;
  }
  return false;
}

function normalizeOneDriveEndpoint(endpoint: string): string {
  const [pathPart, queryAndHash = ''] = endpoint.split(/(?=[?#])/, 2);
  let normalizedPath = pathPart;

  normalizedPath = normalizedPath.replace(/^\/me\/drive\/items\/root(?=\/|$)/i, '/me/drive/root');
  normalizedPath = normalizedPath.replace(
    /^\/users\/([^/]+)\/drive\/items\/root(?=\/|$)/i,
    '/users/$1/drive/root'
  );
  normalizedPath = normalizedPath.replace(
    /^\/drives\/([^/]+)\/items\/root(?=\/|$)/i,
    '/drives/$1/root'
  );

  normalizedPath = normalizedPath.replace(/^\/drives\/(b![^/]+)\/root(?=\/|$|:)/i, '/me/drive/root');
  normalizedPath = normalizedPath.replace(/^\/drives\/(b![^/]+)\/items(?=\/|$|:)/i, '/me/drive/items');
  normalizedPath = normalizedPath.replace(/^\/drives\/(b![^/]+)\/search(?=\(|\/|$)/i, '/me/drive/search');

  if (normalizedPath !== pathPart) {
    logger.info(`[GRAPH CLIENT] Normalized OneDrive endpoint from ${pathPart} to ${normalizedPath}`);
  }

  return `${normalizedPath}${queryAndHash}`;
}

interface GraphRequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string | Buffer | Uint8Array;
  rawResponse?: boolean;
  includeHeaders?: boolean;
  excludeResponse?: boolean;
  accessToken?: string;
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

    if (!accessToken) throw new Error('No access token available');

    try {
      const response = await this.performRequest(endpoint, accessToken, options);

      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('scope') || errorText.includes('permission')) {
          throw new Error(
            `Microsoft Graph API scope error: ${response.status} ${response.statusText} - ${errorText}. This tool requires organization mode. Please restart with --org-mode flag.`
          );
        }
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`);
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
        } else {
          try {
            result = JSON.parse(text);
          } catch {
            result = { message: 'OK!', rawResponse: text };
          }
        }
      }

      if (options.includeHeaders) {
        const etag = response.headers.get('ETag') || response.headers.get('etag');
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          return { ...result, _etag: etag || 'no-etag-found' };
        }
      }

      return result;
    } catch (error) {
      logger.error('Microsoft Graph API request failed:', error);
      throw error;
    }
  }

  private async performRequest(
    endpoint: string,
    accessToken: string,
    options: GraphRequestOptions
  ): Promise<Response> {
    const cloudEndpoints = getCloudEndpoints(this.secrets.cloudType);
    const normalizedEndpoint = normalizeOneDriveEndpoint(endpoint);
    const url = `${cloudEndpoints.graphApi}/v1.0${normalizedEndpoint}`;

    logger.info(`[GRAPH CLIENT] Final URL being sent to Microsoft: ${url}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

    return fetchWithResilience(
      url,
      {
        method: options.method || 'GET',
        headers,
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

  async graphRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
    try {
      logger.info(`Calling ${endpoint} with options: ${JSON.stringify(options)}`);
      const result = await this.makeRequest(endpoint, options);
      return this.formatJsonResponse(result, options.rawResponse, options.excludeResponse);
    } catch (error) {
      logger.error(`Error in Graph API request: ${error}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
      };
    }
  }

  formatJsonResponse(data: unknown, rawResponse = false, excludeResponse = false): McpResponse {
    if (excludeResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }, this.outputFormat) }],
      };
    }

    if (data && typeof data === 'object' && '_headers' in data) {
      const responseData = data as {
        data: unknown;
        _headers: Record<string, string>;
        _etag?: string;
      };
      const meta: Record<string, unknown> = {};
      if (responseData._etag) meta.etag = responseData._etag;
      if (responseData._headers) meta.headers = responseData._headers;

      if (rawResponse) {
        return {
          content: [{ type: 'text', text: this.serializeData(responseData.data, this.outputFormat) }],
          _meta: meta,
        };
      }

      if (responseData.data === null || responseData.data === undefined) {
        return {
          content: [{ type: 'text', text: this.serializeData({ success: true }, this.outputFormat) }],
          _meta: meta,
        };
      }

      const removeODataProps = (obj: Record<string, unknown>): void => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach((key) => {
            if (key.startsWith('@odata.') && key !== '@odata.nextLink') {
              delete obj[key];
            } else if (typeof obj[key] === 'object') {
              removeODataProps(obj[key] as Record<string, unknown>);
            }
          });
        }
      };

      removeODataProps(responseData.data as Record<string, unknown>);
      return {
        content: [{ type: 'text', text: this.serializeData(responseData.data, this.outputFormat, true) }],
        _meta: meta,
      };
    }

    if (rawResponse) {
      return { content: [{ type: 'text', text: this.serializeData(data, this.outputFormat) }] };
    }

    if (data === null || data === undefined) {
      return { content: [{ type: 'text', text: this.serializeData({ success: true }, this.outputFormat) }] };
    }

    const removeODataProps = (obj: Record<string, unknown>): void => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
          if (key.startsWith('@odata.') && key !== '@odata.nextLink') {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeODataProps(obj[key] as Record<string, unknown>);
          }
        });
      }
    };

    removeODataProps(data as Record<string, unknown>);
    return { content: [{ type: 'text', text: this.serializeData(data, this.outputFormat, true) }] };
  }
}

export default GraphClient;

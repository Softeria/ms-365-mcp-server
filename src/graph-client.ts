import logger from './logger.js';
import AuthManager from './auth.js';
import { refreshAccessToken } from './lib/microsoft-auth.js';
// HARDENED: @toon-format/toon removed — only JSON output in this fork.
import type { AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { getRequestTokens } from './request-context.js';
import { auditLog } from './security/audit-logger.js';

interface GraphRequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  rawResponse?: boolean;
  includeHeaders?: boolean;
  excludeResponse?: boolean;
  accessToken?: string;
  refreshToken?: string;
  /** HARDENED: tool alias for the audit trail. Passed by graph-tools. */
  _toolName?: string;

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

  constructor(authManager: AuthManager, secrets: AppSecrets) {
    this.authManager = authManager;
    this.secrets = secrets;
  }

  async makeRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<unknown> {
    const contextTokens = getRequestTokens();
    let accessToken =
      options.accessToken ?? contextTokens?.accessToken ?? (await this.authManager.getToken());
    const refreshToken = options.refreshToken ?? contextTokens?.refreshToken;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    try {
      let response = await this.performRequest(endpoint, accessToken, options);

      if (response.status === 401 && refreshToken) {
        // Token expired, try to refresh
        const newTokens = await this.refreshAccessToken(refreshToken);
        accessToken = newTokens.accessToken;

        // Retry the request with new token
        response = await this.performRequest(endpoint, accessToken, options);
      }

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

      const text = await response.text();
      let result: any;

      if (text === '') {
        result = { message: 'OK!' };
      } else {
        try {
          result = JSON.parse(text);
        } catch {
          result = { message: 'OK!', rawResponse: text };
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

  private async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const tenantId = this.secrets.tenantId || 'common';
    const clientId = this.secrets.clientId;
    const clientSecret = this.secrets.clientSecret;

    // Log whether using public or confidential client
    if (clientSecret) {
      logger.info('GraphClient: Refreshing token with confidential client');
    } else {
      logger.info('GraphClient: Refreshing token with public client');
    }

    const response = await refreshAccessToken(
      refreshToken,
      clientId,
      clientSecret,
      tenantId,
      this.secrets.cloudType
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  private async performRequest(
    endpoint: string,
    accessToken: string,
    options: GraphRequestOptions
  ): Promise<Response> {
    const cloudEndpoints = getCloudEndpoints(this.secrets.cloudType);
    const url = `${cloudEndpoints.graphApi}/v1.0${endpoint}`;

    logger.info(`[GRAPH CLIENT] Final URL being sent to Microsoft: ${url}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });
  }

  private serializeData(data: unknown, pretty = false): string {
    return JSON.stringify(data, null, pretty ? 2 : undefined);
  }

  async graphRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
    // HARDENED: capture timing + status for the audit trail. We emit one
    // line per call whether it succeeded or failed.
    const startedAt = Date.now();
    let status = 0;
    try {
      logger.info(`Calling ${endpoint} with options: ${JSON.stringify(options)}`);

      // Use new OAuth-aware request method
      const result = await this.makeRequest(endpoint, options);
      status = 200;

      return this.formatJsonResponse(result, options.rawResponse, options.excludeResponse);
    } catch (error) {
      logger.error(`Error in Graph API request: ${error}`);
      const match = (error as Error).message.match(/Microsoft Graph API[^:]*:\s*(\d{3})/);
      status = match?.[1] ? parseInt(match[1], 10) : 0;
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
      };
    } finally {
      auditLog({
        tool: options._toolName ?? 'unknown',
        method: (options.method ?? 'GET').toUpperCase(),
        path: endpoint,
        scopes: [...this.authManager.getScopes()],
        account: this.authManager.getSelectedAccountId(),
        status,
        duration_ms: Date.now() - startedAt,
      });
    }
  }

  formatJsonResponse(data: unknown, rawResponse = false, excludeResponse = false): McpResponse {
    // If excludeResponse is true, only return success indication
    if (excludeResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }) }],
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
          content: [
            { type: 'text', text: this.serializeData(responseData.data) },
          ],
          _meta: meta,
        };
      }

      if (responseData.data === null || responseData.data === undefined) {
        return {
          content: [
            { type: 'text', text: this.serializeData({ success: true }) },
          ],
          _meta: meta,
        };
      }

      // Remove OData properties
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
        content: [
          { type: 'text', text: this.serializeData(responseData.data, true) },
        ],
        _meta: meta,
      };
    }

    // Original handling for backward compatibility
    if (rawResponse) {
      return {
        content: [{ type: 'text', text: this.serializeData(data) }],
      };
    }

    if (data === null || data === undefined) {
      return {
        content: [{ type: 'text', text: this.serializeData({ success: true }) }],
      };
    }

    // Remove OData properties
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

    return {
      content: [{ type: 'text', text: this.serializeData(data, true) }],
    };
  }
}

export default GraphClient;

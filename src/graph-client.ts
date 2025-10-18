import logger from './logger.js';
import AuthManager from './auth.js';
import { refreshAccessToken } from './lib/microsoft-auth.js';

interface GraphRequestOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  rawResponse?: boolean;
  includeHeaders?: boolean;
  accessToken?: string;
  refreshToken?: string;

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
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  setOAuthTokens(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken || null;
  }

  async makeRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<unknown> {
    // Use OAuth tokens if available, otherwise fall back to authManager
    let accessToken =
      options.accessToken || this.accessToken || (await this.authManager.getToken());
    let refreshToken = options.refreshToken || this.refreshToken;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    try {
      let response = await this.performRequest(endpoint, accessToken, options);

      if (response.status === 401 && refreshToken) {
        // Token expired, try to refresh
        await this.refreshAccessToken(refreshToken);

        // Update token for retry
        accessToken = this.accessToken || accessToken;
        if (!accessToken) {
          throw new Error('Failed to refresh access token');
        }

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

  private async refreshAccessToken(refreshToken: string): Promise<void> {
    const tenantId = process.env.MS365_MCP_TENANT_ID || 'common';
    const clientId = process.env.MS365_MCP_CLIENT_ID || '084a3e9f-a9f4-43f7-89f9-d229cf97853e';
    const clientSecret = process.env.MS365_MCP_CLIENT_SECRET;

    if (!clientSecret) {
      throw new Error('MS365_MCP_CLIENT_SECRET not configured');
    }

    const response = await refreshAccessToken(refreshToken, clientId, clientSecret, tenantId);
    this.accessToken = response.access_token;
    if (response.refresh_token) {
      this.refreshToken = response.refresh_token;
    }
  }

  private async performRequest(
    endpoint: string,
    accessToken: string,
    options: GraphRequestOptions
  ): Promise<Response> {
    const url = `https://graph.microsoft.com/v1.0${endpoint}`;

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

  async graphRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
    try {
      logger.info(`Calling ${endpoint} with options: ${JSON.stringify(options)}`);

      // Use new OAuth-aware request method
      const result = await this.makeRequest(endpoint, options);

      return this.formatJsonResponse(result, options.rawResponse);
    } catch (error) {
      logger.error(`Error in Graph API request: ${error}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
      };
    }
  }

  formatJsonResponse(data: unknown, rawResponse = false): McpResponse {
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
          content: [{ type: 'text', text: JSON.stringify(responseData.data) }],
          _meta: meta,
        };
      }

      if (responseData.data === null || responseData.data === undefined) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
          _meta: meta,
        };
      }

      // Remove OData properties
      const removeODataProps = (obj: Record<string, unknown>): void => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach((key) => {
            if (key.startsWith('@odata.')) {
              delete obj[key];
            } else if (typeof obj[key] === 'object') {
              removeODataProps(obj[key] as Record<string, unknown>);
            }
          });
        }
      };

      removeODataProps(responseData.data as Record<string, unknown>);

      return {
        content: [{ type: 'text', text: JSON.stringify(responseData.data, null, 2) }],
        _meta: meta,
      };
    }

    // Original handling for backward compatibility
    if (rawResponse) {
      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
      };
    }

    if (data === null || data === undefined) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
      };
    }

    // Remove OData properties
    const removeODataProps = (obj: Record<string, unknown>): void => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
          if (key.startsWith('@odata.')) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeODataProps(obj[key] as Record<string, unknown>);
          }
        });
      }
    };

    removeODataProps(data as Record<string, unknown>);

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
}

export default GraphClient;

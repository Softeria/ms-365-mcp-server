import logger from './logger.js';
import AuthManager from './auth.js';
import { refreshAccessToken } from './lib/microsoft-auth.js';

interface GraphRequestOptions {
  excelFile?: string;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  rawResponse?: boolean;
  accessToken?: string;
  refreshToken?: string;

  [key: string]: any;
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
  private sessions: Map<string, string>;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.sessions = new Map();
  }

  setOAuthTokens(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken || null;
  }

  async createSession(filePath: string): Promise<string | null> {
    try {
      if (!filePath) {
        logger.error('No file path provided for Excel session');
        return null;
      }

      if (this.sessions.has(filePath)) {
        return this.sessions.get(filePath) || null;
      }

      logger.info(`Creating new Excel session for file: ${filePath}`);
      const accessToken = await this.authManager.getToken();

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/workbook/createSession`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ persistChanges: true }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to create session: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      logger.info(`Session created successfully for file: ${filePath}`);

      this.sessions.set(filePath, result.id);
      return result.id;
    } catch (error) {
      logger.error(`Error creating Excel session: ${error}`);
      return null;
    }
  }

  async makeRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<any> {
    // Use OAuth tokens if available, otherwise fall back to authManager
    let accessToken =
      options.accessToken || this.accessToken || (await this.authManager.getToken());
    let refreshToken = options.refreshToken || this.refreshToken;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await this.performRequest(endpoint, accessToken, options);

      if (response.status === 401 && refreshToken) {
        // Token expired, try to refresh
        await this.refreshAccessToken(refreshToken);

        // Update token for retry
        accessToken = this.accessToken || accessToken;
        if (!accessToken) {
          throw new Error('Failed to refresh access token');
        }

        // Retry the request with new token
        return this.performRequest(endpoint, accessToken, options);
      }

      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('scope') || errorText.includes('permission')) {
          const hasWorkPermissions = await this.authManager.hasWorkAccountPermissions();
          if (!hasWorkPermissions) {
            logger.info('403 scope error detected, attempting to expand to work account scopes...');
            const expanded = await this.authManager.expandToWorkAccountScopes();
            if (expanded) {
              const newToken = await this.authManager.getToken();
              if (newToken) {
                logger.info('Retrying request with expanded scopes...');
                return this.performRequest(endpoint, newToken, options);
              }
            }
          }
        }
        throw new Error(
          `Microsoft Graph API scope error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
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
    let url: string;
    let sessionId: string | null = null;

    if (
      options.excelFile &&
      !endpoint.startsWith('/drive') &&
      !endpoint.startsWith('/users') &&
      !endpoint.startsWith('/me') &&
      !endpoint.startsWith('/teams') &&
      !endpoint.startsWith('/chats') &&
      !endpoint.startsWith('/planner')
    ) {
      sessionId = this.sessions.get(options.excelFile) || null;

      if (!sessionId) {
        sessionId = await this.createSessionWithToken(options.excelFile, accessToken);
      }

      url = `https://graph.microsoft.com/v1.0/me/drive/root:${options.excelFile}:${endpoint}`;
    } else if (
      endpoint.startsWith('/drive') ||
      endpoint.startsWith('/users') ||
      endpoint.startsWith('/me') ||
      endpoint.startsWith('/teams') ||
      endpoint.startsWith('/chats') ||
      endpoint.startsWith('/planner')
    ) {
      url = `https://graph.microsoft.com/v1.0${endpoint}`;
    } else {
      throw new Error('Excel operation requested without specifying a file');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(sessionId && { 'workbook-session-id': sessionId }),
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

  async createSessionWithToken(filePath: string, accessToken: string): Promise<string | null> {
    try {
      if (!filePath) {
        logger.error('No file path provided for Excel session');
        return null;
      }

      if (this.sessions.has(filePath)) {
        return this.sessions.get(filePath) || null;
      }

      logger.info(`Creating new Excel session for file: ${filePath}`);

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/workbook/createSession`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ persistChanges: true }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to create session: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      logger.info(`Session created successfully for file: ${filePath}`);

      this.sessions.set(filePath, result.id);
      return result.id;
    } catch (error) {
      logger.error(`Error creating Excel session: ${error}`);
      return null;
    }
  }

  formatJsonResponse(data: any, rawResponse = false): McpResponse {
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
    const removeODataProps = (obj: any): void => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
          if (key.startsWith('@odata.')) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeODataProps(obj[key]);
          }
        });
      }
    };

    removeODataProps(data);

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  async graphRequestOld(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
    try {
      logger.info(`Calling ${endpoint} with options: ${JSON.stringify(options)}`);
      let accessToken = await this.authManager.getToken();

      let url: string;
      let sessionId: string | null = null;

      if (
        options.excelFile &&
        !endpoint.startsWith('/drive') &&
        !endpoint.startsWith('/users') &&
        !endpoint.startsWith('/me') &&
        !endpoint.startsWith('/teams') &&
        !endpoint.startsWith('/chats') &&
        !endpoint.startsWith('/planner') &&
        !endpoint.startsWith('/sites')
      ) {
        sessionId = this.sessions.get(options.excelFile) || null;

        if (!sessionId) {
          sessionId = await this.createSession(options.excelFile);
        }

        url = `https://graph.microsoft.com/v1.0/me/drive/root:${options.excelFile}:${endpoint}`;
      } else if (
        endpoint.startsWith('/drive') ||
        endpoint.startsWith('/users') ||
        endpoint.startsWith('/me') ||
        endpoint.startsWith('/teams') ||
        endpoint.startsWith('/chats') ||
        endpoint.startsWith('/planner') ||
        endpoint.startsWith('/sites')
      ) {
        url = `https://graph.microsoft.com/v1.0${endpoint}`;
      } else {
        logger.error('Excel operation requested without specifying a file');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'No Excel file specified for this operation' }),
            },
          ],
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(sessionId && { 'workbook-session-id': sessionId }),
        ...options.headers,
      };
      delete options.headers;

      logger.info(` ** Making request to ${url} with options: ${JSON.stringify(options)}`);

      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (response.status === 401) {
        logger.info('Access token expired, refreshing...');
        const newToken = await this.authManager.getToken(true);

        if (
          options.excelFile &&
          !endpoint.startsWith('/drive') &&
          !endpoint.startsWith('/users') &&
          !endpoint.startsWith('/me') &&
          !endpoint.startsWith('/teams') &&
          !endpoint.startsWith('/chats') &&
          !endpoint.startsWith('/planner') &&
          !endpoint.startsWith('/sites')
        ) {
          sessionId = await this.createSession(options.excelFile);
        }

        headers.Authorization = `Bearer ${newToken}`;
        if (
          sessionId &&
          !endpoint.startsWith('/drive') &&
          !endpoint.startsWith('/users') &&
          !endpoint.startsWith('/me') &&
          !endpoint.startsWith('/teams') &&
          !endpoint.startsWith('/chats') &&
          !endpoint.startsWith('/planner') &&
          !endpoint.startsWith('/sites')
        ) {
          headers['workbook-session-id'] = sessionId;
        }

        const retryResponse = await fetch(url, {
          headers,
          ...options,
        });

        if (!retryResponse.ok) {
          throw new Error(`Graph API error: ${retryResponse.status} ${await retryResponse.text()}`);
        }

        return this.formatResponse(retryResponse, options.rawResponse);
      }

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status} ${await response.text()}`);
      }

      return this.formatResponse(response, options.rawResponse);
    } catch (error) {
      logger.error(`Error in Graph API request: ${error}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
        isError: true,
      };
    }
  }

  async formatResponse(response: Response, rawResponse = false): Promise<McpResponse> {
    try {
      if (response.status === 204) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Operation completed successfully',
              }),
            },
          ],
        };
      }

      if (rawResponse) {
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.startsWith('text/')) {
          const text = await response.text();
          return {
            content: [{ type: 'text', text }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Binary file content received',
                contentType: contentType,
                contentLength: response.headers.get('content-length'),
              }),
            },
          ],
        };
      }

      const contentType = response.headers.get('content-type');

      if (contentType && !contentType.includes('application/json')) {
        if (contentType.startsWith('text/')) {
          const text = await response.text();
          return {
            content: [{ type: 'text', text }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Binary or non-JSON content received',
                contentType: contentType,
                contentLength: response.headers.get('content-length'),
              }),
            },
          ],
        };
      }

      const result = await response.json();

      const removeODataProps = (obj: any): void => {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
          obj.forEach((item) => removeODataProps(item));
        } else {
          Object.keys(obj).forEach((key) => {
            if (key.startsWith('@odata') && !['@odata.nextLink', '@odata.count'].includes(key)) {
              delete obj[key];
            } else if (typeof obj[key] === 'object') {
              removeODataProps(obj[key]);
            }
          });
        }
      };

      removeODataProps(result);

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (error) {
      logger.error(`Error formatting response: ${error}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ message: 'Success' }) }],
      };
    }
  }

  async closeSession(filePath: string): Promise<McpResponse> {
    if (!filePath || !this.sessions.has(filePath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: 'No active session for the specified file' }),
          },
        ],
      };
    }

    const sessionId = this.sessions.get(filePath);

    try {
      const accessToken = await this.authManager.getToken();
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/workbook/closeSession`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': sessionId!,
          },
        }
      );

      if (response.ok) {
        this.sessions.delete(filePath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Session for ${filePath} closed successfully` }),
            },
          ],
        };
      } else {
        throw new Error(`Failed to close session: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Error closing session: ${error}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Failed to close session for ${filePath}` }),
          },
        ],
        isError: true,
      };
    }
  }

  async closeAllSessions(): Promise<McpResponse> {
    const results: McpResponse[] = [];

    for (const [filePath] of this.sessions) {
      const result = await this.closeSession(filePath);
      results.push(result);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'All sessions closed', results }),
        },
      ],
    };
  }
}

export default GraphClient;

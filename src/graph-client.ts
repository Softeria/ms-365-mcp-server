import logger from './logger.js';
import AuthManager from './auth.js';

interface GraphRequestOptions {
  excelFile?: string;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  rawResponse?: boolean;

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

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.sessions = new Map();
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

  async graphRequest(endpoint: string, options: GraphRequestOptions = {}): Promise<McpResponse> {
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
        !endpoint.startsWith('/planner')
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
        endpoint.startsWith('/planner')
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
          !endpoint.startsWith('/planner')
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
          !endpoint.startsWith('/planner')
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
            if (key.startsWith('@odata')) {
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

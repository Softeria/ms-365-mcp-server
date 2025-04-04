import logger from './logger.mjs';

class GraphClient {
  constructor(authManager, filePath = '/Livet.xlsx') {
    this.authManager = authManager;
    this.filePath = filePath;
    this.sessionId = null;
  }

  async createSession() {
    try {
      logger.info('Creating new Excel session...');
      const accessToken = await this.authManager.getToken();

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:${this.filePath}:/workbook/createSession`,
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
      logger.info('Session created successfully');
      this.sessionId = result.id;
      return this.sessionId;
    } catch (error) {
      logger.error(`Error creating Excel session: ${error}`);
      return null;
    }
  }

  async graphRequest(endpoint, options = {}) {
    try {
      let accessToken = await this.authManager.getToken();

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(this.sessionId && { 'workbook-session-id': this.sessionId }),
        ...options.headers,
      };

      let url;
      if (
        endpoint.startsWith('/drive') ||
        endpoint.startsWith('/users') ||
        endpoint.startsWith('/me')
      ) {
        url = `https://graph.microsoft.com/v1.0${endpoint}`;
      } else {
        url = `https://graph.microsoft.com/v1.0/me/drive/root:${this.filePath}:${endpoint}`;
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (response.status === 401) {
        logger.info('Access token expired, refreshing...');
        const newToken = await this.authManager.getToken(true);

        if (
          !endpoint.startsWith('/drive') &&
          !endpoint.startsWith('/users') &&
          !endpoint.startsWith('/me')
        ) {
          await this.createSession();
        }

        headers.Authorization = `Bearer ${newToken}`;
        if (
          this.sessionId &&
          !endpoint.startsWith('/drive') &&
          !endpoint.startsWith('/users') &&
          !endpoint.startsWith('/me')
        ) {
          headers['workbook-session-id'] = this.sessionId;
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
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }],
      };
    }
  }

  async formatResponse(response, rawResponse = false) {
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

      const result = await response.json();

      const removeODataProps = (obj) => {
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

  async closeSession() {
    if (!this.sessionId) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: 'No active session' }),
          },
        ],
      };
    }

    try {
      const accessToken = await this.authManager.getToken();
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:${this.filePath}:/workbook/closeSession`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': this.sessionId,
          },
        }
      );

      if (response.ok) {
        this.sessionId = null;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Session closed successfully' }),
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
            text: JSON.stringify({ error: 'Failed to close session' }),
          },
        ],
      };
    }
  }
}

export default GraphClient;

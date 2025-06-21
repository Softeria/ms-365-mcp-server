import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import express from 'express';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools } from './graph-tools.js';
import GraphClient from './graph-client.js';
import AuthManager from './auth.js';
import { MicrosoftOAuthProvider } from './oauth-provider.js';
import type { CommandOptions } from './cli.ts';

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient;
  private server: McpServer | null;

  constructor(authManager: AuthManager, options: CommandOptions = {}) {
    this.authManager = authManager;
    this.options = options;
    this.graphClient = new GraphClient(authManager);
    this.server = null;
  }

  async initialize(version: string): Promise<void> {
    this.server = new McpServer({
      name: 'Microsoft365MCP',
      version,
    });

    const shouldRegisterAuthTools = !this.options.http || this.options.enableAuthTools;
    if (shouldRegisterAuthTools) {
      registerAuthTools(this.server, this.authManager);
    }
    registerGraphTools(this.server, this.graphClient, this.options.readOnly);
  }

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Microsoft 365 MCP Server starting...');
    if (this.options.readOnly) {
      logger.info('Server running in READ-ONLY mode. Write operations are disabled.');
    }

    if (this.options.http) {
      const port = typeof this.options.http === 'string' ? parseInt(this.options.http) : 3000;

      const app = express();
      app.use(express.json());

      const oauthProvider = new MicrosoftOAuthProvider(this.authManager);

      app.use(
        '/auth',
        mcpAuthRouter({
          provider: oauthProvider,
          issuerUrl: new URL(`http://localhost:${port}`),
        })
      );

      app.post(
        '/mcp',
        async (req, res, next) => {
          if (req.headers.authorization?.startsWith('Bearer ')) {
            return requireBearerAuth({ provider: oauthProvider })(req, res, next);
          }
          next();
        },
        async (req, res) => {
          try {
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: undefined, // Stateless mode
            });

            res.on('close', () => {
              transport.close();
            });

            await this.server!.connect(transport);
            await transport.handleRequest(req, res, req.body);
          } catch (error) {
            logger.error('Error handling MCP request:', error);
            if (!res.headersSent) {
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: 'Internal server error',
                },
                id: null,
              });
            }
          }
        }
      );

      app.listen(port, () => {
        logger.info(`Server listening on HTTP port ${port}`);
        logger.info(`  - MCP endpoint: http://localhost:${port}/mcp`);
        logger.info(`  - OAuth endpoints: http://localhost:${port}/auth/*`);
      });
    } else {
      const transport = new StdioServerTransport();
      await this.server!.connect(transport);
      logger.info('Server connected to stdio transport');
    }
  }
}

export default MicrosoftGraphServer;

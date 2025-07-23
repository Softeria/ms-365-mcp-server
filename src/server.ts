import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import express from 'express';
import crypto from 'crypto';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools } from './graph-tools.js';
import GraphClient from './graph-client.js';
import AuthManager from './auth.js';
import { MicrosoftOAuthProvider } from './oauth-provider.js';
import {
  exchangeCodeForToken,
  microsoftBearerTokenAuthMiddleware,
  refreshAccessToken,
} from './lib/microsoft-auth.js';
import type { CommandOptions } from './cli.ts';

// Store registered clients in memory (in production, use a database)
interface RegisteredClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope?: string;
  token_endpoint_auth_method: string;
  created_at: number;
}

const registeredClients = new Map<string, RegisteredClient>();

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
    registerGraphTools(
      this.server,
      this.graphClient,
      this.options.readOnly,
      this.options.enabledTools,
      this.options.orgMode
    );
  }

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Microsoft 365 MCP Server starting...');

    // Debug: Check if environment variables are loaded
    logger.info('Environment Variables Check:', {
      CLIENT_ID: process.env.MS365_MCP_CLIENT_ID
        ? `${process.env.MS365_MCP_CLIENT_ID.substring(0, 8)}...`
        : 'NOT SET',
      CLIENT_SECRET: process.env.MS365_MCP_CLIENT_SECRET
        ? `${process.env.MS365_MCP_CLIENT_SECRET.substring(0, 8)}...`
        : 'NOT SET',
      TENANT_ID: process.env.MS365_MCP_TENANT_ID || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    });

    if (this.options.readOnly) {
      logger.info('Server running in READ-ONLY mode. Write operations are disabled.');
    }

    if (this.options.http) {
      const port = typeof this.options.http === 'string' ? parseInt(this.options.http) : 3000;

      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      // Add CORS headers for all routes
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-protocol-version'
        );

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
          return;
        }

        next();
      });

      const oauthProvider = new MicrosoftOAuthProvider(this.authManager);

      // OAuth Authorization Server Discovery
      app.get('/.well-known/oauth-authorization-server', async (req, res) => {
        const url = new URL(`${req.protocol}://${req.get('host')}`);
        res.json({
          issuer: url.origin,
          authorization_endpoint: `${url.origin}/authorize`,
          token_endpoint: `${url.origin}/token`,
          registration_endpoint: `${url.origin}/register`,
          response_types_supported: ['code'],
          response_modes_supported: ['query'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_methods_supported: ['none'],
          code_challenge_methods_supported: ['S256'],
          scopes_supported: ['User.Read', 'Files.Read', 'Mail.Read'],
        });
      });

      // OAuth Protected Resource Discovery
      app.get('/.well-known/oauth-protected-resource', async (req, res) => {
        const url = new URL(`${req.protocol}://${req.get('host')}`);
        res.json({
          resource: `${url.origin}/mcp`,
          authorization_servers: [url.origin],
          scopes_supported: ['User.Read', 'Files.Read', 'Mail.Read'],
          bearer_methods_supported: ['header'],
          resource_documentation: `${url.origin}`,
        });
      });

      // Dynamic Client Registration endpoint
      app.post('/register', async (req, res) => {
        const body = req.body;

        // Generate a client ID
        const clientId = crypto.randomUUID();

        // Store the client registration
        registeredClients.set(clientId, {
          client_id: clientId,
          client_name: body.client_name || 'MCP Client',
          redirect_uris: body.redirect_uris || [],
          grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
          response_types: body.response_types || ['code'],
          scope: body.scope,
          token_endpoint_auth_method: 'none',
          created_at: Date.now(),
        });

        // Return the client registration response
        res.status(201).json({
          client_id: clientId,
          client_name: body.client_name || 'MCP Client',
          redirect_uris: body.redirect_uris || [],
          grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
          response_types: body.response_types || ['code'],
          scope: body.scope,
          token_endpoint_auth_method: 'none',
        });
      });

      // Authorization endpoint - redirects to Microsoft
      app.get('/authorize', async (req, res) => {
        const url = new URL(req.url!, `${req.protocol}://${req.get('host')}`);
        const tenantId = process.env.MS365_MCP_TENANT_ID || 'common';
        const clientId = process.env.MS365_MCP_CLIENT_ID || '084a3e9f-a9f4-43f7-89f9-d229cf97853e';
        const microsoftAuthUrl = new URL(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
        );

        // Only forward parameters that Microsoft OAuth 2.0 v2.0 supports
        const allowedParams = [
          'response_type',
          'redirect_uri',
          'scope',
          'state',
          'response_mode',
          'code_challenge',
          'code_challenge_method',
          'prompt',
          'login_hint',
          'domain_hint',
        ];

        allowedParams.forEach((param) => {
          const value = url.searchParams.get(param);
          if (value) {
            microsoftAuthUrl.searchParams.set(param, value);
          }
        });

        // Use our Microsoft app's client_id
        microsoftAuthUrl.searchParams.set('client_id', clientId);

        // Ensure we have the minimal required scopes if none provided
        if (!microsoftAuthUrl.searchParams.get('scope')) {
          microsoftAuthUrl.searchParams.set('scope', 'User.Read Files.Read Mail.Read');
        }

        // Redirect to Microsoft's authorization page
        res.redirect(microsoftAuthUrl.toString());
      });

      // Token exchange endpoint
      app.post('/token', async (req, res) => {
        try {
          // Comprehensive debugging
          logger.info('Token endpoint called', {
            method: req.method,
            url: req.url,
            headers: req.headers,
            bodyType: typeof req.body,
            body: req.body,
            rawBody: JSON.stringify(req.body),
            contentType: req.get('Content-Type'),
          });

          const body = req.body;

          // Add debugging and validation
          if (!body) {
            logger.error('Token endpoint: Request body is undefined');
            res.status(400).json({
              error: 'invalid_request',
              error_description: 'Request body is required',
            });
            return;
          }

          if (!body.grant_type) {
            logger.error('Token endpoint: grant_type is missing', { body });
            res.status(400).json({
              error: 'invalid_request',
              error_description: 'grant_type parameter is required',
            });
            return;
          }

          if (body.grant_type === 'authorization_code') {
            const tenantId = process.env.MS365_MCP_TENANT_ID || 'common';
            const clientId =
              process.env.MS365_MCP_CLIENT_ID || '084a3e9f-a9f4-43f7-89f9-d229cf97853e';
            const clientSecret = process.env.MS365_MCP_CLIENT_SECRET;

            if (!clientSecret) {
              logger.error('Token endpoint: MS365_MCP_CLIENT_SECRET is not configured');
              res.status(500).json({
                error: 'server_error',
                error_description: 'Server configuration error',
              });
              return;
            }

            const result = await exchangeCodeForToken(
              body.code as string,
              body.redirect_uri as string,
              clientId,
              clientSecret,
              tenantId,
              body.code_verifier as string | undefined
            );
            res.json(result);
          } else if (body.grant_type === 'refresh_token') {
            const tenantId = process.env.MS365_MCP_TENANT_ID || 'common';
            const clientId =
              process.env.MS365_MCP_CLIENT_ID || '084a3e9f-a9f4-43f7-89f9-d229cf97853e';
            const clientSecret = process.env.MS365_MCP_CLIENT_SECRET;

            if (!clientSecret) {
              logger.error('Token endpoint: MS365_MCP_CLIENT_SECRET is not configured');
              res.status(500).json({
                error: 'server_error',
                error_description: 'Server configuration error',
              });
              return;
            }

            const result = await refreshAccessToken(
              body.refresh_token as string,
              clientId,
              clientSecret,
              tenantId
            );
            res.json(result);
          } else {
            res.status(400).json({
              error: 'unsupported_grant_type',
              error_description: `Grant type '${body.grant_type}' is not supported`,
            });
          }
        } catch (error) {
          logger.error('Token endpoint error:', error);
          res.status(500).json({
            error: 'server_error',
            error_description: 'Internal server error during token exchange',
          });
        }
      });

      app.use(
        mcpAuthRouter({
          provider: oauthProvider,
          issuerUrl: new URL(`http://localhost:${port}`),
        })
      );

      // Microsoft Graph MCP endpoints with bearer token auth
      app.post('/mcp', microsoftBearerTokenAuthMiddleware, async (req: any, res) => {
        try {
          // Set OAuth tokens in the GraphClient if available
          if (req.microsoftAuth) {
            this.graphClient.setOAuthTokens(
              req.microsoftAuth.accessToken,
              req.microsoftAuth.refreshToken
            );
          }

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
      });

      // Health check endpoint
      app.get('/', (req, res) => {
        res.send('Microsoft 365 MCP Server is running');
      });

      app.listen(port, () => {
        logger.info(`Server listening on HTTP port ${port}`);
        logger.info(`  - MCP endpoint: http://localhost:${port}/mcp`);
        logger.info(`  - OAuth endpoints: http://localhost:${port}/auth/*`);
        logger.info(
          `  - OAuth discovery: http://localhost:${port}/.well-known/oauth-authorization-server`
        );
      });
    } else {
      const transport = new StdioServerTransport();
      await this.server!.connect(transport);
      logger.info('Server connected to stdio transport');
    }
  }
}

export default MicrosoftGraphServer;

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import express, { Request, Response } from 'express';
import logger, { enableConsoleLogging } from './logger.js';
import { registerGraphTools } from './graph-tools.js';
import { buildMcpServerInstructions } from './mcp-instructions.js';
import GraphClient from './graph-client.js';
import AuthManager, { resolveAuthScopes } from './auth.js';
import { MicrosoftOAuthProvider } from './oauth-provider.js';
import {
  exchangeCodeForToken,
  microsoftBearerTokenAuthMiddleware,
  OAuthUpstreamError,
  refreshAccessToken,
  toOAuthErrorResponse,
} from './lib/microsoft-auth.js';
import { isAllowedRedirectUri, parseAllowlist } from './lib/redirect-uri-validation.js';
import type { CommandOptions } from './cli.ts';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { requestContext } from './request-context.js';
import crypto from 'node:crypto';

/**
 * Parse HTTP option into host and port components.
 * Supports formats: "host:port", ":port", "port"
 */
function parseHttpOption(httpOption: string | boolean): { host: string | undefined; port: number } {
  if (typeof httpOption === 'boolean') {
    return { host: undefined, port: 3000 };
  }

  const httpString = httpOption.trim();

  if (httpString.includes(':')) {
    const [hostPart, portPart] = httpString.split(':');
    const host = hostPart || undefined;
    const port = parseInt(portPart) || 3000;
    return { host, port };
  }

  const port = parseInt(httpString) || 3000;
  return { host: undefined, port };
}

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient | null;
  private secrets: AppSecrets | null;
  private version: string = '0.0.0';
  private multiAccount: boolean = false;
  private accountNames: string[] = [];

  // Two-leg PKCE: stores client's code_challenge and server's code_verifier, keyed by OAuth state
  private pkceStore: Map<
    string,
    {
      clientCodeChallenge: string;
      clientCodeChallengeMethod: string;
      serverCodeVerifier: string;
      createdAt: number;
    }
  > = new Map();

  constructor(authManager: AuthManager, options: CommandOptions = {}) {
    this.authManager = authManager;
    this.options = options;
    this.graphClient = null;
    this.secrets = null;
  }

  private createMcpServer(): McpServer {
    const server = new McpServer(
      {
        name: 'AreteM365MCP',
        version: this.version,
      },
      {
        instructions: buildMcpServerInstructions({
          multiAccount: this.multiAccount,
        }),
      }
    );

    registerGraphTools(
      server,
      this.graphClient!,
      this.authManager,
      this.multiAccount,
      this.accountNames
    );

    return server;
  }

  async initialize(version: string): Promise<void> {
    this.secrets = await getSecrets();
    this.version = version;

    try {
      this.multiAccount = await this.authManager.isMultiAccount();
      if (this.multiAccount) {
        const accounts = await this.authManager.listAccounts();
        this.accountNames = accounts.map((a) => a.username).filter((u): u is string => !!u);
        logger.info(
          `Multi-account mode detected (${this.accountNames.length} accounts): "account" parameter will be injected into all tool schemas`
        );
      }
    } catch (err) {
      logger.warn(`Failed to detect multi-account mode: ${(err as Error).message}`);
    }

    const outputFormat = this.options.toon ? 'toon' : 'json';
    this.graphClient = new GraphClient(this.authManager, this.secrets, outputFormat);
  }

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Areté Microsoft 365 MCP Server starting...');

    logger.info('Secrets Check:', {
      CLIENT_ID: this.secrets?.clientId ? `${this.secrets.clientId.substring(0, 8)}...` : 'NOT SET',
      CLIENT_SECRET: this.secrets?.clientSecret ? 'SET' : 'NOT SET',
      TENANT_ID: this.secrets?.tenantId || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    });

    if (!this.options.http) {
      throw new Error(
        'The Areté MCP server only runs over HTTP. Start with --http [host:]port (e.g. --http 3000 or --http localhost:3000).'
      );
    }

    const { host, port } = parseHttpOption(this.options.http);

    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const corsOrigin = process.env.MS365_MCP_CORS_ORIGIN || 'http://localhost:3000';
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', corsOrigin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-protocol-version'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }

      next();
    });

    const oauthProvider = new MicrosoftOAuthProvider(this.authManager, this.secrets!);

    // Public URL for browser-facing OAuth endpoints when running behind a reverse
    // proxy. Server-to-server endpoints (token, register, resource) stay on the
    // request origin so clients reaching us internally don't need NAT loopback.
    const publicUrlRaw = this.options.publicUrl || process.env.MS365_MCP_PUBLIC_URL || null;
    const publicBase = publicUrlRaw ? new URL(publicUrlRaw).href.replace(/\/$/, '') : null;

    app.get('/.well-known/oauth-authorization-server', async (req, res) => {
      const protocol = req.secure ? 'https' : 'http';
      const requestOrigin = `${protocol}://${req.get('host')}`;
      const browserBase = publicBase ?? requestOrigin;

      res.json({
        issuer: browserBase,
        authorization_endpoint: `${browserBase}/authorize`,
        token_endpoint: `${requestOrigin}/token`,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: resolveAuthScopes(),
      });
    });

    app.get('/.well-known/oauth-protected-resource', async (req, res) => {
      const protocol = req.secure ? 'https' : 'http';
      const requestOrigin = `${protocol}://${req.get('host')}`;
      const browserBase = publicBase ?? requestOrigin;

      res.json({
        resource: `${requestOrigin}/mcp`,
        authorization_servers: [browserBase],
        scopes_supported: resolveAuthScopes(),
        bearer_methods_supported: ['header'],
        resource_documentation: browserBase,
      });
    });

    // Authorization endpoint - redirects to Microsoft.
    // Two-leg PKCE: client↔server and server↔Microsoft are independent.
    app.get('/authorize', async (req, res) => {
      const url = new URL(req.url!, `${req.protocol}://${req.get('host')}`);
      const tenantId = this.secrets?.tenantId || 'common';
      const clientId = this.secrets!.clientId;
      const cloudEndpoints = getCloudEndpoints();
      const microsoftAuthUrl = new URL(
        `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/authorize`
      );

      const clientCodeChallenge = url.searchParams.get('code_challenge');
      const clientCodeChallengeMethod = url.searchParams.get('code_challenge_method');
      const state = url.searchParams.get('state');

      // Validate redirect_uri before forwarding to Microsoft to mitigate CWE-601.
      const redirectUriParam = url.searchParams.get('redirect_uri');
      if (redirectUriParam) {
        const allowlist = parseAllowlist(process.env.MS365_MCP_ALLOWED_REDIRECT_URIS);
        if (!isAllowedRedirectUri(redirectUriParam, allowlist)) {
          logger.warn('Rejected /authorize request with disallowed redirect_uri', {
            redirect_uri: redirectUriParam,
          });
          res.status(400).json({
            error: 'invalid_request',
            error_description: 'redirect_uri is not allowed',
          });
          return;
        }
      }

      // Forward parameters Microsoft OAuth v2 supports (but NOT code_challenge — we generate our own).
      const allowedParams = [
        'response_type',
        'redirect_uri',
        'scope',
        'state',
        'response_mode',
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

      if (clientCodeChallenge && state) {
        const serverCodeVerifier = crypto.randomBytes(32).toString('base64url');
        const serverCodeChallenge = crypto
          .createHash('sha256')
          .update(serverCodeVerifier)
          .digest('base64url');

        const now = Date.now();
        const maxAge = 10 * 60 * 1000;
        const maxEntries = 1000;
        for (const [key, value] of this.pkceStore) {
          if (now - value.createdAt > maxAge) {
            this.pkceStore.delete(key);
          }
        }

        if (this.pkceStore.size >= maxEntries) {
          logger.warn(
            `PKCE store at capacity (${maxEntries} entries) — rejecting new authorization request`
          );
          res.status(503).json({
            error: 'server_busy',
            error_description: 'Too many pending authorization requests. Try again later.',
          });
          return;
        }

        this.pkceStore.set(state, {
          clientCodeChallenge,
          clientCodeChallengeMethod: clientCodeChallengeMethod || 'S256',
          serverCodeVerifier,
          createdAt: Date.now(),
        });

        microsoftAuthUrl.searchParams.set('code_challenge', serverCodeChallenge);
        microsoftAuthUrl.searchParams.set('code_challenge_method', 'S256');

        logger.info('Two-leg PKCE: stored client challenge, generated server challenge', {
          state: state.substring(0, 8) + '...',
        });
      } else if (clientCodeChallenge) {
        // No state — forward client challenge directly (Claude Code path).
        microsoftAuthUrl.searchParams.set('code_challenge', clientCodeChallenge);
        if (clientCodeChallengeMethod) {
          microsoftAuthUrl.searchParams.set('code_challenge_method', clientCodeChallengeMethod);
        }
      }

      microsoftAuthUrl.searchParams.set('client_id', clientId);

      // Determine base scopes from the client request or from the full server scope set, then
      // silently inject User.Read (needed by /me access for token verification) and
      // offline_access (refresh tokens), neither of which is advertised in scopes_supported.
      const clientScope = microsoftAuthUrl.searchParams.get('scope');
      const baseScopes = clientScope
        ? clientScope.split(/\s+/).filter(Boolean)
        : resolveAuthScopes();
      const scopeSet = new Set([...baseScopes, 'User.Read', 'offline_access']);
      microsoftAuthUrl.searchParams.set('scope', Array.from(scopeSet).join(' '));

      res.redirect(microsoftAuthUrl.toString());
    });

    app.post('/token', async (req, res) => {
      try {
        logger.info('Token endpoint called', {
          method: req.method,
          url: req.url,
          contentType: req.get('Content-Type'),
          grant_type: req.body?.grant_type,
        });

        const body = req.body;
        if (!body) {
          res.status(400).json({
            error: 'invalid_request',
            error_description: 'Request body is required',
          });
          return;
        }
        if (!body.grant_type) {
          res.status(400).json({
            error: 'invalid_request',
            error_description: 'grant_type parameter is required',
          });
          return;
        }

        if (body.grant_type === 'authorization_code') {
          const tenantId = this.secrets?.tenantId || 'common';
          const clientId = this.secrets!.clientId;
          const clientSecret = this.secrets?.clientSecret;

          let serverCodeVerifier: string | undefined;

          if (body.code_verifier) {
            const clientVerifier = body.code_verifier as string;
            const clientChallengeComputed = crypto
              .createHash('sha256')
              .update(clientVerifier)
              .digest('base64url');

            for (const [state, pkceData] of this.pkceStore) {
              if (pkceData.clientCodeChallenge === clientChallengeComputed) {
                serverCodeVerifier = pkceData.serverCodeVerifier;
                this.pkceStore.delete(state);
                logger.info('Two-leg PKCE: matched client verifier, using server verifier', {
                  state: state.substring(0, 8) + '...',
                });
                break;
              }
            }
          }

          const result = await exchangeCodeForToken(
            body.code as string,
            body.redirect_uri as string,
            clientId,
            clientSecret,
            tenantId,
            serverCodeVerifier || (body.code_verifier as string | undefined)
          );
          res.json(result);
        } else if (body.grant_type === 'refresh_token') {
          const tenantId = this.secrets?.tenantId || 'common';
          const clientId = this.secrets!.clientId;
          const clientSecret = this.secrets?.clientSecret;

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
        if (error instanceof OAuthUpstreamError) {
          logger.warn('Token endpoint: upstream OAuth error surfaced to client', {
            upstream_status: error.status,
            error: error.body.error,
            suberror: error.body.suberror,
            error_codes: error.body.error_codes,
          });
        } else {
          logger.error('Token endpoint error:', error);
        }
        const { status, body } = toOAuthErrorResponse(error);
        res.status(status).json(body);
      }
    });

    app.use(
      mcpAuthRouter({
        provider: oauthProvider,
        issuerUrl: new URL(publicBase ?? `http://localhost:${port}`),
      })
    );

    const mcpAuth = microsoftBearerTokenAuthMiddleware();
    const mcpHandlerFactory =
      (passBody: boolean) =>
      async (
        req: Request & { microsoftAuth?: { accessToken: string } },
        res: Response
      ): Promise<void> => {
        const handler = async () => {
          const server = this.createMcpServer();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });

          res.on('close', () => {
            transport.close();
            server.close();
          });

          await server.connect(transport);
          await transport.handleRequest(req as any, res as any, passBody ? req.body : undefined);
        };

        try {
          if (req.microsoftAuth) {
            await requestContext.run({ accessToken: req.microsoftAuth.accessToken }, handler);
          } else {
            await handler();
          }
        } catch (error) {
          logger.error('Error handling MCP request:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Internal server error' },
              id: null,
            });
          }
        }
      };

    app.get('/mcp', mcpAuth, mcpHandlerFactory(false));
    app.post('/mcp', mcpAuth, mcpHandlerFactory(true));

    app.get('/', (_req, res) => {
      res.send('Areté Microsoft 365 MCP Server is running');
    });

    if (host) {
      app.listen(port, host, () => {
        logger.info(`Server listening on ${host}:${port}`);
        logger.info(`  - MCP endpoint: http://${host}:${port}/mcp`);
        logger.info(
          `  - OAuth discovery: http://${host}:${port}/.well-known/oauth-authorization-server`
        );
      });
    } else {
      app.listen(port, () => {
        logger.info(`Server listening on all interfaces (0.0.0.0:${port})`);
        logger.info(`  - MCP endpoint: http://localhost:${port}/mcp`);
        logger.info(
          `  - OAuth discovery: http://localhost:${port}/.well-known/oauth-authorization-server`
        );
      });
    }
  }
}

export default MicrosoftGraphServer;

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import express, { Request, Response, Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools, registerDiscoveryTools } from './graph-tools.js';
import { buildMcpServerInstructions } from './mcp-instructions.js';
import GraphClient from './graph-client.js';
import AuthManager, {
  buildScopesFromEndpoints,
  parseAllowedScopes,
  resolveAuthScopes,
} from './auth.js';
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
import { dumpError } from './crash-logging.js';
import crypto from 'node:crypto';
import OboClient from './obo-client.js';

/**
 * Parse HTTP option into host and port components.
 * Supports formats: "host:port", ":port", "port"
 * @param httpOption - The HTTP option value (string or boolean)
 * @returns Object with host (undefined if not specified) and port number
 */
function parseHttpOption(httpOption: string | boolean): { host: string | undefined; port: number } {
  if (typeof httpOption === 'boolean') {
    return { host: undefined, port: 3000 };
  }

  const httpString = httpOption.trim();

  // Check if it contains a colon (host:port format)
  if (httpString.includes(':')) {
    const [hostPart, portPart] = httpString.split(':');
    const host = hostPart || undefined; // Empty string becomes undefined
    const port = parseInt(portPart) || 3000;
    return { host, port };
  }

  // No colon, treat as port only
  const port = parseInt(httpString) || 3000;
  return { host: undefined, port };
}

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient | null;
  private server: McpServer | null;
  private secrets: AppSecrets | null;
  private oboClient: OboClient | null;
  private version: string = '0.0.0';
  private multiAccount: boolean = false;
  private accountNames: string[] = [];
  public app: Express | null = null;

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
    this.graphClient = null; // Initialized in start() after secrets are loaded
    this.server = null;
    this.secrets = null;
    this.oboClient = null;
  }

  private createMcpServer(): McpServer {
    const server = new McpServer(
      {
        name: 'Microsoft365MCP',
        version: this.version,
      },
      {
        instructions: buildMcpServerInstructions({
          discovery: Boolean(this.options.discovery),
          orgMode: Boolean(this.options.orgMode),
          readOnly: Boolean(this.options.readOnly),
          multiAccount: this.multiAccount,
        }),
      }
    );

    const shouldRegisterAuthTools = !this.options.http || this.options.enableAuthTools;
    if (shouldRegisterAuthTools) {
      registerAuthTools(server, this.authManager);
    }

    if (this.options.discovery) {
      registerDiscoveryTools(
        server,
        this.graphClient!,
        this.options.readOnly,
        this.options.orgMode,
        this.authManager,
        this.multiAccount,
        this.accountNames,
        this.options.enabledTools,
        this.options.allowedScopes
      );
    } else {
      registerGraphTools(
        server,
        this.graphClient!,
        this.options.readOnly,
        this.options.enabledTools,
        this.options.orgMode,
        this.authManager,
        this.multiAccount,
        this.accountNames,
        this.options.allowedScopes
      );
    }

    return server;
  }

  async initialize(version: string): Promise<void> {
    this.secrets = await getSecrets();
    this.version = version;

    // Detect multi-account mode and cache account names for schema enum.
    const accountRoutingAvailable =
      (!this.options.http || this.options.trustProxyAuth) && !this.authManager.isOAuthModeEnabled();
    if (accountRoutingAvailable) {
      try {
        this.multiAccount = await this.authManager.isMultiAccount();
        if (this.multiAccount) {
          const accounts = await this.authManager.listAccounts();
          this.accountNames = accounts.map((a) => a.username).filter((u): u is string => !!u);
          logger.info(
            `Multi-account mode detected (\${this.accountNames.length} accounts): "account" parameter will be injected into all tool schemas`
          );
        }
      } catch (err) {
        logger.warn(\`Failed to detect multi-account mode: \${(err as Error).message}\`);
      }
    } else {
      logger.info(
        'Account routing disabled: requests use the OAuth bearer identity, so the "account" parameter is not injected into tool schemas'
      );
    }

    if (this.options.obo) {
      if (!this.options.http) {
        throw new Error('--obo requires --http (On-Behalf-Of flow only works in HTTP mode).');
      }
      if (!this.secrets.clientSecret) {
        throw new Error(
          '--obo requires MS365_MCP_CLIENT_SECRET to be set (confidential client required for On-Behalf-Of flow).'
        );
      }
      if (this.options.trustProxyAuth) {
        throw new Error(
          '--obo cannot be combined with --trust-proxy-auth: the proxy-auth pass-through skips the incoming bearer token that OBO would exchange.'
        );
      }
      this.oboClient = new OboClient(this.secrets);
      logger.info('On-Behalf-Of (OBO) flow enabled');
    }

    const outputFormat = this.options.toon ? 'toon' : 'json';
    this.graphClient = new GraphClient(this.authManager, this.secrets, outputFormat);

    if (!this.options.http) {
      this.server = this.createMcpServer();
    }

    if (this.options.discovery) {
      logger.info('Discovery mode enabled (experimental) - registering discovery tool only');
    }

    if (this.options.http) {
        this.setupExpress();
    }
  }

  private setupExpress(): void {
    const app = express();
    this.app = app;

    // Trust-proxy configuration.
    const trustProxyEnv = process.env.MS365_MCP_TRUST_PROXY_HOPS;
    if (trustProxyEnv !== undefined && trustProxyEnv !== '') {
      const asNum = Number(trustProxyEnv);
      app.set('trust proxy', Number.isFinite(asNum) ? asNum : trustProxyEnv);
    } else {
      app.set('trust proxy', 1);
    }

    // Security headers.
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Add CORS headers for all routes
    const corsOrigin = process.env.MS365_MCP_CORS_ORIGIN || 'http://localhost:3000';
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', corsOrigin);
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

    // Per-IP rate limiting (opt out with MS365_MCP_RATE_LIMIT_DISABLED=true).
    const rateLimitDisabled =
      process.env.MS365_MCP_RATE_LIMIT_DISABLED === 'true' ||
      process.env.MS365_MCP_RATE_LIMIT_DISABLED === '1' ||
      process.env.VERCEL === '1'; // Disable rate limiting in Vercel
    if (!rateLimitDisabled) {
      const authLimiter = rateLimit({
        windowMs: 60_000,
        max: 30,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
      });
      const mcpLimiter = rateLimit({
        windowMs: 60_000,
        max: 120,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
      });
      app.use('/authorize', authLimiter);
      app.use('/token', authLimiter);
      app.use('/register', authLimiter);
      app.use('/mcp', mcpLimiter);
    }

    const oauthProvider = new MicrosoftOAuthProvider(this.authManager, this.secrets!);

    const publicUrlRaw =
      this.options.publicUrl ||
      process.env.MS365_MCP_PUBLIC_URL ||
      this.options.baseUrl ||
      process.env.MS365_MCP_BASE_URL ||
      null;
    const publicBase = publicUrlRaw ? new URL(publicUrlRaw).href.replace(/\/$/, '') : null;

    // OAuth Authorization Server Discovery
    app.get('/.well-known/oauth-authorization-server', async (req, res) => {
      const protocol = req.secure ? 'https' : 'http';
      const requestOrigin = \`\${protocol}://\${req.get('host')}\`;
      const browserBase = publicBase ?? requestOrigin;

      const scopes = this.options.obo
        ? [\`\${this.secrets!.clientId}/access_as_user\`]
        : resolveAuthScopes(this.options);

      const metadata: Record<string, unknown> = {
        issuer: browserBase,
        authorization_endpoint: \`\${browserBase}/authorize\`,
        token_endpoint: \`\${requestOrigin}/token\`,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: scopes,
      };

      if (this.options.enableDynamicRegistration) {
        metadata.registration_endpoint = \`\${requestOrigin}/register\`;
      }

      res.json(metadata);
    });

    // OAuth Protected Resource Discovery
    app.get('/.well-known/oauth-protected-resource', async (req, res) => {
      const protocol = req.secure ? 'https' : 'http';
      const requestOrigin = \`\${protocol}://\${req.get('host')}\`;
      const browserBase = publicBase ?? requestOrigin;

      const scopes = this.options.obo
        ? [\`\${this.secrets!.clientId}/access_as_user\`]
        : resolveAuthScopes(this.options);

      res.json({
        resource: \`\${requestOrigin}/mcp\`,
        authorization_servers: [browserBase],
        scopes_supported: scopes,
        bearer_methods_supported: ['header'],
        resource_documentation: browserBase,
      });
    });

    if (this.options.enableDynamicRegistration) {
      app.post('/register', async (req, res) => {
        const body = req.body;
        logger.info('Client registration request', { body });

        const clientId = \`mcp-client-\${Date.now()}\`;

        res.status(201).json({
          client_id: clientId,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          redirect_uris: body.redirect_uris || [],
          grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
          response_types: body.response_types || ['code'],
          token_endpoint_auth_method: body.token_endpoint_auth_method || 'none',
          client_name: body.client_name || 'MCP Client',
        });
      });
    }

    // Authorization endpoint - redirects to Microsoft
    app.get('/authorize', async (req, res) => {
      const url = new URL(req.url!, \`\${req.protocol}://\${req.get('host')}\`);
      const tenantId = this.secrets?.tenantId || 'common';
      const clientId = this.secrets!.clientId;
      const cloudEndpoints = getCloudEndpoints(this.secrets!.cloudType);
      const microsoftAuthUrl = new URL(
        \`\${cloudEndpoints.authority}/\${tenantId}/oauth2/v2.0/authorize\`
      );

      const clientCodeChallenge = url.searchParams.get('code_challenge');
      const clientCodeChallengeMethod = url.searchParams.get('code_challenge_method');
      const state = url.searchParams.get('state');

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
        const maxAge = 10 * 60 * 1000; // 10 minutes
        const maxEntries = 1000;
        for (const [key, value] of this.pkceStore) {
          if (now - value.createdAt > maxAge) {
            this.pkceStore.delete(key);
          }
        }

        if (this.pkceStore.size >= maxEntries) {
          logger.warn(
            \`PKCE store at capacity (\${maxEntries} entries) — rejecting new authorization request\`
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
        microsoftAuthUrl.searchParams.set('code_challenge', clientCodeChallenge);
        if (clientCodeChallengeMethod) {
          microsoftAuthUrl.searchParams.set('code_challenge_method', clientCodeChallengeMethod);
        }
      }

      microsoftAuthUrl.searchParams.set('client_id', clientId);

      const explicitAllowedScopes = parseAllowedScopes(this.options.allowedScopes);
      const clientScope = microsoftAuthUrl.searchParams.get('scope');
      const baseScopes =
        explicitAllowedScopes !== undefined
          ? resolveAuthScopes(this.options)
          : clientScope
            ? clientScope.split(/\s+/).filter(Boolean)
            : buildScopesFromEndpoints(
                this.options.orgMode,
                this.options.enabledTools,
                this.options.readOnly
              );
      const scopeSet = new Set([...baseScopes, 'User.Read', 'offline_access']);
      microsoftAuthUrl.searchParams.set('scope', Array.from(scopeSet).join(' '));

      res.redirect(microsoftAuthUrl.toString());
    });

    // Token exchange endpoint
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
            serverCodeVerifier || (body.code_verifier as string | undefined),
            this.secrets!.cloudType
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
            tenantId,
            this.secrets!.cloudType
          );
          res.json(result);
        } else {
          res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: \`Grant type '\${body.grant_type}' is not supported\`,
          });
        }
      } catch (error) {
        const { status, body } = toOAuthErrorResponse(error);
        res.status(status).json(body);
      }
    });

    app.use(
      mcpAuthRouter({
        provider: oauthProvider,
        issuerUrl: new URL(publicBase ?? \`http://localhost:3000\`),
      })
    );

    const mcpAuth = microsoftBearerTokenAuthMiddleware({
      trustProxyAuth: this.options.trustProxyAuth,
    });
    app.get(
      '/mcp',
      mcpAuth,
      async (req: Request & { microsoftAuth?: { accessToken: string } }, res: Response) => {
        const handler = async () => {
          const server = this.createMcpServer();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless mode
          });

          res.on('close', () => {
            transport.close();
            server.close();
          });

          await server.connect(transport);
          await transport.handleRequest(req as any, res as any, undefined);
        };

        try {
          if (req.microsoftAuth) {
            let accessToken = req.microsoftAuth.accessToken;
            if (this.oboClient) {
              accessToken = await this.oboClient.exchangeToken(accessToken);
            }
            await requestContext.run({ accessToken }, handler);
          } else {
            await handler();
          }
        } catch (error) {
          logger.error('Error handling MCP GET request:', error);
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

    app.post(
      '/mcp',
      mcpAuth,
      async (req: Request & { microsoftAuth?: { accessToken: string } }, res: Response) => {
        const handler = async () => {
          const server = this.createMcpServer();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless mode
          });

          res.on('close', () => {
            transport.close();
            server.close();
          });

          await server.connect(transport);
          await transport.handleRequest(req as any, res as any, req.body);
        };

        try {
          if (req.microsoftAuth) {
            let accessToken = req.microsoftAuth.accessToken;
            if (this.oboClient) {
              accessToken = await this.oboClient.exchangeToken(accessToken);
            }
            await requestContext.run({ accessToken }, handler);
          } else {
            await handler();
          }
        } catch (error) {
          logger.error('Error handling MCP POST request:', error);
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

    // Health check endpoint
    app.get('/', (req, res) => {
      res.send('Microsoft 365 MCP Server is running');
    });
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
        if (process.env.VERCEL === '1') {
            logger.info('Running in Vercel environment, skipping app.listen()');
            return;
        }

      const { host, port } = parseHttpOption(this.options.http);
      const app = this.app!;

      if (host) {
        app.listen(port, host, () => {
          logger.info(\`Server listening on \${host}:\${port}\`);
        });
      } else {
        app.listen(port, () => {
          logger.info(\`Server listening on all interfaces (0.0.0.0:\${port})\`);
        });
      }
    } else {
      const transport = new StdioServerTransport();
      transport.onerror = (error) => {
        logger.error('Stdio transport error', { error: dumpError(error) });
      };
      await this.server!.connect(transport);
      logger.info('Server connected to stdio transport');
    }
  }
}

export default MicrosoftGraphServer;

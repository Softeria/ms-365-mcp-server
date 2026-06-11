import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Express, type Request, type Response } from 'express';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools, registerDiscoveryTools } from './graph-tools.js';
import { buildMcpServerInstructions } from './mcp-instructions.js';
import GraphClient from './graph-client.js';
import AuthManager, { buildScopesFromEndpoints, parseAllowedScopes, resolveAuthScopes } from './auth.js';
import { exchangeCodeForToken, microsoftBearerTokenAuthMiddleware, refreshAccessToken, toOAuthErrorResponse } from './lib/microsoft-auth.js';
import { isAllowedRedirectUri, parseAllowlist } from './lib/redirect-uri-validation.js';
import type { CommandOptions } from './cli.js';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { requestContext } from './request-context.js';
import { dumpError } from './crash-logging.js';
import OboClient from './obo-client.js';

function parseHttpOption(httpOption: string | boolean): { host: string | undefined; port: number } {
  if (typeof httpOption === 'boolean') return { host: undefined, port: 3000 };
  const value = httpOption.trim();
  if (value.includes(':')) {
    const [hostPart, portPart] = value.split(':');
    return { host: hostPart || undefined, port: Number.parseInt(portPart, 10) || 3000 };
  }
  return { host: undefined, port: Number.parseInt(value, 10) || 3000 };
}

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient | null = null;
  private server: McpServer | null = null;
  private secrets: AppSecrets | null = null;
  private oboClient: OboClient | null = null;
  private version = '0.0.0';
  private multiAccount = false;
  private accountNames: string[] = [];
  public app: Express | null = null;

  constructor(authManager: AuthManager, options: CommandOptions = {}) {
    this.authManager = authManager;
    this.options = options;
  }

  private createMcpServer(): McpServer {
    const server = new McpServer(
      { name: 'Microsoft365MCP', version: this.version },
      {
        instructions: buildMcpServerInstructions({
          discovery: Boolean(this.options.discovery),
          orgMode: Boolean(this.options.orgMode),
          readOnly: Boolean(this.options.readOnly),
          multiAccount: this.multiAccount,
        }),
      }
    );

    if (!this.options.http || this.options.enableAuthTools) {
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
    this.version = version;
    this.secrets = await getSecrets();

    const accountRoutingAvailable =
      (!this.options.http || this.options.trustProxyAuth) && !this.authManager.isOAuthModeEnabled();
    if (accountRoutingAvailable) {
      try {
        this.multiAccount = await this.authManager.isMultiAccount();
        if (this.multiAccount) {
          const accounts = await this.authManager.listAccounts();
          this.accountNames = accounts.map((account) => account.username).filter((name): name is string => Boolean(name));
          logger.info(`Multi-account mode detected (${this.accountNames.length} accounts).`);
        }
      } catch (error) {
        logger.warn(`Failed to detect multi-account mode: ${(error as Error).message}`);
      }
    }

    if (this.options.obo) {
      if (!this.options.http) throw new Error('--obo requires --http.');
      if (!this.secrets.clientSecret) throw new Error('--obo requires MS365_MCP_CLIENT_SECRET.');
      if (this.options.trustProxyAuth) throw new Error('--obo cannot be combined with --trust-proxy-auth.');
      this.oboClient = new OboClient(this.secrets);
    }

    const outputFormat = this.options.toon ? 'toon' : 'json';
    this.graphClient = new GraphClient(this.authManager, this.secrets, outputFormat);

    if (this.options.http) {
      this.setupExpress();
    } else {
      this.server = this.createMcpServer();
    }
  }

  private setupExpress(): void {
    const app = express();
    this.app = app;
    app.set('trust proxy', 1);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    const corsOrigin = process.env.MS365_MCP_CORS_ORIGIN || '*';
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', corsOrigin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-protocol-version');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    });

    app.get('/', (_req, res) => res.send('Microsoft 365 MCP Server is running'));
    app.get('/health', (_req, res) => res.json({ ok: true, version: this.version }));
    app.get('/healthz', (_req, res) => res.json({ ok: true, version: this.version }));
    app.get('/favicon.ico', (_req, res) => res.sendStatus(204));
    app.get('/favicon.png', (_req, res) => res.sendStatus(204));

    const publicUrlRaw =
      this.options.publicUrl ||
      process.env.MS365_MCP_PUBLIC_URL ||
      this.options.baseUrl ||
      process.env.MS365_MCP_BASE_URL ||
      null;

    const getRequestOrigin = (req: Request) => `${req.protocol}://${req.get('host')}`;
    const getBrowserBase = (req: Request) =>
      publicUrlRaw ? new URL(publicUrlRaw).href.replace(/\/$/, '') : getRequestOrigin(req);

    app.get('/.well-known/oauth-authorization-server', (req, res) => {
      const requestOrigin = getRequestOrigin(req);
      const browserBase = getBrowserBase(req);
      const scopes = this.options.obo
        ? [`${this.secrets!.clientId}/access_as_user`]
        : resolveAuthScopes(this.options);

      res.json({
        issuer: browserBase,
        authorization_endpoint: `${browserBase}/authorize`,
        token_endpoint: `${requestOrigin}/token`,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: scopes,
      });
    });

    app.get('/.well-known/oauth-protected-resource', (req, res) => {
      const requestOrigin = getRequestOrigin(req);
      const browserBase = getBrowserBase(req);
      const scopes = this.options.obo
        ? [`${this.secrets!.clientId}/access_as_user`]
        : resolveAuthScopes(this.options);

      res.json({
        resource: `${requestOrigin}/mcp`,
        authorization_servers: [browserBase],
        scopes_supported: scopes,
        bearer_methods_supported: ['header'],
        resource_documentation: browserBase,
      });
    });

    app.get('/authorize', (req, res) => {
      const requestUrl = new URL(req.url, getRequestOrigin(req));
      const tenantId = this.secrets?.tenantId || 'common';
      const clientId = this.secrets!.clientId;
      const cloudEndpoints = getCloudEndpoints(this.secrets!.cloudType);
      const microsoftAuthUrl = new URL(`${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/authorize`);

      const redirectUriParam = requestUrl.searchParams.get('redirect_uri');
      if (redirectUriParam) {
        const allowlist = parseAllowlist(process.env.MS365_MCP_ALLOWED_REDIRECT_URIS);
        if (!isAllowedRedirectUri(redirectUriParam, allowlist)) {
          return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is not allowed' });
        }
      }

      for (const param of ['response_type', 'redirect_uri', 'scope', 'state', 'response_mode', 'prompt', 'login_hint', 'domain_hint', 'code_challenge', 'code_challenge_method']) {
        const value = requestUrl.searchParams.get(param);
        if (value) microsoftAuthUrl.searchParams.set(param, value);
      }

      microsoftAuthUrl.searchParams.set('client_id', clientId);
      const explicitAllowedScopes = parseAllowedScopes(this.options.allowedScopes);
      const clientScope = microsoftAuthUrl.searchParams.get('scope');
      const baseScopes = explicitAllowedScopes ?? (clientScope ? clientScope.split(/\s+/).filter(Boolean) : buildScopesFromEndpoints(this.options.orgMode, this.options.enabledTools, this.options.readOnly));
      const scopeSet = new Set([...baseScopes, 'User.Read', 'offline_access']);
      microsoftAuthUrl.searchParams.set('scope', Array.from(scopeSet).join(' '));
      return res.redirect(microsoftAuthUrl.toString());
    });

    app.post('/token', async (req, res) => {
      try {
        const body = req.body || {};
        const tenantId = this.secrets?.tenantId || 'common';
        const clientId = this.secrets!.clientId;
        const clientSecret = this.secrets?.clientSecret;

        if (body.grant_type === 'authorization_code') {
          const result = await exchangeCodeForToken(
            body.code as string,
            body.redirect_uri as string,
            clientId,
            clientSecret,
            tenantId,
            body.code_verifier as string | undefined,
            this.secrets!.cloudType
          );
          return res.json(result);
        }

        if (body.grant_type === 'refresh_token') {
          const result = await refreshAccessToken(
            body.refresh_token as string,
            clientId,
            clientSecret,
            tenantId,
            this.secrets!.cloudType
          );
          return res.json(result);
        }

        return res.status(400).json({ error: 'unsupported_grant_type' });
      } catch (error) {
        const response = toOAuthErrorResponse(error);
        return res.status(response.status).json(response.body);
      }
    });

    const mcpAuth = microsoftBearerTokenAuthMiddleware({ trustProxyAuth: this.options.trustProxyAuth });
    const handleMcp = async (req: Request & { microsoftAuth?: { accessToken: string } }, res: Response) => {
      const handler = async () => {
        const server = this.createMcpServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => {
          transport.close();
          server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req as any, res as any, req.method === 'POST' ? req.body : undefined);
      };

      try {
        if (req.microsoftAuth) {
          let accessToken = req.microsoftAuth.accessToken;
          if (this.oboClient) accessToken = await this.oboClient.exchangeToken(accessToken);
          await requestContext.run({ accessToken }, handler);
        } else {
          await handler();
        }
      } catch (error) {
        logger.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
      }
    };

    // We allow GET /mcp to bypass auth if it's a simple health check or validation probe
    const mcpValidationBypass = (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && !req.headers.authorization && !req.headers.accept?.includes('text/event-stream')) {
        return res.status(200).send('MCP Endpoint Reachable (Auth Required for Tools)');
      }
      return mcpAuth(req, res, next);
    };

    app.get('/mcp', mcpValidationBypass, handleMcp);
    app.post('/mcp', mcpAuth, handleMcp);
  }

  async start(): Promise<void> {
    if (this.options.v) enableConsoleLogging();
    logger.info('Microsoft 365 MCP Server starting...');

    if (this.options.http) {
      if (process.env.VERCEL === '1') {
        logger.info('Running in Vercel environment, skipping app.listen()');
        return;
      }

      const { host, port } = parseHttpOption(this.options.http);
      if (host) this.app!.listen(port, host, () => logger.info(`Server listening on ${host}:${port}`));
      else this.app!.listen(port, () => logger.info(`Server listening on all interfaces (0.0.0.0:${port})`));
      return;
    }

    const transport = new StdioServerTransport();
    transport.onerror = (error) => logger.error('Stdio transport error', { error: dumpError(error) });
    await this.server!.connect(transport);
    logger.info('Server connected to stdio transport');
  }
}

export default MicrosoftGraphServer;

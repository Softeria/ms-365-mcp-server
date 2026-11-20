import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import logger, { enableConsoleLogging } from './logger.js';
import { registerTools } from './tool-runtime.js';
import { buildMcpServerInstructions } from './mcp-instructions.js';
import GraphClient from './graph-client.js';
import { resolveAuthScopes } from './oauth/scopes.js';
import { exchangeCodeForToken, OAuthUpstreamError } from './lib/microsoft-auth.js';
import { isAllowedRedirectUri, parseAllowlist } from './lib/redirect-uri-validation.js';
import type { CommandOptions } from './cli.ts';
import { AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { requestContext } from './request-context.js';
import { ClientRegistry, InvalidRedirectUriError } from './oauth/client-registry.js';
import {
  BrokerStore,
  BrokerStoreFullError,
  verifyPkce,
  isValidCodeChallenge,
  type CreatedTransaction,
} from './oauth/broker-store.js';
import type { SessionManager } from './sessions/manager.js';
import { sessionAuth, type AuthenticatedRequest } from './middleware/session-auth.js';
import type { PolicyManager } from './policy/index.js';
import { buildAdminRouter } from './admin/router.js';

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

export interface MicrosoftGraphServerDeps {
  options: CommandOptions;
  secrets: AppSecrets;
  sessionManager: SessionManager;
  policy: PolicyManager;
  policyAdmins: Set<string>;
}

class MicrosoftGraphServer {
  private readonly options: CommandOptions;
  private readonly secrets: AppSecrets;
  private readonly sessionManager: SessionManager;
  private readonly policy: PolicyManager;
  private readonly policyAdmins: Set<string>;
  private readonly graphClient: GraphClient;
  private readonly brokerStore = new BrokerStore();
  private clientRegistry!: ClientRegistry;
  private version: string = '0.0.0';

  constructor(deps: MicrosoftGraphServerDeps) {
    this.options = deps.options;
    this.secrets = deps.secrets;
    this.sessionManager = deps.sessionManager;
    this.policy = deps.policy;
    this.policyAdmins = deps.policyAdmins;
    this.graphClient = new GraphClient(this.options.toon ? 'toon' : 'json');
  }

  initialize(version: string): void {
    this.version = version;
  }

  private createMcpServer(): McpServer {
    const server = new McpServer(
      {
        name: 'AreteM365MCP',
        version: this.version,
      },
      {
        instructions: buildMcpServerInstructions({ multiAccount: false }),
      }
    );

    registerTools(server, this.graphClient, { policy: this.policy });

    return server;
  }

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Areté Microsoft 365 MCP Server starting...');
    logger.info('Secrets Check:', {
      CLIENT_ID: this.secrets.clientId ? `${this.secrets.clientId.substring(0, 8)}...` : 'NOT SET',
      CLIENT_SECRET: this.secrets.clientSecret ? 'SET' : 'NOT SET',
      TENANT_ID: this.secrets.tenantId || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    });

    if (!this.options.http) {
      throw new Error(
        'The Areté MCP server only runs over HTTP. Start with --http [host:]port (e.g. --http 3000 or --http localhost:3000).'
      );
    }

    const { host, port } = parseHttpOption(this.options.http);
    const app = this.buildApp();

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

  /**
   * Builds the configured Express app (middleware + OAuth/MCP routes) without
   * binding a port. Split out from start() so tests can drive the full surface
   * via supertest, and so port binding stays a thin wrapper.
   */
  buildApp(): express.Express {
    const app = express();
    app.set('trust proxy', true);
    // MCP tool calls carry base64 file content (drive-file-upload/-update,
    // mail-attachment-add: up to 4 MB raw ≈ 5.4 MB encoded). The default 100
    // KB JSON limit would 413 them before auth ever runs, so /mcp's larger
    // (8 MB) parser is wired in below, AFTER mcpAuth, and skipped here.
    const defaultJson = express.json();
    // Match the route the way Express does (non-strict and case-insensitive:
    // `/mcp/` and `/MCP` route here too).
    app.use((req, res, next) =>
      req.path.replace(/\/+$/, '').toLowerCase() === '/mcp' ? next() : defaultJson(req, res, next)
    );
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Permissive CORS by default: the MCP and OAuth endpoints are
    // bearer-authenticated (no cookies), so reflecting the caller's Origin lets
    // any MCP client connect without us maintaining a per-client allowlist —
    // the point of plug-and-play. Set MS365_MCP_CORS_ORIGIN to a single origin
    // to pin it for hardened deployments.
    const pinnedCorsOrigin = process.env.MS365_MCP_CORS_ORIGIN?.trim();
    app.use((req, res, next) => {
      const requestOrigin = req.headers.origin;
      const allowOrigin =
        pinnedCorsOrigin && pinnedCorsOrigin !== '*' ? pinnedCorsOrigin : (requestOrigin ?? '*');
      res.header('Access-Control-Allow-Origin', allowOrigin);
      res.header('Vary', 'Origin');
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

    // Public URL for browser-facing OAuth redirects when behind a reverse proxy.
    const publicUrlRaw = this.options.publicUrl || process.env.MS365_MCP_PUBLIC_URL || null;
    const publicBase = publicUrlRaw ? new URL(publicUrlRaw).href.replace(/\/$/, '') : null;

    // Persistent registry of dynamically-registered OAuth clients (shares the
    // sessions SQLite file). Instantiated lazily on the HTTP path (after the
    // --http guard) and guarded so a second buildApp() call — e.g. in tests —
    // never opens and abandons a second connection.
    this.clientRegistry ??= new ClientRegistry();

    app.use(
      '/admin',
      buildAdminRouter({
        sessionManager: this.sessionManager,
        policyManager: this.policy,
        policyAdmins: this.policyAdmins,
        secrets: this.secrets,
        publicBase,
      })
    );

    app.get('/.well-known/oauth-authorization-server', (req, res) => {
      const protocol = req.secure ? 'https' : 'http';
      const requestOrigin = `${protocol}://${req.get('host')}`;
      const browserBase = publicBase ?? requestOrigin;

      res.json({
        issuer: browserBase,
        authorization_endpoint: `${browserBase}/authorize`,
        token_endpoint: `${requestOrigin}/token`,
        revocation_endpoint: `${requestOrigin}/revoke`,
        registration_endpoint: `${requestOrigin}/register`,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['none'],
        revocation_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: resolveAuthScopes(),
      });
    });

    app.get('/.well-known/oauth-protected-resource', (req, res) => {
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

    // RFC 7591 Dynamic Client Registration. This is what lets DCR-only clients
    // (MCP Inspector/Jam, Cursor, ...) obtain a client_id with no human setup —
    // the missing piece behind the "no usable CIMD or DCR flow" error.
    app.post('/register', (req, res) => {
      // req.body is untrusted network input — narrow it explicitly rather than
      // reaching into `any`.
      const body = (req.body ?? {}) as { redirect_uris?: unknown; client_name?: unknown };
      const redirectUris = body.redirect_uris;
      if (
        !Array.isArray(redirectUris) ||
        redirectUris.length === 0 ||
        !redirectUris.every((u): u is string => typeof u === 'string')
      ) {
        res.status(400).json({
          error: 'invalid_redirect_uri',
          error_description: 'redirect_uris is required and must be a non-empty array of strings',
        });
        return;
      }
      try {
        const client = this.clientRegistry.register({
          redirectUris,
          clientName: typeof body.client_name === 'string' ? body.client_name : null,
        });
        res.status(201).json({
          client_id: client.clientId,
          client_id_issued_at: Math.floor(client.createdAt / 1000),
          redirect_uris: client.redirectUris,
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code'],
          response_types: ['code'],
          ...(client.clientName ? { client_name: client.clientName } : {}),
        });
      } catch (error) {
        if (error instanceof InvalidRedirectUriError) {
          res.status(400).json({
            error: 'invalid_redirect_uri',
            error_description: error.message,
          });
          return;
        }
        logger.error('Client registration failed:', error);
        res.status(500).json({ error: 'server_error' });
      }
    });

    app.get('/authorize', (req, res) => {
      const requestProtocol = req.secure ? 'https' : 'http';
      const requestOrigin = `${requestProtocol}://${req.get('host')}`;
      const browserBase = publicBase ?? requestOrigin;
      // One fixed, server-owned callback. Microsoft only ever redirects here,
      // so the Entra app needs exactly one registered redirect URI regardless
      // of how many MCP clients connect.
      const serverRedirectUri = `${browserBase}/auth/callback`;

      const params = new URL(req.url!, requestOrigin).searchParams;

      const responseType = params.get('response_type');
      if (responseType && responseType !== 'code') {
        res.status(400).json({
          error: 'unsupported_response_type',
          error_description: 'Only response_type=code is supported',
        });
        return;
      }

      const clientId = params.get('client_id');
      const redirectUri = params.get('redirect_uri');
      const clientState = params.get('state');
      const clientCodeChallenge = params.get('code_challenge');
      const clientCodeChallengeMethod = params.get('code_challenge_method') ?? 'S256';

      if (!redirectUri) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'redirect_uri is required',
        });
        return;
      }

      // Validate the client's redirect_uri before doing anything else, and
      // never redirect to an unvalidated target (CWE-601). A registered DCR
      // client is bound STRICTLY to its own registered URIs. An unknown/legacy
      // client_id (e.g. Claude.ai before it performs DCR) is checked against the
      // explicit global allowlist — which must be CONFIGURED: we fail closed
      // when it's unset rather than permitting arbitrary https origins, because
      // a brokered code redirected to an attacker URI would otherwise be an
      // account-takeover vector. DCR is the supported path for new clients.
      const allowlist = parseAllowlist(process.env.MS365_MCP_ALLOWED_REDIRECT_URIS);
      const registeredClient = clientId ? this.clientRegistry.get(clientId) : null;
      const redirectOk = registeredClient
        ? registeredClient.redirectUris.includes(redirectUri)
        : allowlist !== null && isAllowedRedirectUri(redirectUri, allowlist);
      if (!redirectOk) {
        logger.warn('Rejected /authorize with unregistered redirect_uri', {
          client_id: clientId,
          redirect_uri: redirectUri,
        });
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'redirect_uri is not registered for this client',
        });
        return;
      }

      // PKCE is mandatory and S256-only. We advertise S256-only in discovery and
      // enforce it here: accepting `plain` (challenge == verifier) would let a
      // leaked authorization code be redeemed by anyone, defeating the
      // proof-of-possession the brokered-code design relies on.
      if (clientCodeChallengeMethod !== 'S256') {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'code_challenge_method must be S256',
        });
        return;
      }
      if (!isValidCodeChallenge(clientCodeChallenge)) {
        res.status(400).json({
          error: 'invalid_request',
          error_description:
            'code_challenge is required and must be a 43-128 char base64url string',
        });
        return;
      }

      let txn: CreatedTransaction;
      try {
        txn = this.brokerStore.createTransaction({
          clientId,
          clientRedirectUri: redirectUri,
          clientState,
          clientCodeChallenge,
          serverRedirectUri,
        });
      } catch (error) {
        if (error instanceof BrokerStoreFullError) {
          res.status(503).json({
            error: 'server_busy',
            error_description: 'Too many pending authorization requests. Try again later.',
          });
          return;
        }
        throw error;
      }

      const tenantId = this.secrets.tenantId || 'common';
      const cloudEndpoints = getCloudEndpoints();
      const microsoftAuthUrl = new URL(
        `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/authorize`
      );
      microsoftAuthUrl.searchParams.set('client_id', this.secrets.clientId);
      microsoftAuthUrl.searchParams.set('response_type', 'code');
      microsoftAuthUrl.searchParams.set('response_mode', 'query');
      microsoftAuthUrl.searchParams.set('redirect_uri', serverRedirectUri);
      microsoftAuthUrl.searchParams.set('state', txn.state);
      microsoftAuthUrl.searchParams.set('code_challenge', txn.serverCodeChallenge);
      microsoftAuthUrl.searchParams.set('code_challenge_method', 'S256');

      // Pass through optional UX hints the client supplied.
      for (const hint of ['prompt', 'login_hint', 'domain_hint']) {
        const value = params.get(hint);
        if (value) microsoftAuthUrl.searchParams.set(hint, value);
      }

      // Always request the scopes the session layer depends on, regardless of
      // what the client asked for:
      //   - openid + profile: id_token carrying the oid/tid claims
      //     SessionManager.createSession needs to identify the user.
      //   - User.Read: /me access.
      //   - offline_access: refresh token issuance.
      const requestedScope = params.get('scope');
      const baseScopes = requestedScope
        ? requestedScope.split(/\s+/).filter(Boolean)
        : resolveAuthScopes();
      const scopeSet = new Set([...baseScopes, 'openid', 'profile', 'User.Read', 'offline_access']);
      microsoftAuthUrl.searchParams.set('scope', Array.from(scopeSet).join(' '));

      res.redirect(microsoftAuthUrl.toString());
    });

    // Server-owned Microsoft callback. Microsoft redirects here after the user
    // authenticates; we exchange the code, create the session, then hand the
    // MCP client our OWN short-lived authorization code at its callback.
    app.get('/auth/callback', async (req, res) => {
      const requestProtocol = req.secure ? 'https' : 'http';
      const requestOrigin = `${requestProtocol}://${req.get('host')}`;
      const params = new URL(req.url!, requestOrigin).searchParams;

      const state = params.get('state');
      if (!state) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing state on callback',
        });
        return;
      }
      const txn = this.brokerStore.consumeTransaction(state);
      if (!txn) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'Unknown or expired authorization transaction',
        });
        return;
      }

      const buildClientRedirect = (extra: Record<string, string>): string => {
        const dest = new URL(txn.clientRedirectUri);
        for (const [key, value] of Object.entries(extra)) dest.searchParams.set(key, value);
        if (txn.clientState) dest.searchParams.set('state', txn.clientState);
        return dest.toString();
      };

      // Forward an upstream (Microsoft) error back to the client's callback.
      const upstreamError = params.get('error');
      if (upstreamError) {
        const description = params.get('error_description');
        res.redirect(
          buildClientRedirect({
            error: upstreamError,
            ...(description ? { error_description: description } : {}),
          })
        );
        return;
      }

      const code = params.get('code');
      if (!code) {
        res.redirect(
          buildClientRedirect({
            error: 'invalid_request',
            error_description: 'Missing authorization code on callback',
          })
        );
        return;
      }

      try {
        const tokens = await exchangeCodeForToken(
          code,
          txn.serverRedirectUri,
          this.secrets.clientId,
          this.secrets.clientSecret,
          this.secrets.tenantId || 'common',
          txn.serverCodeVerifier
        );

        const session = this.sessionManager.createSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          // exchangeCodeForToken's return type omits id_token (scope-narrowed
          // upstream helper). Cast to read it.
          id_token: (tokens as unknown as { id_token?: string }).id_token,
          scope: tokens.scope,
        });

        const authCode = this.brokerStore.createAuthCode({
          sessionId: session.sessionId,
          clientId: txn.clientId,
          clientRedirectUri: txn.clientRedirectUri,
          clientCodeChallenge: txn.clientCodeChallenge,
          scope: tokens.scope,
        });

        res.redirect(buildClientRedirect({ code: authCode }));
      } catch (error) {
        // Forward a recoverable upstream OAuth error (e.g. AADSTS70043 sign-in
        // frequency) to the client so its UI can react / re-prompt, rather than
        // flattening everything to a generic server_error (cf. issue #485). We
        // pass only error + error_description — never trace_id/correlation_id.
        if (error instanceof OAuthUpstreamError) {
          logger.warn('Auth callback: upstream OAuth error', {
            upstream_status: error.status,
            error: error.body.error,
            suberror: error.body.suberror,
          });
          res.redirect(
            buildClientRedirect({
              error: error.body.error,
              ...(error.body.error_description
                ? { error_description: error.body.error_description }
                : {}),
            })
          );
          return;
        }
        logger.error('Auth callback error:', error);
        res.redirect(
          buildClientRedirect({
            error: 'server_error',
            error_description: 'Authorization failed during token exchange',
          })
        );
      }
    });

    app.post('/token', (req, res) => {
      const body = req.body;
      if (!body || !body.grant_type) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'grant_type is required',
        });
        return;
      }
      if (body.grant_type !== 'authorization_code') {
        // Refresh is handled server-side; sessions don't expose a refresh_token to MCP clients.
        res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: `Grant type '${body.grant_type}' is not supported. The MCP client receives a long-lived session id; refresh is handled server-side.`,
        });
        return;
      }

      const code = body.code;
      if (typeof code !== 'string' || code === '') {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'code is required',
        });
        return;
      }

      const record = this.brokerStore.consumeAuthCode(code);
      if (!record) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code is invalid or expired',
        });
        return;
      }

      // RFC 6749 §4.1.3: redirect_uri was included at /authorize, so it is
      // MANDATORY here and must match exactly. A missing value is rejected — we
      // never silently skip the binding.
      if (body.redirect_uri !== record.clientRedirectUri) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'redirect_uri does not match the authorization request',
        });
        return;
      }

      // When the code was minted for a registered (DCR) client, the redeemer
      // MUST present that exact client_id. A missing client_id is rejected, not
      // skipped. (Legacy codes from unregistered clients carry a null clientId
      // and are bound by redirect_uri + PKCE only.)
      if (record.clientId && body.client_id !== record.clientId) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'client_id does not match the authorization request',
        });
        return;
      }

      // PKCE (S256): the verifier the client presents now must hash to the
      // challenge it sent at /authorize. This is the proof-of-possession that
      // makes the brokered code safe even if it leaks via a redirect — which
      // holds only because /authorize rejected any non-S256 method.
      const codeVerifier = body.code_verifier;
      if (
        typeof codeVerifier !== 'string' ||
        !verifyPkce(codeVerifier, record.clientCodeChallenge)
      ) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed',
        });
        return;
      }

      // Hand the MCP client our opaque session id in place of a real access
      // token. Long expires_in so the client doesn't try to refresh; we refresh
      // against Microsoft transparently on each MCP call when needed.
      res.json({
        access_token: record.sessionId,
        token_type: 'Bearer',
        expires_in: 60 * 60 * 24 * 30, // 30 days
        scope: record.scope,
      });
    });

    app.post('/revoke', async (req, res) => {
      const token = req.body?.token;
      if (typeof token !== 'string' || token === '') {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'token is required',
        });
        return;
      }
      // RFC 7009 says respond 200 regardless of whether the token existed.
      await this.sessionManager.revokeSession(token).catch((error) => {
        logger.warn(`Revocation error (ignored): ${(error as Error).message}`);
      });
      res.status(200).end();
    });

    const mcpAuth = sessionAuth(this.sessionManager);
    const mcpHandlerFactory =
      (passBody: boolean) =>
      async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          await transport.handleRequest(req as Request, res, passBody ? req.body : undefined);
        };

        try {
          const session = req.session;
          if (!session) {
            // sessionAuth guarantees session is set; defensive.
            res.status(500).json({ error: 'server_error' });
            return;
          }
          await requestContext.run(
            {
              accessToken: session.tokens.access_token,
              userOid: session.userOid,
              tenantId: session.tenantId,
              userPrincipalName: session.userPrincipalName,
              grantedScopes: session.tokens.scopes,
            },
            handler
          );
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

    app.get('/mcp', mcpAuth, express.json({ limit: '8mb' }), mcpHandlerFactory(false));
    app.post('/mcp', mcpAuth, express.json({ limit: '8mb' }), mcpHandlerFactory(true));

    app.get('/', (_req, res) => {
      res.send('Areté Microsoft 365 MCP Server is running');
    });

    return app;
  }
}

export default MicrosoftGraphServer;

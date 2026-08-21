import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import express, { Handler, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools, registerDiscoveryTools } from './graph-tools.js';
import { buildMcpServerInstructions } from './mcp-instructions.js';
import { installToolSchemaRefNormalization } from './normalize-tool-schema.js';
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
import { loadAttachmentUrlConfig, ATTACHMENT_ROUTE } from './lib/attachment-url-config.js';
import { AttachmentTicketStore } from './lib/attachment-tickets.js';
import { configureAttachmentMinting } from './lib/attachment-minting.js';
import { createAttachmentHandler } from './attachment-route.js';
import type { CommandOptions } from './cli.ts';
import { getSecrets, type AppSecrets } from './secrets.js';
import { getCloudEndpoints } from './cloud-config.js';
import { requestContext } from './request-context.js';
import { dumpError } from './crash-logging.js';
import crypto from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { isIP, isIPv6 } from 'node:net';
import type { AddressInfo } from 'node:net';
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

/**
 * Resolve `--attachment-port` / `MS365_MCP_ATTACHMENT_PORT` into a port number,
 * or null when the split listener is off.
 *
 * Validated strictly rather than coerced. `parseHttpOption` above falls back to
 * 3000 on garbage, which is defensible for the one port the server is *for*;
 * it is not defensible here, because the whole point of this port is that the
 * MCP surface is somewhere else. A silent fallback would put the attachment
 * route back on a port the operator did not choose, and `parseInt('3000x')`
 * quietly returning 3000 would put it on the MCP port -- reassembling exactly
 * the shared listener this option exists to take apart.
 *
 * Port 0 is refused for the same reason. Node reads it as "any free port",
 * which starts cleanly and serves attachments at an address nobody was told.
 */
export function parseAttachmentPortOption(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(
      '--attachment-port / MS365_MCP_ATTACHMENT_PORT must be a port number between 1 and ' +
        `65535, got ${JSON.stringify(String(value))}`
    );
  }
  const port = Number(raw);
  if (port < 1 || port > 65535) {
    throw new Error(
      '--attachment-port / MS365_MCP_ATTACHMENT_PORT must be a port number between 1 and ' +
        `65535, got ${port}`
    );
  }
  return port;
}

/** One label of a DNS name: letters, digits and hyphens, not starting or ending on a hyphen. */
const HOSTNAME_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

function isHostname(value: string): boolean {
  // A single trailing dot is the fully-qualified spelling and resolves fine.
  const name = value.endsWith('.') ? value.slice(0, -1) : value;
  if (name.length === 0 || name.length > 253) return false;
  return name
    .split('.')
    .every((label) => label.length > 0 && label.length <= 63 && HOSTNAME_LABEL.test(label));
}

/**
 * Resolve `--attachment-host` / `MS365_MCP_ATTACHMENT_HOST` into a bind address,
 * or null to inherit the MCP listener's host.
 *
 * **Why a second interface and not just a second port.** `--attachment-port`
 * moves the route to a listener of its own, but until this option existed both
 * listeners bound the same host -- and with `--http 3000` that host is undefined,
 * so Node binds the wildcard and both ports answer on every interface. Docker
 * network membership grants a peer *every* port on a container, not one, so a
 * conversion sidecar admitted to a shared bridge in order to fetch `/attachment`
 * on 3001 can equally dial `/mcp` on 3000 -- and under `--trust-proxy-auth`,
 * where reachability is the whole of the authentication, that is the entire tool
 * surface with no credential. Two ports on one wildcard is a naming convention,
 * not an isolation boundary. Binding them to different addresses makes the MCP
 * port unreachable from the sidecar's network by *binding* rather than by a rule
 * that has to keep matching.
 *
 * Strict for the same reason `parseAttachmentPortOption` is: every value this
 * refuses is one where a lenient reading would bind somewhere the operator did
 * not name while they believed the surfaces were separated. In particular a
 * whitespace-only value throws rather than silently meaning "inherit".
 *
 * IPv6 is accepted, bracketed (`[::1]`) or bare (`::1`), and normalised to the
 * bare form `net.Server.listen` wants. This does *not* contradict
 * `attachment-url-config.ts` refusing an IPv6 literal in
 * `MS365_MCP_ATTACHMENT_URL_BASE`: that refusal is about the URL *signature*,
 * whose canonical string covers the host and which this runtime and the
 * verifying sidecar's Python normalise differently. A bind address is never
 * signed -- it is handed to the kernel. What follows from the pair is a
 * deployment note, not a code rule: bind the attachment listener to whatever
 * address you like, but keep naming it in the base by hostname.
 */
export function parseAttachmentHostOption(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();

  const reject = (reason: string): never => {
    throw new Error(
      `--attachment-host / MS365_MCP_ATTACHMENT_HOST must be a bare IPv4 address, IPv6 ` +
        `address or hostname (${reason}), got ${JSON.stringify(String(value))}`
    );
  };

  if (raw === '') reject('it is empty');

  // Bracketed IPv6, the spelling operators copy out of a URL.
  if (raw.startsWith('[') || raw.endsWith(']')) {
    if (!raw.startsWith('[') || !raw.endsWith(']')) reject('unbalanced brackets');
    const inner = raw.slice(1, -1);
    if (!isIPv6(inner)) reject('the brackets do not contain an IPv6 address');
    return inner;
  }

  if (isIP(raw) !== 0) return raw;
  if (isHostname(raw)) return raw;

  // The likeliest mistake, and worth its own sentence: an operator who expected
  // this flag to take an address the way --http does.
  if (raw.includes(':')) {
    reject('this takes a host only -- the port goes on --attachment-port');
  }
  return reject('not a valid address or hostname');
}

/** True when a listener bound to `address` answers on the wildcard, i.e. everywhere. */
function isWildcardAddress(address: string): boolean {
  return address === '0.0.0.0' || address === '::' || address === '';
}

/** `host:port`, bracketing an IPv6 literal so the result is a usable authority. */
function formatAuthority(address: string, port: number): string {
  return isIPv6(address) ? `[${address}]:${port}` : `${address}:${port}`;
}

/**
 * How to describe a listener in the startup log, read from what it actually
 * bound rather than from what was asked for.
 *
 * The two differ in exactly the case that matters. The old line hard-coded
 * `all interfaces (0.0.0.0)` whenever no host was configured, but an unhosted
 * `listen()` on a dual-stack box binds `::` -- so the log named an address family
 * the process had not bound, on the one line an operator reads to check whether
 * the two listeners are actually separated.
 */
function describeBoundAddress(bound: AddressInfo): { label: string; authority: string } {
  const authority = formatAuthority(bound.address, bound.port);
  if (isWildcardAddress(bound.address)) {
    return { label: `all interfaces (${authority})`, authority: `localhost:${bound.port}` };
  }
  return { label: authority, authority };
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

  /**
   * Every HTTP listener `start()` opened, so `stop()` can close every one.
   *
   * A list rather than a field because `--attachment-port` makes it two, and an
   * untracked listener cannot be closed at all: it holds the event loop open
   * for the life of the process. One that is only *usually* two is worse than
   * either, so nothing here special-cases the count.
   */
  private httpServers: HttpServer[] = [];

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
        this.options.allowedScopes,
        Boolean(this.options.http)
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
        this.options.allowedScopes,
        Boolean(this.options.http)
      );
    }

    // Strict JSON-Schema backends (e.g. Kimi/Moonshot) reject a tools/list whose
    // inputSchema $refs aren't anchored under #/$defs/. The SDK emits root-relative
    // refs for recursive/shared Microsoft Graph schemas and hard-codes its conversion
    // options, so normalize the emitted schemas here. See issue #571.
    installToolSchemaRefNormalization(server);

    return server;
  }

  async initialize(version: string): Promise<void> {
    this.secrets = await getSecrets();
    this.version = version;

    // Detect multi-account mode and cache account names for schema enum.
    // Skip in HTTP bearer mode and BYOT: those requests are authenticated by the
    // client's OAuth bearer token, so MSAL-cached accounts can never serve them and
    // advertising an `account` parameter would be misleading (discussion #467).
    // HTTP with --trust-proxy-auth falls back to the MSAL cache, so account
    // routing stays available there.
    const accountRoutingAvailable =
      (!this.options.http || this.options.trustProxyAuth) && !this.authManager.isOAuthModeEnabled();
    if (accountRoutingAvailable) {
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
  }

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Microsoft 365 MCP Server starting...');

    // Debug: Check if secrets are loaded
    logger.info('Secrets Check:', {
      CLIENT_ID: this.secrets?.clientId ? `${this.secrets.clientId.substring(0, 8)}...` : 'NOT SET',
      CLIENT_SECRET: this.secrets?.clientSecret ? 'SET' : 'NOT SET',
      TENANT_ID: this.secrets?.tenantId || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    });

    if (this.options.readOnly) {
      logger.info('Server running in READ-ONLY mode. Write operations are disabled.');
    }

    // The minting feature lives entirely inside the HTTP branch below, because
    // the whole point of it is a URL something else can fetch. Passing the flag
    // to a stdio run used to do nothing at all -- no route, no config
    // validation, no complaint -- so an operator who set it in the wrong place
    // saw a clean startup and a tool that never minted.
    if (this.options.enableAttachmentUrls && !this.options.http) {
      logger.warn(
        '--enable-attachment-urls has no effect in stdio mode and is being ignored: ' +
          'the minted URL has to be reachable over HTTP. Start with --http to use it.'
      );
    }

    // --attachment-port: serve the attachment route on a listener of its own.
    //
    // The dependency is checked before the mode is, and unconditionally, on
    // purpose. Alone the flag would open a second listener with nothing on it,
    // and the operator who typed it believes they have separated the attachment
    // surface from the tool surface. Warning and continuing would leave that
    // belief intact while the route stayed on the MCP port -- the exact
    // arrangement the flag exists to prevent -- so this refuses to start in
    // every mode rather than only in the one where it would have worked.
    const attachmentPort = parseAttachmentPortOption(this.options.attachmentPort);
    if (attachmentPort !== null && !this.options.enableAttachmentUrls) {
      throw new Error(
        '--attachment-port requires --enable-attachment-urls: on its own there is no ' +
          'attachment route to put on the second listener. Pass both, or neither.'
      );
    }

    // --attachment-host: which interface that second listener binds.
    //
    // Refused without --attachment-port for the same reason the port is refused
    // without the feature flag: alone it names an interface for a listener that
    // was never going to exist, the attachment route stays on the MCP app, and
    // the operator reading their own command line believes they have pinned the
    // one surface with no credential on it to an address the tool surface cannot
    // be reached at. Silently ignoring the value would leave that belief intact.
    const attachmentHost = parseAttachmentHostOption(this.options.attachmentHost);
    if (attachmentHost !== null && attachmentPort === null) {
      throw new Error(
        '--attachment-host requires --attachment-port: without a second listener there is ' +
          'no separate interface to bind, and the attachment route stays on the MCP app.'
      );
    }

    // Ignored in stdio mode, like the flag it depends on: there is no HTTP
    // listener to split in two.
    if (attachmentPort !== null && !this.options.http) {
      logger.warn(
        '--attachment-port has no effect in stdio mode and is being ignored: there is no ' +
          'HTTP listener to split. Start with --http to use it.'
      );
    }

    if (this.options.http) {
      const { host, port } = parseHttpOption(this.options.http);

      const app = express();

      // Trust-proxy configuration. `true` (trust every hop) is too permissive
      // once per-IP rate limiting is in play: a client can spoof the leftmost
      // X-Forwarded-For entry and bypass the limiter
      // (express-rate-limit ERR_ERL_PERMISSIVE_TRUST_PROXY). Default to a single
      // upstream hop, which fits the common reverse-proxy deployment. Override
      // with MS365_MCP_TRUST_PROXY_HOPS=<n> for multi-hop chains, 0 to disable
      // proxy trust, or a comma-separated subnet list for explicit ranges.
      const trustProxyEnv = process.env.MS365_MCP_TRUST_PROXY_HOPS;
      if (trustProxyEnv !== undefined && trustProxyEnv !== '') {
        const asNum = Number(trustProxyEnv);
        app.set('trust proxy', Number.isFinite(asNum) ? asNum : trustProxyEnv);
      } else {
        app.set('trust proxy', 1);
      }

      // Security headers. CSP is disabled because this server returns JSON and
      // OAuth metadata, not HTML; HSTS assumes TLS is terminated upstream.
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
      // Defense-in-depth for the OAuth surface (/authorize, /token, /register)
      // and the MCP endpoint (/mcp). Limits are generous for normal usage and
      // only fire on abuse patterns.
      const rateLimitDisabled =
        process.env.MS365_MCP_RATE_LIMIT_DISABLED === 'true' ||
        process.env.MS365_MCP_RATE_LIMIT_DISABLED === '1';
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

      // Public URL resolution for browser-facing OAuth endpoints.
      //
      // When running behind a reverse proxy, the request's Host header only
      // reflects the public origin if the client reached the server through
      // the proxy. If a client (e.g. Open WebUI) talks to the server over
      // an internal Docker hostname, Host is that internal name, so the
      // authorize URL we hand back to the user's browser would be
      // unresolvable from outside. Setting MS365_MCP_PUBLIC_URL pins the
      // browser-facing origin while the server-to-server endpoints
      // (token, register, resource) stay on the request origin so clients
      // that reach us internally don't need NAT loopback through the proxy.
      //
      // DEPRECATED: --base-url / MS365_MCP_BASE_URL. Use --public-url /
      // MS365_MCP_PUBLIC_URL instead. The deprecated names are still read
      // here so existing configurations don't crash at startup, but they
      // will be removed in a future release. Note that the original
      // --base-url was effectively a no-op in practice: it was plumbed
      // through the SDK's mcpAuthRouter, whose metadata endpoint is
      // shadowed by the custom handler below, so no deployment relied
      // on its actual semantics.
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
        const requestOrigin = `${protocol}://${req.get('host')}`;
        const browserBase = publicBase ?? requestOrigin;

        // Mirror the protected-resource handler below: in OBO mode both discovery
        // docs must advertise the GUID-form resource scope, else RFC 8414 clients
        // request raw Graph scopes and get a token the OBO exchange rejects (#516).
        const scopes = this.options.obo
          ? [`${this.secrets!.clientId}/access_as_user`]
          : resolveAuthScopes(this.options);

        const metadata: Record<string, unknown> = {
          issuer: browserBase,
          authorization_endpoint: `${browserBase}/authorize`,
          token_endpoint: `${browserBase}/token`,
          response_types_supported: ['code'],
          response_modes_supported: ['query'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_methods_supported: ['none'],
          code_challenge_methods_supported: ['S256'],
          scopes_supported: scopes,
        };

        if (this.options.enableDynamicRegistration) {
          metadata.registration_endpoint = `${browserBase}/register`;
        }

        res.json(metadata);
      });

      // OAuth Protected Resource Discovery
      const protectedResourcesHandler: Handler = async (req, res) => {
        const protocol = req.secure ? 'https' : 'http';
        const requestOrigin = `${protocol}://${req.get('host')}`;
        const browserBase = publicBase ?? requestOrigin;

        // OBO advertises the GUID-form scope (not api://...) — with a single
        // app as both API and OBO client, the user token's aud is the app
        // itself, and Azure only allows refreshing such self-tokens when the
        // resource is the GUID-based App Identifier (AADSTS90009 otherwise).
        const scopes = this.options.obo
          ? [`${this.secrets!.clientId}/access_as_user`]
          : resolveAuthScopes(this.options);

        res.json({
          resource: `${browserBase}/mcp`,
          authorization_servers: [browserBase],
          scopes_supported: scopes,
          bearer_methods_supported: ['header'],
          resource_documentation: browserBase,
        });
      };

      app.get('/.well-known/oauth-protected-resource', protectedResourcesHandler);
      app.get('/.well-known/oauth-protected-resource/*path', protectedResourcesHandler);

      if (this.options.enableDynamicRegistration) {
        app.post('/register', async (req, res) => {
          const body = req.body;
          logger.info('Client registration request', { body });

          const clientId = `mcp-client-${Date.now()}`;

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
      // Implements two-leg PKCE: client↔server and server↔Microsoft are independent
      app.get('/authorize', async (req, res) => {
        const url = new URL(req.url!, `${req.protocol}://${req.get('host')}`);
        const tenantId = this.secrets?.tenantId || 'common';
        const clientId = this.secrets!.clientId;
        const cloudEndpoints = getCloudEndpoints(this.secrets!.cloudType);
        const microsoftAuthUrl = new URL(
          `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/authorize`
        );

        // Extract client's PKCE parameters (from claude.ai or other MCP client)
        const clientCodeChallenge = url.searchParams.get('code_challenge');
        const clientCodeChallengeMethod = url.searchParams.get('code_challenge_method');
        const state = url.searchParams.get('state');

        // Validate redirect_uri before forwarding to Microsoft to mitigate
        // CWE-601 (open redirect). Microsoft Entra performs its own redirect
        // URI validation, but a permissively configured app registration
        // (e.g. wildcard reply URLs) would let an attacker craft an
        // /authorize link whose authorization code is delivered to an
        // attacker-controlled origin. We defensively reject obviously
        // dangerous schemes (javascript:, data:, file:) and arbitrary
        // non-loopback http URIs here, and honour an explicit allowlist
        // configured via MS365_MCP_ALLOWED_REDIRECT_URIS.
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

        // Forward parameters that Microsoft OAuth 2.0 v2.0 supports,
        // but NOT code_challenge/code_challenge_method — we generate our own for Microsoft
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

        // Two-leg PKCE: if the client sent a code_challenge, store it and generate
        // a separate PKCE pair for the server↔Microsoft leg
        if (clientCodeChallenge && state) {
          const serverCodeVerifier = crypto.randomBytes(32).toString('base64url');
          const serverCodeChallenge = crypto
            .createHash('sha256')
            .update(serverCodeVerifier)
            .digest('base64url');

          // Clean up expired entries before adding new ones
          const now = Date.now();
          const maxAge = 10 * 60 * 1000; // 10 minutes
          const maxEntries = 1000;
          for (const [key, value] of this.pkceStore) {
            if (now - value.createdAt > maxAge) {
              this.pkceStore.delete(key);
            }
          }

          // Reject if store is still at capacity after cleanup (prevents memory exhaustion)
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

          // Send our server-generated code_challenge to Microsoft
          microsoftAuthUrl.searchParams.set('code_challenge', serverCodeChallenge);
          microsoftAuthUrl.searchParams.set('code_challenge_method', 'S256');

          logger.info('Two-leg PKCE: stored client challenge, generated server challenge', {
            state: state.substring(0, 8) + '...',
          });
        } else if (clientCodeChallenge) {
          // No state to key on — fall back to forwarding directly (Claude Code path)
          microsoftAuthUrl.searchParams.set('code_challenge', clientCodeChallenge);
          if (clientCodeChallengeMethod) {
            microsoftAuthUrl.searchParams.set('code_challenge_method', clientCodeChallengeMethod);
          }
        }

        // Use our Microsoft app's client_id
        microsoftAuthUrl.searchParams.set('client_id', clientId);

        // Determine base scopes from the client request or from the user's
        // configuration flags, then silently inject User.Read and offline_access.
        // Neither is advertised in scopes_supported:
        //   - User.Read: needed by Microsoft Graph /me access, which the
        //     token-verification and login-test code paths rely on. Without
        //     it, narrow presets (e.g. search-only) would produce tokens that
        //     can't validate against /me.
        //   - offline_access: needed so Entra ID issues a refresh token for
        //     silent renewal. Advertising it in OAuth metadata made MCP
        //     clients request it explicitly, which triggers a "Maintain
        //     access to data" consent line that fails in tenants where user
        //     consent for applications is restricted by policy (even when
        //     admin has pre-consented every scope).
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

        // Redirect to Microsoft's authorization page
        res.redirect(microsoftAuthUrl.toString());
      });

      // Token exchange endpoint
      app.post('/token', async (req, res) => {
        try {
          // Log token endpoint call (redact sensitive data)
          logger.info('Token endpoint called', {
            method: req.method,
            url: req.url,
            contentType: req.get('Content-Type'),
            grant_type: req.body?.grant_type,
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
            const tenantId = this.secrets?.tenantId || 'common';
            const clientId = this.secrets!.clientId;
            const clientSecret = this.secrets?.clientSecret;

            logger.info('Token endpoint: authorization_code exchange', {
              redirect_uri: body.redirect_uri,
              has_code: !!body.code,
              has_code_verifier: !!body.code_verifier,
              clientId,
              tenantId,
              hasClientSecret: !!clientSecret,
            });

            // Two-leg PKCE: check if we have a stored PKCE mapping for this exchange
            // We need to find the matching state — it's not sent in the token request,
            // but the code is unique per authorization, so we verify the client's
            // code_verifier against all stored challenges and use the server's verifier
            let serverCodeVerifier: string | undefined;

            if (body.code_verifier) {
              // Look through pkceStore for a matching client code_challenge
              const clientVerifier = body.code_verifier as string;
              const clientChallengeComputed = crypto
                .createHash('sha256')
                .update(clientVerifier)
                .digest('base64url');

              for (const [state, pkceData] of this.pkceStore) {
                if (pkceData.clientCodeChallenge === clientChallengeComputed) {
                  // Client's code_verifier matches stored code_challenge — two-leg PKCE
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
              serverCodeVerifier || (body.code_verifier as string | undefined),
              this.secrets!.cloudType
            );
            res.json(result);
          } else if (body.grant_type === 'refresh_token') {
            const tenantId = this.secrets?.tenantId || 'common';
            const clientId = this.secrets!.clientId;
            const clientSecret = this.secrets?.clientSecret;

            // Log whether using public or confidential client
            if (clientSecret) {
              logger.info('Refresh endpoint: Using confidential client with client_secret');
            } else {
              logger.info('Refresh endpoint: Using public client without client_secret');
            }

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

      // Microsoft Graph MCP endpoints with bearer token auth (or pass-through
      // when --trust-proxy-auth is set; see microsoftBearerTokenAuthMiddleware
      // for the AuthManager fallback that makes that mode work).
      const mcpAuth = microsoftBearerTokenAuthMiddleware({
        trustProxyAuth: this.options.trustProxyAuth,
        allowUnauthenticatedDiscovery: this.options.allowUnauthenticatedDiscovery,
        publicUrl: publicBase,
      });
      app.get('/mcp', (req: Request, res: Response) => {
        res.status(405).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed.',
          },
          id: null,
        });
      });

      app.post(
        '/mcp',
        mcpAuth,
        async (req: Request & { microsoftAuth?: { accessToken: string } }, res: Response) => {
          const handler = async () => {
            const server = this.createMcpServer();
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: undefined, // Stateless mode
              enableJsonResponse: true, // Reply to POSTs with plain JSON, not one-shot SSE
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

      // Server-minted attachment URLs (--enable-attachment-urls).
      //
      // loadAttachmentUrlConfig throws on a half-configured feature, and that
      // exception is deliberately not caught: a signing feature that comes up
      // without a key would mint URLs nothing can verify, and would do it
      // silently. Failing to start names the missing variable once, to the
      // person who can set it.
      const attachmentConfig = loadAttachmentUrlConfig(Boolean(this.options.enableAttachmentUrls));
      let attachmentApp: express.Express | null = null;
      if (attachmentConfig) {
        const ticketStore = new AttachmentTicketStore(attachmentConfig.ttlSeconds);
        configureAttachmentMinting({ store: ticketStore, config: attachmentConfig });

        // Where the route goes.
        //
        // Without --attachment-port it goes on the MCP app, which is what this
        // has always done and stays the default. With it, the route gets an
        // Express app of its own and the MCP app never learns the path exists.
        //
        // That separation is the point, and it is a real one only because these
        // are two apps rather than two paths on one. In a deployment running
        // --trust-proxy-auth the MCP endpoint reads no Authorization header at
        // all -- reachability *is* authentication -- so a single listener means
        // any container that can fetch an attachment can also call every tool
        // on the server. Two listeners let the network policy say "the
        // converter reaches the attachment port, and nothing else", and that
        // sentence is enforceable.
        //
        // The dedicated app is deliberately bare: no JSON or urlencoded body
        // parsers (the route is a GET whose only input is a query parameter),
        // no CORS (nothing fetches this from a browser origin), no OAuth
        // router, no /mcp, not even the health check. Everything not mounted
        // 404s by Express's own default, so the isolation is a property of what
        // was built rather than of a rule somewhere that has to keep matching.
        const dedicated = attachmentPort !== null;
        attachmentApp = dedicated ? express() : app;

        if (dedicated) {
          // Same header policy as the MCP app; there is no reason for the two
          // listeners to disagree about, say, nosniff.
          attachmentApp.use(
            helmet({
              contentSecurityPolicy: false,
              crossOriginEmbedderPolicy: false,
              hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
            })
          );
          // `trust proxy` is left at Express's default (off) here, deliberately
          // unlike the MCP app above, and MS365_MCP_TRUST_PROXY_HOPS is not read
          // for it. This listener exists to be dialled directly by a sidecar on
          // a container network, not through the reverse proxy that terminates
          // the MCP side; honouring X-Forwarded-For on it would let the one
          // uncredentialed surface the server exposes pick its own rate-limit
          // bucket and so opt out of the limiter below. A deployment that really
          // does front this port with a proxy wants a knob added here, not the
          // MCP app's setting inherited by accident.
        }

        // Its own limiter, tighter than the MCP one. This is the only route
        // reachable with no credential at all -- the ticket in the query is the
        // credential -- so it is the one brute-force surface the server exposes.
        // A 256-bit ticket makes guessing hopeless regardless; this bounds the
        // cost of someone trying. It follows the route onto whichever app the
        // route landed on: moving the route to its own listener must not be a
        // way to shed the protection that came with it.
        if (!rateLimitDisabled) {
          attachmentApp.use(
            ATTACHMENT_ROUTE,
            rateLimit({
              windowMs: 60_000,
              max: 60,
              standardHeaders: 'draft-7',
              legacyHeaders: false,
            })
          );
        }
        attachmentApp.get(
          ATTACHMENT_ROUTE,
          createAttachmentHandler({
            store: ticketStore,
            getGraphClient: () => this.graphClient,
            authManager: this.authManager,
          })
        );
        logger.info(
          `  - Attachment URLs: ${attachmentConfig.base}${ATTACHMENT_ROUTE} ` +
            `(ttl ${attachmentConfig.ttlSeconds}s, key id ${attachmentConfig.keyId})`
        );
        if (dedicated) {
          // The minted URL is built from MS365_MCP_ATTACHMENT_URL_BASE, which
          // this server cannot check against the port it just bound -- the base
          // is commonly a container name reached through a network this process
          // cannot see. Log both so a mismatch is one line apart in the startup
          // output instead of a fetch failure in another codebase.
          logger.info(
            `  - Attachment listener: separate, port ${attachmentPort} ` +
              `(${ATTACHMENT_ROUTE} is NOT served on the MCP port; ` +
              'MS365_MCP_ATTACHMENT_URL_BASE must name this port)'
          );
        }
      } else {
        configureAttachmentMinting(null);
      }

      // Health check endpoint
      app.get('/', (req, res) => {
        res.send('Microsoft 365 MCP Server is running');
      });

      // Every line below is written from the address the kernel actually
      // handed back, not from the option that asked for it. On this pair of
      // listeners the log is how an operator checks whether the surfaces are
      // separated, so it must not be able to name a host it did not bind.
      const mcpBound = await this.listen(app, port, host);
      const mcp = describeBoundAddress(mcpBound);
      logger.info(`Server listening on ${mcp.label}`);
      logger.info(`  - MCP endpoint: http://${mcp.authority}/mcp`);
      logger.info(`  - OAuth endpoints: http://${mcp.authority}/auth/*`);
      logger.info(
        `  - OAuth discovery: http://${mcp.authority}/.well-known/oauth-authorization-server`
      );

      if (attachmentApp && attachmentPort !== null) {
        // Inherits the MCP listener's host unless --attachment-host overrides it.
        // Inheriting is the safe default rather than the useful one: a deployment
        // that binds the MCP port to loopback has said something about who may
        // reach this process, and putting the uncredentialed surface on every
        // interface without being asked would answer that question differently.
        // Separating the two interfaces is what actually isolates them, and it
        // has to be typed.
        //
        // If this bind fails the whole start fails -- and `stop()` below closes
        // the listener that did come up. Half a split is not a degraded mode: it
        // is the attachment route missing while the operator's network policy
        // already assumes it moved.
        let attachmentBound: AddressInfo;
        try {
          attachmentBound = await this.listen(
            attachmentApp,
            attachmentPort,
            attachmentHost ?? host
          );
        } catch (error) {
          await this.stop();
          throw error;
        }
        const attachment = describeBoundAddress(attachmentBound);
        logger.info(`Attachment listener on ${attachment.label} — serves ${ATTACHMENT_ROUTE} only`);

        // The split is only an isolation boundary if the two listeners are
        // reachable from different places. Sharing an address -- or either one
        // taking the wildcard -- means any peer that can reach the attachment
        // port can reach the MCP port on the same interface, and under
        // --trust-proxy-auth reaching /mcp is all the authentication there is.
        // Said once, at startup, because the failure is silent by construction:
        // everything works, and the sidecar simply also has every tool.
        if (
          this.options.trustProxyAuth &&
          this.listenersShareAnInterface(mcpBound, attachmentBound)
        ) {
          logger.warn(
            `--attachment-port split ${ATTACHMENT_ROUTE} onto port ${attachmentBound.port}, but ` +
              `both listeners answer on the same interface (MCP ${mcp.label}, attachment ` +
              `${attachment.label}), so the ports are not isolated from each other. ` +
              'With --trust-proxy-auth, /mcp requires no credential, so anything permitted to ' +
              'reach the attachment port can also call every tool. Bind them to different ' +
              '--http and --attachment-host addresses, or keep the MCP port off the network ' +
              'the attachment fetcher is on.'
          );
        }
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

  /**
   * Bind one Express app and record the listener.
   *
   * Awaited rather than fire-and-forget, which is what `app.listen(...)` on its
   * own was. Two consequences, both wanted. A bind failure (EADDRINUSE is the
   * live one now that there is a second port to collide) rejects `start()`, so
   * `index.ts` reports it and exits 1 instead of the `error` event reaching the
   * process-wide `uncaughtException` handler as an unattributed dump. And the
   * caller knows the port is actually accepting connections when this resolves,
   * so the second bind cannot race the first.
   *
   * **The callback's argument is read, and that is not a formality.** Express 5
   * wraps the callback passed to `app.listen` in `once()` and registers that
   * same wrapper as the server's `error` handler (`application.js`), so a bind
   * that fails does not skip the callback -- it calls it with an Error. The
   * zero-argument `() => logger.info('Server listening on ...')` this replaces
   * is the shape every example uses, and it announced a port the process had
   * not got: on EADDRINUSE the server logged that it was listening and stayed
   * up serving nothing.
   */
  private async listen(
    app: express.Express,
    port: number,
    host: string | undefined
  ): Promise<AddressInfo> {
    // Declared out here rather than read inside `done`, and that is load-bearing.
    // A callback passed to `app.listen` is not guaranteed to run on a later
    // tick -- a test double that invokes it synchronously does so before
    // `app.listen` has returned the handle, and a `done` that closed over a
    // `const server` declared after the call would hit the temporal dead zone
    // and throw `Cannot access 'server' before initialization`. Resolving the
    // promise first and reading the handle after the `await` puts the read on a
    // microtask, by which time the assignment below has definitely happened.
    let server!: HttpServer;
    await new Promise<void>((resolve, reject) => {
      const done = (error?: Error) => (error ? reject(error) : resolve());
      server = host ? app.listen(port, host, done) : app.listen(port, done);
      // Not redundant with the above: that wiring is Express's, not Node's, so
      // an `error` raised after the first settle -- or a future version that
      // stops doing it -- still has somewhere to land. Rejecting an already
      // settled promise is a no-op.
      server.once('error', reject);
      // Tracked before it is listening, not after: a bind that fails part-way
      // still leaves a handle, and an untracked one is one `stop()` can never
      // close.
      this.httpServers.push(server);
    });

    // What was bound, not what was asked for, so callers cannot log an address
    // the kernel never gave them -- the wildcard case is the live one, where an
    // unhosted listen binds `::` rather than the `0.0.0.0` the old log claimed.
    const address = server.address();
    if (address === null || typeof address === 'string') {
      // A pipe or an already-closed handle. Neither is reachable from here, and
      // guessing an authority for one would be the exact fiction this return
      // type exists to prevent.
      throw new Error(`Listener on port ${port} reported no TCP address`);
    }
    return address;
  }

  /**
   * Whether the two listeners can be reached from a common interface.
   *
   * A wildcard on either side answers everywhere, so it overlaps whatever the
   * other one bound -- and on Linux a dual-stack `::` accepts IPv4 too, so the
   * families are not a distinction worth drawing here. Otherwise they overlap
   * only if they bound the same address. Deliberately coarse in the direction of
   * warning: `127.0.0.1` and `127.0.0.2` are two addresses on one interface,
   * separate to `bind()` and to a container network, and a check that tried to
   * reason about routes instead of addresses would be wrong more often than this.
   */
  private listenersShareAnInterface(a: AddressInfo, b: AddressInfo): boolean {
    if (isWildcardAddress(a.address) || isWildcardAddress(b.address)) return true;
    return a.address === b.address;
  }

  /**
   * Close every listener this server opened.
   *
   * `close()` alone is not enough and the difference is not theoretical: it
   * stops accepting but waits on established sockets, and a keep-alive client
   * (Node's own `fetch` is one) holds one open by default, so the process hangs
   * instead of exiting. `closeIdleConnections()` drops exactly those, while a
   * transfer still in flight -- an attachment being streamed -- is allowed to
   * finish.
   *
   * Minting is switched off at the same time. The tickets live in a store this
   * server owns, and after this returns there is no listener left to redeem
   * them on; continuing to hand out URLs for a dead route would be a lie the
   * agent only discovers at fetch time.
   */
  async stop(): Promise<void> {
    const servers = this.httpServers.splice(0);
    configureAttachmentMinting(null);
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
            server.closeIdleConnections();
          })
      )
    );
  }
}

export default MicrosoftGraphServer;

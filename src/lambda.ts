/**
 * AWS Lambda handler entry point.
 *
 * Wraps the MCP server's HTTP/Express app in a serverless-express adapter
 * so it can run behind API Gateway. Uses custom OAuth 2.1 endpoints with
 * Microsoft as the upstream provider.
 *
 * Deploy via SAM: see template.yaml at the project root.
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import logger from './logger.js';
import { registerGraphTools } from './graph-tools.js';
import { registerWordTools } from './custom-tools/word.js';
import { registerExcelWriteTools } from './custom-tools/excel-write.js';
import GraphClient from './graph-client.js';
import AuthManager, { buildScopesFromEndpoints } from './auth.js';
import { getSecrets } from './secrets.js';
import { version } from './version.js';
import { getCloudEndpoints } from './cloud-config.js';
import { requestContext } from './request-context.js';
import {
  exchangeCodeForToken,
  microsoftBearerTokenAuthMiddleware,
  refreshAccessToken,
} from './lib/microsoft-auth.js';

let cachedApp: express.Express | null = null;
let serverlessExpress: any = null;

/**
 * Decode the `scp` claim from a Microsoft JWT to get granted scopes.
 * No signature verification — that's handled by the Graph API itself.
 */
function getScopesFromToken(accessToken: string): Set<string> {
  try {
    const payload = accessToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const scp: string = decoded.scp || '';
    return new Set(scp.split(' ').filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Map from Microsoft Graph scope → tool names that require it.
 * A tool is enabled if ANY of its scopes are granted (read scope enables read tools,
 * write scope enables write tools). Custom tools (Word, Excel write) are mapped here too.
 */
const SCOPE_TO_TOOLS: Record<string, string[]> = {
  'User.Read': ['get-current-user'],
  'Mail.Read': [
    'list-mail-messages', 'list-mail-folders', 'list-mail-child-folders',
    'list-mail-folder-messages', 'get-mail-message', 'list-mail-attachments', 'get-mail-attachment',
  ],
  'Mail.ReadWrite': [
    'create-mail-folder', 'create-mail-child-folder', 'update-mail-folder', 'delete-mail-folder',
    'create-draft-email', 'delete-mail-message', 'move-mail-message', 'update-mail-message',
    'add-mail-attachment', 'delete-mail-attachment', 'create-forward-draft',
    'create-reply-draft', 'create-reply-all-draft',
  ],
  'Mail.Send': [
    'send-mail', 'forward-mail-message', 'reply-mail-message',
    'reply-all-mail-message', 'send-draft-message',
  ],
  'Calendars.Read': [
    'list-calendar-events', 'get-calendar-event', 'list-specific-calendar-events',
    'get-specific-calendar-event', 'get-calendar-view', 'get-specific-calendar-view',
    'list-calendar-event-instances', 'list-calendars',
  ],
  'Calendars.ReadWrite': [
    'create-calendar-event', 'update-calendar-event', 'delete-calendar-event',
    'create-specific-calendar-event', 'update-specific-calendar-event', 'delete-specific-calendar-event',
  ],
  'Files.Read': [
    'list-drives', 'get-drive-root-item', 'get-root-folder', 'list-folder-files',
    'download-onedrive-file-content', 'get-excel-range', 'list-excel-worksheets',
    'read-word-document', 'get-word-outline', 'search-word-document',
  ],
  'Files.ReadWrite': [
    'delete-onedrive-file', 'upload-file-content', 'create-excel-chart',
    'format-excel-range', 'sort-excel-range',
    'create-workbook', 'write-excel-range', 'append-excel-rows', 'clear-excel-range',
  ],
  'Files.Read.All': ['search-query'],
  'Notes.Read': [
    'list-onenote-notebooks', 'list-onenote-notebook-sections',
    'list-onenote-section-pages', 'get-onenote-page-content',
  ],
  'Notes.Create': ['create-onenote-page', 'create-onenote-section-page'],
  'Tasks.Read': [
    'list-todo-task-lists', 'list-todo-tasks', 'get-todo-task',
    'list-planner-tasks', 'get-planner-plan', 'list-plan-tasks',
    'get-planner-task', 'get-planner-task-details',
  ],
  'Tasks.ReadWrite': [
    'create-todo-task', 'update-todo-task', 'delete-todo-task',
    'create-planner-task', 'update-planner-task', 'update-planner-task-details',
  ],
  'Contacts.Read': ['list-outlook-contacts', 'get-outlook-contact'],
  'Contacts.ReadWrite': ['create-outlook-contact', 'update-outlook-contact', 'delete-outlook-contact'],
  'People.Read': ['search-query'],
  'OnlineMeetings.Read': ['list-online-meetings'],
};

/**
 * Build an enabledTools regex pattern from the granted Microsoft scopes.
 * Returns undefined if no scopes found (falls back to ENABLED_TOOLS env var).
 */
function buildToolFilterFromToken(accessToken: string): string | undefined {
  const grantedScopes = getScopesFromToken(accessToken);
  if (grantedScopes.size === 0) return undefined;

  const allowedTools = new Set<string>();
  for (const [scope, tools] of Object.entries(SCOPE_TO_TOOLS)) {
    if (grantedScopes.has(scope)) {
      for (const tool of tools) allowedTools.add(tool);
    }
  }

  if (allowedTools.size === 0) return undefined;

  // Build a regex that matches any of the allowed tool names exactly
  return `^(${[...allowedTools].join('|')})$`;
}

async function createApp(): Promise<express.Express> {
  if (cachedApp) return cachedApp;

  const orgMode = process.env.MS365_MCP_ORG_MODE === 'true';
  const readOnly = process.env.READ_ONLY === 'true';
  const enabledTools = process.env.ENABLED_TOOLS;
  const toon = process.env.MS365_MCP_OUTPUT_FORMAT === 'toon';

  const secrets = await getSecrets();
  const scopes = buildScopesFromEndpoints(orgMode, enabledTools);
  const authManager = await AuthManager.create(scopes);
  await authManager.loadTokenCache();

  const outputFormat = toon ? 'toon' : 'json';
  const graphClient = new GraphClient(authManager, secrets, outputFormat);
  const cloudEndpoints = getCloudEndpoints(secrets.cloudType);
  const tenantId = secrets.tenantId || 'common';
  const clientId = secrets.clientId;
  const clientSecret = secrets.clientSecret;

  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // CORS headers
  const corsOrigin = process.env.MS365_MCP_CORS_ORIGIN || '*';
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

  // OAuth Authorization Server Discovery
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const origin = `${protocol}://${req.get('host')}`;

    res.json({
      issuer: origin,
      authorization_endpoint: `${origin}/authorize`,
      token_endpoint: `${origin}/token`,
      registration_endpoint: `${origin}/register`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: scopes,
    });
  });

  // OAuth Protected Resource Discovery — path-specific per RFC 9728
  const prmHandler = (req: Request, res: Response) => {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const origin = `${protocol}://${req.get('host')}`;

    res.json({
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      scopes_supported: scopes,
      bearer_methods_supported: ['header'],
      resource_documentation: origin,
    });
  };
  app.get('/.well-known/oauth-protected-resource', prmHandler);
  app.get('/.well-known/oauth-protected-resource/mcp', prmHandler);

  // Dynamic client registration
  app.post('/register', (req, res) => {
    const body = req.body;
    const regClientId = `mcp-client-${Date.now()}`;

    res.status(201).json({
      client_id: regClientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: body.redirect_uris || [],
      grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'none',
      client_name: body.client_name || 'MCP Client',
    });
  });

  // Authorization endpoint — redirects to Microsoft
  app.get('/authorize', (req, res) => {
    const url = new URL(req.url!, `${req.protocol}://${req.get('host')}`);

    const microsoftAuthUrl = new URL(
      `${cloudEndpoints.authority}/${tenantId}/oauth2/v2.0/authorize`
    );

    // Pass through standard OAuth parameters (except scope — we override it below)
    const allowedParams = [
      'response_type', 'redirect_uri', 'state', 'response_mode',
      'code_challenge', 'code_challenge_method', 'prompt', 'login_hint', 'domain_hint',
    ];

    allowedParams.forEach((param) => {
      const value = url.searchParams.get(param);
      if (value) microsoftAuthUrl.searchParams.set(param, value);
    });

    microsoftAuthUrl.searchParams.set('client_id', clientId);

    // Request the full set of delegated Microsoft Graph scopes.
    // These must also be added as "Delegated permissions" in the Azure app registration
    // under API permissions > Microsoft Graph.
    microsoftAuthUrl.searchParams.set(
      'scope',
      'offline_access openid profile User.Read Mail.ReadWrite Mail.Send Calendars.ReadWrite Files.ReadWrite Files.Read.All Notes.Read Notes.Create Tasks.ReadWrite Contacts.ReadWrite People.Read OnlineMeetings.Read'
    );

    res.redirect(microsoftAuthUrl.toString());
  });

  // Token exchange endpoint
  app.post('/token', async (req, res) => {
    try {
      const body = req.body;

      if (!body?.grant_type) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'grant_type parameter is required',
        });
        return;
      }

      if (body.grant_type === 'authorization_code') {
        const result = await exchangeCodeForToken(
          body.code as string,
          body.redirect_uri as string,
          clientId,
          clientSecret,
          tenantId,
          body.code_verifier as string | undefined,
          secrets.cloudType
        );
        res.json(result);
      } else if (body.grant_type === 'refresh_token') {
        const result = await refreshAccessToken(
          body.refresh_token as string,
          clientId,
          clientSecret,
          tenantId,
          secrets.cloudType
        );
        res.json(result);
      } else {
        res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: `Grant type '${body.grant_type}' is not supported`,
        });
      }
    } catch (error) {
      logger.error(`Token endpoint error: ${(error as Error).message}`);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token exchange',
      });
    }
  });

  // MCP endpoint — protected by Microsoft bearer token
  const mcpHandler = async (
    req: Request & { microsoftAuth?: { accessToken: string; refreshToken: string } },
    res: Response
  ) => {
    const handler = async () => {
      // Derive allowed tools from the token's granted scopes; fall back to env var
      const tokenFilter = req.microsoftAuth
        ? buildToolFilterFromToken(req.microsoftAuth.accessToken)
        : undefined;
      const toolFilter = tokenFilter || enabledTools;

      const server = new McpServer({ name: 'Microsoft365MCP', version });
      registerGraphTools(server, graphClient, readOnly, toolFilter, orgMode, authManager, false, []);

      // Custom tools also respect the token-derived filter
      const customRegex = toolFilter ? new RegExp(toolFilter, 'i') : undefined;
      registerWordTools(server, graphClient, customRegex);
      registerExcelWriteTools(server, graphClient, readOnly, customRegex);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req as any, res as any, req.body);
    };

    try {
      if (req.microsoftAuth) {
        await requestContext.run(
          {
            accessToken: req.microsoftAuth.accessToken,
            refreshToken: req.microsoftAuth.refreshToken,
          },
          handler
        );
      } else {
        await handler();
      }
    } catch (error) {
      logger.error(`MCP handler error: ${(error as Error).message}`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  app.get('/mcp', microsoftBearerTokenAuthMiddleware, mcpHandler);
  app.post('/mcp', microsoftBearerTokenAuthMiddleware, mcpHandler);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version });
  });

  // Catch-all for unmatched routes
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', path: req.originalUrl });
  });

  cachedApp = app;
  return app;
}

export const handler = async (
  event: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<unknown> => {
  if (!serverlessExpress) {
    const app = await createApp();
    const serverlessExpressModule = await import('@vendia/serverless-express');
    const createHandler = serverlessExpressModule.default ?? serverlessExpressModule;
    serverlessExpress = createHandler({ app });
  }
  return serverlessExpress(event, context);
};

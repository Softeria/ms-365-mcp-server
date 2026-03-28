/**
 * AWS Lambda handler entry point.
 *
 * Wraps the MCP server's HTTP/Express app in a serverless-express adapter
 * so it can run behind API Gateway. Uses the SSM secrets provider
 * (set MS365_MCP_SSM_PREFIX in the Lambda environment).
 *
 * Authentication: Set MS365_MCP_API_KEY in SSM or env vars. Requests must
 * include `Authorization: Bearer <api-key>` or `x-api-key: <key>`.
 *
 * Deploy via SAM: see template.yaml at the project root.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import logger from './logger.js';
import { registerGraphTools } from './graph-tools.js';
import GraphClient from './graph-client.js';
import AuthManager, { buildScopesFromEndpoints } from './auth.js';
import { getSecrets } from './secrets.js';
import { version } from './version.js';

let cachedApp: express.Express | null = null;
let serverlessExpress: any = null;

/**
 * Constant-time string comparison to prevent timing attacks on API key checks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Middleware that validates an API key from Authorization header or x-api-key header.
 * Skips auth for /health endpoint.
 */
function apiKeyAuth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health') {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'] as string | undefined;

    let providedKey: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7);
    } else if (xApiKey) {
      providedKey = xApiKey;
    }

    if (!providedKey || !timingSafeEqual(providedKey, apiKey)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}

async function createApp(): Promise<express.Express> {
  if (cachedApp) return cachedApp;

  const orgMode = process.env.MS365_MCP_ORG_MODE === 'true';
  const readOnly = process.env.READ_ONLY === 'true';
  const enabledTools = process.env.ENABLED_TOOLS;
  const toon = process.env.MS365_MCP_OUTPUT_FORMAT === 'toon';
  const apiKey = process.env.MS365_MCP_API_KEY;

  if (!apiKey) {
    throw new Error(
      'MS365_MCP_API_KEY is required for Lambda deployment. ' +
        'Set it as an environment variable or SSM parameter.'
    );
  }

  const scopes = buildScopesFromEndpoints(orgMode, enabledTools);
  const authManager = await AuthManager.create(scopes);
  await authManager.loadTokenCache();

  const secrets = await getSecrets();
  const outputFormat = toon ? 'toon' : 'json';
  const graphClient = new GraphClient(authManager, secrets, outputFormat);

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(apiKeyAuth(apiKey));

  app.post('/mcp', async (req, res) => {
    try {
      const server = new McpServer({ name: 'Microsoft365MCP', version });

      registerGraphTools(server, graphClient, readOnly, enabledTools, orgMode, authManager, false, []);

      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req as any, res as any, req.body);
    } catch (error) {
      logger.error('Lambda MCP handler error');
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version });
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

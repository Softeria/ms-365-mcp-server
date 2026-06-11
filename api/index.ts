import 'dotenv/config';
import MicrosoftGraphServer from '../src/server.js';
import AuthManager, { resolveAuthScopes } from '../src/auth.js';
import { createTokenCacheStorage } from '../src/token-cache-storage.js';
import { version } from '../src/version.js';

let serverInstance: MicrosoftGraphServer | null = null;
let serverInitPromise: Promise<MicrosoftGraphServer> | null = null;

function sendText(res: any, status: number, body: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(body);
}

function sendNoContent(res: any) {
  res.statusCode = 204;
  res.end();
}

function getPath(req: any): string {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', \`https://\${host}\`).pathname;
}

function shouldBypassServer(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/health' ||
    pathname === '/healthz' ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/robots.txt'
  );
}

async function getServerInstance(): Promise<MicrosoftGraphServer> {
  if (serverInstance) {
    return serverInstance;
  }

  if (!serverInitPromise) {
    serverInitPromise = (async () => {
      const args = {
        http: true,
        v: true,
      };

      const effectiveScopes = resolveAuthScopes(args);
      const storage = await createTokenCacheStorage({
        allowCommandStorage: false,
        logProvider: false,
      });

      const authManager = await AuthManager.create(effectiveScopes, {}, { storage });
      const server = new MicrosoftGraphServer(authManager, args);
      await server.initialize(version);
      await server.start();
      serverInstance = server;
      return server;
    })().catch((error) => {
      serverInitPromise = null;
      throw error;
    });
  }

  return serverInitPromise;
}

export default async function handler(req: any, res: any) {
  const pathname = getPath(req);

  if (shouldBypassServer(pathname)) {
    if (pathname === '/favicon.ico' || pathname === '/favicon.png' || pathname === '/robots.txt') {
      return sendNoContent(res);
    }
    return sendText(res, 200, 'Microsoft 365 MCP Server is running');
  }

  try {
    const server = await getServerInstance();
    if (server.app) {
      return server.app(req, res);
    }
    return sendText(res, 500, 'Server failed to initialize');
  } catch (error) {
    console.error('Failed to initialize Microsoft 365 MCP Server:', error);
    return sendText(res, 500, 'Server failed to initialize');
  }
}

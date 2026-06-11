import 'dotenv/config';
import { createServer } from '../src/index.js';
import type MicrosoftGraphServer from '../src/server.js';

let serverInstance: MicrosoftGraphServer | null = null;
let serverInitPromise: Promise<MicrosoftGraphServer> | null = null;

function getPathname(req: any): string {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `https://${host}`).pathname;
}

function sendText(res: any, statusCode: number, body: string) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.end(body);
}

function sendNoContent(res: any) {
  res.statusCode = 204;
  return res.end();
}

async function getServer(): Promise<MicrosoftGraphServer> {
  if (serverInstance) {
    return serverInstance;
  }

  if (!serverInitPromise) {
    serverInitPromise = createServer({
      http: true,
      obo: process.env.MS365_MCP_OBO === 'true' || process.env.MS365_MCP_OBO === '1',
      trustProxyAuth:
        process.env.MS365_MCP_TRUST_PROXY_AUTH === 'true' ||
        process.env.MS365_MCP_TRUST_PROXY_AUTH === '1',
    }).then((server) => {
      serverInstance = server;
      return server;
    }).catch((error) => {
      serverInitPromise = null;
      throw error;
    });
  }

  return serverInitPromise;
}

export default async function handler(req: any, res: any) {
  const pathname = getPathname(req);

  if (pathname === '/' || pathname === '/health' || pathname === '/healthz') {
    return sendText(res, 200, 'Microsoft 365 MCP Server is running');
  }

  if (pathname === '/favicon.ico' || pathname === '/favicon.png' || pathname === '/robots.txt') {
    return sendNoContent(res);
  }

  try {
    const server = await getServer();
    if (server.app) {
      return server.app(req, res);
    }
    return sendText(res, 500, 'Server failed to initialize handler');
  } catch (error) {
    console.error('Failed to initialize Microsoft 365 MCP Server:', error);
    return sendText(res, 500, 'Server failed to initialize');
  }
}

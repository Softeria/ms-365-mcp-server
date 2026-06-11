import 'dotenv/config';
import createServer from '../dist/index.js';

let serverInstance = null;
let serverInitPromise = null;

function getPathname(req) {
  const host = req.headers?.host || 'localhost';
  return new URL(req.url || '/', `https://${host}`).pathname;
}

function getOrigin(req) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost';
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function getScopes() {
  const raw = process.env.MS365_MCP_ALLOWED_SCOPES;
  if (raw && raw.trim()) {
    return Array.from(new Set(raw.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean)));
  }
  return [
    'User.Read',
    'offline_access',
    'Files.ReadWrite.All',
    'Mail.ReadWrite',
    'Mail.Send',
    'Calendars.ReadWrite',
    'Contacts.ReadWrite',
  ];
}

function sendText(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.end(body);
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

function sendNoContent(res) {
  res.statusCode = 204;
  return res.end();
}

async function getServer() {
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
    })
      .then((server) => {
        serverInstance = server;
        return server;
      })
      .catch((error) => {
        serverInitPromise = null;
        throw error;
      });
  }

  return serverInitPromise;
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if (pathname === '/' || pathname === '/health' || pathname === '/healthz') {
    return sendText(res, 200, 'Microsoft 365 MCP Server is running');
  }

  if (pathname === '/favicon.ico' || pathname === '/favicon.png' || pathname === '/robots.txt') {
    return sendNoContent(res);
  }

  if (pathname === '/.well-known/oauth-authorization-server') {
    const origin = getOrigin(req);
    const scopes = getScopes();
    return sendJson(res, 200, {
      issuer: origin,
      authorization_endpoint: `${origin}/authorize`,
      token_endpoint: `${origin}/token`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: scopes,
    });
  }

  if (pathname === '/.well-known/oauth-protected-resource') {
    const origin = getOrigin(req);
    const scopes = getScopes();
    return sendJson(res, 200, {
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      scopes_supported: scopes,
      bearer_methods_supported: ['header'],
      resource_documentation: origin,
    });
  }

  try {
    const server = await getServer();
    if (server?.app) {
      return server.app(req, res);
    }
    return sendText(res, 500, 'Server failed to initialize handler');
  } catch (error) {
    console.error('Failed to initialize Microsoft 365 MCP Server:', error);
    return sendText(res, 500, 'Server failed to initialize');
  }
}

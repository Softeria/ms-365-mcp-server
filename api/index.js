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

function setOAuthChallenge(req, res) {
  const origin = getOrigin(req);
  res.setHeader(
    'WWW-Authenticate',
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", authorization_uri="${origin}/.well-known/oauth-authorization-server"`
  );
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

function sendMcpDiscovery(req, res) {
  const origin = getOrigin(req);
  setOAuthChallenge(req, res);
  res.setHeader('Allow', 'GET, HEAD, OPTIONS, POST');
  res.setHeader('MCP-Protocol-Version', '2024-11-05');
  return sendJson(res, 401, {
    error: 'authorization_required',
    message: 'OAuth bearer token required for MCP JSON-RPC calls. Use POST with JSON-RPC after OAuth.',
    protocol: 'mcp',
    transport: 'streamable-http',
    endpoint: `${origin}/mcp`,
    authorization_server: `${origin}/.well-known/oauth-authorization-server`,
    protected_resource: `${origin}/.well-known/oauth-protected-resource`,
  });
}

function sendSseHandshake(req, res) {
  const origin = getOrigin(req);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.write(`event: endpoint\ndata: ${origin}/messages\n\n`);
  res.write(`event: message\ndata: ${JSON.stringify({ type: 'ready', server: 'Microsoft 365 MCP Server' })}\n\n`);
  setTimeout(() => {
    try {
      res.end();
    } catch {
      // ignore client disconnects
    }
  }, 15000);
}

function sendAuthorizationServerMetadata(req, res) {
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

function sendProtectedResourceMetadata(req, res) {
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

async function forwardToMcp(req, res) {
  req.url = '/mcp';
  const server = await getServer();
  if (server?.app) {
    return server.app(req, res);
  }
  return sendText(res, 500, 'Server failed to initialize handler');
}

export default async function handler(req, res) {
  const pathname = getPathname(req);

  if ((pathname === '/' || pathname === '') && req.method === 'POST') {
    try {
      return await forwardToMcp(req, res);
    } catch (error) {
      console.error('Failed to forward root MCP POST:', error);
      return sendText(res, 500, 'Server failed to initialize');
    }
  }

  if (pathname === '/mcp' && (req.method === 'GET' || req.method === 'HEAD')) {
    return sendMcpDiscovery(req, res);
  }

  if (pathname === '/mcp' && req.method === 'OPTIONS') {
    setOAuthChallenge(req, res);
    res.setHeader('Allow', 'GET, HEAD, OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version');
    return sendNoContent(res);
  }

  if (pathname === '/' || pathname === '/health' || pathname === '/healthz') {
    return sendText(res, 200, 'Microsoft 365 MCP Server is running');
  }

  if (pathname === '/favicon.ico' || pathname === '/favicon.png' || pathname === '/robots.txt') {
    return sendNoContent(res);
  }

  if (pathname === '/sse') {
    return sendSseHandshake(req, res);
  }

  if (pathname === '/messages') {
    return sendJson(res, 426, {
      error: 'legacy_sse_not_supported',
      message: 'Use the Streamable HTTP MCP endpoint at /mcp for authenticated tool calls.',
      mcp_endpoint: `${getOrigin(req)}/mcp`,
    });
  }

  if (pathname.startsWith('/.well-known/openid-configuration')) {
    return sendAuthorizationServerMetadata(req, res);
  }

  if (pathname.startsWith('/.well-known/oauth-authorization-server')) {
    return sendAuthorizationServerMetadata(req, res);
  }

  if (pathname.startsWith('/.well-known/oauth-protected-resource')) {
    return sendProtectedResourceMetadata(req, res);
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

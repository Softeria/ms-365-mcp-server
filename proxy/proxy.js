/**
 * OAuth Proxy (Authorization Server) for ms-365-mcp-server
 *
 * Architecture:
 *   MCP Client (Claude Code / VS Code) → this proxy (port 8080) → ms-365-mcp-server (port 3000) → Graph API
 *
 * This proxy:
 *   - Acts as an OAuth 2.0 Authorization Server for MCP clients
 *   - Implements Dynamic Client Registration (RFC 7591)
 *   - Handles Entra ID authentication (confidential client)
 *   - Issues proxy JWTs wrapping Graph access tokens
 *   - Forwards /mcp requests with the real Graph token to the backend
 *
 * Users only need the proxy URL — no Entra credentials are exposed.
 */

import express from 'express';
import crypto from 'node:crypto';
import http from 'node:http';
import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';

dotenv.config();

// ─── Configuration ───────────────────────────────────────────────────────────

const {
  ENTRA_TENANT_ID,
  ENTRA_CLIENT_ID,
  ENTRA_CLIENT_SECRET,
  MS365_MCP_URL = 'http://localhost:3000',
  PUBLIC_URL = 'http://localhost:8080',
  JWT_SECRET,
  PORT = '8080',
  GRAPH_SCOPES,
} = process.env;

if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID) {
  console.error('ERROR: ENTRA_TENANT_ID and ENTRA_CLIENT_ID are required.');
  console.error('Copy .env.example to .env and fill in your Azure Entra credentials.');
  process.exit(1);
}

if (!ENTRA_CLIENT_SECRET) {
  console.warn('[WARN] ENTRA_CLIENT_SECRET is not set — running as public client (no client secret).');
}

const jwtSecret = JWT_SECRET || crypto.randomBytes(32).toString('hex');
const jwtSecretKey = new TextEncoder().encode(jwtSecret);

const DEFAULT_GRAPH_SCOPES = [
  'openid', 'profile', 'email', 'offline_access',
  'User.Read',
  'Mail.Read', 'Mail.ReadWrite', 'Mail.Send',
  'Calendars.Read', 'Calendars.ReadWrite',
  'Files.Read', 'Files.ReadWrite', 'Files.Read.All',
  'Notes.Read', 'Notes.ReadWrite',
  'Contacts.Read', 'Contacts.ReadWrite',
  'Tasks.Read', 'Tasks.ReadWrite',
].join(' ');

const graphScopes = GRAPH_SCOPES || DEFAULT_GRAPH_SCOPES;

const ENTRA_AUTH_URL = `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/authorize`;
const ENTRA_TOKEN_URL = `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/token`;

// ─── In-Memory Stores ────────────────────────────────────────────────────────
// For production, replace with Redis (see README).

/** Dynamic client registrations: clientId → metadata */
const dynamicClients = new Map();

/** Pending OAuth states: internalState → { clientState, redirectUri, codeChallenge, codeChallengeMethod, clientId } */
const pendingStates = new Map();

/** Pending authorization codes: proxyCode → { graphAccessToken, graphRefreshToken, upn, codeChallenge, codeChallengeMethod, expiresAt } */
const pendingCodes = new Map();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates) {
    if (val.expiresAt && now > val.expiresAt) pendingStates.delete(key);
  }
  for (const [key, val] of pendingCodes) {
    if (now > val.expiresAt) pendingCodes.delete(key);
  }
}, 60_000);

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Body parsers applied selectively — NOT globally.
// /mcp must receive the raw request body stream for proxying to the backend.
const jsonParser = express.json();
const formParser = express.urlencoded({ extended: true });

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-protocol-version');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

// ─── Well-Known Endpoints ────────────────────────────────────────────────────

app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  res.json({
    resource: `${PUBLIC_URL}/mcp`,
    authorization_servers: [PUBLIC_URL],
    scopes_supported: graphScopes.split(' '),
    bearer_methods_supported: ['header'],
    resource_documentation: PUBLIC_URL,
  });
});

app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.json({
    issuer: PUBLIC_URL,
    authorization_endpoint: `${PUBLIC_URL}/authorize`,
    token_endpoint: `${PUBLIC_URL}/token`,
    registration_endpoint: `${PUBLIC_URL}/register`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: graphScopes.split(' '),
  });
});

// ─── Dynamic Client Registration (RFC 7591) ──────────────────────────────────

app.post('/register', jsonParser, (req, res) => {
  const clientId = `dyn-${crypto.randomUUID()}`;
  const metadata = {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: req.body.redirect_uris || [],
    grant_types: req.body.grant_types || ['authorization_code', 'refresh_token'],
    response_types: req.body.response_types || ['code'],
    token_endpoint_auth_method: req.body.token_endpoint_auth_method || 'none',
    client_name: req.body.client_name || 'MCP Client',
  };
  dynamicClients.set(clientId, metadata);
  console.log(`[DCR] Registered client: ${clientId}`);
  res.status(201).json(metadata);
});

// ─── Authorization Endpoint ──────────────────────────────────────────────────

app.get('/authorize', (req, res) => {
  const {
    client_id,
    redirect_uri,
    state: clientState,
    code_challenge,
    code_challenge_method,
  } = req.query;

  const internalState = crypto.randomUUID();
  pendingStates.set(internalState, {
    clientState,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method || 'S256',
    clientId: client_id,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  // Redirect to Entra — scopes are hardcoded here because some MCP clients
  // don't send the scope parameter (e.g. Claude Code Issue #4540).
  const entraUrl = new URL(ENTRA_AUTH_URL);
  entraUrl.searchParams.set('client_id', ENTRA_CLIENT_ID);
  entraUrl.searchParams.set('response_type', 'code');
  entraUrl.searchParams.set('redirect_uri', `${PUBLIC_URL}/entra-callback`);
  entraUrl.searchParams.set('scope', graphScopes);
  entraUrl.searchParams.set('state', internalState);
  entraUrl.searchParams.set('response_mode', 'query');

  console.log(`[AUTH] Redirecting to Entra (client: ${client_id})`);
  res.redirect(entraUrl.toString());
});

// ─── Entra Callback ──────────────────────────────────────────────────────────

app.get('/entra-callback', async (req, res) => {
  const { code, state: internalState, error, error_description } = req.query;

  if (error) {
    console.error(`[ENTRA] Error: ${error} — ${error_description}`);
    res.status(400).send(`Authentication error: ${error_description}`);
    return;
  }

  const pending = pendingStates.get(internalState);
  if (!pending) {
    res.status(400).send('Invalid or expired state parameter.');
    return;
  }
  pendingStates.delete(internalState);

  try {
    // Exchange Entra authorization code for tokens
    const tokenParams = {
      client_id: ENTRA_CLIENT_ID,
      code: /** @type {string} */ (code),
      redirect_uri: `${PUBLIC_URL}/entra-callback`,
      grant_type: 'authorization_code',
      scope: graphScopes,
    };
    if (ENTRA_CLIENT_SECRET) {
      tokenParams.client_secret = ENTRA_CLIENT_SECRET;
    }
    const tokenRes = await fetch(ENTRA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`[ENTRA] Token exchange failed: ${errBody}`);
      res.status(502).send('Token exchange with Azure Entra failed.');
      return;
    }

    const tokens = await tokenRes.json();

    // Extract UPN from access token for logging (best-effort)
    let upn = 'unknown';
    try {
      const payload = JSON.parse(
        Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
      );
      upn = payload.upn || payload.preferred_username || payload.unique_name || 'unknown';
    } catch { /* ignore decode errors */ }

    // Issue a proxy authorization code (short-lived)
    const proxyCode = crypto.randomUUID();
    pendingCodes.set(proxyCode, {
      graphAccessToken: tokens.access_token,
      graphRefreshToken: tokens.refresh_token || '',
      upn,
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    console.log(`[AUTH] Entra auth successful for ${upn}, issuing proxy code`);

    // Redirect back to the MCP client with the proxy code
    const redirectUrl = new URL(pending.redirectUri);
    redirectUrl.searchParams.set('code', proxyCode);
    if (pending.clientState) {
      redirectUrl.searchParams.set('state', pending.clientState);
    }
    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('[ENTRA] Callback error:', err);
    res.status(500).send('Internal error during authentication.');
  }
});

// ─── Token Endpoint ──────────────────────────────────────────────────────────

app.post('/token', formParser, jsonParser, async (req, res) => {
  const { grant_type, code, code_verifier, refresh_token } = req.body;

  if (grant_type === 'authorization_code') {
    const pending = pendingCodes.get(code);
    if (!pending) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code.' });
      return;
    }

    if (Date.now() > pending.expiresAt) {
      pendingCodes.delete(code);
      res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code has expired.' });
      return;
    }

    // PKCE verification (S256)
    if (pending.codeChallenge && pending.codeChallengeMethod === 'S256') {
      const computed = crypto
        .createHash('sha256')
        .update(code_verifier || '')
        .digest('base64url');
      if (computed !== pending.codeChallenge) {
        pendingCodes.delete(code);
        res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed.' });
        return;
      }
    }

    pendingCodes.delete(code);

    // Wrap the Graph access token in a proxy JWT
    const jwt = await new SignJWT({
      graphAccessToken: pending.graphAccessToken,
      upn: pending.upn,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(PUBLIC_URL)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(jwtSecretKey);

    console.log(`[TOKEN] Issued JWT for ${pending.upn}`);

    res.json({
      access_token: jwt,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: pending.graphRefreshToken,
    });
  } else if (grant_type === 'refresh_token') {
    try {
      // Use the Entra refresh token to obtain new tokens
      const refreshParams = {
        client_id: ENTRA_CLIENT_ID,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
        scope: graphScopes,
      };
      if (ENTRA_CLIENT_SECRET) {
        refreshParams.client_secret = ENTRA_CLIENT_SECRET;
      }
      const tokenRes = await fetch(ENTRA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(refreshParams),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error(`[TOKEN] Refresh failed: ${errBody}`);
        res.status(400).json({ error: 'invalid_grant', error_description: 'Token refresh failed.' });
        return;
      }

      const tokens = await tokenRes.json();

      let upn = 'unknown';
      try {
        const payload = JSON.parse(
          Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
        );
        upn = payload.upn || payload.preferred_username || payload.unique_name || 'unknown';
      } catch { /* ignore */ }

      const jwt = await new SignJWT({
        graphAccessToken: tokens.access_token,
        upn,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(PUBLIC_URL)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(jwtSecretKey);

      console.log(`[TOKEN] Refreshed JWT for ${upn}`);

      res.json({
        access_token: jwt,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: tokens.refresh_token || refresh_token,
      });
    } catch (err) {
      console.error('[TOKEN] Refresh error:', err);
      res.status(500).json({ error: 'server_error', error_description: 'Token refresh error.' });
    }
  } else {
    res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: `Unsupported grant_type: ${grant_type}`,
    });
  }
});

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── MCP Proxy ───────────────────────────────────────────────────────────────
// Validates the proxy JWT and forwards to ms-365-mcp-server with the real Graph token.
// Body is NOT parsed — the raw stream is piped directly to the backend (SSE-safe).

app.all('/mcp', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource"`
    );
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Bearer token required.',
    });
    return;
  }

  const token = authHeader.substring(7);
  let payload;
  try {
    const result = await jwtVerify(token, jwtSecretKey, { issuer: PUBLIC_URL });
    payload = result.payload;
  } catch (err) {
    console.error(`[MCP] JWT verification failed: ${err.message}`);
    res.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource"`
    );
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token verification failed.',
    });
    return;
  }

  // Forward to ms-365-mcp-server with the real Graph access token
  const backendUrl = new URL(MS365_MCP_URL);
  const headers = { ...req.headers };
  headers.authorization = `Bearer ${payload.graphAccessToken}`;
  headers.host = backendUrl.host;
  // Remove headers that should not be forwarded
  delete headers['content-length']; // will be set by the pipe

  const options = {
    hostname: backendUrl.hostname,
    port: backendUrl.port || (backendUrl.protocol === 'https:' ? 443 : 80),
    path: '/mcp',
    method: req.method,
    headers,
  };

  console.log(`[MCP] Forwarding ${req.method} for ${payload.upn}`);

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[MCP] Backend error: ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'bad_gateway',
        error_description: 'Failed to connect to ms-365-mcp-server backend.',
      });
    }
  });

  req.pipe(proxyReq);
});

// ─── Start Server ────────────────────────────────────────────────────────────

const port = parseInt(PORT, 10);

app.listen(port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   OAuth Proxy for MS365 MCP Server           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Proxy URL:    ${PUBLIC_URL}`);
  console.log(`  Backend URL:  ${MS365_MCP_URL}`);
  console.log(`  Tenant ID:    ${ENTRA_TENANT_ID}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`    GET  /.well-known/oauth-protected-resource`);
  console.log(`    GET  /.well-known/oauth-authorization-server`);
  console.log(`    POST /register              (DCR)`);
  console.log(`    GET  /authorize             (OAuth)`);
  console.log(`    GET  /entra-callback        (Entra redirect)`);
  console.log(`    POST /token                 (Token exchange)`);
  console.log(`    ALL  /mcp                   (Proxied to backend)`);
  console.log(`    GET  /health                (Health check)`);
  console.log('');
  console.log('  Ready. Waiting for connections...');
  console.log('');
});

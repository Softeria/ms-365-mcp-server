#!/usr/bin/env node
/**
 * One-time OAuth setup script for AWS SSM deployment.
 * Run locally to get your initial refresh token, then store it in SSM.
 *
 * Usage:
 *   MS365_MCP_CLIENT_ID=xxx MS365_MCP_CLIENT_SECRET=xxx node auth-setup.js
 *
 * Optional:
 *   SSM_PREFIX=/m365-mcp  (default)
 *   AWS_REGION=us-west-2  (or set in ~/.aws/config)
 */

const http = require('http');
const { exec } = require('child_process');

const CLIENT_ID = process.env.MS365_MCP_CLIENT_ID;
const CLIENT_SECRET = process.env.MS365_MCP_CLIENT_SECRET;
const SSM_PREFIX = process.env.SSM_PREFIX || '/m365-mcp';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set MS365_MCP_CLIENT_ID and MS365_MCP_CLIENT_SECRET env vars first.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333/callback';
// Default scopes are read-only + offline_access. Set MS365_MCP_SCOPES to override.
const DEFAULT_SCOPES = [
  'Files.Read',
  'Notes.Read',
  'User.Read',
  'offline_access',
];

const SCOPES = (process.env.MS365_MCP_SCOPES || DEFAULT_SCOPES.join(' '));

const authUrl =
  `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&response_mode=query`;

console.log('\n=== MS 365 MCP Server \u2014 First-Time Auth Setup ===\n');
console.log('Opening browser for Microsoft login...');
console.log('If it doesn\'t open, visit:\n', authUrl, '\n');

const platform = process.platform;
const cmd =
  platform === 'darwin'
    ? `open "${authUrl}"`
    : platform === 'win32'
      ? `start "${authUrl}"`
      : `xdg-open "${authUrl}"`;
exec(cmd);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3333');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end(`Auth failed: ${error}`);
    console.error('Auth failed:', error, url.searchParams.get('error_description'));
    server.close();
    return;
  }

  if (!code) {
    res.end('No code received.');
    return;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  try {
    const tokenRes = await fetch(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );
    const tokens = await tokenRes.json();

    if (tokens.error) {
      throw new Error(`${tokens.error}: ${tokens.error_description}`);
    }

    res.end('\u2705 Auth successful! Check your terminal for next steps.');

    console.log('\n\u2705 Authentication successful!\n');
    console.log('Storing credentials in AWS SSM Parameter Store...\n');

    const { execFileSync } = require('child_process');

    const ssmParams = [
      { name: `${SSM_PREFIX}/client-id`, value: CLIENT_ID, type: 'String' },
      { name: `${SSM_PREFIX}/client-secret`, value: CLIENT_SECRET, type: 'SecureString' },
      { name: `${SSM_PREFIX}/refresh-token`, value: tokens.refresh_token, type: 'SecureString' },
    ];

    for (const param of ssmParams) {
      try {
        execFileSync('aws', [
          'ssm', 'put-parameter',
          '--name', param.name,
          '--value', param.value,
          '--type', param.type,
          '--overwrite',
        ], { stdio: 'inherit' });
        console.log(`  \u2705 Stored ${param.name}`);
      } catch (err) {
        console.error(`  \u274c Failed to store ${param.name}:`, err.message);
        process.exit(1);
      }
    }

    console.log('\nAll credentials stored successfully in SSM.\n');
    server.close();
  } catch (err) {
    res.end(`Token exchange failed: ${err}`);
    console.error('Token exchange failed:', err);
    server.close();
  }
});

server.listen(3333, () => {
  console.log('Waiting for Microsoft auth callback on http://localhost:3333/callback ...\n');
});

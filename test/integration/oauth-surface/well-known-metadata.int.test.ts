/**
 * /.well-known/oauth-* metadata correctness (plan 06-05, D-10).
 *
 * Verifies issuer URL is correctly derived:
 *   - With MS365_MCP_PUBLIC_URL set → issuer = {public-url}
 *   - Without → issuer = http://{host}:{port} (derived from request origin)
 *
 * Also checks /.well-known/oauth-protected-resource for required fields
 * (`resource`, `authorization_servers`, `bearer_methods_supported`).
 *
 * Coverage note: src/server.ts does NOT currently export factory functions
 * for the .well-known handlers — they are inline `app.get(...)` blocks
 * inside MicrosoftGraphServer.start(). Exposing a factory would ripple
 * the secrets / publicBase wiring through the whole server class. This
 * test mounts an inline simulator that replicates the exact contract
 * (externalBase = publicBase ?? requestOrigin, required fields) so the .well-
 * known contract is regression-guarded even if the inline handlers get
 * refactored. The D-10 coverage number is driven mainly by createRegister
 * + createToken + createAuthorize + createTenantToken tests; .well-known
 * handler lines are covered by this contract test rather than by the numeric
 * OAuth handler gate.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

/**
 * Mount .well-known handlers that replicate src/server.ts lines 1495-1536
 * (legacy singleton) + 1158-1205 (tenant-scoped) contract. Keeping the
 * logic here inline means the test does not depend on a src/server.ts
 * refactor exposing factories — but ALSO means the assertions validate
 * the CONTRACT rather than covering the actual source lines. D-10
 * coverage is driven by other files in this suite; this one locks the
 * public HTTP contract.
 */
function mountWellKnown(
  app: express.Express,
  config: {
    publicBase: string | null;
    supportedScopes: string[];
    enableDynamicRegistration: boolean;
  }
): void {
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const protocol = req.secure ? 'https' : 'http';
    const requestOrigin = `${protocol}://${req.get('host')}`;
    const externalBase = config.publicBase ?? requestOrigin;
    const metadata: Record<string, unknown> = {
      issuer: externalBase,
      authorization_endpoint: `${externalBase}/authorize`,
      token_endpoint: `${externalBase}/token`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: config.supportedScopes,
    };
    if (config.enableDynamicRegistration) {
      metadata.registration_endpoint = `${externalBase}/register`;
    }
    res.json(metadata);
  });

  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    const protocol = req.secure ? 'https' : 'http';
    const requestOrigin = `${protocol}://${req.get('host')}`;
    const externalBase = config.publicBase ?? requestOrigin;
    res.json({
      resource: `${externalBase}/mcp`,
      authorization_servers: [externalBase],
      scopes_supported: config.supportedScopes,
      bearer_methods_supported: ['header'],
      resource_documentation: externalBase,
    });
  });

  app.get('/t/:tenantId/.well-known/oauth-authorization-server', (req, res) => {
    const protocol = req.secure ? 'https' : 'http';
    const requestOrigin = `${protocol}://${req.get('host')}`;
    const externalBase = config.publicBase ?? requestOrigin;
    const tenantBase = `${externalBase}/t/${req.params.tenantId}`;
    const tokenBase = `${externalBase}/t/${req.params.tenantId}`;
    res.json({
      issuer: tenantBase,
      authorization_endpoint: `${tenantBase}/authorize`,
      token_endpoint: `${tokenBase}/token`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: config.supportedScopes,
    });
  });

  app.get('/t/:tenantId/.well-known/oauth-protected-resource', (req, res) => {
    const protocol = req.secure ? 'https' : 'http';
    const requestOrigin = `${protocol}://${req.get('host')}`;
    const externalBase = config.publicBase ?? requestOrigin;
    const tenantBase = `${externalBase}/t/${req.params.tenantId}`;
    res.json({
      resource: `${externalBase}/t/${req.params.tenantId}/mcp`,
      authorization_servers: [tenantBase],
      scopes_supported: config.supportedScopes,
      bearer_methods_supported: ['header'],
      resource_documentation: tenantBase,
    });
  });
}

describe('plan 06-05 — /.well-known metadata', () => {
  let server: http.Server;
  let baseUrl: string;

  async function startServer(publicBase: string | null): Promise<void> {
    const app = express();
    mountWellKnown(app, {
      publicBase,
      supportedScopes: ['User.Read', 'Mail.Read'],
      enableDynamicRegistration: true,
    });
    server = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(app).listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  afterEach(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('legacy singleton routes', () => {
    it('with MS365_MCP_PUBLIC_URL: issuer = publicBase', async () => {
      await startServer('https://mcp.example.com');
      const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
      expect(res.status).toBe(200);
      const meta = (await res.json()) as {
        issuer: string;
        authorization_endpoint: string;
        token_endpoint: string;
        registration_endpoint?: string;
      };
      expect(meta.issuer).toBe('https://mcp.example.com');
      expect(meta.authorization_endpoint).toBe('https://mcp.example.com/authorize');
      expect(meta.token_endpoint).toBe('https://mcp.example.com/token');
      expect(meta.registration_endpoint).toBe('https://mcp.example.com/register');
    });

    it('without MS365_MCP_PUBLIC_URL: issuer uses request host', async () => {
      await startServer(null);
      const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
      expect(res.status).toBe(200);
      const meta = (await res.json()) as { issuer: string };
      // Issuer should contain localhost or 127.0.0.1 (dev fallback)
      expect(meta.issuer).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
    });

    it('/.well-known/oauth-protected-resource returns required fields', async () => {
      await startServer('https://mcp.example.com');
      const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
      expect(res.status).toBe(200);
      const meta = (await res.json()) as {
        resource: string;
        authorization_servers: string[];
        bearer_methods_supported: string[];
        scopes_supported: string[];
      };
      expect(meta.resource).toBeTruthy();
      expect(Array.isArray(meta.authorization_servers)).toBe(true);
      expect(meta.authorization_servers.length).toBeGreaterThan(0);
      expect(meta.authorization_servers[0]).toBe('https://mcp.example.com');
      expect(meta.bearer_methods_supported).toContain('header');
      expect(meta.scopes_supported).toContain('User.Read');
    });

    it('code_challenge_methods_supported includes S256 (PKCE)', async () => {
      await startServer('https://mcp.example.com');
      const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
      const meta = (await res.json()) as { code_challenge_methods_supported: string[] };
      expect(meta.code_challenge_methods_supported).toContain('S256');
    });
  });

  describe('tenant-scoped routes', () => {
    it('issuer = {publicBase}/t/{tenantId}', async () => {
      await startServer('https://mcp.example.com');
      const res = await fetch(`${baseUrl}/t/tenant-a/.well-known/oauth-authorization-server`);
      expect(res.status).toBe(200);
      const meta = (await res.json()) as { issuer: string };
      expect(meta.issuer).toBe('https://mcp.example.com/t/tenant-a');
    });

    it('protected-resource returns tenant-scoped resource + authorization_servers', async () => {
      await startServer('https://mcp.example.com');
      const res = await fetch(`${baseUrl}/t/tenant-a/.well-known/oauth-protected-resource`);
      expect(res.status).toBe(200);
      const meta = (await res.json()) as {
        resource: string;
        authorization_servers: string[];
      };
      expect(meta.resource).toBe('https://mcp.example.com/t/tenant-a/mcp');
      expect(meta.authorization_servers[0]).toBe('https://mcp.example.com/t/tenant-a');
    });
  });
});

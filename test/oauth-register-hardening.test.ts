/**
 * Regression tests for plan 01-06:
 *   - AUTH-06: /register rejects forbidden / non-allowlisted redirect_uris
 *   - AUTH-07: /register generates crypto-random client IDs
 *   - T-01-06c: /register info log omits the incoming body
 *
 * Requirements: AUTH-06, AUTH-07
 *
 * These tests cover the lightweight /register handler without importing the
 * full MCP server/tool graph.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Logger mock captures every call so we can assert on the scrubbed log shape.
vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn(),
  },
  enableConsoleLogging: vi.fn(),
}));

// Helper — POST JSON to a URL and return { status, body }.
async function postJson(url: string, payload: unknown): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // leave as text
  }
  return { status: res.status, body };
}

/**
 * Build a minimal Express app wired with the /register handler factory
 * that plan 01-06 Task 3 introduces in src/server.ts.
 *
 * The server listens on an ephemeral port (listen(0)) so the tests never
 * collide and we avoid any port-in-use flake.
 */
async function startMiniServer(opts: {
  mode: 'prod' | 'dev';
  publicUrlHost: string | null;
  supportedGrantTypes?: readonly string[];
  durableTenantId?: string;
}): Promise<{ url: string; close: () => Promise<void> }> {
  // Dynamic import so module loading is lazy and picks up mocks correctly.
  const { createRegisterHandler } = await import('../src/lib/oauth/register-handler.js');
  const app = express();
  app.use(express.json());
  app.post(
    '/register',
    createRegisterHandler(
      {
        mode: opts.mode,
        publicUrlHost: opts.publicUrlHost,
      },
      {
        ...(opts.supportedGrantTypes ? { supportedGrantTypes: opts.supportedGrantTypes } : {}),
        ...(opts.durableTenantId ? { pgPool: {} as never, tenantId: opts.durableTenantId } : {}),
      }
    )
  );

  return await new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

describe('POST /register — redirect_uri allowlist (AUTH-06, T-01-06)', () => {
  let server: { url: string; close: () => Promise<void> } | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it('Test A: rejects javascript: with structured 400', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['javascript:alert(1)'],
      client_name: 'Evil Client',
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'invalid_redirect_uri',
      redirect_uri: 'javascript:alert(1)',
    });
    expect((res.body as { reason?: string }).reason).toMatch(/javascript/i);
  });

  it('Test B: accepts http://localhost:3000/cb with 201 + crypto client_id', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
    });
    expect(res.status).toBe(201);
    const body = res.body as { client_id?: string; redirect_uris?: string[] };
    expect(body.client_id).toMatch(/^mcp-client-[A-Za-z0-9_-]{32}$/);
    expect(body.redirect_uris).toEqual(['http://localhost:3000/cb']);
  });

  it('Test C: 50 sequential registrations yield 50 distinct client_id values', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const res = await postJson(`${server.url}/register`, {
        redirect_uris: ['http://localhost:3000/cb'],
      });
      expect(res.status).toBe(201);
      const id = (res.body as { client_id: string }).client_id;
      ids.add(id);
    }
    // All 50 client_id values must be distinct — proves crypto.randomBytes,
    // not Date.now (which would collide on the same millisecond).
    expect(ids.size).toBe(50);
  });

  it('rejects external host in prod when publicUrlHost=null', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['https://evil.com/cb'],
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'invalid_redirect_uri' });
  });

  it('accepts external host in dev mode (D-02 dev permissive)', async () => {
    server = await startMiniServer({ mode: 'dev', publicUrlHost: null });
    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['https://partner.example.com/cb'],
    });
    expect(res.status).toBe(201);
  });

  it('accepts https host matching publicUrlHost in prod', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: 'mcp.example.com' });
    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['https://mcp.example.com/cb'],
    });
    expect(res.status).toBe(201);
  });

  it('accepts empty redirect_uris array (RFC 7591 allows this)', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const res = await postJson(`${server.url}/register`, { redirect_uris: [] });
    expect(res.status).toBe(201);
  });

  it('rejects durable authorization_code clients without redirect URIs', async () => {
    server = await startMiniServer({
      mode: 'prod',
      publicUrlHost: null,
      durableTenantId: 'tenant-a',
    });

    const res = await postJson(`${server.url}/register`, { redirect_uris: [] });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'invalid_client_metadata' });
  });

  it('defaults and validates grant types against the mount policy', async () => {
    server = await startMiniServer({
      mode: 'prod',
      publicUrlHost: null,
      supportedGrantTypes: ['authorization_code'],
    });

    const defaultRes = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
    });
    expect(defaultRes.status).toBe(201);
    expect((defaultRes.body as { grant_types: string[] }).grant_types).toEqual([
      'authorization_code',
    ]);

    const refreshRes = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      grant_types: ['authorization_code', 'refresh_token'],
    });
    expect(refreshRes.status).toBe(400);
    expect(refreshRes.body).toMatchObject({ error: 'invalid_client_metadata' });
  });

  it('defaults to authorization_code only even when the mount policy supports refresh grants', async () => {
    server = await startMiniServer({
      mode: 'prod',
      publicUrlHost: null,
      supportedGrantTypes: ['authorization_code', 'refresh_token'],
    });

    const omitted = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
    });
    expect(omitted.status).toBe(201);
    expect((omitted.body as { grant_types: string[] }).grant_types).toEqual(['authorization_code']);

    const empty = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      grant_types: [],
    });
    expect(empty.status).toBe(201);
    expect((empty.body as { grant_types: string[] }).grant_types).toEqual(['authorization_code']);
  });

  it('accepts refresh grants when the mount policy enables them and the client requests them', async () => {
    server = await startMiniServer({
      mode: 'prod',
      publicUrlHost: null,
      supportedGrantTypes: ['authorization_code', 'refresh_token'],
    });

    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      grant_types: ['authorization_code', 'refresh_token'],
    });

    expect(res.status).toBe(201);
    expect((res.body as { grant_types: string[] }).grant_types).toEqual([
      'authorization_code',
      'refresh_token',
    ]);
  });

  it('rejects refresh-only registrations because they cannot authorize', async () => {
    server = await startMiniServer({
      mode: 'prod',
      publicUrlHost: null,
      supportedGrantTypes: ['authorization_code', 'refresh_token'],
    });

    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      grant_types: ['refresh_token'],
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'invalid_client_metadata' });
  });

  it('rejects unsupported token endpoint authentication methods', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const res = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'invalid_client_metadata' });
  });

  it('rejects unsupported grant and response types instead of rewriting them', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    const grantRes = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      grant_types: ['client_credentials'],
    });
    expect(grantRes.status).toBe(400);
    expect(grantRes.body).toMatchObject({ error: 'invalid_client_metadata' });

    const responseRes = await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb'],
      response_types: ['token'],
    });
    expect(responseRes.status).toBe(400);
    expect(responseRes.body).toMatchObject({ error: 'invalid_client_metadata' });
  });
});

describe('POST /register — scrubbed info log (AUTH-06 T-01-06c)', () => {
  let server: { url: string; close: () => Promise<void> } | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it('Test D: logger.info payload contains counts — NOT the raw body', async () => {
    server = await startMiniServer({ mode: 'prod', publicUrlHost: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loggerMock = (await import('../src/logger.js')).default as any;

    await postJson(`${server.url}/register`, {
      redirect_uris: ['http://localhost:3000/cb', 'http://127.0.0.1:5000/cb'],
      client_name: 'Secret Internal App',
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
    });

    // Find the /register info log — its meta object must NOT contain raw request
    // body or user-controlled names, and MUST contain bounded metadata.
    const registerCalls = (loggerMock.info as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => {
        // Canonical pino order: (meta, message). Message is second arg.
        const msg = typeof call[1] === 'string' ? call[1] : '';
        return msg.toLowerCase().includes('client registration');
      }
    );
    expect(registerCalls.length).toBeGreaterThanOrEqual(1);

    const meta = registerCalls[0][0] as Record<string, unknown>;
    // Required scrubbed fields:
    expect(meta).toHaveProperty('clientNameHash');
    expect(meta).toHaveProperty('clientNameLength', 'Secret Internal App'.length);
    expect(meta).toHaveProperty('grantTypeCount', 2);
    expect(meta).toHaveProperty('redirect_uri_count', 2);
    // Forbidden leaks:
    expect(meta).not.toHaveProperty('client_name');
    expect(JSON.stringify(meta)).not.toContain('Secret Internal App');
    expect(meta).not.toHaveProperty('body');
    expect(meta).not.toHaveProperty('redirect_uris');
    expect(meta).not.toHaveProperty('token_endpoint_auth_method');
  });
});

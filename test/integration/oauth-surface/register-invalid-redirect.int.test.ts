/**
 * Dynamic-registration redirect_uri validation (plan 06-05, ROADMAP SC#4).
 *
 * Verifies createRegisterHandler rejects:
 *   - javascript: scheme
 *   - data: scheme
 *   - missing host (https://)
 *   - wildcard host (*.example.com)
 *   - file: scheme
 *   - external host in prod mode
 *
 * Test test/oauth-register-hardening.test.ts (plan 01-06) already covers
 * the prod-mode external-host check and the javascript: scheme via a
 * subset of cases. This file broadens coverage to the full matrix required
 * by plan 06-05 SC#4 and organises the probe as a table-driven test.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('plan 06-05 — dynamic /register redirect_uri validation (SC#4)', () => {
  let server: http.Server;
  let baseUrl: string;

  async function startServer(policy: {
    mode: 'prod' | 'dev';
    publicUrlHost: string | null;
  }): Promise<void> {
    vi.resetModules();
    const { createRegisterHandler } = await import('../../../src/lib/oauth/register-handler.js');
    const app = express();
    app.use(express.json());
    app.post('/register', createRegisterHandler(policy));
    server = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(app).listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  afterEach(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    vi.restoreAllMocks();
  });

  const bogusRedirects = [
    { name: 'javascript: scheme', uri: 'javascript:alert(1)' },
    { name: 'data: scheme', uri: 'data:text/html,<script>alert(1)</script>' },
    { name: 'file: scheme', uri: 'file:///etc/passwd' },
    { name: 'external host in prod mode', uri: 'https://attacker.com/callback' },
  ];

  describe('prod mode — strict', () => {
    beforeEach(async () => {
      await startServer({ mode: 'prod', publicUrlHost: 'mcp.example.com' });
    });

    for (const { name, uri } of bogusRedirects) {
      it(`rejects ${name} with 400`, async () => {
        const res = await fetch(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_name: 'test-client',
            redirect_uris: [uri],
            grant_types: ['authorization_code'],
            response_types: ['code'],
          }),
        });
        expect(res.status).toBe(400);
        const body = (await res.json()) as { error: string; redirect_uri?: string };
        expect(body.error).toBe('invalid_redirect_uri');
      });
    }

    it('rejects non-string redirect_uris entries with 400', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: [123],
        }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string; reason: string };
      expect(body.error).toBe('invalid_redirect_uri');
      expect(body.reason).toBe('redirect_uris must be strings');
    });

    // URL construction semantics: `new URL('https://')` THROWS — the registry
    // handler surfaces this as 'not a valid URL' rather than a missing-host
    // signal. We assert the 400 status + structured error envelope rather
    // than the exact reason, which is implementation detail.
    it('rejects missing-host https:// with 400', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['https://'],
        }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('invalid_redirect_uri');
    });

    // The wildcard-host case is captured as a non-loopback https host whose
    // hostname does NOT match publicUrlHost — prod mode rejects it.
    it('rejects wildcard host in prod mode with 400', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['https://*.example.com/callback'],
        }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('invalid_redirect_uri');
    });

    it('accepts https://{publicUrlHost}/callback in prod mode', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['https://mcp.example.com/callback'],
          grant_types: ['authorization_code'],
          response_types: ['code'],
        }),
      });
      expect([200, 201]).toContain(res.status);
    });

    it('preserves supported hosted-connector grants in dynamic registration metadata', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['https://mcp.example.com/callback'],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { grant_types: string[] };
      expect(body.grant_types).toEqual(['authorization_code', 'refresh_token']);
    });

    it('accepts http://localhost:3000/callback in prod mode (loopback always OK)', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['http://localhost:3000/callback'],
        }),
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('dev mode — permissive', () => {
    beforeEach(async () => {
      await startServer({ mode: 'dev', publicUrlHost: null });
    });

    // Dev mode still rejects forbidden schemes (javascript:, data:, file:,
    // vbscript:, about:) — these are NEVER allowed regardless of mode.
    for (const { name, uri } of [
      { name: 'javascript: scheme', uri: 'javascript:alert(1)' },
      { name: 'data: scheme', uri: 'data:text/html,x' },
      { name: 'file: scheme', uri: 'file:///etc/passwd' },
    ]) {
      it(`rejects ${name} in dev mode with 400`, async () => {
        const res = await fetch(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_name: 'test-client',
            redirect_uris: [uri],
          }),
        });
        expect(res.status).toBe(400);
      });
    }

    it('accepts http://localhost:3000/callback in dev mode', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['http://localhost:3000/callback'],
        }),
      });
      expect([200, 201]).toContain(res.status);
    });

    it('accepts https://partner.example.com/callback in dev mode', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'test-client',
          redirect_uris: ['https://partner.example.com/callback'],
        }),
      });
      expect([200, 201]).toContain(res.status);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * Smoke tests for the express-rate-limit middleware wired into src/server.ts.
 *
 * server.ts instantiates two limiters with the same shape
 * (windowMs: 60_000 + max: {30, 120}) and mounts them on
 * /authorize, /token, /register (auth surface) and /mcp respectively.
 * The library itself is well-tested upstream; we only assert the behaviour
 * that matters for this integration:
 *
 *  - The 30/min auth-surface limit returns 429 after 30 requests.
 *  - The auth limiter is one shared per-IP bucket across the three routes.
 *  - The 120/min MCP limit is more permissive and uses a separate bucket.
 *  - Per-IP isolation holds (different X-Forwarded-For → fresh budget).
 *  - IETF draft-7 RateLimit-* headers are emitted, legacy headers are not.
 */

function buildApp(): express.Express {
  const app = express();
  // Trust a single upstream hop, mirroring server.ts. The test client
  // connects over loopback (the one trusted hop), so an X-Forwarded-For
  // header acts as the client IP — the same semantic as a reverse proxy.
  app.set('trust proxy', 1);

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  const mcpLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/authorize', authLimiter);
  app.use('/token', authLimiter);
  app.use('/register', authLimiter);
  app.use('/mcp', mcpLimiter);

  app.get('/authorize', (_req, res) => res.send('ok'));
  app.post('/token', (_req, res) => res.send('ok'));
  app.post('/register', (_req, res) => res.send('ok'));
  app.post('/mcp', (_req, res) => res.send('ok'));
  app.get('/public', (_req, res) => res.send('ok'));
  return app;
}

describe('rate-limit middleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = await new Promise<Server>((resolve) => {
      const s = buildApp().listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const hit = (path: string, ip: string, method = 'GET') =>
    fetch(`${baseUrl}${path}`, { method, headers: { 'X-Forwarded-For': ip } });

  it('returns 429 on the 31st /authorize hit within a minute', async () => {
    for (let i = 0; i < 30; i++) {
      expect((await hit('/authorize', '1.2.3.4')).status).toBe(200);
    }
    expect((await hit('/authorize', '1.2.3.4')).status).toBe(429);
  });

  it('shares one per-IP bucket across all auth-surface routes', async () => {
    for (let i = 0; i < 30; i++) {
      await hit('/authorize', '5.6.7.8');
    }
    expect((await hit('/authorize', '5.6.7.8')).status).toBe(429);
    // Sibling auth route, same IP → same bucket, also blocked
    expect((await hit('/token', '5.6.7.8', 'POST')).status).toBe(429);
    // Separate limiter instance still has fresh budget
    expect((await hit('/mcp', '5.6.7.8', 'POST')).status).toBe(200);
  });

  it('keeps separate buckets per IP', async () => {
    for (let i = 0; i < 30; i++) {
      await hit('/authorize', '9.9.9.9');
    }
    expect((await hit('/authorize', '9.9.9.9')).status).toBe(429);
    expect((await hit('/authorize', '8.8.8.8')).status).toBe(200);
  });

  it('does not rate-limit routes without a limiter', async () => {
    for (let i = 0; i < 50; i++) {
      expect((await hit('/public', '6.6.6.6')).status).toBe(200);
    }
  });

  it('emits IETF draft-7 RateLimit headers and no legacy headers', async () => {
    const r = await hit('/authorize', '4.4.4.4');
    expect(r.headers.get('ratelimit')).toMatch(/limit=30, remaining=\d+, reset=\d+/);
    expect(r.headers.get('ratelimit-policy')).toMatch(/30;w=60/);
    expect(r.headers.get('x-ratelimit-limit')).toBeNull();
    expect(r.headers.get('x-ratelimit-remaining')).toBeNull();
  });
});

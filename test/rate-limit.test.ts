import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';

/**
 * Smoke tests for the express-rate-limit middleware mounted on the OAuth
 * surface and the MCP endpoint.
 *
 * The integration into `src/server.ts` instantiates two limiters with the
 * same shape (windowMs: 60_000 + max: {30, 120}) and mounts them on
 * /authorize, /token, /register, /mcp respectively. The library itself is
 * well-tested upstream, so we only assert on the shape that matters here:
 *
 *  - The 30-per-minute auth-surface limit produces 429 after 30 requests.
 *  - The 120-per-minute MCP limit is more permissive.
 *  - Standard draft-7 RateLimit headers are present.
 *  - X-Forwarded-For is honored when express trust-proxy is set to a fixed
 *    hop count (matching the production single-proxy topology).
 */

describe('rate-limit middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    // Match production: trust exactly one upstream hop. supertest is the
    // only "proxy" in the test chain, so X-Forwarded-For overrides honour
    // a single trusted entry.
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 429 on the 31st /authorize hit within a minute', async () => {
    for (let i = 0; i < 30; i++) {
      const r = await request(app).get('/authorize').set('X-Forwarded-For', '1.2.3.4');
      expect(r.status).toBe(200);
    }
    const blocked = await request(app).get('/authorize').set('X-Forwarded-For', '1.2.3.4');
    expect(blocked.status).toBe(429);
  });

  it('shares a single per-IP bucket across all auth-surface routes', async () => {
    // `/authorize`, `/token`, and `/register` are mounted on the SAME
    // authLimiter *instance*. express-rate-limit keys by `keyGenerator(ip)`
    // not by route, so the 30/min budget is unified across the three
    // OAuth endpoints. That is the intended behaviour: a flooder can't
    // burn 30 hits on /authorize and then start fresh on /token.
    for (let i = 0; i < 30; i++) {
      await request(app).get('/authorize').set('X-Forwarded-For', '5.6.7.8');
    }
    const auth = await request(app).get('/authorize').set('X-Forwarded-For', '5.6.7.8');
    expect(auth.status).toBe(429);

    // Same IP, sibling auth route — same bucket, also blocked
    const token = await request(app).post('/token').set('X-Forwarded-For', '5.6.7.8');
    expect(token.status).toBe(429);

    // Different limiter instance (mcpLimiter) still has fresh budget
    const mcp = await request(app).post('/mcp').set('X-Forwarded-For', '5.6.7.8');
    expect(mcp.status).toBe(200);
  });

  it('keeps separate buckets per IP', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app).get('/authorize').set('X-Forwarded-For', '9.9.9.9');
    }
    const blocked = await request(app).get('/authorize').set('X-Forwarded-For', '9.9.9.9');
    expect(blocked.status).toBe(429);

    const otherIp = await request(app).get('/authorize').set('X-Forwarded-For', '8.8.8.8');
    expect(otherIp.status).toBe(200);
  });

  it('allows /mcp through 31 hits (higher limit than auth surface)', async () => {
    for (let i = 0; i < 31; i++) {
      const r = await request(app).post('/mcp').set('X-Forwarded-For', '7.7.7.7');
      expect(r.status).toBe(200);
    }
  });

  it('does NOT rate-limit endpoints not mounted on a limiter', async () => {
    for (let i = 0; i < 200; i++) {
      const r = await request(app).get('/public').set('X-Forwarded-For', '6.6.6.6');
      expect(r.status).toBe(200);
    }
  });

  it('emits IETF draft-7 RateLimit headers (combined format)', async () => {
    const r = await request(app).get('/authorize').set('X-Forwarded-For', '4.4.4.4');
    // draft-7 collapses limit/remaining/reset into a single `ratelimit` header
    // and exposes the static policy separately.
    expect(r.headers).toHaveProperty('ratelimit');
    expect(r.headers.ratelimit).toMatch(/limit=30, remaining=\d+, reset=\d+/);
    expect(r.headers).toHaveProperty('ratelimit-policy');
    expect(r.headers['ratelimit-policy']).toMatch(/30;w=60/);
    // Legacy headers must NOT be present (we disabled them explicitly)
    expect(r.headers).not.toHaveProperty('x-ratelimit-limit');
    expect(r.headers).not.toHaveProperty('x-ratelimit-remaining');
  });
});

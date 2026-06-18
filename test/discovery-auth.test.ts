/**
 * Regression test for the --allow-unauthenticated-discovery feature: when the
 * flag is set, MCP discovery requests (initialize, tools/list, etc.) are allowed
 * through the HTTP bearer-token middleware WITHOUT a token, so an MCP gateway can
 * enumerate the tool catalog before any user has authenticated. Non-discovery
 * requests (e.g. tools/call) still require a valid bearer token, and with the
 * flag off (the default) discovery requests are rejected like any other.
 */
import { describe, expect, it, vi } from 'vitest';
import { microsoftBearerTokenAuthMiddleware } from '../src/lib/microsoft-auth.js';

function makeRes() {
  const res: any = { statusCode: undefined };
  res.status = vi.fn((c: number) => {
    res.statusCode = c;
    return res;
  });
  res.set = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function makeReq(method: string, headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    headers,
    body: { jsonrpc: '2.0', method },
    secure: false,
    get: (h: string) => (h.toLowerCase() === 'host' ? 'localhost:3000' : undefined),
  } as any;
}

describe('discovery requests bypass bearer auth when --allow-unauthenticated-discovery is set', () => {
  const mw = microsoftBearerTokenAuthMiddleware({ allowUnauthenticatedDiscovery: true });

  for (const method of ['initialize', 'tools/list', 'prompts/list', 'resources/list', 'ping']) {
    it(`allows ${method} with no token`, () => {
      const req = makeReq(method);
      const res = makeRes();
      const next = vi.fn();
      mw(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.microsoftAuth).toBeUndefined();
    });
  }

  it('rejects tools/call with no token (401)', () => {
    const req = makeReq('tools/call');
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('passes through the per-user token on tools/call when a bearer is present', () => {
    const req = makeReq('tools/call', { authorization: 'Bearer opaque-user-token' });
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.microsoftAuth).toEqual({ accessToken: 'opaque-user-token' });
  });
});

describe('discovery requests require a token by default (flag off)', () => {
  const mw = microsoftBearerTokenAuthMiddleware();

  for (const method of ['initialize', 'tools/list', 'prompts/list', 'resources/list', 'ping']) {
    it(`rejects ${method} with no token (401)`, () => {
      const req = makeReq(method);
      const res = makeRes();
      const next = vi.fn();
      mw(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });
  }
});

describe('trustProxyAuth', () => {
  it('skips the check entirely', () => {
    const proxyMw = microsoftBearerTokenAuthMiddleware({ trustProxyAuth: true });
    const req = makeReq('tools/call');
    const res = makeRes();
    const next = vi.fn();
    proxyMw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('WWW-Authenticate resource_metadata uses publicUrl when configured', () => {
  // Helper to extract the resource_metadata value from a WWW-Authenticate header
  function resourceMetadata(res: ReturnType<typeof makeRes>): string {
    const wwwAuth: string = res.set.mock.calls[0][1];
    const match = wwwAuth.match(/resource_metadata="([^"]+)"/);
    if (!match) throw new Error(`No resource_metadata in: ${wwwAuth}`);
    return match[1];
  }

  it('uses publicUrl origin in resource_metadata on missing token (no path)', () => {
    const mw = microsoftBearerTokenAuthMiddleware({ publicUrl: 'https://mcp.example.com' });
    const res = makeRes();
    mw(makeReq('tools/call'), res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(resourceMetadata(res)).toBe(
      'https://mcp.example.com/.well-known/oauth-protected-resource'
    );
  });

  it('inserts /.well-known/ between host and path per RFC 9728 §3.1 (path component)', () => {
    const mw = microsoftBearerTokenAuthMiddleware({
      publicUrl: 'https://mcp.example.com/tenant/mcp',
    });
    const res = makeRes();
    mw(makeReq('tools/call'), res, vi.fn());
    expect(res.statusCode).toBe(401);
    // Spec: insert /.well-known/oauth-protected-resource between host and path
    expect(resourceMetadata(res)).toBe(
      'https://mcp.example.com/.well-known/oauth-protected-resource/tenant/mcp'
    );
  });

  it('strips a trailing slash from publicUrl path before constructing the metadata URL', () => {
    const mw = microsoftBearerTokenAuthMiddleware({ publicUrl: 'https://mcp.example.com/tenant/' });
    const res = makeRes();
    mw(makeReq('tools/call'), res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(resourceMetadata(res)).toBe(
      'https://mcp.example.com/.well-known/oauth-protected-resource/tenant'
    );
  });

  it('uses publicUrl in resource_metadata on expired JWT token', () => {
    const mw = microsoftBearerTokenAuthMiddleware({ publicUrl: 'https://mcp.example.com' });
    // Build a JWT whose exp is in the past
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })
    ).toString('base64url');
    const expiredJwt = `${header}.${payload}.signature`;
    const res = makeRes();
    mw(makeReq('tools/call', { authorization: `Bearer ${expiredJwt}` }), res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(resourceMetadata(res)).toBe(
      'https://mcp.example.com/.well-known/oauth-protected-resource'
    );
  });

  it('falls back to request host when publicUrl is not set', () => {
    const mw = microsoftBearerTokenAuthMiddleware();
    const res = makeRes();
    mw(makeReq('tools/call'), res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(resourceMetadata(res)).toBe(
      'http://localhost:3000/.well-known/oauth-protected-resource'
    );
  });
});

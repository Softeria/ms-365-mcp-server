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

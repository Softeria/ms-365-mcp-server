/**
 * Plan 04-01 Task 2 — admin router factory + TLS enforce unit tests.
 *
 * Covers:
 *   - createAdminTlsEnforceMiddleware behaviour under MS365_MCP_REQUIRE_TLS +
 *     MS365_MCP_TRUST_PROXY combinations (Tests 1-6).
 *   - createAdminRouter contract: factory validates entraConfig, mounts TLS +
 *     CORS in order, exposes a `/health` probe that bypasses auth (Tests 7-10).
 *   - createAdminCorsMiddleware inline helper — origin allowlist + preflight
 *     shape (Test 9).
 *
 * Deps are stubbed; the router returns an express.Router and we exercise it
 * via Node's http.createServer + Node fetch (same shape as
 * test/integration/runtime-tenant-onboarding.test.ts).
 *
 * Threat refs from plan 04-01 <threat_model>:
 *   - T-04-01: admin API served over plain HTTP leaks bearer/api-key.
 *   - T-04-03: CSRF against admin endpoints — CORS allowlist rejects
 *     non-allowlisted origins.
 *   - T-04-03b: router exposes unauthenticated surface if env unset.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

const noopRoute = () => (_req: any, _res: any, next: any) => next();

vi.mock('../api-keys.js', () => ({
  createApiKeyRoutes: vi.fn(noopRoute),
  subscribeToApiKeyRevoke: vi.fn(async () => undefined),
}));
vi.mock('../tenants.js', () => ({ createTenantsRoutes: vi.fn(noopRoute) }));
vi.mock('../enabled-tools.js', () => ({ createEnabledToolsRoutes: vi.fn(noopRoute) }));
vi.mock('../audit.js', () => ({ createAuditRoutes: vi.fn(noopRoute) }));
vi.mock('../memory.js', () => ({ createMemoryRoutes: vi.fn(noopRoute) }));
vi.mock('../auth/dual-stack.js', () => ({ createAdminAuthMiddleware: vi.fn(noopRoute) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * Minimal Express req/res/next stub that captures status + content-type +
 * body so we can assert middleware behaviour without a full HTTP server.
 */
interface CapturedResponse {
  statusCode: number;
  contentType: string;
  body: unknown;
  ended: boolean;
  headers: Record<string, string>;
}

function runMiddleware(
  // Accept both the narrow test-local signature (returns void|Promise<void>)
  // and Express 5's RequestHandler (returns unknown). At runtime both resolve
  // to the same call, but the types diverged with @types/express 5.x.
  middleware:
    | ((req: Request, res: Response, next: NextFunction) => void | Promise<void>)
    | RequestHandler,
  opts: {
    method?: string;
    secure?: boolean;
    headers?: Record<string, string>;
    path?: string;
  }
): {
  captured: CapturedResponse;
  nextCalled: boolean;
} {
  const captured: CapturedResponse = {
    statusCode: 0,
    contentType: '',
    body: undefined,
    ended: false,
    headers: {},
  };

  const headers: Record<string, string> = opts.headers ?? {};
  const req = {
    method: opts.method ?? 'GET',
    secure: opts.secure ?? false,
    headers,
    path: opts.path ?? '/tenants',
    get(name: string): string | undefined {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;

  const res = {
    status(s: number) {
      captured.statusCode = s;
      return this;
    },
    type(t: string) {
      captured.contentType = t;
      return this;
    },
    json(b: unknown) {
      captured.body = b;
      captured.ended = true;
      return this;
    },
    send(b: unknown) {
      captured.body = b;
      captured.ended = true;
      return this;
    },
    header(name: string, value: string) {
      captured.headers[name] = value;
      return this;
    },
    set(name: string, value: string) {
      captured.headers[name] = value;
      return this;
    },
    sendStatus(s: number) {
      captured.statusCode = s;
      captured.ended = true;
      return this;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  middleware(req, res, next);
  return { captured, nextCalled };
}

/**
 * Minimal stub deps. Pool/RedisClient/TenantPool types are opaque to the
 * router factory; it only stores references and passes them to sub-routes.
 */
function makeStubDeps(overrides: Partial<{ adminOrigins: string[]; appClientId: string }> = {}) {
  return {
    pgPool: {} as Pool,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenantPool: {} as any,
    kek: Buffer.alloc(32),
    adminOrigins: overrides.adminOrigins ?? ['https://admin.example.com'],
    entraConfig: {
      appClientId: overrides.appClientId ?? 'admin-app-client-id',
      groupId: 'admin-group-id',
    },
    cursorSecret: Buffer.alloc(32),
  };
}

describe('createAdminTlsEnforceMiddleware — T-04-01', () => {
  it('Test 1: requireTls=false → always next()', async () => {
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware({ requireTls: false });
    const { captured, nextCalled } = runMiddleware(mw, { secure: false });
    expect(nextCalled).toBe(true);
    expect(captured.ended).toBe(false);
  });

  it('Test 2: requireTls=true + plain HTTP → 426 Upgrade Required problem+json', async () => {
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware({ requireTls: true, trustProxy: false });
    const { captured, nextCalled } = runMiddleware(mw, { secure: false });
    expect(nextCalled).toBe(false);
    expect(captured.statusCode).toBe(426);
    expect(captured.contentType).toBe('application/problem+json');
    const body = captured.body as { type: string };
    expect(body.type).toContain('/upgrade_required');
  });

  it('Test 3: requireTls=true + HTTPS → next()', async () => {
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware({ requireTls: true, trustProxy: false });
    const { captured, nextCalled } = runMiddleware(mw, { secure: true });
    expect(nextCalled).toBe(true);
    expect(captured.ended).toBe(false);
  });

  it('Test 4: trustProxy=true + x-forwarded-proto=https bypasses to next()', async () => {
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware({ requireTls: true, trustProxy: true });
    const { captured, nextCalled } = runMiddleware(mw, {
      secure: false,
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(nextCalled).toBe(true);
    expect(captured.ended).toBe(false);
  });

  it('Test 5: trustProxy=true + x-forwarded-proto=http → 426', async () => {
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware({ requireTls: true, trustProxy: true });
    const { captured, nextCalled } = runMiddleware(mw, {
      secure: false,
      headers: { 'x-forwarded-proto': 'http' },
    });
    expect(nextCalled).toBe(false);
    expect(captured.statusCode).toBe(426);
  });

  it('Test 6: trustProxy=false does NOT honor x-forwarded-proto=https', async () => {
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware({ requireTls: true, trustProxy: false });
    const { captured, nextCalled } = runMiddleware(mw, {
      secure: false,
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(nextCalled).toBe(false);
    expect(captured.statusCode).toBe(426);
  });

  it('env defaults — MS365_MCP_REQUIRE_TLS=1 enables gate when opts omitted', async () => {
    vi.stubEnv('MS365_MCP_REQUIRE_TLS', '1');
    const { createAdminTlsEnforceMiddleware } = await import('../tls-enforce.js');
    const mw = createAdminTlsEnforceMiddleware();
    const { captured } = runMiddleware(mw, { secure: false });
    expect(captured.statusCode).toBe(426);
  });
});

describe('createAdminRouter — factory contract', () => {
  it('Test 7: returns an Express Router value', async () => {
    const { createAdminRouter } = await import('../router.js');
    const router = createAdminRouter(makeStubDeps());
    // Express Router is an object with .use/.get/.post/.stack.
    expect(typeof router).toBe('function');
    expect(typeof (router as unknown as { use: unknown }).use).toBe('function');
    expect(typeof (router as unknown as { get: unknown }).get).toBe('function');
    expect(Array.isArray((router as unknown as { stack: unknown[] }).stack)).toBe(true);
    // Mount chain must start with at least two middlewares (TLS, CORS)
    // before any routes.
    const stack = (router as unknown as { stack: { handle: unknown; route?: unknown }[] }).stack;
    expect(stack.length).toBeGreaterThanOrEqual(2);
  });

  it('Test 8: missing entraConfig.appClientId → throws with prefixed message', async () => {
    const { createAdminRouter } = await import('../router.js');
    expect(() =>
      createAdminRouter({
        ...makeStubDeps(),
        entraConfig: { appClientId: '', groupId: 'g' },
      })
    ).toThrow(/createAdminRouter: entraConfig\.appClientId is required/);
  });

  it('Test 9: empty adminOrigins — preflight with disallowed origin → 403', async () => {
    const { createAdminRouter } = await import('../router.js');
    const router = createAdminRouter(makeStubDeps({ adminOrigins: [] }));
    // Introspect the CORS middleware in the mount stack (index 1 after TLS
    // at index 0). Invoke it with a disallowed Origin + OPTIONS.
    const stack = (
      router as unknown as {
        stack: { handle: (req: Request, res: Response, next: NextFunction) => void }[];
      }
    ).stack;
    const corsMw = stack[1].handle;
    const { captured } = runMiddleware(corsMw, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example.com' },
    });
    expect(captured.statusCode).toBe(403);
  });

  it('Test 9b: allowlisted origin — preflight responds 204 with ACAO headers', async () => {
    const { createAdminRouter } = await import('../router.js');
    const router = createAdminRouter(makeStubDeps({ adminOrigins: ['https://ok.example.com'] }));
    const stack = (
      router as unknown as {
        stack: { handle: (req: Request, res: Response, next: NextFunction) => void }[];
      }
    ).stack;
    const corsMw = stack[1].handle;
    const { captured } = runMiddleware(corsMw, {
      method: 'OPTIONS',
      headers: { origin: 'https://ok.example.com' },
    });
    expect(captured.statusCode).toBe(204);
    expect(captured.headers['Access-Control-Allow-Origin']).toBe('https://ok.example.com');
    // X-Admin-Api-Key is a mandatory allowed header for API-key auth flow.
    expect(captured.headers['Access-Control-Allow-Headers']).toMatch(/X-Admin-Api-Key/i);
  });

  it('Test 10: exposes /health that bypasses auth and returns 200 text', async () => {
    const { createAdminRouter } = await import('../router.js');
    const router = createAdminRouter(makeStubDeps());
    // Find the /health route in the stack.
    const stack = (
      router as unknown as {
        stack: { route?: { path: string; stack: { handle: unknown }[] } }[];
      }
    ).stack;
    const healthRoute = stack.find((layer) => layer.route?.path === '/health');
    expect(healthRoute).toBeDefined();
    // Invoke the handler and assert 200 + text body.
    const handler = healthRoute!.route!.stack[0].handle as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;
    const { captured } = runMiddleware(handler, { method: 'GET', path: '/health' });
    expect(captured.statusCode).toBe(200);
    expect(captured.contentType).toBe('text/plain');
    expect(captured.body).toBe('admin-router-alive');
  });
});

describe('parseAdminOrigins — helper', () => {
  it('returns [] on undefined or empty', async () => {
    const { parseAdminOrigins } = await import('../router.js');
    expect(parseAdminOrigins(undefined)).toEqual([]);
    expect(parseAdminOrigins('')).toEqual([]);
    expect(parseAdminOrigins('   ')).toEqual([]);
  });

  it('splits on comma, trims, filters empty', async () => {
    const { parseAdminOrigins } = await import('../router.js');
    expect(parseAdminOrigins('https://a.example.com,https://b.example.com')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(parseAdminOrigins(' https://a.example.com , , https://b.example.com ')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });
});

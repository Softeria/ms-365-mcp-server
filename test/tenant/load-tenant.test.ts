/**
 * Plan 03-08 Task 1 — load-tenant middleware tests (TENANT-01, D-13).
 *
 * The `loadTenant` middleware:
 *   1. Reads `req.params.tenantId` — MUST match the GUID regex per D-13.
 *      Non-GUID returns 404 `tenant_not_found` (no DB lookup attempted).
 *   2. LRU cache (max 1000 / 60s TTL) short-circuits the happy path.
 *   3. On miss, `SELECT * FROM tenants WHERE id=$1 AND disabled_at IS NULL`.
 *      Unknown / disabled → 404. Pool failure → 503.
 *   4. On DB error mid-request, logs redacted warn + returns 503
 *      `database_unavailable` rather than leaking the error message.
 *   5. Populates `req.tenant` with the TenantRow on success.
 *
 * Redis pub/sub invalidation (tenant-invalidation.ts):
 *   - Subscribes to `mcp:tenant-invalidate` channel.
 *   - On `<tenantId>` message, evicts the LRU entry for that tenant.
 *   - Admin mutations in Phase 4 publish to this channel.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { Pool, QueryResult } from 'pg';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../src/lib/tool-selection/enabled-tools-parser.js', () => ({
  ensureEnabledToolsSet: vi.fn(() => Object.freeze(new Set<string>())),
}));

// Valid GUID v4 format: 8-4-4-4-12 hex chars.
const VALID_GUID_A = '11111111-2222-3333-4444-555555555555';
const VALID_GUID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function makeRow(id: string, overrides: Partial<TenantRow> = {}): TenantRow {
  return {
    id,
    mode: 'delegated',
    client_id: 'client-id',
    client_secret_ref: null,
    tenant_id: 'azure-tenant',
    cloud_type: 'global',
    redirect_uri_allowlist: [],
    cors_origins: [],
    allowed_scopes: ['User.Read'],
    enabled_tools: null,
    wrapped_dek: null,
    slug: null,
    disabled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makeMockPool(rows: TenantRow[]): Pool {
  const query = vi.fn(async (sql: string, params: unknown[]): Promise<QueryResult<TenantRow>> => {
    const id = params[0] as string;
    const found = rows.find((r) => r.id === id && r.disabled_at === null);
    return {
      rows: found ? [found] : [],
      rowCount: found ? 1 : 0,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  });
  return { query } as unknown as Pool;
}

function makeReqRes(tenantId: string | undefined): {
  req: Request;
  res: Response;
  next: NextFunction;
  jsonCalls: Array<{ status: number; body: unknown }>;
  nextCalls: number;
} {
  const jsonCalls: Array<{ status: number; body: unknown }> = [];
  let currentStatus = 200;
  let nextCalls = 0;

  const req = {
    params: tenantId === undefined ? {} : { tenantId },
  } as unknown as Request;

  const res = {
    status: (code: number) => {
      currentStatus = code;
      return res;
    },
    json: (body: unknown) => {
      jsonCalls.push({ status: currentStatus, body });
      return res;
    },
  } as unknown as Response;

  const next: NextFunction = () => {
    nextCalls += 1;
  };

  return {
    req,
    res,
    next,
    jsonCalls,
    get nextCalls() {
      return nextCalls;
    },
  };
}

describe('plan 03-08 — loadTenant middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GUID regex guard (D-13)', () => {
    it('returns 404 tenant_not_found for non-GUID tenantId (no DB lookup attempted)', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const pool = makeMockPool([]);
      const mw = createLoadTenantMiddleware({ pool });

      const { req, res, jsonCalls, next } = makeReqRes('not-a-guid');
      await mw(req, res, next);

      expect(jsonCalls).toEqual([
        { status: 404, body: { error: 'tenant_not_found', tenantId: 'not-a-guid' } },
      ]);
      expect((pool.query as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    });

    it('returns 404 for tenantId that looks GUID-shaped but has invalid hex', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const pool = makeMockPool([]);
      const mw = createLoadTenantMiddleware({ pool });

      // 'z' is not hex
      const { req, res, jsonCalls } = makeReqRes('zzzzzzzz-2222-3333-4444-555555555555');
      await mw(req, res, () => {});

      expect(jsonCalls.length).toBe(1);
      expect(jsonCalls[0]?.status).toBe(404);
      expect((pool.query as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    });

    it('returns 404 for missing tenantId', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const pool = makeMockPool([]);
      const mw = createLoadTenantMiddleware({ pool });

      const { req, res, jsonCalls } = makeReqRes(undefined);
      await mw(req, res, () => {});

      expect(jsonCalls.length).toBe(1);
      expect(jsonCalls[0]?.status).toBe(404);
    });

    it('accepts lowercase and uppercase GUID representations', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const UPPER = VALID_GUID_A.toUpperCase();
      const row = makeRow(UPPER);
      const pool = makeMockPool([row]);
      const mw = createLoadTenantMiddleware({ pool });

      const { req, res, jsonCalls, next } = makeReqRes(UPPER);
      await mw(req, res, next);

      expect(jsonCalls.length).toBe(0);
      expect((req as Request & { tenant?: TenantRow }).tenant?.id).toBe(UPPER);
    });
  });

  describe('DB lookup', () => {
    it('populates req.tenant on happy path and calls next()', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const row = makeRow(VALID_GUID_A);
      const pool = makeMockPool([row]);
      const mw = createLoadTenantMiddleware({ pool });

      const handles = makeReqRes(VALID_GUID_A);
      await mw(handles.req, handles.res, handles.next);

      expect((handles.req as Request & { tenant?: TenantRow }).tenant?.id).toBe(VALID_GUID_A);
      expect(handles.jsonCalls.length).toBe(0);
      expect(handles.nextCalls).toBe(1);
    });

    it('returns 404 tenant_not_found when row does not exist', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const pool = makeMockPool([]);
      const mw = createLoadTenantMiddleware({ pool });

      const { req, res, jsonCalls } = makeReqRes(VALID_GUID_A);
      await mw(req, res, () => {});

      expect(jsonCalls[0]).toEqual({
        status: 404,
        body: { error: 'tenant_not_found', tenantId: VALID_GUID_A },
      });
    });

    it('returns 404 when tenant is disabled (WHERE disabled_at IS NULL filter)', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const row = makeRow(VALID_GUID_A, { disabled_at: new Date() });
      const pool = makeMockPool([row]);
      const mw = createLoadTenantMiddleware({ pool });

      const { req, res, jsonCalls } = makeReqRes(VALID_GUID_A);
      await mw(req, res, () => {});

      expect(jsonCalls[0]?.status).toBe(404);
    });

    it('returns 503 database_unavailable on pool failure', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const pool = {
        query: vi.fn(async () => {
          throw new Error('connection refused');
        }),
      } as unknown as Pool;
      const mw = createLoadTenantMiddleware({ pool });

      const { req, res, jsonCalls } = makeReqRes(VALID_GUID_A);
      await mw(req, res, () => {});

      expect(jsonCalls[0]?.status).toBe(503);
      expect(jsonCalls[0]?.body).toEqual({ error: 'database_unavailable' });
    });
  });

  describe('LRU cache (1000 max / 60s TTL)', () => {
    it('second lookup with same tenantId hits cache (no second DB call)', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const row = makeRow(VALID_GUID_A);
      const pool = makeMockPool([row]);
      const mw = createLoadTenantMiddleware({ pool });

      const h1 = makeReqRes(VALID_GUID_A);
      await mw(h1.req, h1.res, h1.next);
      const h2 = makeReqRes(VALID_GUID_A);
      await mw(h2.req, h2.res, h2.next);

      expect((pool.query as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
      expect((h1.req as Request & { tenant?: TenantRow }).tenant?.id).toBe(VALID_GUID_A);
      expect((h2.req as Request & { tenant?: TenantRow }).tenant?.id).toBe(VALID_GUID_A);
    });

    it('different tenantIds each miss the cache', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const rowA = makeRow(VALID_GUID_A);
      const rowB = makeRow(VALID_GUID_B);
      const pool = makeMockPool([rowA, rowB]);
      const mw = createLoadTenantMiddleware({ pool });

      const hA = makeReqRes(VALID_GUID_A);
      await mw(hA.req, hA.res, hA.next);
      const hB = makeReqRes(VALID_GUID_B);
      await mw(hB.req, hB.res, hB.next);

      expect((pool.query as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    });

    it('evict(tenantId) forces next lookup to re-query DB', async () => {
      const { createLoadTenantMiddleware } = await import('../../src/lib/tenant/load-tenant.js');
      const row = makeRow(VALID_GUID_A);
      const pool = makeMockPool([row]);
      const mw = createLoadTenantMiddleware({ pool });

      await mw(makeReqRes(VALID_GUID_A).req, makeReqRes(VALID_GUID_A).res, () => {});
      mw.evict(VALID_GUID_A);
      await mw(makeReqRes(VALID_GUID_A).req, makeReqRes(VALID_GUID_A).res, () => {});

      expect((pool.query as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    });
  });
});

describe('plan 03-08 — tenant-invalidation pub/sub subscriber', () => {
  let redis: MemoryRedisFacade;

  beforeEach(() => {
    redis = new MemoryRedisFacade();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await redis.quit();
  });

  it('subscribes to mcp:tenant-invalidate and evicts on message', async () => {
    const { subscribeToTenantInvalidation } =
      await import('../../src/lib/tenant/tenant-invalidation.js');
    const evictMock = vi.fn();

    await subscribeToTenantInvalidation(redis, { evict: evictMock });

    await redis.publish('mcp:tenant-invalidate', VALID_GUID_A);

    // Give the async dispatcher a tick to fire
    await new Promise((r) => setImmediate(r));

    expect(evictMock).toHaveBeenCalledWith(VALID_GUID_A);
  });

  it('ignores non-GUID messages (safety)', async () => {
    const { subscribeToTenantInvalidation } =
      await import('../../src/lib/tenant/tenant-invalidation.js');
    const evictMock = vi.fn();

    await subscribeToTenantInvalidation(redis, { evict: evictMock });

    await redis.publish('mcp:tenant-invalidate', 'not-a-guid');
    await new Promise((r) => setImmediate(r));

    expect(evictMock).not.toHaveBeenCalled();
  });

  it('does not react to messages on other channels', async () => {
    const { subscribeToTenantInvalidation } =
      await import('../../src/lib/tenant/tenant-invalidation.js');
    const evictMock = vi.fn();

    await subscribeToTenantInvalidation(redis, { evict: evictMock });

    await redis.publish('mcp:other-channel', VALID_GUID_A);
    await new Promise((r) => setImmediate(r));

    expect(evictMock).not.toHaveBeenCalled();
  });
});

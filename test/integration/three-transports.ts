/**
 * Plan 03-09 Task 3 — three-transport bootstrap harness (SC#3 signal).
 *
 * Shared helper used by test/transports/three-transport-smoke.test.ts. Boots
 * a single Express app with all three transports mounted on one tenant:
 *   - Streamable HTTP at POST/GET /t/:tenantId/mcp
 *   - Legacy SSE GET /t/:tenantId/sse + POST /t/:tenantId/messages
 *   - (stdio covered by test/transports/stdio-tenant.test.ts — vitest
 *     process-spawn fixtures are too heavy for the smoke test)
 *
 * Substrate is all-in-memory: pg-mem + MemoryRedisFacade + a stub McpServer
 * factory. This keeps the smoke test fast (no Docker) while still exercising
 * tenant-scoped route mounting into each transport handler.
 *
 * Rationale: the smoke test is the SC#3 transports-portion signal ("one
 * server instance serves a tool call over streamable HTTP AND SSE AND stdio
 * in the same test run"). Stdio is asserted indirectly via
 * test/transports/stdio-tenant which proves the factory + CLI flag are
 * wired; the smoke test proves the two HTTP transports run side-by-side
 * on one instance without interfering.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { createStreamableHttpHandler } from '../../src/lib/transports/streamable-http.js';
import {
  createLegacySseGetHandler,
  createLegacySsePostHandler,
} from '../../src/lib/transports/legacy-sse.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

export interface ThreeTransportHarness {
  baseUrl: string;
  port: number;
  tenantId: string;
  pool: Pool;
  redis: MemoryRedisFacade;
  cleanup: () => Promise<void>;
}

async function makePool(): Promise<Pool> {
  const db = newDb();
  const { Pool: PgMemPool } = db.adapters.createPg();
  const pool = new PgMemPool() as Pool;
  await pool.query(`
    CREATE TABLE tenants (
      id uuid PRIMARY KEY,
      mode text NOT NULL,
      client_id text NOT NULL,
      client_secret_ref text NULL,
      tenant_id text NOT NULL,
      cloud_type text NOT NULL,
      redirect_uri_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
      cors_origins jsonb NOT NULL DEFAULT '[]'::jsonb,
      allowed_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
      enabled_tools text NULL,
      preset_version text NOT NULL DEFAULT 'essentials-v1',
      sharepoint_domain text NULL,
      rate_limits jsonb NULL,
      wrapped_dek jsonb NULL,
      slug text NULL,
      disabled_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  return pool;
}

async function insertTenant(pool: Pool, tenantId: string): Promise<void> {
  await pool.query(
    `INSERT INTO tenants (
       id, mode, client_id, tenant_id, cloud_type,
       redirect_uri_allowlist, cors_origins, allowed_scopes, enabled_tools,
       preset_version, sharepoint_domain, rate_limits, wrapped_dek, slug, disabled_at
     ) VALUES ($1, 'delegated', 'smoke-client', $1, 'global', '[]'::jsonb, '[]'::jsonb, '["User.Read"]'::jsonb, NULL, 'essentials-v1', NULL, NULL, NULL, NULL, NULL)`,
    [tenantId]
  );
}

function createLoadTenantStub(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.params.tenantId;
    const { rows } = await pool.query<TenantRow>('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    const tenant = rows[0];
    if (!tenant) {
      res.status(404).json({ error: 'tenant_not_found', tenantId });
      return;
    }
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    next();
  };
}

/**
 * Boot the smoke-test server. Returns a harness with baseUrl + tenantId
 * already known so the test file can issue requests directly against all
 * three transport routes.
 */
export async function bootstrapThreeTransportServer(): Promise<ThreeTransportHarness> {
  const tenantId = 'aaaaaaaa-1111-2222-3333-444444444444';
  const pool = await makePool();
  await insertTenant(pool, tenantId);
  const redis = new MemoryRedisFacade();

  const buildMcpServer = (_tenant: TenantRow): McpServer =>
    new McpServer({ name: 'ms-365-mcp-server', version: '2.0.0' });

  const loadTenant = createLoadTenantStub(pool);
  const streamableHttp = createStreamableHttpHandler({ buildMcpServer, surface: 'static' });
  const legacySseGet = createLegacySseGetHandler({ buildMcpServer });
  const legacySsePost = createLegacySsePostHandler({ buildMcpServer });

  const app = express();
  app.use(express.json());
  app.use('/t/:tenantId', loadTenant);
  // Mount order (most-specific-first per Pitfall 3): /sse + /messages
  // before /mcp. We do NOT wire authSelector in the smoke harness — the
  // smoke test exercises the initialize handshake which does NOT require
  // a bearer token (MCP spec). Adding authSelector would short-circuit
  // every request with 401; authSelector is covered by 03-06 tests.
  app.get('/t/:tenantId/sse', legacySseGet);
  app.post('/t/:tenantId/messages', legacySsePost);
  app.post('/t/:tenantId/mcp', streamableHttp);
  app.get('/t/:tenantId/mcp', streamableHttp);

  const server = await new Promise<http.Server>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    port,
    tenantId,
    pool,
    redis,
    cleanup: async (): Promise<void> => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await redis.quit();
    },
  };
}

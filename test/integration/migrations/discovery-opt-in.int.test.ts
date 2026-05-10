import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
// @ts-expect-error — .mjs import has no types; tests rely on runtime export shape.
import { main as migrateTenantToDiscovery } from '../../../bin/migrate-tenant-to-discovery.mjs';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT_ID = '22222222-2222-4222-8222-222222222222';

function makeRedis() {
  return {
    published: [] as Array<{ channel: string; message: string }>,
    publish: vi.fn(async function publish(
      this: { published: Array<{ channel: string; message: string }> },
      channel: string,
      message: string
    ) {
      this.published.push({ channel, message });
      return 1;
    }),
  };
}

async function makePool(): Promise<Pool> {
  const db = newDb();
  let generated = 0;
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: 'uuid',
    implementation: () => {
      generated += 1;
      return `aaaaaaaa-aaaa-4aaa-8aaa-${String(generated).padStart(12, '0')}`;
    },
  });
  const { Pool: PgMemPool } = db.adapters.createPg();
  const pool = new PgMemPool() as Pool;
  await pool.query(`
    CREATE TABLE tenants (
      id uuid PRIMARY KEY,
      mode text NOT NULL,
      client_id text NOT NULL,
      tenant_id text NOT NULL,
      cloud_type text NOT NULL DEFAULT 'global',
      enabled_tools text,
      preset_version text NOT NULL DEFAULT 'essentials-v1',
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE TABLE audit_log (
      id text PRIMARY KEY,
      tenant_id uuid NOT NULL,
      actor text NOT NULL,
      action text NOT NULL,
      target text,
      ip text,
      request_id text NOT NULL,
      result text NOT NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      ts timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      owner_subject text,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_tenant_tool_bookmarks_unique_tenant_alias
      ON tenant_tool_bookmarks (tenant_id, alias)
      WHERE owner_subject IS NULL;

    CREATE UNIQUE INDEX idx_tenant_tool_bookmarks_unique_owner_alias
      ON tenant_tool_bookmarks (tenant_id, owner_subject, alias)
      WHERE owner_subject IS NOT NULL;
  `);
  return pool;
}

async function seedTenant(
  pool: Pool,
  id: string,
  overrides: { mode?: string; preset_version?: string; enabled_tools?: string | null } = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO tenants (id, mode, client_id, tenant_id, enabled_tools, preset_version)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      overrides.mode ?? 'app-only',
      `client-${id}`,
      `aad-${id}`,
      overrides.enabled_tools ?? null,
      overrides.preset_version ?? 'essentials-v1',
    ]
  );
}

describe('plan 07-10 — opt-in discovery migration CLI', () => {
  let pool: Pool;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(async () => {
    pool = await makePool();
    redis = makeRedis();
  });

  it('Test 1: without --tenant-id exits before SQL or Redis work', async () => {
    const query = vi.spyOn(pool, 'query');
    await expect(migrateTenantToDiscovery([], { pool, redis })).rejects.toThrow(/--tenant-id/);
    expect(query).not.toHaveBeenCalled();
    expect(redis.publish).not.toHaveBeenCalled();
  });

  it('Test 2: dry-run previews before and after state without Postgres update or Redis publish', async () => {
    await seedTenant(pool, TENANT_ID, { mode: 'bearer', enabled_tools: 'mail.messages.list' });

    const result = await migrateTenantToDiscovery([`--tenant-id=${TENANT_ID}`, '--dry-run'], {
      pool,
      redis,
    });

    expect(result).toMatchObject({
      dryRun: true,
      before: {
        id: TENANT_ID,
        mode: 'bearer',
        preset_version: 'essentials-v1',
        enabled_tools: 'mail.messages.list',
      },
      after: {
        id: TENANT_ID,
        mode: 'bearer',
        preset_version: 'discovery-v1',
        enabled_tools: 'mail.messages.list',
      },
    });
    const { rows } = await pool.query<{ preset_version: string; enabled_tools: string }>(
      'SELECT preset_version, enabled_tools FROM tenants WHERE id = $1',
      [TENANT_ID]
    );
    expect(rows[0]).toEqual({
      preset_version: 'essentials-v1',
      enabled_tools: 'mail.messages.list',
    });
    expect(redis.publish).not.toHaveBeenCalled();
  });

  it('Test 3: real run updates one tenant, preserves mode/enabled_tools, and publishes after success', async () => {
    await seedTenant(pool, TENANT_ID, { mode: 'delegated', enabled_tools: 'users.list' });
    await seedTenant(pool, OTHER_TENANT_ID, { preset_version: 'essentials-v1' });
    await pool.query(
      `INSERT INTO audit_log (id, tenant_id, actor, action, target, request_id, result, meta)
       VALUES
       ('audit-1', $1, 'user', 'graph.call', 'mail.messages.list', 'r1', 'success', '{"toolAlias":"mail.messages.list"}'::jsonb),
       ('audit-2', $1, 'user', 'graph.call', 'users.list', 'r2', 'success', '{"toolAlias":"users.list"}'::jsonb)`,
      [TENANT_ID]
    );

    const result = await migrateTenantToDiscovery([`--tenant-id=${TENANT_ID}`], { pool, redis });

    expect(result).toMatchObject({
      dryRun: false,
      updated: {
        id: TENANT_ID,
        mode: 'delegated',
        preset_version: 'discovery-v1',
      },
      bookmarksSeeded: 2,
    });

    const { rows } = await pool.query<{
      id: string;
      mode: string;
      preset_version: string;
      enabled_tools: string | null;
    }>('SELECT id, mode, preset_version, enabled_tools FROM tenants ORDER BY id');
    expect(rows).toEqual([
      {
        id: TENANT_ID,
        mode: 'delegated',
        preset_version: 'discovery-v1',
        enabled_tools: 'users.list',
      },
      {
        id: OTHER_TENANT_ID,
        mode: 'app-only',
        preset_version: 'essentials-v1',
        enabled_tools: null,
      },
    ]);
    expect(redis.published.map((event) => event.channel)).toEqual([
      'mcp:tenant-invalidate',
      'mcp:tool-selection-invalidate',
      'mcp:agentic-events',
    ]);
    expect(redis.published[2]!.message).toContain('tools/list_changed');

    const audit = await pool.query<{
      actor: string;
      action: string;
      target: string;
      meta: unknown;
    }>(
      `SELECT actor, action, target, meta
       FROM audit_log
       WHERE tenant_id = $1 AND action = 'tenant.discovery-migrate'`,
      [TENANT_ID]
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]!).toMatchObject({
      actor: 'cli',
      action: 'tenant.discovery-migrate',
      target: TENANT_ID,
    });
  });

  it('Test 4: existing tenants stay essentials-v1 until the CLI targets them', async () => {
    await seedTenant(pool, TENANT_ID);
    await seedTenant(pool, OTHER_TENANT_ID);

    await migrateTenantToDiscovery([`--tenant-id=${TENANT_ID}`], { pool, redis });

    const { rows } = await pool.query<{ id: string; preset_version: string }>(
      'SELECT id, preset_version FROM tenants ORDER BY id'
    );
    expect(rows).toEqual([
      { id: TENANT_ID, preset_version: 'discovery-v1' },
      { id: OTHER_TENANT_ID, preset_version: 'essentials-v1' },
    ]);
  });

  it('rejects invalid UUID before SQL or Redis key construction', async () => {
    const query = vi.spyOn(pool, 'query');
    await expect(migrateTenantToDiscovery(['--tenant-id=*'], { pool, redis })).rejects.toThrow(
      /invalid --tenant-id/
    );
    expect(query).not.toHaveBeenCalled();
    expect(redis.publish).not.toHaveBeenCalled();
  });
});

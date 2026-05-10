/**
 * Phase 7 Plan 07-03 — SECUR-08 bookmark isolation integration.
 *
 * The integration tier repeats the service contract against the same public
 * service API with same-alias rows across tenants. The `.int.test.ts` suffix
 * keeps this behind MS365_MCP_INTEGRATION=1.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { __setPoolForTesting } from '../../../src/lib/postgres.js';
import {
  deleteBookmark,
  listBookmarks,
  upsertBookmark,
} from '../../../src/lib/memory/bookmarks.js';

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makePool(): Pool {
  const db = newDb();
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });
  const { Pool: PgMemPool } = db.adapters.createPg();
  return new PgMemPool() as Pool;
}

async function installSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE tenants (
      id uuid PRIMARY KEY
    );

    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
}

describe('Phase 7 Plan 07-03 Task 1 — bookmark tenant isolation', () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = makePool();
    await installSchema(pool);
    __setPoolForTesting(pool);
  });

  afterEach(async () => {
    __setPoolForTesting(null);
    await pool.end();
  });

  it('tenant A cannot list or delete tenant B rows with the same alias', async () => {
    const bookmarkA = await upsertBookmark(TENANT_A, {
      alias: 'me.sendMail',
      label: 'tenant A sender',
      note: 'A-only note',
    });
    const bookmarkB = await upsertBookmark(TENANT_B, {
      alias: 'me.sendMail',
      label: 'tenant B sender',
      note: 'B-only note',
    });

    expect(bookmarkA.id).not.toBe(bookmarkB.id);

    const listA = await listBookmarks(TENANT_A);
    expect(listA).toHaveLength(1);
    expect(listA[0]).toMatchObject({
      id: bookmarkA.id,
      alias: 'me.sendMail',
      label: 'tenant A sender',
    });

    await expect(deleteBookmark(TENANT_A, bookmarkB.id)).resolves.toEqual({ deleted: false });
    await expect(deleteBookmark(TENANT_A, 'tenant B sender')).resolves.toEqual({
      deleted: false,
    });

    expect(await listBookmarks(TENANT_A)).toHaveLength(1);
    expect(await listBookmarks(TENANT_B)).toHaveLength(1);
  });
});

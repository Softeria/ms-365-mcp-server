/**
 * Plan 03-01 Task 1 — pg-mem-backed schema round-trip test.
 *
 * Applies the four migrations (tenants, audit_log, delta_tokens, api_keys)
 * to an in-memory Postgres via pg-mem, asserts each table + column shape,
 * then applies the Down migrations in reverse order and asserts all tables
 * are gone.
 *
 * pg-mem limitation: `CREATE EXTENSION` / `DROP EXTENSION` are not supported
 * natively. We register a no-op `pgcrypto` extension via
 * `db.registerExtension(...)` (pg-mem API) and filter the `DROP EXTENSION`
 * line from the Down migrations when running against pg-mem. Real Postgres
 * supports both statements — the migration files themselves are left
 * production-correct.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataType, newDb, type IMemoryDb } from 'pg-mem';
import type { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

interface MigrationPair {
  file: string;
  up: string;
  down: string;
}

function listMigrations(): MigrationPair[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const parts = sql.split(/^--\s*Down Migration\s*$/m);
      const up = (parts[0] ?? '').replace(/^--\s*Up Migration\s*$/m, '');
      const down = parts[1] ?? '';
      // pg-mem doesn't understand DROP/CREATE EXTENSION — filter at harness level.
      return {
        file,
        up: stripPgMemUnsupportedStmts(up),
        down: stripPgMemUnsupportedStmts(down),
      };
    });
}

function stripPgMemUnsupportedStmts(sql: string): string {
  // Remove extension DDL and Phase 7 tsvector/pgvector statements that
  // production Postgres supports but pg-mem cannot parse or execute.
  return sql
    .split('\n')
    .filter((line) => !/\bextension\b.*\bpgcrypto\b/i.test(line))
    .join('\n')
    .replace(/\n\s*content_tsv\s+tsvector\s+GENERATED\s+ALWAYS\s+AS[\s\S]*?\s+STORED,?/i, '')
    .replace(
      /\nCREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?idx_tenant_facts_content_tsv\s+ON\s+tenant_facts\s+USING\s+gin\s+\(content_tsv\);/i,
      ''
    )
    .replace(/\nDO\s+\$\$[\s\S]*?\$\$;/i, '');
}

function makePool(): { db: IMemoryDb; pool: Pool } {
  const db = newDb();
  // pg-mem: real Postgres creates the extension; in tests we register a
  // no-op so subsequent `CREATE EXTENSION IF NOT EXISTS pgcrypto;` would
  // succeed (though we strip those statements above defensively).
  db.registerExtension('pgcrypto', () => {
    // no-op — we never depend on gen_random_uuid at the app layer
  });
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => '00000000-0000-4000-8000-000000000001',
  });
  const { Pool } = db.adapters.createPg();
  return { db, pool: new Pool() as Pool };
}

async function listTables(pool: Pool, names: string[]): Promise<string[]> {
  // pg-mem has a known gap around `= ANY($1::text[])` — it returns empty
  // rows instead of matching. Fetch all and filter client-side so the test
  // stays portable across real Postgres AND pg-mem.
  const r = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
  );
  const allow = new Set(names);
  return r.rows.map((row) => row.table_name).filter((t) => allow.has(t));
}

async function columnSet(pool: Pool, tableName: string): Promise<string[]> {
  const r = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
    [tableName]
  );
  return r.rows.map((row) => row.column_name);
}

async function columnType(
  pool: Pool,
  tableName: string,
  columnName: string
): Promise<string | null> {
  const r = await pool.query<{ data_type: string }>(
    `SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return r.rows[0]?.data_type ?? null;
}

describe('plan 03-01 — Postgres schema round-trip', () => {
  let pool: Pool;

  beforeEach(() => {
    ({ pool } = makePool());
  });

  it('discovers migration files in lexicographic order', () => {
    const migrations = listMigrations();
    expect(migrations.map((m) => m.file)).toEqual([
      '20260501000000_tenants.sql',
      '20260501000100_audit_log.sql',
      '20260501000200_delta_tokens.sql',
      '20260501000300_api_keys.sql',
      '20260601000000_subscriptions.sql',
      // Plan 05-03 (D-19): tenants.preset_version column.
      '20260702000000_preset_version.sql',
      // Plan 05.1-06 (D-01): tenants.sharepoint_domain column for
      // __spadmin__-prefixed tool dispatch — routes admin requests to
      // the correct {slug}-admin.sharepoint.com tenant.
      '20260801000000_sharepoint_domain.sql',
      // Plan 06-04 (D-11): tenants.rate_limits JSONB column for
      // per-tenant rate limit overrides (request_per_min,
      // graph_points_per_min).
      '20260901000000_tenant_rate_limits.sql',
      // Plan 07-01: tenant memory tables for bookmarks, recipes, and facts.
      '20261001000000_tenant_memory.sql',
      // Plan 08-05: tenant editable skills.
      '20261101000000_tenant_skills.sql',
      // Private owner scoping for memory rows.
      '20261102000000_user_scoped_memory.sql',
      // HP9 Durable DCR: tenant-scoped OAuth client registrations.
      '20261201000000_oauth_clients.sql',
    ]);
  });

  it('applies all four Up migrations cleanly on a fresh pg-mem DB', async () => {
    const migrations = listMigrations();
    for (const m of migrations) {
      await pool.query(m.up);
    }
    const tables = await listTables(pool, ['tenants', 'audit_log', 'delta_tokens', 'api_keys']);
    expect(tables).toEqual(['api_keys', 'audit_log', 'delta_tokens', 'tenants']);
  });

  it('keeps additive Up migrations idempotent for schema-present/bookkeeping-missing recovery', () => {
    const migrations = listMigrations();
    const byFile = new Map(migrations.map((m) => [m.file, m.up]));

    expect(byFile.get('20260501000000_tenants.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+tenants/i
    );
    expect(byFile.get('20260501000100_audit_log.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+audit_log/i
    );
    expect(byFile.get('20260501000200_delta_tokens.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+delta_tokens/i
    );
    expect(byFile.get('20260501000300_api_keys.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+api_keys/i
    );
    expect(byFile.get('20260601000000_subscriptions.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+subscriptions/i
    );
    expect(byFile.get('20260702000000_preset_version.sql')).toMatch(
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+preset_version/i
    );
    expect(byFile.get('20260801000000_sharepoint_domain.sql')).toMatch(
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+sharepoint_domain/i
    );
    expect(byFile.get('20260901000000_tenant_rate_limits.sql')).toMatch(
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+rate_limits/i
    );
    expect(byFile.get('20261001000000_tenant_memory.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+tenant_facts/i
    );
    expect(byFile.get('20261101000000_tenant_skills.sql')).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+tenant_skills/i
    );
    expect(byFile.get('20261102000000_user_scoped_memory.sql')).toMatch(
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+owner_subject/i
    );
  });

  it('creates the tenants table with the expected columns + wrapped_dek JSONB', async () => {
    const migrations = listMigrations();
    await pool.query(migrations[0]!.up);

    const cols = await columnSet(pool, 'tenants');
    expect(cols).toEqual([
      'id',
      'mode',
      'client_id',
      'client_secret_ref',
      'tenant_id',
      'cloud_type',
      'redirect_uri_allowlist',
      'cors_origins',
      'allowed_scopes',
      'enabled_tools',
      'wrapped_dek',
      'slug',
      'disabled_at',
      'created_at',
      'updated_at',
    ]);
    expect(await columnType(pool, 'tenants', 'wrapped_dek')).toBe('jsonb');
    expect(await columnType(pool, 'tenants', 'id')).toBe('uuid');
  });

  it('creates audit_log with a tenant_id FK and a JSONB meta column', async () => {
    const migrations = listMigrations();
    await pool.query(migrations[0]!.up);
    await pool.query(migrations[1]!.up);

    const cols = await columnSet(pool, 'audit_log');
    expect(cols).toContain('tenant_id');
    expect(cols).toContain('request_id');
    expect(cols).toContain('meta');
    expect(cols).toContain('result');
    expect(await columnType(pool, 'audit_log', 'meta')).toBe('jsonb');
    expect(await columnType(pool, 'audit_log', 'id')).toBe('text');
  });

  it('creates delta_tokens with composite (tenant_id, resource) PK', async () => {
    const migrations = listMigrations();
    await pool.query(migrations[0]!.up);
    await pool.query(migrations[2]!.up);

    const cols = await columnSet(pool, 'delta_tokens');
    expect(cols).toEqual(['tenant_id', 'resource', 'delta_link', 'updated_at']);
  });

  it('creates api_keys with key_hash + display_suffix + revoked_at columns', async () => {
    const migrations = listMigrations();
    await pool.query(migrations[0]!.up);
    await pool.query(migrations[3]!.up);

    const cols = await columnSet(pool, 'api_keys');
    expect(cols).toContain('key_hash');
    expect(cols).toContain('display_suffix');
    expect(cols).toContain('revoked_at');
    expect(cols).toContain('last_used_at');
  });

  it('round-trips migrations and preserves additive-only tables on Down', async () => {
    const migrations = listMigrations();
    for (const m of migrations) {
      await pool.query(m.up);
    }
    const trackedTables = ['tenants', 'audit_log', 'delta_tokens', 'api_keys', 'tenant_skills'];
    const before = await listTables(pool, trackedTables);
    expect(before).toEqual(['api_keys', 'audit_log', 'delta_tokens', 'tenant_skills', 'tenants']);

    for (const m of [...migrations].reverse()) {
      await pool.query(m.down);
    }
    const after = await listTables(pool, trackedTables);
    expect(after).toEqual(['tenant_skills']);
  });

  it('enforces tenant_id FK cascade — deleting a tenant removes audit/delta/apikey rows', async () => {
    const migrations = listMigrations();
    for (const m of migrations) {
      await pool.query(m.up);
    }
    const tenantId = '11111111-1111-4111-8111-111111111111';
    await pool.query(
      `INSERT INTO tenants (id, mode, client_id, tenant_id) VALUES ($1, 'delegated', 'c1', 't1')`,
      [tenantId]
    );
    await pool.query(
      `INSERT INTO audit_log (id, tenant_id, actor, action, request_id, result)
         VALUES ('a1', $1, 'op', 'login', 'r1', 'success')`,
      [tenantId]
    );
    await pool.query(
      `INSERT INTO delta_tokens (tenant_id, resource, delta_link) VALUES ($1, 'mail', 'lnk')`,
      [tenantId]
    );
    await pool.query(
      `INSERT INTO api_keys (id, tenant_id, name, key_hash, display_suffix)
         VALUES ('k1', $1, 'ci', 'h', '1234')`,
      [tenantId]
    );

    await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);

    const audit = await pool.query(`SELECT * FROM audit_log WHERE tenant_id = $1`, [tenantId]);
    const delta = await pool.query(`SELECT * FROM delta_tokens WHERE tenant_id = $1`, [tenantId]);
    const keys = await pool.query(`SELECT * FROM api_keys WHERE tenant_id = $1`, [tenantId]);
    expect(audit.rows).toHaveLength(0);
    expect(delta.rows).toHaveLength(0);
    expect(keys.rows).toHaveLength(0);
  });

  it('rejects mode values outside (delegated|app-only|bearer) CHECK constraint', async () => {
    const migrations = listMigrations();
    await pool.query(migrations[0]!.up);
    await expect(
      pool.query(
        `INSERT INTO tenants (id, mode, client_id, tenant_id)
           VALUES ('22222222-2222-4222-8222-222222222222', 'badmode', 'c1', 't1')`
      )
    ).rejects.toThrow();
  });
});

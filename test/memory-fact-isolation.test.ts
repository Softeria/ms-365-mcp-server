import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setPoolForTesting } from '../src/lib/postgres.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

vi.mock('../src/generated/client.js', () => ({
  api: { endpoints: [] },
}));

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
    CREATE TABLE tenants (id uuid PRIMARY KEY);
    CREATE TABLE tenant_skills (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      name text NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      frontmatter jsonb NOT NULL DEFAULT '{}'::jsonb,
      body text NOT NULL,
      arguments jsonb NOT NULL DEFAULT '[]'::jsonb,
      visibility text NOT NULL DEFAULT 'tenant',
      source text NOT NULL DEFAULT 'custom',
      source_skill_name text,
      version integer NOT NULL DEFAULT 1,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX tenant_skills_owner_name ON tenant_skills (tenant_id, COALESCE(owner_subject, ''), name);
    CREATE TABLE tenant_tool_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      name text NOT NULL,
      alias text NOT NULL,
      params jsonb NOT NULL DEFAULT '{}'::jsonb,
      note text,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, name)
    );
    CREATE TABLE tenant_tool_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      alias text NOT NULL,
      label text,
      note text,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, alias)
    );
    CREATE TABLE tenant_facts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      owner_subject text,
      scope text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`INSERT INTO tenants (id) VALUES ($1), ($2)`, [TENANT_A, TENANT_B]);
}

function tenantPack(): Record<string, unknown> {
  return {
    manifest: { id: 'tenant-pack', name: 'Tenant pack', version: 1 },
    skills: [
      {
        name: 'tenant-skill',
        title: 'Tenant skill',
        description: 'Tenant visible skill.',
        body: 'Tenant scope body.',
        arguments: [],
        visibility: 'tenant',
        frontmatter: {
          recipes: ['tenant-recipe'],
          bookmarks: ['tenant-bookmark'],
          facts: ['tenant-facts'],
        },
      },
    ],
    recipes: [
      {
        name: 'tenant-recipe',
        alias: 'list-mail-messages',
        params: { top: 5 },
        note: 'Tenant recipe.',
      },
    ],
    bookmarks: [
      {
        alias: 'list-mail-messages',
        label: 'tenant-bookmark',
        note: 'Tenant bookmark.',
      },
    ],
    facts: [{ scope: 'tenant-facts', content: 'Tenant fact.' }],
  };
}

function userPack(): Record<string, unknown> {
  return {
    manifest: { id: 'user-pack', name: 'User pack', version: 1 },
    skills: [
      {
        name: 'user-skill',
        title: 'User skill',
        description: 'User visible skill.',
        body: 'User scope body.',
        arguments: [],
        visibility: 'user',
        frontmatter: {},
      },
    ],
  };
}

describe('Phase 8 Plan 08-07 memory convergence isolation', () => {
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

  it('keeps imported skills, recipes, bookmarks, and facts tenant-scoped', async () => {
    const { importSkillPack } = await import('../src/lib/mcp-skills/packs.js');
    const { listTenantSkillRecords } = await import('../src/lib/mcp-skills/store.js');
    const { listRecipes } = await import('../src/lib/memory/recipes.js');
    const { listBookmarks } = await import('../src/lib/memory/bookmarks.js');
    const { recallFacts } = await import('../src/lib/memory/facts.js');

    await importSkillPack(TENANT_A, tenantPack());

    expect((await listTenantSkillRecords(TENANT_A)).map((skill) => skill.name)).toEqual([
      'tenant-skill',
    ]);
    expect(await listTenantSkillRecords(TENANT_B)).toEqual([]);
    expect((await listRecipes(TENANT_A)).map((recipe) => recipe.name)).toEqual(['tenant-recipe']);
    expect(await listRecipes(TENANT_B)).toEqual([]);
    expect((await listBookmarks(TENANT_A)).map((bookmark) => bookmark.label)).toEqual([
      'tenant-bookmark',
    ]);
    expect(await listBookmarks(TENANT_B)).toEqual([]);
    expect(
      (await recallFacts(TENANT_A, { scope: 'tenant-facts' })).map((fact) => fact.content)
    ).toEqual(['Tenant fact.']);
    expect(await recallFacts(TENANT_B, { scope: 'tenant-facts' })).toEqual([]);
  });

  it('keeps user-scope forks visible only to matching owner subjects', async () => {
    const { importSkillPack } = await import('../src/lib/mcp-skills/packs.js');
    const { listVisibleSkillRecords } = await import('../src/lib/mcp-skills/store.js');

    const missingOwner = await importSkillPack(TENANT_A, userPack());
    expect(missingOwner).toMatchObject({
      imported: { skills: 0 },
      skipped: { skills: ['user-skill'] },
    });

    const imported = await importSkillPack(TENANT_A, userPack(), { ownerSubject: 'user-a' });
    expect(imported.imported.skills).toBe(1);

    expect((await listVisibleSkillRecords(TENANT_A, 'user-a')).map((skill) => skill.name)).toEqual([
      'user-skill',
    ]);
    expect(await listVisibleSkillRecords(TENANT_A, 'user-b')).toEqual([]);
    expect(await listVisibleSkillRecords(TENANT_A)).toEqual([]);
    expect(await listVisibleSkillRecords(TENANT_B, 'user-a')).toEqual([]);
  });

  it('keeps user-scoped recipes, bookmarks, and facts private to matching owners', async () => {
    const { saveRecipe, listRecipes } = await import('../src/lib/memory/recipes.js');
    const { upsertBookmark, listBookmarks } = await import('../src/lib/memory/bookmarks.js');
    const { recordFact, recallFacts } = await import('../src/lib/memory/facts.js');

    await saveRecipe(TENANT_A, { name: 'tenant-recipe', alias: 'list-mail-messages', params: {} });
    await saveRecipe(
      TENANT_A,
      { name: 'private-recipe', alias: 'list-mail-messages', params: {} },
      'user-a'
    );
    await upsertBookmark(TENANT_A, { alias: 'tenant-alias', label: 'tenant-bookmark' });
    await upsertBookmark(TENANT_A, { alias: 'private-alias', label: 'private-bookmark' }, 'user-a');
    await recordFact(TENANT_A, { scope: 'tenant-facts', content: 'Tenant fact.' });
    await recordFact(TENANT_A, { scope: 'private-facts', content: 'Private fact.' }, 'user-a');

    expect(
      (await listRecipes(TENANT_A, undefined, 'user-a')).map((recipe) => recipe.name).sort()
    ).toEqual(['private-recipe', 'tenant-recipe']);
    expect((await listRecipes(TENANT_A, undefined, 'user-b')).map((recipe) => recipe.name)).toEqual(
      ['tenant-recipe']
    );
    expect((await listBookmarks(TENANT_A, undefined, 'user-a')).map((b) => b.label).sort()).toEqual(
      ['private-bookmark', 'tenant-bookmark']
    );
    expect((await listBookmarks(TENANT_A, undefined, 'user-b')).map((b) => b.label)).toEqual([
      'tenant-bookmark',
    ]);
    expect(
      (await recallFacts(TENANT_A, { scope: 'private-facts' }, 'user-a')).map((f) => f.content)
    ).toEqual(['Private fact.']);
    expect(await recallFacts(TENANT_A, { scope: 'private-facts' }, 'user-b')).toEqual([]);
  });
});

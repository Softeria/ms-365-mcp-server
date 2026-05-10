import fs from 'node:fs';
import path from 'node:path';
import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import {
  SkillBodyZod,
  SkillFrontmatterZod,
  SkillInputZod,
  SkillNameZod,
  SkillTemplateArgsZod,
  renderSkillTemplate,
} from '../src/lib/mcp-skills/schema.js';

const migrationPath = path.resolve('migrations/20261101000000_tenant_skills.sql');
const tenantsMigrationPath = path.resolve('migrations/20260501000000_tenants.sql');

function upSql(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8').split('-- Down Migration')[0];
}

describe('tenant skills schema migration', () => {
  it('applies additively and creates isolated tenant_skills constraints', () => {
    const db = newDb();
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: 'uuid',
      implementation: () => '00000000-0000-4000-8000-000000000001',
    });
    db.public.none(
      upSql(tenantsMigrationPath).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, '')
    );
    db.public.none(upSql(migrationPath));

    const columns = db.public.many(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenant_skills'
      ORDER BY ordinal_position
    `);
    expect(columns.map((row) => row.column_name)).toEqual([
      'id',
      'tenant_id',
      'owner_subject',
      'name',
      'title',
      'description',
      'frontmatter',
      'body',
      'arguments',
      'visibility',
      'source',
      'source_skill_name',
      'version',
      'enabled',
      'created_at',
      'updated_at',
    ]);

    db.public.none(`
      INSERT INTO tenants (id, mode, slug, client_id, tenant_id, cloud_type)
      VALUES ('11111111-1111-4111-8111-111111111111', 'delegated', 'tenant-a', 'client-a', 'entra-a', 'global')
    `);
    db.public.none(`
      INSERT INTO tenant_skills (id, tenant_id, owner_subject, name, title, description, body)
      VALUES ('00000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'user-a', 'triage', 'Triage', 'desc', 'body')
    `);
    expect(() =>
      db.public.none(`
        INSERT INTO tenant_skills (id, tenant_id, owner_subject, name, title, description, body)
        VALUES ('00000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'user-a', 'triage', 'Triage', 'desc', 'body')
      `)
    ).toThrow();
    db.public.none(`
      INSERT INTO tenant_skills (id, tenant_id, owner_subject, name, title, description, body)
      VALUES ('00000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', NULL, 'tenant-triage', 'Triage', 'desc', 'body')
    `);
    expect(() =>
      db.public.none(`
        INSERT INTO tenant_skills (id, tenant_id, owner_subject, name, title, description, body)
        VALUES ('00000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', NULL, 'tenant-triage', 'Triage', 'desc', 'body')
      `)
    ).toThrow();
    expect(() =>
      db.public.none(`
        INSERT INTO tenant_skills (id, tenant_id, owner_subject, name, title, description, body)
        VALUES ('00000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'user-a', 'triage', 'Triage', 'desc', 'body')
      `)
    ).toThrow();

    const migrationSql = upSql(migrationPath);
    expect(migrationSql).toContain('idx_tenant_skills_unique_tenant_name');
    expect(migrationSql).toContain('idx_tenant_skills_unique_owner_name');
    expect(migrationSql).toContain('idx_tenant_skills_tenant_enabled');
    expect(migrationSql).toContain('idx_tenant_skills_tenant_visibility');
  });

  it('is additive-only in the up migration', () => {
    const up = upSql(migrationPath);
    expect(up).not.toMatch(/DROP TABLE|ALTER TABLE .* DROP|TRUNCATE/i);
  });
});

describe('skill zod schemas', () => {
  it('validates MCP prompt-safe names and bounded content', () => {
    expect(SkillNameZod.parse('mail_triage-1')).toBe('mail_triage-1');
    expect(() => SkillNameZod.parse('bad/name')).toThrow();
    expect(() => SkillNameZod.parse('x'.repeat(65))).toThrow();
    expect(() => SkillBodyZod.parse('x'.repeat(50001))).toThrow();
  });

  it('validates full skill input metadata', () => {
    const parsed = SkillInputZod.parse({
      name: 'mail_triage',
      title: 'Mail triage',
      description: 'Summarize unread mail',
      frontmatter: SkillFrontmatterZod.parse({ tags: ['mail'], risk: 'low' }),
      body: 'Use {{account}} safely',
      arguments: [{ name: 'account', required: true }],
      visibility: 'tenant',
      source: 'custom',
    });
    expect(parsed.version).toBe(1);
    expect(parsed.enabled).toBe(true);
  });

  it('escapes template substitutions while preserving required argument validation', () => {
    const args = SkillTemplateArgsZod.parse({ account: '<script>alert(1)</script>' });
    const rendered = renderSkillTemplate('Account: {{ account }}', args, [
      { name: 'account', required: true },
    ]);
    expect(rendered).toEqual({ ok: true, text: 'Account: &lt;script&gt;alert(1)&lt;/script&gt;' });

    const missing = renderSkillTemplate('Account: {{ account }}', {}, [
      { name: 'account', required: true },
    ]);
    expect(missing.ok).toBe(false);
  });
});

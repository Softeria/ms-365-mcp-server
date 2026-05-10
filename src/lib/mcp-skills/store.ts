import { z } from 'zod';
import { getPool } from '../postgres.js';
import type { PromptTemplateDefinition } from '../mcp-prompts/frontmatter.js';
import { SkillInputZod, SkillNameZod, type SkillInput, type SkillVisibility } from './schema.js';

const TenantIdZod = z.string().uuid();
const OwnerSubjectZod = z.string().trim().min(1).max(512).optional();

export interface TenantSkillRow {
  id: string;
  tenant_id: string;
  owner_subject: string | null;
  name: string;
  title: string;
  description: string;
  frontmatter: unknown;
  body: string;
  arguments: unknown;
  visibility: SkillVisibility;
  source: 'builtin' | 'fork' | 'custom' | 'import';
  source_skill_name: string | null;
  version: number;
  enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SkillRecord extends SkillInput {
  readonly id?: string;
  readonly tenantId?: string;
  readonly ownerSubject?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface VisibleSkillWhereClause {
  readonly clause: string;
  readonly params: readonly unknown[];
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value === 'string') return z.array(z.unknown()).parse(JSON.parse(value));
  return z.array(z.unknown()).parse(value);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToSkillInput(row: TenantSkillRow): SkillRecord {
  const skill = SkillInputZod.parse({
    name: row.name,
    title: row.title,
    description: row.description,
    frontmatter:
      typeof row.frontmatter === 'string' ? JSON.parse(row.frontmatter) : row.frontmatter,
    body: row.body,
    arguments: parseJsonArray(row.arguments),
    visibility: row.visibility,
    source: row.source,
    sourceSkillName: row.source_skill_name ?? undefined,
    version: row.version,
    enabled: row.enabled,
  });
  return {
    ...skill,
    id: row.id,
    tenantId: row.tenant_id,
    ownerSubject: row.owner_subject,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function accessibleSkillWhereClause(
  tenantParamIndex: number,
  ownerSubject?: string,
  enabledOnly = false
): VisibleSkillWhereClause {
  const owner = OwnerSubjectZod.parse(ownerSubject);
  const enabled = enabledOnly ? 'enabled = true AND ' : '';
  if (!owner) {
    return {
      clause: `WHERE tenant_id = $${tenantParamIndex} AND ${enabled}visibility IN ('tenant', 'admin', 'builtin-copy') AND owner_subject IS NULL`,
      params: [],
    };
  }
  return {
    clause: `WHERE tenant_id = $${tenantParamIndex} AND ${enabled}((visibility IN ('tenant', 'admin', 'builtin-copy') AND owner_subject IS NULL) OR (visibility = 'user' AND owner_subject = $${tenantParamIndex + 1}))`,
    params: [owner],
  };
}

export function visibleSkillWhereClause(
  tenantParamIndex: number,
  ownerSubject?: string
): VisibleSkillWhereClause {
  return accessibleSkillWhereClause(tenantParamIndex, ownerSubject, true);
}

export function skillInputToPrompt(tenantId: string, skill: SkillInput): PromptTemplateDefinition {
  return {
    sourcePath: `tenant-skills:${tenantId}/${skill.name}`,
    name: skill.name,
    description: skill.description,
    arguments: skill.arguments,
    template: skill.body,
  };
}

export function skillRowToPrompt(row: TenantSkillRow): PromptTemplateDefinition {
  return skillInputToPrompt(row.tenant_id, rowToSkillInput(row));
}

export async function listVisibleSkills(
  tenantId: string,
  ownerSubject?: string
): Promise<PromptTemplateDefinition[]> {
  const tid = TenantIdZod.parse(tenantId);
  const visible = visibleSkillWhereClause(1, ownerSubject);
  const result = await getPool().query<TenantSkillRow>(
    `SELECT id, tenant_id, owner_subject, name, title, description, frontmatter, body,
            arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at
     FROM tenant_skills
     ${visible.clause}
     ORDER BY name ASC`,
    [tid, ...visible.params]
  );
  return result.rows.map(skillRowToPrompt);
}

export async function listTenantSkillRecords(tenantId: string): Promise<SkillRecord[]> {
  const tid = TenantIdZod.parse(tenantId);
  const result = await getPool().query<TenantSkillRow>(
    `SELECT id, tenant_id, owner_subject, name, title, description, frontmatter, body,
            arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at
     FROM tenant_skills
     WHERE tenant_id = $1
     ORDER BY name ASC`,
    [tid]
  );
  return result.rows.map(rowToSkillInput);
}

export async function listVisibleSkillRecords(
  tenantId: string,
  ownerSubject?: string
): Promise<SkillRecord[]> {
  const tid = TenantIdZod.parse(tenantId);
  const visible = visibleSkillWhereClause(1, ownerSubject);
  const result = await getPool().query<TenantSkillRow>(
    `SELECT id, tenant_id, owner_subject, name, title, description, frontmatter, body,
            arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at
     FROM tenant_skills
     ${visible.clause}
     ORDER BY name ASC`,
    [tid, ...visible.params]
  );
  return result.rows.map(rowToSkillInput);
}

export async function getTenantSkillRecord(
  tenantId: string,
  name: string
): Promise<SkillRecord | null> {
  const tid = TenantIdZod.parse(tenantId);
  const parsedName = SkillNameZod.parse(name);
  const result = await getPool().query<TenantSkillRow>(
    `SELECT id, tenant_id, owner_subject, name, title, description, frontmatter, body,
            arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at
     FROM tenant_skills
     WHERE tenant_id = $1 AND name = $2 AND owner_subject IS NULL
     LIMIT 1`,
    [tid, parsedName]
  );
  return result.rows[0] ? rowToSkillInput(result.rows[0]) : null;
}

export async function getVisibleSkillRecord(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<SkillRecord | null> {
  const tid = TenantIdZod.parse(tenantId);
  const parsedName = SkillNameZod.parse(name);
  const owner = OwnerSubjectZod.parse(ownerSubject);
  const visible = visibleSkillWhereClause(1, owner);
  const ownerPrecedence = owner
    ? 'ORDER BY CASE WHEN owner_subject = $2 THEN 0 ELSE 1 END, owner_subject NULLS LAST'
    : 'ORDER BY owner_subject NULLS LAST';
  const result = await getPool().query<TenantSkillRow>(
    `SELECT id, tenant_id, owner_subject, name, title, description, frontmatter, body,
            arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at
     FROM tenant_skills
     ${visible.clause} AND name = $${2 + visible.params.length}
     ${ownerPrecedence}
     LIMIT 1`,
    [tid, ...visible.params, parsedName]
  );
  return result.rows[0] ? rowToSkillInput(result.rows[0]) : null;
}

export async function getAccessibleSkillRecord(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<SkillRecord | null> {
  const tid = TenantIdZod.parse(tenantId);
  const parsedName = SkillNameZod.parse(name);
  const owner = OwnerSubjectZod.parse(ownerSubject);
  const accessible = accessibleSkillWhereClause(1, owner);
  const ownerPrecedence = owner
    ? 'ORDER BY CASE WHEN owner_subject = $2 THEN 0 ELSE 1 END, owner_subject NULLS LAST'
    : 'ORDER BY owner_subject NULLS LAST';
  const result = await getPool().query<TenantSkillRow>(
    `SELECT id, tenant_id, owner_subject, name, title, description, frontmatter, body,
            arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at
     FROM tenant_skills
     ${accessible.clause} AND name = $${2 + accessible.params.length}
     ${ownerPrecedence}
     LIMIT 1`,
    [tid, ...accessible.params, parsedName]
  );
  return result.rows[0] ? rowToSkillInput(result.rows[0]) : null;
}

export async function getVisibleSkill(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<PromptTemplateDefinition | null> {
  const skill = await getVisibleSkillRecord(tenantId, name, ownerSubject);
  return skill ? skillInputToPrompt(tenantId, skill) : null;
}

export function forkBuiltinSkillInput(
  prompt: PromptTemplateDefinition,
  ownerSubject?: string
): SkillInput & { ownerSubject?: string } {
  return {
    name: prompt.name,
    title: prompt.name,
    description: prompt.description,
    frontmatter: {},
    body: prompt.template,
    arguments: [...prompt.arguments],
    visibility: ownerSubject ? 'user' : 'tenant',
    source: 'fork',
    sourceSkillName: prompt.name,
    version: 1,
    enabled: true,
    ...(ownerSubject ? { ownerSubject } : {}),
  };
}

export async function saveTenantSkill(
  tenantId: string,
  input: SkillInput & { ownerSubject?: string | null }
): Promise<SkillRecord> {
  const tid = TenantIdZod.parse(tenantId);
  const { ownerSubject: rawOwnerSubject, ...rawSkill } = input;
  const ownerSubject = OwnerSubjectZod.parse(rawOwnerSubject ?? undefined) ?? null;
  const skill = SkillInputZod.parse(rawSkill);
  const ownerWhere = ownerSubject === null ? 'owner_subject IS NULL' : 'owner_subject = $2';
  const existing = await getPool().query<{ id: string; version: number }>(
    `SELECT id, version
     FROM tenant_skills
     WHERE tenant_id = $1 AND ${ownerWhere} AND name = $3
     LIMIT 1`,
    [tid, ownerSubject, skill.name]
  );

  const params = [
    tid,
    ownerSubject,
    skill.name,
    skill.title,
    skill.description,
    JSON.stringify(skill.frontmatter),
    skill.body,
    JSON.stringify(skill.arguments),
    skill.visibility,
    skill.source,
    skill.sourceSkillName ?? null,
    skill.enabled,
  ];

  const result = existing.rows[0]
    ? await getPool().query<TenantSkillRow>(
        `UPDATE tenant_skills
         SET title = $4,
             description = $5,
             frontmatter = $6::jsonb,
             body = $7,
             arguments = $8::jsonb,
             visibility = $9,
             source = $10,
             source_skill_name = $11,
             enabled = $12,
             version = version + 1,
             updated_at = NOW()
         WHERE tenant_id = $1 AND ${ownerWhere} AND name = $3
         RETURNING id, tenant_id, owner_subject, name, title, description, frontmatter, body,
                   arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at`,
        params
      )
    : await getPool().query<TenantSkillRow>(
        `INSERT INTO tenant_skills (
           tenant_id, owner_subject, name, title, description, frontmatter, body,
           arguments, visibility, source, source_skill_name, enabled
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10, $11, $12)
         RETURNING id, tenant_id, owner_subject, name, title, description, frontmatter, body,
                   arguments, visibility, source, source_skill_name, version, enabled, created_at, updated_at`,
        params
      );

  return rowToSkillInput(result.rows[0]);
}

export async function disableTenantSkill(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<{ deleted: boolean }> {
  const tid = TenantIdZod.parse(tenantId);
  const parsedName = SkillNameZod.parse(name);
  const owner = OwnerSubjectZod.parse(ownerSubject) ?? null;
  const ownerWhere = owner === null ? 'owner_subject IS NULL' : 'owner_subject = $2';
  const result = await getPool().query<{ id: string }>(
    `UPDATE tenant_skills
     SET enabled = false, updated_at = NOW()
     WHERE tenant_id = $1 AND ${ownerWhere} AND name = $3
     RETURNING id`,
    [tid, owner, parsedName]
  );
  return { deleted: result.rows.length > 0 };
}

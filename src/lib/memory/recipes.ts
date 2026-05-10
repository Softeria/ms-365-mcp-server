import { z } from 'zod';
import { getPool } from '../postgres.js';

const TenantIdZod = z.string().uuid();
const OwnerSubjectZod = z.string().trim().min(1).max(512).optional();
export const RecipeNameZod = z.string().trim().min(1).max(256);
export const RecipeAliasZod = z.string().trim().min(1).max(512);
export const RecipeParamsZod = z.record(z.unknown());
export const RecipeNoteZod = z.string().trim().min(1).max(2000).optional();
export const RecipeVisibilityZod = z.enum(['tenant', 'user']);
const RecipeLookupZod = z.string().trim().min(1).max(512);
const RecipeFilterZod = z.string().trim().min(1).max(512).optional();

export const RecipeInputZod = z.object({
  name: RecipeNameZod,
  alias: RecipeAliasZod,
  params: RecipeParamsZod,
  note: RecipeNoteZod,
});

export interface RecipeInput {
  name: string;
  alias: string;
  params: Record<string, unknown>;
  note?: string;
}

export interface Recipe {
  id: string;
  ownerSubject: string | null;
  visibility: z.infer<typeof RecipeVisibilityZod>;
  name: string;
  alias: string;
  params: Record<string, unknown>;
  note: string | null;
  lastRunAt: string | null;
  createdAt: string;
}

export interface DeleteRecipeResult {
  deleted: boolean;
}

interface RecipeRow {
  id: string;
  tenant_id?: string;
  owner_subject: string | null;
  name: string;
  alias: string;
  params: unknown;
  note: string | null;
  last_run_at: Date | string | null;
  created_at: Date | string;
}

function parseTenantId(tenantId: string): string {
  return TenantIdZod.parse(tenantId);
}

function normalizeOptional(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

function parseOwnerSubject(ownerSubject?: string): string | null {
  return OwnerSubjectZod.parse(ownerSubject) ?? null;
}

function visibleOwnerWhere(ownerSubject: string | null): string {
  return ownerSubject === null
    ? 'owner_subject IS NULL'
    : '(owner_subject IS NULL OR owner_subject = $2::text)';
}

function exactOwnerWhere(ownerSubject: string | null): string {
  return ownerSubject === null
    ? 'owner_subject IS NULL AND $2::text IS NULL'
    : 'owner_subject = $2::text';
}

function ownerPrecedence(ownerSubject: string | null): string {
  return ownerSubject === null ? 'owner_subject NULLS LAST' : 'owner_subject = $2::text DESC';
}

function toIsoString(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function parseParams(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    const parsed = JSON.parse(value) as unknown;
    return RecipeParamsZod.parse(parsed);
  }
  return RecipeParamsZod.parse(value);
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    ownerSubject: row.owner_subject,
    visibility: row.owner_subject === null ? 'tenant' : 'user',
    name: row.name,
    alias: row.alias,
    params: parseParams(row.params),
    note: row.note,
    lastRunAt: toIsoString(row.last_run_at),
    createdAt: toIsoString(row.created_at) ?? new Date(0).toISOString(),
  };
}

function uniqueRecipesByName(rows: readonly RecipeRow[]): Recipe[] {
  const seen = new Set<string>();
  const recipes: Recipe[] = [];
  for (const row of rows) {
    if (seen.has(row.name)) continue;
    seen.add(row.name);
    recipes.push(rowToRecipe(row));
  }
  return recipes;
}

export async function saveRecipe(
  tenantId: string,
  input: RecipeInput,
  ownerSubject?: string
): Promise<Recipe> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const body = RecipeInputZod.parse(input);
  const ownerWhere = exactOwnerWhere(owner);
  const existing = await getPool().query<{ id: string }>(
    `SELECT id
     FROM tenant_tool_recipes
     WHERE tenant_id = $1 AND ${ownerWhere} AND name = $3
     LIMIT 1`,
    [tid, owner, body.name]
  );
  const params = [
    tid,
    owner,
    body.name,
    body.alias,
    JSON.stringify(body.params),
    normalizeOptional(body.note),
  ];
  const result = existing.rows[0]
    ? await getPool().query<RecipeRow>(
        `UPDATE tenant_tool_recipes
         SET alias = $4,
             params = $5::jsonb,
             note = $6
         WHERE tenant_id = $1 AND ${ownerWhere} AND name = $3
         RETURNING id, tenant_id, owner_subject, name, alias, params, note, last_run_at, created_at`,
        params
      )
    : await getPool().query<RecipeRow>(
        `INSERT INTO tenant_tool_recipes (tenant_id, owner_subject, name, alias, params, note)
         VALUES ($1, $2::text, $3, $4, $5::jsonb, $6)
         RETURNING id, tenant_id, owner_subject, name, alias, params, note, last_run_at, created_at`,
        params
      );
  return rowToRecipe(result.rows[0]);
}

export async function listRecipes(
  tenantId: string,
  filter?: string,
  ownerSubject?: string
): Promise<Recipe[]> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const parsedFilter = RecipeFilterZod.parse(filter);
  const params: unknown[] = owner === null ? [tid] : [tid, owner];
  let where = `WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)}`;
  if (parsedFilter) {
    params.push(`%${parsedFilter.toLowerCase()}%`);
    const filterParam = `$${params.length}`;
    where += ` AND (
      LOWER(name) LIKE ${filterParam}
      OR LOWER(alias) LIKE ${filterParam}
      OR LOWER(COALESCE(note, '')) LIKE ${filterParam}
    )`;
  }
  const result = await getPool().query<RecipeRow>(
    `SELECT id, owner_subject, name, alias, params, note, last_run_at, created_at
     FROM tenant_tool_recipes
     ${where}
     ORDER BY ${ownerPrecedence(owner)}, created_at DESC, name ASC`,
    params
  );
  return uniqueRecipesByName(result.rows);
}

export async function getRecipeByName(
  tenantId: string,
  name: string,
  ownerSubject?: string
): Promise<Recipe | null> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const parsedName = RecipeNameZod.parse(name);
  const result = await getPool().query<RecipeRow>(
    `SELECT id, owner_subject, name, alias, params, note, last_run_at, created_at
     FROM tenant_tool_recipes
     WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)} AND name = $${owner === null ? 2 : 3}
     ORDER BY ${ownerPrecedence(owner)}, created_at DESC
     LIMIT 1`,
    owner === null ? [tid, parsedName] : [tid, owner, parsedName]
  );
  return result.rows[0] ? rowToRecipe(result.rows[0]) : null;
}

export async function markRecipeRun(
  tenantId: string,
  name: string,
  ownerSubject?: string | null
): Promise<Recipe | null> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject ?? undefined);
  const parsedName = RecipeNameZod.parse(name);
  const ownerWhere = exactOwnerWhere(owner);
  const result = await getPool().query<RecipeRow>(
    `UPDATE tenant_tool_recipes
     SET last_run_at = NOW()
     WHERE tenant_id = $1 AND ${ownerWhere} AND name = $3
     RETURNING id, owner_subject, name, alias, params, note, last_run_at, created_at`,
    [tid, owner, parsedName]
  );
  return result.rows[0] ? rowToRecipe(result.rows[0]) : null;
}

export async function deleteRecipe(
  tenantId: string,
  nameOrId: string,
  ownerSubject?: string
): Promise<DeleteRecipeResult> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const lookup = RecipeLookupZod.parse(nameOrId);
  const found = await getPool().query<{ id: string }>(
    `SELECT id
     FROM tenant_tool_recipes
     WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)} AND (id::text = $${owner === null ? 2 : 3} OR name = $${owner === null ? 2 : 3})
     ORDER BY ${ownerPrecedence(owner)}, created_at DESC
     LIMIT 1`,
    owner === null ? [tid, lookup] : [tid, owner, lookup]
  );
  if (!found.rows[0]) return { deleted: false };
  const result = await getPool().query<{ id: string }>(
    `DELETE FROM tenant_tool_recipes
     WHERE tenant_id = $1 AND id = $2::uuid
     RETURNING id`,
    [tid, found.rows[0].id]
  );
  return { deleted: result.rows.length > 0 };
}

export function mergeRecipeParams(
  savedParams: Record<string, unknown>,
  paramOverrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return { ...savedParams, ...paramOverrides };
}

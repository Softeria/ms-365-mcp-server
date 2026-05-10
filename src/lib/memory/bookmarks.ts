import { z } from 'zod';
import { getPool } from '../postgres.js';

const TenantIdZod = z.string().uuid();
const OwnerSubjectZod = z.string().trim().min(1).max(512).optional();
export const BookmarkAliasZod = z.string().trim().min(1).max(512);
export const BookmarkLabelZod = z.string().trim().min(1).max(256).optional();
export const BookmarkNoteZod = z.string().trim().min(1).max(2000).optional();
export const BookmarkVisibilityZod = z.enum(['tenant', 'user']);
const BookmarkLookupZod = z.string().trim().min(1).max(512);
const BookmarkFilterZod = z.string().trim().min(1).max(512).optional();

export const BookmarkInputZod = z.object({
  alias: BookmarkAliasZod,
  label: BookmarkLabelZod,
  note: BookmarkNoteZod,
});

export interface BookmarkInput {
  alias: string;
  label?: string;
  note?: string;
}

export interface Bookmark {
  id: string;
  ownerSubject: string | null;
  visibility: z.infer<typeof BookmarkVisibilityZod>;
  alias: string;
  label: string | null;
  note: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface DeleteBookmarkResult {
  deleted: boolean;
  ambiguous?: boolean;
}

interface BookmarkRow {
  id: string;
  owner_subject: string | null;
  alias: string;
  label: string | null;
  note: string | null;
  last_used_at: Date | string | null;
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

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    ownerSubject: row.owner_subject,
    visibility: row.owner_subject === null ? 'tenant' : 'user',
    alias: row.alias,
    label: row.label,
    note: row.note,
    lastUsedAt: toIsoString(row.last_used_at),
    createdAt: toIsoString(row.created_at) ?? new Date(0).toISOString(),
  };
}

function uniqueBookmarksByAlias(rows: readonly BookmarkRow[]): Bookmark[] {
  const seen = new Set<string>();
  const bookmarks: Bookmark[] = [];
  for (const row of rows) {
    if (seen.has(row.alias)) continue;
    seen.add(row.alias);
    bookmarks.push(rowToBookmark(row));
  }
  return bookmarks;
}

export async function upsertBookmark(
  tenantId: string,
  input: BookmarkInput,
  ownerSubject?: string
): Promise<Bookmark> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const body = BookmarkInputZod.parse(input);
  const ownerWhere = exactOwnerWhere(owner);
  const existing = await getPool().query<{ id: string }>(
    `SELECT id
     FROM tenant_tool_bookmarks
     WHERE tenant_id = $1 AND ${ownerWhere} AND alias = $3
     LIMIT 1`,
    [tid, owner, body.alias]
  );
  const params = [
    tid,
    owner,
    body.alias,
    normalizeOptional(body.label),
    normalizeOptional(body.note),
  ];
  const result = existing.rows[0]
    ? await getPool().query<BookmarkRow>(
        `UPDATE tenant_tool_bookmarks
         SET label = $4,
             note = $5
         WHERE tenant_id = $1 AND ${ownerWhere} AND alias = $3
         RETURNING id, owner_subject, alias, label, note, last_used_at, created_at`,
        params
      )
    : await getPool().query<BookmarkRow>(
        `INSERT INTO tenant_tool_bookmarks (tenant_id, owner_subject, alias, label, note)
         VALUES ($1, $2::text, $3, $4, $5)
         RETURNING id, owner_subject, alias, label, note, last_used_at, created_at`,
        params
      );
  return rowToBookmark(result.rows[0]);
}

export async function listBookmarks(
  tenantId: string,
  filter?: string,
  ownerSubject?: string
): Promise<Bookmark[]> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const parsedFilter = BookmarkFilterZod.parse(filter);
  const params: unknown[] = owner === null ? [tid] : [tid, owner];
  let where = `WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)}`;
  if (parsedFilter) {
    params.push(`%${parsedFilter.toLowerCase()}%`);
    const filterParam = `$${params.length}`;
    where += ` AND (
      LOWER(alias) LIKE ${filterParam}
      OR LOWER(COALESCE(label, '')) LIKE ${filterParam}
      OR LOWER(COALESCE(note, '')) LIKE ${filterParam}
    )`;
  }
  const result = await getPool().query<BookmarkRow>(
    `SELECT id, owner_subject, alias, label, note, last_used_at, created_at
     FROM tenant_tool_bookmarks
     ${where}
     ORDER BY ${ownerPrecedence(owner)}, created_at DESC, alias ASC`,
    params
  );
  return uniqueBookmarksByAlias(result.rows);
}

export async function deleteBookmark(
  tenantId: string,
  labelOrAliasOrId: string,
  ownerSubject?: string
): Promise<DeleteBookmarkResult> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const lookup = BookmarkLookupZod.parse(labelOrAliasOrId);
  const lookupParam = owner === null ? '$2' : '$3';
  const visibleParams = owner === null ? [tid, lookup] : [tid, owner, lookup];

  const directMatch = await getPool().query<{ id: string }>(
    `SELECT id
     FROM tenant_tool_bookmarks
     WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)} AND (id::text = ${lookupParam} OR alias = ${lookupParam})
     ORDER BY ${ownerPrecedence(owner)}, created_at DESC
     LIMIT 1`,
    visibleParams
  );
  if (directMatch.rows[0]) {
    const result = await getPool().query<{ id: string }>(
      `DELETE FROM tenant_tool_bookmarks
       WHERE tenant_id = $1 AND id = $2::uuid
       RETURNING id`,
      [tid, directMatch.rows[0].id]
    );
    return { deleted: result.rows.length > 0 };
  }

  const labelMatches = await getPool().query<{ id: string }>(
    `SELECT id
     FROM tenant_tool_bookmarks
     WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)} AND label = ${lookupParam}
     ORDER BY ${ownerPrecedence(owner)}, created_at DESC, id ASC
     LIMIT 2`,
    visibleParams
  );
  if (labelMatches.rows.length === 0) return { deleted: false };
  if (labelMatches.rows.length > 1) return { deleted: false, ambiguous: true };

  const byLabel = await getPool().query<{ id: string }>(
    `DELETE FROM tenant_tool_bookmarks
     WHERE tenant_id = $1 AND id = $2::uuid
     RETURNING id`,
    [tid, labelMatches.rows[0].id]
  );
  return { deleted: byLabel.rows.length > 0 };
}

export async function getBookmarkCountsByAlias(
  tenantId: string,
  ownerSubject?: string
): Promise<Map<string, number>> {
  const tid = parseTenantId(tenantId);
  const owner = parseOwnerSubject(ownerSubject);
  const result = await getPool().query<{ alias: string; count: string | number }>(
    `SELECT alias, COUNT(*)::int AS count
     FROM tenant_tool_bookmarks
     WHERE tenant_id = $1 AND ${visibleOwnerWhere(owner)}
     GROUP BY alias`,
    owner === null ? [tid] : [tid, owner]
  );
  return new Map(result.rows.map((row) => [row.alias, Number(row.count)]));
}

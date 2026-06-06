import { randomBytes } from 'node:crypto';
import { getRequestOwnerSubject, getRequestTenant, requestContext } from '../../request-context.js';
import { getRedis } from '../redis.js';
import { BULK_LIMITS, type BulkErrorCode } from './schema.js';
import { byteLength, sha256Hex } from './sanitize.js';

export interface BulkStoredItem {
  id: string;
  toolName: string;
  status: string;
  code?: string;
  retryAfterSeconds?: number;
  data?: unknown;
}

interface StoredResult {
  resultId: string;
  tenantId: string;
  ownerKey: string;
  createdAt: number;
  expiresAt: number;
  digest: string;
  items: BulkStoredItem[];
  summary: Record<string, unknown>;
}

interface StoredCursor {
  resultId: string;
  tenantId: string;
  ownerKey: string;
  offset: number;
  expiresAt: number;
}

export type ReadBulkResultOutcome =
  | {
      ok: true;
      value: {
        resultId: string;
        expiresAt: string;
        nextCursor?: string;
        items: BulkStoredItem[];
        summary: Record<string, unknown>;
      };
    }
  | { ok: false; code: BulkErrorCode; message: string };

const store = new Map<string, StoredResult>();
const PROCESS_LOCAL_BULK_RESULTS_ENV = 'MS365_MCP_ENABLE_PROCESS_LOCAL_BULK_RESULTS';
const RESULT_KEY_PREFIX = 'mcp:bulk-result:';
const CURSOR_KEY_PREFIX = 'mcp:bulk-result-cursor:';
const cursors = new Map<string, StoredCursor>();
let runtimeTransportMode: 'stdio' | 'http' | undefined;

export function setBulkResultRuntimeTransportMode(mode: 'stdio' | 'http'): void {
  runtimeTransportMode = mode;
}

export function resetBulkResultRuntimeTransportModeForTesting(): void {
  runtimeTransportMode = undefined;
}

function tenantId(): string | undefined {
  return getRequestTenant().id ?? requestContext.getStore()?.tenantId ?? undefined;
}

export function processLocalBulkResultsEnabled(): boolean {
  const value = process.env[PROCESS_LOCAL_BULK_RESULTS_ENV];
  if (value !== 'true' && value !== '1') return false;
  return runtimeTransportMode === 'stdio';
}

function redisBulkResultsEnabled(): boolean {
  return Boolean(process.env.MS365_MCP_REDIS_URL);
}

export async function bulkResultStoreAvailable(): Promise<boolean> {
  if (processLocalBulkResultsEnabled()) return true;
  if (!redisBulkResultsEnabled()) return false;
  try {
    const pong = await getRedis().ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export function bulkOwnerKey(): string {
  const ctx = requestContext.getStore();
  const owner = getRequestOwnerSubject();
  if (owner) return `${ctx?.flow ?? 'unknown'}:${sha256Hex(owner)}`;
  if (ctx?.flow === 'app-only') return 'app-only:tenant-wide';
  return `process:${sha256Hex(process.cwd())}`;
}

function sweep(now = Date.now()): void {
  for (const [id, result] of store.entries()) {
    if (result.expiresAt <= now) store.delete(id);
  }
  for (const [cursor, state] of cursors.entries()) {
    if (state.expiresAt <= now) cursors.delete(cursor);
  }
}

function validateStoreInput(input: {
  items: BulkStoredItem[];
  summary: Record<string, unknown>;
}):
  | { ok: true; tenantId: string; ownerKey: string }
  | { ok: false; error: BulkErrorCode; message: string } {
  const currentTenant = tenantId();
  if (!currentTenant) {
    return {
      ok: false,
      error: 'tenant_context_unavailable',
      message: 'Tenant context unavailable.',
    };
  }
  if (input.items.length > BULK_LIMITS.maxStoredItems) {
    return {
      ok: false,
      error: 'output_budget_exceeded',
      message: `Bulk result contains ${input.items.length} items, exceeding the storage limit of ${BULK_LIMITS.maxStoredItems}.`,
    };
  }
  const payloadBytes = byteLength({ items: input.items, summary: input.summary });
  if (payloadBytes > BULK_LIMITS.maxStoredResultBytes) {
    return {
      ok: false,
      error: 'output_budget_exceeded',
      message: 'Sanitized bulk result exceeds storage budget.',
    };
  }
  return { ok: true, tenantId: currentTenant, ownerKey: bulkOwnerKey() };
}

export async function storeBulkResult(input: {
  digest: string;
  items: BulkStoredItem[];
  summary: Record<string, unknown>;
}): Promise<
  | {
      resultId: string;
      expiresAt: string;
      resultStore: 'redis_durable' | 'process_local_best_effort';
    }
  | { error: BulkErrorCode; message: string }
> {
  const validated = validateStoreInput(input);
  if (!validated.ok) return { error: validated.error, message: validated.message };

  const now = Date.now();
  const resultId = `bulk_${randomBytes(18).toString('base64url')}`;
  const expiresAt = now + BULK_LIMITS.resultTtlMs;
  const result: StoredResult = {
    resultId,
    tenantId: validated.tenantId,
    ownerKey: validated.ownerKey,
    createdAt: now,
    expiresAt,
    digest: input.digest,
    items: input.items,
    summary: input.summary,
  };

  if (redisBulkResultsEnabled()) {
    try {
      await getRedis().set(
        `${RESULT_KEY_PREFIX}${resultId}`,
        JSON.stringify(result),
        'PX',
        BULK_LIMITS.resultTtlMs
      );
      return {
        resultId,
        expiresAt: new Date(expiresAt).toISOString(),
        resultStore: 'redis_durable',
      };
    } catch {
      return {
        error: 'result_store_unavailable',
        message: 'Durable bulk result storage is unavailable.',
      };
    }
  }

  if (!processLocalBulkResultsEnabled()) {
    return {
      error: 'result_store_unavailable',
      message:
        'Bulk result pagination requires durable storage; process-local result IDs are disabled by default.',
    };
  }

  sweep(now);
  store.set(resultId, result);
  return {
    resultId,
    expiresAt: new Date(expiresAt).toISOString(),
    resultStore: 'process_local_best_effort',
  };
}

async function makeCursor(result: StoredResult, offset: number): Promise<string> {
  const cursor = `cur_${randomBytes(18).toString('base64url')}`;
  const state: StoredCursor = {
    resultId: result.resultId,
    tenantId: result.tenantId,
    ownerKey: result.ownerKey,
    offset,
    expiresAt: result.expiresAt,
  };
  if (redisBulkResultsEnabled()) {
    await getRedis().set(
      `${CURSOR_KEY_PREFIX}${cursor}`,
      JSON.stringify(state),
      'PX',
      Math.max(1, result.expiresAt - Date.now())
    );
  } else {
    cursors.set(cursor, state);
  }
  return cursor;
}

function parseStoredResult(value: string | null): StoredResult | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as StoredResult;
    if (typeof parsed.resultId !== 'string' || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseStoredCursor(value: string | null): StoredCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as StoredCursor;
    if (typeof parsed.resultId !== 'string' || typeof parsed.offset !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadResult(resultId: string): Promise<StoredResult | null> {
  if (redisBulkResultsEnabled()) {
    return parseStoredResult(await getRedis().get(`${RESULT_KEY_PREFIX}${resultId}`));
  }
  return store.get(resultId) ?? null;
}

async function consumeCursor(cursor: string): Promise<StoredCursor | null> {
  if (redisBulkResultsEnabled()) {
    return parseStoredCursor(await getRedis().getdel(`${CURSOR_KEY_PREFIX}${cursor}`));
  }
  const cursorState = cursors.get(cursor) ?? null;
  cursors.delete(cursor);
  return cursorState;
}

function resultStoreUnavailable(): ReadBulkResultOutcome {
  return {
    ok: false,
    code: 'result_store_unavailable',
    message: 'Durable bulk result storage is unavailable.',
  };
}

export async function readBulkResult(input: {
  resultId: string;
  cursor?: string;
  limit?: number;
}): Promise<ReadBulkResultOutcome> {
  if (!redisBulkResultsEnabled() && !processLocalBulkResultsEnabled()) {
    return {
      ok: false,
      code: 'result_store_unavailable',
      message: 'Bulk result pagination is unavailable without durable storage.',
    };
  }
  sweep();
  const currentTenant = tenantId();
  if (!currentTenant) {
    return {
      ok: false,
      code: 'tenant_context_unavailable',
      message: 'Tenant context unavailable.',
    };
  }
  const ownerKey = bulkOwnerKey();
  let result: StoredResult | null;
  try {
    result = await loadResult(input.resultId);
  } catch {
    return resultStoreUnavailable();
  }
  if (!result) return { ok: false, code: 'result_not_found', message: 'Bulk result not found.' };
  if (result.expiresAt <= Date.now()) {
    store.delete(input.resultId);
    return { ok: false, code: 'result_expired', message: 'Bulk result expired.' };
  }
  if (result.tenantId !== currentTenant) {
    return { ok: false, code: 'tenant_mismatch', message: 'Bulk result tenant mismatch.' };
  }
  if (result.ownerKey !== ownerKey) {
    return { ok: false, code: 'owner_mismatch', message: 'Bulk result owner mismatch.' };
  }

  let offset = 0;
  if (input.cursor) {
    let cursorState: StoredCursor | null;
    try {
      cursorState = await consumeCursor(input.cursor);
    } catch {
      return resultStoreUnavailable();
    }
    if (
      !cursorState ||
      cursorState.resultId !== input.resultId ||
      cursorState.tenantId !== currentTenant ||
      cursorState.ownerKey !== ownerKey
    ) {
      return { ok: false, code: 'invalid_cursor', message: 'Bulk result cursor is invalid.' };
    }
    offset = cursorState.offset;
  }

  const limit = Math.min(Math.max(input.limit ?? 20, 1), BULK_LIMITS.maxReadLimit);
  const items = result.items.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  let nextCursor: string | undefined;
  try {
    nextCursor =
      nextOffset < result.items.length ? await makeCursor(result, nextOffset) : undefined;
  } catch {
    return resultStoreUnavailable();
  }
  return {
    ok: true,
    value: {
      resultId: result.resultId,
      expiresAt: new Date(result.expiresAt).toISOString(),
      nextCursor,
      items,
      summary: result.summary,
    },
  };
}

export function resetBulkResultStoreForTesting(): void {
  store.clear();
  cursors.clear();
}

import { z } from 'zod';

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export const BULK_ACTION_TOOL = 'bulk-action';
export const READ_BULK_RESULT_TOOL = 'read-bulk-result';
export const BULK_PLAN_VERSION = 'bulk-action-v1';

export const BULK_LIMITS = Object.freeze({
  maxItems: intFromEnv('MS365_MCP_BULK_MAX_ITEMS', 50, 1, 500),
  highVolumeItems: intFromEnv('MS365_MCP_BULK_HIGH_VOLUME_ITEMS', 20, 2, 500),
  maxTotalPlanBytes: intFromEnv('MS365_MCP_BULK_MAX_PLAN_BYTES', 256 * 1024, 1024, 2 * 1024 * 1024),
  maxItemParameterBytes: intFromEnv(
    'MS365_MCP_BULK_MAX_ITEM_PARAM_BYTES',
    64 * 1024,
    256,
    512 * 1024
  ),
  maxInlineResultBytes: intFromEnv('MS365_MCP_BULK_MAX_INLINE_BYTES', 24 * 1024, 1024, 256 * 1024),
  maxFullItemBytes: intFromEnv('MS365_MCP_BULK_MAX_FULL_ITEM_BYTES', 8 * 1024, 512, 128 * 1024),
  maxStoredResultBytes: intFromEnv(
    'MS365_MCP_BULK_MAX_STORED_BYTES',
    512 * 1024,
    4096,
    10 * 1024 * 1024
  ),
  maxStoredItems: intFromEnv('MS365_MCP_BULK_MAX_STORED_ITEMS', 500, 1, 5000),
  maxBatchOptimizationCandidates: intFromEnv(
    'MS365_MCP_BULK_MAX_BATCH_OPTIMIZATION_CANDIDATES',
    20,
    1,
    20
  ),
  resultTtlMs: intFromEnv(
    'MS365_MCP_BULK_RESULT_TTL_MS',
    30 * 60 * 1000,
    60_000,
    24 * 60 * 60 * 1000
  ),
  planTtlMs: intFromEnv('MS365_MCP_BULK_PLAN_TTL_MS', 10 * 60 * 1000, 30_000, 60 * 60 * 1000),
  maxReadLimit: intFromEnv('MS365_MCP_BULK_READ_MAX_LIMIT', 50, 1, 500),
});

export const BulkOutputModeZod = z.enum(['summary', 'errors', 'ids', 'full']);
export type BulkOutputMode = z.infer<typeof BulkOutputModeZod>;

export const BulkModeZod = z.enum(['preview', 'execute']);
export type BulkMode = z.infer<typeof BulkModeZod>;

const BulkItemIdZod = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_.:-]+$/);

export const RESERVED_ITEM_KEYS = new Set([
  'confirmation',
  'confirmationId',
  '_meta',
  '_signal',
  '_sendNotification',
]);

export const FORBIDDEN_RAW_REQUEST_KEYS = new Set([
  'url',
  'method',
  'headers',
  'requests',
  'dependsOn',
  '$batch',
]);

export const BulkConfirmationZod = z
  .object({
    planDigest: z.string().min(32).max(128),
    confirmed: z.literal(true),
    expiresAt: z.string().datetime(),
    signature: z.string().min(32).max(256),
  })
  .strict();
export type BulkConfirmation = z.infer<typeof BulkConfirmationZod>;

export const BulkActionItemZod = z
  .object({
    id: BulkItemIdZod.optional(),
    toolName: z.string().min(1).max(256),
    parameters: z.record(z.unknown()).optional().default({}),
  })
  .passthrough();
export type BulkActionItemInput = z.infer<typeof BulkActionItemZod>;

export const BulkActionInputZod = z
  .object({
    mode: BulkModeZod.default('preview'),
    items: z.array(BulkActionItemZod).min(1).max(BULK_LIMITS.maxItems),
    outputMode: BulkOutputModeZod.default('summary'),
    confirmation: BulkConfirmationZod.optional(),
  })
  .strict();
export type BulkActionInput = z.infer<typeof BulkActionInputZod>;

export const ReadBulkResultInputZod = z
  .object({
    resultId: z.string().min(16).max(128),
    cursor: z.string().min(8).max(512).optional(),
    limit: z.number().int().min(1).max(BULK_LIMITS.maxReadLimit).optional(),
  })
  .strict();
export type ReadBulkResultInput = z.infer<typeof ReadBulkResultInputZod>;

export type BulkItemStatus =
  | 'allowed'
  | 'blocked'
  | 'invalid'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type BulkErrorCode =
  | 'invalid_bulk_item'
  | 'duplicate_item_id'
  | 'forbidden_raw_request_shape'
  | 'unknown_tool_alias'
  | 'tool_not_enabled_for_tenant'
  | 'synthetic_tool_not_enabled'
  | 'discovery_write_not_enabled'
  | 'read_only_violation'
  | 'confirmation_required'
  | 'confirmation_mismatch'
  | 'plan_expired'
  | 'parameter_validation_failed'
  | 'output_budget_exceeded'
  | 'graph_throttled'
  | 'graph_item_failed'
  | 'cancelled'
  | 'result_store_unavailable'
  | 'unsupported_for_batch_optimization'
  | 'tenant_context_unavailable'
  | 'result_not_found'
  | 'result_expired'
  | 'tenant_mismatch'
  | 'owner_mismatch'
  | 'invalid_cursor'
  | 'limit_out_of_range';

export interface BulkValidationSummary {
  ok: boolean;
  parameterKeys: string[];
  parameterBytes: number;
  parameterHash: string;
  normalizedParameters: Record<string, unknown>;
  errors: Array<{ code: BulkErrorCode; parameter?: string; message: string }>;
}

export interface BulkPlanItem {
  id: string;
  toolName: string;
  method?: string;
  pathPattern?: string;
  status: Extract<BulkItemStatus, 'allowed' | 'blocked' | 'invalid'>;
  code?: BulkErrorCode;
  parameterKeys: string[];
  parameterBytes: number;
  parameterHash: string;
  riskLevel?: string;
  readOnly?: boolean;
  destructive?: boolean;
  openWorld?: boolean;
  batchStrategy: 'single_alias_path' | 'graph_batch_eligible_alias_fallback';
}

export interface BulkPlan {
  version: string;
  tenantId: string;
  presetVersion: string;
  enabledToolsExplicit?: boolean;
  readOnly: boolean;
  orgMode: boolean;
  outputMode: BulkOutputMode;
  createdAt: string;
  expiresAt: string;
  highVolume: boolean;
  requiresConfirmation: boolean;
  planDigest: string;
  items: BulkPlanItem[];
  executionParameters: Map<string, Record<string, unknown>>;
}

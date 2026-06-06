import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type AuthManager from '../../auth.js';
import type GraphClient from '../../graph-client.js';
import type { CallToolResult } from '../../graph-tools.js';
import { getFlow, getRequestId, getRequestTenant, requestContext } from '../../request-context.js';
import { writeAuditStandalone } from '../audit.js';
import { getPool } from '../postgres.js';
import { checkDispatch } from '../tool-selection/dispatch-guard.js';
import { createMcpErrorEnvelope, createMcpResultEnvelope } from '../mcp-results/envelope.js';
import { emitMcpLogEvent } from '../mcp-logging/register.js';
import { confirmationIdFor } from '../safe-writes/classifier.js';
import {
  BULK_ACTION_TOOL,
  BULK_LIMITS,
  BulkActionInputZod,
  BulkConfirmationZod,
  READ_BULK_RESULT_TOOL,
  ReadBulkResultInputZod,
  type BulkActionInput,
  type BulkConfirmation,
  type BulkOutputMode,
} from './schema.js';
import { buildBulkPlan, bulkPlanPublicSummary, currentContextSnapshot } from './plan.js';
import {
  bulkOwnerKey,
  bulkResultStoreAvailable,
  getBulkResultRuntimeTransportMode,
  readBulkResult,
  storeBulkResult,
  type BulkStoredItem,
} from './result-store.js';
import {
  byteLength,
  resultIdPrefix,
  safeIdsPayload,
  sanitizeErrorCode,
  sanitizeValue,
  stableStringify,
} from './sanitize.js';

export interface ExecuteToolAliasLikeArgs {
  toolName: string;
  parameters?: Record<string, unknown>;
  graphClient: GraphClient;
  authManager?: AuthManager;
  readOnly?: boolean;
  orgMode?: boolean;
}

export interface RegisterBulkActionToolsOptions {
  graphClient: GraphClient;
  authManager?: AuthManager;
  readOnly: boolean;
  orgMode: boolean;
  executeToolAlias: (args: ExecuteToolAliasLikeArgs) => Promise<CallToolResult>;
  createToolAliasExecutor?: () => (args: ExecuteToolAliasLikeArgs) => Promise<CallToolResult>;
  enabledToolsPattern?: RegExp;
  enabledToolsSet?: ReadonlySet<string>;
}

const BULK_CONFIRMATION_HMAC_SECRET = randomBytes(32);
const BULK_CONFIRMATION_SECRET_ENV = 'MS365_MCP_BULK_CONFIRMATION_SECRET';

function configuredBulkConfirmationSecret(): Buffer | undefined {
  const configured = process.env[BULK_CONFIRMATION_SECRET_ENV]?.trim();
  if (!configured) return undefined;
  const secret = Buffer.from(configured, 'utf8');
  if (secret.length < 32) {
    throw new Error(`${BULK_CONFIRMATION_SECRET_ENV} must be at least 32 bytes.`);
  }
  return secret;
}

function assertBulkConfirmationSigningConfigured(): void {
  if (configuredBulkConfirmationSecret()) return;
  if (getBulkResultRuntimeTransportMode() === 'http') {
    throw new Error(
      `${BULK_CONFIRMATION_SECRET_ENV} must be configured for HTTP bulk-action confirmations.`
    );
  }
}

function bulkConfirmationHmacSecret(): Buffer {
  return configuredBulkConfirmationSecret() ?? BULK_CONFIRMATION_HMAC_SECRET;
}

function bulkConfirmationSignaturePayload(input: {
  planDigest: string;
  expiresAt: string;
  tenantId: string | undefined;
  ownerKey: string;
}): string {
  return stableStringify({
    version: 'bulk-confirmation-v1',
    planDigest: input.planDigest,
    expiresAt: input.expiresAt,
    tenantId: input.tenantId,
    ownerKey: input.ownerKey,
  });
}

function signBulkConfirmation(input: {
  planDigest: string;
  expiresAt: string;
  tenantId: string | undefined;
  ownerKey: string;
}): string {
  return createHmac('sha256', bulkConfirmationHmacSecret())
    .update(bulkConfirmationSignaturePayload(input))
    .digest('base64url');
}

function bulkConfirmationSignatureValid(input: {
  confirmation: BulkConfirmation;
  tenantId: string | undefined;
  ownerKey: string;
}): boolean {
  const expected = Buffer.from(
    signBulkConfirmation({
      planDigest: input.confirmation.planDigest,
      expiresAt: input.confirmation.expiresAt,
      tenantId: input.tenantId,
      ownerKey: input.ownerKey,
    }),
    'utf8'
  );
  const actual = Buffer.from(input.confirmation.signature, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function attachSignedConfirmation(planSummary: Record<string, unknown>): Record<string, unknown> {
  const confirmation = planSummary.confirmation;
  if (typeof confirmation !== 'object' || confirmation === null) return planSummary;
  const record = confirmation as Record<string, unknown>;
  if (typeof record.planDigest !== 'string' || typeof record.expiresAt !== 'string')
    return planSummary;
  return {
    ...planSummary,
    confirmation: {
      ...record,
      signature: signBulkConfirmation({
        planDigest: record.planDigest,
        expiresAt: record.expiresAt,
        tenantId: getRequestTenant().id,
        ownerKey: bulkOwnerKey(),
      }),
    },
  };
}

function syntheticAllowed(alias: string): CallToolResult | null {
  const tenantInfo = getRequestTenant();
  const rejection = checkDispatch(
    alias,
    tenantInfo.enabledToolsSet,
    tenantInfo.id,
    tenantInfo.presetVersion
  );
  return rejection as CallToolResult | null;
}

function parseResultJson(result: CallToolResult): unknown {
  const text = result.content.find(
    (item): item is { type: 'text'; text: string } =>
      item.type === 'text' && typeof item.text === 'string'
  )?.text;
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { rawTextResponse: true, byteCount: Buffer.byteLength(text, 'utf8') };
  }
}

function codeFromResult(result: CallToolResult): string | undefined {
  const metaCode = result._meta?.errorCode;
  if (typeof metaCode === 'string') return sanitizeErrorCode(metaCode);
  const parsed = parseResultJson(result);
  if (typeof parsed === 'object' && parsed !== null) {
    const code =
      (parsed as Record<string, unknown>).code ?? (parsed as Record<string, unknown>).error;
    return sanitizeErrorCode(code);
  }
  return undefined;
}

function retryAfterFromResult(result: CallToolResult): number | undefined {
  const value = result._meta?.retryAfterSeconds;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const graph = result._meta?.graph;
  if (typeof graph !== 'object' || graph === null) return undefined;
  const graphRetryAfter = (graph as Record<string, unknown>).retryAfterSeconds;
  return typeof graphRetryAfter === 'number' && Number.isFinite(graphRetryAfter)
    ? graphRetryAfter
    : undefined;
}

function shapeItemData(mode: BulkOutputMode, result: CallToolResult): unknown {
  const parsed = parseResultJson(result);
  if (mode === 'ids') return safeIdsPayload(parsed);
  if (mode !== 'full') return undefined;

  const sanitized = sanitizeValue(parsed);
  const bytes = byteLength(sanitized);
  if (bytes <= BULK_LIMITS.maxFullItemBytes) return sanitized;

  return {
    truncated: true,
    bytes,
    maxBytes: BULK_LIMITS.maxFullItemBytes,
    ids: safeIdsPayload(parsed),
  };
}

function renderBulkOutput(input: {
  planSummary: Record<string, unknown>;
  executionItems?: BulkStoredItem[];
  outputMode: BulkOutputMode;
  status: string;
  resultId?: string;
  resultExpiresAt?: string;
}): Record<string, unknown> {
  const failures = (input.executionItems ?? []).filter((item) => item.status !== 'succeeded');
  const base = {
    ...input.planSummary,
    status: input.status,
    ...(input.resultId ? { resultId: input.resultId, resultExpiresAt: input.resultExpiresAt } : {}),
  };
  if (!input.executionItems) return base;
  if (input.outputMode === 'summary') {
    return {
      ...base,
      failures: failures.map((item) => ({
        id: item.id,
        toolName: item.toolName,
        status: item.status,
        code: item.code,
        retryAfterSeconds: item.retryAfterSeconds,
      })),
    };
  }
  if (input.outputMode === 'errors') {
    return { ...base, errors: failures };
  }
  if (input.outputMode === 'ids') {
    return {
      ...base,
      items: input.executionItems.map((item) => ({
        id: item.id,
        toolName: item.toolName,
        status: item.status,
        code: item.code,
        retryAfterSeconds: item.retryAfterSeconds,
        data: item.data,
      })),
    };
  }
  return { ...base, items: input.executionItems };
}

async function emitBulkEvent(
  event: Parameters<typeof emitMcpLogEvent>[0]['event'],
  data: Record<string, unknown>
): Promise<void> {
  await emitMcpLogEvent({
    tenantId: getRequestTenant().id,
    event,
    level: 'info',
    data: sanitizeValue(data) as Record<string, unknown>,
  });
}

function compactBulkOutput(input: {
  planSummary: Record<string, unknown>;
  status: string;
  results: BulkStoredItem[];
  resultId?: string;
  resultExpiresAt?: string;
  resultStore?: string;
}): Record<string, unknown> {
  const failures = input.results.filter((item) => item.status !== 'succeeded');
  return {
    ...input.planSummary,
    status: input.status,
    ...(input.resultId ? { resultId: input.resultId, resultExpiresAt: input.resultExpiresAt } : {}),
    ...(input.resultStore ? { resultStore: input.resultStore } : {}),
    successCount: input.results.length - failures.length,
    failureCount: failures.length,
    failures: failures.map((item) => ({
      id: item.id,
      toolName: item.toolName,
      status: item.status,
      code: item.code,
      retryAfterSeconds: item.retryAfterSeconds,
    })),
    nextAction: input.resultId
      ? 'Call read-bulk-result with resultId to page through sanitized details.'
      : 'Review the compact summary; detailed result paging is unavailable for this execution.',
  };
}

function auditBulk(
  action: string,
  result: 'success' | 'failure',
  meta: Record<string, unknown>
): void {
  const tenantId = getRequestTenant().id;
  if (!tenantId) return;
  try {
    void writeAuditStandalone(getPool(), {
      tenantId,
      actor: bulkOwnerKey(),
      action,
      target: null,
      ip: null,
      requestId: getRequestId() ?? 'bulk-action',
      result,
      meta: sanitizeValue({ ...meta, flow: getFlow() }) as Record<string, unknown>,
    });
  } catch {
    // Stdio/local sessions may not have Postgres configured; MCP logging still records the event.
  }
}

async function handleBulkAction(
  rawInput: BulkActionInput,
  options: RegisterBulkActionToolsOptions,
  signal?: AbortSignal
): Promise<CallToolResult> {
  const parsed = BulkActionInputZod.safeParse(rawInput);
  if (!parsed.success) {
    return createMcpErrorEnvelope({
      toolName: BULK_ACTION_TOOL,
      summary: 'Bulk action input is invalid.',
      code: 'invalid_bulk_item',
      message: parsed.error.message,
    });
  }

  const dispatchRejection = syntheticAllowed(BULK_ACTION_TOOL);
  if (dispatchRejection) return dispatchRejection;

  const input = parsed.data;
  const confirmationSignatureValid = input.confirmation
    ? bulkConfirmationSignatureValid({
        confirmation: input.confirmation,
        tenantId: getRequestTenant().id,
        ownerKey: bulkOwnerKey(),
      })
    : false;
  const plan = buildBulkPlan(input, {
    readOnly: options.readOnly,
    orgMode: options.orgMode,
    confirmationExpiresAt: confirmationSignatureValid ? input.confirmation?.expiresAt : undefined,
  });
  if ('error' in plan) {
    return createMcpErrorEnvelope({
      toolName: BULK_ACTION_TOOL,
      summary: 'Bulk action could not be planned.',
      code: plan.error,
      message: plan.message,
      data: currentContextSnapshot(),
    });
  }

  const planSummary = attachSignedConfirmation(bulkPlanPublicSummary(plan));
  auditBulk(
    input.mode === 'preview' ? 'bulk-action.preview' : 'bulk-action.execute.plan',
    'success',
    {
      digestPrefix: plan.planDigest.slice(0, 12),
      itemCount: plan.items.length,
      outputMode: plan.outputMode,
      requiresConfirmation: plan.requiresConfirmation,
    }
  );
  await emitBulkEvent(
    input.mode === 'preview' ? 'bulk-action.preview' : 'bulk-action.execute.plan',
    {
      digestPrefix: plan.planDigest.slice(0, 12),
      itemCount: plan.items.length,
      requiresConfirmation: plan.requiresConfirmation,
      outputMode: plan.outputMode,
    }
  );

  if (input.mode === 'preview') {
    return createMcpResultEnvelope({
      toolName: BULK_ACTION_TOOL,
      summary: `Bulk action preview created for ${plan.items.length} item${plan.items.length === 1 ? '' : 's'}.`,
      data: renderBulkOutput({ planSummary, outputMode: input.outputMode, status: 'preview' }),
      nextActions: plan.requiresConfirmation
        ? ['Call bulk-action with mode=execute and the returned confirmation object.']
        : ['Call bulk-action with mode=execute to run the allowed items.'],
      warnings: plan.items.some((item) => item.status !== 'allowed')
        ? ['some_items_blocked_or_invalid']
        : [],
      meta: { digestPrefix: plan.planDigest.slice(0, 12), ownerRef: bulkOwnerKey() },
    });
  }

  const invalidOrBlocked = plan.items.find((item) => item.status !== 'allowed');
  if (invalidOrBlocked) {
    auditBulk('bulk-action.execute.blocked', 'failure', {
      digestPrefix: plan.planDigest.slice(0, 12),
      itemCount: plan.items.length,
      code: invalidOrBlocked.code ?? 'invalid_bulk_item',
    });
    return createMcpErrorEnvelope({
      toolName: BULK_ACTION_TOOL,
      summary: 'Bulk action execution blocked by invalid or disallowed items.',
      code: invalidOrBlocked.code ?? 'invalid_bulk_item',
      message: 'Re-run preview and remove or fix invalid/blocked items before executing.',
      data: planSummary,
      warnings: ['no_items_executed'],
    });
  }

  if (input.outputMode === 'full' && !(await readBulkResultAvailable(options))) {
    auditBulk('bulk-action.execute.blocked', 'failure', {
      digestPrefix: plan.planDigest.slice(0, 12),
      itemCount: plan.items.length,
      code: 'result_store_unavailable',
      outputMode: input.outputMode,
    });
    return createMcpErrorEnvelope({
      toolName: BULK_ACTION_TOOL,
      summary: 'Bulk action full output is unavailable for this tenant.',
      code: 'result_store_unavailable',
      message:
        'Enable durable bulk result storage and read-bulk-result with bulk-action, or choose outputMode summary, errors, or ids.',
      data: planSummary,
      warnings: ['no_items_executed'],
    });
  }

  if (plan.requiresConfirmation) {
    if (!input.confirmation) {
      auditBulk('bulk-action.confirmation_required', 'failure', {
        digestPrefix: plan.planDigest.slice(0, 12),
        itemCount: plan.items.length,
        code: 'confirmation_required',
      });
      await emitBulkEvent('bulk-action.confirmation_required', {
        digestPrefix: plan.planDigest.slice(0, 12),
        itemCount: plan.items.length,
      });
      return createMcpErrorEnvelope({
        toolName: BULK_ACTION_TOOL,
        summary: 'Bulk action execution requires plan-bound confirmation.',
        code: 'confirmation_required',
        message: 'Execute requires confirmation confirmed=true with the exact preview planDigest.',
        data: {
          confirmation: planSummary.confirmation,
          itemCount: plan.items.length,
        },
      });
    }
    if (Date.parse(plan.expiresAt) <= Date.now()) {
      auditBulk('bulk-action.confirmation_expired', 'failure', {
        digestPrefix: plan.planDigest.slice(0, 12),
        itemCount: plan.items.length,
        code: 'plan_expired',
      });
      return createMcpErrorEnvelope({
        toolName: BULK_ACTION_TOOL,
        summary: 'Bulk action plan expired.',
        code: 'plan_expired',
        message: 'Re-run preview to create a fresh plan.',
      });
    }
    if (
      !confirmationSignatureValid ||
      input.confirmation.planDigest !== plan.planDigest ||
      input.confirmation.confirmed !== true ||
      input.confirmation.expiresAt !== plan.expiresAt
    ) {
      auditBulk('bulk-action.confirmation_mismatch', 'failure', {
        digestPrefix: plan.planDigest.slice(0, 12),
        itemCount: plan.items.length,
        code: 'confirmation_mismatch',
      });
      await emitBulkEvent('bulk-action.confirmation_mismatch', {
        digestPrefix: plan.planDigest.slice(0, 12),
        itemCount: plan.items.length,
      });
      return createMcpErrorEnvelope({
        toolName: BULK_ACTION_TOOL,
        summary: 'Bulk action confirmation does not match this plan.',
        code: 'confirmation_mismatch',
        message: 'The confirmation digest must exactly match the current immutable plan.',
        warnings: ['no_items_executed'],
      });
    }
  }

  await emitBulkEvent('bulk-action.execute.start', {
    digestPrefix: plan.planDigest.slice(0, 12),
    itemCount: plan.items.length,
    outputMode: plan.outputMode,
  });
  const executeAlias = options.createToolAliasExecutor?.() ?? options.executeToolAlias;
  const results: BulkStoredItem[] = [];
  for (let index = 0; index < plan.items.length; index++) {
    const item = plan.items[index];
    const cancelRemaining = (code: string): void => {
      for (const pending of plan.items.slice(index + 1)) {
        results.push({ id: pending.id, toolName: pending.toolName, status: 'cancelled', code });
      }
    };
    if (signal?.aborted) {
      results.push({
        id: item.id,
        toolName: item.toolName,
        status: 'cancelled',
        code: 'cancelled',
      });
      cancelRemaining('cancelled');
      break;
    }
    const plannedParams = plan.executionParameters.get(item.id) ?? {};
    const params = {
      ...plannedParams,
      ...(item.riskLevel === 'high'
        ? { confirmation: true, confirmationId: confirmationIdFor(item.toolName, 'high') }
        : {}),
      ...(signal ? { _signal: signal } : {}),
    };
    const ctx = requestContext.getStore() ?? {};
    let result: CallToolResult;
    try {
      result = await requestContext.run({ ...ctx, toolAlias: item.toolName }, async () =>
        executeAlias({
          toolName: item.toolName,
          parameters: params,
          graphClient: options.graphClient,
          authManager: options.authManager,
          readOnly: options.readOnly,
          orgMode: options.orgMode,
        })
      );
    } catch (error) {
      result = {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Bulk item execution failed.' }) }],
        _meta: {
          errorCode: (error as Error).name === 'AbortError' ? 'cancelled' : 'graph_item_failed',
        },
        isError: true,
      };
    }
    if (
      signal?.aborted ||
      result._meta?.cancelled === true ||
      result._meta?.errorCode === 'cancelled'
    ) {
      results.push({
        id: item.id,
        toolName: item.toolName,
        status: 'cancelled',
        code: 'cancelled',
      });
      cancelRemaining('cancelled');
      break;
    }
    const code = codeFromResult(result);
    const retryAfterSeconds = retryAfterFromResult(result);
    const throttled =
      retryAfterSeconds !== undefined || code === 'TooManyRequests' || code === '429';
    const shapedData = result.isError ? undefined : shapeItemData(input.outputMode, result);
    results.push({
      id: item.id,
      toolName: item.toolName,
      status: result.isError ? 'failed' : 'succeeded',
      ...(result.isError
        ? { code: throttled ? 'graph_throttled' : (code ?? 'graph_item_failed') }
        : {}),
      retryAfterSeconds,
      ...(shapedData !== undefined ? { data: shapedData } : {}),
    });
    if (throttled) {
      cancelRemaining('graph_throttled');
      break;
    }
  }

  const successCount = results.filter((item) => item.status === 'succeeded').length;
  const status =
    successCount === results.length
      ? 'completed'
      : successCount === 0
        ? 'failed'
        : 'completed_with_errors';
  const preliminary = renderBulkOutput({
    planSummary,
    executionItems: results,
    outputMode: input.outputMode,
    status,
  });
  let resultId: string | undefined;
  let resultExpiresAt: string | undefined;
  let resultStore: string | undefined;
  let outputBudgetWarning = false;
  if (input.outputMode === 'full' || byteLength(preliminary) > BULK_LIMITS.maxInlineResultBytes) {
    if (!(await readBulkResultAvailable(options))) {
      outputBudgetWarning = true;
    } else {
      const stored = await storeBulkResult({
        digest: plan.planDigest,
        items: results,
        summary: planSummary,
      });
      if ('error' in stored) {
        outputBudgetWarning = true;
      } else {
        resultId = stored.resultId;
        resultExpiresAt = stored.expiresAt;
        resultStore = stored.resultStore;
        await emitBulkEvent('bulk-action.result_stored', {
          digestPrefix: plan.planDigest.slice(0, 12),
          itemCount: results.length,
          resultIdPrefix: resultIdPrefix(resultId),
        });
      }
    }
  }

  const output =
    resultId && resultExpiresAt
      ? compactBulkOutput({ planSummary, status, results, resultId, resultExpiresAt, resultStore })
      : outputBudgetWarning
        ? compactBulkOutput({ planSummary, status, results })
        : renderBulkOutput({
            planSummary,
            executionItems: results,
            outputMode: input.outputMode,
            status,
          });
  auditBulk('bulk-action.execute.complete', status === 'completed' ? 'success' : 'failure', {
    digestPrefix: plan.planDigest.slice(0, 12),
    itemCount: results.length,
    successCount,
    failureCount: results.length - successCount,
    stored: Boolean(resultId),
    outputMode: plan.outputMode,
  });
  await emitBulkEvent('bulk-action.execute.complete', {
    digestPrefix: plan.planDigest.slice(0, 12),
    itemCount: results.length,
    successCount,
    failureCount: results.length - successCount,
    stored: Boolean(resultId),
  });
  return createMcpResultEnvelope({
    toolName: BULK_ACTION_TOOL,
    summary: `Bulk action ${status} for ${results.length} item${results.length === 1 ? '' : 's'}.`,
    data: output,
    nextActions: resultId
      ? ['Call read-bulk-result with resultId to page through sanitized details.']
      : ['Review statuses and retry failed items only if safe.'],
    warnings: [
      ...(status === 'completed' ? [] : ['some_items_failed']),
      ...(outputBudgetWarning ? ['result_details_compacted_after_execution'] : []),
    ],
    meta: { digestPrefix: plan.planDigest.slice(0, 12), resultId, ownerRef: bulkOwnerKey() },
  });
}

async function handleReadBulkResult(rawInput: unknown): Promise<CallToolResult> {
  const parsed = ReadBulkResultInputZod.safeParse(rawInput);
  if (!parsed.success) {
    return createMcpErrorEnvelope({
      toolName: READ_BULK_RESULT_TOOL,
      summary: 'Bulk result read input is invalid.',
      code: 'invalid_cursor',
      message: parsed.error.message,
    });
  }
  const dispatchRejection = syntheticAllowed(READ_BULK_RESULT_TOOL);
  if (dispatchRejection) return dispatchRejection;
  const outcome = await readBulkResult(parsed.data);
  if (!outcome.ok) {
    auditBulk('bulk-action.result_read_denied', 'failure', { code: outcome.code });
    await emitBulkEvent('bulk-action.result_read_denied', { code: outcome.code });
    return createMcpErrorEnvelope({
      toolName: READ_BULK_RESULT_TOOL,
      summary: 'Bulk result read denied.',
      code: outcome.code,
      message: outcome.message,
    });
  }
  auditBulk('bulk-action.result_read', 'success', {
    resultIdPrefix: resultIdPrefix(parsed.data.resultId),
    itemCount: outcome.value.items.length,
  });
  await emitBulkEvent('bulk-action.result_read', {
    resultIdPrefix: resultIdPrefix(parsed.data.resultId),
    itemCount: outcome.value.items.length,
  });
  return createMcpResultEnvelope({
    toolName: READ_BULK_RESULT_TOOL,
    summary: `Read ${outcome.value.items.length} bulk result item${outcome.value.items.length === 1 ? '' : 's'}.`,
    data: outcome.value,
    nextActions: outcome.value.nextCursor
      ? ['Call read-bulk-result again with nextCursor for more items.']
      : ['No further bulk result pages remain.'],
    meta: { resultId: outcome.value.resultId, ownerRef: bulkOwnerKey() },
  });
}

function patternAllows(pattern: RegExp | undefined, alias: string): boolean {
  if (!pattern) return true;
  pattern.lastIndex = 0;
  return pattern.test(alias);
}

function setAllows(enabledToolsSet: ReadonlySet<string> | undefined, alias: string): boolean {
  return enabledToolsSet === undefined || enabledToolsSet.size === 0 || enabledToolsSet.has(alias);
}

async function readBulkResultAvailable(options: RegisterBulkActionToolsOptions): Promise<boolean> {
  return (
    (await bulkResultStoreAvailable()) &&
    patternAllows(options.enabledToolsPattern, READ_BULK_RESULT_TOOL) &&
    setAllows(options.enabledToolsSet, READ_BULK_RESULT_TOOL) &&
    syntheticAllowed(READ_BULK_RESULT_TOOL) === null
  );
}

export function registerBulkActionTools(
  server: McpServer,
  options: RegisterBulkActionToolsOptions
): number {
  assertBulkConfirmationSigningConfigured();
  let registered = 0;
  if (
    patternAllows(options.enabledToolsPattern, BULK_ACTION_TOOL) &&
    setAllows(options.enabledToolsSet, BULK_ACTION_TOOL)
  ) {
    server.tool(
      BULK_ACTION_TOOL,
      'Preview or execute a catalog-driven bulk action. Items name generated Graph/product tool aliases and parameters; raw URLs, methods, headers, and $batch request shapes are rejected. Preview returns a plan digest; writes, high-risk, open-world, or high-volume plans require executing with the exact confirmation object.',
      {
        mode: z.enum(['preview', 'execute']).default('preview'),
        items: z
          .array(
            z
              .object({
                id: z.string().optional(),
                toolName: z.string(),
                parameters: z.record(z.unknown()).optional(),
              })
              .passthrough()
          )
          .min(1)
          .max(BULK_LIMITS.maxItems),
        outputMode: z.enum(['summary', 'errors', 'ids', 'full']).default('summary'),
        confirmation: BulkConfirmationZod.optional(),
      },
      { title: BULK_ACTION_TOOL, readOnlyHint: false, destructiveHint: true, openWorldHint: true },
      async (params, extra) =>
        handleBulkAction(
          params as BulkActionInput,
          options,
          (extra as { signal?: AbortSignal } | undefined)?.signal
        )
    );
    registered++;
  }
  if (
    patternAllows(options.enabledToolsPattern, READ_BULK_RESULT_TOOL) &&
    setAllows(options.enabledToolsSet, READ_BULK_RESULT_TOOL)
  ) {
    server.tool(
      READ_BULK_RESULT_TOOL,
      'Read paginated sanitized details for a bulk-action resultId. Access is tenant and owner scoped; expired, mismatched, or invalid cursors fail closed.',
      {
        resultId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(BULK_LIMITS.maxReadLimit).optional(),
      },
      { title: READ_BULK_RESULT_TOOL, readOnlyHint: true, openWorldHint: false },
      async (params) => handleReadBulkResult(params)
    );
    registered++;
  }
  return registered;
}

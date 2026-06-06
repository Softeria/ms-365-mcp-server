import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from '../../generated/client.js';
import type { Endpoint } from '../../generated/endpoint-types.js';
import { z } from 'zod';
import { getRequestTenant, requestContext } from '../../request-context.js';
import { resolveDiscoveryCatalog } from '../discovery-catalog/catalog.js';
import { classifyToolRisk } from '../safe-writes/classifier.js';
import { isProductPrefix } from '../auth/products.js';
import { _getStdioFallbackForTest } from '../tool-selection/dispatch-guard.js';
import {
  BULK_LIMITS,
  BULK_PLAN_VERSION,
  FORBIDDEN_RAW_REQUEST_KEYS,
  RESERVED_ITEM_KEYS,
  type BulkActionInput,
  type BulkErrorCode,
  type BulkPlan,
  type BulkPlanItem,
  type BulkValidationSummary,
} from './schema.js';
import { byteLength, sha256Hex } from './sanitize.js';

interface EndpointConfig {
  pathPattern: string;
  method: string;
  toolName: string;
  scopes?: string[];
  workScopes?: string[];
  skipEncoding?: string[];
  supportsTimezone?: boolean;
  supportsExpandExtendedProperties?: boolean;
  readOnly?: boolean;
  returnDownloadUrl?: boolean;
  contentType?: string;
  acceptType?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, '../../endpoints.json'), 'utf8')
) as EndpointConfig[];
const endpointsMap = new Map(endpointsData.map((entry) => [entry.toolName, entry]));
const endpointMap = new Map(api.endpoints.map((endpoint) => [endpoint.alias, endpoint]));

const CONTROL_PARAMETERS = new Set([
  'account',
  'fetchAllPages',
  'includeHeaders',
  'excludeResponse',
  'timezone',
  'expandExtendedProperties',
]);
const ODATA_PARAMETERS = new Set([
  'filter',
  'select',
  'expand',
  'orderby',
  'skip',
  'top',
  'count',
  'search',
  'format',
]);

export interface BulkPlanningOptions {
  readOnly: boolean;
  orgMode: boolean;
  now?: Date;
  confirmationExpiresAt?: string;
}

function tenantTriple():
  | {
      id: string;
      enabledToolsSet: ReadonlySet<string>;
      enabledToolsExplicit?: boolean;
      presetVersion: string;
    }
  | undefined {
  const tenant = getRequestTenant();
  if (tenant.id && tenant.enabledToolsSet && tenant.presetVersion) {
    return {
      id: tenant.id,
      enabledToolsSet: tenant.enabledToolsSet,
      enabledToolsExplicit: tenant.enabledToolsExplicit,
      presetVersion: tenant.presetVersion,
    };
  }
  const fallback = _getStdioFallbackForTest();
  if (!fallback) return undefined;
  return {
    id: fallback.tenantId,
    enabledToolsSet: fallback.enabledToolsSet,
    enabledToolsExplicit: fallback.enabledToolsExplicit,
    presetVersion: fallback.presetVersion,
  };
}

function canonicalParamName(name: string): string {
  const withoutDollar = name.startsWith('$') ? name.slice(1) : name;
  return ODATA_PARAMETERS.has(withoutDollar.toLowerCase()) ? withoutDollar.toLowerCase() : name;
}

function camelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function isOptionalSchema(schema: z.ZodTypeAny | undefined): boolean {
  if (!schema) return true;
  return schema.safeParse(undefined).success;
}

function zodIssueMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
    .join('; ');
}

function parseBodyParameter(
  schema: z.ZodTypeAny,
  paramName: string,
  value: unknown
): { ok: true; value: unknown } | { ok: false; message: string } {
  const direct = schema.safeParse(value);
  if (direct.success) return { ok: true, value: direct.data };
  const wrapped = schema.safeParse({ [paramName]: value });
  if (wrapped.success) return { ok: true, value: wrapped.data };
  return { ok: false, message: zodIssueMessage(direct.error) };
}

function parseRuntimeParameter(
  paramName: string,
  value: unknown,
  schema: z.ZodTypeAny | undefined
): { ok: true; value: unknown } | { ok: false; message: string } {
  const canonical = canonicalParamName(paramName);
  if (['filter', 'search', 'select', 'expand', 'orderby', 'format'].includes(canonical)) {
    if (typeof value === 'string') return { ok: true, value };
  }
  if (canonical === 'top' || canonical === 'skip') {
    if (typeof value === 'number' && Number.isFinite(value)) return { ok: true, value };
  }
  if (canonical === 'count') {
    if (typeof value === 'boolean') return { ok: true, value };
  }
  if (!schema) return { ok: true, value };
  const parsed = schema.safeParse(value);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, message: zodIssueMessage(parsed.error) };
}

function normalizeParameters(
  endpoint: Endpoint,
  config: EndpointConfig | undefined,
  raw: Record<string, unknown>
): BulkValidationSummary {
  const errors: BulkValidationSummary['errors'] = [];
  const normalized: Record<string, unknown> = {};
  const paramDefs = endpoint.parameters ?? [];
  const definitionNames = new Set(paramDefs.map((param) => param.name));
  const pathParams = [...endpoint.path.matchAll(/:([a-zA-Z][a-zA-Z0-9-]*)/g)].map(
    (match) => match[1]
  );
  for (const pathParam of pathParams) definitionNames.add(pathParam);

  for (const [key, value] of Object.entries(raw)) {
    if (RESERVED_ITEM_KEYS.has(key)) continue;
    const canonical = canonicalParamName(key);
    const camel = camelCase(key);
    const paramDef = paramDefs.find(
      (param) => param.name === key || param.name === canonical || param.name === camel
    );

    if (paramDef) {
      if (paramDef.type === 'Body' && paramDef.schema) {
        const parsed = parseBodyParameter(paramDef.schema, key, value);
        if (parsed.ok) normalized[paramDef.name] = parsed.value;
        else
          errors.push({
            code: 'parameter_validation_failed',
            parameter: key,
            message: parsed.message,
          });
      } else {
        const parsed = parseRuntimeParameter(key, value, paramDef.schema);
        if (parsed.ok) normalized[paramDef.name] = parsed.value;
        else
          errors.push({
            code: 'parameter_validation_failed',
            parameter: key,
            message: parsed.message,
          });
      }
      continue;
    }

    if (key === 'body') {
      const bodyParam = paramDefs.find((param) => param.type === 'Body');
      if (bodyParam?.schema) {
        const parsed = parseBodyParameter(bodyParam.schema, key, value);
        if (parsed.ok) normalized[bodyParam.name] = parsed.value;
        else
          errors.push({
            code: 'parameter_validation_failed',
            parameter: key,
            message: parsed.message,
          });
      } else {
        normalized.body = value;
      }
      continue;
    }

    if (CONTROL_PARAMETERS.has(key)) {
      if (key === 'timezone' && !config?.supportsTimezone) {
        errors.push({
          code: 'parameter_validation_failed',
          parameter: key,
          message: 'timezone is not supported for this tool',
        });
      } else if (key === 'expandExtendedProperties' && !config?.supportsExpandExtendedProperties) {
        errors.push({
          code: 'parameter_validation_failed',
          parameter: key,
          message: 'expandExtendedProperties is not supported for this tool',
        });
      } else {
        normalized[key] = value;
      }
      continue;
    }

    if (pathParams.includes(key) || pathParams.includes(camel)) {
      normalized[pathParams.includes(key) ? key : camel] = value;
      continue;
    }

    errors.push({
      code: 'parameter_validation_failed',
      parameter: key,
      message: 'unknown parameter',
    });
  }

  for (const param of paramDefs) {
    if (param.type === 'Path' && normalized[param.name] === undefined) {
      errors.push({
        code: 'parameter_validation_failed',
        parameter: param.name,
        message: 'required path parameter missing',
      });
    }
    if (
      param.type !== 'Path' &&
      !isOptionalSchema(param.schema) &&
      normalized[param.name] === undefined
    ) {
      errors.push({
        code: 'parameter_validation_failed',
        parameter: param.name,
        message: 'required parameter missing',
      });
    }
  }
  for (const pathParam of pathParams) {
    if (normalized[pathParam] === undefined) {
      errors.push({
        code: 'parameter_validation_failed',
        parameter: pathParam,
        message: 'required path parameter missing',
      });
    }
  }

  const parameterBytes = byteLength(normalized);
  if (parameterBytes > BULK_LIMITS.maxItemParameterBytes) {
    errors.push({ code: 'invalid_bulk_item', message: 'parameter payload exceeds per-item limit' });
  }

  return {
    ok: errors.length === 0,
    parameterKeys: Object.keys(normalized).sort(),
    parameterBytes,
    parameterHash: sha256Hex(normalized),
    normalizedParameters: normalized,
    errors,
  };
}

function forbiddenRawShape(item: Record<string, unknown>): BulkErrorCode | undefined {
  for (const key of Object.keys(item)) {
    if (FORBIDDEN_RAW_REQUEST_KEYS.has(key)) return 'forbidden_raw_request_shape';
  }
  const params =
    typeof item.parameters === 'object' && item.parameters !== null
      ? (item.parameters as Record<string, unknown>)
      : {};
  for (const key of Object.keys(params)) {
    if (FORBIDDEN_RAW_REQUEST_KEYS.has(key)) return 'forbidden_raw_request_shape';
  }
  return undefined;
}

function endpointAllowedByMode(
  endpoint: Endpoint,
  config: EndpointConfig | undefined,
  orgMode: boolean
): boolean {
  return orgMode || !config || Boolean(config.scopes) || !config.workScopes;
}

function pathTemplateHasUnsafeBatchSegment(pathPattern: string): boolean {
  const normalized = pathPattern.toLowerCase();
  return (
    normalized.includes('/$batch') ||
    normalized.includes('/content') ||
    normalized.includes('/delta') ||
    normalized.includes('createuploadsession') ||
    normalized.includes('uploadsession')
  );
}

function isJsonLikeContentType(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return normalized.includes('json') || normalized.includes('text/plain');
}

function batchStrategyFor(input: {
  endpoint: Endpoint;
  config: EndpointConfig | undefined;
  normalizedParameters: Record<string, unknown>;
}): BulkPlanItem['batchStrategy'] {
  if (isProductPrefix(input.endpoint.alias)) return 'single_alias_path';
  if (input.endpoint.alias.startsWith('__beta__')) return 'single_alias_path';
  if (input.config?.returnDownloadUrl) return 'single_alias_path';
  if (!isJsonLikeContentType(input.config?.contentType)) return 'single_alias_path';
  if (!isJsonLikeContentType(input.config?.acceptType)) return 'single_alias_path';
  if (pathTemplateHasUnsafeBatchSegment(input.endpoint.path)) return 'single_alias_path';
  if (input.normalizedParameters.fetchAllPages === true) return 'single_alias_path';
  return 'graph_batch_eligible_alias_fallback';
}

function digestInput(plan: Omit<BulkPlan, 'planDigest' | 'executionParameters'>): unknown {
  return {
    version: plan.version,
    tenantId: plan.tenantId,
    presetVersion: plan.presetVersion,
    enabledToolsExplicit: Boolean(plan.enabledToolsExplicit),
    readOnly: plan.readOnly,
    orgMode: plan.orgMode,
    outputMode: plan.outputMode,
    highVolume: plan.highVolume,
    requiresConfirmation: plan.requiresConfirmation,
    expiresAt: plan.expiresAt,
    items: plan.items.map((item) => ({
      id: item.id,
      toolName: item.toolName,
      method: item.method,
      pathPattern: item.pathPattern,
      status: item.status,
      code: item.code,
      parameterKeys: item.parameterKeys,
      parameterBytes: item.parameterBytes,
      parameterHash: item.parameterHash,
      riskLevel: item.riskLevel,
      readOnly: item.readOnly,
      destructive: item.destructive,
      openWorld: item.openWorld,
      batchStrategy: item.batchStrategy,
    })),
  };
}

export function buildBulkPlan(
  input: BulkActionInput,
  options: BulkPlanningOptions
): BulkPlan | { error: BulkErrorCode; message: string } {
  const tenant = tenantTriple();
  if (!tenant)
    return { error: 'tenant_context_unavailable', message: 'Tenant context is unavailable.' };

  const totalBytes = byteLength({ items: input.items, outputMode: input.outputMode });
  if (totalBytes > BULK_LIMITS.maxTotalPlanBytes) {
    return { error: 'invalid_bulk_item', message: 'Bulk plan exceeds total byte limit.' };
  }

  const catalog = resolveDiscoveryCatalog({
    presetVersion: tenant.presetVersion,
    enabledToolsSet: tenant.enabledToolsSet,
    enabledToolsExplicit: tenant.enabledToolsExplicit,
    registryAliases: api.endpoints.map((endpoint) => endpoint.alias),
  });

  const now = options.now ?? new Date();
  const maxExpiresAt = new Date(now.getTime() + BULK_LIMITS.planTtlMs);
  const issuedConfirmationExpiresAt =
    input.mode === 'execute' && options.confirmationExpiresAt
      ? new Date(options.confirmationExpiresAt)
      : undefined;
  if (
    issuedConfirmationExpiresAt &&
    issuedConfirmationExpiresAt.getTime() > maxExpiresAt.getTime()
  ) {
    return { error: 'confirmation_mismatch', message: 'Bulk confirmation expiry was not issued.' };
  }
  const expiresAt = issuedConfirmationExpiresAt ?? maxExpiresAt;
  if (!Number.isFinite(expiresAt.getTime())) {
    return { error: 'invalid_bulk_item', message: 'Bulk confirmation expiresAt is invalid.' };
  }
  const seenIds = new Set<string>();
  const executionParameters = new Map<string, Record<string, unknown>>();

  const items: BulkPlanItem[] = input.items.map((rawItem, index) => {
    const id = rawItem.id ?? `item-${String(index + 1).padStart(3, '0')}`;
    const rawRecord = rawItem as Record<string, unknown>;
    if (seenIds.has(id)) {
      return {
        id,
        toolName: rawItem.toolName,
        status: 'invalid',
        code: 'duplicate_item_id',
        parameterKeys: [],
        parameterBytes: 0,
        parameterHash: sha256Hex({}),
        batchStrategy: 'single_alias_path',
      };
    }
    seenIds.add(id);

    const forbidden = forbiddenRawShape(rawRecord);
    if (forbidden) {
      return {
        id,
        toolName: rawItem.toolName,
        status: 'invalid',
        code: forbidden,
        parameterKeys: [],
        parameterBytes: 0,
        parameterHash: sha256Hex({}),
        batchStrategy: 'single_alias_path',
      };
    }

    const endpoint = endpointMap.get(rawItem.toolName);
    if (!endpoint) {
      return {
        id,
        toolName: rawItem.toolName,
        status: 'invalid',
        code: 'unknown_tool_alias',
        parameterKeys: [],
        parameterBytes: 0,
        parameterHash: sha256Hex(rawItem.parameters ?? {}),
        batchStrategy: 'single_alias_path',
      };
    }

    const config = endpointsMap.get(endpoint.alias);
    const risk = classifyToolRisk({
      alias: endpoint.alias,
      method: endpoint.method,
      path: endpoint.path,
      readOnly: config?.readOnly,
    });
    const validation = normalizeParameters(endpoint, config, rawItem.parameters ?? {});
    const batchStrategy = validation.ok
      ? batchStrategyFor({
          endpoint,
          config,
          normalizedParameters: validation.normalizedParameters,
        })
      : 'single_alias_path';
    const base = {
      id,
      toolName: endpoint.alias,
      method: endpoint.method.toUpperCase(),
      pathPattern: endpoint.path,
      parameterKeys: validation.parameterKeys,
      parameterBytes: validation.parameterBytes,
      parameterHash: validation.parameterHash,
      riskLevel: risk.riskLevel,
      readOnly: risk.readOnly,
      destructive: risk.destructive,
      openWorld: risk.openWorld || isProductPrefix(endpoint.alias),
      batchStrategy,
    };

    if (!validation.ok)
      return {
        ...base,
        status: 'invalid' as const,
        code: validation.errors[0]?.code ?? 'parameter_validation_failed',
      };
    if (!endpointAllowedByMode(endpoint, config, options.orgMode))
      return { ...base, status: 'blocked' as const, code: 'tool_not_enabled_for_tenant' };
    if (!catalog.discoveryCatalogSet.has(endpoint.alias))
      return { ...base, status: 'blocked' as const, code: 'tool_not_enabled_for_tenant' };
    if (catalog.isDiscoverySurface && !tenant.enabledToolsExplicit && !risk.readOnly)
      return { ...base, status: 'blocked' as const, code: 'discovery_write_not_enabled' };
    if (options.readOnly && !risk.readOnly)
      return { ...base, status: 'blocked' as const, code: 'read_only_violation' };

    executionParameters.set(id, validation.normalizedParameters);
    return { ...base, status: 'allowed' as const };
  });

  const requiresConfirmation =
    input.items.length >= BULK_LIMITS.highVolumeItems ||
    items.some(
      (item) =>
        item.status === 'allowed' &&
        (!item.readOnly ||
          item.riskLevel === 'medium' ||
          item.riskLevel === 'high' ||
          item.destructive ||
          item.openWorld)
    );
  const withoutDigest: Omit<BulkPlan, 'planDigest' | 'executionParameters'> = {
    version: BULK_PLAN_VERSION,
    tenantId: tenant.id,
    presetVersion: tenant.presetVersion,
    enabledToolsExplicit: tenant.enabledToolsExplicit,
    readOnly: options.readOnly,
    orgMode: options.orgMode,
    outputMode: input.outputMode,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    highVolume: input.items.length >= BULK_LIMITS.highVolumeItems,
    requiresConfirmation,
    items,
  };
  const planDigest = sha256Hex(digestInput(withoutDigest));
  return { ...withoutDigest, planDigest, executionParameters };
}

export function bulkPlanPublicSummary(plan: BulkPlan): Record<string, unknown> {
  const counts = plan.items.reduce<Record<string, number>>((acc, item) => {
    const key = item.code ?? item.status;
    return { ...acc, [key]: (acc[key] ?? 0) + 1 };
  }, {});
  return {
    operation: 'bulk-action',
    planDigest: plan.planDigest,
    expiresAt: plan.expiresAt,
    requiresConfirmation: plan.requiresConfirmation,
    highVolume: plan.highVolume,
    outputMode: plan.outputMode,
    itemCount: plan.items.length,
    counts,
    items: plan.items.map((item) => ({
      id: item.id,
      toolName: item.toolName,
      status: item.status,
      code: item.code,
      parameterKeys: item.parameterKeys,
      parameterBytes: item.parameterBytes,
      parameterHash: item.parameterHash,
      riskLevel: item.riskLevel,
      readOnly: item.readOnly,
      batchStrategy: item.batchStrategy,
    })),
    confirmation: plan.requiresConfirmation
      ? { planDigest: plan.planDigest, confirmed: true, expiresAt: plan.expiresAt }
      : undefined,
  };
}

export function currentContextSnapshot(): Record<string, unknown> {
  const ctx = requestContext.getStore();
  return {
    tenantId: ctx?.tenantId,
    presetVersion: ctx?.presetVersion,
    enabledToolsExplicit: ctx?.enabledToolsExplicit,
    flow: ctx?.flow,
    ownerPresent: typeof ctx?.ownerSubject === 'string' && ctx.ownerSubject.length > 0,
  };
}

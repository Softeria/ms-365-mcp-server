import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import AuthManager from './auth.js';
import { api } from './generated/client.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { safeMcpName } from './lib/tool-selection/safe-mcp-name.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOOL_CATEGORIES } from './tool-categories.js';
import { getRequestTokens, getRequestTenant, requestContext } from './request-context.js';
import { checkDispatch, _getStdioFallbackForTest } from './lib/tool-selection/dispatch-guard.js';
import { parseTeamsUrl } from './lib/teams-url-parser.js';
import { type BM25Index, tokenize, scoreQuery } from './lib/bm25.js';
import { isProductPrefix } from './lib/auth/products.js';
import { executeProductTool } from './lib/dispatch/product-routing.js';
import {
  createTenantBm25Cache,
  type ToolRegistry,
  type ToolRegistryEntry,
  type TenantBm25Cache,
} from './lib/tool-selection/per-tenant-bm25.js';
import { clampTopQueryParam } from './lib/graph-tools-pure.js';
import { resolveDiscoveryCatalog } from './lib/discovery-catalog/catalog.js';
import { safeBookmarkBoost } from './lib/memory/bookmark-boost.js';
import { getBookmarkCountsByAlias } from './lib/memory/bookmarks.js';
import { getRequestOwnerSubject } from './request-context.js';
import { emitMcpLogEvent } from './lib/mcp-logging/register.js';
import { createMcpErrorEnvelope, createMcpResultEnvelope } from './lib/mcp-results/envelope.js';
import {
  MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA,
  McpResultEnvelopeZod,
} from './lib/mcp-results/schemas.js';
import {
  graphResourceLinksForToolResult,
  shouldUseResourceLinkedText,
} from './lib/mcp-resources/graph-backed.js';
import {
  classifyToolRisk,
  confirmationIdFor,
  isConfirmationValid,
  type ToolRiskClassification,
} from './lib/safe-writes/classifier.js';
import { registerOperation, unregisterOperation } from './lib/mcp-progress/cancellation.js';
import type { ProgressNotificationSender } from './lib/mcp-progress/progress.js';
// Re-export pure helpers so existing callers (tests, downstream modules)
// keep working. New callers should import directly from
// `./lib/graph-tools-pure.js` to avoid transitively pulling the 45 MB
// generated `./generated/client.js` catalog that this module imports.
export {
  buildDiscoverySearchIndex,
  scoreDiscoveryQuery,
  type DiscoverySearchIndex,
} from './lib/graph-tools-pure.js';
import { describeToolSchema } from './lib/tool-schema-describer.js';

/**
 * Plan 05-06 (COVRG-05, D-20, T-05-12) — module-level per-tenant BM25 cache.
 *
 * Scoped to the process. Populated by `registerDiscoveryTools` (called
 * once per McpServer instance). Exported so:
 *   - src/server.ts bootstrap can wire the Redis pub/sub subscriber to
 *     call `discoveryCache.invalidate(tenantId)` on mcp:tool-selection-
 *     invalidate messages;
 *   - tests can observe size() / call _clear() between cases.
 *
 * Singleton lifetime matches the process. Invalidation (pub/sub or TTL)
 * is how per-tenant entries roll over. HOT reload in tests goes through
 * the same singleton — tests MUST call `discoveryCache._clear()` in
 * beforeEach if they care about cache state.
 */
export const discoveryCache: TenantBm25Cache = createTenantBm25Cache({
  max: 200,
  ttlMs: 10 * 60 * 1000,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EndpointConfig {
  pathPattern: string;
  method: string;
  toolName: string;
  scopes?: string[];
  workScopes?: string[];
  returnDownloadUrl?: boolean;
  supportsTimezone?: boolean;
  supportsExpandExtendedProperties?: boolean;
  llmTip?: string;
  skipEncoding?: string[]; // Parameter names that should NOT be URL-encoded (for function-style API calls)
  contentType?: string;
  acceptType?: string; // Custom Accept header for endpoints returning non-JSON content (e.g., text/vtt)
  readOnly?: boolean; // When true, allow this endpoint in read-only mode even if method is not GET
}

const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as EndpointConfig[];

/**
 * Pre-built Map of `toolName` -> `EndpointConfig` for O(1) lookup from
 * `registerGraphTools` and `buildToolsRegistry`. Formerly these loops called
 * Array#find on endpointsData once per `api.endpoints` entry, which is O(N)
 * per iteration / O(N^2) overall — a measurable contributor to cold-start
 * time for containers with tight Docker HEALTHCHECK start-period budgets
 * (Plan 01-09 / T-01-09b performance mitigation).
 */
const endpointsMap: Map<string, EndpointConfig> = new Map(
  endpointsData.map((e) => [e.toolName, e])
);

// `maxTopFromEnv` + `clampTopQueryParam` live in `./lib/graph-tools-pure.ts`
// so other modules can consume them without transitively loading the 45 MB
// generated client catalog. `clampTopQueryParam` is imported above and used
// directly below; `maxTopFromEnv` is only consumed internally by
// `clampTopQueryParam` and is not re-exported here.

type TextContent = {
  type: 'text';
  text: string;
  [key: string]: unknown;
};

type ImageContent = {
  type: 'image';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type AudioContent = {
  type: 'audio';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type ResourceTextContent = {
  type: 'resource';
  resource: {
    text: string;
    uri: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResourceBlobContent = {
  type: 'resource';
  resource: {
    blob: string;
    uri: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResourceContent = ResourceTextContent | ResourceBlobContent;

type ContentItem = TextContent | ImageContent | AudioContent | ResourceContent;

type TextToolResult = {
  content: TextContent[];
  _meta?: Record<string, unknown>;
  isError?: boolean;

  [key: string]: unknown;
};

export interface CallToolResult {
  content: ContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;

  [key: string]: unknown;
}

async function executeGraphTool(
  tool: (typeof api.endpoints)[0],
  config: EndpointConfig | undefined,
  graphClient: GraphClient,
  params: Record<string, unknown>,
  authManager?: AuthManager
): Promise<CallToolResult> {
  logger.info({ toolAlias: tool.alias, paramKeys: Object.keys(params) }, 'graph tool called');

  // Plan 06-02 (OPS-05, D-06): augment ALS frame with toolAlias for GraphClient
  // span attribute + workload-prefix label. Spread preserves upstream fields
  // (tenantId, enabledToolsSet, presetVersion from seedTenantContext; tokens
  // from authSelector/bearer). Stdio mode: upstream frame may be undefined; the
  // `?? {}` fallback yields an empty object and the spread still composes a
  // valid frame. GraphClient.makeRequest reads ctx.toolAlias inside the span
  // wrap to populate the `tool.alias` attribute and the workload-prefix metric
  // label (via labelForTool).
  const existingCtx = requestContext.getStore() ?? {};
  return requestContext.run({ ...existingCtx, toolAlias: tool.alias }, async () => {
    const tenantId = getRequestTenant().id;
    const startedAt = Date.now();
    await emitMcpLogEvent({
      tenantId,
      event: 'tool-call.start',
      level: 'info',
      data: {
        alias: tool.alias,
        method: tool.method.toUpperCase(),
        paramKeys: Object.keys(params),
      },
    });

    try {
      const result = await executeGraphToolInner(tool, config, graphClient, params, authManager);
      const durationMs = Date.now() - startedAt;
      if (result.isError) {
        await emitMcpLogEvent({
          tenantId,
          event: 'tool-call.error',
          level: 'error',
          data: {
            alias: tool.alias,
            durationMs,
            code: errorCodeFromResult(result),
          },
        });
      } else {
        await emitMcpLogEvent({
          tenantId,
          event: 'tool-call.success',
          level: 'info',
          data: {
            alias: tool.alias,
            durationMs,
            bytes: resultPayloadBytes(result),
          },
        });
      }
      return result;
    } catch (error) {
      await emitMcpLogEvent({
        tenantId,
        event: 'tool-call.error',
        level: 'error',
        data: {
          alias: tool.alias,
          durationMs: Date.now() - startedAt,
          code: codeFromError(error),
        },
      });
      throw error;
    }
  });
}

function resultPayloadBytes(result: CallToolResult): number {
  return Buffer.byteLength(JSON.stringify(result.content ?? []), 'utf8');
}

function graphResultData(result: CallToolResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  const firstText = result.content.find((item): item is TextContent => item.type === 'text')?.text;
  if (!firstText) return { content: result.content };
  try {
    return JSON.parse(firstText) as unknown;
  } catch {
    return { text: firstText };
  }
}

function withJsonText(result: CallToolResult, value: unknown): CallToolResult {
  return {
    ...result,
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
}

function errorCodeFromResult(result: CallToolResult): string {
  const code = result._meta?.errorCode;
  return typeof code === 'string' && code.length > 0 ? code : 'tool_error';
}

function codeFromError(error: unknown): string {
  const candidate =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (typeof candidate === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(candidate)) {
    return candidate;
  }
  return error instanceof Error && error.name ? error.name : 'tool_error';
}

function summarizeBodyValue(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) {
    return { present: false };
  }
  if (typeof body === 'string') {
    return { present: true, type: 'string', bytes: Buffer.byteLength(body, 'utf8') };
  }
  if (Buffer.isBuffer(body)) {
    return { present: true, type: 'buffer', bytes: body.byteLength };
  }
  if (typeof body === 'object') {
    return { present: true, type: 'object', keys: Object.keys(body as Record<string, unknown>) };
  }
  return { present: true, type: typeof body };
}

function summarizeSerializedBody(
  body: string | undefined,
  headers: Record<string, string>
): Record<string, unknown> | undefined {
  if (body === undefined) return undefined;
  return {
    present: true,
    bytes: Buffer.byteLength(body, 'utf8'),
    contentType: headers['Content-Type'] ?? headers['content-type'],
  };
}

const TRANSCRIPT_VTT_ACCEPT = 'text/vtt';

function normalizedToolAlias(alias: string): string {
  return alias.replace(/^__beta__/, '').toLowerCase();
}

function isTranscriptContentAlias(alias: string): boolean {
  const normalized = normalizedToolAlias(alias);
  return (
    normalized.endsWith('.gettranscriptscontent') ||
    normalized.endsWith('.gettranscriptsmetadatacontent') ||
    normalized === 'get-meeting-transcript-content'
  );
}

function pathWithoutQuery(path: string): string {
  return path.split('?')[0] ?? path;
}

function isTranscriptContentTool(
  tool: Pick<(typeof api.endpoints)[0], 'alias' | 'method' | 'path'>
) {
  if (tool.method.toUpperCase() !== 'GET') return false;
  if (isTranscriptContentAlias(tool.alias)) return true;

  const requestPath = pathWithoutQuery(tool.path).toLowerCase();
  return /\/transcripts\/:[^/]+\/(metadata)?content$/.test(requestPath);
}

function extractRawResponseText(result: TextToolResult): string | undefined {
  const text = result.content.find((item) => item.type === 'text')?.text;
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as { rawResponse?: unknown };
    return typeof parsed.rawResponse === 'string' ? parsed.rawResponse : undefined;
  } catch {
    return undefined;
  }
}

function preserveRawTranscriptText(result: TextToolResult): TextToolResult {
  if (result.isError) return result;
  const raw = extractRawResponseText(result);
  if (raw === undefined) return result;
  return {
    ...result,
    content: [{ type: 'text', text: raw }],
    _meta: {
      ...result._meta,
      contentType: TRANSCRIPT_VTT_ACCEPT,
      rawTextResponse: true,
    },
  };
}

function transcriptTextFromResult(result: CallToolResult): string | undefined {
  return result.content.find((item): item is TextContent => item.type === 'text')?.text;
}

function createTranscriptStructuredResult(
  toolName: string,
  result: CallToolResult
): CallToolResult {
  const content = transcriptTextFromResult(result);
  const contentType =
    typeof result._meta?.contentType === 'string'
      ? result._meta.contentType
      : TRANSCRIPT_VTT_ACCEPT;
  const parsed = McpResultEnvelopeZod.safeParse({
    content: [
      {
        type: 'text',
        text: `Fetched transcript content (${Buffer.byteLength(content ?? '', 'utf8')} bytes).`,
      },
    ],
    structuredContent: {
      summary: 'Fetched transcript content.',
      data: {
        contentType,
        content: content ?? '',
      },
      resources: [],
      nextActions: ['Read structuredContent.data.content for the complete WEBVTT transcript.'],
      warnings: [],
    },
    _meta: {
      toolAlias: toolName,
      contentType,
      rawTextResponse: true,
    },
  });

  if (parsed.success) return parsed.data as CallToolResult;
  return createMcpErrorEnvelope({
    toolName: 'execute-tool',
    summary: 'Transcript content output validation failed.',
    code: 'transcript_output_validation_failed',
    message: parsed.error.message,
    meta: { toolAlias: toolName },
  });
}
function parameterValidationError(
  toolAlias: string,
  parameter: string,
  error: z.ZodError
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: 'parameter_validation_failed',
          tool: toolAlias,
          parameter,
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        }),
      },
    ],
    isError: true,
    _meta: { errorCode: 'parameter_validation_failed' },
  };
}

function parseBodyParameter(
  schema: z.ZodTypeAny,
  paramName: string,
  paramValue: unknown
): { ok: true; value: unknown; wrapped: boolean } | { ok: false; error: z.ZodError } {
  const direct = schema.safeParse(paramValue);
  if (direct.success) return { ok: true, value: direct.data, wrapped: false };

  const wrapped = schema.safeParse({ [paramName]: paramValue });
  if (wrapped.success) return { ok: true, value: wrapped.data, wrapped: true };

  return { ok: false, error: direct.error };
}

function validateBodyParameters(
  tool: (typeof api.endpoints)[0],
  params: Record<string, unknown>
): CallToolResult | null {
  const bodyParam = (tool.parameters ?? []).find((param) => param.type === 'Body');
  if (!bodyParam?.schema) return null;

  for (const [paramName, paramValue] of Object.entries(params)) {
    if (paramName !== 'body' && paramName !== bodyParam.name) continue;
    const parsed = parseBodyParameter(bodyParam.schema, paramName, paramValue);
    if (!parsed.ok) return parameterValidationError(tool.alias, paramName, parsed.error);
  }
  return null;
}

function checkSyntheticGraphToolDispatch(toolAlias: string): CallToolResult | null {
  const tenantInfo = getRequestTenant();
  const rejection = checkDispatch(
    toolAlias,
    tenantInfo.enabledToolsSet,
    tenantInfo.id,
    tenantInfo.presetVersion
  );
  if (!rejection) return null;
  logger.info(
    { tool: toolAlias, tenantId: tenantInfo.id, preset: tenantInfo.presetVersion },
    'dispatch-guard: synthetic tool not enabled for tenant'
  );
  return rejection as CallToolResult;
}

function riskForTool(
  tool: (typeof api.endpoints)[0],
  config: EndpointConfig | undefined
): ToolRiskClassification {
  return classifyToolRisk({
    alias: tool.alias,
    method: tool.method,
    path: tool.path,
    readOnly: config?.readOnly,
  });
}

function annotationsForRisk(
  toolAlias: string,
  risk: ToolRiskClassification
): Record<string, unknown> {
  return {
    title: toolAlias,
    readOnlyHint: risk.readOnly,
    destructiveHint: risk.destructive || risk.riskLevel === 'high',
    idempotentHint: risk.idempotent,
    openWorldHint: risk.openWorld,
    riskLevel: risk.riskLevel,
  };
}

function isReadSafeDiscoveryTool(
  tool: (typeof api.endpoints)[0],
  config: EndpointConfig | undefined
): boolean {
  return riskForTool(tool, config).readOnly;
}

function confirmationRequiredResult(
  toolAlias: string,
  risk: ToolRiskClassification,
  params: Record<string, unknown>
): CallToolResult {
  const confirmationId = confirmationIdFor(toolAlias, risk.riskLevel);
  const nextParameters = {
    ...params,
    confirmation: true,
    confirmationId,
  };
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: 'confirmation_required',
          toolName: toolAlias,
          riskLevel: risk.riskLevel,
          confirmationId,
          message: `Confirmation required before ${toolAlias}. Call ${toolAlias} again with confirmation=true and confirmationId=${confirmationId}.`,
          nextCall: {
            toolName: toolAlias,
            parameters: nextParameters,
          },
        }),
      },
    ],
    structuredContent: {
      summary: `Confirmation required before ${toolAlias}.`,
      data: {
        error: 'confirmation_required',
        toolName: toolAlias,
        riskLevel: risk.riskLevel,
        confirmationId,
        nextCall: {
          toolName: toolAlias,
          parameters: nextParameters,
        },
      },
      resources: [],
      nextActions: [`Retry with confirmation=true and confirmationId=${confirmationId}.`],
      warnings: ['high_risk_write_confirmation_required'],
    },
    _meta: { errorCode: 'confirmation_required', toolAlias, riskLevel: risk.riskLevel },
    isError: true,
  };
}

async function executeGraphToolInner(
  tool: (typeof api.endpoints)[0],
  config: EndpointConfig | undefined,
  graphClient: GraphClient,
  params: Record<string, unknown>,
  authManager?: AuthManager
): Promise<CallToolResult> {
  // ── DISPATCH GATE (plan 05-04, TENANT-08, D-20) ────────────────────────
  // Read enabled_tools_set + tenantId + preset_version from AsyncLocalStorage.
  //   HTTP mode: populated by src/server.ts at /t/:tenantId/mcp entry
  //              (loadTenant middleware → requestContext.run wrapper).
  //   Stdio mode: populated by src/index.ts bootstrap when --tenant-id is set.
  // Rejection returns an MCP tool error envelope (D-20), NOT HTTP 403.
  // checkDispatch never throws — rejection shape matches CallToolResult.
  const tenantInfo = getRequestTenant();
  const rejection = checkDispatch(
    tool.alias,
    tenantInfo.enabledToolsSet,
    tenantInfo.id,
    tenantInfo.presetVersion
  );
  if (rejection) {
    logger.info(
      { tool: tool.alias, tenantId: tenantInfo.id, preset: tenantInfo.presetVersion },
      'dispatch-guard: tool not enabled for tenant'
    );
    return rejection as CallToolResult;
  }

  const risk = riskForTool(tool, config);
  if (
    risk.riskLevel === 'high' &&
    !isConfirmationValid(tool.alias, risk.riskLevel, params.confirmation, params.confirmationId)
  ) {
    logger.info({ tool: tool.alias, tenantId: tenantInfo.id }, 'safe-write: confirmation required');
    return confirmationRequiredResult(tool.alias, risk, params);
  }

  const bodyValidationError = validateBodyParameters(tool, params);
  if (bodyValidationError) return bodyValidationError;

  // ── PRODUCT PREFIX ROUTING (plan 5.1-06 Task 2) ───────────────────────
  // When the tool alias carries a known product prefix (__powerbi__ /
  // __pwrapps__ / __pwrauto__ / __exo__ / __spadmin__), delegate to
  // executeProductTool — it strips the prefix, resolves the per-product
  // scope + baseUrl from PRODUCT_AUDIENCES (src/lib/auth/products.ts),
  // acquires a product-specific access token via
  // AuthManager.getTokenForProduct (composite cache key ${tenantId}:${product}
  // per D-05), and delegates the HTTP call to the same GraphClient
  // machinery with the product baseUrl override.
  //
  // Runs BEFORE the existing Graph path so the Graph v1.0 code is
  // unchanged for unprefixed aliases. Fail-closed when AuthManager is
  // unavailable (stdio mode bootstrap hiccup) — returns a structured MCP
  // tool error envelope rather than throwing through the MCP transport.
  //
  // T-5.1-06-a: product scope pins audience.
  // T-5.1-06-b: composite cache key prevents cross-tenant leak.
  // T-5.1-06-c: sharepoint_domain re-validated inside the audience
  //             resolvers before URL / scope construction (defense-in-depth
  //             against compromised admin controls or SQL injection).
  // T-5.1-06-e: structured MCP error on missing sharepoint_domain.
  if (isProductPrefix(tool.alias)) {
    if (!authManager) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'auth_manager_unavailable_for_product_dispatch' }),
          },
        ],
        isError: true,
      };
    }
    const ctx = requestContext.getStore();
    const productResult = await executeProductTool(
      tool.alias,
      params,
      authManager,
      graphClient,
      {
        tenantId: ctx?.tenantId ?? 'unknown',
        tenantAzureId: ctx?.tenantAzureId,
        sharepointDomain: ctx?.sharepointDomain,
      },
      {
        path: tool.path,
        method: tool.method.toUpperCase(),
      }
    );
    return productResult as CallToolResult;
  }

  // ── BETA LOG (plan 05-04, D-18) ────────────────────────────────────────
  // Structured pino info log for every `__beta__*` dispatch that passed the
  // gate. Operators can filter on `beta:true` to spot beta usage per-tenant
  // without combing through every tool call. No raw enabled_tools text is
  // logged — tenant.id + alias are safe per 05-RESEARCH.md:467.
  if (tool.alias.startsWith('__beta__')) {
    logger.info(
      { beta: true, toolAlias: tool.alias, tenantId: tenantInfo.id },
      'beta tool invoked'
    );
  }

  try {
    // Resolve account-specific token if `account` parameter is provided (or auto-resolve for single account).
    // Skip in OAuth/HTTP mode — let the request context drive token selection via GraphClient.
    // Also skip when a request-context token exists (HTTP/OAuth flow where token comes from middleware).
    let accountAccessToken: string | undefined;
    // Gate reads `.accessToken` specifically — getRequestTokens() now always
    // returns a truthy frame after Plan 06-02 (OPS-05) added the toolAlias
    // wrapper at the entrance to executeGraphTool. Treating frame-presence
    // as "tokens populated" skipped the MSAL path in stdio mode where only
    // toolAlias is set. Checking the field keeps the HTTP/OAuth skip
    // (middleware populates accessToken) while letting stdio mode reach
    // getTokenForAccount.
    if (authManager && !authManager.isOAuthModeEnabled() && !getRequestTokens()?.accessToken) {
      const accountParam = params.account as string | undefined;
      try {
        accountAccessToken = await authManager.getTokenForAccount(accountParam);
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (err as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    const parameterDefinitions = tool.parameters || [];

    let path = tool.path;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};
    let body: unknown = null;

    for (const [paramName, paramValue] of Object.entries(params)) {
      // Skip control parameters - not part of the Microsoft Graph API
      if (
        [
          'account',
          'fetchAllPages',
          'includeHeaders',
          'excludeResponse',
          'timezone',
          'expandExtendedProperties',
          'confirmation',
          'confirmationId',
          '_meta',
          '_sendNotification',
          '_signal',
        ].includes(paramName)
      ) {
        continue;
      }

      // Ok, so, MCP clients (such as claude code) doesn't support $ in parameter names,
      // and others might not support __, so we strip them in hack.ts and restore them here
      const odataParams = [
        'filter',
        'select',
        'expand',
        'orderby',
        'skip',
        'top',
        'count',
        'search',
        'format',
      ];
      // Handle both "top" and "$top" formats - strip $ if present, then re-add it
      const normalizedParamName = paramName.startsWith('$') ? paramName.slice(1) : paramName;
      const isOdataParam = odataParams.includes(normalizedParamName.toLowerCase());
      const fixedParamName = isOdataParam ? `$${normalizedParamName.toLowerCase()}` : paramName;
      // Convert kebab-case param names to camelCase for path param matching.
      // endpoints.json uses {message-id} but hack.ts extracts :messageId (camelCase) from the path.
      // LLMs may pass "message-id" (kebab) — we normalize so both forms work.
      const camelCaseParamName = paramName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

      // Look up param definition using normalized name (without $) for OData params,
      // or camelCase equivalent for kebab-case path params
      const paramDef = parameterDefinitions.find(
        (p) =>
          p.name === paramName ||
          p.name === camelCaseParamName ||
          (isOdataParam && p.name === normalizedParamName)
      );

      if (paramDef) {
        switch (paramDef.type) {
          case 'Path': {
            // Check if this parameter should skip URL encoding (for function-style API calls)
            const shouldSkipEncoding = config?.skipEncoding?.includes(paramName) ?? false;
            // Use encodeURIComponent but preserve '=' which is valid in path segments (RFC 3986)
            // and commonly appears in Microsoft Graph base64-encoded resource IDs.
            // Without this, IDs like "AAMk...AAA=" become "AAMk...AAA%3D" causing 404 errors.
            // First we encode, then unencode. Crazy, check out https://github.com/Softeria/ms-365-mcp-server/issues/245
            const encodedValue = shouldSkipEncoding
              ? (paramValue as string)
              : encodeURIComponent(paramValue as string).replace(/%3D/g, '=');

            // Replace both the original param name and the camelCase variant
            // to handle {message-id} (endpoints.json) and :messageId (generated client) formats
            path = path
              .replace(`{${paramName}}`, encodedValue)
              .replace(`:${paramName}`, encodedValue)
              .replace(`{${camelCaseParamName}}`, encodedValue)
              .replace(`:${camelCaseParamName}`, encodedValue);
            break;
          }

          case 'Query':
            if (paramValue !== '' && paramValue != null) {
              queryParams[fixedParamName] = `${paramValue}`;
            }
            break;

          case 'Body':
            if (paramDef.schema) {
              const parsed = parseBodyParameter(paramDef.schema, paramName, paramValue);
              if (!parsed.ok) {
                return parameterValidationError(tool.alias, paramName, parsed.error);
              }
              if (parsed.wrapped) {
                logger.info(
                  `Auto-corrected parameter '${paramName}': AI passed nested field directly, wrapped it as {${paramName}: ...}`
                );
              }
              body = parsed.value;
            } else {
              body = paramValue;
            }
            break;

          case 'Header':
            headers[fixedParamName] = `${paramValue}`;
            break;
        }
      } else if (paramName === 'body') {
        const bodyParam = parameterDefinitions.find((param) => param.type === 'Body');
        if (bodyParam?.schema) {
          const parsed = parseBodyParameter(bodyParam.schema, paramName, paramValue);
          if (!parsed.ok) {
            return parameterValidationError(tool.alias, paramName, parsed.error);
          }
          body = parsed.value;
        } else {
          body = paramValue;
        }
        logger.info({ body: summarizeBodyValue(body) }, 'Set body param');
      } else if (
        path.includes(`:${paramName}`) ||
        path.includes(`{${paramName}}`) ||
        path.includes(`:${camelCaseParamName}`) ||
        path.includes(`{${camelCaseParamName}}`)
      ) {
        // Fallback: path param not declared in tool.parameters (generated client omits them).
        // Replace placeholder directly so the URL is valid.
        const encodedValue = encodeURIComponent(paramValue as string).replace(/%3D/g, '=');
        path = path
          .replace(`{${paramName}}`, encodedValue)
          .replace(`:${paramName}`, encodedValue)
          .replace(`{${camelCaseParamName}}`, encodedValue)
          .replace(`:${camelCaseParamName}`, encodedValue);
        logger.info(`Path param fallback: replaced :${camelCaseParamName} with encoded value`);
      }
    }

    clampTopQueryParam(queryParams);

    const preferValues: string[] = [];

    // Handle timezone parameter for calendar endpoints
    if (config?.supportsTimezone && params.timezone) {
      preferValues.push(`outlook.timezone="${params.timezone}"`);
      logger.info(`Setting timezone preference: outlook.timezone="${params.timezone}"`);
    }

    const bodyFormat = process.env.MS365_MCP_BODY_FORMAT || 'text';
    if (bodyFormat !== 'html') {
      preferValues.push(`outlook.body-content-type="${bodyFormat}"`);
    }

    if (preferValues.length > 0) {
      headers['Prefer'] = preferValues.join(', ');
    }

    // Handle expandExtendedProperties parameter for calendar endpoints
    if (config?.supportsExpandExtendedProperties && params.expandExtendedProperties === true) {
      const expandValue = 'singleValueExtendedProperties';
      if (queryParams['$expand']) {
        queryParams['$expand'] += `,${expandValue}`;
      } else {
        queryParams['$expand'] = expandValue;
      }
      logger.info(`Adding $expand=${expandValue} for extended properties`);
    }

    if (config?.contentType) {
      headers['Content-Type'] = config.contentType;
      logger.info(`Setting custom Content-Type: ${config.contentType}`);
    }

    const isTranscriptContent = isTranscriptContentTool(tool);
    const acceptType =
      config?.acceptType ?? (isTranscriptContent ? TRANSCRIPT_VTT_ACCEPT : undefined);
    if (acceptType) {
      headers['Accept'] = acceptType;
      logger.info(`Setting custom Accept: ${acceptType}`);
    }

    if (Object.keys(queryParams).length > 0) {
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/gi, ',')}`)
        .join('&');
      path = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
    }

    const options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      rawResponse?: boolean;
      includeHeaders?: boolean;
      excludeResponse?: boolean;
      queryParams?: Record<string, string>;
      accessToken?: string;
      signal?: AbortSignal;
    } = {
      method: tool.method.toUpperCase(),
      headers,
    };

    const requestSignal = params._signal instanceof AbortSignal ? params._signal : undefined;
    if (requestSignal) {
      options.signal = requestSignal;
    }

    if (options.method !== 'GET' && body) {
      if (config?.contentType === 'text/html') {
        if (typeof body === 'string') {
          options.body = body;
        } else if (typeof body === 'object' && 'content' in body) {
          options.body = (body as { content: string }).content;
        } else {
          options.body = String(body);
        }
      } else {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
    }

    const requestPath = pathWithoutQuery(path);
    const isProbablyMediaContent =
      isTranscriptContent ||
      tool.errors?.some((error) => error.description === 'Retrieved media content') ||
      requestPath.endsWith('/content');

    if (config?.returnDownloadUrl && path.endsWith('/content')) {
      path = path.replace(/\/content$/, '');
      logger.info(
        `Auto-returning download URL for ${tool.alias} (returnDownloadUrl=true in endpoints.json)`
      );
    } else if (isProbablyMediaContent) {
      options.rawResponse = true;
    }

    // Set includeHeaders if requested
    if (params.includeHeaders === true) {
      options.includeHeaders = true;
    }

    // Set excludeResponse if requested
    if (params.excludeResponse === true) {
      options.excludeResponse = true;
    }

    // Pass account-resolved token if available
    if (accountAccessToken) {
      options.accessToken = accountAccessToken;
    }

    // Redact accessToken and body content from log output to prevent
    // credential, message body, file, and calendar PII leakage.
    const { accessToken: _redacted, body: _body, ...safeOptions } = options;
    const bodySummary = summarizeSerializedBody(_body, options.headers);
    const loggableOptions = bodySummary ? { ...safeOptions, body: bodySummary } : safeOptions;
    logger.info(
      `Making graph request to ${path} with options: ${JSON.stringify(loggableOptions)}${_redacted ? ' [accessToken=REDACTED]' : ''}`
    );

    let response = await graphClient.graphRequest(path, options);
    if (isTranscriptContent) {
      response = preserveRawTranscriptText(response);
    }

    // Plan 02-04 / MWARE-04: delegate pagination to src/lib/middleware/page-iterator.ts.
    // The v1 inline loop at this site silently swallowed mid-stream errors
    // (CONCERNS.md "fetchAllPages swallows pagination errors"); the new
    // buffered wrapper throws on any mid-stream failure so the outer
    // executeGraphTool catch-block surfaces them as typed `isError: true`
    // MCP responses. D-06 caps at 20 pages by default (overridable via
    // MS365_MCP_MAX_PAGES); _truncated + _nextLink surface in the envelope
    // when the cap is hit. Dynamic import keeps page-iterator out of the
    // module graph for callers that never opt-in to pagination.
    const shouldFetchAllPages = params.fetchAllPages === true;
    if (shouldFetchAllPages && response?.content?.[0]?.text) {
      const { fetchAllPages } = await import('./lib/middleware/page-iterator.js');
      // Seed the iterator with the already-fetched first page so we avoid
      // a duplicate graphRequest call (preserves v1's "1 initial + N nextLinks"
      // call-count contract that existing fetchAllPages tests rely on).
      const firstPage = JSON.parse(response.content[0].text);
      const ctx = requestContext.getStore();
      const meta =
        typeof params._meta === 'object' && params._meta !== null
          ? (params._meta as { progressToken?: unknown })
          : undefined;
      const progressToken = meta?.progressToken;
      const token =
        typeof progressToken === 'string' || typeof progressToken === 'number'
          ? progressToken
          : undefined;
      const operationKey = {
        tenantId: ctx?.tenantId ?? tenantInfo.id,
        requestId: ctx?.requestId,
        progressToken: token !== undefined ? String(token) : undefined,
      };
      const sendNotification =
        typeof params._sendNotification === 'function'
          ? (params._sendNotification as ProgressNotificationSender)
          : undefined;
      if (token !== undefined) registerOperation(operationKey);
      const combined = await fetchAllPages(path, options, graphClient, {
        seedFirstPage: firstPage,
        progressToken: token,
        sendNotification,
        capabilityProfile: ctx?.capabilityProfile,
        operationKey,
        signal: requestSignal,
      });
      unregisterOperation(operationKey);
      firstPage.value = combined.value;
      if (combined._cancelled) {
        const payload = {
          status: 'cancelled',
          operation: tool.alias,
          resourceUri: combined._partialResourceUri,
          partial: { value: combined.value },
        };
        response.content[0].text = JSON.stringify(payload);
        response._meta = {
          ...response._meta,
          cancelled: true,
          partialResourceUri: combined._partialResourceUri,
        };
      } else if (combined._truncated) {
        firstPage._truncated = true;
        if (combined._nextLink !== undefined) {
          firstPage._nextLink = combined._nextLink;
        }
      }
      if (!combined._cancelled && firstPage['@odata.count'] !== undefined) {
        firstPage['@odata.count'] = combined.value.length;
      }
      if (!combined._cancelled) {
        delete firstPage['@odata.nextLink'];
        response.content[0].text = JSON.stringify(firstPage);
      }
      logger.info(
        `Pagination via page-iterator: items=${combined.value.length} truncated=${Boolean(combined._truncated)}`
      );
    }

    if (response?.content?.[0]?.text) {
      const responseText = response.content[0].text;
      logger.info(`Response size: ${responseText.length} characters`);

      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.value && Array.isArray(jsonResponse.value)) {
          logger.info(`Response contains ${jsonResponse.value.length} items`);
        }
        if (jsonResponse['@odata.nextLink']) {
          logger.info(`Response has pagination nextLink: ${jsonResponse['@odata.nextLink']}`);
        }
      } catch {
        // Non-JSON response
      }
    }

    // Convert McpResponse to CallToolResult with the correct structure
    const content: ContentItem[] = response.content.map((item) => ({
      type: 'text' as const,
      text: item.text,
    }));

    return {
      content,
      _meta: response._meta,
      isError: response.isError,
    };
  } catch (error) {
    logger.error(`Error in tool ${tool.alias}: ${(error as Error).message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Error in tool ${tool.alias}: ${(error as Error).message}`,
          }),
        },
      ],
      _meta: { errorCode: codeFromError(error) },
      isError: true,
    };
  }
}

export function registerGraphTools(
  server: McpServer,
  graphClient: GraphClient,
  readOnly: boolean = false,
  enabledToolsPattern?: string,
  orgMode: boolean = false,
  authManager?: AuthManager,
  multiAccount: boolean = false,
  accountNames: string[] = [],
  /**
   * Per-tenant alias allowlist. When provided AND non-empty, ONLY tools
   * whose alias is in the set are registered — filtering happens BEFORE
   * Zod schemas are built so the per-request memory + CPU cost is
   * proportional to the tenant's enabled-tools size, NOT to the full
   * generated catalog (~42k entries). Resolved upstream from
   * `tenants.enabled_tools` text (DSL: `+preset:foo,workload:*,...`)
   * via `computeEnabledToolsSet` in lib/tool-selection/enabled-tools-parser.ts.
   *
   * Pass `undefined` to keep the legacy "register all" behaviour (stdio
   * mode, single-tenant HTTP, tests).
   */
  enabledToolsSet?: ReadonlySet<string>
): number {
  let enabledToolsRegex: RegExp | undefined;
  if (enabledToolsPattern) {
    try {
      enabledToolsRegex = new RegExp(enabledToolsPattern, 'i');
      logger.info(`Tool filtering enabled with pattern: ${enabledToolsPattern}`);
    } catch {
      logger.error(`Invalid tool filter regex pattern: ${enabledToolsPattern}. Ignoring filter.`);
    }
  }

  const useSetFilter = enabledToolsSet !== undefined && enabledToolsSet.size > 0;
  if (useSetFilter) {
    logger.info(
      { allowlistSize: enabledToolsSet!.size },
      'Per-tenant enabled_tools_set provided — registering only allowed aliases'
    );
  }

  let registeredCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const tool of api.endpoints) {
    // Per-tenant allowlist gate FIRST — cheapest filter, runs before any
    // Zod schema build for the tool, before endpoint metadata lookup.
    // Cuts the inner loop work from ~42k iterations to the tenant's
    // enabled-tools size when the set is supplied.
    if (useSetFilter && !enabledToolsSet!.has(tool.alias)) {
      skippedCount++;
      continue;
    }

    const endpointConfig = endpointsMap.get(tool.alias);
    if (!orgMode && endpointConfig && !endpointConfig.scopes && endpointConfig.workScopes) {
      logger.info(`Skipping work account tool ${tool.alias} - not in org mode`);
      skippedCount++;
      continue;
    }

    const method = tool.method.toUpperCase();
    if (readOnly && method !== 'GET') {
      // Allow POST endpoints that are explicitly marked as readOnly in endpoints.json
      // (e.g. get-schedule, find-meeting-times which are read-only queries via POST).
      // PATCH/DELETE are always blocked in read-only mode.
      if (!(method === 'POST' && endpointConfig?.readOnly)) {
        logger.info(`Skipping write operation ${tool.alias} in read-only mode`);
        skippedCount++;
        continue;
      }
    }

    if (enabledToolsRegex && !enabledToolsRegex.test(tool.alias)) {
      logger.info(`Skipping tool ${tool.alias} - doesn't match filter pattern`);
      skippedCount++;
      continue;
    }

    const paramSchema: Record<string, z.ZodTypeAny> = {};
    if (tool.parameters && tool.parameters.length > 0) {
      for (const param of tool.parameters) {
        paramSchema[param.name] = param.schema || z.any();
      }
    }

    // Extract path parameters from the path pattern (e.g., :todoTaskListId from /me/todo/lists/:todoTaskListId/tasks)
    // The generated client omits these from tool.parameters, so we add them manually.
    const pathParamMatches = tool.path.matchAll(/:([a-zA-Z]+)/g);
    for (const match of pathParamMatches) {
      const pathParamName = match[1];
      if (!(pathParamName in paramSchema)) {
        paramSchema[pathParamName] = z.string().describe(`Path parameter: ${pathParamName}`);
      }
    }

    if (tool.method.toUpperCase() === 'GET' && tool.path.includes('/')) {
      paramSchema['fetchAllPages'] = z
        .boolean()
        .describe(
          'Follow @odata.nextLink across up to 20 pages (configurable via MS365_MCP_MAX_PAGES). ' +
            'When the cap is reached, the response includes `_truncated: true` and `_nextLink` for continuation. ' +
            'Errors on any page propagate — no silent truncation. ' +
            'Prefer a small $top first, then paginate or narrow with $filter/$search.'
        )
        .optional();
    }

    // Override OData parameter descriptions with spec-gap guidance
    if (paramSchema['filter'] !== undefined || paramSchema['$filter'] !== undefined) {
      const key = paramSchema['$filter'] !== undefined ? '$filter' : 'filter';
      paramSchema[key] = z
        .string()
        .describe(
          'OData filter expression. Add $count=true for advanced filters (flag/flagStatus, contains()). Cannot combine with $search.'
        )
        .optional();
    }
    if (paramSchema['search'] !== undefined || paramSchema['$search'] !== undefined) {
      const key = paramSchema['$search'] !== undefined ? '$search' : 'search';
      paramSchema[key] = z
        .string()
        .describe('KQL search query — wrap value in double quotes. Cannot combine with $filter.')
        .optional();
    }
    if (paramSchema['select'] !== undefined || paramSchema['$select'] !== undefined) {
      const key = paramSchema['$select'] !== undefined ? '$select' : 'select';
      paramSchema[key] = z
        .string()
        .describe('Comma-separated fields to return, e.g. id,subject,from,receivedDateTime')
        .optional();
    }
    if (paramSchema['orderby'] !== undefined || paramSchema['$orderby'] !== undefined) {
      const key = paramSchema['$orderby'] !== undefined ? '$orderby' : 'orderby';
      paramSchema[key] = z
        .string()
        .describe('Sort expression, e.g. receivedDateTime desc')
        .optional();
    }
    if (paramSchema['top'] !== undefined || paramSchema['$top'] !== undefined) {
      const key = paramSchema['$top'] !== undefined ? '$top' : 'top';
      paramSchema[key] = z
        .number()
        .describe(
          'Page size (Graph $top). Start small (e.g. 5–15) so responses fit the model context; ' +
            'raise only if needed. Use $select to return fewer fields per item. ' +
            'For more rows, use @odata.nextLink from the response instead of a very large $top.'
        )
        .optional();
    }
    if (paramSchema['skip'] !== undefined || paramSchema['$skip'] !== undefined) {
      const key = paramSchema['$skip'] !== undefined ? '$skip' : 'skip';
      paramSchema[key] = z
        .number()
        .describe('Items to skip for pagination. Not supported with $search.')
        .optional();
    }
    if (paramSchema['count'] !== undefined || paramSchema['$count'] !== undefined) {
      const countKey = paramSchema['$count'] !== undefined ? '$count' : 'count';
      paramSchema[countKey] = z
        .boolean()
        .describe(
          'Set true to enable advanced query mode (ConsistencyLevel: eventual). Required for complex $filter on flag/flagStatus or contains().'
        )
        .optional();
    }

    // Add account parameter for multi-account mode.
    // Layer 2: Account names are surfaced in the description (not as a strict enum) so the LLM
    // sees available accounts upfront without a round-trip, but accounts added mid-session via
    // --login are still accepted — getTokenForAccount() handles validation at runtime.
    if (multiAccount) {
      const accountHint =
        accountNames.length > 0 ? `Known accounts: ${accountNames.join(', ')}. ` : '';
      paramSchema['account'] = z
        .string()
        .describe(
          `${accountHint}Microsoft account email to use for this request. ` +
            `Required when multiple accounts are configured. ` +
            `Use the list-accounts tool to discover all currently available accounts.`
        )
        .optional();
    }

    const risk = riskForTool(tool, endpointConfig);
    if (risk.riskLevel === 'high') {
      paramSchema['confirmation'] = z
        .boolean()
        .describe('Set true to confirm this high-risk Microsoft 365 write.')
        .optional();
      paramSchema['confirmationId'] = z
        .string()
        .describe(
          `Confirmation id required for this high-risk write. Use ${confirmationIdFor(tool.alias, risk.riskLevel)} after reviewing the confirmation_required response.`
        )
        .optional();
    }

    // Add includeHeaders parameter for all tools to capture ETags and other headers
    paramSchema['includeHeaders'] = z
      .boolean()
      .describe('Include response headers (including ETag) in the response metadata')
      .optional();

    // Add excludeResponse parameter to only return success/failure indication
    paramSchema['excludeResponse'] = z
      .boolean()
      .describe('Exclude the full response body and only return success or failure indication')
      .optional();

    // Add timezone parameter for calendar endpoints that support it
    if (endpointConfig?.supportsTimezone) {
      paramSchema['timezone'] = z
        .string()
        .describe(
          'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo") for calendar event times. If not specified, times are returned in UTC.'
        )
        .optional();
    }

    // Add expandExtendedProperties parameter for calendar endpoints that support it
    if (endpointConfig?.supportsExpandExtendedProperties) {
      paramSchema['expandExtendedProperties'] = z
        .boolean()
        .describe(
          'When true, expands singleValueExtendedProperties on each event. Use this to retrieve custom extended properties (e.g., sync metadata) stored on calendar events.'
        )
        .optional();
    }

    // Build the tool description, optionally appending LLM tips
    let toolDescription =
      tool.description || `Execute ${tool.method.toUpperCase()} request to ${tool.path}`;
    if (endpointConfig?.llmTip) {
      toolDescription += `\n\n💡 TIP: ${endpointConfig.llmTip}`;
    }

    try {
      server.tool(
        safeMcpName(tool.alias),
        toolDescription,
        paramSchema,
        annotationsForRisk(tool.alias, risk),
        async (params, extra) =>
          executeGraphTool(
            tool,
            endpointConfig,
            graphClient,
            {
              ...params,
              _meta: (extra as { _meta?: unknown } | undefined)?._meta,
              _sendNotification: (extra as { sendNotification?: unknown } | undefined)
                ?.sendNotification,
              _signal: (extra as { signal?: unknown } | undefined)?.signal,
            },
            authManager
          )
      );
      registeredCount++;
    } catch (error) {
      logger.error(`Failed to register tool ${tool.alias}: ${(error as Error).message}`);
      failedCount++;
    }
  }

  if (multiAccount) {
    logger.info('Multi-account mode: "account" parameter injected into all tool schemas');
  }

  // Register parse-teams-url utility tool (no Graph API call)
  if (!enabledToolsRegex || enabledToolsRegex.test('parse-teams-url')) {
    try {
      server.tool(
        'parse-teams-url',
        'Converts any Teams meeting URL format (short /meet/, full /meetup-join/, or recap ?threadId=) into a standard joinWebUrl. Use this before list-online-meetings when the user provides a recap or short URL.',
        {
          url: z.string().describe('Teams meeting URL in any format'),
        },
        {
          title: 'parse-teams-url',
          readOnlyHint: true,
          openWorldHint: false,
        },
        async ({ url }) => {
          try {
            const joinWebUrl = parseTeamsUrl(url);
            return { content: [{ type: 'text', text: joinWebUrl }] };
          } catch (error) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ error: (error as Error).message }) },
              ],
              isError: true,
            };
          }
        }
      );
      registeredCount++;
    } catch (error) {
      logger.error(`Failed to register tool parse-teams-url: ${(error as Error).message}`);
      failedCount++;
    }
  }

  // Register graph-batch tool (Plan 02-05 / MWARE — $batch coalescing).
  // Combines up to 20 Graph sub-requests into one POST /$batch. Skipped in
  // read-only mode because a batch can contain arbitrary write methods; the
  // per-sub-request isolation + typed-error surfacing lives in
  // src/lib/middleware/batch.ts.
  const shouldRegisterBatch =
    !readOnly && (!enabledToolsRegex || enabledToolsRegex.test('graph-batch'));
  if (shouldRegisterBatch) {
    try {
      const subRequestSchema = z.object({
        id: z.string().describe('Unique identifier within this batch (e.g., "1", "2").'),
        method: z
          .string()
          .describe('HTTP method: GET, POST, PATCH, DELETE, or PUT (uppercased internally).'),
        url: z
          .string()
          .describe(
            'Relative Graph path beginning with "/" (e.g., "/me", "/me/messages?$top=5"). ' +
              'Absolute URLs (http://, https://, //, file://) are REJECTED for SSRF safety.'
          ),
        headers: z
          .record(z.string())
          .optional()
          .describe('Optional HTTP headers for this sub-request.'),
        body: z.any().optional().describe('Optional JSON body for this sub-request.'),
        dependsOn: z
          .array(z.string())
          .optional()
          .describe(
            'Optional list of sub-request ids that must complete before this one runs. ' +
              'Cycles are rejected client-side.'
          ),
      });

      server.tool(
        'graph-batch',
        'Combine up to 20 Microsoft Graph sub-requests into a single POST /$batch. ' +
          'Each sub-request is returned in input order with status, body, and (on non-2xx) a structured error. ' +
          'One failing sub-request does NOT fail the batch — per-item isolation. ' +
          'Use for high-fanout reads (e.g., fetching 15 users by id) or chained writes with dependsOn. ' +
          'Each sub-request goes through the full middleware chain (retry, typed errors, token refresh). ' +
          'Sub-request URLs MUST be relative paths starting with "/" — absolute URLs are rejected for SSRF safety.',
        {
          requests: z
            .array(subRequestSchema)
            .min(1)
            .max(20)
            .describe('1–20 sub-requests. See subRequestSchema for per-item shape.'),
        },
        {
          title: 'graph-batch',
          readOnlyHint: false,
          destructiveHint: true,
          openWorldHint: true,
        },
        async ({ requests }) => {
          const dispatchRejection = checkSyntheticGraphToolDispatch('graph-batch');
          if (dispatchRejection) return dispatchRejection;

          try {
            const { batch } = await import('./lib/middleware/batch.js');
            const results = await batch(requests, graphClient);
            // Serialize typed GraphError into a JSON-safe shape so the MCP
            // response text is always valid JSON — `Error` objects otherwise
            // lose their fields across JSON.stringify.
            const serializable = results.map((r) => {
              if (!r.error) return r;
              return {
                ...r,
                error: {
                  code: r.error.code,
                  message: r.error.message,
                  statusCode: r.error.statusCode,
                  requestId: r.error.requestId,
                  clientRequestId: r.error.clientRequestId,
                  date: r.error.date,
                },
              };
            });
            return {
              content: [{ type: 'text', text: JSON.stringify({ responses: serializable }) }],
            };
          } catch (error) {
            logger.error(`graph-batch failed: ${(error as Error).message}`);
            return {
              content: [
                { type: 'text', text: JSON.stringify({ error: (error as Error).message }) },
              ],
              isError: true,
            };
          }
        }
      );
      registeredCount++;
    } catch (error) {
      logger.error(`Failed to register tool graph-batch: ${(error as Error).message}`);
      failedCount++;
    }
  } else if (readOnly) {
    logger.info('Skipping graph-batch tool in read-only mode (can contain write sub-requests)');
  }

  // Register graph-upload-large-file tool (Plan 02-06 / MWARE-05 — resumable
  // upload). Skipped in read-only mode because upload is always a write
  // operation. The helper (src/lib/upload-session.ts) owns the 320 KiB chunk
  // alignment, nextExpectedRanges resume protocol, and T-02-06d no-auth
  // chunk PUT contract. This tool only shapes the MCP surface.
  //
  // MAX_CHUNK_SIZE is hardcoded (60 MiB) rather than imported at schema-
  // build time to avoid pulling the upload helper module into the graph-
  // tools module graph for deployments that never invoke the upload tool.
  const MAX_CHUNK_SIZE_BYTES = 60 * 1024 * 1024;
  const shouldRegisterUpload =
    !readOnly && (!enabledToolsRegex || enabledToolsRegex.test('graph-upload-large-file'));
  if (shouldRegisterUpload) {
    try {
      server.tool(
        'graph-upload-large-file',
        'Upload a large file (base64-encoded content) to OneDrive / SharePoint via a resumable upload session. ' +
          'Chunks are 320 KiB-aligned (default 3.125 MB / 3,276,800 bytes); mid-stream 5xx and 416 errors auto-resume ' +
          'from the authoritative nextExpectedRanges offset rather than restarting from byte 0. ' +
          'Max chunk size is 60 MiB per Microsoft Graph. Returns the created DriveItem envelope.',
        {
          driveItemPath: z
            .string()
            .describe(
              'Path template for the drive item, e.g., "/me/drive/root:/path/to/file.bin" — ' +
                'helper appends ":/createUploadSession". Must start with "/".'
            ),
          contentBase64: z
            .string()
            .describe(
              'File content base64-encoded. Maximum size bounded by MS365_MCP_BODY_PARSER_LIMIT ' +
                '(default 60 MiB).'
            ),
          chunkSize: z
            .number()
            .int()
            .positive()
            .max(MAX_CHUNK_SIZE_BYTES)
            .optional()
            .describe(
              'Chunk size in bytes (default 3,276,800 = 3.125 MB). Aligned DOWN to 320 KiB multiple; ' +
                'clamped to 60 MiB.'
            ),
          conflictBehavior: z
            .enum(['rename', 'replace', 'fail'])
            .optional()
            .describe(
              'Graph @microsoft.graph.conflictBehavior (default "rename"). "replace" overwrites; ' +
                '"fail" errors if the name already exists.'
            ),
          fileName: z.string().optional().describe('Override the uploaded file name.'),
        },
        {
          title: 'graph-upload-large-file',
          readOnlyHint: false,
          destructiveHint: true,
          openWorldHint: true,
        },
        async ({ driveItemPath, contentBase64, chunkSize, conflictBehavior, fileName }) => {
          const dispatchRejection = checkSyntheticGraphToolDispatch('graph-upload-large-file');
          if (dispatchRejection) return dispatchRejection;

          try {
            const { UploadSessionHelper } = await import('./lib/upload-session.js');
            const buffer = Buffer.from(contentBase64, 'base64');
            const helper = new UploadSessionHelper(graphClient);
            const driveItem = await helper.uploadLargeFile(driveItemPath, buffer, {
              chunkSize,
              conflictBehavior,
              fileName,
            });
            return {
              content: [{ type: 'text', text: JSON.stringify(driveItem) }],
            };
          } catch (error) {
            logger.error(`graph-upload-large-file failed: ${(error as Error).message}`);
            // Project typed GraphError fields to a JSON-safe shape so AI
            // clients see structured context (code / statusCode / requestId)
            // rather than an empty Error envelope from JSON.stringify.
            const err = error as Error & {
              code?: string;
              statusCode?: number;
              requestId?: string;
              clientRequestId?: string;
              date?: string;
            };
            const payload: Record<string, unknown> = {
              error: `graph-upload-large-file failed: ${err.message}`,
            };
            if (typeof err.code === 'string') payload.code = err.code;
            if (typeof err.statusCode === 'number') payload.statusCode = err.statusCode;
            if (typeof err.requestId === 'string') payload.requestId = err.requestId;
            if (typeof err.clientRequestId === 'string')
              payload.clientRequestId = err.clientRequestId;
            if (typeof err.date === 'string') payload.date = err.date;
            return {
              content: [{ type: 'text', text: JSON.stringify(payload) }],
              isError: true,
            };
          }
        }
      );
      registeredCount++;
    } catch (error) {
      logger.error(`Failed to register tool graph-upload-large-file: ${(error as Error).message}`);
      failedCount++;
    }
  } else if (readOnly) {
    logger.info('Skipping graph-upload-large-file tool in read-only mode (upload is a write)');
  }

  // Layer 3 (list-accounts tool) is registered by registerAuthTools in auth-tools.ts.
  // It is the canonical owner of account discovery — no duplicate registration here.

  // Plan 04-08 (WEBHK-03): subscription lifecycle MCP tools
  // (subscriptions-create/renew/delete/list). Registered only in HTTP mode
  // (requires the Phase 3 tenant substrate) and only when MS365_MCP_PUBLIC_URL
  // is configured — without it, the notificationUrl SSRF-protection invariant
  // cannot be enforced (the URL would have no scheme+host to compare against).
  //
  // The registration itself is best-effort: any substrate import failure
  // (e.g. tenant-pool not initialized in stdio mode, pgPool unavailable)
  // is logged as a warn and the subscription tools are silently skipped so
  // the rest of the Graph tool surface continues to serve.
  if (process.env.MS365_MCP_PUBLIC_URL) {
    try {
      const publicUrl = process.env.MS365_MCP_PUBLIC_URL;
      // Dynamic imports — the subscription tools only load when we decide to
      // register them. Keeps the cold-start cost on stdio / non-HTTP paths at
      // zero (the subscriptions module pulls in pg + Zod paths that would
      // otherwise be loaded for no reason in those modes).
      void (async () => {
        try {
          const [{ registerSubscriptionTools }, postgres, { getTenantPool }, { loadKek }] =
            await Promise.all([
              import('./lib/admin/subscriptions.js'),
              import('./lib/postgres.js'),
              import('./lib/tenant/tenant-pool.js'),
              import('./lib/crypto/kek.js'),
            ]);
          const tenantPool = getTenantPool();
          if (!tenantPool) {
            logger.warn(
              'subscriptions-* tools NOT registered: tenant pool not initialized (likely stdio mode)'
            );
            return;
          }
          const pgPool = postgres.getPool();
          const kek = await loadKek();
          registerSubscriptionTools(server, {
            graphClient,
            pgPool,
            tenantPool,
            publicUrl,
            kek,
            // The resolver is evaluated lazily per-invocation so the current
            // request's tenantId (populated by loadTenant middleware into
            // request-context) drives the tool behavior. Falls back to the
            // caller-supplied MS365_MCP_TENANT_ID when no request context
            // is active (legacy stdio tool invocation).
            tenantIdResolver: () => {
              const ctx = getRequestTokens();
              const tenantId = ctx?.tenantId ?? process.env.MS365_MCP_TENANT_ID;
              if (!tenantId) {
                throw new Error(
                  'subscriptions-*: no tenant context (set MS365_MCP_TENANT_ID or invoke via tenant-scoped route)'
                );
              }
              return tenantId;
            },
          });
          logger.info('subscriptions-* MCP tools registered (plan 04-08)');
        } catch (err) {
          logger.warn(
            { err: (err as Error).message },
            'subscriptions-* tools NOT registered: substrate bootstrap failed'
          );
        }
      })();
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'subscriptions-* tools registration failed outright'
      );
    }
  } else {
    logger.info(
      'subscriptions-* tools NOT registered: MS365_MCP_PUBLIC_URL not set (required for SSRF-safe notificationUrl)'
    );
  }

  logger.info(
    `Tool registration complete: ${registeredCount} registered, ${skippedCount} skipped, ${failedCount} failed`
  );
  return registeredCount;
}

export function buildToolsRegistry(
  readOnly: boolean,
  orgMode: boolean
): Map<string, { tool: (typeof api.endpoints)[0]; config: EndpointConfig | undefined }> {
  const toolsMap = new Map<
    string,
    { tool: (typeof api.endpoints)[0]; config: EndpointConfig | undefined }
  >();

  for (const tool of api.endpoints) {
    const endpointConfig = endpointsMap.get(tool.alias);

    if (!orgMode && endpointConfig && !endpointConfig.scopes && endpointConfig.workScopes) {
      continue;
    }

    const method = tool.method.toUpperCase();
    if (readOnly && method !== 'GET') {
      if (!(method === 'POST' && endpointConfig?.readOnly)) {
        continue;
      }
    }

    toolsMap.set(tool.alias, { tool, config: endpointConfig });
  }

  return toolsMap;
}

export interface ExecuteToolAliasArgs {
  toolName: string;
  parameters?: Record<string, unknown>;
  graphClient: GraphClient;
  authManager?: AuthManager;
  readOnly?: boolean;
  orgMode?: boolean;
}

export async function executeToolAlias({
  toolName,
  parameters = {},
  graphClient,
  authManager,
  readOnly = false,
  orgMode = false,
}: ExecuteToolAliasArgs): Promise<CallToolResult> {
  const tenant = resolveTenantForDiscovery();
  if (!tenant) {
    logger.warn({}, 'executeToolAlias: no tenant context; refusing dispatch');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'tenant context unavailable',
            tip: 'Tenant context not seeded — contact operator.',
          }),
        },
      ],
      isError: true,
    };
  }

  const toolsRegistry = buildToolsRegistry(readOnly, orgMode);
  const catalog = resolveDiscoveryCatalog({
    presetVersion: tenant.presetVersion,
    enabledToolsSet: tenant.enabledToolsSet,
    enabledToolsExplicit: tenant.enabledToolsExplicit,
    registryAliases: toolsRegistry.keys(),
  });

  if (!catalog.discoveryCatalogSet.has(toolName)) {
    logger.info({ tool: toolName, tenantId: tenant.id }, 'executeToolAlias: tool not enabled');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Tool not enabled for tenant: ${toolName}`,
            tenantId: tenant.id,
            tip: 'Use search-tools to discover tools available to this tenant.',
          }),
        },
      ],
      isError: true,
    };
  }

  const toolData = toolsRegistry.get(toolName);
  if (!toolData) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Tool not found: ${toolName}`,
            tip: 'Use search-tools to find available tools.',
          }),
        },
      ],
      isError: true,
    };
  }

  if (
    catalog.isDiscoverySurface &&
    !tenant.enabledToolsExplicit &&
    !isReadSafeDiscoveryTool(toolData.tool, toolData.config)
  ) {
    logger.info(
      { tool: toolName, tenantId: tenant.id, method: toolData.tool.method.toUpperCase() },
      'executeToolAlias: write tool requires explicit tenant enablement'
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Tool requires explicit tenant enablement: ${toolName}`,
            tenantId: tenant.id,
            tip: 'Ask an admin to add this write-capable alias to enabled_tools before using execute-tool.',
          }),
        },
      ],
      isError: true,
    };
  }

  const ctx = requestContext.getStore() ?? {};
  return requestContext.run({ ...ctx, enabledToolsSet: catalog.discoveryCatalogSet }, async () =>
    executeGraphTool(toolData.tool, toolData.config, graphClient, parameters, authManager)
  );
}

// `buildDiscoverySearchIndex` + `scoreDiscoveryQuery` live in
// `./lib/graph-tools-pure.ts` so they can be consumed without transitively
// loading the 45 MB generated client catalog. They are re-exported at the
// top of this module so existing imports of
// `./graph-tools` keep working unchanged.

/**
 * Project the `buildToolsRegistry` Map down to the lightweight
 * `ToolRegistry` shape the per-tenant BM25 cache needs. Only four fields
 * contribute to ranking (alias, path, description, llmTip); isolating
 * them here keeps the cache module free of the richer EndpointConfig type
 * and makes the token-weighting algorithm testable against fixtures.
 */
function projectToolRegistry(toolsRegistry: ReturnType<typeof buildToolsRegistry>): ToolRegistry {
  const projected = new Map<string, ToolRegistryEntry>();
  for (const [alias, { tool, config }] of toolsRegistry) {
    projected.set(alias, {
      alias,
      path: tool.path,
      description: tool.description,
      llmTip: config?.llmTip,
    });
  }
  return projected;
}

/**
 * Resolve the effective tenant triple for a discovery handler. Mirrors
 * dispatch-guard's fallback order:
 *   1. ALS frame (HTTP mode: seeded by /t/:tenantId route middleware)
 *   2. Module-level stdio fallback (stdio mode: seeded by src/index.ts
 *      bootstrap via setStdioFallback)
 *   3. None → returns `undefined`, handlers fail closed with an empty
 *      result / error envelope.
 *
 * Kept local rather than exported from dispatch-guard because the
 * dispatch path (executeGraphTool) already has `checkDispatch` which
 * serves a subtly different purpose: dispatch rejects; discovery filters.
 */
function resolveTenantForDiscovery():
  | {
      id: string;
      enabledToolsSet: ReadonlySet<string>;
      enabledToolsExplicit?: boolean;
      presetVersion: string;
    }
  | undefined {
  const als = getRequestTenant();
  if (als.id && als.enabledToolsSet && als.presetVersion) {
    return {
      id: als.id,
      enabledToolsSet: als.enabledToolsSet,
      enabledToolsExplicit: als.enabledToolsExplicit,
      presetVersion: als.presetVersion,
    };
  }
  const fallback = _getStdioFallbackForTest();
  if (fallback) {
    return {
      id: fallback.tenantId,
      enabledToolsSet: fallback.enabledToolsSet,
      enabledToolsExplicit: fallback.enabledToolsExplicit,
      presetVersion: fallback.presetVersion,
    };
  }
  return undefined;
}

/**
 * Build a per-request `nameTokens` map covering just the tenant's
 * enabled aliases. scoreDiscoveryQuery needs this for the name-precision
 * bonus; caching it would require caching the full DiscoverySearchIndex
 * rather than a bare BM25Index. O(n) per request where n = tenant's
 * enabled-tools count (≤5000) which measures <5ms even on the largest
 * enabled sets.
 */
function buildTenantNameTokens(
  enabledSet: ReadonlySet<string>,
  registry: ToolRegistry
): Map<string, Set<string>> {
  const nameTokens = new Map<string, Set<string>>();
  for (const alias of enabledSet) {
    if (!registry.has(alias)) continue;
    nameTokens.set(alias, new Set(tokenize(alias)));
  }
  return nameTokens;
}

/**
 * Per-tenant variant of `scoreDiscoveryQuery`. Identical ranking (BM25 +
 * name-precision bonus) but scoped to a pre-built BM25 index over the
 * tenant's enabled subset.
 */
function scoreTenantDiscoveryQuery(
  query: string,
  bm25: BM25Index,
  nameTokens: Map<string, Set<string>>
): Array<{ id: string; score: number }> {
  const queryTokenSet = new Set(tokenize(query));
  if (queryTokenSet.size === 0) return [];
  const ranked = scoreQuery(query, bm25);
  const NAME_BONUS_WEIGHT = 2;
  for (const r of ranked) {
    const nt = nameTokens.get(r.id);
    if (!nt || nt.size === 0) continue;
    let matchedIdf = 0;
    let matchedCount = 0;
    for (const qt of queryTokenSet) {
      if (nt.has(qt)) {
        matchedCount++;
        matchedIdf += bm25.idf.get(qt) ?? 0;
      }
    }
    if (matchedCount === 0) continue;
    const precision = matchedCount / nt.size;
    r.score += precision * matchedIdf * NAME_BONUS_WEIGHT;
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export function registerDiscoveryTools(
  server: McpServer,
  graphClient: GraphClient,
  readOnly: boolean = false,
  orgMode: boolean = false,
  authManager?: AuthManager,
  _multiAccount: boolean = false
): void {
  const toolsRegistry = buildToolsRegistry(readOnly, orgMode);
  // Plan 05-06: project down to the shape the per-tenant BM25 cache
  // consumes. Built once per registerDiscoveryTools call; reused for every
  // search-tools / get-tool-schema invocation.
  const projectedRegistry: ToolRegistry = projectToolRegistry(toolsRegistry);
  logger.info(`Discovery mode: ${toolsRegistry.size} tools available in registry`);

  const categoryNames = Object.keys(TOOL_CATEGORIES).join(', ');

  const toResultEntry = (name: string) => {
    const entry = toolsRegistry.get(name);
    if (!entry) return null;
    const { tool, config } = entry;
    return {
      name,
      method: tool.method.toUpperCase(),
      path: tool.path,
      description: tool.description || `${tool.method.toUpperCase()} ${tool.path}`,
      ...(config?.llmTip ? { llmTip: config.llmTip } : {}),
    };
  };

  server.registerTool(
    'search-tools',
    {
      title: 'search-tools',
      description: `Search through Microsoft Graph API tools enabled for this tenant. Ranks results by BM25 over tool name, llmTip, description, and path (tokenized on hyphens, camelCase, and whitespace). After picking a tool, call get-tool-schema to see its parameters, then execute-tool to invoke it.`,
      inputSchema: {
        query: z
          .string()
          .describe(
            'Natural-language query. Tokenized and BM25-ranked. E.g. "send email", "create calendar event", "list unread messages".'
          )
          .optional(),
        category: z
          .string()
          .describe(`Optional pre-filter by category: ${categoryNames}`)
          .optional(),
        limit: z.number().describe('Maximum results (default: 10, max: 50)').optional(),
      },
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, category, limit = 10 }) => {
      const maxLimit = Math.min(Math.max(limit, 1), 50);
      const categoryDef = category ? TOOL_CATEGORIES[category] : undefined;
      const categoryFilter = (name: string) => !categoryDef || categoryDef.pattern.test(name);

      // ── PER-TENANT ISOLATION (plan 05-06, T-05-12) ───────────────────
      // Resolve the tenant triple; refuse to leak the full registry when
      // no tenant context is available. This is the PRIMARY mitigation
      // for T-05-12 (cross-tenant metadata leakage via shared rankings).
      const tenant = resolveTenantForDiscovery();
      if (!tenant) {
        logger.warn(
          {},
          'search-tools: no tenant context (ALS or stdio fallback); returning empty result set'
        );
        return createMcpResultEnvelope({
          toolName: 'search-tools',
          summary: 'Found 0 tools because tenant context is unavailable.',
          data: {
            found: 0,
            total: 0,
            tools: [],
            tip: 'Tenant context unavailable — discovery is fail-closed. Contact operator.',
          },
          nextActions: ['Contact the operator to seed tenant context before using discovery.'],
          warnings: ['tenant_context_unavailable'],
          meta: { tenantRef: 'unavailable' },
        });
      }

      const catalog = resolveDiscoveryCatalog({
        presetVersion: tenant.presetVersion,
        enabledToolsSet: tenant.enabledToolsSet,
        enabledToolsExplicit: tenant.enabledToolsExplicit,
        registryAliases: projectedRegistry.keys(),
      });
      const catalogSet = catalog.discoveryCatalogSet;

      // Build (or cache-hit) the per-tenant BM25 index over the effective
      // discovery catalog subset intersected with the registered tool
      // universe. For discovery-v1 tenants this is the generated Graph/product
      // catalog, not the visible 12 meta aliases.
      const tenantIndex = discoveryCache.get(tenant.id, catalogSet, projectedRegistry);

      let orderedNames: string[];
      if (query && query.trim().length > 0) {
        // Rebuild nameTokens per-request for the name-precision bonus
        // (intentionally not cached — rebuild cost is ≤5ms on 5000-entry
        // enabled sets; caching would force the per-tenant cache to hold
        // the richer DiscoverySearchIndex shape and double its memory).
        const nameTokens = buildTenantNameTokens(catalogSet, projectedRegistry);
        let bookmarkCounts = new Map<string, number>();
        try {
          bookmarkCounts = await getBookmarkCountsByAlias(tenant.id, getRequestOwnerSubject());
        } catch (err) {
          logger.warn(
            { tenantId: tenant.id, err: (err as Error).message },
            'search-tools: bookmark boost counts unavailable; returning unboosted ranking'
          );
        }
        const ranked = scoreTenantDiscoveryQuery(query, tenantIndex, nameTokens)
          .map((r) => ({
            ...r,
            score: safeBookmarkBoost(r.score, bookmarkCounts.get(r.id) ?? 0),
          }))
          .sort((a, b) => b.score - a.score);
        orderedNames = ranked.map((r) => r.id).filter(categoryFilter);
      } else {
        // No query → list every alias in the tenant's enabled set that
        // is also in the registered universe. Category filter still applies.
        orderedNames = [...catalogSet]
          .filter((alias) => projectedRegistry.has(alias))
          .filter(categoryFilter);
      }

      const tools = orderedNames.slice(0, maxLimit).map(toResultEntry).filter(Boolean);

      const payload = {
        found: tools.length,
        // Report the tenant's enabled-set size, not the full
        // registry size — advertising the global total leaks
        // cross-tenant shape (T-05-12).
        total: catalogSet.size,
        tools,
        tip: 'Call get-tool-schema(tool_name) to see parameters before invoking execute-tool.',
      };
      return withJsonText(
        createMcpResultEnvelope({
          toolName: 'search-tools',
          summary: `Found ${tools.length} matching tool${tools.length === 1 ? '' : 's'}.`,
          data: payload,
          nextActions: ['Call get-tool-schema for a selected tool before invoking execute-tool.'],
          meta: { tenantRef: tenant.id },
        }),
        payload
      );
    }
  );

  server.registerTool(
    'get-tool-schema',
    {
      title: 'get-tool-schema',
      description:
        'Returns the full parameter schema (name, placement, required, JSON Schema) for a tool discovered via search-tools. Call this before execute-tool so you know what parameters to pass and what enum values are valid.',
      inputSchema: {
        tool_name: z.string().describe('Exact tool name from search-tools (e.g. "send-mail")'),
      },
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ tool_name }) => {
      // Plan 05-06 T-05-12: enforce tenant scope before exposing schema.
      // Same fail-closed posture as search-tools; a schema dump for a
      // tool outside the tenant's enabled set is metadata leakage.
      const tenant = resolveTenantForDiscovery();
      if (!tenant) {
        logger.warn({}, 'get-tool-schema: no tenant context; refusing schema dump');
        return createMcpErrorEnvelope({
          toolName: 'get-tool-schema',
          summary: 'Cannot return a schema without tenant context.',
          code: 'tenant_context_unavailable',
          message: 'Tenant context not seeded.',
          nextActions: ['Contact the operator to seed tenant context before using discovery.'],
          meta: { tenantRef: 'unavailable' },
        });
      }

      const catalog = resolveDiscoveryCatalog({
        presetVersion: tenant.presetVersion,
        enabledToolsSet: tenant.enabledToolsSet,
        enabledToolsExplicit: tenant.enabledToolsExplicit,
        registryAliases: projectedRegistry.keys(),
      });

      if (!catalog.discoveryCatalogSet.has(tool_name)) {
        logger.info(
          { tool: tool_name, tenantId: tenant.id },
          'get-tool-schema: tool not enabled for tenant'
        );
        return createMcpErrorEnvelope({
          toolName: 'get-tool-schema',
          summary: `Tool not enabled for tenant: ${tool_name}.`,
          code: 'tool_not_enabled_for_tenant',
          message: `Tool not enabled for tenant: ${tool_name}`,
          data: { toolName: tool_name },
          nextActions: ['Use search-tools to discover tools available to this tenant.'],
          meta: { tenantRef: tenant.id },
        });
      }

      const entry = toolsRegistry.get(tool_name);
      if (!entry) {
        return createMcpErrorEnvelope({
          toolName: 'get-tool-schema',
          summary: `Tool not found: ${tool_name}.`,
          code: 'tool_not_found',
          message: `Tool not found: ${tool_name}`,
          data: { toolName: tool_name },
          nextActions: ['Use search-tools to find available tools.'],
          meta: { tenantRef: tenant.id },
        });
      }
      const schema = describeToolSchema(entry.tool, entry.config?.llmTip);
      return withJsonText(
        createMcpResultEnvelope({
          toolName: 'get-tool-schema',
          summary: `Schema for ${schema.name}.`,
          data: schema,
          nextActions: ['Call execute-tool with parameters shaped per this schema.'],
          meta: { tenantRef: tenant.id, toolAlias: schema.name },
        }),
        schema
      );
    }
  );

  server.registerTool(
    'execute-tool',
    {
      title: 'execute-tool',
      description:
        'Execute a Microsoft Graph API tool by name. Workflow: search-tools → get-tool-schema → execute-tool. Call get-tool-schema first for any tool you have not seen before — passing the wrong shape to parameters will fail validation or return a Graph 400. For list endpoints, prefer modest $top plus $select.',
      inputSchema: {
        tool_name: z.string().describe('Name of the tool to execute (e.g., "list-mail-messages")'),
        parameters: z
          .record(z.any())
          .describe(
            'Parameters shaped per get-tool-schema. Path/query/header params go at the top level; request bodies go under "body".'
          )
          .optional(),
      },
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async ({ tool_name, parameters = {} }) => {
      const result = await executeToolAlias({
        toolName: tool_name,
        parameters,
        graphClient,
        authManager,
        readOnly,
        orgMode,
      });
      if (result.isError) return result;
      if (isTranscriptContentAlias(tool_name)) {
        return createTranscriptStructuredResult(tool_name, result);
      }
      const data = graphResultData(result);
      const resources = graphResourceLinksForToolResult({
        toolName: tool_name,
        tenantId: getRequestTenant().id,
        data,
        parameters,
      });
      const envelope = createMcpResultEnvelope({
        toolName: 'execute-tool',
        summary: `Executed ${tool_name}.`,
        data,
        resources,
        nextActions:
          resources.length > 0
            ? ['Review the returned data or open linked resources for durable, bounded reads.']
            : ['Review the returned data and call another tool if more detail is needed.'],
        meta: { ...result._meta, toolAlias: tool_name },
      });
      return {
        ...envelope,
        content: shouldUseResourceLinkedText(resultPayloadBytes(result), resources)
          ? envelope.content
          : result.content,
      };
    }
  );

  // Layer 3 (list-accounts) is registered by registerAuthTools — no duplicate here.
}

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { normalizeToolSchemaRefs } from '../normalize-tool-schema.js';
import { positiveIntFromEnv } from './param-descriptions.js';

/**
 * Measures the input-schema bytes a connector is charged for the served tools, and —
 * when opted in — keeps each tool definition under a byte ration by flattening deep
 * request-body schemas.
 *
 * Why this exists: a connector is served a fixed total amount of tool-definition data.
 * The list is walked alphabetically, each tool is charged on admission, and one that no
 * longer fits is skipped *entirely* — so a handful of very large write schemas silently
 * cost us whole tools further down the alphabet. Unrationed, a 327-tool org surface
 * serves ~1.67 MB of schema — 1.6× the budget, 78 tools skipped — and a handful of write
 * schemas carry it: `create-sharepoint-list` alone expands from 670 bytes of endpoint
 * config into ~84 KB served, because the generated client inlines the Graph OpenAPI body
 * shape.
 *
 * What the platform charges (confirmed by Anthropic support, 2026-09-01; nothing public
 * documents it):
 *
 * - **Bytes, not tokens** — the UTF-8 length of the input schema serialized compactly.
 * - **Input schema only** — `name` and `description` are excluded, so verbose tips are
 *   free against this budget (they still cost the model's context, which is a different
 *   constraint, governed elsewhere).
 * - **1 048 576 bytes per connector**, and per connector only: other connectors in the
 *   organization cannot evict this one's tools, and splitting a surface across two
 *   connectors is a genuine mitigation.
 *
 * Measurement mirrors the wire exactly: the SDK's own Zod→JSON-Schema conversion for
 * `tools/list`, then `normalizeToolSchemaRefs`, which is what a connector receives. It
 * always runs, and the aggregate is logged at registration whether or not anything is
 * pruned — the total is what decides whether a tool is served, and until now nothing
 * reported it.
 *
 * Pruning is **opt-in**: set `MS365_MCP_TOOL_DEFINITION_BUDGET=<bytes>` (4096 is the
 * value measured to keep a full org surface at ~64 % of the connector budget). Unset,
 * every tool registers byte for byte as generated. The ration is ours, not the platform's
 * — a per-tool ceiling that keeps the aggregate under the connector budget without
 * needing to know the final tool count.
 *
 * When it runs, only the body is pruned, only for tools that actually exceed the ration,
 * and only as far as needed — the least destructive strategy that fits wins, so most
 * tools are untouched. Graph validates the body server-side anyway and bodies already go
 * through `lenientBodySchema` + passthrough, so pruning costs schema-level guidance, not
 * the ability to make the call. Field *names* are what a model needs to compose a
 * request, and the per-field description text is what actually consumes the budget — so
 * descriptions go before structure, and the body itself only as a last resort (see
 * `PRUNE_STRATEGIES`). At a 4 KiB ration that leaves every body's field names visible;
 * the eight bodies that show no field names are opaque at any budget, unlimited
 * included — inherent to the Graph spec, not caused by pruning.
 *
 * Fitting is memoised per tool (see `fitToolDefinitionToBudget`'s `cacheKey`). HTTP mode
 * is stateless and rebuilds the McpServer — and so re-registers every tool — on each
 * `POST /mcp`; without the cache the whole measuring pass ran on every tool call.
 */

/**
 * Total input-schema bytes a single connector is served before tools start being
 * skipped. Platform-imposed; undocumented publicly, confirmed by support 2026-09-01.
 */
export const CONNECTOR_DEFINITION_BUDGET = 1_048_576;

/**
 * Recommended per-tool ration when pruning is enabled, and the value an invalid
 * `MS365_MCP_TOOL_DEFINITION_BUDGET` falls back to. Not applied unless the env var is set.
 */
export const DEFAULT_TOOL_DEFINITION_BUDGET = 4096;

/**
 * Per-definition ceiling from `MS365_MCP_TOOL_DEFINITION_BUDGET`, or `undefined` when
 * pruning is not opted in. An unparsable value means the operator meant to opt in, so it
 * falls back to the recommended ration (with a warning) rather than silently disabling.
 */
export function getToolDefinitionBudget(): number | undefined {
  const raw = process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;
  if (raw === undefined || raw === '') return undefined;
  return positiveIntFromEnv('MS365_MCP_TOOL_DEFINITION_BUDGET', DEFAULT_TOOL_DEFINITION_BUDGET);
}

/** One attempt at making a definition fit. */
export type PruneStrategy = {
  /** Levels of nested structure to keep. 0 collapses the body itself. */
  maxDepth: number;
  /** Levels whose `.describe()` text is kept. 0 drops every description. */
  describeDepth: number;
};

/**
 * Attempts ordered least to most destructive.
 *
 * Field *names* are what a model needs to compose a request; the per-field description
 * text is what actually consumes the budget. So descriptions below the body's own
 * properties go first, then structural depth, then the remaining descriptions — and only
 * as a last resort the body itself, which is the one outcome that leaves a model with no
 * field names at all.
 *
 * Measured on the full surface, dropping nested descriptions before structure is what
 * keeps `create-calendar-event`, `send-chat-message` and 35 others from going opaque.
 */
const PRUNE_STRATEGIES: readonly PruneStrategy[] = [
  { maxDepth: 4, describeDepth: 2 },
  { maxDepth: 3, describeDepth: 2 },
  { maxDepth: 2, describeDepth: 2 },
  { maxDepth: 1, describeDepth: 2 },
  { maxDepth: 1, describeDepth: 1 },
  { maxDepth: 1, describeDepth: 0 },
  { maxDepth: 0, describeDepth: 0 },
];

/** Restore a description the rebuilt schema would otherwise drop. */
function withDescription(
  rebuilt: z.ZodTypeAny,
  original: z.ZodTypeAny,
  keepDescription: boolean
): z.ZodTypeAny {
  const description = original._def.description;
  return description && keepDescription ? rebuilt.describe(description) : rebuilt;
}

/** The shape a collapsed value keeps: enough for a model to know what kind of value to send. */
type CollapsedKind = 'array' | 'object' | 'other';

function collapsedKind(schema: z.ZodTypeAny): CollapsedKind {
  const unwrapped = unwrapContainer(schema);
  if (unwrapped instanceof z.ZodArray) return 'array';
  if (unwrapped instanceof z.ZodObject || unwrapped instanceof z.ZodRecord) return 'object';
  if (unwrapped instanceof z.ZodUnion) {
    // The generated client wraps most Graph object references as
    // `z.union([namedType, z.object({}).partial().passthrough()])` — alternatives of the
    // same kind collapse to that kind; genuinely mixed unions collapse to `any`.
    const kinds = new Set((unwrapped.options as z.ZodTypeAny[]).map(collapsedKind));
    return kinds.size === 1 ? [...kinds][0] : 'other';
  }
  return 'other';
}

/**
 * Collapse a schema to an open-ended equivalent, preserving the *kind* of value
 * expected so the model still knows whether to send an object or an array.
 */
function collapse(schema: z.ZodTypeAny, keepDescription: boolean): z.ZodTypeAny {
  switch (collapsedKind(schema)) {
    case 'array':
      return withDescription(z.array(z.any()), schema, keepDescription);
    case 'object':
      return withDescription(z.record(z.any()), schema, keepDescription);
    default:
      return withDescription(z.any(), schema, keepDescription);
  }
}

/** Peel optional/nullable/lazy/default wrappers to reach the underlying type. */
function unwrapContainer(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  for (let i = 0; i < 10; i++) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap();
      continue;
    }
    if (current instanceof z.ZodLazy) {
      current = current.schema;
      continue;
    }
    if (current instanceof z.ZodDefault) {
      current = current._def.innerType;
      continue;
    }
    return current;
  }
  return current;
}

/**
 * Rebuild `schema` keeping at most `maxDepth` levels of nested structure, and keeping
 * `.describe()` text only for the first `describeDepth` levels.
 *
 * Optional/nullable/default wrappers are rebuilt around the pruned inner type rather than
 * dropped: turning an optional body field into a required one would reject calls that
 * are valid today.
 *
 * Union alternatives sit at the *same* level as the union itself — choosing between them
 * is not a step deeper into the body — so each is pruned with the same depth. Record
 * values, like array elements, are one level down.
 */
export function pruneSchemaDepth(
  schema: z.ZodTypeAny,
  maxDepth: number,
  describeDepth: number = Number.POSITIVE_INFINITY
): z.ZodTypeAny {
  const keepDescription = describeDepth > 0;

  if (schema instanceof z.ZodOptional) {
    return pruneSchemaDepth(schema.unwrap(), maxDepth, describeDepth).optional();
  }
  if (schema instanceof z.ZodNullable) {
    return pruneSchemaDepth(schema.unwrap(), maxDepth, describeDepth).nullable();
  }
  if (schema instanceof z.ZodDefault) {
    return pruneSchemaDepth(schema._def.innerType, maxDepth, describeDepth).default(
      schema._def.defaultValue
    );
  }
  if (schema instanceof z.ZodLazy) {
    // Recursive Graph types (driveItem → children → driveItem) only terminate because
    // of the depth budget, so resolve the getter eagerly here.
    return pruneSchemaDepth(schema.schema, maxDepth, describeDepth);
  }

  if (maxDepth <= 0) return collapse(schema, keepDescription);

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const pruned: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(shape)) {
      pruned[key] = pruneSchemaDepth(value, maxDepth - 1, describeDepth - 1);
    }
    // Passthrough for the same reason as lenientBodySchema: strip-mode objects drop
    // unknown keys before the handler runs (#569).
    return withDescription(z.object(pruned).passthrough(), schema, keepDescription);
  }

  if (schema instanceof z.ZodArray) {
    return withDescription(
      z.array(pruneSchemaDepth(schema.element, maxDepth - 1, describeDepth - 1)),
      schema,
      keepDescription
    );
  }

  if (schema instanceof z.ZodRecord) {
    return withDescription(
      z.record(
        schema.keySchema,
        pruneSchemaDepth(schema.valueSchema, maxDepth - 1, describeDepth - 1)
      ),
      schema,
      keepDescription
    );
  }

  if (schema instanceof z.ZodUnion) {
    const options = (schema.options as z.ZodTypeAny[]).map((option) =>
      pruneSchemaDepth(option, maxDepth, describeDepth)
    );
    return withDescription(
      z.union(options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]),
      schema,
      keepDescription
    );
  }

  // A described scalar still carries its text; strip it when we are past describeDepth.
  if (!keepDescription && schema._def.description) {
    return collapseScalarDescription(schema);
  }

  // Scalars and anything unrecognised already cost close to nothing.
  return schema;
}

/**
 * Drop the description from a scalar while keeping its type. Zod has no "undescribe", so
 * rebuild from the type name — the common Graph leaf kinds are covered and anything else
 * keeps its description rather than losing its type.
 */
function collapseScalarDescription(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodString) return z.string();
  if (schema instanceof z.ZodNumber) return z.number();
  if (schema instanceof z.ZodBoolean) return z.boolean();
  if (schema instanceof z.ZodEnum) return z.enum(schema.options as [string, ...string[]]);
  return schema;
}

/**
 * Serialize a tool's input schema exactly as `tools/list` will emit it: the SDK's own
 * conversion (`toJsonSchemaCompat`, Zod v3 branch — `strictUnions`, input pipe strategy,
 * default `$refStrategy: 'root'`), then the same `normalizeToolSchemaRefs` pass
 * `installToolSchemaRefNormalization` applies on the way out (hoist to `#/$defs/`, inline
 * back where a client can't resolve `$defs` — #571, #643 — keep the ref for recursive or
 * oversized expansions).
 *
 * Kept in one place so the measurement cannot drift from the transport: whatever the
 * normalization decides to inline is what the connector is charged for. An earlier
 * version re-converted with `$refStrategy: 'none'` instead, which inlined recursive
 * Graph bodies the transport keeps as refs and over-stated them by an order of magnitude
 * (`create-sharepoint-list`: ~1 MB measured against ~84 KB served).
 */
export function serveToolInputSchema(
  paramSchema: Record<string, z.ZodTypeAny>
): Record<string, unknown> {
  return serveInputSchema(z.object(paramSchema).passthrough());
}

/** Same pipeline for an already-built object schema (utility tools register a plain shape). */
export function serveInputSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const converted = zodToJsonSchema(schema, {
    strictUnions: true,
    pipeStrategy: 'input',
  }) as Record<string, unknown>;
  return normalizeToolSchemaRefs(converted);
}

/**
 * Byte length of what the connector budget actually charges for one tool: the compact
 * UTF-8 JSON of its input schema as served by `tools/list`.
 *
 * `name` and `description` are deliberately not measured — the platform excludes them,
 * so counting them here would prune bodies to pay for text that costs nothing.
 */
export function measureToolDefinitionBytes(paramSchema: Record<string, z.ZodTypeAny>): number {
  return measureInputSchemaBytes(z.object(paramSchema).passthrough());
}

/** Served byte length of any registered input schema, passthrough or not. */
export function measureInputSchemaBytes(schema: z.ZodTypeAny): number {
  return Buffer.byteLength(JSON.stringify(serveInputSchema(schema)), 'utf8');
}

export type BudgetFitResult = {
  /** Schema map to register — the input map untouched when it already fits. */
  paramSchema: Record<string, z.ZodTypeAny>;
  /** Strategy applied to body params, or null when nothing was pruned. */
  appliedStrategy: PruneStrategy | null;
  bytesBefore: number;
  bytesAfter: number;
  /** True when the body lost its field names entirely — the outcome worth logging. */
  bodyWentOpaque: boolean;
};

/**
 * Fit results by caller-supplied key. A registration pass builds each tool's
 * `paramSchema` from static endpoint data plus a few process-wide settings, so the
 * outcome for a given key never changes within a process — and Zod schemas are immutable,
 * so the cached (possibly pruned) schema can be registered on every fresh McpServer.
 */
const fitCache = new Map<string, BudgetFitResult>();

/** Drop memoised fit results. For tests that vary the inputs behind a key. */
export function clearToolDefinitionBudgetCache(): void {
  fitCache.clear();
}

/**
 * Fit one tool definition under `budget` by pruning its body params, trying strategies
 * from least to most destructive. Returns the input unchanged when it already fits — pass
 * `Number.POSITIVE_INFINITY` to measure without ever pruning.
 *
 * A tool with no body param, or one that still overflows at the last strategy, is
 * returned as best-effort: the caller keeps a working tool rather than dropping it, and
 * the remaining overflow is reported so it can be logged.
 *
 * `cacheKey`, when given, memoises the result. The key must cover everything that shapes
 * `paramSchema` for that tool — the caller knows which env-driven descriptions it folded
 * in; this module does not.
 */
export function fitToolDefinitionToBudget(
  paramSchema: Record<string, z.ZodTypeAny>,
  bodyParamNames: readonly string[],
  budget: number = DEFAULT_TOOL_DEFINITION_BUDGET,
  cacheKey?: string
): BudgetFitResult {
  if (cacheKey !== undefined) {
    const cached = fitCache.get(cacheKey);
    if (cached) return cached;
  }
  const result = fitUncached(paramSchema, bodyParamNames, budget);
  if (cacheKey !== undefined) fitCache.set(cacheKey, result);
  return result;
}

function fitUncached(
  paramSchema: Record<string, z.ZodTypeAny>,
  bodyParamNames: readonly string[],
  budget: number
): BudgetFitResult {
  const bytesBefore = measureToolDefinitionBytes(paramSchema);
  if (bytesBefore <= budget || bodyParamNames.length === 0) {
    return {
      paramSchema,
      appliedStrategy: null,
      bytesBefore,
      bytesAfter: bytesBefore,
      bodyWentOpaque: false,
    };
  }

  let best: BudgetFitResult | null = null;
  for (const strategy of PRUNE_STRATEGIES) {
    const candidate: Record<string, z.ZodTypeAny> = { ...paramSchema };
    for (const bodyName of bodyParamNames) {
      const original = paramSchema[bodyName];
      if (original)
        candidate[bodyName] = pruneSchemaDepth(original, strategy.maxDepth, strategy.describeDepth);
    }
    const bytesAfter = measureToolDefinitionBytes(candidate);
    best = {
      paramSchema: candidate,
      appliedStrategy: strategy,
      bytesBefore,
      bytesAfter,
      bodyWentOpaque: strategy.maxDepth === 0,
    };
    if (bytesAfter <= budget) return best;
  }

  // The last strategy is the smallest we can serve.
  return best as BudgetFitResult;
}

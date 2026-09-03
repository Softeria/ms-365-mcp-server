import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { positiveIntFromEnv } from './param-descriptions.js';

/**
 * Keeps served tool definitions under a byte budget by flattening deep request-body
 * schemas.
 *
 * Why this exists: a connector is served a fixed total amount of tool-definition data.
 * The list is walked alphabetically, each tool is charged on admission, and one that no
 * longer fits is skipped *entirely* — so a handful of very large write schemas silently
 * cost us whole tools further down the alphabet. Unrationed, the 327-tool surface serves
 * 1 666 197 bytes of schema — 1.6× the budget, 78 tools skipped — and a handful of write
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
 * The per-definition ceiling below is ours, not the platform's — a ration that keeps the
 * aggregate comfortably under the connector budget without needing to know the final
 * tool count.
 *
 * Only the body is pruned, only for tools that actually exceed the ration, and only as
 * far as needed — the least destructive strategy that fits wins, so most tools are
 * untouched byte for byte. Graph validates the body server-side anyway and bodies
 * already go through `lenientBodySchema` + passthrough, so pruning costs schema-level
 * guidance, not the ability to make the call.
 *
 * Field *names* are what a model needs to compose a request, and the per-field
 * description text is what actually consumes the budget — so descriptions go before
 * structure, and the body itself only as a last resort (see `PRUNE_STRATEGIES`). At the
 * 4 KiB default that leaves every body's field names visible. The eight bodies that
 * show no field names are opaque at any budget, unlimited included; that is inherent to
 * the Graph spec, not caused by pruning.
 */

/**
 * Total input-schema bytes a single connector is served before tools start being
 * skipped. Platform-imposed; undocumented publicly, confirmed by support 2026-09-01.
 */
export const CONNECTOR_DEFINITION_BUDGET = 1_048_576;

/** Byte ceiling for one served tool definition — our own ration, not the platform's. */
export const DEFAULT_TOOL_DEFINITION_BUDGET = 4096;

/**
 * Current per-definition ceiling, honoring MS365_MCP_TOOL_DEFINITION_BUDGET.
 *
 * The default is the strict value on purpose: an unset env var must not widen the
 * budget back to the state where tools go missing.
 */
export function getToolDefinitionBudget(): number {
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

/**
 * Collapse a schema to an open-ended equivalent, preserving the *kind* of value
 * expected so the model still knows whether to send an object or an array.
 */
function collapse(schema: z.ZodTypeAny, keepDescription: boolean): z.ZodTypeAny {
  const unwrapped = unwrapContainer(schema);
  if (unwrapped instanceof z.ZodArray)
    return withDescription(z.array(z.any()), schema, keepDescription);
  if (unwrapped instanceof z.ZodObject)
    return withDescription(z.record(z.any()), schema, keepDescription);
  return withDescription(z.any(), schema, keepDescription);
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
 * Optional/nullable wrappers are rebuilt around the pruned inner type rather than
 * dropped: turning an optional body field into a required one would reject calls that
 * are valid today.
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
 * Byte length of what the connector budget actually charges for one tool: the compact
 * UTF-8 JSON of its input schema, mirroring what the MCP SDK emits for `tools/list`.
 *
 * `name` and `description` are deliberately not measured — the platform excludes them,
 * so counting them here would prune bodies to pay for text that costs nothing.
 *
 * Known over-estimate: `$refStrategy: 'none'` inlines every shared subtree, while what
 * `tools/list` actually emits keeps `$ref`/`$defs` (the SDK's own conversion, then
 * `normalizeToolSchemaRefs`). On ref-heavy Graph bodies the gap is large —
 * `create-sharepoint-list` measures ~1 MB here against ~84 KB served — so the ration
 * bites hardest on exactly the tools that carry the volume. Conservative in the safe
 * direction (it never under-prunes), but it prunes more than the budget requires.
 */
export function measureToolDefinitionBytes(paramSchema: Record<string, z.ZodTypeAny>): number {
  const inputSchema = zodToJsonSchema(z.object(paramSchema).passthrough(), {
    $refStrategy: 'none',
  });
  return Buffer.byteLength(JSON.stringify(inputSchema), 'utf8');
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
 * Fit one tool definition under `budget` by pruning its body params, trying strategies
 * from least to most destructive. Returns the input unchanged when it already fits.
 *
 * A tool with no body param, or one that still overflows at the last strategy, is
 * returned as best-effort: the caller keeps a working tool rather than dropping it, and
 * the remaining overflow is reported so it can be logged.
 */
export function fitToolDefinitionToBudget(
  paramSchema: Record<string, z.ZodTypeAny>,
  bodyParamNames: readonly string[],
  budget: number = DEFAULT_TOOL_DEFINITION_BUDGET
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

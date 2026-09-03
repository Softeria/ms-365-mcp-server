import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DEFAULT_TOOL_DEFINITION_BUDGET,
  fitToolDefinitionToBudget,
  getToolDefinitionBudget,
  measureToolDefinitionBytes,
  pruneSchemaDepth,
} from '../src/lib/body-schema-budget.js';

/**
 * A body shape deep and wide enough to blow past the budget, like the Graph list/channel
 * bodies.
 *
 * Leaf count is `width ** (depth + 1)`, so keep both small: the helper is only here to
 * overflow a 4 KiB budget, and a wider tree just burns CI time in zodToJsonSchema.
 */
function deepBody(depth: number, width = 5): z.ZodTypeAny {
  if (depth === 0) {
    const leaves: Record<string, z.ZodTypeAny> = {};
    for (let i = 0; i < width; i++) {
      leaves[`leaf${i}`] = z.string().describe(`a reasonably wordy leaf description ${i}`);
    }
    return z.object(leaves);
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  for (let i = 0; i < width; i++) {
    shape[`nested${i}`] = deepBody(depth - 1, width);
  }
  return z.object(shape);
}

describe('pruneSchemaDepth', () => {
  it('keeps top-level property names at depth 1', () => {
    const schema = z.object({
      displayName: z.string(),
      columns: z.array(z.object({ name: z.string(), text: z.object({ maxLength: z.number() }) })),
    });

    const pruned = pruneSchemaDepth(schema, 1) as z.ZodObject<z.ZodRawShape>;

    expect(Object.keys(pruned.shape).sort()).toEqual(['columns', 'displayName']);
  });

  it('preserves optionality so calls valid today are not rejected', () => {
    const schema = z.object({
      required: z.object({ deep: z.string() }),
      optional: z.object({ deep: z.string() }).optional(),
    });

    const pruned = pruneSchemaDepth(schema, 1) as z.ZodObject<z.ZodRawShape>;

    expect(pruned.shape.optional.isOptional()).toBe(true);
    expect(pruned.shape.required.isOptional()).toBe(false);
  });

  it('preserves nullability', () => {
    const schema = z.object({ maybe: z.object({ deep: z.string() }).nullable() });

    const pruned = pruneSchemaDepth(schema, 1) as z.ZodObject<z.ZodRawShape>;

    expect(pruned.shape.maybe.isNullable()).toBe(true);
  });

  it('collapses a nested object to an open record, not a scalar', () => {
    const pruned = pruneSchemaDepth(z.object({ body: z.object({ content: z.string() }) }), 1);

    const parsed = pruned.parse({ body: { content: 'hello', extra: 1 } });

    expect(parsed).toEqual({ body: { content: 'hello', extra: 1 } });
  });

  it('collapses a nested array to an array, keeping the expected kind', () => {
    const pruned = pruneSchemaDepth(
      z.object({
        toRecipients: z.array(z.object({ emailAddress: z.object({ address: z.string() }) })),
      }),
      1
    );

    expect(() => pruned.parse({ toRecipients: 'not-an-array' })).toThrow();
    expect(pruned.parse({ toRecipients: [{ emailAddress: { address: 'a@b.c' } }] })).toEqual({
      toRecipients: [{ emailAddress: { address: 'a@b.c' } }],
    });
  });

  it('keeps unknown top-level keys, so a flattened body still reaches the handler (#569)', () => {
    const pruned = pruneSchemaDepth(z.object({ subject: z.string() }), 1);

    expect(pruned.parse({ subject: 'hi', toRecipients: [{ address: 'a@b.c' }] })).toEqual({
      subject: 'hi',
      toRecipients: [{ address: 'a@b.c' }],
    });
  });

  it('terminates on recursive lazy schemas instead of expanding forever', () => {
    type Node = { name: string; children?: Node[] };
    const node: z.ZodType<Node> = z.lazy(() =>
      z.object({ name: z.string(), children: z.array(node).optional() })
    );

    const pruned = pruneSchemaDepth(node, 2);

    expect(measureToolDefinitionBytes({ body: pruned })).toBeLessThan(
      DEFAULT_TOOL_DEFINITION_BUDGET
    );
  });
});

describe('fitToolDefinitionToBudget', () => {
  it('leaves a definition that already fits untouched', () => {
    const paramSchema = { body: z.object({ subject: z.string() }) };

    const result = fitToolDefinitionToBudget(paramSchema, ['body']);

    expect(result.appliedStrategy).toBeNull();
    expect(result.paramSchema).toBe(paramSchema);
    expect(result.bytesAfter).toBe(result.bytesBefore);
    expect(result.bodyWentOpaque).toBe(false);
  });

  it('brings an oversized definition under budget', () => {
    const paramSchema = { body: deepBody(3) };

    const result = fitToolDefinitionToBudget(paramSchema, ['body']);

    expect(result.bytesBefore).toBeGreaterThan(DEFAULT_TOOL_DEFINITION_BUDGET);
    expect(result.bytesAfter).toBeLessThanOrEqual(DEFAULT_TOOL_DEFINITION_BUDGET);
    expect(result.appliedStrategy).not.toBeNull();
  });

  it('prunes as little as possible — the widest depth that fits wins', () => {
    const shallow = fitToolDefinitionToBudget({ body: deepBody(2) }, ['body']);
    const deeper = fitToolDefinitionToBudget({ body: deepBody(3) }, ['body']);

    // Both overflow, so both are pruned; the smaller tree keeps more of its depth.
    expect(shallow.appliedStrategy).not.toBeNull();
    expect(deeper.appliedStrategy).not.toBeNull();
    expect(shallow.appliedStrategy!.maxDepth).toBeGreaterThanOrEqual(
      deeper.appliedStrategy!.maxDepth
    );
  });

  it('sacrifices nested descriptions before body field names', () => {
    // Wide but shallow: the volume is all description text, not structure. This is the
    // shape that used to collapse to an opaque body and lose every field name.
    const fields: Record<string, z.ZodTypeAny> = {};
    for (let i = 0; i < 25; i++) {
      fields[`field${i}`] = z
        .string()
        .describe(`${'a fairly long per-field description that eats the budget '.repeat(3)}${i}`);
    }
    const paramSchema = { body: z.object(fields) };

    const result = fitToolDefinitionToBudget(paramSchema, ['body']);

    expect(result.bytesBefore).toBeGreaterThan(DEFAULT_TOOL_DEFINITION_BUDGET);
    expect(result.bytesAfter).toBeLessThanOrEqual(DEFAULT_TOOL_DEFINITION_BUDGET);
    expect(result.bodyWentOpaque).toBe(false);

    // Every field name survives — that is what a model needs to compose the call.
    const body = result.paramSchema.body as z.ZodObject<z.ZodRawShape>;
    expect(Object.keys(body.shape)).toHaveLength(25);
  });

  it('flags the body as opaque only when field names are actually lost', () => {
    // Depth and descriptions can both be trimmed, so the only way left to overflow is a
    // body with more top-level field names than the budget can hold at any depth.
    const fields: Record<string, z.ZodTypeAny> = {};
    for (let i = 0; i < 400; i++) fields[`field${i}`] = z.string();

    const result = fitToolDefinitionToBudget({ body: z.object(fields) }, ['body']);

    expect(result.appliedStrategy!.maxDepth).toBe(0);
    expect(result.bodyWentOpaque).toBe(true);
  });

  it('does not touch non-body params while trimming', () => {
    const filter = z.string().describe('OData filter expression');
    const paramSchema = { body: deepBody(3), $filter: filter };

    const result = fitToolDefinitionToBudget(paramSchema, ['body']);

    expect(result.paramSchema.$filter).toBe(filter);
  });

  it('leaves a bodyless tool alone even when it overflows', () => {
    const paramSchema = {
      $filter: z.string().describe('x'.repeat(DEFAULT_TOOL_DEFINITION_BUDGET)),
    };

    const result = fitToolDefinitionToBudget(paramSchema, []);

    expect(result.appliedStrategy).toBeNull();
    expect(result.paramSchema).toBe(paramSchema);
  });

  it('reports the residual overflow rather than dropping the tool', () => {
    // A non-body param alone exceeds the budget, so no amount of body pruning can fit it.
    const paramSchema = {
      $filter: z.string().describe('y'.repeat(DEFAULT_TOOL_DEFINITION_BUDGET + 1)),
      body: deepBody(2),
    };

    const result = fitToolDefinitionToBudget(paramSchema, ['body']);

    expect(result.appliedStrategy!.maxDepth).toBe(0);
    expect(result.bytesAfter).toBeGreaterThan(DEFAULT_TOOL_DEFINITION_BUDGET);
  });

  it('ignores name and description, which the connector budget does not charge for', () => {
    // What is charged is the input schema alone, so the measurement must match it
    // exactly — no tool name or description folded in.
    const paramSchema = { body: z.object({ subject: z.string() }) };

    const result = fitToolDefinitionToBudget(paramSchema, ['body']);

    expect(result.appliedStrategy).toBeNull();
    expect(result.bytesBefore).toBe(measureToolDefinitionBytes(paramSchema));
    expect(result.bytesBefore).toBeLessThan(DEFAULT_TOOL_DEFINITION_BUDGET);
  });
});

describe('getToolDefinitionBudget', () => {
  it('defaults to the strict budget when the env var is unset', () => {
    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;

    expect(getToolDefinitionBudget()).toBe(DEFAULT_TOOL_DEFINITION_BUDGET);
  });

  it('honors an explicit override', () => {
    process.env.MS365_MCP_TOOL_DEFINITION_BUDGET = '8192';

    expect(getToolDefinitionBudget()).toBe(8192);

    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;
  });

  it('falls back to the strict budget on an invalid value', () => {
    process.env.MS365_MCP_TOOL_DEFINITION_BUDGET = 'not-a-number';

    expect(getToolDefinitionBudget()).toBe(DEFAULT_TOOL_DEFINITION_BUDGET);

    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;
  });
});

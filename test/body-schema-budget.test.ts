import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  DEFAULT_TOOL_DEFINITION_BUDGET,
  clearToolDefinitionBudgetCache,
  fitToolDefinitionToBudget,
  getToolDefinitionBudget,
  measureToolDefinitionBytes,
  pruneSchemaDepth,
  serveToolInputSchema,
} from '../src/lib/body-schema-budget.js';
import { installToolSchemaRefNormalization } from '../src/normalize-tool-schema.js';

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

  // The generated client wraps Graph object references as
  // `z.union([namedType, z.object({}).partial().passthrough()])`, so a union is the
  // common shape of a nested body field, not an exotic one.
  it('prunes each union alternative at the same depth instead of passing the union through whole', () => {
    const wordy = z.object({
      deep: z.object({ deeper: z.string().describe('x'.repeat(2000)) }),
    });
    const schema = z.object({
      start: z.union([wordy, z.object({}).partial().passthrough()]),
    });

    const pruned = pruneSchemaDepth(schema, 2, 1) as z.ZodObject<z.ZodRawShape>;

    expect(pruned.shape.start).toBeInstanceOf(z.ZodUnion);
    expect(measureToolDefinitionBytes({ body: pruned })).toBeLessThan(
      measureToolDefinitionBytes({ body: schema })
    );
  });

  it('collapses a union of object shapes to an open object, keeping the kind', () => {
    const pruned = pruneSchemaDepth(
      z.object({
        start: z.union([z.object({ dateTime: z.string() }), z.object({}).partial().passthrough()]),
      }),
      1
    );

    expect(() => pruned.parse({ start: 'not-an-object' })).toThrow();
    expect(pruned.parse({ start: { dateTime: '2026-09-08T09:00' } })).toEqual({
      start: { dateTime: '2026-09-08T09:00' },
    });
  });

  it('collapses a union of mixed kinds to any', () => {
    const pruned = pruneSchemaDepth(
      z.object({ zoom: z.union([z.number(), z.string(), z.object({ ref: z.string() })]) }),
      1
    );

    expect(pruned.parse({ zoom: 1.5 })).toEqual({ zoom: 1.5 });
    expect(pruned.parse({ zoom: 'auto' })).toEqual({ zoom: 'auto' });
  });

  it('prunes record values one level down, like array elements', () => {
    const schema = z.object({
      bag: z.record(z.object({ inner: z.object({ leaf: z.string().describe('y'.repeat(500)) }) })),
    });

    const pruned = pruneSchemaDepth(schema, 2) as z.ZodObject<z.ZodRawShape>;

    expect(pruned.shape.bag).toBeInstanceOf(z.ZodRecord);
    expect(measureToolDefinitionBytes({ body: pruned })).toBeLessThan(
      measureToolDefinitionBytes({ body: schema })
    );
  });

  it('keeps a default in place while pruning underneath it', () => {
    const pruned = pruneSchemaDepth(
      z.object({
        options: z.object({ deep: z.object({ x: z.string() }) }).default({ deep: { x: 'd' } }),
      }),
      1
    );

    expect(pruned.parse({})).toEqual({ options: { deep: { x: 'd' } } });
  });
});

describe('measureToolDefinitionBytes', () => {
  // Recursive Graph bodies (driveItem → children → driveItem) can't be inlined, so the
  // transport keeps them as `#/$defs/` refs. Re-converting with every ref expanded is
  // what over-stated those bodies by an order of magnitude.
  it('measures the recursive $defs form the transport keeps, not an expanded copy', () => {
    type Node = { name: string; children?: Node[] };
    const node: z.ZodType<Node> = z.lazy(() =>
      z.object({ name: z.string().describe('n'.repeat(200)), children: z.array(node).optional() })
    );
    const paramSchema = { body: z.object({ root: node, alias: node }) };

    const expanded = Buffer.byteLength(
      JSON.stringify(
        zodToJsonSchema(z.object(paramSchema).passthrough(), { $refStrategy: 'none' })
      ),
      'utf8'
    );
    const served = JSON.stringify(serveToolInputSchema(paramSchema));

    expect(served).toMatch(/"\$ref":"#\/\$defs\//);
    expect(served).not.toMatch(/"\$ref":"#\/(?!\$defs\/)/);
    expect(measureToolDefinitionBytes(paramSchema)).toBeLessThan(expanded);
  });

  it('matches the tools/list wire form byte for byte', async () => {
    const shared = z.object({ address: z.string() });
    const paramSchema = { body: z.object({ from: shared, to: z.array(shared) }) };

    const server = new McpServer({ name: 'test', version: '0.0.0' });
    server.registerTool(
      'probe',
      { description: 'probe', inputSchema: z.object(paramSchema).passthrough() },
      async () => ({ content: [] })
    );
    installToolSchemaRefNormalization(server);
    const handler = (
      server.server as unknown as {
        _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<unknown>>;
      }
    )._requestHandlers.get('tools/list')!;
    const result = (await handler(
      { method: 'tools/list' },
      { signal: new AbortController().signal }
    )) as { tools: Array<{ inputSchema: unknown }> };

    const served = Buffer.byteLength(JSON.stringify(result.tools[0].inputSchema), 'utf8');
    expect(measureToolDefinitionBytes(paramSchema)).toBe(served);
  });
});

describe('fitToolDefinitionToBudget cache', () => {
  it('returns the memoised result for the same key, recomputes for a different key', () => {
    clearToolDefinitionBudgetCache();
    const first = fitToolDefinitionToBudget({ body: deepBody(3) }, ['body'], undefined, 'k|tool');
    const again = fitToolDefinitionToBudget({ body: deepBody(3) }, ['body'], undefined, 'k|tool');
    const other = fitToolDefinitionToBudget({ body: deepBody(3) }, ['body'], undefined, 'k2|tool');

    expect(again).toBe(first);
    expect(other).not.toBe(first);
    expect(other.bytesAfter).toBe(first.bytesAfter);
  });

  it('does not memoise without a key', () => {
    const first = fitToolDefinitionToBudget({ body: deepBody(2) }, ['body']);
    const again = fitToolDefinitionToBudget({ body: deepBody(2) }, ['body']);

    expect(again).not.toBe(first);
  });

  it('forgets everything on clear', () => {
    const first = fitToolDefinitionToBudget({ body: deepBody(2) }, ['body'], undefined, 'c|tool');
    clearToolDefinitionBudgetCache();
    const again = fitToolDefinitionToBudget({ body: deepBody(2) }, ['body'], undefined, 'c|tool');

    expect(again).not.toBe(first);
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
  it('is undefined when the env var is unset — pruning is opt-in', () => {
    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;

    expect(getToolDefinitionBudget()).toBeUndefined();
  });

  it('treats an empty value as unset', () => {
    process.env.MS365_MCP_TOOL_DEFINITION_BUDGET = '';

    expect(getToolDefinitionBudget()).toBeUndefined();

    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;
  });

  it('honors an explicit ration', () => {
    process.env.MS365_MCP_TOOL_DEFINITION_BUDGET = '8192';

    expect(getToolDefinitionBudget()).toBe(8192);

    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;
  });

  it('falls back to the recommended ration on an invalid value, since the operator opted in', () => {
    process.env.MS365_MCP_TOOL_DEFINITION_BUDGET = 'not-a-number';

    expect(getToolDefinitionBudget()).toBe(DEFAULT_TOOL_DEFINITION_BUDGET);

    delete process.env.MS365_MCP_TOOL_DEFINITION_BUDGET;
  });
});

describe('fitToolDefinitionToBudget without a ration', () => {
  it('measures but never prunes when the budget is unbounded', () => {
    const paramSchema = { body: deepBody(3) };

    const result = fitToolDefinitionToBudget(paramSchema, ['body'], Number.POSITIVE_INFINITY);

    expect(result.appliedStrategy).toBeNull();
    expect(result.paramSchema).toBe(paramSchema);
    expect(result.bytesBefore).toBeGreaterThan(DEFAULT_TOOL_DEFINITION_BUDGET);
    expect(result.bytesAfter).toBe(result.bytesBefore);
  });
});

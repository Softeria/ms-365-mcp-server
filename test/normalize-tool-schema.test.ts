import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  normalizeToolSchemaRefs,
  installToolSchemaRefNormalization,
  tidyToolJsonSchema,
  toolInputJsonSchema,
} from '../src/normalize-tool-schema.js';

// Collect every $ref value in a schema.
function collectRefs(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
    return out;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') out.push(value);
    else collectRefs(value, out);
  }
  return out;
}

// Resolve a JSON pointer ('#/a/b') against a document; undefined if it dangles.
function resolvePointer(root: unknown, ref: string): unknown {
  if (!ref.startsWith('#')) return undefined;
  const tokens = ref
    .slice(1)
    .split('/')
    .slice(1)
    .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur: unknown = root;
  for (const token of tokens) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[token];
    if (cur === undefined) return undefined;
  }
  return cur;
}

describe('normalizeToolSchemaRefs', () => {
  it('returns the same object untouched when there are no refs', () => {
    const schema = { type: 'object', properties: { a: { type: 'string' } } };
    expect(normalizeToolSchemaRefs(schema)).toBe(schema);
  });

  it('leaves already-#/$defs-anchored refs alone', () => {
    const schema = {
      type: 'object',
      properties: { a: { $ref: '#/$defs/x' } },
      $defs: { x: { type: 'string' } },
    };
    expect(normalizeToolSchemaRefs(schema)).toBe(schema);
  });

  it('inlines a root-relative dedup ref so no $ref survives', () => {
    // `to` is emitted inline once and referenced by object identity elsewhere.
    const schema = {
      type: 'object',
      properties: {
        from: { type: 'object', properties: { email: { type: 'string' } } },
        to: { $ref: '#/properties/from' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(collectRefs(out)).toEqual([]);
    expect(out.$defs).toBeUndefined();
    const props = out.properties as Record<string, unknown>;
    expect(props.to).toEqual({ type: 'object', properties: { email: { type: 'string' } } });
    expect(props.to).toEqual(props.from);
  });

  it('rewrites a recursion ref (target is an ancestor of the ref) into valid #/$defs recursion', () => {
    // Mirrors mailFolder.childFolders: body refs itself.
    const schema = {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            childFolders: { type: 'array', items: { $ref: '#/properties/body' } },
          },
        },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    const refs = collectRefs(out);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
    // The recursive def points at itself, still under #/$defs.
    const def = resolvePointer(out, refs[0]) as Record<string, unknown>;
    const items = (def.properties as Record<string, { items: { $ref: string } }>).childFolders
      .items;
    expect(items.$ref.startsWith('#/$defs/')).toBe(true);
  });

  it('will not inline a ref that carries sibling keywords', () => {
    // draft-07 drops the sibling, 2020-12 conjoins it. Picking wrong changes what the
    // schema accepts, so the ref stays a ref.
    const schema = {
      type: 'object',
      properties: {
        base: { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
        derived: { $ref: '#/properties/base', required: ['b'] },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    const refs = collectRefs(out);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
    expect((out.properties as Record<string, { required: string[] }>).derived.required).toEqual([
      'b',
    ]);
  });

  it('keeps $defs when inlining would more than double the schema', () => {
    // One fat def behind many ref sites, the create-sharepoint-list-item shape
    const shared = {
      type: 'object',
      properties: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [
          `field${i}`,
          { type: 'string', description: 'x'.repeat(40) },
        ])
      ),
    };
    const properties: Record<string, unknown> = { shared };
    for (let i = 0; i < 10; i++) properties[`use${i}`] = { $ref: '#/properties/shared' };

    const out = normalizeToolSchemaRefs({ type: 'object', properties });
    const refs = collectRefs(out);
    expect(refs.length).toBeGreaterThan(0); // not inlined
    // Still has to satisfy #571 on the way out.
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
  });

  it('still inlines a small def reused many times', () => {
    // Same shape, tiny def - 10 copies still fit under the cap
    const properties: Record<string, unknown> = { shared: { type: 'string' } };
    for (let i = 0; i < 10; i++) properties[`use${i}`] = { $ref: '#/properties/shared' };

    const out = normalizeToolSchemaRefs({ type: 'object', properties });
    expect(collectRefs(out)).toEqual([]);
    expect((out.properties as Record<string, unknown>).use7).toEqual({ type: 'string' });
  });

  it('skips inlining entirely once any def is cyclic', () => {
    // `wrapper` would expand fine on its own, but `body` recurses so a ref survives
    // regardless. Expanding wrapper would just add bytes.
    const schema = {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            childFolders: { type: 'array', items: { $ref: '#/properties/body' } },
          },
        },
        wrapper: { type: 'object', properties: { folder: { $ref: '#/properties/body' } } },
        alias: { $ref: '#/properties/wrapper' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(Object.keys(out.$defs as object)).toHaveLength(2); // body and wrapper both kept
    const refs = collectRefs(out);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
  });

  it('keeps both defs when a nested target sits inside a recursive subtree', () => {
    // Hoisting `childFolders` out of `body` makes the two point at each other, so both
    // count as cyclic
    const schema = {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            childFolders: { type: 'array', items: { $ref: '#/properties/body' } },
          },
        },
        sibling: { $ref: '#/properties/body/properties/childFolders' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(Object.keys(out.$defs as object)).toHaveLength(2);
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
  });

  it('inlines nested targets without leaving dangling refs', () => {
    const inner = { type: 'object', properties: { v: { type: 'string' } } };
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'object', properties: { inner, other: { type: 'string' } } },
        b: { $ref: '#/properties/a' }, // outer target
        c: { $ref: '#/properties/a/properties/inner' }, // nested target
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(collectRefs(out)).toEqual([]);
    const props = out.properties as Record<string, unknown>;
    expect(props.b).toEqual(props.a);
    expect(props.c).toEqual(inner);
  });

  it('does not mutate the input schema', () => {
    const schema = {
      type: 'object',
      properties: {
        from: { type: 'object' },
        to: { $ref: '#/properties/from' },
      },
    };
    const snapshot = JSON.stringify(schema);
    normalizeToolSchemaRefs(schema);
    expect(JSON.stringify(schema)).toBe(snapshot);
  });

  it('expands every ref to a shared target into an equal but separate schema', () => {
    const schema = {
      type: 'object',
      properties: {
        from: { type: 'object', properties: { email: { type: 'string' } } },
        to: { $ref: '#/properties/from' },
        cc: { $ref: '#/properties/from' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(collectRefs(out)).toEqual([]);
    expect(out.$defs).toBeUndefined();
    const props = out.properties as Record<string, unknown>;
    expect(props.to).toEqual(props.from);
    expect(props.cc).toEqual(props.from);
    // Equal, but not one shared object - each site owns its copy
    expect(props.to).not.toBe(props.cc);
  });

  it('resolves JSON-pointer ~0/~1 escapes (keys containing ~ and /)', () => {
    const schema = {
      type: 'object',
      properties: {
        'a/b~c': { type: 'object', properties: { v: { type: 'string' } } },
        ref: { $ref: '#/properties/a~1b~0c' }, // ~1 => '/', ~0 => '~'
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(collectRefs(out)).toEqual([]);
    expect((out.properties as Record<string, unknown>).ref).toMatchObject({
      properties: { v: { type: 'string' } },
    });
  });

  it('resolves array-index pointer targets (anyOf/0)', () => {
    const schema = {
      type: 'object',
      properties: {
        pick: {
          anyOf: [{ type: 'object', properties: { x: { type: 'string' } } }, { type: 'null' }],
        },
        alias: { $ref: '#/properties/pick/anyOf/0' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(collectRefs(out)).toEqual([]);
    expect((out.properties as Record<string, unknown>).alias).toEqual({
      type: 'object',
      properties: { x: { type: 'string' } },
    });
  });

  it('leaves an unresolvable ref untouched rather than dangling it', () => {
    const schema = {
      type: 'object',
      properties: {
        from: { type: 'object' },
        good: { $ref: '#/properties/from' }, // resolvable -> hoisted
        bad: { $ref: '#/properties/does/not/exist' }, // unresolvable -> left as-is
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    const props = out.properties as Record<string, { $ref?: string }>;
    expect(props.good).toEqual({ type: 'object' });
    // Left exactly as-is, never "fixed" into a $defs target that isn't there
    expect(props.bad.$ref).toBe('#/properties/does/not/exist');
  });

  it('preserves a pre-existing $defs and never overwrites its keys', () => {
    const schema = {
      type: 'object',
      $defs: { def0: { const: 'sentinel' } },
      properties: {
        from: { type: 'object', properties: { email: { type: 'string' } } },
        existing: { $ref: '#/$defs/def0' },
        to: { $ref: '#/properties/from' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    const defs = out.$defs as Record<string, unknown>;
    // A def we didn't hoist isn't ours to inline, so it and its ref both survive
    expect(defs.def0).toEqual({ const: 'sentinel' });
    expect((out.properties as Record<string, { $ref: string }>).existing.$ref).toBe('#/$defs/def0');
    expect((out.properties as Record<string, unknown>).to).toEqual({
      type: 'object',
      properties: { email: { type: 'string' } },
    });
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
  });

  it('inlines into a pre-existing def that points at something we hoisted', () => {
    // `pre` isn't ours to inline, but it reaches `shared`, which is. The hoisted defs
    // don't survive the inlining, so leaving `pre` alone would dangle its ref.
    const schema = {
      type: 'object',
      properties: {
        shared: { type: 'object', properties: { email: { type: 'string' } } },
        a: { $ref: '#/properties/shared' },
        usesPre: { $ref: '#/$defs/pre' },
      },
      $defs: { pre: { type: 'array', items: { $ref: '#/properties/shared' } } },
    };
    const out = normalizeToolSchemaRefs(schema);
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
    expect((out.$defs as Record<string, unknown>).pre).toEqual({
      type: 'array',
      items: { type: 'object', properties: { email: { type: 'string' } } },
    });
  });

  it('pins a hoisted def when a pre-existing def refs it with sibling keywords', () => {
    // Same sibling ambiguity as anywhere else, so it has to pin rather than inline -
    // and pinning must still leave the hoisted def reachable.
    const schema = {
      type: 'object',
      properties: {
        shared: { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
        usesPre: { $ref: '#/$defs/pre' },
      },
      $defs: { pre: { $ref: '#/properties/shared', required: ['b'] } },
    };
    const out = normalizeToolSchemaRefs(schema);
    const refs = collectRefs(out);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
    expect((out.$defs as Record<string, { required: string[] }>).pre.required).toEqual(['b']);
  });

  it('lets a sibling ref between two kept defs through without blocking inlining', () => {
    // `b` refs `a1` with a sibling, but neither is ours, so neither was ever going to be
    // inlined. Pinning on their account would bail the schema and strand `shared`.
    const schema = {
      type: 'object',
      $defs: { a1: { type: 'string' }, b: { $ref: '#/$defs/a1', description: 'sibling' } },
      properties: {
        shared: { type: 'object', properties: { email: { type: 'string' } } },
        a: { $ref: '#/properties/shared' },
        usesB: { $ref: '#/$defs/b' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect((out.properties as Record<string, unknown>).a).toEqual({
      type: 'object',
      properties: { email: { type: 'string' } },
    });
    expect(collectRefs(out).every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
  });

  it('does not mistake an Object.prototype key for a def', () => {
    // `#/$defs/constructor` resolves through the prototype chain under `in`, which would
    // hand structuredClone a function and throw out of the whole tools/list.
    const schema = {
      type: 'object',
      properties: {
        shared: { type: 'object', properties: { email: { type: 'string' } } },
        a: { $ref: '#/properties/shared' },
        boom: { $ref: '#/$defs/constructor' },
      },
    };
    let out!: typeof schema;
    expect(() => (out = normalizeToolSchemaRefs(schema))).not.toThrow();
    expect((out.properties as Record<string, unknown>).boom).toEqual({
      $ref: '#/$defs/constructor',
    });
  });

  it('terminates on a cycle that runs through a pre-existing def', () => {
    // findCyclicDefs only sees edges between hoisted defs, so this cycle is invisible to
    // it. Termination rests on refusing to expand a name we didn't hoist.
    const schema = {
      type: 'object',
      properties: {
        shared: { type: 'object', properties: { back: { $ref: '#/$defs/pre' } } },
        a: { $ref: '#/properties/shared' },
        usesPre: { $ref: '#/$defs/pre' },
      },
      $defs: { pre: { type: 'array', items: { $ref: '#/properties/shared' } } },
    };
    const out = normalizeToolSchemaRefs(schema);
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
  });

  it('does not mutate an input that carries a pre-existing $defs', () => {
    const schema = {
      type: 'object',
      properties: {
        shared: { type: 'object', properties: { email: { type: 'string' } } },
        a: { $ref: '#/properties/shared' },
        usesPre: { $ref: '#/$defs/pre' },
      },
      $defs: { pre: { type: 'array', items: { $ref: '#/properties/shared' } } },
    };
    const snapshot = JSON.stringify(schema);
    normalizeToolSchemaRefs(schema);
    expect(JSON.stringify(schema)).toBe(snapshot);
  });

  it('is idempotent, since tools/list re-normalizes on every request', () => {
    for (const schema of [
      // inlined outright
      {
        type: 'object',
        properties: {
          from: { type: 'object', properties: { email: { type: 'string' } } },
          to: { $ref: '#/properties/from' },
        },
      },
      // pinned by recursion, so refs survive the first pass
      {
        type: 'object',
        properties: {
          body: {
            type: 'object',
            properties: { childFolders: { type: 'array', items: { $ref: '#/properties/body' } } },
          },
        },
      },
    ]) {
      const once = normalizeToolSchemaRefs(schema);
      expect(JSON.stringify(normalizeToolSchemaRefs(structuredClone(once)))).toBe(
        JSON.stringify(once)
      );
    }
  });
});

describe('installToolSchemaRefNormalization (end-to-end against the real SDK)', () => {
  it('normalizes recursive tool schemas in the tools/list response', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });

    // A self-referential schema, exactly the shape that makes the SDK emit a
    // root-relative $ref under its default conversion strategy.
    type Folder = { name?: string; childFolders?: Folder[] };
    const folder: z.ZodType<Folder> = z.lazy(() =>
      z.object({ name: z.string().optional(), childFolders: z.array(folder).optional() })
    );

    server.registerTool(
      'create-folder',
      { description: 'create', inputSchema: z.object({ body: folder }).loose() },
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
    )) as { tools: Array<{ name: string; inputSchema: unknown }> };

    const tool = result.tools.find((t) => t.name === 'create-folder')!;
    const refs = collectRefs(tool.inputSchema);
    expect(refs.length).toBeGreaterThan(0); // the recursion did produce a ref
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(tool.inputSchema, r)).toBeDefined();
  });

  it('no-ops without throwing when no tools/list handler exists', () => {
    // A fresh server with no tools registered has no tools/list handler yet, so the
    // installer must fall back gracefully rather than crash startup.
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    expect(() => installToolSchemaRefNormalization(server)).not.toThrow();
  });

  // zod 4's own conversion inlines every shared sub-schema and writes them in its own
  // dialect; tools/list should still hand out the zod 3 shape.
  it('serves zod 4 schemas in the zod 3 shape', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const timeZone = z
      .object({ dateTime: z.string(), timeZone: z.string().nullish() })
      .partial()
      .loose();
    const body = z
      .object({
        start: timeZone,
        end: timeZone,
        subject: z.string().describe('The subject.').nullish(),
        createdDateTime: z
          .string()
          .regex(/^[0-9]{4,}-[0-9]{2}-[0-9]{2}T.*$/)
          .datetime({ offset: true })
          .nullish(),
        reminderMinutes: z.number().int(),
      })
      .partial()
      .loose();
    const flag = z.boolean().describe('Shared');
    server.registerTool(
      'create-event',
      {
        description: 'create',
        inputSchema: z
          .object({ body, excludeResponse: flag.optional().describe('Exclude the response') })
          .loose(),
      },
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
    )) as { tools: Array<{ name: string; inputSchema: Record<string, unknown> }> };

    const schema = result.tools[0].inputSchema;
    const text = JSON.stringify(schema);
    expect(collectRefs(schema)).toEqual([]);
    expect(text).not.toContain('allOf');
    expect(text).not.toContain('definitions');
    expect(text).not.toContain(String(Number.MAX_SAFE_INTEGER));
    const properties = (schema.properties as Record<string, Record<string, unknown>>).body
      .properties as Record<string, Record<string, unknown>>;
    expect(properties.subject).toEqual({ type: ['string', 'null'], description: 'The subject.' });
    expect(properties.end).toEqual(properties.start);
    const created = (properties.createdDateTime.anyOf as Record<string, unknown>[])[0];
    expect(created).toEqual({
      type: 'string',
      format: 'date-time',
      pattern: '^[0-9]{4,}-[0-9]{2}-[0-9]{2}T.*$',
    });
    expect(properties.reminderMinutes).toEqual({ type: 'integer' });
    expect((schema.properties as Record<string, unknown>).excludeResponse).toEqual({
      type: 'boolean',
      description: 'Exclude the response',
    });
  });

  it('builds the same schema per parameter as zod does for the whole object', () => {
    type Folder = { name?: string; childFolders?: Folder[] };
    const folder: z.ZodType<Folder> = z.lazy(() =>
      z.object({ name: z.string().optional(), childFolders: z.array(folder).optional() })
    );
    const shared = z.object({ id: z.string() });
    const schema = z
      .object({
        body: z.object({ a: shared, b: shared, folder }),
        top: z.number().optional(),
      })
      .loose();
    const ours = toolInputJsonSchema(schema);
    const zods = z.toJSONSchema(schema, { target: 'draft-07', io: 'input', reused: 'ref' });
    expect(ours.required).toEqual(['body']);
    for (const r of collectRefs(ours)) expect(resolvePointer(ours, r)).toBeDefined();
    const served = normalizeToolSchemaRefs(ours);
    for (const r of collectRefs(served)) {
      expect(r.startsWith('#/$defs/')).toBe(true);
      expect(resolvePointer(served, r)).toBeDefined();
    }
    expect(JSON.stringify(served)).not.toContain('definitions');
    // Same tree as zod's single pass once both are normalized
    // zod's single pass leaves additionalProperties out where zod 3 said false
    const dropAdditional = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      if (!Array.isArray(node)) delete (node as Record<string, unknown>).additionalProperties;
      for (const value of Object.values(node)) dropAdditional(value);
    };
    const strip = (json: Record<string, unknown>) => {
      const rest = normalizeToolSchemaRefs(json);
      delete rest.$schema;
      dropAdditional(rest);
      return rest;
    };
    expect(strip(ours)).toEqual(strip(zods as Record<string, unknown>));
  });
});

describe('toolInputJsonSchema', () => {
  // zod 3 said additionalProperties: false for a plain z.object; zod 4 input mode says nothing
  it('keeps the unknown-key policy zod 3 advertised', () => {
    const nested = z.object({ a: z.string() });
    const strip = toolInputJsonSchema(z.object({ nested: nested.optional() }));
    expect(strip.additionalProperties).toBe(false);
    const properties = strip.properties as Record<string, Record<string, unknown>>;
    expect(properties.nested.additionalProperties).toBe(false);
    expect(toolInputJsonSchema(z.object({}).strict()).additionalProperties).toBe(false);
    expect(toolInputJsonSchema(z.object({}).loose()).additionalProperties).toBe(true);
  });
});

describe('tidyToolJsonSchema', () => {
  it('keeps an allOf around a $ref that carries a description', () => {
    const node = { description: 'x', allOf: [{ $ref: '#/$defs/def0' }] };
    tidyToolJsonSchema(node);
    expect(node).toEqual({ description: 'x', allOf: [{ $ref: '#/$defs/def0' }] });
  });

  it('unwraps a bare allOf around a $ref', () => {
    const node: Record<string, unknown> = { allOf: [{ $ref: '#/$defs/def0' }] };
    tidyToolJsonSchema(node);
    expect(node).toEqual({ $ref: '#/$defs/def0' });
  });

  it('leaves an allOf alone when its keys clash with the parent', () => {
    const node = { type: 'string', allOf: [{ type: 'number' }] };
    tidyToolJsonSchema(node);
    expect(node).toEqual({ type: 'string', allOf: [{ type: 'number' }] });
  });

  it('only folds nullable primitives', () => {
    const node = { anyOf: [{ type: 'string', pattern: 'x' }, { type: 'null' }] };
    tidyToolJsonSchema(node);
    expect(node).toEqual({ anyOf: [{ type: 'string', pattern: 'x' }, { type: 'null' }] });
  });
});

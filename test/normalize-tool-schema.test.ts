import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  normalizeToolSchemaRefs,
  installToolSchemaRefNormalization,
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

  it('rewrites a root-relative dedup ref into #/$defs and preserves resolution', () => {
    // `to` is emitted inline once and referenced by object identity elsewhere.
    const schema = {
      type: 'object',
      properties: {
        from: { type: 'object', properties: { email: { type: 'string' } } },
        to: { $ref: '#/properties/from' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    const refs = collectRefs(out);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
    // The extracted def is the original `from` schema.
    const to = (out.properties as Record<string, { $ref: string }>).to;
    expect(resolvePointer(out, to.$ref)).toMatchObject({
      type: 'object',
      properties: { email: { type: 'string' } },
    });
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

  it('handles nested targets without leaving dangling refs', () => {
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
    const refs = collectRefs(out);
    expect(refs.length).toBeGreaterThanOrEqual(2);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
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

  it('collapses multiple refs to the same target onto one def', () => {
    const schema = {
      type: 'object',
      properties: {
        from: { type: 'object', properties: { email: { type: 'string' } } },
        to: { $ref: '#/properties/from' },
        cc: { $ref: '#/properties/from' },
      },
    };
    const out = normalizeToolSchemaRefs(schema);
    expect(Object.keys(out.$defs as object)).toHaveLength(1);
    const props = out.properties as Record<string, { $ref: string }>;
    expect(props.to.$ref).toBe(props.cc.$ref);
    expect(props.to.$ref.startsWith('#/$defs/')).toBe(true);
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
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
    const refs = collectRefs(out);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
    expect(
      resolvePointer(out, (out.properties as Record<string, { $ref: string }>).ref.$ref)
    ).toMatchObject({ properties: { v: { type: 'string' } } });
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
    const refs = collectRefs(out);
    expect(refs.every((r) => r.startsWith('#/$defs/'))).toBe(true);
    for (const r of refs) expect(resolvePointer(out, r)).toBeDefined();
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
    // Every $defs ref we introduce must resolve: we never manufacture a dangling
    // def ref. A pre-existing unresolvable ref is left exactly as-is (not "fixed"
    // into a missing $defs target).
    for (const r of collectRefs(out).filter((x) => x.startsWith('#/$defs/'))) {
      expect(resolvePointer(out, r)).toBeDefined();
    }
    const props = out.properties as Record<string, { $ref: string }>;
    expect(props.good.$ref.startsWith('#/$defs/')).toBe(true);
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
    // The pre-existing def0 must survive intact...
    expect(defs.def0).toEqual({ const: 'sentinel' });
    // ...and the newly hoisted schema must land under a different key.
    const toRef = (out.properties as Record<string, { $ref: string }>).to.$ref;
    expect(toRef).not.toBe('#/$defs/def0');
    for (const r of collectRefs(out)) expect(resolvePointer(out, r)).toBeDefined();
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
      { description: 'create', inputSchema: z.object({ body: folder }).passthrough() },
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
});

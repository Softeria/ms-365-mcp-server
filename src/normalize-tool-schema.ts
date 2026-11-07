// The MCP SDK converts each tool's zod inputSchema to JSON Schema itself, with options we
// can't reach. Under zod 4 that conversion inlines every shared sub-schema, which blows
// the Graph bodies up (create-sharepoint-list ~12x). So tools/list re-converts each
// schema here with shared sub-schemas as refs, then rewrites those refs.
//
// Why serve the zod 3 shape on zod 4 at all: MCP clients keep tripping over schema details
// (Pydantic #28, Claude via Azure #181, Kimi #458/#571, Open Cowork #638, Gemini #757), and
// the bytes count against client budgets (#655). Keeping what clients already handle was
// the cheapest way through the migration. Size and refs are the part that matters;
// tidyToolJsonSchema and the additionalProperties: false restore are cosmetic parity and
// can go if zod 4's own dialect turns out fine with clients.
//
// Two clients want opposite things: Kimi/Moonshot rejects any `$ref` not starting with
// `#/$defs/` (#571), while Open Cowork and the MCP Inspector form can't resolve
// `#/$defs/` at all (#638). Only a schema with no `$ref` left keeps both happy, so we
// hoist into `$defs` and then inline right back out.
//
// Recursive Graph schemas (OneNote sections, mail and contact folder trees) can't be
// inlined at all, so those keep their refs and stay broken for #638. Same when the
// expansion would more than double the schema - not worth the bytes.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from './logger.js';

type JsonSchema = Record<string, unknown>;

// zod 4 writes `.regex(graphPattern).datetime()` (and `.guid()`) as an allOf of both
// patterns, and its own date-time pattern is a ~400 character leap-year regex. `format`
// already names the check, so keep only Graph's pattern, as zod 3 did. Validation still
// runs both. `.int()` also gains safe-integer bounds nobody needs to read.
function dropZodOnlyChecks(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) dropZodOnlyChecks(item);
    return;
  }
  const record = node as Record<string, unknown>;
  const allOf = record.allOf;
  if (
    typeof record.format === 'string' &&
    Array.isArray(allOf) &&
    allOf.length > 0 &&
    allOf.every(
      (item) =>
        isPlainObject(item) && Object.keys(item).every((key) => key === 'type' || key === 'pattern')
    )
  ) {
    record.pattern = (allOf[0] as JsonSchema).pattern;
    delete record.allOf;
  }
  if (record.type === 'integer') {
    if (record.maximum === Number.MAX_SAFE_INTEGER) delete record.maximum;
    if (record.minimum === Number.MIN_SAFE_INTEGER) delete record.minimum;
  }
  for (const value of Object.values(record)) dropZodOnlyChecks(value);
}

// zod 4 leaves additionalProperties out of input schemas for a plain z.object, which strips
// unknown keys. zod 3 said false, as it still does for .strict(); keep saying it.
function closesUnknownKeys(schema: unknown): boolean {
  const def = (schema as { _zod?: { def?: { type?: string; catchall?: unknown } } })._zod?.def;
  return def?.type === 'object' && def.catchall === undefined;
}

/**
 * JSON Schema for a zod schema, converted the way the SDK does it (draft-07, input side)
 * but with `reused` under our control. 'ref' lets normalizeToolSchemaRefs decide what to
 * inline; 'inline' gives one self-contained schema with refs only where a schema recurses.
 */
export function zodToToolJsonSchema(
  schema: z.core.$ZodType,
  reused: 'ref' | 'inline' = 'ref'
): JsonSchema {
  const json = z.toJSONSchema(schema, {
    target: 'draft-07',
    io: 'input',
    unrepresentable: 'any',
    reused,
    override: ({ zodSchema, jsonSchema }) => {
      if (closesUnknownKeys(zodSchema)) jsonSchema.additionalProperties = false;
    },
  }) as JsonSchema;
  dropZodOnlyChecks(json);
  return json;
}

// zod 4 converts the big Graph bodies ~15x slower than zod 3 did, and HTTP mode builds the
// tools again for every request. The parameter schemas underneath are the same objects
// each time (generated client, memoized lenient bodies), so convert those once.
const parameterJsonCache = new WeakMap<z.core.$ZodType, JsonSchema>();

function parameterJson(schema: z.core.$ZodType): JsonSchema {
  let json = parameterJsonCache.get(schema);
  if (!json) {
    json = zodToToolJsonSchema(schema);
    delete json.$schema;
    parameterJsonCache.set(schema, json);
  }
  return structuredClone(json);
}

// A parameter converted on its own refers to itself from `#`. Anchor that under the
// parameter's place in the tool schema, where normalizeToolSchemaRefs can find it.
function anchorRefs(node: unknown, base: string): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) anchorRefs(item, base);
    return;
  }
  const record = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#')) {
      record.$ref = `#${base}${value.slice(1)}`;
    } else {
      anchorRefs(value, base);
    }
  }
}

/**
 * The tool's JSON Schema, put together from per-parameter conversions instead of one
 * zod pass over the whole object. Same result, but the parameters come from the cache.
 */
// Takes the core type: the SDK turns a raw-shape tool into a zod mini object
export function toolInputJsonSchema(schema: z.core.$ZodObject): JsonSchema {
  const { shape, catchall } = schema._zod.def;
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const [name, parameter] of Object.entries(shape)) {
    const json = parameterJson(parameter);
    anchorRefs(json, `/properties/${escapePointer(name)}`);
    properties[name] = json;
    if (inputOptin(parameter) === undefined) required.push(name);
  }
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    // .loose() tools take flattened body fields at the top level (#569). A tool with no
    // parameters says nothing, like the SDK's empty schema did.
    ...(catchall === undefined && Object.keys(shape).length === 0
      ? {}
      : { additionalProperties: !(catchall === undefined || catchall._zod.def.type === 'never') }),
  };
}

// zod's own rule for `required` in an input schema: a transform or catch in front makes a
// key look optional at runtime, so look past it
function inputOptin(schema: z.core.$ZodType): string | undefined {
  const def = schema._zod.def as {
    type: string;
    in?: z.core.$ZodType;
    out?: z.core.$ZodType;
    innerType?: z.core.$ZodType;
  };
  if (def.type === 'pipe' && def.in?._zod.def.type === 'transform' && def.out) {
    return inputOptin(def.out);
  }
  if (def.type === 'catch' && def.innerType) return inputOptin(def.innerType);
  return schema._zod.optin;
}

// What zod 4 says differently from zod 3 once the refs are inlined, folded back to the
// zod 3 shape. Smaller, and clients that skip allOf (Gemini) see the type again:
// - a described shared schema is `{description, allOf: [schema]}`; the outer description
//   wins, as it did before
// - a nullable primitive is `anyOf: [{type, description}, {type: 'null'}]`, not
//   `type: [type, 'null']`
// - an open object is `additionalProperties: {}`, a record also gets
//   `propertyNames: {type: 'string'}`, which every JSON key passes anyway
export function tidyToolJsonSchema(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) tidyToolJsonSchema(item);
    return;
  }
  const record = node as Record<string, unknown>;
  for (const value of Object.values(record)) tidyToolJsonSchema(value);

  const allOf = record.allOf;
  if (Array.isArray(allOf) && allOf.length === 1 && isPlainObject(allOf[0])) {
    const only = allOf[0];
    const clashes = Object.keys(only).filter((key) => key !== 'description' && key in record);
    // Next to a $ref, draft-07 would ignore the description, so it has to stay wrapped
    const keepsWrapper = '$ref' in only && Object.keys(record).length > 1;
    if (clashes.length === 0 && !keepsWrapper) {
      delete record.allOf;
      for (const [key, value] of Object.entries(only)) {
        if (!(key in record)) record[key] = value;
      }
    }
  }

  const anyOf = record.anyOf;
  if (Array.isArray(anyOf) && anyOf.length === 2 && !('type' in record)) {
    const [value, nullable] = anyOf;
    if (
      isPlainObject(value) &&
      typeof value.type === 'string' &&
      Object.keys(value).every((key) => key === 'type' || key === 'description') &&
      isPlainObject(nullable) &&
      Object.keys(nullable).length === 1 &&
      nullable.type === 'null'
    ) {
      delete record.anyOf;
      record.type = [value.type, 'null'];
      if (value.description !== undefined && record.description === undefined) {
        record.description = value.description;
      }
    }
  }

  const extra = record.additionalProperties;
  if (isPlainObject(extra) && Object.keys(extra).length === 0) {
    record.additionalProperties = true;
  }
  const names = record.propertyNames;
  if (isPlainObject(names) && Object.keys(names).length === 1 && names.type === 'string') {
    delete record.propertyNames;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function escapePointer(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

// Past this much growth, keep the $ref form instead.
const MAX_INLINE_GROWTH = 2;

function unescapePointer(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

// We only normalize internal, root-relative refs (`#/...`). A bare `#` (a
// whole-document self-ref) can't occur here: the SDK wraps every tool inputSchema in
// `z.object({...})`, so recursion always resolves to a nested path, never the root.
function isBadRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('#/') && !value.startsWith('#/$defs/');
}

function collectBadRefTargets(node: unknown, targets: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectBadRefTargets(item, targets);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && isBadRef(value)) {
      targets.add(value.slice(1)); // strip leading '#', keep the JSON pointer
    } else {
      collectBadRefTargets(value, targets);
    }
  }
}

interface Slot {
  parent: Record<string, unknown> | unknown[];
  key: string | number;
  obj: unknown;
}

function resolvePointer(root: unknown, pointer: string): Slot | null {
  const tokens = pointer.split('/').slice(1).map(unescapePointer);
  if (tokens.length === 0) return null; // root ('#') is never a hoist target
  let parent: Record<string, unknown> | unknown[] | null = null;
  let key: string | number = '';
  let cur: unknown = root;
  for (const token of tokens) {
    if (!cur || typeof cur !== 'object') return null;
    parent = cur as Record<string, unknown> | unknown[];
    key = Array.isArray(cur) ? Number(token) : token;
    cur = (cur as Record<string, unknown>)[key as never];
    if (cur === undefined) return null;
  }
  return parent === null ? null : { parent, key, obj: cur };
}

function repointRefs(node: unknown, nameFor: Map<string, string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) repointRefs(item, nameFor);
    return;
  }
  const record = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === '$ref' && isBadRef(value)) {
      const name = nameFor.get(value.slice(1));
      if (name) record.$ref = `#/$defs/${name}`;
    } else {
      repointRefs(value, nameFor);
    }
  }
}

// Own keys only. A plain `in` reaches Object.prototype, so `#/$defs/constructor` would
// look like a def we hoisted and hand structuredClone a function.
function hasDef(defs: Record<string, unknown>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(defs, name);
}

function defRefName(value: unknown): string | null {
  const prefix = '#/$defs/';
  return typeof value === 'string' && value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

function collectDefRefNames(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectDefRefNames(item, out);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    const name = key === '$ref' ? defRefName(value) : null;
    if (name === null) collectDefRefNames(value, out);
    else out.add(name);
  }
}

// draft-07 (what the SDK declares) ignores keywords next to a `$ref`, 2020-12 conjoins
// them. Inlining would have to pick one, and either pick changes what some schema
// accepts - so leave those as refs. zod-to-json-schema emits bare `{$ref}` anyway.
function collectSiblingRefNames(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectSiblingRefNames(item, out);
    return;
  }
  const record = node as Record<string, unknown>;
  const name = defRefName(record.$ref);
  if (name !== null && Object.keys(record).length > 1) out.add(name);
  for (const value of Object.values(record)) collectSiblingRefNames(value, out);
}

// Cyclic means the def can reach itself. Graph's recursive entities (a mail folder whose
// childFolders are mail folders) land here, plain reuse (start and end sharing
// dateTimeTimeZone) does not. Few enough defs that the naive walk beats building SCCs.
function findCyclicDefs(defs: Record<string, unknown>): Set<string> {
  const edges = new Map<string, Set<string>>();
  for (const [name, value] of Object.entries(defs)) {
    const out = new Set<string>();
    collectDefRefNames(value, out);
    edges.set(name, out);
  }

  const cyclic = new Set<string>();
  for (const start of edges.keys()) {
    const seen = new Set<string>();
    const stack = [...(edges.get(start) ?? [])];
    while (stack.length > 0) {
      const next = stack.pop()!;
      if (next === start) {
        cyclic.add(start);
        break;
      }
      if (seen.has(next)) continue;
      seen.add(next);
      for (const onward of edges.get(next) ?? []) stack.push(onward);
    }
  }
  return cyclic;
}

// Swap every `#/$defs/` ref to an inlinable def for that def's expansion. Pinned defs,
// and defs we didn't hoist ourselves, are left alone.
function inlineDefRefs(
  node: unknown,
  defs: Record<string, unknown>,
  pinned: Set<string>,
  expand: (name: string) => unknown
): unknown {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((item) => inlineDefRefs(item, defs, pinned, expand));

  const record = node as Record<string, unknown>;
  const name = defRefName(record.$ref);
  if (name !== null && hasDef(defs, name) && !pinned.has(name)) {
    const siblings: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key !== '$ref') siblings[key] = inlineDefRefs(value, defs, pinned, expand);
    }
    return { ...(structuredClone(expand(name)) as Record<string, unknown>), ...siblings };
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = inlineDefRefs(value, defs, pinned, expand);
  }
  return out;
}

/**
 * Rewrite a tool inputSchema so it carries no internal `$ref`, except where a
 * recursive schema makes that impossible - those keep a `#/$defs/`-anchored ref.
 * Returns the input untouched when it has no internal refs at all (the common case),
 * so only the tools with recursive/shared Graph schemas pay any cost.
 */
export function normalizeToolSchemaRefs<T extends JsonSchema>(schema: T): T {
  const targets = new Set<string>();
  collectBadRefTargets(schema, targets);
  if (targets.size === 0) return schema;

  const clone = structuredClone(schema) as JsonSchema;

  // Resolve every target from the un-mutated clone first: capturing the object
  // references up front keeps nested targets valid even after we replace their
  // enclosing slot with a $ref. Names are assigned only to targets that resolve, so
  // an (unexpected) unresolvable pointer is left untouched rather than repointed to a
  // missing $defs entry. Sorted for stable, reproducible output.
  const slots = new Map<string, Slot>();
  for (const pointer of [...targets].sort()) {
    const slot = resolvePointer(clone, pointer);
    if (slot) slots.set(pointer, slot);
  }
  if (slots.size === 0) return schema;

  // Assign def names that can't clash with a pre-existing $defs key. The SDK's `root`
  // strategy never emits $defs today, but we merge existing defs below, so guard the
  // names too rather than rely on that (a clash would silently repoint a valid ref).
  const takenNames = new Set(
    clone.$defs && typeof clone.$defs === 'object' ? Object.keys(clone.$defs) : []
  );
  const nameFor = new Map<string, string>();
  let index = 0;
  for (const pointer of slots.keys()) {
    let name = `def${index++}`;
    while (takenNames.has(name)) name = `def${index++}`;
    takenNames.add(name);
    nameFor.set(pointer, name);
  }

  const defs: Record<string, unknown> = {};
  for (const [pointer, slot] of slots) {
    defs[nameFor.get(pointer)!] = slot.obj;
  }
  for (const [pointer, slot] of slots) {
    (slot.parent as Record<string, unknown>)[slot.key as never] = {
      $ref: `#/$defs/${nameFor.get(pointer)}`,
    } as never;
  }

  repointRefs(clone, nameFor);
  for (const name of Object.keys(defs)) repointRefs(defs[name], nameFor);

  // zod 4 (draft-07) parks shared schemas under `definitions`, per parameter. Once all of
  // a block's entries are hoisted it holds nothing but stubs pointing at $defs.
  const definitionOwners = new Set<string>();
  for (const pointer of slots.keys()) {
    const match = /^(.*)\/definitions\/[^/]+$/.exec(pointer);
    if (match) definitionOwners.add(match[1]);
  }
  for (const owner of definitionOwners) {
    const holder = owner === '' ? clone : resolvePointer(clone, owner)?.obj;
    const block = isPlainObject(holder) ? holder.definitions : undefined;
    if (
      isPlainObject(holder) &&
      isPlainObject(block) &&
      Object.keys(block).every((name) => slots.has(`${owner}/definitions/${escapePointer(name)}`))
    ) {
      delete holder.definitions;
    }
  }

  // Split off the defs we didn't hoist. They stay refs either way, so the walk below
  // treats them as their own document instead of reaching them from the root.
  const existingDefs = (clone.$defs as Record<string, unknown> | undefined) ?? {};
  delete clone.$defs;

  // A cycle keeps a ref no matter what we do, so the schema is broken for #638 either
  // way - expanding the rest of its defs would just cost bytes for nothing.
  const pinned = findCyclicDefs(defs);
  collectSiblingRefNames(clone, pinned);
  for (const value of Object.values(defs)) collectSiblingRefNames(value, pinned);
  for (const value of Object.values(existingDefs)) collectSiblingRefNames(value, pinned);
  // Only a def we hoisted can force our hand. Pinning a kept def's name would bail the
  // whole schema for nothing, since inlining was never on the table for it.
  for (const name of [...pinned]) {
    if (!hasDef(defs, name)) pinned.delete(name);
  }
  if (pinned.size > 0) {
    clone.$defs = { ...existingDefs, ...defs };
    return clone as T;
  }

  const memo = new Map<string, unknown>();
  const expand = (name: string): unknown => {
    if (memo.has(name)) return memo.get(name);
    const value = inlineDefRefs(defs[name], defs, pinned, expand);
    memo.set(name, value);
    return value;
  };

  // inlineDefRefs rebuilds rather than mutates, so `clone` can still be the fallback
  const inlined = inlineDefRefs(clone, defs, pinned, expand) as JsonSchema;
  // A kept def can still point at one we hoisted, and `defs` doesn't come along here -
  // so inline those out too rather than hand back a ref to a def that isn't there.
  if (Object.keys(existingDefs).length > 0) {
    inlined.$defs = Object.fromEntries(
      Object.entries(existingDefs).map(([name, value]) => [
        name,
        inlineDefRefs(value, defs, pinned, expand),
      ])
    );
  }
  clone.$defs = { ...existingDefs, ...defs };

  // Some schemas lean on their refs hard - create-sharepoint-list-item hangs 181 ref
  // sites off 59 defs, so expanding it all blows the tool up ~6x. Past a doubling the
  // bytes aren't worth the reach.
  const grewTooMuch =
    JSON.stringify(inlined).length > JSON.stringify(clone).length * MAX_INLINE_GROWTH;
  return (grewTooMuch ? clone : inlined) as T;
}

// Decorate the SDK's tools/list handler so every emitted inputSchema is passed through
// normalizeToolSchemaRefs. The SDK hard-codes its Zod->JSON-Schema options, so we hand it
// our own conversion through zod's per-schema `_zod.toJSONSchema` override, which the
// converter checks before doing any work of its own. 'tools/list' is the stable MCP
// protocol method the low-level Server keys its handler by; we grab the existing handler
// and delegate to it so all of McpServer's listing behavior is preserved. Falls back to a
// no-op (with a warning) if the SDK internals move.
export function installToolSchemaRefNormalization(server: McpServer): void {
  const lowLevel = server.server;
  const handlers = (
    lowLevel as unknown as {
      _requestHandlers?: Map<
        string,
        (request: unknown, extra: unknown) => Promise<{ tools?: Array<{ inputSchema?: unknown }> }>
      >;
    }
  )._requestHandlers;
  const original = handlers?.get('tools/list');
  if (!original) {
    logger.warn('Skipping tool-schema $ref normalization: tools/list handler not found');
    return;
  }
  const registered = (
    server as unknown as { _registeredTools?: Record<string, { inputSchema?: unknown }> }
  )._registeredTools;
  lowLevel.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    for (const [name, tool] of Object.entries(registered ?? {})) {
      if (tool.inputSchema instanceof z.core.$ZodObject) useOwnConversion(name, tool.inputSchema);
    }
    const result = await original(request, extra);
    for (const tool of result.tools ?? []) {
      if (tool.inputSchema && typeof tool.inputSchema === 'object') {
        tool.inputSchema = normalizeToolSchemaRefs(tool.inputSchema as JsonSchema);
        tidyToolJsonSchema(tool.inputSchema);
      }
    }
    return result;
  });
}

function useOwnConversion(name: string, schema: z.core.$ZodObject): void {
  const internals = schema._zod as { toJSONSchema?: () => JsonSchema | undefined };
  if (internals.toJSONSchema) return;
  internals.toJSONSchema = () => {
    try {
      return toolInputJsonSchema(schema);
    } catch (error) {
      // Undefined lets zod convert it the slow way rather than lose the tool
      logger.warn(`Could not convert the input schema of ${name}: ${error}`);
      return undefined;
    }
  };
}

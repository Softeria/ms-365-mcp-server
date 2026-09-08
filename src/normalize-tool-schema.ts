// The MCP SDK converts each tool's Zod inputSchema to JSON Schema with
// zod-to-json-schema's default `$refStrategy: 'root'`. That emits internal
// `$ref`s as root-relative JSON pointers (e.g. `#/properties/body/properties/from`)
// wherever a sub-schema recurses OR is reused by object identity. The SDK hard-codes
// the conversion options, so we rewrite its output here.
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
import logger from './logger.js';

type JsonSchema = Record<string, unknown>;

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

// Decorate the SDK's tools/list handler so every emitted inputSchema is passed
// through normalizeToolSchemaRefs. The SDK hard-codes its Zod->JSON-Schema options,
// so this is the only place to enforce #/$defs/-anchored refs. 'tools/list' is the
// stable MCP protocol method the low-level Server keys its handler by; we grab the
// existing handler and delegate to it so all of McpServer's listing behavior is
// preserved. Falls back to a no-op (with a warning) if the SDK internals move.
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
  lowLevel.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const result = await original(request, extra);
    for (const tool of result.tools ?? []) {
      if (tool.inputSchema && typeof tool.inputSchema === 'object') {
        tool.inputSchema = normalizeToolSchemaRefs(tool.inputSchema as JsonSchema);
      }
    }
    return result;
  });
}

// The MCP SDK converts each tool's Zod inputSchema to JSON Schema with
// zod-to-json-schema's default `$refStrategy: 'root'`. That emits internal
// `$ref`s as root-relative JSON pointers (e.g. `#/properties/body/properties/from`)
// wherever a sub-schema recurses OR is reused by object identity. Strict
// JSON-Schema backends (e.g. Kimi/Moonshot) reject any `$ref` that does not start
// with `#/$defs/`, so they refuse the whole tools/list. The SDK hard-codes the
// conversion options, so we normalize its output here instead: hoist every
// referenced sub-schema into a top-level `$defs` and repoint the refs. This is
// content-preserving (refs still resolve to the same schema) and keeps the payload
// compact, unlike inlining. See issue #571.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import logger from './logger.js';

type JsonSchema = Record<string, unknown>;

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

/**
 * Rewrite a tool inputSchema so every internal `$ref` is anchored under `#/$defs/`.
 * Returns the input untouched when it already complies (the common case), so only
 * the handful of tools with recursive/shared Graph schemas pay any cost.
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

  const existingDefs = (clone.$defs as Record<string, unknown> | undefined) ?? {};
  clone.$defs = { ...existingDefs, ...defs };
  return clone as T;
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

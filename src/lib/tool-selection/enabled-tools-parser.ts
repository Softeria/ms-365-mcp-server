/**
 * Enabled-tools text parser + per-request memoization (plan 05-04, D-20).
 *
 * Transforms `tenants.enabled_tools` text into a frozen `ReadonlySet<string>`
 * of tool aliases. Construction order (CONTEXT.md §Specifics):
 *   1. Start with empty Set.
 *   2. If ANY selector in the list starts with `+`, seed from
 *      `presetFor(preset_version)` — this is the "additive" mode.
 *      Otherwise the list replaces any default preset (replacement mode).
 *   3. Apply each selector additively (workload expansion / op add /
 *      preset expansion).
 *   4. Freeze the Set.
 *   5. (Caller) Memoize per-request via the `ensureEnabledToolsSet` helper.
 *
 * Defaults (D-20):
 *   - `enabled_tools === null` → return `presetFor(preset_version)` (default
 *     essentials-v1 for fresh tenants).
 *   - `enabled_tools === ''`   → return an empty Set (explicit no-tools;
 *     equivalent to disabling every tool for the tenant).
 *
 * Per-request memoization uses a `WeakMap<Request, ReadonlySet<string>>`
 * keyed on the express `Request` object. This prevents re-parsing if the
 * middleware chain calls `ensureEnabledToolsSet` multiple times within a
 * single request (e.g. loadTenant + a downstream handler).
 *
 * Threat refs:
 *   - T-05-08 (cross-tenant leakage): output Set is frozen; WeakMap key is
 *     the per-request Request object; no shared global mutation. Two
 *     concurrent requests for the same tenant receive their own Sets.
 *   - T-05-08b (WeakMap poisoning): WeakMap keys are Request objects which
 *     Express allocates fresh per incoming connection; cross-request
 *     poisoning is impossible by construction.
 */
import type { Request } from 'express';
import { parseSelectorList, type Selector } from './selector-ast.js';
import { presetFor } from './preset-loader.js';
import { getGraphRegistryAliases, getWorkloadPrefixes } from './registry-validator.js';

const memo = new WeakMap<Request, ReadonlySet<string>>();

/**
 * Per-request memoized entry-point. Returns the same frozen Set for a given
 * Request object regardless of how many times the caller invokes this
 * helper. Use from loadTenant middleware after the DB SELECT.
 */
export function ensureEnabledToolsSet(
  req: Request,
  enabledTools: string | null,
  presetVersion: string
): ReadonlySet<string> {
  const cached = memo.get(req);
  if (cached) return cached;
  const set = computeEnabledToolsSet(enabledTools, presetVersion);
  memo.set(req, set);
  return set;
}

/**
 * Pure expander: `(text, presetVersion) → frozen Set`. Exposed so admin
 * PATCH validation + dispatch-guard tests can resolve a Set without
 * manufacturing a fake Request.
 */
export function computeEnabledToolsSet(
  text: string | null,
  presetVersion: string
): ReadonlySet<string> {
  // NULL enabled_tools → use the tenant's pinned preset (D-20 default).
  if (text === null) {
    return presetFor(presetVersion);
  }

  // Empty / whitespace-only string → explicit no-tools (D-20 Claude's
  // discretion). Fail-closed default; intentional "disable all tools" path.
  if (text.trim() === '') {
    return Object.freeze(new Set<string>());
  }

  const selectors: Selector[] = parseSelectorList(text);

  // Construction step 2: any `+...` selector triggers preset seeding.
  const hasAdditive = selectors.some(
    (s) =>
      s.kind === 'additive-workload' || s.kind === 'additive-op' || s.kind === 'additive-preset'
  );

  const out = new Set<string>();
  if (hasAdditive) {
    for (const op of presetFor(presetVersion)) {
      out.add(op);
    }
  }

  // Construction step 3: apply each selector additively.
  for (const sel of selectors) {
    expandSelectorInto(sel, out);
  }

  // Construction step 4: freeze.
  return Object.freeze(out);
}

function expandSelectorInto(sel: Selector, out: Set<string>): void {
  switch (sel.kind) {
    case 'preset':
    case 'additive-preset': {
      for (const op of presetFor(sel.value)) {
        out.add(op);
      }
      return;
    }
    case 'workload':
    case 'additive-workload': {
      const workloadPrefixes = getWorkloadPrefixes();
      if (!workloadPrefixes.has(sel.value)) {
        // Unknown workload → no-op. The admin PATCH validator
        // (registry-validator.validateSelectors) rejects these before
        // they ever land in tenants.enabled_tools; at parse time we
        // silently drop unknowns rather than throw so a stale DB row
        // never hard-fails dispatch.
        return;
      }
      for (const alias of getGraphRegistryAliases()) {
        if (extractWorkloadPrefix(alias) === sel.value) {
          out.add(alias);
        }
      }
      return;
    }
    case 'op':
    case 'additive-op': {
      // Trust the op name verbatim. Admin PATCH validation rejects
      // unknown ops before they persist; dispatch (checkDispatch) does
      // a Set.has check at invocation time that re-verifies the alias
      // is in the registry indirectly (via registerGraphTools' gate).
      out.add(sel.value);
      return;
    }
  }
}

/**
 * Workload-prefix extractor — mirror of the helper in registry-validator
 * but inlined here to avoid a circular import. Both modules derive the
 * same classification (first path segment after __beta__ strip).
 */
function extractWorkloadPrefix(alias: string): string {
  const stripped = alias.startsWith('__beta__') ? alias.slice('__beta__'.length) : alias;
  const dash = stripped.indexOf('-');
  const dot = stripped.indexOf('.');
  const dashIdx = dash === -1 ? Infinity : dash;
  const dotIdx = dot === -1 ? Infinity : dot;
  const cutoff = Math.min(dashIdx, dotIdx);
  return cutoff === Infinity ? stripped : stripped.slice(0, cutoff);
}

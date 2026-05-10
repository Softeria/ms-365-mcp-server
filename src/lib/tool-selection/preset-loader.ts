/**
 * Preset loader (plan 05-03 + 05.1-07 extension + 07-02 discovery surface).
 *
 * Re-exports the compile-time-generated preset sets plus a version-indexed
 * resolver. Runtime callers MUST go through this file rather than importing
 * generated-index.ts directly — the resolver layer stays stable so future
 * plans can add `essentials-v2` / per-product-v2 (or swap out the compile
 * strategy) without touching consumers.
 *
 * Threat ref T-05-06 + T-5.1-04 (elevation via typo-expanded preset):
 * `presetFor` returns an empty frozen Set when the requested version is
 * unknown. That is the fail-closed default — an unknown preset_version
 * means the tenant gets ZERO tools rather than accidentally falling back
 * to a wider surface.
 *
 * Preset catalog:
 *   - `discovery-v1`          — Phase 7 discovery-mode meta/app surface (28 aliases).
 *   - `essentials-v1`         — legacy cross-product Graph default (150 ops).
 *   - `powerbi-essentials`    — Plan 05.1-07, __powerbi__* admin read-first.
 *   - `pwrapps-essentials`    — Plan 05.1-07, __pwrapps__* admin read-first.
 *   - `pwrauto-essentials`    — Plan 05.1-07, __pwrauto__* admin read-first.
 *   - `exo-essentials`        — Plan 05.1-07, __exo__* REST v2 admin subset.
 *   - `sp-admin-essentials`   — Plan 05.1-07, __spadmin__* tenant admin subset.
 */
import {
  DISCOVERY_V1_OPS,
  ESSENTIALS_V1_OPS,
  POWERBI_ESSENTIALS_OPS,
  PWRAPPS_ESSENTIALS_OPS,
  PWRAUTO_ESSENTIALS_OPS,
  EXO_ESSENTIALS_OPS,
  SP_ADMIN_ESSENTIALS_OPS,
  PRESET_VERSIONS,
} from '../../presets/generated-index.js';

export {
  DISCOVERY_V1_OPS,
  ESSENTIALS_V1_OPS,
  POWERBI_ESSENTIALS_OPS,
  PWRAPPS_ESSENTIALS_OPS,
  PWRAUTO_ESSENTIALS_OPS,
  EXO_ESSENTIALS_OPS,
  SP_ADMIN_ESSENTIALS_OPS,
};

/**
 * Canonical default preset_version for fresh tenants created through
 * supported create paths. Phase 7 Plan 07-02 changes this to the
 * discovery-mode meta surface; existing tenants are not migrated.
 */
export const DEFAULT_PRESET_VERSION = 'discovery-v1';

/**
 * All known preset version literals as a frozen readonly tuple. Consumers
 * (admin PATCH validator, registry-validator, preset-picker UI) should
 * source the canonical list from here rather than hard-coding strings —
 * ensures the single generated-index.ts stays the one place where preset
 * names are declared.
 */
export const KNOWN_PRESET_VERSIONS: readonly string[] = Object.freeze([
  'discovery-v1',
  'essentials-v1',
  'powerbi-essentials',
  'pwrapps-essentials',
  'pwrauto-essentials',
  'exo-essentials',
  'sp-admin-essentials',
]);

/**
 * Resolve a preset name to its frozen op set. Returns an empty frozen Set
 * on unknown input (fail-closed). Callers treating this as `Set.has()` will
 * see zero hits rather than an unexpected wide fallback.
 *
 * Resolution walks the compile-time-emitted PRESET_VERSIONS map, so the
 * 6 presets (1 legacy + 5 per-product) are all available through a single
 * entry point. Future plans adding `essentials-v2` or per-product-v2 just
 * drop a JSON into src/presets/ and a spec entry in compile-preset.mjs —
 * this function needs no edit.
 */
export function presetFor(version: string): ReadonlySet<string> {
  const found = PRESET_VERSIONS.get(version);
  return found ?? EMPTY_PRESET;
}

// Module-level frozen empty set so presetFor never allocates per-call and
// downstream equality / identity checks (e.g. `=== EMPTY_PRESET`) are cheap.
const EMPTY_PRESET: ReadonlySet<string> = Object.freeze(new Set<string>());

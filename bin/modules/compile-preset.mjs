/**
 * Plan 05-03 + 05.1-07 — essentials preset compile step.
 *
 * Compiles src/presets/*.json (currently 7 presets: the Phase 7
 * `discovery-v1` meta/app surface, the legacy `essentials-v1` cross-product
 * preset, plus 5 per-product essentials added in plan 05.1-07) into a
 * single emitted src/presets/generated-index.ts.
 *
 * The compile step is the typo-resistance contract (D-19, T-05-06 +
 * T-5.1-04 mitigation): every modern alias in every human-editable preset
 * JSON is checked against the fresh tool registry extracted from
 * src/generated/client.ts. The legacy essentials-v1 preset and product
 * presets during default non-full-coverage generation are the exceptions:
 * they preserve their frozen legacy/product alias sets when the current
 * generated registry intentionally omits those alias families. Product
 * presets remain strict when their product registry is present.
 *
 * Presets compiled:
 *   - discovery-v1         (28 meta/app aliases — Plan 07-02)
 *   - essentials-v1        (150 ops — Plan 05-03, cross-product Graph default)
 *   - powerbi-essentials    (plan 05.1-07, __powerbi__* subset)
 *   - pwrapps-essentials    (plan 05.1-07, __pwrapps__* subset)
 *   - pwrauto-essentials    (plan 05.1-07, __pwrauto__* subset)
 *   - exo-essentials        (plan 05.1-07, __exo__* subset)
 *   - sp-admin-essentials   (plan 05.1-07, __spadmin__* subset)
 *
 * Per-preset contract (all six):
 *   - preset.version MUST equal the preset-name literal (enforced here,
 *     and pinned at runtime by the PRESET_VERSIONS map key).
 *   - preset.ops MUST be a non-empty array of non-empty strings.
 *   - discovery-v1 MUST have exactly 28 ops and every op MUST be one of
 *     the bounded meta aliases in DISCOVERY_META_ALIAS_ALLOWLIST.
 *   - essentials-v1 MUST have exactly 150 ops (D-19 legacy invariant).
 *   - every per-product preset op MUST carry the product's `__<prefix>__`
 *     prefix literal — prevents a preset from accidentally pulling in
 *     cross-product ops.
 *   - every modern op MUST appear as an `alias: "..."` literal in client.ts;
 *     essentials-v1 legacy operationId mismatches and absent product alias
 *     families under default codegen warn but do not fail.
 *   - output is deterministic: each per-preset alias list is sorted
 *     lexicographically so git diffs on preset evolution highlight real
 *     changes, not ordering drift.
 *   - every emitted ReadonlySet<string> is Object.freeze()d at module load;
 *     consumers CANNOT mutate any preset set.
 *
 * Invocation: chained from bin/generate-graph-client.mjs after generateMcpTools
 * and (under FULL_COVERAGE=1) runBetaPipeline + runProductPipelines. Running
 * under FULL_COVERAGE=0 may omit whole legacy/product alias families; those
 * complete-family misses warn and preserve the checked-in frozen preset
 * membership so `npm run generate` remains compatible with the default dev
 * codegen path. Partial product misses still fail as typo/staleness signals.
 */
import fs from 'fs';
import path from 'path';

const DISCOVERY_META_ALIAS_ALLOWLIST = Object.freeze(
  new Set([
    'search-tools',
    'get-tool-schema',
    'execute-tool',
    'bookmark-tool',
    'list-bookmarks',
    'unbookmark-tool',
    'save-recipe',
    'list-recipes',
    'run-recipe',
    'record-fact',
    'recall-facts',
    'forget-fact',
    'list-skills',
    'get-skill',
    'save-skill',
    'delete-skill',
    'fork-builtin-skill',
    'render-skill',
    'validate-skill',
    'import-skill-pack',
    'export-skill-pack',
    'inbox-triage-view',
    'calendar-brief-view',
    'teams-digest-view',
    'file-search-view',
    'permissions-overview-view',
    'connector-diagnostics',
    'skill-editor-view',
  ])
);

/**
 * Per-preset constraint metadata. Each entry drives:
 *   - which JSON filename to read from presetsDir
 *   - what `version` literal the JSON must carry
 *   - what TypeScript constant name to emit for the frozen Set
 *   - any preset-specific length / prefix invariants
 *
 * Ordered so `essentials-v1` is emitted first — keeps the existing
 * generated-index.ts layout stable (legacy-first ordering improves diff
 * locality during plan 05.1-07's initial landing).
 */
const PRESET_SPECS = Object.freeze([
  Object.freeze({
    version: 'discovery-v1',
    filename: 'discovery-v1.json',
    constName: 'DISCOVERY_V1_OPS',
    exactCount: 28,
    prefix: null,
    metaAllowlist: DISCOVERY_META_ALIAS_ALLOWLIST,
  }),
  Object.freeze({
    version: 'essentials-v1',
    filename: 'essentials-v1.json',
    constName: 'ESSENTIALS_V1_OPS',
    exactCount: 150,
    prefix: null,
    metaAllowlist: null,
  }),
  Object.freeze({
    version: 'powerbi-essentials',
    filename: 'powerbi-essentials.json',
    constName: 'POWERBI_ESSENTIALS_OPS',
    exactCount: null,
    prefix: '__powerbi__',
    metaAllowlist: null,
  }),
  Object.freeze({
    version: 'pwrapps-essentials',
    filename: 'pwrapps-essentials.json',
    constName: 'PWRAPPS_ESSENTIALS_OPS',
    exactCount: null,
    prefix: '__pwrapps__',
    metaAllowlist: null,
  }),
  Object.freeze({
    version: 'pwrauto-essentials',
    filename: 'pwrauto-essentials.json',
    constName: 'PWRAUTO_ESSENTIALS_OPS',
    exactCount: null,
    prefix: '__pwrauto__',
    metaAllowlist: null,
  }),
  Object.freeze({
    version: 'exo-essentials',
    filename: 'exo-essentials.json',
    constName: 'EXO_ESSENTIALS_OPS',
    exactCount: null,
    prefix: '__exo__',
    metaAllowlist: null,
  }),
  Object.freeze({
    version: 'sp-admin-essentials',
    filename: 'sp-admin-essentials.json',
    constName: 'SP_ADMIN_ESSENTIALS_OPS',
    exactCount: null,
    prefix: '__spadmin__',
    metaAllowlist: null,
  }),
]);

/**
 * @returns {ReadonlyArray<{version: string, filename: string, constName: string, exactCount: number | null, prefix: string | null, metaAllowlist: ReadonlySet<string> | null}>}
 *   Frozen per-preset constraint table — exported for tests + the
 *   preset-loader shape assertion.
 */
export function getPresetSpecs() {
  return PRESET_SPECS;
}

/**
 * Load and validate a single preset JSON against the registry + its spec.
 * Returns the sorted op list for downstream emit; throws on any invariant
 * violation with a bounded error message.
 *
 * @param {{ version: string, filename: string, exactCount: number | null, prefix: string | null, metaAllowlist: ReadonlySet<string> | null }} spec
 * @param {string} presetJsonPath  Absolute path to the preset JSON.
 * @param {ReadonlySet<string>} registry  Aliases lifted from client.ts.
 * @returns {{ sortedOps: string[] }}
 */
function loadAndValidatePreset(spec, presetJsonPath, registry) {
  if (!fs.existsSync(presetJsonPath)) {
    throw new Error(`${presetJsonPath} missing`);
  }

  const preset = JSON.parse(fs.readFileSync(presetJsonPath, 'utf-8'));
  if (preset.version !== spec.version) {
    throw new Error(`expected version "${spec.version}", got "${preset.version}"`);
  }
  if (!Array.isArray(preset.ops)) {
    throw new Error(`${spec.version}: preset.ops must be an array`);
  }
  if (preset.ops.length === 0) {
    throw new Error(`${spec.version}: preset.ops must be non-empty`);
  }
  if (typeof spec.exactCount === 'number' && preset.ops.length !== spec.exactCount) {
    throw new Error(
      `${spec.version}: expected exactly ${spec.exactCount} ops, got ${preset.ops.length}`
    );
  }

  // Defensive: reject empty/whitespace aliases before registry check so
  // the error preview below stays meaningful.
  for (const op of preset.ops) {
    if (typeof op !== 'string' || op.length === 0) {
      throw new Error(
        `${spec.version}: preset.ops contains non-string or empty entry: ${JSON.stringify(op)}`
      );
    }
  }

  // Per-product presets must only carry prefixed aliases. Catches the
  // typical mistake of pasting a cross-product alias into the wrong preset
  // (e.g., a `__pwrapps__*` alias landing in the powerbi preset).
  if (spec.prefix !== null) {
    const unprefixed = preset.ops.filter((op) => !op.startsWith(spec.prefix));
    if (unprefixed.length > 0) {
      const previewCount = Math.min(5, unprefixed.length);
      const preview = unprefixed.slice(0, previewCount).join(', ');
      const tail =
        unprefixed.length > previewCount ? ` (and ${unprefixed.length - previewCount} more)` : '';
      throw new Error(
        `${spec.version}: ${unprefixed.length} op(s) missing prefix "${spec.prefix}": ${preview}${tail}`
      );
    }
  }

  if (spec.metaAllowlist !== null) {
    const disallowed = preset.ops.filter((op) => !spec.metaAllowlist.has(op));
    if (disallowed.length > 0) {
      const previewCount = Math.min(5, disallowed.length);
      const preview = disallowed.slice(0, previewCount).join(', ');
      const tail =
        disallowed.length > previewCount ? ` (and ${disallowed.length - previewCount} more)` : '';
      throw new Error(
        `${spec.version}: ${disallowed.length} op(s) outside meta/app alias allowlist: ${preview}${tail}`
      );
    }
  }

  // No duplicates (cheap, and protects the generated Set from silently
  // collapsing ops a human editor intended as distinct).
  const seen = new Set();
  for (const op of preset.ops) {
    if (seen.has(op)) {
      throw new Error(`${spec.version}: duplicate op "${op}"`);
    }
    seen.add(op);
  }

  const missing = spec.metaAllowlist === null ? preset.ops.filter((op) => !registry.has(op)) : [];
  if (missing.length > 0) {
    const previewCount = Math.min(10, missing.length);
    const preview = missing.slice(0, previewCount).join(', ');
    const tail =
      missing.length > previewCount ? ` (and ${missing.length - previewCount} more)` : '';
    const productRegistryAbsent =
      spec.prefix !== null &&
      process.env.MS365_MCP_FULL_COVERAGE !== '1' &&
      ![...registry].some((alias) => alias.startsWith(spec.prefix));

    if (spec.version === 'essentials-v1') {
      // Legacy static tenants may still depend on the Phase 5 operationId set.
      // Preserve that exact 150-op set rather than rewriting to an empty or
      // partial preset when the default 212-op codegen path emits friendly
      // aliases.
      console.warn(
        `⚠️  compile-preset: ${spec.version}: ${missing.length} legacy op(s) NOT in registry; preserving preset ops: ${preview}${tail}`
      );
    } else if (productRegistryAbsent) {
      // Default non-full-coverage generation intentionally skips product
      // pipelines, so the registry can lack an entire product alias family.
      // Keep the frozen preset emitted for runtime loaders, while still
      // treating partial misses as strict failures whenever a product family
      // is present in the registry.
      console.warn(
        `⚠️  compile-preset: ${spec.version}: product alias family "${spec.prefix}" absent from registry; preserving ${missing.length} preset op(s): ${preview}${tail}`
      );
    } else {
      // T-5.1-04 mitigation: a modern preset op that cannot be resolved
      // against the fresh registry is almost always a typo or a stale alias.
      // Failing codegen loudly is cheaper than shipping a preset whose
      // `enabled_tools` set silently drops half the flagship ops.
      throw new Error(
        `${spec.version}: ${missing.length} preset op(s) NOT in registry: ${preview}${tail}`
      );
    }
  }

  // Deterministic emit order: lexicographic sort on the alias list keeps
  // the generated file diff-friendly as presets evolve.
  return { sortedOps: [...preset.ops].sort() };
}

/**
 * Extract the alias registry from a generated client.ts source.
 *
 * Matches every `alias: "..."` / `alias: '...'` occurrence (case-
 * sensitive). Matches the openapi-zod-client emission pattern uniformly —
 * v1, beta (`__beta__` prefix), and plan-5.1 product prefixes all land
 * via the same literal.
 *
 * @param {string} clientTsContent
 * @returns {Set<string>}
 */
function extractRegistry(clientTsContent) {
  return new Set([...clientTsContent.matchAll(/alias:\s*["']([^"']+)["']/g)].map((m) => m[1]));
}

function tsStringLiteral(value) {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}'`;
}

/**
 * Compile every preset JSON in `presetsDir` against the generated
 * client.ts registry and emit `presetsDir/generated-index.ts`.
 *
 * Retains the plan-05-03 signature + return shape so existing callers
 * (bin/generate-graph-client.mjs Step 5, test stubs) don't need edits.
 * The emitted file now carries seven ReadonlySet<string> exports plus a
 * 7-entry PRESET_VERSIONS map when every preset JSON is present.
 *
 * @param {string} generatedDir  Absolute path to src/generated (carries client.ts).
 * @param {string} presetsDir    Absolute path to src/presets (carries essentials-v1.json
 *                                + the five per-product *-essentials.json files;
 *                                generated-index.ts is (over)written here).
 * @returns {{count: number, presetTsPath: string, missing: string[]}}
 *   `count` preserves Plan 05-03 semantics (size of the essentials-v1
 *   ReadonlySet). `missing` is always `[]` on success — failures throw.
 * @throws {Error} when client.ts, any preset JSON, or any invariant fails.
 */
export function compileEssentialsPreset(generatedDir, presetsDir) {
  try {
    const clientPath = path.join(generatedDir, 'client.ts');
    const presetTsPath = path.join(presetsDir, 'generated-index.ts');

    if (!fs.existsSync(clientPath)) {
      throw new Error(`${clientPath} missing — run generate first`);
    }

    const clientCode = fs.readFileSync(clientPath, 'utf-8');
    const registry = extractRegistry(clientCode);

    // Per-preset compile pass. discovery-v1 is first so the generated
    // PRESET_VERSIONS map matches the fresh-tenant default order.
    const perPresetOps = new Map();
    for (const spec of PRESET_SPECS) {
      const presetJsonPath = path.join(presetsDir, spec.filename);
      // Non-essentials presets can legitimately be absent in older tmp test
      // fixtures. The legacy essentials-v1 entry remains MANDATORY: its
      // absence is a hard error (same as before this plan).
      if (spec.version !== 'essentials-v1' && !fs.existsSync(presetJsonPath)) {
        continue;
      }
      const { sortedOps } = loadAndValidatePreset(spec, presetJsonPath, registry);
      perPresetOps.set(spec.version, sortedOps);
    }

    // Emit generated-index.ts. Layout:
    //   1. header comment
    //   2. one `export const X_OPS: ReadonlySet<string> = Object.freeze(new Set(...))`
    //      per loaded preset (emit order matches PRESET_SPECS).
    //   3. the PRESET_VERSIONS map.
    const lines = [
      '// THIS FILE IS AUTO-GENERATED by bin/modules/compile-preset.mjs',
      '// DO NOT EDIT DIRECTLY. Regenerate with `npm run generate`.',
      '// Source: src/presets/*.json',
      '',
    ];

    const loadedSpecs = PRESET_SPECS.filter((spec) => perPresetOps.has(spec.version));
    for (const spec of loadedSpecs) {
      const ops = perPresetOps.get(spec.version);
      lines.push(`export const ${spec.constName}: ReadonlySet<string> = Object.freeze(`);
      lines.push('  new Set<string>([');
      for (const op of ops) {
        lines.push(`    ${tsStringLiteral(op)},`);
      }
      lines.push('  ])');
      lines.push(');');
      lines.push('');
    }

    lines.push(
      'export const PRESET_VERSIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map(['
    );
    for (const spec of loadedSpecs) {
      lines.push(`  [${tsStringLiteral(spec.version)}, ${spec.constName}],`);
    }
    lines.push(']);');
    lines.push('');

    fs.writeFileSync(presetTsPath, lines.join('\n'));

    // Preserve Plan 05-03's return shape: `count` is the size of
    // essentials-v1 (the bellwether preset). Per-product counts are
    // recoverable from the emitted Sets at runtime.
    const essentialsOps = perPresetOps.get('essentials-v1') ?? [];
    return { count: essentialsOps.length, presetTsPath, missing: [] };
  } catch (error) {
    throw new Error(`compile-preset: ${error.message}`);
  }
}

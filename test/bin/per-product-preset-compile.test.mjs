/**
 * Plan 05.1-07 — compile-preset.mjs 6-preset pipeline tests.
 *
 * Plan 05-03 shipped `compileEssentialsPreset(generatedDir, presetsDir)`
 * hard-coded to the 150-op essentials-v1 preset. Plan 05.1-07 extends it
 * to compile 5 additional per-product essentials presets in a single pass;
 * Phase 7 adds discovery-v1 as a bounded meta-alias preset.
 *
 * These tests stage tmp workspaces and verify:
 *   - All 7 presets compile when every Graph/product op is registry-known.
 *   - The emitted generated-index.ts carries 7 frozen ReadonlySet<string>
 *     exports + a 7-entry PRESET_VERSIONS map.
 *   - Missing per-product preset files are skipped (not an error).
 *   - Missing essentials-v1 IS an error (legacy mandatory preset).
 *   - Per-product presets reject cross-product prefix leakage.
 *   - Per-product presets preserve full product-family misses under default
 *     non-full-coverage generation, but reject partial registry misses.
 *   - Per-product presets reject empty arrays, duplicates, and non-strings.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { compileEssentialsPreset, getPresetSpecs } from '../../bin/modules/compile-preset.mjs';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const REAL_PRESETS_DIR = path.join(REPO_ROOT, 'src', 'presets');

function makeTmp() {
  const dir = path.join(os.tmpdir(), `plan-05.1-07-preset-${crypto.randomUUID()}`);
  fs.mkdirSync(path.join(dir, 'generated'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'presets'), { recursive: true });
  return dir;
}

function rmTmp(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function makeFakeClient(aliases) {
  const lines = [
    'import { makeApi } from "./hack.js";',
    'export const api = makeApi([',
    ...aliases.map(
      (alias) => `  { alias: "${alias}", method: "get", path: "/x", parameters: [] },`
    ),
    ']);',
    '',
  ];
  return lines.join('\n');
}

function expectStringLiteral(out, value) {
  const singleQuoted = `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const doubleQuoted = `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  expect(out.includes(singleQuoted) || out.includes(doubleQuoted)).toBe(true);
}

function copyPreset(tmp, filename) {
  const src = path.join(REAL_PRESETS_DIR, filename);
  const dst = path.join(tmp, 'presets', filename);
  fs.copyFileSync(src, dst);
}

function loadPresetJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(REAL_PRESETS_DIR, filename), 'utf-8'));
}

describe('plan 05.1-07 — compile-preset 6-preset pipeline', () => {
  let tmp;

  beforeEach(() => {
    tmp = makeTmp();
  });

  afterEach(() => {
    rmTmp(tmp);
  });

  it('getPresetSpecs() returns a frozen 7-entry table with expected versions and prefixes', () => {
    const specs = getPresetSpecs();
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBe(7);
    expect(Object.isFrozen(specs)).toBe(true);

    const byVersion = Object.fromEntries(specs.map((s) => [s.version, s]));
    expect(byVersion['discovery-v1']).toMatchObject({ exactCount: 30, prefix: null });
    expect(byVersion['essentials-v1']).toMatchObject({ exactCount: 150, prefix: null });
    expect(byVersion['powerbi-essentials']).toMatchObject({ prefix: '__powerbi__' });
    expect(byVersion['pwrapps-essentials']).toMatchObject({ prefix: '__pwrapps__' });
    expect(byVersion['pwrauto-essentials']).toMatchObject({ prefix: '__pwrauto__' });
    expect(byVersion['exo-essentials']).toMatchObject({ prefix: '__exo__' });
    expect(byVersion['sp-admin-essentials']).toMatchObject({ prefix: '__spadmin__' });
  });

  it('compiles all 7 presets when every Graph/product op is in the registry', () => {
    const discovery = loadPresetJson('discovery-v1.json');
    const essentials = loadPresetJson('essentials-v1.json');
    const powerbi = loadPresetJson('powerbi-essentials.json');
    const pwrapps = loadPresetJson('pwrapps-essentials.json');
    const pwrauto = loadPresetJson('pwrauto-essentials.json');
    const exo = loadPresetJson('exo-essentials.json');
    const spadmin = loadPresetJson('sp-admin-essentials.json');

    const registry = [
      ...essentials.ops,
      ...powerbi.ops,
      ...pwrapps.ops,
      ...pwrauto.ops,
      ...exo.ops,
      ...spadmin.ops,
    ];
    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient(registry));

    for (const f of [
      'discovery-v1.json',
      'essentials-v1.json',
      'powerbi-essentials.json',
      'pwrapps-essentials.json',
      'pwrauto-essentials.json',
      'exo-essentials.json',
      'sp-admin-essentials.json',
    ]) {
      copyPreset(tmp, f);
    }

    const result = compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'));

    expect(result.count).toBe(150);
    const out = fs.readFileSync(path.join(tmp, 'presets', 'generated-index.ts'), 'utf-8');

    // All 7 const exports emitted.
    expect(out).toContain('DISCOVERY_V1_OPS');
    expect(out).toContain('ESSENTIALS_V1_OPS');
    expect(out).toContain('POWERBI_ESSENTIALS_OPS');
    expect(out).toContain('PWRAPPS_ESSENTIALS_OPS');
    expect(out).toContain('PWRAUTO_ESSENTIALS_OPS');
    expect(out).toContain('EXO_ESSENTIALS_OPS');
    expect(out).toContain('SP_ADMIN_ESSENTIALS_OPS');

    // PRESET_VERSIONS has 7 entries. Accept either single or double quotes
    // (JSON.stringify emits doubles; prettier post-format may rewrite to
    // singles — the test is agnostic to quoting style).
    for (const version of [
      'discovery-v1',
      'essentials-v1',
      'powerbi-essentials',
      'pwrapps-essentials',
      'pwrauto-essentials',
      'exo-essentials',
      'sp-admin-essentials',
    ]) {
      const singleQuoted = `'${version}'`;
      const doubleQuoted = `"${version}"`;
      expect(out.includes(singleQuoted) || out.includes(doubleQuoted)).toBe(true);
    }

    // Every per-product op is a literal in the emitted TS file.
    for (const op of discovery.ops) {
      expectStringLiteral(out, op);
    }
    for (const op of [...powerbi.ops, ...pwrapps.ops, ...pwrauto.ops, ...exo.ops, ...spadmin.ops]) {
      expectStringLiteral(out, op);
    }
  });

  it('per-product presets absent from the directory are silently skipped', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient(essentials.ops));
    copyPreset(tmp, 'essentials-v1.json');
    // Do NOT copy the 5 per-product files.

    const result = compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'));
    expect(result.count).toBe(150);

    const out = fs.readFileSync(path.join(tmp, 'presets', 'generated-index.ts'), 'utf-8');
    expect(out).toContain('ESSENTIALS_V1_OPS');
    // The 5 per-product const exports are ABSENT because those JSONs weren't staged.
    expect(out).not.toContain('POWERBI_ESSENTIALS_OPS');
    expect(out).not.toContain('EXO_ESSENTIALS_OPS');
  });

  it('warns but preserves a per-product preset when the generated registry lacks that whole product family', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    const powerbi = loadPresetJson('powerbi-essentials.json');
    const previousFullCoverage = process.env.MS365_MCP_FULL_COVERAGE;
    delete process.env.MS365_MCP_FULL_COVERAGE;

    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient(essentials.ops));
    copyPreset(tmp, 'essentials-v1.json');
    copyPreset(tmp, 'powerbi-essentials.json');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const result = compileEssentialsPreset(
        path.join(tmp, 'generated'),
        path.join(tmp, 'presets')
      );
      expect(result.count).toBe(150);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/product alias family "__powerbi__" absent from registry/)
      );

      const out = fs.readFileSync(path.join(tmp, 'presets', 'generated-index.ts'), 'utf-8');
      expect(out).toContain('POWERBI_ESSENTIALS_OPS');
      for (const op of powerbi.ops) {
        expectStringLiteral(out, op);
      }
    } finally {
      if (previousFullCoverage === undefined) {
        delete process.env.MS365_MCP_FULL_COVERAGE;
      } else {
        process.env.MS365_MCP_FULL_COVERAGE = previousFullCoverage;
      }
      warnSpy.mockRestore();
    }
  });

  it('rejects a per-product preset whose op is missing its product prefix', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    // Build a fake powerbi preset whose ops are NOT prefixed with __powerbi__.
    const brokenPowerBI = {
      version: 'powerbi-essentials',
      product: 'powerbi',
      prefix: '__powerbi__',
      ops: ['Admin_GetActivityEvents', '__powerbi__Apps_GetAppsAsAdmin'],
    };
    fs.writeFileSync(
      path.join(tmp, 'generated', 'client.ts'),
      makeFakeClient([
        ...essentials.ops,
        'Admin_GetActivityEvents',
        '__powerbi__Apps_GetAppsAsAdmin',
      ])
    );
    copyPreset(tmp, 'essentials-v1.json');
    fs.writeFileSync(
      path.join(tmp, 'presets', 'powerbi-essentials.json'),
      JSON.stringify(brokenPowerBI)
    );

    expect(() =>
      compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'))
    ).toThrow(/missing prefix "__powerbi__"/);
  });

  it('rejects a per-product preset op that is NOT in the registry (typo resistance)', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    const powerbi = loadPresetJson('powerbi-essentials.json');
    // Drop one Power BI op from the registry to force a miss.
    const dropped = powerbi.ops[0];
    const registry = [...essentials.ops, ...powerbi.ops.filter((op) => op !== dropped)];
    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient(registry));
    copyPreset(tmp, 'essentials-v1.json');
    copyPreset(tmp, 'powerbi-essentials.json');

    expect(() =>
      compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'))
    ).toThrow(/NOT in registry/);
  });

  it('rejects a per-product preset with duplicate ops', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    const brokenExo = {
      version: 'exo-essentials',
      product: 'exo',
      prefix: '__exo__',
      ops: ['__exo__get-mailbox', '__exo__get-mailbox'],
    };
    fs.writeFileSync(
      path.join(tmp, 'generated', 'client.ts'),
      makeFakeClient([...essentials.ops, '__exo__get-mailbox'])
    );
    copyPreset(tmp, 'essentials-v1.json');
    fs.writeFileSync(path.join(tmp, 'presets', 'exo-essentials.json'), JSON.stringify(brokenExo));

    expect(() =>
      compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'))
    ).toThrow(/duplicate op/);
  });

  it('rejects a per-product preset with an empty ops array', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    const empty = {
      version: 'pwrapps-essentials',
      product: 'pwrapps',
      prefix: '__pwrapps__',
      ops: [],
    };
    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient(essentials.ops));
    copyPreset(tmp, 'essentials-v1.json');
    fs.writeFileSync(path.join(tmp, 'presets', 'pwrapps-essentials.json'), JSON.stringify(empty));

    expect(() =>
      compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'))
    ).toThrow(/non-empty/);
  });

  it('rejects a per-product preset whose version literal does not match its filename', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    const wrongVersion = {
      version: 'pwrauto-essentials-typo',
      product: 'pwrauto',
      prefix: '__pwrauto__',
      ops: ['__pwrauto__list-flows'],
    };
    fs.writeFileSync(
      path.join(tmp, 'generated', 'client.ts'),
      makeFakeClient([...essentials.ops, '__pwrauto__list-flows'])
    );
    copyPreset(tmp, 'essentials-v1.json');
    fs.writeFileSync(
      path.join(tmp, 'presets', 'pwrauto-essentials.json'),
      JSON.stringify(wrongVersion)
    );

    expect(() =>
      compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'))
    ).toThrow(/expected version "pwrauto-essentials"/);
  });

  it('still errors loudly when essentials-v1.json is absent (legacy mandatory preset)', () => {
    fs.writeFileSync(path.join(tmp, 'generated', 'client.ts'), makeFakeClient([]));
    // Do NOT stage any preset.
    expect(() =>
      compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'))
    ).toThrow(/essentials-v1\.json/);
  });

  it('emits sorted ops so git diffs on preset evolution highlight real changes', () => {
    const essentials = loadPresetJson('essentials-v1.json');
    const powerbi = loadPresetJson('powerbi-essentials.json');
    fs.writeFileSync(
      path.join(tmp, 'generated', 'client.ts'),
      makeFakeClient([...essentials.ops, ...powerbi.ops])
    );
    copyPreset(tmp, 'essentials-v1.json');
    copyPreset(tmp, 'powerbi-essentials.json');

    compileEssentialsPreset(path.join(tmp, 'generated'), path.join(tmp, 'presets'));
    const out = fs.readFileSync(path.join(tmp, 'presets', 'generated-index.ts'), 'utf-8');

    // Extract the POWERBI_ESSENTIALS_OPS Set literal body and confirm it is
    // emitted in lex-sorted order.
    const match = out.match(
      /POWERBI_ESSENTIALS_OPS[\s\S]*?new Set<string>\(\[([\s\S]*?)\n\s*\]\s*\)\s*\)\s*;/
    );
    expect(match).not.toBeNull();
    const body = match[1];
    const emittedOps = [...body.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    const sortedCopy = [...emittedOps].sort();
    expect(emittedOps).toEqual(sortedCopy);
    expect(emittedOps.length).toBe(powerbi.ops.length);
  });
});

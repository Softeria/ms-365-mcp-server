/**
 * Plan 05-02 Task 1 — bin/modules/beta.mjs pipeline tests.
 *
 * Tests the beta pipeline end-to-end against the mini beta + v1 fixtures.
 * Relies on `openapi-zod-client` (the npx binary) to run a real codegen
 * pass so the prefix regex is exercised against genuine emitter output.
 *
 * Coverage:
 *   Test 1: Every beta-sourced alias in merged client.ts starts with __beta__.
 *   Test 2: All prefixed aliases <= 64 chars (MCP SEP-986, Pitfall 3).
 *   Test 3: No duplicate aliases across v1 + beta (Pitfall 2 collision test).
 *   Test 4: Stripping __beta__ yields no cross-spec duplicates
 *           (confirms the prefix is actually resolving v1/beta overlaps).
 *   Test 5: First invocation without a snapshot file writes a sorted
 *           snapshot (idempotent on re-run).
 *
 * Threat mitigations exercised:
 *   - T-05-03: Tampering via upstream alias collision. Prefix regex is
 *     anchored to `alias:\s*["'][a-z]`; Set-size + post-prefix dedup
 *     prove no two identical aliases reach the registry.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — .mjs import has no types; runtime shape only.
import { runBetaPipeline } from '../../bin/modules/beta.mjs';
// @ts-expect-error — .mjs import has no types; runtime shape only.
import { generateMcpTools } from '../../bin/modules/generate-mcp-tools.mjs';
// @ts-expect-error — .mjs import has no types; runtime shape only.
import { createAndSaveSimplifiedOpenAPIFullSurface } from '../../bin/modules/simplified-openapi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V1_FIXTURE = path.resolve(__dirname, '..', 'fixtures', 'mini-graph-v1.yaml');
const BETA_FIXTURE = path.resolve(__dirname, '..', 'fixtures', 'mini-graph-beta.yaml');

function makeTmpDir() {
  const dir = path.join(os.tmpdir(), `plan-05-02-beta-${crypto.randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'openapi'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src', 'generated'), { recursive: true });
  // Stage the hack.ts the post-processor rewrites the zodios import to:
  fs.writeFileSync(path.join(dir, 'src', 'generated', 'hack.ts'), '// stub');
  return dir;
}

function rmTmp(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Run the v1 pipeline (fixture-based) against a staged tmp dir to populate
 * src/generated/client.ts with real zod-client output. Downstream tests then
 * invoke runBetaPipeline which merges beta entries into the same client.ts.
 */
function stageV1Baseline(tmpDir) {
  const openapiDir = path.join(tmpDir, 'openapi');
  const generatedDir = path.join(tmpDir, 'src', 'generated');
  fs.copyFileSync(V1_FIXTURE, path.join(openapiDir, 'openapi.yaml'));
  // Full-surface simplifier — same call shape used by the orchestrator in
  // full-coverage mode. Output is openapi-trimmed.yaml consumed by
  // generateMcpTools (which runs openapi-zod-client internally).
  const trimmed = path.join(openapiDir, 'openapi-trimmed.yaml');
  createAndSaveSimplifiedOpenAPIFullSurface(path.join(openapiDir, 'openapi.yaml'), trimmed);
  generateMcpTools(null, generatedDir);
}

function extractAliases(clientCode) {
  return [...clientCode.matchAll(/alias:\s*["']([^"']+)/g)].map((m) => m[1]);
}

describe('plan 05-02 task 1 — runBetaPipeline', () => {
  let tmpDir;
  let openapiDir;
  let generatedDir;
  let snapshotPath;
  let result;
  let mergedClient;
  let snapshot;
  let v1BaselineClient;

  beforeAll(async () => {
    tmpDir = makeTmpDir();
    stageV1Baseline(tmpDir);
    openapiDir = path.join(tmpDir, 'openapi');
    generatedDir = path.join(tmpDir, 'src', 'generated');
    v1BaselineClient = fs.readFileSync(path.join(generatedDir, 'client.ts'), 'utf-8');
    fs.copyFileSync(BETA_FIXTURE, path.join(openapiDir, 'openapi-beta.yaml'));
    snapshotPath = path.join(tmpDir, '.last-beta-snapshot.json');

    result = await runBetaPipeline(openapiDir, generatedDir, {
      snapshotPath,
      useSnapshot: true,
    });
    mergedClient = fs.readFileSync(path.join(generatedDir, 'client.ts'), 'utf-8');
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  });

  afterAll(() => {
    rmTmp(tmpDir);
  });

  it('Test 1: every beta-sourced alias in merged client.ts starts with __beta__', () => {
    expect(result).toBeDefined();
    expect(result.betaCount).toBeGreaterThanOrEqual(8);
    expect(result.aliases).toBeInstanceOf(Array);
    expect(result.aliases.every((a) => a.startsWith('__beta__'))).toBe(true);

    const betaMatches = [...mergedClient.matchAll(/alias:\s*["']__beta__[^"']+/g)];
    expect(betaMatches.length).toBeGreaterThanOrEqual(8);
  });

  it('Test 2: all prefixed aliases are <= 64 chars (MCP SEP-986)', () => {
    for (const alias of result.aliases) {
      expect(alias.length).toBeLessThanOrEqual(64);
    }
    const boundary = result.aliases.find((a) => a.includes('getassignedrolescopetags'));
    expect(boundary).toBeDefined();
    expect(boundary.length).toBeLessThanOrEqual(64);
  });

  it('Test 3: no duplicate aliases across v1 + beta in merged client.ts', () => {
    const allAliases = extractAliases(mergedClient);
    expect(new Set(allAliases).size).toBe(allAliases.length);
  });

  it('Test 4: stripping __beta__ reveals expected v1/beta overlap (prefix resolves collision)', () => {
    const allAliases = extractAliases(mergedClient);
    const v1Aliases = allAliases.filter((a) => !a.startsWith('__beta__'));
    const betaAliases = allAliases.filter((a) => a.startsWith('__beta__'));
    expect(v1Aliases.length).toBeGreaterThanOrEqual(10);
    expect(betaAliases.length).toBeGreaterThanOrEqual(8);

    const betaStripped = betaAliases.map((a) => a.slice('__beta__'.length));
    const v1Set = new Set(v1Aliases);
    const overlap = betaStripped.filter((a) => v1Set.has(a));
    expect(overlap).toContain('me.messages.list');
    expect(new Set(allAliases).size).toBe(allAliases.length);
  });

  it('Test 5: first invocation without snapshot writes sorted snapshot; re-run is idempotent', async () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);
    expect(snapshot.beta_count).toBe(result.aliases.length);
    expect(snapshot.beta_ops).toEqual([...result.aliases].sort());
    expect(snapshot.beta_ops).toEqual([...snapshot.beta_ops].sort());

    const idempotencyDir = makeTmpDir();
    try {
      const openapiDir2 = path.join(idempotencyDir, 'openapi');
      const generatedDir2 = path.join(idempotencyDir, 'src', 'generated');
      fs.writeFileSync(path.join(generatedDir2, 'client.ts'), v1BaselineClient);
      fs.writeFileSync(path.join(generatedDir2, 'hack.ts'), '// stub');
      fs.copyFileSync(BETA_FIXTURE, path.join(openapiDir2, 'openapi-beta.yaml'));
      const snapshotPath2 = path.join(idempotencyDir, '.last-beta-snapshot.json');
      fs.writeFileSync(snapshotPath2, JSON.stringify(snapshot, null, 2) + '\n');

      const second = await runBetaPipeline(openapiDir2, generatedDir2, {
        snapshotPath: snapshotPath2,
        useSnapshot: true,
      });

      const snap2 = JSON.parse(fs.readFileSync(snapshotPath2, 'utf-8'));
      expect(snap2.beta_ops).toEqual(snapshot.beta_ops);
      expect(second.aliases.sort()).toEqual(result.aliases.sort());
    } finally {
      rmTmp(idempotencyDir);
    }
  });
});

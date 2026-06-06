#!/usr/bin/env node
/**
 * OAuth-surface coverage gate for D-10 (plan 06-05).
 *
 * Reads coverage/coverage-final.json (V8 JSON format), counts statement hits
 * inside exportable OAuth-handler regions, prints percentage, exits non-zero
 * if below 70%. Inline .well-known routes in src/server.ts are contract-tested
 * separately by test/integration/oauth-surface/well-known-metadata.int.test.ts.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HANDLER_REGIONS = [
  { file: 'src/lib/oauth/register-handler.ts', fn: 'createRegisterHandler', kind: 'function' },
  { file: 'src/lib/oauth/token-handler.ts', fn: 'createTokenHandler', kind: 'function' },
  { file: 'src/lib/oauth/tenant-handlers.ts', fn: 'createAuthorizeHandler', kind: 'function' },
  { file: 'src/lib/oauth/tenant-handlers.ts', fn: 'createTenantTokenHandler', kind: 'function' },
];

const COVERAGE_THRESHOLD_PERCENT = Number.parseFloat(
  process.env.MS365_MCP_OAUTH_COVERAGE_THRESHOLD ?? '70'
);
if (!Number.isFinite(COVERAGE_THRESHOLD_PERCENT) || COVERAGE_THRESHOLD_PERCENT <= 0) {
  throw new Error('MS365_MCP_OAUTH_COVERAGE_THRESHOLD must be a positive number when set');
}

function sourceLinesFor(file, sourceCache) {
  if (sourceCache.has(file)) return sourceCache.get(file);

  const filePath = path.resolve(__dirname, '..', file);
  const lines = readFileSync(filePath, 'utf8').split('\n');
  sourceCache.set(file, lines);
  return lines;
}

function findMatchingCharEnd(lines, startIndex, open, close) {
  let depth = 0;
  let started = false;

  for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex += 1) {
    for (const char of lines[lineIndex]) {
      if (char === open) {
        depth += 1;
        started = true;
      } else if (char === close && started) {
        depth -= 1;
        if (depth === 0) return lineIndex;
      }
    }
  }

  return -1;
}

function resolveFunctionRegion(region, lines) {
  const startIndex = lines.findIndex((line) => line.includes(`export function ${region.fn}`));
  if (startIndex < 0) return { error: `function marker not found: export function ${region.fn}` };

  const endIndex = findMatchingCharEnd(lines, startIndex, '{', '}');
  if (endIndex < 0) return { error: `function end not found: ${region.fn}` };

  return { start: startIndex + 1, end: endIndex + 1 };
}

function resolveRouteRegion(region, lines) {
  const markerIndex = lines.findIndex((line) => line.includes(region.marker));
  if (markerIndex < 0) return { error: `route marker not found: ${region.marker}` };

  let startIndex = markerIndex;
  for (let i = markerIndex; i >= Math.max(0, markerIndex - 8); i -= 1) {
    if (/\bapp\.(get|post)\s*\(/.test(lines[i])) {
      startIndex = i;
      break;
    }
  }

  const endIndex = findMatchingCharEnd(lines, startIndex, '(', ')');
  if (endIndex < 0) return { error: `route call end not found: ${region.marker}` };

  return { start: startIndex + 1, end: endIndex + 1 };
}

function resolveHandlerRegions() {
  const sourceCache = new Map();
  const ranges = [];

  for (const region of HANDLER_REGIONS) {
    let lines;
    try {
      lines = sourceLinesFor(region.file, sourceCache);
    } catch (err) {
      console.error(
        `check-oauth-coverage: failed to read ${region.file} for region resolution: ${err.message}`
      );
      return { exitCode: 2, ranges: [] };
    }

    const resolved =
      region.kind === 'function'
        ? resolveFunctionRegion(region, lines)
        : resolveRouteRegion(region, lines);
    if (resolved.error) {
      console.error('check-oauth-coverage: HANDLER_REGIONS drifted from source:');
      console.error(`  ${region.fn} in ${region.file} — ${resolved.error}`);
      console.error('Update HANDLER_REGIONS markers to match source labels.');
      return { exitCode: 3, ranges: [] };
    }

    ranges.push({ ...region, start: resolved.start, end: resolved.end });
  }

  return { exitCode: 0, ranges };
}

function findCoverageKey(cov, file) {
  return Object.keys(cov).find((f) => f.replace(/\\/g, '/').endsWith(file));
}

export function main() {
  const { exitCode: regionExit, ranges } = resolveHandlerRegions();
  if (regionExit !== 0) return regionExit;

  const coveragePath = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
  let cov;
  try {
    cov = JSON.parse(readFileSync(coveragePath, 'utf8'));
  } catch (err) {
    console.error(`check-oauth-coverage: failed to read ${coveragePath}: ${err.message}`);
    console.error('Run `npm run test:oauth-coverage` first to generate coverage-final.json.');
    return 2;
  }

  const perFn = Object.fromEntries(ranges.map((r) => [r.fn, { hit: 0, total: 0 }]));
  let hit = 0;
  let total = 0;

  for (const range of ranges) {
    const fileKey = findCoverageKey(cov, range.file);
    if (!fileKey) {
      console.error(`check-oauth-coverage: ${range.file} not found in coverage-final.json`);
      console.error(
        'Ensure vitest.config.js coverage.include contains src/server.ts and src/lib/oauth/*.ts.'
      );
      return 2;
    }

    const { statementMap, s } = cov[fileKey];
    for (const [id, loc] of Object.entries(statementMap)) {
      if (loc.start.line >= range.start && loc.end.line <= range.end) {
        total += 1;
        perFn[range.fn].total += 1;
        if (s[id] > 0) {
          hit += 1;
          perFn[range.fn].hit += 1;
        }
      }
    }
  }

  const pct = total === 0 ? 0 : (100 * hit) / total;
  console.log(`OAuth-surface coverage: ${hit}/${total} = ${pct.toFixed(1)}%`);
  console.log('Per-handler breakdown:');
  for (const fn of Object.keys(perFn)) {
    const { hit: fnHit, total: fnTotal } = perFn[fn];
    const fnPct = fnTotal === 0 ? 0 : (100 * fnHit) / fnTotal;
    console.log(`  ${fn.padEnd(34)} ${fnHit}/${fnTotal} (${fnPct.toFixed(1)}%)`);
  }

  if (pct < COVERAGE_THRESHOLD_PERCENT) {
    console.error(
      `FAIL: OAuth-surface coverage ${pct.toFixed(1)}% is below the D-10 ${COVERAGE_THRESHOLD_PERCENT}% threshold`
    );
    return 1;
  }
  console.log(`PASS: coverage ${pct.toFixed(1)}% >= ${COVERAGE_THRESHOLD_PERCENT}%`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}

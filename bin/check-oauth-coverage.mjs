#!/usr/bin/env node
/**
 * OAuth-surface coverage gate for D-10 (plan 06-05).
 *
 * Reads coverage/coverage-final.json (V8 JSON format), counts statement hits
 * inside OAuth-handler line ranges, prints percentage, exits non-zero if below
 * 70%.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HANDLER_LINE_RANGES = [
  { file: 'src/lib/oauth/register-handler.ts', fn: 'createRegisterHandler', start: 7, end: 53 },
  { file: 'src/lib/oauth/token-handler.ts', fn: 'createTokenHandler', start: 27, end: 174 },
  { file: 'src/lib/oauth/tenant-handlers.ts', fn: 'createAuthorizeHandler', start: 39, end: 173 },
  {
    file: 'src/lib/oauth/tenant-handlers.ts',
    fn: 'createTenantTokenHandler',
    start: 212,
    end: 355,
  },
  { file: 'src/server.ts', fn: 'wellKnownAuthServerTenant', start: 623, end: 633 },
  { file: 'src/server.ts', fn: 'wellKnownProtectedResourceTenant', start: 636, end: 647 },
  { file: 'src/server.ts', fn: 'wellKnownAuthServer', start: 1049, end: 1067 },
  { file: 'src/server.ts', fn: 'wellKnownProtectedResource', start: 1070, end: 1084 },
];

const COVERAGE_THRESHOLD_PERCENT = Number.parseFloat(
  process.env.MS365_MCP_OAUTH_COVERAGE_THRESHOLD ?? '70'
);
if (!Number.isFinite(COVERAGE_THRESHOLD_PERCENT) || COVERAGE_THRESHOLD_PERCENT <= 0) {
  throw new Error('MS365_MCP_OAUTH_COVERAGE_THRESHOLD must be a positive number when set');
}

function matchesRangeMarker(range, window) {
  if (window.includes(`export function ${range.fn}`)) return true;
  return (
    (range.fn === 'wellKnownAuthServer' &&
      window.includes("'/.well-known/oauth-authorization-server'")) ||
    (range.fn === 'wellKnownProtectedResource' &&
      window.includes("'/.well-known/oauth-protected-resource'")) ||
    (range.fn === 'wellKnownAuthServerTenant' &&
      window.includes("'/t/:tenantId/.well-known/oauth-authorization-server'")) ||
    (range.fn === 'wellKnownProtectedResourceTenant' &&
      window.includes("'/t/:tenantId/.well-known/oauth-protected-resource'"))
  );
}

function verifyLineRanges() {
  const drift = [];
  for (const range of HANDLER_LINE_RANGES) {
    const filePath = path.resolve(__dirname, '..', range.file);
    let lines;
    try {
      lines = readFileSync(filePath, 'utf8').split('\n');
    } catch (err) {
      console.error(
        `check-oauth-coverage: failed to read ${range.file} for line-range verification: ${err.message}`
      );
      return 2;
    }

    const window = [
      lines[range.start - 2] ?? '',
      lines[range.start - 1] ?? '',
      lines[range.start] ?? '',
    ].join('\n');
    if (!matchesRangeMarker(range, window)) {
      drift.push({ ...range, window });
    }
  }

  if (drift.length > 0) {
    console.error('check-oauth-coverage: HANDLER_LINE_RANGES drifted from source:');
    for (const d of drift) {
      console.error(`  ${d.fn} in ${d.file} at start=${d.start} — marker not found`);
      console.error(`    window:\n${d.window}`);
    }
    console.error('Re-run grep for handler function names/routes and update HANDLER_LINE_RANGES.');
    return 3;
  }
  return 0;
}

function findCoverageKey(cov, file) {
  return Object.keys(cov).find((f) => f.replace(/\\/g, '/').endsWith(file));
}

export function main() {
  const driftExit = verifyLineRanges();
  if (driftExit !== 0) return driftExit;

  const coveragePath = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
  let cov;
  try {
    cov = JSON.parse(readFileSync(coveragePath, 'utf8'));
  } catch (err) {
    console.error(`check-oauth-coverage: failed to read ${coveragePath}: ${err.message}`);
    console.error('Run `npm run test:oauth-coverage` first to generate coverage-final.json.');
    return 2;
  }

  const perFn = Object.fromEntries(HANDLER_LINE_RANGES.map((r) => [r.fn, { hit: 0, total: 0 }]));
  let hit = 0;
  let total = 0;

  for (const range of HANDLER_LINE_RANGES) {
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

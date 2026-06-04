#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const DEFAULT_BATCH_SIZE = 1;
const DEFAULT_VITEST_NODE_OPTIONS = '--max-old-space-size=2048';
const batchSize = Number.parseInt(
  process.env.MS365_MCP_TEST_BATCH_SIZE ?? String(DEFAULT_BATCH_SIZE),
  10
);
const vitestNodeOptions =
  process.env.MS365_MCP_VITEST_NODE_OPTIONS ??
  process.env.NODE_OPTIONS ??
  DEFAULT_VITEST_NODE_OPTIONS;

if (!Number.isInteger(batchSize) || batchSize < 1) {
  throw new Error(
    `MS365_MCP_TEST_BATCH_SIZE must be a positive integer; got ${process.env.MS365_MCP_TEST_BATCH_SIZE}`
  );
}

const runIntegration = process.env.MS365_MCP_INTEGRATION === '1';
const skipCiFlaky = process.env.MS365_MCP_SKIP_CI_FLAKY === '1';
const cliArgs = process.argv.slice(2);
const explicitFilters = cliArgs.filter((arg) => !arg.startsWith('-') && looksLikeTestFilter(arg));
const extraArgs = cliArgs.filter((arg) => !explicitFilters.includes(arg));

const integrationFiles = new Set(['test/token-endpoint.test.ts']);
const flakyCiFiles = new Set([
  'test/lib/otel-metrics.test.ts',
  'test/lib/graph-client.span.test.ts',
  'test/lib/middleware/retry.span.test.ts',
  'test/lib/rate-limit/sliding-window.test.ts',
  'test/transports/legacy-sse.test.ts',
  'test/tool-selection/per-tenant-bm25.test.ts',
  'test/request-context.test.ts',
  'test/logger-correlation.test.ts',
  'test/audit/audit-integration.test.ts',
  'test/integration/four-flows.test.ts',
  'test/integration/tenant-disable-cascade.test.ts',
  'test/tool-selection/dispatch-two-tenant.int.test.ts',
  'test/tool-selection/tools-list-filter.int.test.ts',
  'test/integration/multi-tenant/bearer-tid-mismatch.int.test.ts',
  'src/lib/admin/__tests__/api-keys.revoke.int.test.ts',
]);

function run(command, args, env = process.env) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    env,
  });
}

function vitestEnv(files) {
  const batchNeedsIntegration = files.some(isIntegrationFile);
  return {
    ...process.env,
    MS365_MCP_INTEGRATION: batchNeedsIntegration ? process.env.MS365_MCP_INTEGRATION : undefined,
    NODE_OPTIONS: vitestNodeOptions,
  };
}

function collectTrackedTestFiles() {
  const result = spawnSync('git', ['ls-files'], {
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error('Unable to list tracked test files with git ls-files');
  }

  return result.stdout
    .split('\n')
    .filter(Boolean)
    .filter((file) => /(?:\.test|\.spec)\.(?:c|m)?[jt]sx?$/.test(file))
    .filter((file) => !file.startsWith('dist/'))
    .filter((file) => !file.startsWith('node_modules/'))
    .filter((file) => !file.startsWith('.claude/'))
    .filter((file) => runIntegration || !isIntegrationFile(file))
    .filter((file) => !skipCiFlaky || !flakyCiFiles.has(file))
    .filter(matchesExplicitFilters);
}

function isIntegrationFile(file) {
  return (
    file.includes('.int.test.') ||
    file.startsWith('test/integration/') ||
    integrationFiles.has(file)
  );
}

function looksLikeTestFilter(arg) {
  return /(?:\.test|\.spec)\.(?:c|m)?[jt]sx?$/.test(arg) || isExistingDirectory(arg);
}

function isExistingDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function matchesExplicitFilters(file) {
  if (explicitFilters.length === 0) return true;
  return explicitFilters.some((filter) => {
    if (isExistingDirectory(filter)) return file.startsWith(`${filter.replace(/\/$/, '')}/`);
    return file === filter;
  });
}

function chunk(files) {
  const batches = [];
  for (let index = 0; index < files.length; index += batchSize) {
    batches.push(files.slice(index, index + batchSize));
  }
  return batches;
}

function runVitest(files, batchIndex, batchCount) {
  const label = batchCount === 1 ? 'single batch' : `batch ${batchIndex + 1}/${batchCount}`;
  console.log(`[vitest-batched] ${label}: ${files.length} file(s)`);

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = run(command, ['vitest', 'run', ...extraArgs, ...files], vitestEnv(files));

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const files = collectTrackedTestFiles();

if (files.length === 0) {
  console.log('[vitest-batched] no matching test files');
  process.exit(0);
}

const batches = chunk(files);

for (const [index, batch] of batches.entries()) {
  runVitest(batch, index, batches.length);
}

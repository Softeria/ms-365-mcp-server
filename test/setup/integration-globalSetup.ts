/**
 * Vitest globalSetup for integration tier (plan 06-05, D-07).
 *
 * Starts ONE Postgres + ONE Redis container per vitest process and exposes
 * their URLs via project.provide(). Individual tests call vitest.inject() to
 * read the URLs.
 *
 * Gated by MS365_MCP_INTEGRATION=1 — unit-only runs (`npm test`) skip this
 * file entirely via vitest.config.js globalSetup conditional.
 *
 * Per 06-CONTEXT.md §D-07 + 06-RESEARCH.md §Pattern 5:
 *   - Postgres 16-alpine image matches the existing Phase 3 harness.
 *   - Redis 7-alpine image matches the docker-compose.yml reference.
 *   - 30s cold-start is paid ONCE per process (not per file).
 *
 * Type-safe inject: vitest supports declaration-merge on ProvidedContext;
 * test files that inject('pgUrl') get `string` back.
 */
import type { TestProject } from 'vitest/node';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';

declare module 'vitest' {
  export interface ProvidedContext {
    pgUrl: string;
    redisUrl: string;
  }
}

let pg: StartedPostgreSqlContainer | undefined;
let redis: StartedRedisContainer | undefined;

const PROVIDED_SERVICE_TESTS = new Set([
  'test/integration/multi-tenant/bearer-tid-mismatch.int.test.ts',
  'test/integration/multi-tenant/disable-cascade.int.test.ts',
  'test/integration/multi-tenant/token-isolation.int.test.ts',
]);

function selectedTestFiles(): string[] {
  return process.argv.slice(2).filter((arg) => arg.includes('test/') || arg.includes('.test.'));
}

function needsProvidedServices(): boolean {
  const filters = selectedTestFiles();
  return filters.length === 0 || filters.some((arg) => PROVIDED_SERVICE_TESTS.has(arg));
}

export async function setup(project: TestProject): Promise<void> {
  if (process.env.MS365_MCP_INTEGRATION !== '1') return;

  if (!needsProvidedServices()) {
    project.provide('pgUrl', process.env.MS365_MCP_DATABASE_URL ?? '');
    project.provide('redisUrl', process.env.MS365_MCP_REDIS_URL ?? '');
    return;
  }

  pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withUsername('mcp')
    .withPassword('mcp')
    .withDatabase('mcp')
    .start();
  redis = await new RedisContainer('redis:7-alpine').start();

  project.provide('pgUrl', pg.getConnectionUri());
  project.provide('redisUrl', redis.getConnectionUrl());
}

export async function teardown(): Promise<void> {
  if (pg) {
    try {
      await pg.stop();
    } catch {
      // Swallow — teardown errors should not fail the suite
    }
  }
  if (redis) {
    try {
      await redis.stop();
    } catch {
      // Swallow
    }
  }
}

// test/setup.ts
// Node 18 File/Blob polyfill removed — Node 20+ ships these natively.
// This file is retained as a vitest setupFiles hook for future global setup.

// Plan 05-04 (TENANT-08): existing test files that invoke executeGraphTool
// directly (without seeding requestContext with a tenant triple) used to
// proceed straight to Graph. The new dispatch-guard rejects undefined-ALS
// calls by default (fail-closed for stdio + HTTP production paths).
//
// Test files that DO want to exercise the guard mock the registry and seed
// the context themselves (see test/tool-selection/). For all OTHER existing
// test files, the intent is to drive executeGraphTool WITHOUT caring about
// tenant isolation — they pre-date Plan 05-04 and were written against a
// flat dispatch surface.
//
// We solve this with a permissive global stdio fallback registered at setup
// time. Any test that wants strict dispatch-guard behavior (see
// test/tool-selection/dispatch-guard.test.ts + dispatch-enforcement.int
// .test.ts) explicitly calls `setStdioFallback(undefined)` in its
// beforeEach to drop the permissive seed.
import { beforeEach, vi } from 'vitest';
import { setStdioFallback } from '../src/lib/tool-selection/dispatch-guard.js';

// Phase 7 memory tables use `DEFAULT gen_random_uuid()` for durable row IDs.
// Real Postgres supports it; pg-mem needs the function registered on every
// new in-memory database before migrations are replayed.
vi.mock('pg-mem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pg-mem')>();
  const { randomUUID } = await import('node:crypto');

  return {
    ...actual,
    newDb: (...args: Parameters<typeof actual.newDb>) => {
      const db = actual.newDb(...args);
      db.public.registerFunction({
        name: 'gen_random_uuid',
        returns: actual.DataType.uuid,
        implementation: () => randomUUID(),
      });
      db.public.registerEquivalentType({
        name: 'tsvector',
        equivalentTo: actual.DataType.text,
        isValid: () => true,
      });
      db.public.registerEquivalentType({
        name: 'tsquery',
        equivalentTo: actual.DataType.text,
        isValid: () => true,
      });
      db.public.registerFunction({
        name: 'to_tsvector',
        args: [actual.DataType.text, actual.DataType.text],
        returns: actual.DataType.text,
        implementation: (_language: string, content: string) => content ?? '',
      });
      db.public.registerFunction({
        name: 'plainto_tsquery',
        args: [actual.DataType.text, actual.DataType.text],
        returns: actual.DataType.text,
        implementation: (_language: string, query: string) => query ?? '',
      });
      db.public.registerFunction({
        name: 'ts_rank_cd',
        args: [actual.DataType.text, actual.DataType.text],
        returns: actual.DataType.float,
        implementation: () => 0,
      });
      db.public.registerFunction({
        name: 'jsonb_typeof',
        args: [actual.DataType.jsonb],
        returns: actual.DataType.text,
        implementation: (value: unknown) => {
          if (value === null) return 'null';
          if (Array.isArray(value)) return 'array';
          if (typeof value === 'boolean') return 'boolean';
          if (typeof value === 'number') return 'number';
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value) as unknown;
              if (parsed === null) return 'null';
              if (Array.isArray(parsed)) return 'array';
              return typeof parsed === 'object' ? 'object' : typeof parsed;
            } catch {
              return 'string';
            }
          }
          return typeof value === 'object' ? 'object' : typeof value;
        },
      });
      db.registerLanguage('plpgsql', () => () => undefined);
      return db;
    },
  };
});

// Global timer reset — every test starts with real timers regardless of
// whatever a prior test file left behind. Vitest's per-file VM isolation
// SHOULD keep fake timers bounded to the file that installed them, but the
// singleThread pool + vitest 3.2.4 shows leakage on GitHub Actions runners
// (observed 2026-04-24: tests using a real `setTimeout(r, 100)` hang for 45 s
// on CI while passing in <100 ms locally). A global `useRealTimers()` in
// beforeEach is the defensive fix — afterEach in the leaking file still
// runs, but if it fails to fully reset, we catch it before the next test
// inherits the fake clock.
beforeEach(() => {
  vi.useRealTimers();
});

// Universal permissive fallback: every tool alias is always allowed.
// Subclass Set so `.has()` returns true for every key while the other
// Set primitives still work normally for callers that touch `.size`,
// iterate, etc.
class PermissiveSet extends Set<string> {
  override has(_value: string): boolean {
    return true;
  }
}

const PERMISSIVE: ReadonlySet<string> = new PermissiveSet();

setStdioFallback({
  enabledToolsSet: PERMISSIVE,
  enabledToolsExplicit: false,
  tenantId: 'test-permissive',
  presetVersion: 'test-permissive',
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Node 18 lacks the File global that the generated Zod schemas reference.
// Must be set before the dynamic import below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!globalThis.File) (globalThis as any).File = Blob;

const { api } = await import('../src/generated/client.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Endpoint {
  toolName: string;
  pathPattern: string;
  method: string;
  scopes?: string[] | string[][];
  workScopes?: string[] | string[][];
}

const endpoints: Endpoint[] = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
);

describe('endpoints.json validation', () => {
  it('should not have endpoints with both scopes and workScopes', () => {
    const violations = endpoints.filter((e) => e.scopes && e.workScopes);

    if (violations.length > 0) {
      const details = violations
        .map(
          (e) =>
            `  ${e.toolName}: scopes=${JSON.stringify(e.scopes)} workScopes=${JSON.stringify(e.workScopes)}`
        )
        .join('\n');
      expect.fail(
        `${violations.length} endpoint(s) have both scopes and workScopes. ` +
          `Use scopes for personal-account-compatible endpoints, workScopes for org-only endpoints, never both.\n${details}`
      );
    }
  });

  it('should have well-formed scope groups (flat string[] or nested string[][])', () => {
    const isStringArray = (v: unknown): boolean =>
      Array.isArray(v) && v.every((s) => typeof s === 'string');

    const malformed: string[] = [];
    for (const e of endpoints) {
      for (const field of ['scopes', 'workScopes'] as const) {
        const value = e[field];
        if (value === undefined) continue;
        if (!Array.isArray(value)) {
          malformed.push(`${e.toolName}.${field}: must be an array`);
          continue;
        }
        if (value.length === 0) continue; // empty = no scope required, valid
        const nested = Array.isArray(value[0]);
        // All entries must be consistent: either all strings (flat) or all non-empty string[] (groups).
        const ok = nested
          ? value.every((g) => isStringArray(g) && (g as string[]).length > 0)
          : isStringArray(value);
        if (!ok) {
          malformed.push(`${e.toolName}.${field}: ${JSON.stringify(value)}`);
        }
      }
    }

    if (malformed.length > 0) {
      expect.fail(
        `${malformed.length} endpoint(s) have malformed scope groups. ` +
          `Use string[] for a single required set, or string[][] for OR-groups.\n${malformed.join('\n')}`
      );
    }
  });

  it('should not have duplicate tool names', () => {
    const seen = new Set<string>();
    const duplicates = endpoints.filter((e) => {
      if (seen.has(e.toolName)) return true;
      seen.add(e.toolName);
      return false;
    });

    if (duplicates.length > 0) {
      const details = duplicates
        .map((e) => `  ${e.toolName} (${e.method.toUpperCase()} ${e.pathPattern})`)
        .join('\n');
      expect.fail(
        `${duplicates.length} duplicate toolName(s) in endpoints.json. ` +
          `Each tool must be defined exactly once.\n${details}`
      );
    }
  });

  it('should have a matching generated client endpoint for every entry', () => {
    const generatedTools = new Set(api.endpoints.map((e) => e.alias));
    const orphans = endpoints.filter((e) => !generatedTools.has(e.toolName));

    if (orphans.length > 0) {
      const details = orphans
        .map((e) => `  ${e.toolName} (${e.method.toUpperCase()} ${e.pathPattern})`)
        .join('\n');
      expect.fail(
        `${orphans.length} endpoint(s) in endpoints.json have no matching generated client entry. ` +
          `Run npm run generate, or check that the path and method exist in the OpenAPI spec.\n${details}`
      );
    }
  });
});

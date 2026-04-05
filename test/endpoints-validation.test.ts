import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Node 18 lacks the File global that the generated Zod schemas reference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!globalThis.File) (globalThis as any).File = Blob;

import { api } from '../src/generated/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Endpoint {
  toolName: string;
  pathPattern: string;
  method: string;
  scopes?: string[];
  workScopes?: string[];
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

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

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
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// The generated client is produced by `npm run generate` (run in CI before tests).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = readFileSync(path.join(__dirname, '..', 'src', 'generated', 'client.ts'), 'utf8');

// Regression guard for the nested-anyOf pruning fix (bin/modules/simplified-openapi.mjs).
// These component schemas are referenced only via `anyOf: [{ $ref }, { nullable object }]`
// nested inside an inline request body property. findUsedSchemas previously did not trace
// those nested refs, so pruneUnusedSchemas removed them and the later pass stripped the
// now-dangling reference as "broken" — degrading the request body to a bare object.
// Each schema below corresponds to a real tool whose body would otherwise be untyped.
const PRESERVED: Array<[string, string]> = [
  ['microsoft_graph_driveRecipient', 'share-drive-item (invite) recipients'],
  ['microsoft_graph_driveItemUploadableProperties', 'create-upload-session item'],
  ['microsoft_graph_attachmentItem', 'create-mail-attachment-upload-session'],
  ['microsoft_graph_teamworkActivityTopic', 'send-my-activity-notification topic'],
];

describe('generator preserves nested-anyOf request-body schemas', () => {
  for (const [schema, usedBy] of PRESERVED) {
    it(`keeps ${schema} typed (${usedBy})`, () => {
      expect(client, `${schema} was pruned — nested-anyOf ref tracing regressed`).toContain(
        `const ${schema} =`
      );
    });
  }
});

import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

// Which tools get a behavior belongs in endpoints.json, next to the rest of each tool's
// config. Code keyed to a tool name drifts from it, and a renamed or new tool silently
// misses out. Literals equal to a tool name are the tell; prose that mentions one is fine.
const ALLOWED: Record<string, string[]> = {
  // get-upload-url's error names the base64 tool to use instead, picked by target path
  'graph-tools.ts': [
    'add-calendar-event-attachment',
    'add-shared-mailbox-attachment',
    'add-mail-attachment',
  ],
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ['generated', '__tests__'].includes(entry.name) ? [] : sourceFiles(full);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('tool names in code', () => {
  it('keeps endpoints.json tool names out of src code', () => {
    const toolNames = new Set(
      (
        JSON.parse(readFileSync(path.join(srcDir, 'endpoints.json'), 'utf8')) as Array<{
          toolName: string;
        }>
      ).map((e) => e.toolName)
    );
    const found: string[] = [];
    for (const file of sourceFiles(srcDir)) {
      const rel = path.relative(srcDir, file);
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
      const visit = (node: ts.Node) => {
        if (
          (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
          toolNames.has(node.text) &&
          !ALLOWED[rel]?.includes(node.text)
        ) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          found.push(`${rel}:${line + 1} '${node.text}'`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(found, 'move these to an endpoints.json field').toEqual([]);
  });
});

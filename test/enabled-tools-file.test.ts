import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseEnabledToolsFileContent,
  readEnabledToolsFromFile,
} from '../src/lib/enabled-tools-file.js';

describe('parseEnabledToolsFileContent', () => {
  it('joins patterns with |, same as --enabled-tools=a|b', () => {
    expect(
      parseEnabledToolsFileContent(`
# Mail
list-mail-messages
get-mail-message

list-mail-messages

mail|calendar
`)
    ).toBe('list-mail-messages|get-mail-message|list-mail-messages|mail|calendar');
  });

  it('only treats a line starting with # as a comment', () => {
    expect(parseEnabledToolsFileContent('foo#bar\n# skip\nbaz')).toBe('foo#bar|baz');
  });

  it('returns an empty string for a comment-only file', () => {
    expect(parseEnabledToolsFileContent('# nothing\n\n')).toBe('');
  });
});

describe('readEnabledToolsFromFile', () => {
  it('loads a file into a usable pattern', () => {
    const dir = mkdtempSync(join(tmpdir(), 'enabled-tools-'));
    const path = join(dir, 'tools.txt');
    writeFileSync(path, 'list-mail-messages\nget-mail-message\n');
    const pattern = readEnabledToolsFromFile(path);
    const re = new RegExp(pattern, 'i');
    expect(re.test('list-mail-messages')).toBe(true);
    expect(re.test('get-mail-message')).toBe(true);
    expect(re.test('list-drives')).toBe(false);
  });

  it('fails on a missing file', () => {
    expect(() => readEnabledToolsFromFile('/no/such/enabled-tools-file.txt')).toThrow(
      /could not read/
    );
  });
});

import { describe, expect, it } from 'vitest';
import { serverToolExtensionMatchesSearch } from '../src/tool-extensions/index.ts';
import { TOOL_CATEGORIES } from '../src/tool-categories.ts';

describe('server-tool-extensions', () => {
  it('serverToolExtensionMatchesSearch applies category and query', () => {
    const ext = {
      name: 'download-drive-file-text',
      path: '/x',
      description: 'download text from drive',
    };
    expect(serverToolExtensionMatchesSearch(ext, TOOL_CATEGORIES.files, undefined)).toBe(true);
    expect(serverToolExtensionMatchesSearch(ext, TOOL_CATEGORIES.mail, undefined)).toBe(false);
    expect(serverToolExtensionMatchesSearch(ext, undefined, 'drive')).toBe(true);
    expect(serverToolExtensionMatchesSearch(ext, undefined, 'nomatch')).toBe(false);
  });
});

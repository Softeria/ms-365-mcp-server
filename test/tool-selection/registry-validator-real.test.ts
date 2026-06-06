import { describe, expect, it } from 'vitest';
import { DISCOVERY_META_TOOL_NAMES } from '../../src/lib/tenant-surface/surface.js';
import { computeEnabledToolsSet } from '../../src/lib/tool-selection/enabled-tools-parser.js';
import { validateSelectors } from '../../src/lib/tool-selection/registry-validator.js';

describe('registry validator with real discovery preset', () => {
  it('accepts every registered discovery-v1 synthetic/meta alias as an exact selector', () => {
    const selectors = [...DISCOVERY_META_TOOL_NAMES];
    const result = validateSelectors(selectors);

    expect(result).toEqual({ ok: true });
    expect(selectors).toContain('bulk-action');
    expect(selectors).toContain('read-bulk-result');
  });

  it('does not expand Graph workload selectors into synthetic discovery aliases', () => {
    const listTools = computeEnabledToolsSet('list:*', 'essentials-v1');
    const deleteTools = computeEnabledToolsSet('delete:*', 'essentials-v1');

    expect(listTools.has('list-skills')).toBe(false);
    expect(listTools.has('list-recipes')).toBe(false);
    expect(listTools.has('list-bookmarks')).toBe(false);
    expect(deleteTools.has('delete-skill')).toBe(false);
  });
});

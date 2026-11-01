import { describe, it, expect } from 'vitest';
import { buildAllowedScopeDiagnostics } from '../src/auth.js';

/**
 * The /drives/{drive-id}/... item tools are how a Sites.Selected deployment reads and
 * writes files in a granted site (Graph serves those paths for any drive of a granted
 * site collection). Each of them must therefore accept Sites.Selected as an alternative
 * to Files.Read / Files.ReadWrite, while keeping Files.* as the primary group so login
 * scopes without an allowlist are unchanged.
 */
const DRIVE_ITEM_TOOLS = [
  'get-drive-root-item',
  'get-drive-item',
  'list-folder-files',
  'upload-file-content',
  'create-upload-session',
  'create-onedrive-folder',
  'move-rename-onedrive-item',
  'copy-drive-item',
  'list-drive-item-versions',
];
const enabledTools = `^(${DRIVE_ITEM_TOOLS.join('|')})$`;

describe('drive item tools under a Sites.Selected allowlist', () => {
  it('are all enabled and request only Sites.Selected', () => {
    const d = buildAllowedScopeDiagnostics({
      orgMode: true,
      enabledTools,
      allowedScopes: 'User.Read Sites.Selected',
    });
    expect(d.disabledTools.map((t) => t.toolName)).toEqual([]);
    expect(d.effectivePermissions).toEqual(['Sites.Selected']);
  });

  it('are all disabled when the allowlist has neither Files.* nor Sites.Selected', () => {
    const d = buildAllowedScopeDiagnostics({
      orgMode: true,
      enabledTools,
      allowedScopes: 'User.Read',
    });
    expect(d.disabledTools.map((t) => t.toolName).sort()).toEqual([...DRIVE_ITEM_TOOLS].sort());
  });

  it('still request Files.ReadWrite (primary group) without an allowlist', () => {
    const d = buildAllowedScopeDiagnostics({ orgMode: true, enabledTools });
    expect(d.effectivePermissions).toEqual(['Files.ReadWrite']);
  });
});

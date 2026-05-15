import { describe, expect, it } from 'vitest';
import { buildScopeDiagnostics } from '../src/auth.js';

describe('--list-permissions diagnostics', () => {
  it('prints legacy permissions alias and hierarchy-aware diagnostics', () => {
    const output = buildScopeDiagnostics(
      ['Files.Read', 'Mail.Read'],
      ['Mail.ReadWrite', 'Files.ReadWrite.All', 'User.Read']
    );

    expect(output.permissions).toEqual(output.toolPermissions);
    expect(output.authScopes).toEqual(['Files.ReadWrite.All', 'Mail.ReadWrite', 'User.Read']);
    expect(output.missingAuthScopesForEnabledTools).toEqual([]);
    expect(output.extraAuthScopesNotImpliedByTools).toEqual(
      expect.arrayContaining(['Files.ReadWrite.All', 'Mail.ReadWrite', 'User.Read'])
    );
  });

  it('reports missing scopes without treating hierarchy coverage as missing', () => {
    const output = buildScopeDiagnostics(['Files.Read', 'Mail.Read'], ['Mail.Read']);

    expect(output.missingAuthScopesForEnabledTools).toEqual(['Files.Read']);
  });
});

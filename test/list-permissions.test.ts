import { describe, expect, it } from 'vitest';
import { buildAllowedScopeDiagnostics, buildScopeDiagnostics } from '../src/auth.js';

describe('--list-permissions diagnostics', () => {
  it('prints legacy permissions alias for effective permissions', () => {
    const output = buildAllowedScopeDiagnostics({
      enabledTools: 'list-mail-messages|list-drive-items',
      allowedScopes: 'Mail.ReadWrite Files.ReadWrite.All User.Read',
    });

    expect(output.permissions).toEqual(output.effectivePermissions);
    expect(output.allowedScopes).toEqual(['Files.ReadWrite.All', 'Mail.ReadWrite', 'User.Read']);
    expect(output.missingAllowedScopesForTools).toEqual([]);
    expect(output.extraAllowedScopesNotUsedByTools).not.toContain('Mail.ReadWrite');
  });

  it('reports disabled tools and missing scopes', () => {
    const output = buildAllowedScopeDiagnostics({
      enabledTools: 'list-mail-messages|list-calendar-events',
      allowedScopes: 'Mail.Read',
    });

    expect(output.toolPermissions).toEqual(expect.arrayContaining(['Mail.Read', 'Calendars.Read']));
    expect(output.effectivePermissions).toEqual(['Mail.Read']);
    expect(output.permissions).toEqual(output.effectivePermissions);
    expect(output.disabledTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolName: 'list-calendar-events',
          missingScopes: ['Calendars.Read'],
        }),
      ])
    );
  });

  it('keeps hierarchy coverage from reporting false missing scopes', () => {
    const output = buildScopeDiagnostics(['Files.Read', 'Mail.Read'], ['Mail.Read']);

    expect(output.missingAllowedScopesForTools).toEqual(['Files.Read']);
  });
});

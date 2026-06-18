import { describe, it, expect } from 'vitest';
import {
  getEndpointScopeGroups,
  getMissingAllowedScopesForGroups,
  buildScopesFromEndpoints,
  buildAllowedScopeDiagnostics,
  resolveAuthScopes,
} from '../src/auth.js';

/**
 * OR-group scopes: workScopes/scopes may be a flat string[] (single AND-group) or a nested
 * string[][] (alternatives - satisfied if any one group is fully held). copilot-retrieve uses
 * [["Files.Read.All","Sites.Read.All"], ["ExternalItem.Read.All"]] because its dataSources are
 * permission alternatives per the Microsoft Graph Copilot Retrieval API.
 */
describe('getEndpointScopeGroups', () => {
  it('wraps a flat array as a single group', () => {
    expect(getEndpointScopeGroups({ scopes: ['Mail.Read'] })).toEqual([['Mail.Read']]);
  });

  it('returns nested groups as-is', () => {
    const groups = getEndpointScopeGroups(
      { workScopes: [['Files.Read.All', 'Sites.Read.All'], ['ExternalItem.Read.All']] },
      true
    );
    expect(groups).toEqual([['Files.Read.All', 'Sites.Read.All'], ['ExternalItem.Read.All']]);
  });

  it('omits workScopes when work account scopes are not included', () => {
    expect(getEndpointScopeGroups({ workScopes: [['ExternalItem.Read.All']] }, false)).toEqual([]);
  });
});

describe('getMissingAllowedScopesForGroups', () => {
  const groups = [['Files.Read.All', 'Sites.Read.All'], ['ExternalItem.Read.All']];

  it('is allowed when the primary group is fully covered', () => {
    expect(getMissingAllowedScopesForGroups(groups, ['Files.Read.All', 'Sites.Read.All'])).toEqual(
      []
    );
  });

  it('is allowed when an alternative group is fully covered', () => {
    expect(getMissingAllowedScopesForGroups(groups, ['ExternalItem.Read.All'])).toEqual([]);
  });

  it('reports the closest (smallest) gap when no group is satisfied', () => {
    // Files.Read.All present -> group 1 missing only Sites.Read.All (1), group 2 missing
    // ExternalItem.Read.All (1). Tie resolves to the first group encountered.
    expect(getMissingAllowedScopesForGroups(groups, ['Files.Read.All'])).toEqual([
      'Sites.Read.All',
    ]);
  });

  it('treats undefined allowedScopes as no restriction', () => {
    expect(getMissingAllowedScopesForGroups(groups, undefined)).toEqual([]);
  });
});

describe('copilot-retrieve login + gate (real endpoints.json)', () => {
  it('requests only the primary group at login, not ExternalItem.Read.All', () => {
    const scopes = buildScopesFromEndpoints(true);
    expect(scopes).toContain('Files.Read.All');
    expect(scopes).toContain('Sites.Read.All');
    // ExternalItem.Read.All is the higher-privileged alternative - opt-in via --extra-scopes.
    expect(scopes).not.toContain('ExternalItem.Read.All');
  });

  const isDisabled = (allowedScopes: string) =>
    buildAllowedScopeDiagnostics({ orgMode: true, allowedScopes }).disabledTools.find(
      (t) => t.toolName === 'copilot-retrieve'
    );

  it('stays enabled with only SharePoint/OneDrive scopes', () => {
    expect(isDisabled('Files.Read.All Sites.Read.All')).toBeUndefined();
  });

  it('stays enabled with only the connector scope', () => {
    expect(isDisabled('ExternalItem.Read.All')).toBeUndefined();
  });

  it('is disabled when no group is satisfied, reporting the smallest gap', () => {
    const disabled = isDisabled('Mail.Read');
    expect(disabled).toBeDefined();
    expect(disabled?.missingScopes).toEqual(['ExternalItem.Read.All']);
  });

  // The allowlist gates which group enables the tool; the requested scopes must match that
  // group. Otherwise an endpoint enabled via a non-primary alternative would request the
  // primary group - leaking scopes outside the allowlist and omitting the one it needs.
  const effective = (allowedScopes?: string) =>
    resolveAuthScopes({ orgMode: true, enabledTools: '^copilot-retrieve$', allowedScopes });

  it('requests the satisfied alternative group, not the primary group', () => {
    expect(effective('ExternalItem.Read.All')).toEqual(['ExternalItem.Read.All']);
  });

  it('requests the primary group when the allowlist satisfies it', () => {
    expect(effective('Files.Read.All Sites.Read.All').sort()).toEqual([
      'Files.Read.All',
      'Sites.Read.All',
    ]);
  });

  it('defaults to the primary group with no allowlist (least-privilege)', () => {
    const scopes = effective();
    expect(scopes.sort()).toEqual(['Files.Read.All', 'Sites.Read.All']);
    expect(scopes).not.toContain('ExternalItem.Read.All');
  });
});

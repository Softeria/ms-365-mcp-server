import { describe, it, expect } from 'vitest';
import { buildScopesFromEndpoints } from '../src/auth.js';

describe('buildScopesFromEndpoints', () => {
  it('returns a non-empty scope set with default arguments', () => {
    const scopes = buildScopesFromEndpoints();
    expect(scopes.length).toBeGreaterThan(0);
    // Scope hierarchy collapses Read into ReadWrite when both endpoints exist.
    expect(scopes).toContain('Mail.ReadWrite');
    expect(scopes).not.toContain('Mail.Read');
  });

  describe('readOnly flag', () => {
    it('downgrades Mail.ReadWrite to Mail.Read', () => {
      const scopes = buildScopesFromEndpoints(false, undefined, true);
      expect(scopes).toContain('Mail.Read');
      expect(scopes).not.toContain('Mail.ReadWrite');
    });

    it('excludes scopes that only appear on write endpoints', () => {
      expect(buildScopesFromEndpoints(false, undefined, false)).toContain('Mail.Send');
      expect(buildScopesFromEndpoints(false, undefined, true)).not.toContain('Mail.Send');
    });
  });

  describe('enabledTools filter', () => {
    it('narrows the scope set when a pattern is provided', () => {
      const all = buildScopesFromEndpoints(true, undefined, false);
      const filtered = buildScopesFromEndpoints(true, 'search|query', false);
      expect(filtered.length).toBeLessThan(all.length);
    });

    it('returns an empty array when no tools match the pattern', () => {
      expect(buildScopesFromEndpoints(true, 'no-such-tool-xyzzy', false)).toEqual([]);
    });
  });

  describe('orgMode flag', () => {
    it('includes work-only scopes when orgMode is true', () => {
      const personal = buildScopesFromEndpoints(false, undefined, false);
      const org = buildScopesFromEndpoints(true, undefined, false);
      expect(org.length).toBeGreaterThan(personal.length);
      expect(org).toContain('Sites.Read.All');
      expect(personal).not.toContain('Sites.Read.All');
    });
  });

  describe('org-mode + read-only + "search|query" filter', () => {
    const scopes = buildScopesFromEndpoints(true, 'search|query', true);

    it('excludes Mail.Read (only the POST search-query endpoint needs it)', () => {
      expect(scopes).not.toContain('Mail.Read');
      expect(scopes).not.toContain('Mail.ReadWrite');
    });

    it('includes Files.Read and Sites.Read.All for read-only search tools', () => {
      expect(scopes).toContain('Files.Read');
      expect(scopes).toContain('Sites.Read.All');
    });
  });
});

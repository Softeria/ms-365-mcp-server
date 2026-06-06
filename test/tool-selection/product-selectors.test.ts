/**
 * Plan 05.1-08 Task 1 — product-selector validation tests.
 *
 * Validates the registry-validator surface after the Phase 5.1 extension:
 *   - extractWorkloadPrefix derives the product name for aliases that start
 *     with one of the 5 product prefixes (__powerbi__, __pwrapps__,
 *     __pwrauto__, __exo__, __spadmin__).
 *   - WORKLOAD_PREFIXES automatically grows to include the 5 product names
 *     (plus the existing Graph workloads).
 *   - validateSelectors accepts `<product>:*` workload selectors + the 5
 *     product preset names.
 *   - Unknown product selectors surface Levenshtein suggestions from the
 *     expanded prefix pool (T-5.1-08-b — bounded cost).
 *
 * Mocks the generated client so the test fixture contains a representative
 * sample of product aliases AND a small set of Graph aliases — the test
 * exercises the auto-expansion contract, not the 5,000-op real catalog.
 *
 * Mocks PRESET_VERSIONS with all 6 preset names (essentials-v1 + five
 * product presets) so V5-V7 verify preset validation against the expanded
 * pool without requiring plan 5.1-07's compile step to have run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fixture: Graph aliases + 1 alias per product prefix. Covers the 5 product
// prefixes deterministically; the production behavior (aliases derived from
// the full 5-product codegen output) is covered by integration tests.
vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      // Graph aliases (plans 05-01..08)
      { alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' },
      { alias: 'mail.messages.list', method: 'get', path: '/me/messages' },
      { alias: 'users.list', method: 'get', path: '/users' },
      { alias: 'users.read', method: 'get', path: '/users/{id}' },
      { alias: '__beta__security-alerts', method: 'get', path: '/security/alerts_v2' },
      // Phase 5.1 product aliases (one per product — extension contract)
      { alias: '__powerbi__GroupsGetGroups', method: 'get', path: '/workspaces' },
      { alias: '__pwrapps__list-apps', method: 'get', path: '/apps' },
      { alias: '__pwrauto__list-flows', method: 'get', path: '/environments/{envId}/flows' },
      { alias: '__exo__get-mailbox', method: 'get', path: '/Mailbox' },
      { alias: '__spadmin__list-sites', method: 'get', path: '/Sites' },
    ],
  },
}));

// Preset fixture: all 6 preset names so V5/V6/V7 can exercise the expanded
// pool. In production this Map is populated by bin/modules/compile-preset.mjs
// from src/presets/*.json (plan 5.1-07 ships the product presets).
vi.mock('../../src/presets/generated-index.js', () => {
  const ESSENTIALS = Object.freeze(new Set<string>(['mail.messages.send']));
  const POWERBI_ESSENTIALS = Object.freeze(new Set<string>(['__powerbi__GroupsGetGroups']));
  const PWRAPPS_ESSENTIALS = Object.freeze(new Set<string>(['__pwrapps__list-apps']));
  const PWRAUTO_ESSENTIALS = Object.freeze(new Set<string>(['__pwrauto__list-flows']));
  const EXO_ESSENTIALS = Object.freeze(new Set<string>(['__exo__get-mailbox']));
  const SP_ADMIN_ESSENTIALS = Object.freeze(new Set<string>(['__spadmin__list-sites']));
  const DISCOVERY = Object.freeze(
    new Set<string>(['search-tools', 'get-tool-schema', 'execute-tool'])
  );
  return {
    DISCOVERY_V1_OPS: DISCOVERY,
    ESSENTIALS_V1_OPS: ESSENTIALS,
    PRESET_VERSIONS: new Map([
      ['essentials-v1', ESSENTIALS],
      ['discovery-v1', DISCOVERY],
      ['powerbi-essentials', POWERBI_ESSENTIALS],
      ['pwrapps-essentials', PWRAPPS_ESSENTIALS],
      ['pwrauto-essentials', PWRAUTO_ESSENTIALS],
      ['exo-essentials', EXO_ESSENTIALS],
      ['sp-admin-essentials', SP_ADMIN_ESSENTIALS],
    ]),
  };
});

describe('plan 05.1-08 Task 1 — product-aware selector validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('V1: getWorkloadPrefixes() auto-expansion', () => {
    it('V1: returns a Set containing the 5 product prefixes + existing Graph workloads', async () => {
      const { getWorkloadPrefixes } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const prefixes = getWorkloadPrefixes();
      // All 5 products present (derived from __<product>__ aliases)
      expect(prefixes.has('powerbi')).toBe(true);
      expect(prefixes.has('pwrapps')).toBe(true);
      expect(prefixes.has('pwrauto')).toBe(true);
      expect(prefixes.has('exo')).toBe(true);
      expect(prefixes.has('sp-admin')).toBe(true);
      // Existing Graph workloads unaffected (Graph-side regression guard)
      expect(prefixes.has('mail')).toBe(true);
      expect(prefixes.has('users')).toBe(true);
      expect(prefixes.has('security')).toBe(true);
      // Frozen set — no runtime mutation
      expect(Object.isFrozen(prefixes)).toBe(true);
    });
  });

  describe('V2-V3: product workload selectors', () => {
    it('V2: validateSelectors([powerbi:*]) returns {ok: true}', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['powerbi:*']);
      expect(r.ok).toBe(true);
    });

    it('V3: all 4 other product workload selectors valid', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['pwrapps:*', 'pwrauto:*', 'exo:*', 'sp-admin:*']);
      expect(r.ok).toBe(true);
    });
  });

  describe('V4: Levenshtein suggestions for typo product prefix', () => {
    it('V4: validateSelectors([powerbj:*]) returns {ok: false} with powerbi suggestion', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['powerbj:*']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toContain('powerbj:*');
      // Distance 1 from "powerbi" — should be the top suggestion.
      expect(r.suggestions['powerbj:*']).toContain('powerbi');
    });
  });

  describe('V5-V7: product preset selectors', () => {
    it('V5: preset:powerbi-essentials is valid', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['preset:powerbi-essentials']);
      expect(r.ok).toBe(true);
    });

    it('V6: all 4 other product preset selectors valid', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors([
        'preset:pwrapps-essentials',
        'preset:pwrauto-essentials',
        'preset:exo-essentials',
        'preset:sp-admin-essentials',
      ]);
      expect(r.ok).toBe(true);
    });

    it('V7: unknown preset name gets Levenshtein suggestion from expanded preset pool', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['preset:powerbi-essentials-v2']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toContain('preset:powerbi-essentials-v2');
      // Distance 3 from "powerbi-essentials" — should surface as a top-3 candidate.
      expect(r.suggestions['preset:powerbi-essentials-v2']).toContain('powerbi-essentials');
    });
  });

  describe('V8-V9: product op selectors', () => {
    it('V8: concrete product alias is valid as an op selector', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['__powerbi__GroupsGetGroups']);
      expect(r.ok).toBe(true);
    });

    it('V9: unknown product alias surfaces op-pool suggestions', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      // Distance-3 typo of __powerbi__GroupsGetGroups.
      const r = validateSelectors(['__powerbi__GroupsGetGroup']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toContain('__powerbi__GroupsGetGroup');
      // fastest-levenshtein capped at distance 3; top candidate should be the
      // real alias (distance 1 — dropped trailing `s`).
      const suggs = r.suggestions['__powerbi__GroupsGetGroup'] ?? [];
      expect(suggs).toContain('__powerbi__GroupsGetGroups');
    });
  });

  describe('V10: composite selector list', () => {
    it('V10: mixed preset + workload composition validates clean', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['preset:essentials-v1', 'preset:powerbi-essentials', 'exo:*']);
      expect(r.ok).toBe(true);
    });
  });
});

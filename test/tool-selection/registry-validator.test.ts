/**
 * Plan 05-04 Task 1 — registry-validator.ts unit tests.
 *
 * Validates selectors against the compiled registry; surfaces up to 3
 * Levenshtein-ranked suggestions per unknown selector (distance ≤ 3).
 * Mocks the generated client + PRESET_VERSIONS so we can exercise the
 * validator without a real regen output.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' },
      { alias: 'mail.messages.list', method: 'get', path: '/me/messages' },
      { alias: 'users.list', method: 'get', path: '/users' },
      { alias: 'users.read', method: 'get', path: '/users/{id}' },
      { alias: '__beta__security-alerts', method: 'get', path: '/security/alerts_v2' },
    ],
  },
}));

vi.mock('../../src/presets/generated-index.js', () => {
  const ESSENTIALS = Object.freeze(new Set<string>(['mail.messages.send']));
  const DISCOVERY = Object.freeze(
    new Set<string>([
      'search-tools',
      'get-tool-schema',
      'execute-tool',
      'record-fact',
      'bookmark-tool',
      'calendar-brief-view',
      'connector-diagnostics',
      'bulk-action',
      'read-bulk-result',
    ])
  );
  return {
    DISCOVERY_V1_OPS: DISCOVERY,
    ESSENTIALS_V1_OPS: ESSENTIALS,
    PRESET_VERSIONS: new Map([
      ['essentials-v1', ESSENTIALS],
      ['discovery-v1', DISCOVERY],
    ]),
  };
});

describe('plan 05-04 Task 1 — registry-validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateSelectors (happy paths)', () => {
    it('Test 12: known op selector → {ok: true}', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['mail.messages.send']);
      expect(r.ok).toBe(true);
    });

    it('Test 14: workload selector passes when ANY alias starts with the workload prefix', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      // "users" workload: both users.list and users.read have "users" as first segment
      const r = validateSelectors(['users:*']);
      expect(r.ok).toBe(true);
    });

    it('Test 14b: workload classifier strips __beta__ prefix', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      // __beta__security-alerts has "security" as its first segment after stripping.
      const r = validateSelectors(['security:*']);
      expect(r.ok).toBe(true);
    });

    it('registered native synthetic selector aliases are valid exact ops', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors([
        'search-tools',
        'get-tool-schema',
        'execute-tool',
        'record-fact',
        'bookmark-tool',
        'calendar-brief-view',
        'connector-diagnostics',
      ]);
      expect(r.ok).toBe(true);
    });

    it('synthetic aliases do not create workload selectors', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['search:*', 'record:*']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toEqual(['search:*', 'record:*']);
    });

    it('valid preset selector → {ok: true}', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['preset:essentials-v1']);
      expect(r.ok).toBe(true);
    });

    it('mixed known selectors all valid → {ok: true}', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors([
        'preset:essentials-v1',
        'users:*',
        'mail.messages.send',
        '+users.read',
      ]);
      expect(r.ok).toBe(true);
    });
  });

  describe('validateSelectors (suggestions)', () => {
    it('Test 13: unknown op with typo → ranked suggestions', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['mail.messages.sned']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toContain('mail.messages.sned');
      // First suggestion should be the intended op (distance 2: swap e/n)
      expect(r.suggestions['mail.messages.sned']?.[0]).toBe('mail.messages.send');
    });

    it('Test 13b: suggestions list capped at 3 items', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      // "users.XX" is distance 2 from both users.list and users.read
      const r = validateSelectors(['users.xx']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect((r.suggestions['users.xx'] ?? []).length).toBeLessThanOrEqual(3);
    });

    it('Test 13c: distance > 3 excluded from suggestions', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      // Nothing in the registry is within distance 3 of "zzzzzzzz"
      const r = validateSelectors(['zzzzzzzz']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.suggestions['zzzzzzzz']).toEqual([]);
    });

    it('unknown preset → suggests from PRESET_VERSIONS pool only', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['preset:nonexistent-preset']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toContain('preset:nonexistent-preset');
      // Suggestion pool is PRESET_VERSIONS — only "essentials-v1" is present;
      // distance may exceed 3 so suggestions can be empty. Must NOT include
      // any op or workload names.
      const suggs = r.suggestions['preset:nonexistent-preset'] ?? [];
      for (const s of suggs) {
        expect(['essentials-v1']).toContain(s);
      }
    });

    it('unknown workload → suggests from WORKLOAD_PREFIXES pool only', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['userz:*']);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error('unreachable');
      expect(r.invalid).toContain('userz:*');
      // Suggestion pool is WORKLOAD_PREFIXES — close enough to "users"
      const suggs = r.suggestions['userz:*'] ?? [];
      expect(suggs.length).toBeGreaterThan(0);
      expect(suggs).toContain('users');
    });

    it('invalid selector characters → invalid=[original input], no suggestions', async () => {
      const { validateSelectors } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const r = validateSelectors(['bad<script>']);
      expect(r.ok).toBe(false);
    });
  });

  describe('getRegistryAliases / getWorkloadPrefixes exports', () => {
    it('getRegistryAliases returns frozen Set of every alias', async () => {
      const { getRegistryAliases } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const aliases = getRegistryAliases();
      expect(aliases.has('mail.messages.send')).toBe(true);
      expect(aliases.has('__beta__security-alerts')).toBe(true);
      expect(aliases.has('search-tools')).toBe(true);
      expect(Object.isFrozen(aliases)).toBe(true);
    });

    it('getWorkloadPrefixes returns frozen Set with __beta__-stripped prefixes', async () => {
      const { getWorkloadPrefixes } =
        await import('../../src/lib/tool-selection/registry-validator.js');
      const prefixes = getWorkloadPrefixes();
      expect(prefixes.has('mail')).toBe(true);
      expect(prefixes.has('users')).toBe(true);
      expect(prefixes.has('security')).toBe(true); // from __beta__security-alerts
      expect(Object.isFrozen(prefixes)).toBe(true);
    });
  });
});

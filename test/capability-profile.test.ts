import { describe, expect, it } from 'vitest';
import {
  buildEffectiveCapabilityProfile,
  DEFAULT_SERVER_CAPABILITIES,
  type CapabilityName,
} from '../src/lib/mcp-capabilities/profile.js';

function effectiveNames(
  profile: ReturnType<typeof buildEffectiveCapabilityProfile>
): CapabilityName[] {
  return Object.entries(profile.capabilities)
    .filter(([, gate]) => gate.effective)
    .map(([name]) => name as CapabilityName);
}

describe('ClientCapabilityProfile', () => {
  it('disables unknown hosted-client advanced capabilities with reasons', () => {
    const profile = buildEffectiveCapabilityProfile({
      protocolVersion: '2025-06-18',
      clientInfo: { name: 'unknown-hosted-wrapper', version: '1.0.0' },
      advertisedCapabilities: {},
      transport: 'streamable-http',
      surface: 'discovery',
      tenantPolicy: { phase8Enabled: true },
      serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
    });

    for (const name of [
      'apps',
      'sampling',
      'elicitation',
      'roots',
      'progress',
      'cancellation',
    ] as const) {
      expect(profile.capabilities[name].effective).toBe(false);
      expect(profile.capabilities[name].disabledReason).toMatch(/client does not advertise/i);
    }

    expect(profile.capabilities.tools.effective).toBe(true);
    expect(profile.capabilities.structuredToolResults.effective).toBe(true);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.capabilities.apps)).toBe(true);
  });

  it('keeps Phase 8-disabled static tenants on a tool-only discovery loop', () => {
    const profile = buildEffectiveCapabilityProfile({
      protocolVersion: '2025-06-18',
      clientInfo: { name: 'static-tenant-client', version: '1.0.0' },
      advertisedCapabilities: {
        tools: {},
        resources: { subscribe: true },
        prompts: {},
        completions: {},
        logging: {},
        sampling: {},
        elicitation: {},
        roots: {},
        progress: {},
        cancellation: {},
        apps: {},
        structuredToolResults: {},
      },
      transport: 'streamable-http',
      surface: 'static',
      tenantPolicy: { phase8Enabled: false },
      serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
    });

    expect(effectiveNames(profile)).toEqual(['tools', 'structuredToolResults']);
    expect(profile.fallbacks).toContain(
      'tool-only discovery loop preserved for Phase 8-disabled tenants'
    );
    expect(profile.capabilities.resources.disabledReason).toMatch(/phase 8 disabled/i);
    expect(profile.capabilities.sampling.disabledReason).toMatch(/phase 8 disabled/i);
  });

  it('enables only advertised and transport-supported stdio capabilities', () => {
    const profile = buildEffectiveCapabilityProfile({
      protocolVersion: '2025-06-18',
      clientInfo: { name: 'claude-code', version: '1.0.0' },
      advertisedCapabilities: {
        tools: {},
        resources: { subscribe: true },
        prompts: {},
        completions: {},
        logging: {},
        sampling: {},
        elicitation: {},
        roots: {},
        progress: {},
        cancellation: {},
        structuredToolResults: {},
      },
      transport: 'stdio',
      surface: 'discovery',
      tenantPolicy: { phase8Enabled: true },
      serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
    });

    expect(profile.capabilities.roots.effective).toBe(true);
    expect(profile.capabilities.sampling.effective).toBe(true);
    expect(profile.capabilities.elicitation.effective).toBe(true);
    expect(profile.capabilities.apps.effective).toBe(false);
    expect(profile.capabilities.apps.disabledReason).toMatch(/client does not advertise/i);
  });

  it('keeps legacy SSE honest by disabling advanced capabilities', () => {
    const profile = buildEffectiveCapabilityProfile({
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'legacy-sse-client' },
      advertisedCapabilities: { tools: {}, resources: {}, prompts: {}, logging: {} },
      transport: 'legacy-sse',
      surface: 'discovery',
      tenantPolicy: { phase8Enabled: true },
      serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
    });

    expect(profile.capabilities.tools.effective).toBe(true);
    expect(profile.capabilities.resources.effective).toBe(false);
    expect(profile.capabilities.resources.disabledReason).toMatch(/transport does not support/i);
  });
});

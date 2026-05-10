import { describe, expect, it, vi } from 'vitest';
import { buildEffectiveCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import {
  redactAgenticPayload,
  requestSamplingWithFallback,
} from '../src/lib/mcp-capabilities/agentic-wrappers.js';

function samplingProfile() {
  return buildEffectiveCapabilityProfile({
    protocolVersion: '2025-06-18',
    clientInfo: { name: 'test-client' },
    advertisedCapabilities: { tools: {}, sampling: {} },
    transport: 'stdio',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: true },
  });
}

describe('Phase 8 Plan 08-13 sampling redaction', () => {
  it('redacts token-shaped keys and bearer strings before sampling reaches the client', async () => {
    const createMessage = vi.fn(async (request) => request);
    await requestSamplingWithFallback(
      { createMessage },
      {
        systemPrompt: 'Use Authorization: Bearer abc.def.ghi only internally.',
        messages: [
          {
            role: 'user',
            content: 'access_token=raw-token and Authorization: Bearer xyz.123',
            accessToken: 'secret-access-token',
            nested: { refresh_token: 'secret-refresh-token', safe: 'value' },
          },
        ],
        modelPreferences: { clientSecret: 'secret-client-value', hint: 'safe' },
      },
      { profile: samplingProfile(), samplingEnabled: true }
    );

    const sanitized = createMessage.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(sanitized)).not.toContain('secret-access-token');
    expect(JSON.stringify(sanitized)).not.toContain('secret-refresh-token');
    expect(JSON.stringify(sanitized)).not.toContain('secret-client-value');
    expect(JSON.stringify(sanitized)).not.toContain('abc.def.ghi');
    expect(JSON.stringify(sanitized)).not.toContain('xyz.123');
    expect(sanitized).toMatchObject({
      messages: [
        {
          accessToken: '[redacted]',
          nested: { refresh_token: '[redacted]', safe: 'value' },
        },
      ],
      modelPreferences: { clientSecret: '[redacted]', hint: 'safe' },
    });
  });

  it('redacts arbitrary payloads recursively for diagnostics and fallbacks', () => {
    expect(
      redactAgenticPayload({
        cookie: 'session=secret',
        nested: [{ password: 'pw' }, 'Bearer token-value'],
      })
    ).toEqual({
      cookie: '[redacted]',
      nested: [{ password: '[redacted]' }, 'Bearer [redacted]'],
    });
  });
});

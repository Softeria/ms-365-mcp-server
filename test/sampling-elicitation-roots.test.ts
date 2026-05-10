import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { buildEffectiveCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import {
  requestElicitationWithFallback,
  requestHighRiskConfirmationWithFallback,
  requestSamplingWithFallback,
} from '../src/lib/mcp-capabilities/agentic-wrappers.js';
import { classifyToolRisk } from '../src/lib/safe-writes/classifier.js';
import { readSkillPackFromRoot, writeSkillPackToRoot } from '../src/lib/mcp-skills/roots.js';

function profile(capabilities: Record<string, unknown>) {
  return buildEffectiveCapabilityProfile({
    protocolVersion: '2025-06-18',
    clientInfo: { name: 'test-client', version: '0.0.0' },
    advertisedCapabilities: capabilities,
    transport: 'stdio',
    surface: 'discovery',
    tenantPolicy: { phase8Enabled: true },
  });
}

describe('Phase 8 Plan 08-13 sampling, elicitation, and roots wrappers', () => {
  it('uses sampling only when the client advertises it and otherwise returns deterministic fallback', async () => {
    const createMessage = vi.fn(async () => ({
      role: 'assistant',
      content: { type: 'text', text: 'sampled' },
    }));

    const fallback = await requestSamplingWithFallback(
      { createMessage },
      { messages: [{ role: 'user', content: 'Summarize safely.' }], fallbackText: 'fallback' },
      { profile: profile({ tools: {} }) }
    );
    expect(fallback.usedCapability).toBe(false);
    expect(fallback.response).toMatchObject({
      content: { text: 'fallback' },
      stopReason: 'fallback',
    });
    expect(createMessage).not.toHaveBeenCalled();

    const defaultOff = await requestSamplingWithFallback(
      { createMessage },
      { messages: [{ role: 'user', content: 'Summarize safely.' }], fallbackText: 'default-off' },
      { profile: profile({ tools: {}, sampling: {} }) }
    );
    expect(defaultOff.usedCapability).toBe(false);
    expect(defaultOff.fallbackReason).toContain('MS365_MCP_SAMPLING_ENABLED');

    const sampled = await requestSamplingWithFallback(
      { createMessage },
      { messages: [{ role: 'user', content: 'Summarize safely.' }] },
      { profile: profile({ tools: {}, sampling: {} }), samplingEnabled: true }
    );
    expect(sampled.usedCapability).toBe(true);
    expect(createMessage).toHaveBeenCalledOnce();
    expect(sampled.response).toMatchObject({ content: { text: 'sampled' } });
  });

  it('uses elicitation only when advertised and otherwise returns deterministic declined content', async () => {
    const elicit = vi.fn(async () => ({ action: 'accept', content: { approved: true } }));

    const fallback = await requestElicitationWithFallback(
      { elicit },
      { message: 'Approve sending?', requestedSchema: { type: 'object' } },
      { profile: profile({ tools: {} }) }
    );
    expect(fallback.usedCapability).toBe(false);
    expect(fallback.response).toEqual({ action: 'declined', content: {} });
    expect(elicit).not.toHaveBeenCalled();

    const elicited = await requestElicitationWithFallback(
      { elicit },
      { message: 'Approve sending?', requestedSchema: { type: 'object' } },
      { profile: profile({ tools: {}, elicitation: {} }) }
    );
    expect(elicited.usedCapability).toBe(true);
    expect(elicit).toHaveBeenCalledOnce();
    expect(elicited.response).toEqual({ action: 'accept', content: { approved: true } });
  });

  it('uses elicitation for high-risk confirmations and falls back to exact next-call shape', async () => {
    const risk = classifyToolRisk({ alias: 'send-mail', method: 'POST' });
    const elicit = vi.fn(async () => ({ action: 'accept', content: { confirmation: true } }));

    const fallback = await requestHighRiskConfirmationWithFallback(
      undefined,
      { alias: 'send-mail', risk },
      { profile: profile({ tools: {} }) }
    );
    expect(fallback.usedCapability).toBe(false);
    expect(fallback.response).toMatchObject({
      action: 'confirmation_required',
      content: {
        alias: 'send-mail',
        riskLevel: 'high',
        nextCall: { confirmation: true },
      },
    });

    const elicited = await requestHighRiskConfirmationWithFallback(
      { elicit },
      { alias: 'send-mail', risk },
      { profile: profile({ tools: {}, elicitation: {} }) }
    );
    expect(elicited.usedCapability).toBe(true);
    expect(elicit).toHaveBeenCalledOnce();
  });

  it('reads and writes skill packs only within declared local file roots', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'm365-roots-test-'));
    const rootUri = pathToFileURL(`${root}/`).toString();
    try {
      const pack = { packName: 'root-pack', skills: [] };
      const written = await writeSkillPackToRoot({ rootUri, path: 'packs/root-pack.json' }, pack);
      expect(written.bytes).toBeGreaterThan(0);
      await expect(
        readSkillPackFromRoot({ rootUri, path: 'packs/root-pack.json' })
      ).resolves.toEqual(pack);
      await expect(writeSkillPackToRoot({ rootUri, path: '../escape.json' }, pack)).rejects.toThrow(
        /Path must not traverse|escapes/
      );
      await expect(
        readSkillPackFromRoot({ rootUri: 'https://example.invalid/root', path: 'pack.json' })
      ).rejects.toThrow(/file:\/\//);
      await expect(writeSkillPackToRoot({ rootUri, path: '.env' }, pack)).rejects.toThrow(
        /secret-looking/
      );
      await expect(
        writeSkillPackToRoot({ rootUri, path: 'credentials.json' }, pack)
      ).rejects.toThrow(/secret-looking/);
      await expect(
        writeSkillPackToRoot({ rootUri, path: 'packs/private.pem' }, pack)
      ).rejects.toThrow(/secret-looking/);
      await expect(
        writeSkillPackToRoot({ rootUri, path: 'packs/root-pack.txt' }, pack)
      ).rejects.toThrow(/\.json/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

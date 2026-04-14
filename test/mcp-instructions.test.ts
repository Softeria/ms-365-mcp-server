import { describe, expect, it } from 'vitest';
import { buildMcpServerInstructions } from '../src/mcp-instructions.js';

describe('buildMcpServerInstructions', () => {
  const baseCtx = { orgMode: true, readOnly: false, multiAccount: false };

  it('includes general Graph guidance for standard mode', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: false });
    expect(s).toContain('Microsoft Graph');
    expect(s).toContain('$filter');
    expect(s).not.toContain('DISCOVERY MODE ADD-ON');
  });

  it('appends discovery addon when discovery is true', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: true });
    expect(s).toContain('DISCOVERY MODE ADD-ON');
    expect(s).toContain('search-tools');
    expect(s).toContain('$filter');
  });

  it('adds read-only line when readOnly', () => {
    const s = buildMcpServerInstructions({ ...baseCtx, discovery: false, readOnly: true });
    expect(s).toContain('read-only');
  });
});

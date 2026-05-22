import { describe, expect, it } from 'vitest';
import { buildMcpServerInstructions } from '../src/mcp-instructions.js';

describe('buildMcpServerInstructions', () => {
  it('includes general Graph guidance', () => {
    const s = buildMcpServerInstructions({ multiAccount: false });
    expect(s).toContain('Microsoft Graph');
    expect(s).toContain('$filter');
  });

  it('does not suggest account switching when multiAccount is false', () => {
    const s = buildMcpServerInstructions({ multiAccount: false });
    expect(s).not.toContain('Multiple accounts');
    expect(s).not.toContain('account parameter');
  });

  it('mentions the account parameter when multiAccount is true', () => {
    const s = buildMcpServerInstructions({ multiAccount: true });
    expect(s).toContain('Multiple accounts');
    expect(s).toContain('account');
  });
});

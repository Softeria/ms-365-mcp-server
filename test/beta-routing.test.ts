import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// A v1.0 tool (get-current-user → /me) and a beta tool (get-my-profile → /me/profile).
// Both have real entries in endpoints.json; the beta one declares "apiVersion": "beta",
// so registration should thread that version into the graphRequest options.
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'get-current-user', method: 'get', path: '/me', description: 'Me.', parameters: [] },
    ],
  },
}));
vi.mock('../src/generated/client-beta.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'get-my-profile',
        method: 'get',
        path: '/me/profile',
        description: 'My profile.',
        parameters: [],
      },
    ],
  },
}));

describe('beta endpoint routing (dual-generator)', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn> };
  let mockGraphClient: GraphClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { tool: vi.fn() };
    mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
      }),
    } as unknown as GraphClient;
  });

  function getToolHandler(toolName: string) {
    registerGraphTools(mockServer, mockGraphClient, true);
    const call = mockServer.tool.mock.calls.find((c: unknown[]) => c[0] === toolName);
    expect(call, `tool ${toolName} should be registered`).toBeDefined();
    return call![call!.length - 1] as (params: Record<string, unknown>) => Promise<unknown>;
  }

  function optionsFor(): Record<string, unknown> {
    return (mockGraphClient.graphRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >;
  }

  it('registers tools from both the v1.0 and beta clients', () => {
    registerGraphTools(mockServer, mockGraphClient, true);
    const registered = mockServer.tool.mock.calls.map((c: unknown[]) => c[0]);
    expect(registered).toContain('get-current-user');
    expect(registered).toContain('get-my-profile');
  });

  it('prefixes a beta tool description with [beta] and leaves v1.0 unmarked', () => {
    registerGraphTools(mockServer, mockGraphClient, true);
    const descOf = (name: string) =>
      mockServer.tool.mock.calls.find((c: unknown[]) => c[0] === name)?.[1] as string;
    expect(descOf('get-my-profile')).toMatch(/^\[beta\]/);
    expect(descOf('get-current-user')).not.toMatch(/\[beta\]/);
  });

  it('routes a beta-flagged endpoint with apiVersion "beta"', async () => {
    const handler = getToolHandler('get-my-profile');
    await handler({});
    expect(optionsFor().apiVersion).toBe('beta');
  });

  it('leaves a v1.0 endpoint without an apiVersion override (defaults to v1.0)', async () => {
    const handler = getToolHandler('get-current-user');
    await handler({});
    expect(optionsFor().apiVersion).toBeUndefined();
  });
});

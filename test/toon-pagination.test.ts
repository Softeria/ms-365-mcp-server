import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/cloud-config.js', () => ({
  getCloudEndpoints: () => ({
    graphApi: 'https://graph.microsoft.com',
    authority: 'https://login.microsoftonline.com',
  }),
}));

vi.mock('../src/lib/microsoft-auth.js', () => ({
  refreshAccessToken: vi.fn(),
}));

// Distinguishable TOON encoder so we can tell JSON output from TOON output.
vi.mock('@toon-format/toon', () => ({
  encode: (data: any) => `TOON<<${JSON.stringify(data)}>>`,
}));

const mockAuthManager = {
  getToken: vi.fn().mockResolvedValue('mock-token'),
};

const mockSecrets = {
  clientId: 'test-client-id',
  tenantId: 'test-tenant-id',
  clientSecret: 'test-client-secret',
  cloudType: 'global' as const,
};

const { default: GraphClient } = await import('../src/graph-client.js');

describe('TOON output + forceJsonOutput (issue #560)', () => {
  let graphClient: InstanceType<typeof GraphClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphClient = new GraphClient(mockAuthManager as any, mockSecrets, 'toon');
  });

  it('encodes a normal response as TOON when configured', async () => {
    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: [{ id: '1' }] }), { status: 200 })
      );

    const result = await graphClient.graphRequest('/me/messages');
    expect(result.content[0].text.startsWith('TOON<<')).toBe(true);

    mockFetch.mockRestore();
  });

  it('emits parseable JSON (not TOON) when forceJsonOutput is set', async () => {
    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: [{ id: '1' }] }), { status: 200 })
      );

    const result = await graphClient.graphRequest('/me/messages', { forceJsonOutput: true });

    // Must be plain JSON so the fetchAllPages merge can JSON.parse each page.
    expect(result.content[0].text.startsWith('TOON<<')).toBe(false);
    expect(JSON.parse(result.content[0].text).value).toEqual([{ id: '1' }]);

    mockFetch.mockRestore();
  });

  it('serialize() encodes the merged result in the configured (toon) format', () => {
    const text = graphClient.serialize({ value: [{ id: '1' }, { id: '2' }] });
    expect(text.startsWith('TOON<<')).toBe(true);
    expect(text).toContain('"id":"2"');
  });
});

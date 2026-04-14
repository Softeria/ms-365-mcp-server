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

describe('OData nextLink preservation', () => {
  let graphClient: InstanceType<typeof GraphClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphClient = new GraphClient(mockAuthManager as any, mockSecrets);
  });

  it('should preserve @odata.nextLink in response while removing other @odata properties', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#messages',
          '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=10',
          '@odata.count': 42,
          value: [{ id: '1', subject: 'Test' }],
        }),
        { status: 200 }
      )
    );

    const result = await graphClient.graphRequest('/me/messages');
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed['@odata.nextLink']).toBe('https://graph.microsoft.com/v1.0/me/messages?$skip=10');
    expect(parsed['@odata.context']).toBeUndefined();
    expect(parsed['@odata.count']).toBeUndefined();

    mockFetch.mockRestore();
  });

  it('should work when response has no @odata.nextLink', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#messages',
          value: [{ id: '1', subject: 'Test' }],
        }),
        { status: 200 }
      )
    );

    const result = await graphClient.graphRequest('/me/messages');
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed['@odata.nextLink']).toBeUndefined();
    expect(parsed['@odata.context']).toBeUndefined();

    mockFetch.mockRestore();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestContext } from '../request-context.js';

// Mock logger
vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock cloud-config
vi.mock('../cloud-config.js', () => ({
  getCloudEndpoints: () => ({
    graphApi: 'https://graph.microsoft.com',
    authority: 'https://login.microsoftonline.com',
  }),
}));

// Mock microsoft-auth
const mockRefreshAccessToken = vi.fn();
vi.mock('../lib/microsoft-auth.js', () => ({
  refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
}));

// Mock toon
vi.mock('@toon-format/toon', () => ({
  encode: (data: any) => JSON.stringify(data),
}));

// Mock auth manager
const mockAuthManager = {
  getToken: vi.fn().mockResolvedValue('mock-access-token'),
};

const mockSecrets = {
  clientId: 'test-client-id',
  tenantId: 'test-tenant-id',
  clientSecret: 'test-client-secret',
  cloudType: 'global' as const,
};

// We need to import GraphClient after mocks are set up
const { default: GraphClient } = await import('../graph-client.js');

describe('GraphClient refresh token notification', () => {
  let graphClient: InstanceType<typeof GraphClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphClient = new GraphClient(mockAuthManager as any, mockSecrets);
  });

  it('should call notifyTokenRefreshed when 401 triggers a token refresh', async () => {
    const onTokenRefreshed = vi.fn();

    // First call returns 401, second returns 200
    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'ok' }), { status: 200 }));

    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token-v2',
      token_type: 'Bearer',
      scope: 'User.Read',
      expires_in: 3600,
    });

    await requestContext.run(
      {
        accessToken: 'expired-access-token',
        refreshToken: 'old-refresh-token',
        onTokenRefreshed,
      },
      async () => {
        await graphClient.makeRequest('/me');
      }
    );

    expect(onTokenRefreshed).toHaveBeenCalledWith('new-refresh-token-v2');
    expect(onTokenRefreshed).toHaveBeenCalledTimes(1);
    expect(mockRefreshAccessToken).toHaveBeenCalledWith(
      'old-refresh-token',
      'test-client-id',
      'test-client-secret',
      'test-tenant-id',
      'global'
    );

    mockFetch.mockRestore();
  });

  it('should not call notifyTokenRefreshed when no 401 occurs', async () => {
    const onTokenRefreshed = vi.fn();

    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'ok' }), { status: 200 }));

    await requestContext.run(
      {
        accessToken: 'valid-access-token',
        refreshToken: 'refresh-token',
        onTokenRefreshed,
      },
      async () => {
        await graphClient.makeRequest('/me');
      }
    );

    expect(onTokenRefreshed).not.toHaveBeenCalled();
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();

    mockFetch.mockRestore();
  });

  it('should not call notifyTokenRefreshed when refresh returns no refresh_token', async () => {
    const onTokenRefreshed = vi.fn();

    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'ok' }), { status: 200 }));

    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: 'new-access-token',
      // No refresh_token in response
      token_type: 'Bearer',
      scope: 'User.Read',
      expires_in: 3600,
    });

    await requestContext.run(
      {
        accessToken: 'expired-access-token',
        refreshToken: 'old-refresh-token',
        onTokenRefreshed,
      },
      async () => {
        await graphClient.makeRequest('/me');
      }
    );

    expect(onTokenRefreshed).not.toHaveBeenCalled();

    mockFetch.mockRestore();
  });

  it('should not throw when 401 occurs without onTokenRefreshed callback', async () => {
    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'ok' }), { status: 200 }));

    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      token_type: 'Bearer',
      scope: 'User.Read',
      expires_in: 3600,
    });

    await requestContext.run(
      {
        accessToken: 'expired-access-token',
        refreshToken: 'old-refresh-token',
        // No onTokenRefreshed callback
      },
      async () => {
        const result = await graphClient.makeRequest('/me');
        expect(result).toEqual({ value: 'ok' });
      }
    );

    mockFetch.mockRestore();
  });
});

describe('GraphClient context update after refresh', () => {
  let graphClient: InstanceType<typeof GraphClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphClient = new GraphClient(mockAuthManager as any, mockSecrets);
  });

  it('should update context tokens so second call uses the new refresh token', async () => {
    const onTokenRefreshed = vi.fn();

    // First makeRequest: 401 -> refresh -> retry 200
    // Second makeRequest: 401 -> refresh with NEW token -> retry 200
    const mockFetch = vi
      .spyOn(globalThis, 'fetch')
      // First call: 401
      .mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
      )
      // First call retry: 200
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'first' }), { status: 200 }))
      // Second call: 401
      .mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
      )
      // Second call retry: 200
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 'second' }), { status: 200 }));

    // First refresh returns rt-v2
    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: 'at-v2',
      refresh_token: 'rt-v2',
      token_type: 'Bearer',
      scope: 'User.Read',
      expires_in: 3600,
    });

    // Second refresh returns rt-v3
    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: 'at-v3',
      refresh_token: 'rt-v3',
      token_type: 'Bearer',
      scope: 'User.Read',
      expires_in: 3600,
    });

    await requestContext.run(
      {
        accessToken: 'at-v1',
        refreshToken: 'rt-v1',
        onTokenRefreshed,
      },
      async () => {
        await graphClient.makeRequest('/me');
        await graphClient.makeRequest('/calendars');
      }
    );

    // Second refresh should use rt-v2 (updated context), NOT rt-v1
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(2);
    expect(mockRefreshAccessToken).toHaveBeenNthCalledWith(
      1,
      'rt-v1',
      'test-client-id',
      'test-client-secret',
      'test-tenant-id',
      'global'
    );
    expect(mockRefreshAccessToken).toHaveBeenNthCalledWith(
      2,
      'rt-v2', // Must be the rotated token, not the original
      'test-client-id',
      'test-client-secret',
      'test-tenant-id',
      'global'
    );

    expect(onTokenRefreshed).toHaveBeenCalledTimes(2);
    expect(onTokenRefreshed).toHaveBeenNthCalledWith(1, 'rt-v2');
    expect(onTokenRefreshed).toHaveBeenNthCalledWith(2, 'rt-v3');

    mockFetch.mockRestore();
  });
});

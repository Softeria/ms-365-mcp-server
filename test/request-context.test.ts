import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestTokens, requestContext } from '../src/request-context.js';
import GraphClient from '../src/graph-client.js';
import type AuthManager from '../src/auth.js';
import { AppSecrets } from '../src/secrets.js';

describe('request-context', () => {
  it('should isolate tokens between concurrent async operations', async () => {
    const results: string[] = [];

    const request1 = requestContext.run(
      { accessToken: 'token-A', refreshToken: 'refresh-A' },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const tokens = getRequestTokens();
        results.push(`req1: ${tokens?.accessToken}`);
        return tokens?.accessToken;
      }
    );

    const request2 = requestContext.run(
      { accessToken: 'token-B', refreshToken: 'refresh-B' },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        const tokens = getRequestTokens();
        results.push(`req2: ${tokens?.accessToken}`);
        return tokens?.accessToken;
      }
    );

    const [result1, result2] = await Promise.all([request1, request2]);

    expect(result1).toBe('token-A');
    expect(result2).toBe('token-B');
    expect(results).toContain('req1: token-A');
    expect(results).toContain('req2: token-B');
  });

  it('should return undefined outside of request context', () => {
    const tokens = getRequestTokens();
    expect(tokens).toBeUndefined();
  });

  it('should handle nested async operations within a context', async () => {
    const result = await requestContext.run({ accessToken: 'outer-token' }, async () => {
      const inner = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return getRequestTokens()?.accessToken;
      };

      const [a, b, c] = await Promise.all([inner(), inner(), inner()]);

      return { a, b, c };
    });

    expect(result.a).toBe('outer-token');
    expect(result.b).toBe('outer-token');
    expect(result.c).toBe('outer-token');
  });

  it('should not leak tokens between separate contexts', async () => {
    const tokens: (string | undefined)[] = [];

    const p1 = requestContext.run({ accessToken: 'first' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      tokens.push(getRequestTokens()?.accessToken);
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const p2 = requestContext.run({ accessToken: 'second' }, async () => {
      tokens.push(getRequestTokens()?.accessToken);
    });

    tokens.push(getRequestTokens()?.accessToken);

    await Promise.all([p1, p2]);

    expect(tokens).toContain('first');
    expect(tokens).toContain('second');
    expect(tokens).toContain(undefined);
  });
});

describe('GraphClient request-context integration', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should use correct token for each concurrent request (race condition test)', async () => {
    const capturedTokens: string[] = [];

    global.fetch = vi
      .fn()
      .mockImplementation(async (_url: string, options: { headers?: Record<string, string> }) => {
        const authHeader = options.headers?.['Authorization'];
        const token = authHeader?.replace('Bearer ', '') ?? '';
        capturedTokens.push(token);

        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'test' }),
          headers: new Headers(),
        };
      });

    const mockAuthManager = {
      getToken: vi.fn().mockResolvedValue(null),
    } as unknown as AuthManager;

    const mockSecrets: AppSecrets = {
      clientId: 'test-client',
      tenantId: 'common',
      cloudType: 'global',
    };

    const graphClient = new GraphClient(mockAuthManager, mockSecrets);

    const userARequest = requestContext.run({ accessToken: 'USER_A_TOKEN' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      await graphClient.makeRequest('/me');
      return 'A';
    });

    const userBRequest = requestContext.run({ accessToken: 'USER_B_TOKEN' }, async () => {
      await graphClient.makeRequest('/me');
      return 'B';
    });

    const userCRequest = requestContext.run({ accessToken: 'USER_C_TOKEN' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      await graphClient.makeRequest('/me');
      return 'C';
    });

    await Promise.all([userARequest, userBRequest, userCRequest]);

    expect(capturedTokens).toHaveLength(3);
    expect(capturedTokens).toContain('USER_A_TOKEN');
    expect(capturedTokens).toContain('USER_B_TOKEN');
    expect(capturedTokens).toContain('USER_C_TOKEN');

    const tokenCounts = capturedTokens.reduce(
      (acc, token) => {
        acc[token] = (acc[token] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    expect(tokenCounts['USER_A_TOKEN']).toBe(1);
    expect(tokenCounts['USER_B_TOKEN']).toBe(1);
    expect(tokenCounts['USER_C_TOKEN']).toBe(1);
  });

  it('should not leak tokens when requests overlap in time', async () => {
    const requestLog: { token: string; timestamp: number }[] = [];
    const startTime = Date.now();

    global.fetch = vi
      .fn()
      .mockImplementation(async (_url: string, options: { headers?: Record<string, string> }) => {
        const authHeader = options.headers?.['Authorization'];
        const token = authHeader?.replace('Bearer ', '') ?? '';

        requestLog.push({ token, timestamp: Date.now() - startTime });

        await new Promise((resolve) => setTimeout(resolve, 50));

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'test' }),
          headers: new Headers(),
        };
      });

    const mockAuthManager = {
      getToken: vi.fn().mockResolvedValue(null),
    } as unknown as AuthManager;

    const secrets: AppSecrets = {
      clientId: 'test-client',
      tenantId: 'common',
      cloudType: 'global',
    };

    const graphClient = new GraphClient(mockAuthManager, secrets);

    const requestA = requestContext.run({ accessToken: 'ALICE_TOKEN' }, async () => {
      await graphClient.makeRequest('/me/messages');
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const requestB = requestContext.run({ accessToken: 'BOB_TOKEN' }, async () => {
      await graphClient.makeRequest('/me/calendar');
    });

    await Promise.all([requestA, requestB]);

    expect(requestLog).toHaveLength(2);
    expect(requestLog.map((r) => r.token).sort()).toEqual(['ALICE_TOKEN', 'BOB_TOKEN'].sort());
  });
});

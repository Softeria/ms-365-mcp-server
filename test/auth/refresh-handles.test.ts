import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { SessionStore } from '../../src/lib/session-store.js';
import {
  acquireGatewayRefreshRotationLock,
  consumeGatewayRefreshSession,
  mintGatewayRefreshToken,
  releaseGatewayRefreshRotationLock,
  startGatewayRefreshRotationLockHeartbeat,
  storeGatewayRefreshToken,
} from '../../src/lib/oauth/refresh-handles.js';

describe('opaque gateway refresh handles', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it('stores only an access-token hash in the refresh index', async () => {
    const redis = new MemoryRedisFacade();
    const tenantId = 'tenant-refresh-hash';
    const accessToken = 'access-token-plaintext-never-store';
    const refreshToken = mintGatewayRefreshToken();
    const sessionStore = new SessionStore(redis, Buffer.alloc(32, 7));

    await sessionStore.put(tenantId, accessToken, {
      tenantId,
      refreshToken: 'microsoft-refresh-token-secret',
      clientId: 'client-1',
      scopes: ['User.Read'],
      createdAt: Date.now(),
    });
    await storeGatewayRefreshToken({ redis, tenantId, refreshToken, accessToken });

    const keys = await redis.keys(`mcp:refresh:${tenantId}:*`);
    expect(keys).toHaveLength(1);
    const raw = await redis.get(keys[0]);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain(accessToken);
    expect(raw).not.toContain('microsoft-refresh-token-secret');
    expect(JSON.parse(raw!)).toEqual({ accessTokenHash: expect.any(String) });
  });

  it('serializes refresh rotation with a compare-on-release lock', async () => {
    const redis = new MemoryRedisFacade();
    const tenantId = 'tenant-refresh-lock';
    const refreshToken = mintGatewayRefreshToken();

    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-a',
        ttlMs: 60_000,
      })
    ).resolves.toBe(true);
    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-b',
        ttlMs: 60_000,
      })
    ).resolves.toBe(false);

    await releaseGatewayRefreshRotationLock({ redis, tenantId, refreshToken, lockId: 'lock-b' });
    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-c',
        ttlMs: 60_000,
      })
    ).resolves.toBe(false);

    await releaseGatewayRefreshRotationLock({ redis, tenantId, refreshToken, lockId: 'lock-a' });
    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-c',
        ttlMs: 60_000,
      })
    ).resolves.toBe(true);
  });

  it('uses atomic compare-and-delete so stale releases cannot delete a newer lock', async () => {
    class ReacquireDuringReleaseRedis extends MemoryRedisFacade {
      override async eval(
        script: string,
        keyCount: number,
        ...args: Array<string | number>
      ): Promise<number | string | null> {
        if (String(args[1]) === 'lock-a' && script.includes('del')) {
          await this.set(String(args[0]), 'lock-c', 'PX', 60_000);
          return 0;
        }
        return await super.eval(script, keyCount, ...args);
      }
    }

    const redis = new ReacquireDuringReleaseRedis();
    const tenantId = 'tenant-refresh-lock-race';
    const refreshToken = mintGatewayRefreshToken();

    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-a',
        ttlMs: 60_000,
      })
    ).resolves.toBe(true);
    await releaseGatewayRefreshRotationLock({ redis, tenantId, refreshToken, lockId: 'lock-a' });
    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-d',
        ttlMs: 60_000,
      })
    ).resolves.toBe(false);
  });

  it('renews the rotation lock while refresh is in progress', async () => {
    vi.useFakeTimers();
    const redis = new MemoryRedisFacade();
    const tenantId = 'tenant-refresh-lock-heartbeat';
    const refreshToken = mintGatewayRefreshToken();

    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-a',
        ttlMs: 3_000,
      })
    ).resolves.toBe(true);
    const stop = startGatewayRefreshRotationLockHeartbeat({
      redis,
      tenantId,
      refreshToken,
      lockId: 'lock-a',
      ttlMs: 3_000,
    });

    await vi.advanceTimersByTimeAsync(2_500);
    await expect(
      acquireGatewayRefreshRotationLock({
        redis,
        tenantId,
        refreshToken,
        lockId: 'lock-b',
        ttlMs: 3_000,
      })
    ).resolves.toBe(false);
    stop();
  });

  it('consumes a gateway refresh token exactly once', async () => {
    const redis = new MemoryRedisFacade();
    const tenantId = 'tenant-refresh-consume';
    const accessToken = 'access-token-single-use';
    const refreshToken = mintGatewayRefreshToken();
    const sessionStore = new SessionStore(redis, Buffer.alloc(32, 8));

    await sessionStore.put(tenantId, accessToken, {
      tenantId,
      refreshToken: 'microsoft-refresh-token-secret',
      clientId: 'client-1',
      scopes: ['User.Read'],
      createdAt: Date.now(),
    });
    await storeGatewayRefreshToken({ redis, tenantId, refreshToken, accessToken });

    const first = await consumeGatewayRefreshSession({
      redis,
      sessionStore,
      tenantId,
      refreshToken,
    });
    const second = await consumeGatewayRefreshSession({
      redis,
      sessionStore,
      tenantId,
      refreshToken,
    });

    expect(first?.record.clientId).toBe('client-1');
    expect(second).toBeNull();
  });
});

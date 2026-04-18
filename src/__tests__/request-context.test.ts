import { describe, it, expect, vi } from 'vitest';
import { requestContext, getRequestTokens, notifyTokenRefreshed } from '../request-context.js';

describe('request-context', () => {
  describe('notifyTokenRefreshed', () => {
    it('should call onTokenRefreshed callback with the new refresh token', async () => {
      const callback = vi.fn();

      await requestContext.run(
        {
          accessToken: 'test-access-token',
          refreshToken: 'old-refresh-token',
          onTokenRefreshed: callback,
        },
        () => {
          notifyTokenRefreshed('new-refresh-token');
        }
      );

      expect(callback).toHaveBeenCalledWith('new-refresh-token');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not throw when no callback is set', async () => {
      await requestContext.run(
        {
          accessToken: 'test-access-token',
        },
        () => {
          expect(() => notifyTokenRefreshed('new-refresh-token')).not.toThrow();
        }
      );
    });

    it('should not throw when called outside of request context', () => {
      expect(() => notifyTokenRefreshed('new-refresh-token')).not.toThrow();
    });

    it('should call callback multiple times if refresh happens multiple times', async () => {
      const callback = vi.fn();

      await requestContext.run(
        {
          accessToken: 'test-access-token',
          onTokenRefreshed: callback,
        },
        () => {
          notifyTokenRefreshed('rt-v2');
          notifyTokenRefreshed('rt-v3');
        }
      );

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 'rt-v2');
      expect(callback).toHaveBeenNthCalledWith(2, 'rt-v3');
    });
  });

  describe('getRequestTokens', () => {
    it('should return tokens within request context', async () => {
      await requestContext.run(
        {
          accessToken: 'at',
          refreshToken: 'rt',
        },
        () => {
          const tokens = getRequestTokens();
          expect(tokens?.accessToken).toBe('at');
          expect(tokens?.refreshToken).toBe('rt');
        }
      );
    });

    it('should return undefined outside of request context', () => {
      expect(getRequestTokens()).toBeUndefined();
    });
  });
});

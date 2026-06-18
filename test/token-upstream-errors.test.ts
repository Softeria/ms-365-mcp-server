// Regression test for issue #485: /token used to flatten every Entra error to
// HTTP 500, so OAuth clients couldn't distinguish a recoverable invalid_grant
// (e.g. AADSTS70043 from a Conditional Access sign-in frequency lapse) from a
// genuine server bug, and never retried with prompt=login.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exchangeCodeForToken,
  OAuthUpstreamError,
  refreshAccessToken,
  toOAuthErrorResponse,
} from '../src/lib/microsoft-auth.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Issue #485: upstream OAuth error surfacing', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockEntraResponse(status: number, body: string): void {
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
      json: async () => JSON.parse(body),
    } as Response);
  }

  describe('refreshAccessToken', () => {
    it('throws OAuthUpstreamError with parsed body on AADSTS70043 invalid_grant', async () => {
      mockEntraResponse(
        400,
        JSON.stringify({
          error: 'invalid_grant',
          error_description:
            'AADSTS70043: The refresh token has expired or is invalid due to sign-in frequency checks by conditional access. The token was issued on 2026-05-07 and the maximum allowed lifetime for this request is 1209600.',
          error_codes: [70043],
          suberror: 'token_expired',
          trace_id: 'trace-abc',
          correlation_id: 'corr-xyz',
        })
      );

      await expect(refreshAccessToken('rt', 'client-id', undefined)).rejects.toMatchObject({
        name: 'OAuthUpstreamError',
        status: 400,
        body: {
          error: 'invalid_grant',
          suberror: 'token_expired',
          error_codes: [70043],
        },
      });
    });

    it('falls back to generic Error when upstream body is not JSON', async () => {
      mockEntraResponse(502, '<html>Bad Gateway</html>');

      let caught: unknown;
      try {
        await refreshAccessToken('rt', 'client-id', undefined);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(caught).not.toBeInstanceOf(OAuthUpstreamError);
      expect((caught as Error).message).toContain('Failed to refresh token');
    });

    it('falls back to generic Error when JSON body lacks `error` field', async () => {
      mockEntraResponse(400, JSON.stringify({ something_else: 'value' }));

      let caught: unknown;
      try {
        await refreshAccessToken('rt', 'client-id', undefined);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(caught).not.toBeInstanceOf(OAuthUpstreamError);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('throws OAuthUpstreamError when Entra rejects the code', async () => {
      mockEntraResponse(
        400,
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'AADSTS70008: The provided authorization code has expired.',
          error_codes: [70008],
        })
      );

      await expect(
        exchangeCodeForToken('code', 'http://localhost/cb', 'client-id', undefined)
      ).rejects.toMatchObject({
        name: 'OAuthUpstreamError',
        status: 400,
        body: { error: 'invalid_grant', error_codes: [70008] },
      });
    });
  });

  describe('toOAuthErrorResponse', () => {
    it('maps OAuthUpstreamError to HTTP 400 with passthrough fields', () => {
      const err = new OAuthUpstreamError(400, 'raw', {
        error: 'invalid_grant',
        error_description: 'AADSTS70043: ...',
        suberror: 'token_expired',
        error_codes: [70043],
        trace_id: 'trace-abc',
        correlation_id: 'corr-xyz',
      });

      const { status, body } = toOAuthErrorResponse(err);
      expect(status).toBe(400);
      expect(body).toEqual({
        error: 'invalid_grant',
        error_description: 'AADSTS70043: ...',
        suberror: 'token_expired',
      });
    });

    it('omits suberror and error_description when upstream did not supply them', () => {
      const err = new OAuthUpstreamError(400, 'raw', { error: 'invalid_request' });
      const { status, body } = toOAuthErrorResponse(err);
      expect(status).toBe(400);
      expect(body).toEqual({ error: 'invalid_request' });
    });

    it('does not leak trace_id / correlation_id in response body', () => {
      const err = new OAuthUpstreamError(400, 'raw', {
        error: 'invalid_grant',
        trace_id: 'sensitive-trace',
        correlation_id: 'sensitive-corr',
      });
      const { body } = toOAuthErrorResponse(err);
      expect(body).not.toHaveProperty('trace_id');
      expect(body).not.toHaveProperty('correlation_id');
    });

    it('maps non-OAuth errors to HTTP 500 generic server_error', () => {
      const { status, body } = toOAuthErrorResponse(new Error('network down'));
      expect(status).toBe(500);
      expect(body).toEqual({
        error: 'server_error',
        error_description: 'Internal server error during token exchange',
      });
    });

    it('maps non-Error throws (string, undefined, object) to HTTP 500 generic', () => {
      expect(toOAuthErrorResponse('oops').status).toBe(500);
      expect(toOAuthErrorResponse(undefined).status).toBe(500);
      expect(toOAuthErrorResponse({ random: 'thing' }).status).toBe(500);
    });
  });
});

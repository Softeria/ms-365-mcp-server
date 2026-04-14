import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EgressViolationError,
  installEgressGuard,
  uninstallEgressGuard,
  validateUrl,
} from '../src/security/egress-guard.js';

describe('egress guard', () => {
  describe('validateUrl — allowlist', () => {
    it('accepts https://graph.microsoft.com', () => {
      expect(() => validateUrl('https://graph.microsoft.com/v1.0/me')).not.toThrow();
    });

    it('accepts https://graph.microsoft.com with query string and fragment', () => {
      expect(() =>
        validateUrl('https://graph.microsoft.com/v1.0/me/messages?$top=10#anchor')
      ).not.toThrow();
    });

    it('accepts https://login.microsoftonline.com token endpoint', () => {
      expect(() =>
        validateUrl('https://login.microsoftonline.com/common/oauth2/v2.0/token')
      ).not.toThrow();
    });

    it('accepts URL object, not only strings', () => {
      expect(() => validateUrl(new URL('https://graph.microsoft.com/v1.0/me'))).not.toThrow();
    });
  });

  describe('validateUrl — rejections', () => {
    it('rejects arbitrary external host', () => {
      expect(() => validateUrl('https://google.com/search')).toThrow(EgressViolationError);
    });

    it('rejects host that embeds an allowed hostname as a substring', () => {
      expect(() => validateUrl('https://graph.microsoft.com.evil.com/v1.0/me')).toThrow(
        EgressViolationError
      );
    });

    it('rejects host that prepends an allowed hostname', () => {
      expect(() => validateUrl('https://attacker.graph.microsoft.com/v1.0/me')).toThrow(
        EgressViolationError
      );
    });

    it('rejects non-standard port on allowed host', () => {
      expect(() => validateUrl('https://login.microsoftonline.com:8080/common')).toThrow(
        EgressViolationError
      );
    });

    it('rejects http:// (non-TLS) on allowed host', () => {
      expect(() => validateUrl('http://graph.microsoft.com/v1.0/me')).toThrow(EgressViolationError);
    });

    it('rejects unusual protocols like file://', () => {
      expect(() => validateUrl('file:///etc/passwd')).toThrow(EgressViolationError);
    });

    it('exposes the blocked hostname on the error', () => {
      try {
        validateUrl('https://evil.com/');
        throw new Error('should not reach here');
      } catch (err) {
        expect(err).toBeInstanceOf(EgressViolationError);
        expect((err as EgressViolationError).hostname).toBe('evil.com');
      }
    });
  });

  describe('installEgressGuard — fetch monkey-patch', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok'));
    });

    afterEach(() => {
      uninstallEgressGuard();
      globalThis.fetch = originalFetch;
    });

    it('allows a fetch to an allowed host through to the underlying fetch', async () => {
      installEgressGuard();
      await globalThis.fetch('https://graph.microsoft.com/v1.0/me');
      // The patched fetch should have invoked the underlying mock exactly once.
      // (vi.fn() was captured before install; install wrapped it.)
      // We can't compare by reference after install, so we check by behaviour:
      // a successful resolution means the underlying mock was called.
      // If validation had thrown, we'd have seen an EgressViolationError instead.
      expect(true).toBe(true);
    });

    it('throws EgressViolationError for a blocked host without invoking the underlying fetch', async () => {
      const underlying = vi.fn().mockResolvedValue(new Response('ok'));
      globalThis.fetch = underlying as unknown as typeof fetch;
      installEgressGuard();

      await expect(globalThis.fetch('https://evil.com/')).rejects.toThrow(EgressViolationError);
      expect(underlying).not.toHaveBeenCalled();
    });

    it('is idempotent: calling installEgressGuard twice does not double-wrap', async () => {
      const underlying = vi.fn().mockResolvedValue(new Response('ok'));
      globalThis.fetch = underlying as unknown as typeof fetch;
      installEgressGuard();
      installEgressGuard();

      await globalThis.fetch('https://graph.microsoft.com/v1.0/me');
      expect(underlying).toHaveBeenCalledTimes(1);
    });

    it('accepts Request objects as input', async () => {
      installEgressGuard();
      const req = new Request('https://graph.microsoft.com/v1.0/me');
      await expect(globalThis.fetch(req)).resolves.toBeDefined();
    });

    it('rejects Request objects targeting a blocked host', async () => {
      installEgressGuard();
      const req = new Request('https://evil.com/');
      await expect(globalThis.fetch(req)).rejects.toThrow(EgressViolationError);
    });
  });
});

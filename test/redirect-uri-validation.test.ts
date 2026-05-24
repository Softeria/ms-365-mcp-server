// PoC test for CWE-601 open redirect via /authorize redirect_uri
// before fix: the server forwards arbitrary redirect_uri values to Microsoft
// after fix: invalid (non-http(s)) and disallowed redirect_uris are rejected with 400
import { describe, it, expect } from 'vitest';
import { isAllowedRedirectUri } from '../src/lib/redirect-uri-validation.js';

describe('CWE-601 redirect_uri validation', () => {
  it('rejects javascript: scheme', () => {
    expect(isAllowedRedirectUri('javascript:alert(1)', null)).toBe(false);
  });
  it('rejects data: scheme', () => {
    expect(isAllowedRedirectUri('data:text/html,<script>alert(1)</script>', null)).toBe(false);
  });
  it('rejects malformed URLs', () => {
    expect(isAllowedRedirectUri('not a url', null)).toBe(false);
  });
  it('allows https URLs by default (no allowlist)', () => {
    expect(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback', null)).toBe(true);
  });
  it('allows http loopback by default (no allowlist)', () => {
    expect(isAllowedRedirectUri('http://localhost:6274/oauth/callback', null)).toBe(true);
    expect(isAllowedRedirectUri('http://127.0.0.1:3000/cb', null)).toBe(true);
  });
  it('rejects non-loopback http when no allowlist', () => {
    expect(isAllowedRedirectUri('http://attacker.example.com/cb', null)).toBe(false);
  });
  it('enforces explicit allowlist when provided', () => {
    const allowlist = ['https://claude.ai/api/mcp/auth_callback'];
    expect(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback', allowlist)).toBe(true);
    expect(isAllowedRedirectUri('https://attacker.example.com/cb', allowlist)).toBe(false);
    // even loopback is rejected once allowlist is set
    expect(isAllowedRedirectUri('http://localhost:3000/cb', allowlist)).toBe(false);
  });
});

/**
 * /token error-path coverage (plan 06-05, D-10 + SECUR-05).
 *
 * Verifies src/server.ts createTokenHandler:
 *   - Missing grant_type → 400 + logs never carry raw request body
 *   - Missing body → 400 (undefined-body branch)
 *   - Unsupported grant_type → 400
 *   - authorization_code with unknown code → MSAL error path (500 via
 *     src/server.ts Site C), logs scrubbed
 *
 * Log-scrub regression guard: plan 01-07 (SECUR-05) scrubbed three log
 * sites (A/B/C). This test asserts those invariants still hold by probing
 * every error branch and validating that no logger mock call carries
 * sensitive fields (code_verifier, refresh_token, client_secret raw
 * values, or password-like fields from unsupported grant types).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { newPkce } from '../../setup/pkce-fixture.js';

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/logger.js', () => ({
  default: loggerMock,
  rawPinoLogger: loggerMock,
  enableConsoleLogging: vi.fn(),
}));

describe('plan 06-05 — /token error paths + log scrub (SECUR-05)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();

    const { createTokenHandler } = await import('../../../src/lib/oauth/token-handler.js');
    const { MemoryPkceStore } = await import('../../../src/lib/pkce-store/memory-store.js');

    const app = express();
    // /token accepts x-www-form-urlencoded by RFC 6749; some MCP clients
    // send JSON. Mount both parsers so every test case is realistic.
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.post(
      '/token',
      createTokenHandler({
        secrets: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tenantId: 'common',
          cloudType: 'global',
        },
        pkceStore: new MemoryPkceStore(),
      })
    );
    server = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(app).listen(0, () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    vi.restoreAllMocks();
  });

  /**
   * Inspect every logger-mock call (info/warn/error/debug) and assert that
   * no argument contains PKCE verifier values, refresh tokens, client
   * secrets, or plaintext passwords. Pino-native call shape is
   * `(meta, message)` — we stringify every arg and run a set of regex
   * guards that catch the specific patterns 01-07 SECUR-05 scrubbed.
   */
  function assertNoSecretsInLogs(): void {
    const allCalls = [
      ...loggerMock.info.mock.calls,
      ...loggerMock.warn.mock.calls,
      ...loggerMock.error.mock.calls,
      ...loggerMock.debug.mock.calls,
    ].flat();
    for (const arg of allCalls) {
      if (typeof arg !== 'object' || arg === null) continue;
      const s = JSON.stringify(arg);
      // Site B guard: grant_type error meta must not carry a real code_verifier
      // value (redacted booleans are OK, only the raw string is forbidden).
      expect(s).not.toMatch(/"code_verifier"\s*:\s*"[A-Za-z0-9_-]{20,}"/);
      // Site C guard: raw refresh tokens never appear in log meta.
      expect(s).not.toMatch(/"refresh_token"\s*:\s*"[A-Za-z0-9_.-]{20,}"/);
      // Client-secret plaintext never appears.
      expect(s).not.toMatch(/"client_secret"\s*:\s*"[A-Za-z0-9_-]+"/);
    }
  }

  it('missing body → 400 + no body leaked to logs', async () => {
    // No content-type header + empty body → express parsers leave req.body
    // undefined → the handler's "Request body is undefined" branch fires.
    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    assertNoSecretsInLogs();
  });

  it('missing grant_type → 400 + Site B log scrub holds', async () => {
    const pkce = newPkce();
    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `code=abc&code_verifier=${encodeURIComponent(pkce.verifier)}`,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_request');
    assertNoSecretsInLogs();

    // Verify Site B specifically — the grant_type-missing error meta must
    // contain the MISSING marker + the `has_*` booleans, but NOT the raw
    // code_verifier value from the request.
    const errorCalls = loggerMock.error.mock.calls;
    const grantTypeMissingCall = errorCalls.find(
      (call: unknown[]) => typeof call[1] === 'string' && call[1].includes('grant_type is missing')
    );
    expect(grantTypeMissingCall).toBeDefined();
    if (grantTypeMissingCall) {
      const meta = grantTypeMissingCall[0] as Record<string, unknown>;
      expect(meta.grant_type).toBe('[MISSING]');
      expect(meta.has_code).toBe(true);
      // Critical: the raw verifier value must NOT appear in meta
      expect(JSON.stringify(meta)).not.toContain(pkce.verifier);
    }
  });

  it('authorization_code without code → 400 invalid_request before token exchange', async () => {
    const pkce = newPkce();
    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body:
        `grant_type=authorization_code&code_verifier=${encodeURIComponent(pkce.verifier)}&` +
        `redirect_uri=${encodeURIComponent('http://localhost/cb')}`,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; error_description: string };
    expect(body.error).toBe('invalid_request');
    expect(body.error_description).toBe('code parameter is required');
    assertNoSecretsInLogs();
  });

  it('authorization_code without redirect_uri → 400 invalid_request before token exchange', async () => {
    const pkce = newPkce();
    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body:
        `grant_type=authorization_code&code=auth-code-1&` +
        `code_verifier=${encodeURIComponent(pkce.verifier)}`,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; error_description: string };
    expect(body.error).toBe('invalid_request');
    expect(body.error_description).toBe('redirect_uri parameter is required');
    assertNoSecretsInLogs();
  });

  it('unsupported grant_type (password) → 400 + leaked secret never surfaces in logs', async () => {
    const plaintextPassword = 'super-secret-password-plaintext-2026';
    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=password&username=alice&password=${encodeURIComponent(plaintextPassword)}`,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unsupported_grant_type');

    // Critical regression guard: the password value must never appear in any
    // logger call argument.
    const allCalls = [
      ...loggerMock.info.mock.calls,
      ...loggerMock.warn.mock.calls,
      ...loggerMock.error.mock.calls,
      ...loggerMock.debug.mock.calls,
    ].flat();
    for (const arg of allCalls) {
      expect(JSON.stringify(arg)).not.toContain(plaintextPassword);
    }
  });

  it('unknown authorization code → error path never leaks verifier into logs', async () => {
    const pkce = newPkce();
    // The code is unknown → pkceStore.takeByChallenge returns null → handler
    // falls through to exchangeCodeForToken (MSAL stub call). That will fail
    // with a network error, which the Site-C catch block logs without
    // attaching the raw Error body. Test validates the scrub invariant.
    await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body:
        `grant_type=authorization_code&code=never-stored&` +
        `code_verifier=${encodeURIComponent(pkce.verifier)}&` +
        `redirect_uri=${encodeURIComponent('http://localhost/cb')}`,
    });
    // We don't assert a specific status — the MSAL round trip may 500, 400,
    // or 502 depending on what exchangeCodeForToken produces. We care that
    // NO log call carries the raw verifier value.
    const allCalls = [
      ...loggerMock.info.mock.calls,
      ...loggerMock.warn.mock.calls,
      ...loggerMock.error.mock.calls,
      ...loggerMock.debug.mock.calls,
    ].flat();
    for (const arg of allCalls) {
      if (typeof arg !== 'object' || arg === null) continue;
      expect(JSON.stringify(arg)).not.toContain(pkce.verifier);
    }
  });

  it('refresh_token grant on legacy mount → 400 with migration error_description, no token leaked', async () => {
    // Plan 03-09 WR-01: legacy /token refresh_token branch is retired unless
    // MS365_MCP_LEGACY_OAUTH_REFRESH=1. Default behaviour is 400 with a clear
    // migration error_description. Submitting a refresh_token here verifies
    // (a) the migration error is returned, (b) the submitted token does not
    // appear anywhere in the logs.
    const fakeRefreshToken = 'rt-fake-plaintext-abcdef0123456789abcdef0123456789';
    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(fakeRefreshToken)}`,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unsupported_grant_type');

    const allCalls = [
      ...loggerMock.info.mock.calls,
      ...loggerMock.warn.mock.calls,
      ...loggerMock.error.mock.calls,
      ...loggerMock.debug.mock.calls,
    ].flat();
    for (const arg of allCalls) {
      if (typeof arg !== 'object' || arg === null) continue;
      expect(JSON.stringify(arg)).not.toContain(fakeRefreshToken);
    }
  });
});

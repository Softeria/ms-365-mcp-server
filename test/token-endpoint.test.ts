/**
 * Tests for /token endpoint body-log redaction (SECUR-05 / plan 01-07).
 *
 * Threat refs from plan 01-07 <threat_model>:
 *   - T-01-07 (HIGH, Information Disclosure): /token error paths log entire
 *     request body, leaking refresh_token, authorization codes, and client
 *     secrets to persistent logs.
 *
 * Contract under test:
 *   - POST /token with missing grant_type MUST log `grant_type` (value only)
 *     and MAY log `has_code` / `has_refresh_token` booleans, but MUST NOT
 *     attach `body` or any of its raw values to the log meta.
 *   - POST /token that triggers the catch block MUST log only the error
 *     message (stringified) — never the raw error object (which may carry
 *     `.response.body` from fetch failures).
 *   - Happy-path info log MUST NOT contain `body`; canonical pino arg order
 *     is (meta, message).
 *
 * Strategy: spin up a mini Express app that mirrors the /token handler
 * exactly (same three log sites) and prove that refresh_token / code /
 * client_secret values NEVER appear in the logger mock's call arguments.
 *
 * These tests MUST FAIL on first run (RED) because src/server.ts still
 * logs `{ body }` at the grant_type-missing site and passes the raw
 * `error` object to logger.error in the catch block.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Logger mock — captures every call so we can walk the arguments and
// prove no sensitive values leak in.
vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn(),
  },
  enableConsoleLogging: vi.fn(),
}));

// Mock the microsoft-auth module so the token exchange + refresh paths
// throw a controlled error we can probe without hitting the network.
vi.mock('../src/lib/microsoft-auth.js', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    exchangeCodeForToken: vi.fn(async () => {
      throw new Error('simulated graph failure for catch-block test');
    }),
    refreshAccessToken: vi.fn(async () => {
      throw new Error('simulated refresh failure for catch-block test');
    }),
  };
});

// Secret values the tests will send in the body — the assertion is that
// these NEVER appear in any logger mock call.
const SECRET_REFRESH_TOKEN = 'REFRESH_TOKEN_VALUE_SECRET_abc123';
const SECRET_AUTH_CODE = 'AUTH_CODE_VALUE_SECRET_xyz789';
const SECRET_CLIENT_SECRET = 'CLIENT_SECRET_VALUE_SECRET_def456';

/**
 * Mini Express /token handler that mirrors the post-01-07 contract.
 *
 * The handler is imported from src/server.ts once the GREEN edit lands.
 * For the RED phase, the test provides a local re-implementation that
 * mirrors the v1 (leaky) handler so the RED tests actually observe the
 * bug. The GREEN phase replaces the local handler with a call to a
 * factory exported from src/server.ts.
 *
 * Strategy used below: the test app delegates to a factory function
 * `createTokenHandler` imported from src/lib/oauth/token-handler.ts. That factory is
 * added in Task 3 (GREEN). Until then, the import throws and every
 * test in this file fails — which is the RED contract.
 */
async function startTokenServer(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const { createTokenHandler } = await import('../src/lib/oauth/token-handler.js');
  const { MemoryPkceStore } = await import('../src/lib/pkce-store/memory-store.js');

  const app = express();
  app.use(express.json());

  // Minimal secrets stub — the handler under test only reads these
  // fields; we never touch MSAL or the real Microsoft auth URL.
  const secrets = {
    clientId: 'test-client-id',
    clientSecret: undefined,
    tenantId: 'common',
    cloudType: 'global' as const,
  };

  app.post(
    '/token',
    createTokenHandler({
      secrets,
      // Empty PKCE store — the handler should handle missing state gracefully.
      pkceStore: new MemoryPkceStore(),
    })
  );

  return await new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

async function postJson(url: string, body: Record<string, unknown>): Promise<number> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}

/**
 * Stringify every arg of every logger call so we can assert that no
 * sensitive value leaks anywhere in the log pipeline — at any level.
 *
 * This covers every permutation: Winston-style (msg, meta) and
 * pino-style (meta, msg). If a test value appears anywhere, this
 * catches it.
 */
function allLogCallsJoined(loggerMock: Record<string, ReturnType<typeof vi.fn>>): string {
  const all: string[] = [];
  for (const fn of Object.values(loggerMock)) {
    if (typeof fn !== 'function' || !('mock' in fn)) continue;
    for (const call of fn.mock.calls) {
      for (const arg of call) {
        if (arg instanceof Error) {
          all.push(String(arg.message), String(arg.stack ?? ''));
        } else if (typeof arg === 'string') {
          all.push(arg);
        } else {
          try {
            all.push(JSON.stringify(arg));
          } catch {
            // Circular error objects (fetch.Response) can't be JSON-stringified
            // — best-effort fall back to String(arg) so we at least match on
            // coerced-string fragments.
            all.push(String(arg));
          }
        }
      }
    }
  }
  return all.join('\n');
}

describe('/token — SECUR-05 (no body in error logs)', () => {
  let server: { url: string; close: () => Promise<void> } | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it('Test 1: missing grant_type does NOT log the body or any refresh_token value', async () => {
    server = await startTokenServer();
    const loggerMock = (await import('../src/logger.js')).default as unknown as Record<
      string,
      ReturnType<typeof vi.fn>
    >;

    await postJson(`${server.url}/token`, {
      // No grant_type -> falls through to the "grant_type is missing" site.
      refresh_token: SECRET_REFRESH_TOKEN,
      code: SECRET_AUTH_CODE,
      client_secret: SECRET_CLIENT_SECRET,
    });

    const joined = allLogCallsJoined(loggerMock);

    // The sensitive VALUES from the body must never appear anywhere.
    expect(joined).not.toContain(SECRET_REFRESH_TOKEN);
    expect(joined).not.toContain(SECRET_AUTH_CODE);
    expect(joined).not.toContain(SECRET_CLIENT_SECRET);

    // Additionally: no `"body"` key should be spread into logger meta for
    // the grant-type-missing call — assert the invariant at the call-site
    // granularity.
    const errorCalls = loggerMock.error.mock.calls;
    const missingGrantCall = errorCalls.find((c) =>
      c.some((a) => typeof a === 'string' && /grant_type/i.test(a))
    );
    expect(missingGrantCall).toBeDefined();
    if (missingGrantCall) {
      for (const arg of missingGrantCall) {
        if (arg && typeof arg === 'object') {
          expect(arg).not.toHaveProperty('body');
        }
      }
    }
  });

  it('Test 2: happy-path info log shape does not leak body (grant_type only)', async () => {
    server = await startTokenServer();
    const loggerMock = (await import('../src/logger.js')).default as unknown as Record<
      string,
      ReturnType<typeof vi.fn>
    >;

    // refresh_token path — exchange mocked to throw, but the info log at
    // handler entry runs before the catch.
    await postJson(`${server.url}/token`, {
      grant_type: 'refresh_token',
      refresh_token: SECRET_REFRESH_TOKEN,
    });

    const joined = allLogCallsJoined(loggerMock);
    expect(joined).not.toContain(SECRET_REFRESH_TOKEN);

    // The entry-level info log must NOT carry `body` as a key.
    for (const call of loggerMock.info.mock.calls) {
      for (const arg of call) {
        if (arg && typeof arg === 'object') {
          expect(arg).not.toHaveProperty('body');
        }
      }
    }
  });

  it('Test 3: catch-block logs message only — never the raw error object', async () => {
    server = await startTokenServer();
    const loggerMock = (await import('../src/logger.js')).default as unknown as Record<
      string,
      ReturnType<typeof vi.fn>
    >;

    // Trigger catch: authorization_code with a mocked exchange that throws.
    await postJson(`${server.url}/token`, {
      grant_type: 'authorization_code',
      code: SECRET_AUTH_CODE,
      redirect_uri: 'http://localhost:3000/cb',
      code_verifier: 'verifier',
    });

    const joined = allLogCallsJoined(loggerMock);
    expect(joined).not.toContain(SECRET_AUTH_CODE);

    // Find the catch-block log (message contains "Token endpoint error").
    const catchCalls = loggerMock.error.mock.calls.filter((c) =>
      c.some((a) => typeof a === 'string' && /token endpoint error/i.test(a))
    );
    expect(catchCalls.length).toBeGreaterThanOrEqual(1);

    // In each catch call, any object arg must NOT include a raw Error
    // object spread — the redacted meta should be `{ err: string, code? }`.
    for (const call of catchCalls) {
      for (const arg of call) {
        // Bare Error arg is the v1 bug — explicitly forbidden.
        expect(arg).not.toBeInstanceOf(Error);
        if (arg && typeof arg === 'object') {
          // The redacted meta should not contain `.response.body`.
          expect(arg).not.toHaveProperty('body');
          // `err` may be present but as a string, not an Error object.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const err = (arg as any).err;
          if (err !== undefined) {
            expect(err).not.toBeInstanceOf(Error);
          }
        }
      }
    }
  });

  it('Test 4: legacy authorization_code response strips upstream refresh_token', async () => {
    const auth = await import('../src/lib/microsoft-auth.js');
    vi.mocked(auth.exchangeCodeForToken).mockResolvedValueOnce({
      access_token: 'access-token-public',
      token_type: 'Bearer',
      scope: 'User.Read',
      expires_in: 3600,
      refresh_token: 'rt-upstream-must-not-cross-boundary',
    });
    server = await startTokenServer();

    const res = await fetch(`${server.url}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'auth-code',
        redirect_uri: 'http://localhost:3000/cb',
        code_verifier: 'verifier',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.access_token).toBe('access-token-public');
    expect(body.refresh_token).toBeUndefined();
  });
});

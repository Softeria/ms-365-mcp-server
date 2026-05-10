/**
 * Delegated OAuth integration test (plan 03-06, AUTH-01).
 *
 * Covers:
 *   - /authorize happy path (server-scoped PKCE challenge forwarded to Microsoft)
 *   - /authorize with redirect_uri NOT in tenant.redirect_uri_allowlist → 400
 *   - /authorize with javascript: URI → 400 (Phase 1 validator reused)
 *   - /token exchange: takeByChallenge + MSAL acquireTokenByCode returning tokens
 *   - MicrosoftOAuthProvider.forTenant reads tenant-scoped config (no singleton secrets)
 *
 * Uses MemoryRedisFacade + mocked MSAL — no testcontainers-pg needed (we
 * inject the tenant row directly without hitting Postgres).
 *
 * Threat refs:
 *   - T-03-06-03: redirect URI forgery (allowlist check)
 *   - T-03-06-04: PKCE replay (keyed by tenant + challenge)
 *   - CONCERNS: hardcoded redirect URI removed from oauth-provider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import { generateTenantDek } from '../../src/lib/crypto/dek.js';
import { hasDelegatedAccessToken } from '../../src/lib/delegated-access-tokens.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const KEK = crypto.randomBytes(32);

function makeTenant(overrides: Partial<TenantRow> = {}): TenantRow {
  const { wrappedDek } = generateTenantDek(KEK);
  return {
    id: overrides.id ?? crypto.randomUUID(),
    mode: overrides.mode ?? 'delegated',
    client_id: overrides.client_id ?? 'app-client-id',
    client_secret_ref: overrides.client_secret_ref ?? null,
    client_secret_resolved: overrides.client_secret_resolved ?? 'super-secret',
    tenant_id: overrides.tenant_id ?? 'tenant-guid',
    cloud_type: overrides.cloud_type ?? 'global',
    redirect_uri_allowlist: overrides.redirect_uri_allowlist ?? ['http://localhost:3000/callback'],
    cors_origins: overrides.cors_origins ?? [],
    allowed_scopes: overrides.allowed_scopes ?? ['User.Read', 'Mail.Read'],
    enabled_tools: overrides.enabled_tools ?? null,
    wrapped_dek: overrides.wrapped_dek === undefined ? wrappedDek : overrides.wrapped_dek,
    slug: overrides.slug ?? null,
    disabled_at: overrides.disabled_at ?? null,
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
  };
}

interface AppHarness {
  url: string;
  close: () => Promise<void>;
  redis: MemoryRedisFacade;
  tenant: TenantRow;
  pkceStore: RedisPkceStore;
  mockMsalAcquireByCode: ReturnType<typeof vi.fn>;
}

async function startApp(
  tenantOverrides: Partial<TenantRow> = {},
  authorizeOptions: { extraAllowedHosts?: readonly string[] } = {}
): Promise<AppHarness> {
  const redis = new MemoryRedisFacade();
  const pkceStore = new RedisPkceStore(redis);
  const tenant = makeTenant(tenantOverrides);

  const mockMsalAcquireByCode = vi.fn(async () => ({
    accessToken: 'access-token-abc',
    idToken: 'id-token-xyz',
    expiresOn: new Date(Date.now() + 3600 * 1000),
    account: { homeAccountId: 'home-1', username: 'user@example.com' },
  }));

  const mockTenantPool = {
    acquire: vi.fn(async () => ({
      acquireTokenByCode: mockMsalAcquireByCode,
    })),
    buildCachePlugin: vi.fn(),
    evict: vi.fn(),
    // Plan 03-07: /token handler surfaces the per-tenant DEK to build its
    // SessionStore. The test DEK is deterministic so downstream assertions
    // (e.g., SC#5 plaintext scan in the integration test) can decrypt.
    getDekForTenant: vi.fn(() => Buffer.alloc(32, 7)),
  };

  const { createAuthorizeHandler, createTenantTokenHandler } =
    await import('../../src/lib/oauth/tenant-handlers.js');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // loadTenant stub — pin the request's tenant.
  const loadTenantStub = (req: Request, _res: Response, next: NextFunction): void => {
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    // Phase 3 scaffold: simulate params.tenantId = placeholder
    if (!req.params) (req as Request & { params: Record<string, string> }).params = {};
    (req as Request & { params: Record<string, string> }).params.tenantId = '_';
    next();
  };

  app.get('/authorize', loadTenantStub, createAuthorizeHandler({ pkceStore, ...authorizeOptions }));
  app.post(
    '/token',
    loadTenantStub,
    createTenantTokenHandler({
      pkceStore,
      tenantPool: mockTenantPool as unknown as {
        acquire: (t: TenantRow) => Promise<unknown>;
        getDekForTenant: (tid: string) => Buffer;
      },
      redis,
    })
  );

  return await new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        redis,
        tenant,
        pkceStore,
        mockMsalAcquireByCode,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

describe('Delegated OAuth flow (AUTH-01)', () => {
  let harness: AppHarness | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = undefined;
    }
  });

  it('Test 1: /authorize happy path writes PKCE + redirects to Microsoft with server-generated challenge', async () => {
    harness = await startApp();

    // Pre-compute a valid client challenge (base64url, 43-128 chars)
    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('base64url');

    const params = new URLSearchParams({
      redirect_uri: 'http://localhost:3000/callback',
      code_challenge: clientChallenge,
      code_challenge_method: 'S256',
      state,
      client_id: harness.tenant.client_id,
    });

    const res = await fetch(`${harness.url}/authorize?${params}`, {
      redirect: 'manual',
    });

    // Response should be a 302 redirect to Microsoft
    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const loc = new URL(location!);
    expect(loc.origin).toBe('https://login.microsoftonline.com');
    // PKCE challenge on outbound request is server's challenge (NOT client's)
    const outboundChallenge = loc.searchParams.get('code_challenge');
    expect(outboundChallenge).toBeTruthy();
    expect(outboundChallenge).not.toBe(clientChallenge);
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loc.searchParams.get('client_id')).toBe(harness.tenant.client_id);

    // PKCE entry should be in the store, keyed by the real tenant id (plan 03-08).
    const entry = await harness.pkceStore.takeByChallenge(harness.tenant.id, clientChallenge);
    expect(entry).not.toBeNull();
    expect(entry?.clientCodeChallenge).toBe(clientChallenge);
    expect(entry?.redirectUri).toBe('http://localhost:3000/callback');
  });

  it('Test 2: /authorize with redirect_uri NOT in allowlist → 400 invalid_redirect_uri', async () => {
    harness = await startApp({
      redirect_uri_allowlist: ['http://localhost:3000/callback'],
    });

    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');

    const params = new URLSearchParams({
      redirect_uri: 'https://attacker.example.com/steal',
      code_challenge: clientChallenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      client_id: harness.tenant.client_id,
    });

    const res = await fetch(`${harness.url}/authorize?${params}`, {
      redirect: 'manual',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_redirect_uri');
  });

  it('allows trusted hosted connector redirect host without exact path allowlist', async () => {
    harness = await startApp(
      {
        redirect_uri_allowlist: ['https://claude.ai/api/mcp/auth_callback'],
      },
      { extraAllowedHosts: ['https://chatgpt.com'] }
    );

    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');
    const redirectUri = 'https://chatgpt.com/connector/oauth/generatedPath';

    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      code_challenge: clientChallenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      client_id: harness.tenant.client_id,
    });

    const res = await fetch(`${harness.url}/authorize?${params}`, {
      redirect: 'manual',
    });

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const loc = new URL(location!);
    expect(loc.searchParams.get('redirect_uri')).toBe(redirectUri);

    const entry = await harness.pkceStore.takeByChallenge(harness.tenant.id, clientChallenge);
    expect(entry?.redirectUri).toBe(redirectUri);
  });

  it('rejects hosted connector lookalike hosts', async () => {
    harness = await startApp(
      {
        redirect_uri_allowlist: ['https://claude.ai/api/mcp/auth_callback'],
      },
      { extraAllowedHosts: ['chatgpt.com'] }
    );

    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');

    const params = new URLSearchParams({
      redirect_uri: 'https://evilchatgpt.com/connector/oauth/generatedPath',
      code_challenge: clientChallenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      client_id: harness.tenant.client_id,
    });

    const res = await fetch(`${harness.url}/authorize?${params}`, {
      redirect: 'manual',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_redirect_uri');
  });

  it('Test 3: /authorize with javascript: URI → 400 (Phase 1 validator rejects)', async () => {
    // javascript: is never valid no matter what the allowlist says
    harness = await startApp({
      redirect_uri_allowlist: ['javascript:alert(1)'],
    });

    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');

    const params = new URLSearchParams({
      redirect_uri: 'javascript:alert(1)',
      code_challenge: clientChallenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      client_id: harness.tenant.client_id,
    });

    const res = await fetch(`${harness.url}/authorize?${params}`, {
      redirect: 'manual',
    });

    expect(res.status).toBe(400);
  });

  it('Test 4: /authorize with invalid code_challenge format → 400 invalid_code_challenge', async () => {
    harness = await startApp();

    const params = new URLSearchParams({
      redirect_uri: 'http://localhost:3000/callback',
      code_challenge: 'too-short',
      code_challenge_method: 'S256',
      state: 'xyz',
    });

    const res = await fetch(`${harness.url}/authorize?${params}`, {
      redirect: 'manual',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_code_challenge');
  });

  it('Test 5: /token exchange: takeByChallenge + acquireTokenByCode returns access_token', async () => {
    harness = await startApp();

    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('base64url');

    // Seed a PKCE entry (simulating the /authorize step). Plan 03-08 keys the
    // PKCE Redis entry on the real tenant id — so both put + takeByChallenge
    // now use `harness.tenant.id`.
    await harness.pkceStore.put(harness.tenant.id, {
      state,
      clientCodeChallenge: clientChallenge,
      clientCodeChallengeMethod: 'S256',
      serverCodeVerifier: 'server-verifier-xyz',
      clientId: harness.tenant.client_id,
      redirectUri: 'http://localhost:3000/callback',
      tenantId: harness.tenant.id,
      createdAt: Date.now(),
    });

    const res = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'the-auth-code',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: clientVerifier,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
    expect(body.access_token).toBe('access-token-abc');
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBeGreaterThan(0);
    await expect(
      hasDelegatedAccessToken({
        redis: harness.redis,
        tenantId: harness.tenant.id,
        accessToken: body.access_token,
      })
    ).resolves.toBe(true);

    // MSAL was called with server's verifier and the auth code
    expect(harness.mockMsalAcquireByCode).toHaveBeenCalledTimes(1);
    const callArgs = harness.mockMsalAcquireByCode.mock.calls[0]![0] as {
      code: string;
      redirectUri: string;
      codeVerifier: string;
      scopes: string[];
    };
    expect(callArgs.code).toBe('the-auth-code');
    expect(callArgs.codeVerifier).toBe('server-verifier-xyz');
    expect(callArgs.redirectUri).toBe('http://localhost:3000/callback');
  });

  it('Test 6: /token with PKCE miss → 400 invalid_grant', async () => {
    harness = await startApp();

    const clientVerifier = crypto.randomBytes(32).toString('base64url');

    const res = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'the-auth-code',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: clientVerifier, // NO corresponding PKCE entry seeded
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_grant');
  });

  it('Test 7: MicrosoftOAuthProvider.forTenant reads tenant-scoped config (no singleton secrets)', async () => {
    const { MicrosoftOAuthProvider } = await import('../../src/oauth-provider.js');
    const tenant = makeTenant({
      client_id: 'specific-client',
      tenant_id: 'tenant-guid-A',
      cloud_type: 'global',
      redirect_uri_allowlist: ['https://example.com/cb'],
    });

    const provider = MicrosoftOAuthProvider.forTenant(tenant);
    expect(provider).toBeInstanceOf(MicrosoftOAuthProvider);

    // Verify: calling getClient returns redirect_uris from the tenant allowlist
    const client = await provider.clientsStore.getClient('specific-client');
    expect(client).toBeDefined();
    expect(client?.client_id).toBe('specific-client');
    expect(client?.redirect_uris).toEqual(['https://example.com/cb']);

    // Verify: an unknown clientId returns undefined
    const unknown = await provider.clientsStore.getClient('some-other-client');
    expect(unknown).toBeUndefined();
  });
});

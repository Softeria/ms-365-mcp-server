/**
 * Plan 03-07 Task 2 — ROADMAP SC#5: Redis contains NO plaintext MSAL
 * secrets across ALL Phase 3 envelope-encrypted key prefixes.
 *
 * The test drives the full Phase 3 auth round-trip:
 *   1. /token exchange → SessionStore.put → mcp:session:* populated.
 *   2. Mocked MSAL cache-plugin writeback → mcp:cache:* populated.
 *   3. After both writes, scan every key under `mcp:cache:*` AND
 *      `mcp:session:*` for four forbidden plaintext substrings:
 *        - `"refresh_token":` (MSAL JSON field name)
 *        - `"access_token":`
 *        - `"secret":`
 *        - `rt-` (well-known refresh-token prefix used by the test fixtures)
 *
 * SECUR-02 signal: Any substring match is a test failure — envelope
 * encryption guarantees the serialized value is base64 ciphertext inside a
 * `{v,iv,tag,ct}` JSON envelope, never the underlying MSAL blob.
 *
 * Why both prefixes? msal-cache-plugin (03-05) writes mcp:cache:*;
 * session-store (03-07) writes mcp:session:*. Scanning only ONE prefix
 * misses the other envelope path. The plan explicitly requires both.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { RedisPkceStore } from '../../src/lib/pkce-store/redis-store.js';
import { generateTenantDek, unwrapTenantDek } from '../../src/lib/crypto/dek.js';
import { createRedisCachePlugin } from '../../src/lib/msal-cache-plugin.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const KEK = crypto.randomBytes(32);

function makeTenant(): TenantRow {
  const { wrappedDek } = generateTenantDek(KEK);
  return {
    id: 'tenant-sc5',
    mode: 'delegated',
    client_id: 'client-abc',
    client_secret_ref: null,
    client_secret_resolved: 'super-secret',
    tenant_id: 'azure-tenant-guid',
    cloud_type: 'global',
    redirect_uri_allowlist: ['http://localhost:3000/callback'],
    cors_origins: [],
    allowed_scopes: ['User.Read', 'Mail.Read'],
    enabled_tools: null,
    wrapped_dek: wrappedDek,
    slug: null,
    disabled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

interface Harness {
  url: string;
  redis: MemoryRedisFacade;
  tenant: TenantRow;
  pkceStore: RedisPkceStore;
  dek: Buffer;
  close: () => Promise<void>;
}

async function startApp(): Promise<Harness> {
  const redis = new MemoryRedisFacade();
  const pkceStore = new RedisPkceStore(redis);
  const tenant = makeTenant();
  if (!tenant.wrapped_dek) throw new Error('wrapped_dek missing');
  const dek = unwrapTenantDek(tenant.wrapped_dek, KEK);

  // Mocked MSAL acquireTokenByCode that returns a realistic-looking triple.
  // Critical: the returned blob carries BOTH access + refresh tokens that
  // contain the `rt-` / `access_` plaintext patterns — the SC#5 scan will
  // fail if any of these survive envelope encryption intact.
  const mockAcquireByCode = vi.fn(async () => ({
    accessToken: 'access-SC5-plaintext-should-never-leak',
    refreshToken: 'rt-SC5-plaintext-never-leak',
    idToken: 'id-token-irrelevant',
    expiresOn: new Date(Date.now() + 3600 * 1000),
    account: { homeAccountId: 'home-1' },
  }));

  const mockTenantPool = {
    acquire: vi.fn(async () => ({ acquireTokenByCode: mockAcquireByCode })),
    buildCachePlugin: vi.fn(),
    evict: vi.fn(),
    getDekForTenant: vi.fn(() => dek),
  };

  const { createTenantTokenHandler } = await import('../../src/lib/oauth/tenant-handlers.js');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const loadTenantStub = (req: Request, _res: Response, next: NextFunction): void => {
    (req as Request & { tenant?: TenantRow }).tenant = tenant;
    if (!req.params) (req as Request & { params: Record<string, string> }).params = {};
    (req as Request & { params: Record<string, string> }).params.tenantId = '_';
    next();
  };

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
        dek,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

/**
 * Drive the msal-cache-plugin write path directly so `mcp:cache:*` is
 * populated before the SC#5 scan. We feed a realistic MSAL cache blob
 * containing refresh_token and access_token JSON fields — if envelope
 * encryption is correctly applied, the RAW Redis value should contain
 * NONE of those substrings (only base64 ciphertext inside {v,iv,tag,ct}).
 */
async function primeMsalCachePlugin(
  redis: MemoryRedisFacade,
  tenantId: string,
  dek: Buffer
): Promise<void> {
  const plugin = createRedisCachePlugin({
    redis,
    tenantId,
    clientId: 'client-abc',
    userOid: 'home-1',
    scopeHash: 'deadbeefcafebabe',
    dek,
  });
  // Serialized MSAL cache blob — contains ALL the forbidden plaintext patterns.
  // The plugin's afterCacheAccess must envelope-encrypt this.
  const plaintextMsalCache = JSON.stringify({
    AccessToken: {
      'home-1.abc-user': {
        credentialType: 'AccessToken',
        secret: 'access-SC5-plaintext-should-never-leak',
        access_token: 'access-SC5-plaintext-should-never-leak',
      },
    },
    RefreshToken: {
      'home-1.abc-user': {
        credentialType: 'RefreshToken',
        secret: 'rt-SC5-plaintext-never-leak',
        refresh_token: 'rt-SC5-plaintext-never-leak',
      },
    },
  });
  await plugin.afterCacheAccess({
    cacheHasChanged: true,
    tokenCache: {
      serialize: () => plaintextMsalCache,
      deserialize: () => {},
    },
  } as never);
}

describe('plan 03-07 Task 2 — SC#5: no plaintext MSAL secrets in Redis', () => {
  let harness: Harness | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = undefined;
    }
  });

  it('SC#5: after /token + MSAL-cache write, both mcp:cache:* and mcp:session:* values are envelope-encrypted (no plaintext refresh_token / access_token / secret / rt-)', async () => {
    harness = await startApp();

    // ── Step 1: drive /token so mcp:session:* populates ───────────────────
    const clientVerifier = crypto.randomBytes(32).toString('base64url');
    const clientChallenge = crypto.createHash('sha256').update(clientVerifier).digest('base64url');
    const serverVerifier = crypto.randomBytes(32).toString('base64url');

    // Plan 03-08: PKCE Redis key is keyed on the real tenant id (from the
    // /t/:tenantId/* router via loadTenant). Mirror that here.
    await harness.pkceStore.put(harness.tenant.id, {
      state: 'abc',
      clientCodeChallenge: clientChallenge,
      clientCodeChallengeMethod: 'S256',
      serverCodeVerifier: serverVerifier,
      clientId: harness.tenant.client_id,
      redirectUri: 'http://localhost:3000/callback',
      tenantId: harness.tenant.id,
      createdAt: Date.now(),
    });

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'auth-code-xyz',
      code_verifier: clientVerifier,
      redirect_uri: 'http://localhost:3000/callback',
    });

    const tokenRes = await fetch(`${harness.url}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    expect(tokenRes.status).toBe(200);
    const tokenBody = (await tokenRes.json()) as Record<string, unknown>;
    // Critical: response body never contains the refresh token
    expect(JSON.stringify(tokenBody)).not.toContain('rt-SC5-plaintext-never-leak');
    expect(tokenBody.refresh_token).toBeUndefined();

    // ── Step 2: drive msal-cache-plugin so mcp:cache:* populates ──────────
    await primeMsalCachePlugin(harness.redis, harness.tenant.id, harness.dek);

    // ── Step 3: verify BOTH prefixes populated ────────────────────────────
    const sessionKeys = await harness.redis.keys('mcp:session:*');
    const cacheKeys = await harness.redis.keys('mcp:cache:*');
    expect(sessionKeys.length).toBeGreaterThan(0);
    expect(cacheKeys.length).toBeGreaterThan(0);

    // ── Step 4: scan ALL values across BOTH prefixes for plaintext ────────
    const FORBIDDEN = [
      '"refresh_token":',
      '"access_token":',
      '"secret":',
      'rt-SC5-plaintext-never-leak',
      'access-SC5-plaintext-should-never-leak',
    ];

    const allKeys = [...sessionKeys, ...cacheKeys];
    for (const key of allKeys) {
      const raw = await harness.redis.get(key);
      expect(raw, `key ${key} should not be null`).toBeTruthy();
      for (const needle of FORBIDDEN) {
        expect(
          raw!.includes(needle),
          `key ${key} contains forbidden plaintext ${JSON.stringify(needle)}`
        ).toBe(false);
      }
      // Positive assertion: every value is a JSON-parseable envelope
      const envelope = JSON.parse(raw!);
      expect(envelope.v).toBe(1);
      expect(typeof envelope.iv).toBe('string');
      expect(typeof envelope.tag).toBe('string');
      expect(typeof envelope.ct).toBe('string');
    }
  });
});

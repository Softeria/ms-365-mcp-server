import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AccountInfo, Configuration, TokenCacheContext } from '@azure/msal-node';
import { PublicClientApplication } from '@azure/msal-node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthManager, {
  buildDiskCoherencyCachePlugin,
  duplicateRefreshTokenHint,
  resetRefreshTokenWarningsForTests,
} from '../src/auth.js';
import { dedupeRefreshTokens } from '../src/lib/cache-dedupe.js';
import {
  DefaultTokenCacheStorage,
  resetCacheKeyForTests,
  unwrapCache,
  wrapCache,
  type TokenCacheStorage,
} from '../src/token-cache-storage.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// keytar is a real dependency, so without this the suite would touch the developer's
// actual login keyring.
const keychain = new Map<string, string>();
vi.mock('keytar', () => ({
  default: {
    getPassword: vi.fn(async (service: string, account: string) => {
      return keychain.get(`${service}/${account}`) ?? null;
    }),
    setPassword: vi.fn(async (service: string, account: string, value: string) => {
      keychain.set(`${service}/${account}`, value);
    }),
    deletePassword: vi.fn(async (service: string, account: string) => {
      return keychain.delete(`${service}/${account}`);
    }),
  },
}));

const HOME_ID = 'uid-a.utid-a';
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const CURRENT_ENV = 'login.windows.net';
const ALIAS_ENV = 'login.microsoftonline.com';
const OTHER_CLIENT_ID = '99999999-8888-7777-6666-555555555555';

let tmpDir: string;

beforeEach(() => {
  vi.clearAllMocks();
  keychain.clear();
  resetCacheKeyForTests();
  resetRefreshTokenWarningsForTests();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms365-cache-roundtrip-'));
  vi.stubEnv('MS365_MCP_TOKEN_CACHE_PATH', path.join(tmpDir, 'token-cache.json'));
  vi.stubEnv('MS365_MCP_SELECTED_ACCOUNT_PATH', path.join(tmpDir, 'selected-account.json'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetCacheKeyForTests();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function accountEntity(environment: string) {
  return {
    home_account_id: HOME_ID,
    environment,
    realm: 'utid-a',
    local_account_id: 'uid-a',
    username: 'a@contoso.com',
    authority_type: 'MSSTS',
    name: 'Account A',
  };
}

function accessTokenEntity(environment: string, cachedAt: string, client = CLIENT_ID) {
  return {
    home_account_id: HOME_ID,
    environment,
    credential_type: 'AccessToken',
    client_id: client,
    secret: `AT-${cachedAt}`,
    realm: 'utid-a',
    target: 'mail.read',
    cached_at: cachedAt,
    expires_on: String(Number(cachedAt) + 3600),
    token_type: 'Bearer',
  };
}

function refreshTokenEntity(environment: string, secret: string, client = CLIENT_ID) {
  return {
    home_account_id: HOME_ID,
    environment,
    credential_type: 'RefreshToken',
    client_id: client,
    secret,
  };
}

function refreshTokenKey(environment: string, client = CLIENT_ID) {
  return `${HOME_ID}-${environment}-refreshtoken-${client}---`;
}

function accessTokenKey(environment: string, client = CLIENT_ID) {
  return `${HOME_ID}-${environment}-accesstoken-${client}-utid-a-mail.read`;
}

/**
 * The plugin only reads `cacheHasChanged` and `tokenCache` off the context, so a plain
 * object stands in for MSAL's own - while the token cache underneath stays the real one.
 */
function context(tokenCache: unknown, cacheHasChanged: boolean): TokenCacheContext {
  return { cacheHasChanged, tokenCache } as unknown as TokenCacheContext;
}

function buildApp(storage: TokenCacheStorage) {
  const app = new PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: 'https://login.microsoftonline.com/common' },
    cache: { cachePlugin: buildDiskCoherencyCachePlugin(storage) },
  });
  const tokenCache = app.getTokenCache();
  // Reaching past the public surface on purpose: NodeStorage is what actually answers
  // the refresh flow, and its selection is the thing under test.
  const nodeStorage = (tokenCache as unknown as { storage: Record<string, never> }).storage;
  return { app, tokenCache, nodeStorage: nodeStorage as unknown as NodeStorageLike };
}

interface NodeStorageLike {
  setRefreshTokenCredential: (credential: object, correlationId: string) => Promise<void>;
  getRefreshToken: (
    account: AccountInfo,
    familyRT: boolean,
    correlationId: string
  ) => { secret: string } | null;
}

/** Refresh token secrets in the key-value store that actually answers getRefreshToken. */
function kvRefreshSecrets(tokenCache: { getKVStore: () => Record<string, unknown> }): string[] {
  return Object.values(tokenCache.getKVStore())
    .filter(
      (entity): entity is { credentialType: string; secret: string } =>
        typeof entity === 'object' &&
        entity !== null &&
        (entity as { credentialType?: string }).credentialType === 'RefreshToken'
    )
    .map((entity) => entity.secret);
}

async function readRefreshTokens(storage: TokenCacheStorage): Promise<Record<string, string>> {
  const raw = await storage.load('token-cache');
  const parsed = JSON.parse(unwrapCache(raw as string).data) as {
    RefreshToken: Record<string, { secret: string }>;
  };
  return Object.fromEntries(
    Object.entries(parsed.RefreshToken).map(([key, value]) => [key, value.secret])
  );
}

describe('token cache round-trip through the real MSAL cache', () => {
  it('persists a rotated refresh token', async () => {
    const storage = new DefaultTokenCacheStorage();
    await storage.save(
      'token-cache',
      wrapCache(
        JSON.stringify({
          Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
          IdToken: {},
          AccessToken: {},
          RefreshToken: {
            [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-OLD'),
          },
          AppMetadata: {},
        })
      )
    );

    const { tokenCache, nodeStorage } = buildApp(storage);
    const plugin = buildDiskCoherencyCachePlugin(storage);

    // The order msal-common's ResponseHandler uses around a token response.
    const ctx = context(tokenCache, true);
    await plugin.beforeCacheAccess!(ctx);
    await nodeStorage.setRefreshTokenCredential(
      {
        homeAccountId: HOME_ID,
        environment: CURRENT_ENV,
        credentialType: 'RefreshToken',
        clientId: CLIENT_ID,
        secret: 'RT-NEW',
      },
      'corr-1'
    );
    await plugin.afterCacheAccess!(ctx);

    expect(Object.values(await readRefreshTokens(storage))).toContain('RT-NEW');
  });

  it('prunes the store MSAL reads, not only the blob it was handed', async () => {
    // A fresh PublicClientApplication per test can't reach this: the process already holds
    // both, because nothing could rank them when it first loaded. deserialize() merges into
    // the key-value store instead of replacing it, so pruning the blob alone leaves the
    // stale entry answering getRefreshToken (issue #648)
    const disk = (accessTokens: Record<string, unknown>) =>
      wrapCache(
        JSON.stringify({
          Account: {
            [`${HOME_ID}-${ALIAS_ENV}-utid-a`]: accountEntity(ALIAS_ENV),
            [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV),
          },
          IdToken: {},
          AccessToken: accessTokens,
          RefreshToken: {
            [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-FROM-MAY'),
            [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-AUGUST'),
          },
          AppMetadata: {},
        })
      );

    const storage = new DefaultTokenCacheStorage();
    await storage.save('token-cache', disk({}));

    const { tokenCache, nodeStorage } = buildApp(storage);
    const plugin = buildDiskCoherencyCachePlugin(storage);

    await plugin.beforeCacheAccess!(context(tokenCache, false));
    expect(kvRefreshSecrets(tokenCache).sort()).toEqual(['RT-FROM-AUGUST', 'RT-FROM-MAY']);

    // A sign-in lands an access token, which is what finally names the live environment.
    await storage.save(
      'token-cache',
      disk({ [accessTokenKey(CURRENT_ENV)]: accessTokenEntity(CURRENT_ENV, '1755000000') })
    );

    const ctx = context(tokenCache, true);
    await plugin.beforeCacheAccess!(ctx);

    expect(kvRefreshSecrets(tokenCache)).toEqual(['RT-FROM-AUGUST']);
    expect(
      nodeStorage.getRefreshToken(
        { homeAccountId: HOME_ID, environment: CURRENT_ENV } as AccountInfo,
        false,
        'corr-1'
      )?.secret
    ).toBe('RT-FROM-AUGUST');

    // And the drop must not come back the moment anything persists.
    await plugin.afterCacheAccess!(ctx);
    expect(Object.values(await readRefreshTokens(storage))).toEqual(['RT-FROM-AUGUST']);
  });

  it('asks the real MSAL for its key format and clears the superseded entry', async () => {
    // Real PublicClientApplication, real affected cache. Also the canary for the NodeStorage
    // hop: if MSAL drops generateCredentialKey the resolver goes quiet, nothing is pruned,
    // and this fails instead of silently going back to spending the stale token
    const legacyKey = `${refreshTokenKey(CURRENT_ENV)}-`;
    const storage = new DefaultTokenCacheStorage();
    await storage.save(
      'token-cache',
      wrapCache(
        JSON.stringify({
          Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
          IdToken: {},
          AccessToken: {},
          RefreshToken: {
            [legacyKey]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-MAY'),
            [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-AUGUST'),
          },
          AppMetadata: {},
        })
      )
    );

    const { tokenCache, nodeStorage } = buildApp(storage);
    const plugin = buildDiskCoherencyCachePlugin(storage);
    const ctx = context(tokenCache, true);
    await plugin.beforeCacheAccess!(ctx);

    expect(kvRefreshSecrets(tokenCache)).toEqual(['RT-FROM-AUGUST']);
    expect(
      nodeStorage.getRefreshToken(
        { homeAccountId: HOME_ID, environment: CURRENT_ENV } as AccountInfo,
        false,
        'corr-1'
      )?.secret
    ).toBe('RT-FROM-AUGUST');

    await plugin.afterCacheAccess!(ctx);
    expect(Object.values(await readRefreshTokens(storage))).toEqual(['RT-FROM-AUGUST']);
  });

  it('keeps realm-scoped credentials apart when it asks MSAL for the key', async () => {
    // The real canonicalKeyResolver, not a stub. realm owns a key segment, so a resolver
    // that drops it maps these two onto one key and deletes the one not sitting at it -
    // a live credential, gone. MSAL lowercases the key it builds
    const scopedKey = `${HOME_ID}-${CURRENT_ENV}-refreshtoken-${CLIENT_ID}-tenant-b--`;
    const storage = new DefaultTokenCacheStorage();
    await storage.save(
      'token-cache',
      wrapCache(
        JSON.stringify({
          Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
          IdToken: {},
          AccessToken: {},
          RefreshToken: {
            [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-NO-REALM'),
            [scopedKey]: { ...refreshTokenEntity(CURRENT_ENV, 'RT-TENANT-B'), realm: 'tenant-b' },
          },
          AppMetadata: {},
        })
      )
    );

    const { tokenCache } = buildApp(storage);
    const plugin = buildDiskCoherencyCachePlugin(storage);
    await plugin.beforeCacheAccess!(context(tokenCache, false));

    expect(kvRefreshSecrets(tokenCache).sort()).toEqual(['RT-NO-REALM', 'RT-TENANT-B']);
  });

  it('collapses alias-environment duplicates so the newest refresh token wins', async () => {
    const storage = new DefaultTokenCacheStorage();
    await storage.save(
      'token-cache',
      wrapCache(
        JSON.stringify({
          Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
          IdToken: {},
          // The newest access token names the environment MSAL last wrote under.
          AccessToken: {
            [`${HOME_ID}-${ALIAS_ENV}-accesstoken-${CLIENT_ID}-utid-a-mail.read`]:
              accessTokenEntity(ALIAS_ENV, '1747814065'),
            [`${HOME_ID}-${CURRENT_ENV}-accesstoken-${CLIENT_ID}-utid-a-mail.read`]:
              accessTokenEntity(CURRENT_ENV, '1755000000'),
          },
          // Insertion order matters: the stale one is first, which is what MSAL would pick.
          RefreshToken: {
            [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-FROM-MAY'),
            [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-AUGUST'),
          },
          AppMetadata: {},
        })
      )
    );

    const { tokenCache, nodeStorage } = buildApp(storage);
    const accounts = await tokenCache.getAllAccounts();
    expect(accounts).toHaveLength(1);

    const picked = nodeStorage.getRefreshToken(accounts[0], false, 'corr-1');
    expect(picked?.secret).toBe('RT-FROM-AUGUST');
  });

  it('keeps the pruning once something persists the cache', async () => {
    const storage = new DefaultTokenCacheStorage();
    await storage.save(
      'token-cache',
      wrapCache(
        JSON.stringify({
          Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
          IdToken: {},
          AccessToken: {
            [`${HOME_ID}-${CURRENT_ENV}-accesstoken-${CLIENT_ID}-utid-a-mail.read`]:
              accessTokenEntity(CURRENT_ENV, '1755000000'),
          },
          RefreshToken: {
            [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-FROM-MAY'),
            [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-AUGUST'),
          },
          AppMetadata: {},
        })
      )
    );

    const { tokenCache } = buildApp(storage);
    const plugin = buildDiskCoherencyCachePlugin(storage);
    const ctx = context(tokenCache, true);
    await plugin.beforeCacheAccess!(ctx);
    await plugin.afterCacheAccess!(ctx);

    expect(Object.values(await readRefreshTokens(storage))).toEqual(['RT-FROM-AUGUST']);
  });
});

describe('dedupeRefreshTokens', () => {
  it('leaves a blob it cannot parse exactly as it found it', () => {
    expect(dedupeRefreshTokens('serialized-cache').data).toBe('serialized-cache');
  });

  it('leaves duplicates alone when nothing says which is current', () => {
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {},
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-ONE'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-TWO'),
      },
    });

    const result = dedupeRefreshTokens(cache);

    expect(result.data).toBe(cache);
    expect(result.dropped).toEqual([]);
    expect(result.ambiguous).toBe(1);
  });

  it('does not pit a family token against an app-specific one', () => {
    const familyKey = `${HOME_ID}-${CURRENT_ENV}-refreshtoken-1---`;
    const cache = JSON.stringify({
      Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
      AccessToken: {},
      RefreshToken: {
        [familyKey]: { ...refreshTokenEntity(CURRENT_ENV, 'RT-FAMILY'), family_id: '1' },
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-APP'),
      },
    });

    const result = dedupeRefreshTokens(cache);

    expect(result.data).toBe(cache);
    expect(result.dropped).toEqual([]);
    expect(result.ambiguous).toBe(0);
  });

  it('will not let an account entity rank a group with no dated signal', () => {
    // An account entity has no recency and no link to the last rotation, so it can't say
    // which of these is live. A wrong guess is invisible: signed out, signs back in, never
    // reported
    const cache = JSON.stringify({
      Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
      AccessToken: {},
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-ONE'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-TWO'),
      },
    });

    const result = dedupeRefreshTokens(cache);

    expect(result.data).toBe(cache);
    expect(result.dropped).toEqual([]);
    expect(result.ambiguous).toBe(1);
    expect(result.ambiguousAccounts).toEqual([HOME_ID]);
  });

  it('keeps what the newest access token points at, not whatever was written last', () => {
    // The survivor is deliberately the FIRST entry here: an implementation that just kept
    // the last key in insertion order would pass every other case in this file and fail
    // this one, which is the whole point of ranking by cached_at.
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {
        [accessTokenKey(CURRENT_ENV)]: accessTokenEntity(CURRENT_ENV, '1755000000'),
        [accessTokenKey(ALIAS_ENV)]: accessTokenEntity(ALIAS_ENV, '1760000000'),
      },
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-NEWEST'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-OLDER'),
      },
    });

    const result = dedupeRefreshTokens(cache);
    const kept = JSON.parse(result.data) as { RefreshToken: Record<string, { secret: string }> };

    expect(Object.values(kept.RefreshToken).map((entity) => entity.secret)).toEqual(['RT-NEWEST']);
    expect(result.dropped).toEqual([
      { key: refreshTokenKey(CURRENT_ENV), environment: CURRENT_ENV, keptEnvironment: ALIAS_ENV },
    ]);
  });

  it('treats two environments stamped at the same instant as unrankable', () => {
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {
        [accessTokenKey(ALIAS_ENV)]: accessTokenEntity(ALIAS_ENV, '1755000000'),
        [accessTokenKey(CURRENT_ENV)]: accessTokenEntity(CURRENT_ENV, '1755000000'),
      },
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-ONE'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-TWO'),
      },
    });

    const result = dedupeRefreshTokens(cache);

    expect(result.data).toBe(cache);
    expect(result.dropped).toEqual([]);
    expect(result.ambiguous).toBe(1);
  });

  it('does not let the account environment break an access token tie', () => {
    // A tie plus a single account entity, which is the shape the other tie test misses by
    // passing Account: {}. Neither may break the tie
    const cache = JSON.stringify({
      Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
      AccessToken: {
        [accessTokenKey(ALIAS_ENV)]: accessTokenEntity(ALIAS_ENV, '1755000000'),
        [accessTokenKey(CURRENT_ENV)]: accessTokenEntity(CURRENT_ENV, '1755000000'),
      },
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-ONE'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-TWO'),
      },
    });

    const result = dedupeRefreshTokens(cache);

    expect(result.data).toBe(cache);
    expect(result.dropped).toEqual([]);
    expect(result.ambiguous).toBe(1);
  });

  it("does not let one client id decide another client id's survivor", () => {
    // The other client's access token is newer and sits in the alias environment. Ranking
    // account-wide would delete this client's live token and keep its stale one.
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {
        [accessTokenKey(CURRENT_ENV)]: accessTokenEntity(CURRENT_ENV, '1755000000'),
        [accessTokenKey(ALIAS_ENV, OTHER_CLIENT_ID)]: accessTokenEntity(
          ALIAS_ENV,
          '1760000000',
          OTHER_CLIENT_ID
        ),
      },
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-STALE'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-LIVE'),
      },
    });

    const result = dedupeRefreshTokens(cache);
    const kept = JSON.parse(result.data) as { RefreshToken: Record<string, { secret: string }> };

    expect(Object.values(kept.RefreshToken).map((entity) => entity.secret)).toEqual(['RT-LIVE']);
  });

  // msal-node 3.x wrote one trailing segment more than 5.x does. Both shapes reference the
  // same credential, so the environment ranking is blind to them (identical environments).
  const LEGACY_KEY = `${refreshTokenKey(CURRENT_ENV)}-`;
  const canonicalKeyFor = (entity: { client_id?: string; family_id?: string }) =>
    entity.client_id ? refreshTokenKey(CURRENT_ENV, entity.client_id) : undefined;

  it('drops an entry left under a superseded MSAL key format', () => {
    // Taken from a real affected cache: same account, same client, same environment, two
    // key shapes, and the stale one sorting first so MSAL spends it every time.
    const cache = JSON.stringify({
      Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
      AccessToken: {},
      RefreshToken: {
        [LEGACY_KEY]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-MAY'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-AUGUST'),
      },
    });

    const result = dedupeRefreshTokens(cache, canonicalKeyFor);
    const kept = JSON.parse(result.data) as { RefreshToken: Record<string, { secret: string }> };

    expect(Object.values(kept.RefreshToken).map((e) => e.secret)).toEqual(['RT-FROM-AUGUST']);
    expect(result.dropped).toEqual([
      { key: LEGACY_KEY, environment: CURRENT_ENV, keptEnvironment: CURRENT_ENV },
    ]);
    expect(result.ambiguous).toBe(0);
  });

  it('leaves a lone superseded entry alone rather than orphaning the only credential', () => {
    // Upgraded but not signed in since. MSAL still reads this fine; dropping it would cost
    // a sign-in for no reason.
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {},
      RefreshToken: { [LEGACY_KEY]: refreshTokenEntity(CURRENT_ENV, 'RT-ONLY-COPY') },
    });

    const result = dedupeRefreshTokens(cache, canonicalKeyFor);

    expect(result.data).toBe(cache);
    expect(result.dropped).toEqual([]);
  });

  it('keeps both when neither entry sits at the canonical key', () => {
    // Two superseded formats and no current one, after crossing two MSAL majors without
    // signing in. The drop loop keeps only the canonical key, so without the occupant guard
    // this empties the account
    const olderKey = `${refreshTokenKey(CURRENT_ENV)}--`;
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {},
      RefreshToken: {
        [olderKey]: refreshTokenEntity(CURRENT_ENV, 'RT-OLDEST'),
        [LEGACY_KEY]: refreshTokenEntity(CURRENT_ENV, 'RT-OLDER'),
      },
    });

    const result = dedupeRefreshTokens(cache, canonicalKeyFor);
    const kept = JSON.parse(result.data) as { RefreshToken: Record<string, unknown> };

    expect(result.dropped).toEqual([]);
    expect(Object.keys(kept.RefreshToken)).toHaveLength(2);
  });

  it('does not collapse credentials that differ in a key-forming field', () => {
    // realm, target and tokenType each own a segment of the key. A resolver that ignores
    // them collapses two different credentials into one. This resolver is the faithful one
    const faithful = (entity: { client_id?: string; realm?: string }) =>
      entity.client_id
        ? `${HOME_ID}-${CURRENT_ENV}-refreshtoken-${entity.client_id}-${entity.realm ?? ''}--`
        : undefined;
    const scopedKey = `${HOME_ID}-${CURRENT_ENV}-refreshtoken-${CLIENT_ID}-tenant-b--`;
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {},
      RefreshToken: {
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-NO-REALM'),
        [scopedKey]: { ...refreshTokenEntity(CURRENT_ENV, 'RT-TENANT-B'), realm: 'tenant-b' },
      },
    });

    const result = dedupeRefreshTokens(cache, faithful);
    const kept = JSON.parse(result.data) as { RefreshToken: Record<string, { secret: string }> };

    expect(result.dropped).toEqual([]);
    expect(
      Object.values(kept.RefreshToken)
        .map((e) => e.secret)
        .sort()
    ).toEqual(['RT-NO-REALM', 'RT-TENANT-B']);
  });

  it('does nothing about key formats when no resolver is supplied', () => {
    const cache = JSON.stringify({
      Account: {},
      AccessToken: {},
      RefreshToken: {
        [LEGACY_KEY]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-MAY'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-FROM-AUGUST'),
      },
    });

    // Same input as the first case: without MSAL to ask, this is the old behaviour, an
    // unrankable pair left exactly as it was.
    const result = dedupeRefreshTokens(cache);

    expect(result.data).toBe(cache);
    expect(result.ambiguous).toBe(1);
  });

  it('preserves sections it does not model when it rewrites the cache', () => {
    const cache = JSON.stringify({
      Account: { [`${HOME_ID}-${CURRENT_ENV}-utid-a`]: accountEntity(CURRENT_ENV) },
      IdToken: { 'id-key': { home_account_id: HOME_ID, secret: 'ID-TOKEN' } },
      // A dated signal, so this exercises the rewrite rather than the leave-alone path.
      AccessToken: {
        [accessTokenKey(CURRENT_ENV)]: accessTokenEntity(CURRENT_ENV, '1755000000'),
      },
      RefreshToken: {
        [refreshTokenKey(ALIAS_ENV)]: refreshTokenEntity(ALIAS_ENV, 'RT-STALE'),
        [refreshTokenKey(CURRENT_ENV)]: refreshTokenEntity(CURRENT_ENV, 'RT-CURRENT'),
      },
      AppMetadata: { 'app-key': { client_id: CLIENT_ID, family_id: '1' } },
      SomethingLaterMsalAdded: { keep: 'me' },
    });

    const result = dedupeRefreshTokens(cache);
    const kept = JSON.parse(result.data) as Record<string, unknown>;

    expect(result.dropped).toHaveLength(1);
    expect(kept.IdToken).toEqual({ 'id-key': { home_account_id: HOME_ID, secret: 'ID-TOKEN' } });
    expect(kept.AppMetadata).toEqual({ 'app-key': { client_id: CLIENT_ID, family_id: '1' } });
    expect(kept.SomethingLaterMsalAdded).toEqual({ keep: 'me' });
  });
});

describe('duplicateRefreshTokenHint', () => {
  const account = { homeAccountId: HOME_ID } as AccountInfo;
  const other = { homeAccountId: 'uid-b.utid-b' } as AccountInfo;

  it('says nothing when there is no unresolved duplicate', () => {
    expect(duplicateRefreshTokenHint(account, new Set())).toBeNull();
  });

  it('names logout, because logging in again provably cannot clear it', () => {
    const hint = duplicateRefreshTokenHint(account, new Set([HOME_ID]));
    expect(hint).toMatch(/logout/);
    expect(hint).toMatch(/will not clear it/);
  });

  it("stays quiet about another account's duplicates", () => {
    // The remedy it names is a logout, which deletes every account's tokens. Attaching B's
    // ambiguity to A's unrelated failure would talk someone into signing all of them out.
    expect(duplicateRefreshTokenHint(other, new Set([HOME_ID]))).toBeNull();
  });

  it('says nothing when there is no current account to attribute it to', () => {
    expect(duplicateRefreshTokenHint(null, new Set([HOME_ID]))).toBeNull();
  });
});

describe('a sign-in that did not reach the cache', () => {
  const msalConfig: Configuration = {
    auth: { clientId: CLIENT_ID, authority: 'https://login.microsoftonline.com/common' },
  };
  const account = {
    username: 'a@contoso.com',
    name: 'Account A',
    homeAccountId: HOME_ID,
  } as AccountInfo;

  const otherAccount = {
    username: 'b@contoso.com',
    name: 'Account B',
    homeAccountId: 'uid-b.utid-b',
  } as AccountInfo;

  function createAuth(
    storage: TokenCacheStorage,
    kvStore: Record<string, unknown>,
    accounts: AccountInfo[] = [account],
    signedInAs: AccountInfo = account,
    /** Gives the *other* account a working silent refresh, so a suppressed failure shows up
     *  as the clean bill of health it would really be. */
    silentToken?: string
  ) {
    const tokenCache = {
      serialize: vi.fn().mockReturnValue('serialized-cache'),
      deserialize: vi.fn(),
      getAllAccounts: vi.fn().mockResolvedValue(accounts),
      removeAccount: vi.fn().mockResolvedValue(undefined),
      getKVStore: vi.fn(() => kvStore),
    };
    const msalApp = {
      getTokenCache: vi.fn(() => tokenCache),
      acquireTokenByDeviceCode: vi.fn().mockResolvedValue({
        accessToken: 'fresh-access-token',
        expiresOn: new Date(Date.now() + 60_000),
        account: signedInAs,
        scopes: ['User.Read'],
      }),
      ...(silentToken
        ? {
            acquireTokenSilent: vi.fn().mockResolvedValue({
              accessToken: silentToken,
              expiresOn: new Date(Date.now() + 60_000),
              account: accounts[0],
            }),
          }
        : {}),
    };
    const auth = new AuthManager(msalConfig, ['User.Read'], undefined, storage);
    Object.assign(auth as unknown as Record<string, unknown>, { msalApp });
    return auth;
  }

  /**
   * What MSAL actually holds after a sign-in: the cache it reloaded from disk, plus the
   * token just issued. Anything that models only the new token hides the case where a
   * stale on-disk token would satisfy the check on its own.
   */
  function inMemory(secrets: string[], home = HOME_ID): Record<string, unknown> {
    return Object.fromEntries(
      secrets.map((secret, index) => [
        `rt-key-${index}`,
        { credentialType: 'RefreshToken', homeAccountId: home, clientId: CLIENT_ID, secret },
      ])
    );
  }

  function serializedCache(secrets: string[], home: string): string {
    return JSON.stringify({
      RefreshToken: Object.fromEntries(
        secrets.map((secret, index) => [`rt-key-${index}`, { home_account_id: home, secret }])
      ),
    });
  }

  function storageHolding(secrets: string[], home = HOME_ID): TokenCacheStorage {
    return {
      description: 'mock-storage',
      failClosed: false,
      load: vi.fn().mockResolvedValue(wrapCache(serializedCache(secrets, home))),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * One entry per load() call, the last repeating. The sign-in path reads the cache before
   * the acquire and again after, so this is how a sibling writing between the two is
   * modelled.
   */
  function storageReturning(reads: string[][], home = HOME_ID): TokenCacheStorage {
    let call = 0;
    return {
      description: 'mock-storage',
      failClosed: false,
      load: vi.fn(async () =>
        wrapCache(serializedCache(reads[Math.min(call++, reads.length - 1)], home))
      ),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }

  it('fails the login instead of reporting success', async () => {
    // The write was swallowed, so disk still holds only the token from months ago - which
    // is also still in memory, and must not be what satisfies the check.
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(
      /refresh token was not written to the auth cache/
    );
  });

  it('reports the failure through verify login', async () => {
    // The MCP login tool has already returned by the time the sign-in fails, so this is
    // where the user finds out (issue #648).
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow();
    const result = await auth.testLogin();

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/refresh token was not written to the auth cache/);
  });

  it('accepts a login whose refresh token did land', async () => {
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY', 'RT-JUST-ISSUED']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).resolves.toBe('fresh-access-token');
  });

  it('stays quiet when MSAL exposes no refresh token to check', async () => {
    const auth = createAuth(storageHolding([]), {});

    await expect(auth.acquireTokenByDeviceCode()).resolves.toBe('fresh-access-token');
  });

  const STALE = /refresh token was not written to the auth cache/;

  it('stops reporting the failure after a logout', async () => {
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow();
    expect((await auth.testLogin()).message).toMatch(STALE);

    await auth.logout();

    expect((await auth.testLogin()).message).not.toMatch(STALE);
  });

  it('stops reporting the failure once another account is selected', async () => {
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED']),
      [account, otherAccount]
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow();
    expect((await auth.testLogin()).message).toMatch(STALE);

    await auth.selectAccount('b@contoso.com');

    expect((await auth.testLogin()).message).not.toMatch(STALE);
  });

  it('accepts a sign-in another process overwrote with a live token', async () => {
    // Last-writer-wins across processes, not locked (issue #545): a sibling mid-refresh
    // rotates the same credential right after this save. Disk no longer holds our token but
    // what it does hold is live, so the sign-in is not lost
    const auth = createAuth(
      storageReturning([['RT-FROM-MAY'], ['RT-ROTATED-BY-SIBLING']]),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).resolves.toBe('fresh-access-token');
  });

  it('still fails when a sibling only pruned a duplicate', async () => {
    // The on-disk set changed - one of two tokens is gone - but nothing was written, and
    // the survivor may be the stale one. Set inequality alone would wave this through.
    const auth = createAuth(
      storageReturning([['RT-FROM-MAY', 'RT-FROM-AUGUST'], ['RT-FROM-AUGUST']]),
      inMemory(['RT-FROM-MAY', 'RT-FROM-AUGUST', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(STALE);
  });

  it('reports the failure when no account was ever explicitly selected', async () => {
    // A's write was swallowed so A is not in the cache; B is, from earlier. And
    // assertLoginPersisted runs before the auto-select, so nothing is selected - resolving
    // "the current account" lands on B and pronounces it healthy
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ displayName: 'Account B', userPrincipalName: 'b@contoso.com' })
      )
    );
    const auth = createAuth(
      storageHolding(['RT-B'], otherAccount.homeAccountId),
      inMemory(['RT-A-JUST-ISSUED']),
      [otherAccount],
      account,
      'token-for-b'
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(STALE);
    expect(auth.getSelectedAccountId()).toBeNull();

    expect((await auth.testLogin()).message).toMatch(STALE);
  });

  it('still fails when the cache is byte-for-byte what it was before the sign-in', async () => {
    // Same shape as above, minus the sibling: nothing wrote, so nothing changed.
    const auth = createAuth(
      storageReturning([['RT-FROM-MAY'], ['RT-FROM-MAY']]),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED'])
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(STALE);
  });

  it('keeps reporting the failure when an unrelated account is removed', async () => {
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED']),
      [account, otherAccount]
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow();
    await expect(auth.removeAccount('b@contoso.com')).resolves.toBe(true);

    expect((await auth.testLogin()).message).toMatch(STALE);
  });

  it('keeps reporting the failure when the failing account is the one selected', async () => {
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED']),
      [account, otherAccount]
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow();
    await auth.selectAccount('a@contoso.com');

    expect((await auth.testLogin()).message).toMatch(STALE);
  });

  it('does not answer for one account while another is the one being verified', async () => {
    // Account A is selected and fine; the sign-in that failed was for B. Verifying must
    // test A rather than short-circuit on B's failure.
    const auth = createAuth(
      storageHolding(['RT-B-FROM-MAY'], otherAccount.homeAccountId),
      inMemory(['RT-B-FROM-MAY', 'RT-B-JUST-ISSUED'], otherAccount.homeAccountId),
      [account, otherAccount],
      otherAccount
    );
    await auth.selectAccount('a@contoso.com');

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow(STALE);

    // Reaches the real token path for A instead, which the stub has no answer for.
    expect((await auth.testLogin()).message).toMatch(/Silent token acquisition failed/);
  });

  it('stops reporting the failure once the account is removed', async () => {
    // A failed sign-in never reached the auto-select, so its account is not the selected
    // one - the clear cannot be conditional on that
    const auth = createAuth(
      storageHolding(['RT-FROM-MAY']),
      inMemory(['RT-FROM-MAY', 'RT-JUST-ISSUED']),
      [account, otherAccount]
    );

    await expect(auth.acquireTokenByDeviceCode()).rejects.toThrow();
    expect(auth.getSelectedAccountId()).toBeNull();
    expect((await auth.testLogin()).message).toMatch(STALE);

    await expect(auth.removeAccount('a@contoso.com')).resolves.toBe(true);

    expect((await auth.testLogin()).message).not.toMatch(STALE);
  });
});

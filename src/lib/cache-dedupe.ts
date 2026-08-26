/**
 * Collapse duplicate refresh tokens in a serialized MSAL cache.
 *
 * MSAL matches a cached refresh token to an account by environment *alias*, so entries
 * under `login.microsoftonline.com` and `login.windows.net` both answer for the same
 * account. `CacheManager.getRefreshToken` then returns whichever comes first in key
 * order, with no recency tie-break and no error, so a leftover entry from an earlier
 * environment wins every refresh - permanently. Nothing prunes the loser either: the
 * cache plugin reloads the file before each access, and MSAL's merge only drops keys the
 * in-memory state has lost, which is the same file it just read. A fresh login writes a
 * new token, the old one keeps being spent, and the account dies for good once that one
 * crosses Entra's 90-day inactivity limit (issue #648).
 *
 * The survivor is the entry in whatever environment MSAL last wrote under *for that same
 * credential owner*, ranked by `cached_at` on that owner's access tokens - the only dated
 * signal in the cache. Account entities are deliberately not a fallback: no recency, no
 * link to the last rotation, so ranking by them is a guess, and a wrong guess here is
 * invisible - the user is signed out, signs back in, and never reports it. So anything
 * that doesn't point at exactly one winner is left exactly as it is. A duplicate left
 * alone is no worse off than it already was.
 */

interface SerializedEntity {
  home_account_id?: string;
  environment?: string;
  client_id?: string;
  family_id?: string;
  cached_at?: string;
  secret?: string;
  /** All three take part in MSAL's credential key, so all three must reach the resolver. */
  realm?: string;
  target?: string;
  token_type?: string;
}

type EntityDict = Record<string, SerializedEntity>;

interface SerializedCache {
  Account?: unknown;
  AccessToken?: unknown;
  RefreshToken?: unknown;
}

export interface DroppedRefreshToken {
  /** Removing it from the blob is not enough on its own - see dropFromKVStore in auth.ts. */
  key: string;
  environment: string;
  keptEnvironment: string;
}

export interface RefreshTokenDedupe {
  data: string;
  dropped: DroppedRefreshToken[];
  /** Groups holding several tokens that no signal could rank. Left untouched. */
  ambiguous: number;
  /**
   * home_account_ids owning those groups - one account can own several. Warning about a
   * cache is one thing, telling a *particular* account to log out is another.
   */
  ambiguousAccounts: string[];
}

interface EnvironmentChoice {
  environment: string;
  cachedAt: number;
  /** Two environments stamped at the same instant, which ranks neither. */
  tied: boolean;
}

/** Keyed `${home_account_id} ${client_id}`: where that one client last wrote. */
type EnvironmentPreferences = Map<string, EnvironmentChoice>;

/** A refresh token group: every entry MSAL would consider interchangeable. */
interface RefreshTokenGroup {
  homeAccountId: string;
  /** family_id for a FOCI token, otherwise client_id. */
  owner: string;
  keys: string[];
}

function isDict(value: unknown): value is EntityDict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrows to the entity itself, where isDict would resolve fields through the dict's index. */
function isEntity(value: unknown): value is SerializedEntity {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function groupKey(homeAccountId: string, owner: string): string {
  return `${homeAccountId} ${owner}`;
}

/**
 * Where MSAL last wrote, per credential owner. An access token's `cached_at` is the only
 * timestamp in the cache - refresh token entities carry none - so it is what tells current
 * from stale. Access tokens are always per-client, so they are collected per-client too:
 * ranking one client's refresh tokens by another client's access tokens would happily
 * delete a token that is still the live one for its own client.
 */
function environmentPreferences(cache: SerializedCache): EnvironmentPreferences {
  const byOwner = new Map<string, EnvironmentChoice>();
  if (isDict(cache.AccessToken)) {
    for (const entity of Object.values(cache.AccessToken)) {
      const home = entity?.home_account_id;
      const environment = entity?.environment;
      const client = entity?.client_id;
      if (!home || !environment || !client) continue;
      const cachedAt = Number(entity.cached_at);
      if (!Number.isFinite(cachedAt)) continue;

      const key = groupKey(home, client);
      const best = byOwner.get(key);
      if (!best || cachedAt > best.cachedAt) {
        byOwner.set(key, { environment, cachedAt, tied: false });
      } else if (cachedAt === best.cachedAt && environment !== best.environment) {
        best.tied = true;
      }
    }
  }

  return byOwner;
}

function preferredEnvironment(
  preferences: EnvironmentPreferences,
  group: RefreshTokenGroup
): string | undefined {
  const choice = preferences.get(groupKey(group.homeAccountId, group.owner));
  // No dated signal (family token, or the access tokens are gone), or a tie, which says
  // just as little. Both leave the group alone - there is deliberately no fallback
  if (!choice || choice.tied) return undefined;
  return choice.environment;
}

/** The key MSAL would write for an entity now, or undefined. The caller owns MSAL, not us. */
export type CanonicalKeyFor = (entity: SerializedEntity) => string | undefined;

/**
 * Collapse entries that are the same credential written under two different MSAL key
 * formats.
 *
 * MSAL's credential key changed shape across majors: msal-node 3.x wrote
 * `<home>-<env>-refreshtoken-<client>----`, 5.x writes one dash fewer. An upgrade leaves
 * the old entry behind, MSAL still matches it (the filter tests fields, not key shape),
 * and `getRefreshToken` returns whichever comes first - so every login after that writes a
 * token the account never gets to use. Same dead end as the environment aliases below, and
 * the environment ranking is blind to it since both entries share an environment.
 *
 * The key format is the recency signal: identical fields resolve to one canonical key, so
 * whoever is stored *at* it is what today's MSAL wrote and the rest are leftovers. Nothing
 * goes unless that occupant is really there - a lone old-format entry is the only copy of
 * a working credential, and MSAL reads it fine.
 */
function dropSupersededKeyFormats(
  refreshTokens: EntityDict,
  canonicalKeyFor: CanonicalKeyFor
): DroppedRefreshToken[] {
  const byCanonical = new Map<string, string[]>();
  for (const [key, entity] of Object.entries(refreshTokens)) {
    if (!isEntity(entity)) continue;
    const canonical = canonicalKeyFor(entity);
    if (!canonical) continue;
    byCanonical.set(canonical, [...(byCanonical.get(canonical) ?? []), key]);
  }

  const dropped: DroppedRefreshToken[] = [];
  for (const [canonical, keys] of byCanonical) {
    if (keys.length < 2 || !keys.includes(canonical)) continue;
    for (const key of keys) {
      if (key === canonical) continue;
      dropped.push({
        key,
        environment: refreshTokens[key]?.environment ?? 'unknown',
        keptEnvironment: refreshTokens[canonical]?.environment ?? 'unknown',
      });
    }
  }
  return dropped;
}

export function dedupeRefreshTokens(
  cacheJson: string,
  canonicalKeyFor?: CanonicalKeyFor
): RefreshTokenDedupe {
  const unchanged: RefreshTokenDedupe = {
    data: cacheJson,
    dropped: [],
    ambiguous: 0,
    ambiguousAccounts: [],
  };

  let cache: SerializedCache;
  try {
    const parsed: unknown = JSON.parse(cacheJson);
    if (!isDict(parsed)) return unchanged;
    cache = parsed as SerializedCache;
  } catch {
    return unchanged;
  }

  const refreshTokens = cache.RefreshToken;
  if (!isDict(refreshTokens)) return unchanged;

  // First, because a superseded key format is a fact about the entry, not a guess about
  // which credential is newer. Leaves the ranking below less to guess at
  const supersededDrops = canonicalKeyFor
    ? dropSupersededKeyFormats(refreshTokens, canonicalKeyFor)
    : [];
  for (const drop of supersededDrops) delete refreshTokens[drop.key];

  // A family (FOCI) token and an app-specific one are separate credentials that MSAL
  // looks up separately, so they group apart rather than competing.
  const groups = new Map<string, RefreshTokenGroup>();
  for (const [key, entity] of Object.entries(refreshTokens)) {
    if (!isEntity(entity)) continue;
    const home = entity.home_account_id;
    const owner = entity.family_id || entity.client_id;
    if (!home || !owner) continue;
    const group = groups.get(groupKey(home, owner));
    if (group) group.keys.push(key);
    else groups.set(groupKey(home, owner), { homeAccountId: home, owner, keys: [key] });
  }

  // Duplicates are the rare case, so nothing walks the access tokens - the bulk of a real
  // cache - until there is a group that actually needs ranking.
  const duplicated = [...groups.values()].filter((group) => group.keys.length > 1);
  if (duplicated.length === 0) {
    return supersededDrops.length > 0
      ? {
          data: JSON.stringify(cache),
          dropped: supersededDrops,
          ambiguous: 0,
          ambiguousAccounts: [],
        }
      : unchanged;
  }

  const preferences = environmentPreferences(cache);
  const dropped: DroppedRefreshToken[] = [...supersededDrops];
  let ambiguous = 0;
  const ambiguousAccounts = new Set<string>();

  for (const group of duplicated) {
    const keep = preferredEnvironment(preferences, group);
    const winners = keep
      ? group.keys.filter((key) => refreshTokens[key]?.environment === keep)
      : [];
    if (!keep || winners.length !== 1) {
      ambiguous += 1;
      ambiguousAccounts.add(group.homeAccountId);
      continue;
    }

    for (const key of group.keys) {
      if (key === winners[0]) continue;
      dropped.push({
        key,
        environment: refreshTokens[key]?.environment ?? 'unknown',
        keptEnvironment: keep,
      });
    }
  }

  const unranked = [...ambiguousAccounts];
  if (dropped.length === 0) {
    return { data: cacheJson, dropped, ambiguous, ambiguousAccounts: unranked };
  }

  for (const drop of dropped) delete refreshTokens[drop.key];
  return { data: JSON.stringify(cache), dropped, ambiguous, ambiguousAccounts: unranked };
}

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
 * credential owner*. Access tokens carry `cached_at` and a `client_id`, so the newest one
 * belonging to the owner names it; a family (FOCI) refresh token is shared across clients
 * and has no single owner's access tokens to rank it, so it falls back to the account
 * entities. Deleting a live credential costs a re-login, so every case that does not point
 * at exactly one winner - no signal, two environments stamped at the same instant, a
 * preferred environment matching no entry - leaves the group exactly as it is. A duplicate
 * left alone is no worse off than it already was.
 */

interface SerializedEntity {
  home_account_id?: string;
  environment?: string;
  client_id?: string;
  family_id?: string;
  cached_at?: string;
  secret?: string;
}

type EntityDict = Record<string, SerializedEntity>;

interface SerializedCache {
  Account?: unknown;
  AccessToken?: unknown;
  RefreshToken?: unknown;
}

export interface DroppedRefreshToken {
  environment: string;
  keptEnvironment: string;
}

export interface RefreshTokenDedupe {
  data: string;
  dropped: DroppedRefreshToken[];
  /** Groups holding several tokens that no signal could rank. Left untouched. */
  ambiguous: number;
}

interface EnvironmentChoice {
  environment: string;
  cachedAt: number;
  /** Two environments stamped at the same instant, which ranks neither. */
  tied: boolean;
}

interface EnvironmentPreferences {
  /** Keyed `${home_account_id} ${client_id}`: where that one client last wrote. */
  byOwner: Map<string, EnvironmentChoice>;
  /** Keyed home_account_id, and only where the account entities agree on one environment. */
  byAccount: Map<string, string>;
}

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

  // Accounts are rewritten on every login, so their environment is a decent second
  // opinion - but only where the account itself was not left duplicated across aliases.
  const byAccount = new Map<string, string>();
  if (isDict(cache.Account)) {
    const seen = new Map<string, Set<string>>();
    for (const entity of Object.values(cache.Account)) {
      const home = entity?.home_account_id;
      const environment = entity?.environment;
      if (!home || !environment) continue;
      let environments = seen.get(home);
      if (!environments) seen.set(home, (environments = new Set()));
      environments.add(environment);
    }
    for (const [home, environments] of seen) {
      const only = [...environments][0];
      if (environments.size === 1 && only) byAccount.set(home, only);
    }
  }

  return { byOwner, byAccount };
}

function preferredEnvironment(
  preferences: EnvironmentPreferences,
  group: RefreshTokenGroup
): string | undefined {
  const choice = preferences.byOwner.get(groupKey(group.homeAccountId, group.owner));
  if (choice && !choice.tied) return choice.environment;
  // Nothing owner-specific: either a family token, a client with no access tokens left,
  // or a tie. The account entities are the only account-wide signal remaining.
  return preferences.byAccount.get(group.homeAccountId);
}

export function dedupeRefreshTokens(cacheJson: string): RefreshTokenDedupe {
  const unchanged: RefreshTokenDedupe = { data: cacheJson, dropped: [], ambiguous: 0 };

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
  if (duplicated.length === 0) return unchanged;

  const preferences = environmentPreferences(cache);
  const dropped: DroppedRefreshToken[] = [];
  const remove: string[] = [];
  let ambiguous = 0;

  for (const group of duplicated) {
    const keep = preferredEnvironment(preferences, group);
    const winners = keep
      ? group.keys.filter((key) => refreshTokens[key]?.environment === keep)
      : [];
    if (!keep || winners.length !== 1) {
      ambiguous += 1;
      continue;
    }

    for (const key of group.keys) {
      if (key === winners[0]) continue;
      remove.push(key);
      dropped.push({
        environment: refreshTokens[key]?.environment ?? 'unknown',
        keptEnvironment: keep,
      });
    }
  }

  if (remove.length === 0) return { data: cacheJson, dropped, ambiguous };

  for (const key of remove) delete refreshTokens[key];
  return { data: JSON.stringify(cache), dropped, ambiguous };
}

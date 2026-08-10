import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs, { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decryptCache,
  encodeCacheKey,
  encryptCache,
  generateCacheKey,
  isEncryptedCache,
  parseCacheKey,
} from './lib/cache-encryption.js';
import { getConfigDir } from './lib/config-paths.js';
import logger from './logger.js';

export type TokenCacheStorageKey = 'token-cache' | 'selected-account';

export interface TokenCacheStorage {
  readonly description: string;
  readonly failClosed: boolean;
  load(key: TokenCacheStorageKey): Promise<string | undefined>;
  save(key: TokenCacheStorageKey, value: string): Promise<void>;
  delete(key: TokenCacheStorageKey): Promise<void>;
}

interface CreateTokenCacheStorageOptions {
  allowCommandStorage?: boolean;
  logProvider?: boolean;
}

type SpawnCommand = (
  command: string,
  args: string[],
  options: { stdio: 'pipe'; shell: false }
) => ChildProcessWithoutNullStreams;

const SERVICE_NAME = 'ms-365-mcp-server';
const TOKEN_CACHE_ACCOUNT = 'msal-token-cache';
const SELECTED_ACCOUNT_KEY = 'selected-account';
const AUTH_CACHE_COMMAND_ENV = 'MS365_MCP_AUTH_CACHE_COMMAND';
const AUTH_CACHE_COMMAND_TIMEOUT_ENV = 'MS365_MCP_AUTH_CACHE_COMMAND_TIMEOUT_MS';
const DEFAULT_AUTH_CACHE_COMMAND_TIMEOUT_MS = 10_000;
const STDERR_LIMIT = 2048;
const COMMAND_KILL_GRACE_MS = 1000;

const CACHE_KEY_ACCOUNT = 'cache-key';
const TOKEN_CACHE_FILE = '.token-cache.json';
const SELECTED_ACCOUNT_FILE = '.selected-account.json';
const CACHE_KEY_FILE = '.cache-key';

// Where the cache used to live: inside the installed package. Kept only so an upgrade
// can move the file out instead of silently forcing a fresh device-code login.
const __filename = fileURLToPath(import.meta.url);
const LEGACY_DIR = path.join(path.dirname(__filename), '..');

let keytar: typeof import('keytar') | null | undefined = null;

async function getKeytar() {
  if (keytar === undefined) {
    return null;
  }
  if (keytar === null) {
    try {
      // Normalize ESM/CJS interop: under Node 24+ `await import('keytar')` returns a
      // namespace object whose top-level `setPassword` is undefined (functions live on
      // `.default`). On older Node and pure CJS, methods live on the namespace itself.
      // Falling back to the namespace keeps backward compatibility. See issue #418.
      const mod = (await import('keytar')) as typeof import('keytar') & {
        default?: typeof import('keytar');
      };
      keytar = mod.default ?? mod;
      return keytar;
    } catch {
      logger.info('keytar not available, using file-based credential storage');
      keytar = undefined;
      return null;
    }
  }
  return keytar;
}

export function wrapCache(data: string): string {
  return JSON.stringify({ _cacheEnvelope: true, data, savedAt: Date.now() });
}

export function unwrapCache(raw: string): { data: string; savedAt?: number } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed._cacheEnvelope && typeof parsed.data === 'string') {
      return { data: parsed.data, savedAt: parsed.savedAt };
    }
  } catch {
    // not our envelope format
  }
  return { data: raw };
}

export function pickNewest(
  keytarRaw: string | undefined,
  fileRaw: string | undefined
): string | undefined {
  const newest = pickNewestRaw(keytarRaw, fileRaw);
  return newest ? unwrapCache(newest).data : undefined;
}

function pickNewestRaw(
  keytarRaw: string | undefined,
  fileRaw: string | undefined
): string | undefined {
  if (!keytarRaw && !fileRaw) return undefined;
  if (keytarRaw && !fileRaw) return keytarRaw;
  if (!keytarRaw && fileRaw) return fileRaw;

  const kt = unwrapCache(keytarRaw!);
  const file = unwrapCache(fileRaw!);

  if (kt.savedAt === undefined && file.savedAt === undefined) return keytarRaw;
  if (kt.savedAt !== undefined && file.savedAt === undefined) return keytarRaw;
  if (kt.savedAt === undefined && file.savedAt !== undefined) return fileRaw;
  return kt.savedAt! >= file.savedAt! ? keytarRaw : fileRaw;
}

export function getTokenCachePath(): string {
  const envPath = process.env.MS365_MCP_TOKEN_CACHE_PATH?.trim();
  return envPath || path.join(getConfigDir(), TOKEN_CACHE_FILE);
}

export function getSelectedAccountPath(): string {
  const envPath = process.env.MS365_MCP_SELECTED_ACCOUNT_PATH?.trim();
  return envPath || path.join(getConfigDir(), SELECTED_ACCOUNT_FILE);
}

/** Key file sits beside the token cache, so a custom cache path takes it along. */
export function getCacheKeyPath(): string {
  return path.join(path.dirname(getTokenCachePath()), CACHE_KEY_FILE);
}

let legacyPathsMigrated = false;

/**
 * Move a cache left in the package directory on first use. Skipped for any key the
 * caller has pointed elsewhere with an env var, and never overwrites a file that
 * already exists at the new location.
 */
function migrateLegacyPaths(): void {
  if (legacyPathsMigrated) return;
  legacyPathsMigrated = true;
  migrateLegacyPathsFrom(LEGACY_DIR);
}

/**
 * Deliberately only the directory we are running from.
 *
 * An earlier attempt also scanned sibling `_npx/<hash>` trees, since a version bump
 * leaves the old cache in the tree npx no longer uses. Nothing about a sibling proves
 * this package wrote it: any npx'd package that merely depends on us produces the same
 * subpath, so a planted `.token-cache.json` would have been adopted as the user's own
 * account. That is the shape of GHSA-9w34-3f56-vwmh, and one saved sign-in is not worth
 * reopening it. An npx user who bumps versions signs in again.
 */
export function migrateLegacyPathsFrom(legacyDir: string): void {
  const moves: Array<[string, string, string | undefined]> = [
    [TOKEN_CACHE_FILE, getTokenCachePath(), process.env.MS365_MCP_TOKEN_CACHE_PATH?.trim()],
    [
      SELECTED_ACCOUNT_FILE,
      getSelectedAccountPath(),
      process.env.MS365_MCP_SELECTED_ACCOUNT_PATH?.trim(),
    ],
  ];

  for (const [fileName, target, envOverride] of moves) {
    if (envOverride || existsSync(target)) continue;
    const legacyPath = path.join(legacyDir, fileName);
    if (!existsSync(legacyPath) || existsSync(`${legacyPath}.migrated`)) continue;

    let moved = false;
    try {
      ensureParentDir(target);
      fs.renameSync(legacyPath, target);
      moved = true;
    } catch {
      // EXDEV across devices, or a read-only package dir. Copy, then best-effort unlink.
      try {
        ensureParentDir(target);
        fs.copyFileSync(legacyPath, target);
        moved = true;
        try {
          fs.unlinkSync(legacyPath);
        } catch {
          // The legacy copy outlives us. Leave a marker so a later run does not migrate
          // it a second time and resurrect a session the user has since logged out of.
          logger.warn(`Copied auth cache to ${target} but could not remove ${legacyPath}`);
          try {
            fs.writeFileSync(`${legacyPath}.migrated`, '', { mode: 0o600 });
          } catch {
            // Nothing else to try; worst case is one repeated migration.
          }
        }
      } catch (copyError) {
        // The copy error, not the rename one: reporting "cross-device link" when the
        // copy failed EACCES points the operator at the wrong thing.
        logger.warn(
          `Could not migrate auth cache ${fileName} to ${target}: ${(copyError as Error).message}`
        );
      }
    }
    if (!moved) continue;

    // Outside the move: rename keeps the source mode, and a cache from an old enough
    // release predates permission hardening. Kept separate so a failing chmod cannot
    // send an already-moved file down the copy fallback and report a bogus failure.
    if (tightenPermissions(target)) {
      logger.info(`Moved auth cache ${fileName} out of the package directory to ${target}`);
    } else {
      logger.error(
        `Moved auth cache ${fileName} to ${target}, but could not make it owner-only. ` +
          'It holds credentials in plaintext until the next save re-encrypts it - ' +
          'restrict it by hand, or delete it and sign in again.'
      );
    }
  }
}

function storageAccountForKey(key: TokenCacheStorageKey): string {
  assertValidKey(key);
  return key === 'token-cache' ? TOKEN_CACHE_ACCOUNT : SELECTED_ACCOUNT_KEY;
}

function filePathForKey(key: TokenCacheStorageKey): string {
  assertValidKey(key);
  return key === 'token-cache' ? getTokenCachePath() : getSelectedAccountPath();
}

function assertValidKey(key: TokenCacheStorageKey): void {
  if (key !== 'token-cache' && key !== 'selected-account') {
    throw new Error(`Unknown auth cache storage key: ${String(key)}`);
  }
}

/**
 * Returns whether the file ended up owner-only.
 *
 * Windows modes are advisory, so a failure there is not interesting. On POSIX it is: the
 * file being moved is a plaintext token cache, and one we cannot restrict has to be
 * reported as such rather than folded into a success message.
 */
function tightenPermissions(filePath: string): boolean {
  try {
    fs.chmodSync(filePath, 0o600);
    return true;
  } catch (error) {
    logger.warn(`Could not restrict permissions on ${filePath}: ${(error as Error).message}`);
    return process.platform === 'win32';
  }
}

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function writeFileAtomically(filePath: string, value: string): void {
  ensureParentDir(filePath);
  const tempPath = tempPathFor(filePath);
  fs.writeFileSync(tempPath, value, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

interface CacheKeyState {
  /** Every key that might decrypt an existing cache. */
  keys: Buffer[];
  /** Where the key file's key sits in `keys`, when there is one. */
  fileKeyIndex?: number;
  /**
   * Whether a new key may be written to the keychain. False when there is no keychain at
   * all, and false when reading it failed - storing one then would overwrite a key we
   * merely could not read.
   */
  canUseKeychain: boolean;
}

// Both memoize the in-flight promise rather than the resolved value: several MSAL cache
// accesses can be in flight at once (see the plugin in auth.ts), and caching only the
// result lets two of them race past the check and mint competing keys.
let keyStatePromise: Promise<CacheKeyState> | undefined;
let encryptionKeyPromise: Promise<Buffer> | undefined;

// Keys whose pre-encryption keychain entry we actually saw, so the cleanup on save is a
// one-shot rather than a keychain round-trip on every token refresh.
const legacyKeytarEntries = new Set<TokenCacheStorageKey>();

// Log noise only: which keys have already had the "not persisting" warning. Whether a
// cache may be overwritten is decided by reading it, never from state kept here - a
// stale entry costs a missing log line, not a cache.
const warnedUndecryptable = new Set<TokenCacheStorageKey>();

/** Test seam: all of this is memoized for the process lifetime. */
export function resetCacheKeyForTests(): void {
  keyStatePromise = undefined;
  encryptionKeyPromise = undefined;
  legacyKeytarEntries.clear();
  warnedUndecryptable.clear();
  legacyPathsMigrated = false;
}

async function clearLegacyKeytarEntry(key: TokenCacheStorageKey): Promise<void> {
  if (!legacyKeytarEntries.delete(key)) return;
  try {
    const kt = await getKeytar();
    if (kt) {
      await kt.deletePassword(SERVICE_NAME, storageAccountForKey(key));
      logger.info(`Removed the pre-encryption keychain entry for ${key}`);
    }
  } catch (error) {
    logger.warn(
      `Could not remove the legacy keychain entry for ${key}: ${(error as Error).message}`
    );
  }
}

/**
 * Every key that could decrypt an existing cache. The keychain is the preferred home; 32
 * bytes fits anywhere, including a Windows credential blob. Where there is no keychain
 * (headless linux, most containers) the key goes in a 0600 file beside the cache. That
 * protects against a stray `cat`, a backup or an accidental commit, not against someone
 * who can already read the file next to it.
 *
 * Both homes are collected rather than the first hit winning. A machine that is
 * sometimes a desktop session and sometimes a container can hold a key in each - a run
 * without a keychain mints a file key for whichever cache does not exist yet - and
 * preferring one would make every run discard the other run's cache. It cannot happen
 * for a cache that is already there: `assertOverwritable` refuses that save long before
 * a key is needed, so the alternation only arises where one side started from nothing.
 *
 * Never mints. A cache that will not decrypt must not cause a replacement key to be
 * written, because the usual reason is a key that could not be read rather than one that
 * does not exist.
 */
function loadKeyState(): Promise<CacheKeyState> {
  if (!keyStatePromise) keyStatePromise = readCacheKeys();
  return keyStatePromise;
}

async function readCacheKeys(): Promise<CacheKeyState> {
  const keys: Buffer[] = [];
  let canUseKeychain = false;

  const kt = await getKeytar();
  if (kt) {
    let stored: string | null = null;
    try {
      stored = await kt.getPassword(SERVICE_NAME, CACHE_KEY_ACCOUNT);
      canUseKeychain = true;
    } catch (error) {
      // Reaching the keychain failed, which is not the same as there being no key. Leave
      // canUseKeychain false so a new key goes to a file instead of overwriting this one.
      logger.warn(`Keychain access failed for the auth cache key: ${(error as Error).message}`);
    }
    if (stored) {
      try {
        keys.push(parseCacheKey(stored));
      } catch (error) {
        logger.warn(
          `Ignoring unusable auth cache key in the keychain: ${(error as Error).message}`
        );
      }
    }
  }

  let fileKeyIndex: number | undefined;
  const keyPath = getCacheKeyPath();
  if (existsSync(keyPath)) {
    try {
      keys.push(parseCacheKey(readFileSync(keyPath, 'utf8')));
      fileKeyIndex = keys.length - 1;
    } catch (error) {
      logger.warn(`Ignoring unusable auth cache key file: ${(error as Error).message}`);
    }
  }

  return { keys, fileKeyIndex, canUseKeychain };
}

/** The key to encrypt with: an existing one if there is any, otherwise a fresh one. */
function getEncryptionKey(): Promise<Buffer> {
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = resolveEncryptionKey().catch((error) => {
      // Don't let one failed write poison every later save in this process: the next
      // one should get a fresh attempt rather than the same rejection forever. The key
      // state goes too, because a mint that stored a key and then failed leaves the
      // memoized state claiming there is none - the retry would mint over it.
      encryptionKeyPromise = undefined;
      keyStatePromise = undefined;
      throw error;
    });
  }
  return encryptionKeyPromise;
}

async function resolveEncryptionKey(): Promise<Buffer> {
  const state = await loadKeyState();

  // The key file wins when both homes hold one. A key file only exists because some run
  // could not use the keychain, and that run will not be able to read a keychain key
  // either - encrypting under the keychain key would lock it out on the next alternation
  // and cost a sign-in every time the environment flips. The file key is the one both
  // sides can read, so it is what keeps them agreeing.
  const preferred = state.keys[state.fileKeyIndex ?? 0];
  if (preferred) return preferred;

  const minted = await persistCacheKey(generateCacheKey(), state.canUseKeychain);
  // Share it with any later load, which may be looking at a cache this key just wrote.
  state.keys.unshift(minted);
  if (state.fileKeyIndex !== undefined) state.fileKeyIndex += 1;
  return minted;
}

/**
 * Store a freshly minted key and return whichever key actually ended up stored. Sibling
 * processes start up together and can each mint one, so both paths read back the winner
 * instead of assuming the write was uncontested.
 */
async function persistCacheKey(key: Buffer, canUseKeychain: boolean): Promise<Buffer> {
  const encoded = encodeCacheKey(key);

  if (canUseKeychain) {
    const kt = await getKeytar();
    if (kt) {
      try {
        await kt.setPassword(SERVICE_NAME, CACHE_KEY_ACCOUNT, encoded);
        const winner = await kt.getPassword(SERVICE_NAME, CACHE_KEY_ACCOUNT);
        if (winner && winner !== encoded) {
          logger.info('Another process stored an auth cache key first, adopting it');
          return parseCacheKey(winner);
        }
        logger.info('Stored a new auth cache key in the system keychain');
        return key;
      } catch (error) {
        logger.warn(`Keychain save failed for the auth cache key: ${(error as Error).message}`);
      }
    }
  }

  const keyPath = getCacheKeyPath();
  if (createFileExclusively(keyPath, encoded)) {
    logger.info(
      `No usable system keychain; auth cache key written to ${keyPath}. ` +
        'Encryption guards against casual disclosure only when the key sits beside the cache.'
    );
    return key;
  }

  try {
    const existing = parseCacheKey(readFileSync(keyPath, 'utf8'));
    logger.info('Another process created the auth cache key file first, adopting it');
    return existing;
  } catch (parseError) {
    // Not a key. Remove it and race for the create again rather than writing over
    // whatever is there now: the earlier readCacheKeys is memoized from startup and says
    // nothing about a file that appeared since, which is what produced this collision.
    // If a sibling wins the retry we adopt theirs, so a valid key is never clobbered.
    logger.warn(
      `Replacing an unusable auth cache key file at ${keyPath}: ${(parseError as Error).message}`
    );
    try {
      fs.unlinkSync(keyPath);
    } catch {
      // Already gone, or a sibling is mid-replace. The create below settles it.
    }
    if (createFileExclusively(keyPath, encoded)) return key;
    return parseCacheKey(readFileSync(keyPath, 'utf8'));
  }
}

/**
 * Create `filePath` only if it does not exist, with its content already in place.
 *
 * `writeFileSync` with `flag: 'wx'` reserves the name and fills it afterwards, so a
 * sibling can read the file while it is still empty. An empty file does not parse as a
 * key, which sent that sibling down the replace path and destroyed the key the winner
 * was about to encrypt under. Linking a fully written temp file publishes name and
 * content in one step, so a reader sees either nothing or a whole key.
 */
function createFileExclusively(filePath: string, contents: string): boolean {
  ensureParentDir(filePath);
  const tempPath = tempPathFor(filePath);

  try {
    fs.writeFileSync(tempPath, contents, { mode: 0o600 });
    fs.linkSync(tempPath, filePath);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'EEXIST') return false;

    // Filesystems without hard links. Reserve-then-fill reopens the window where a
    // sibling reads this file empty, calls it corrupt and replaces it, so read back
    // rather than assuming we still own what we wrote. Returning false sends the caller
    // to adopt whatever is actually on disk, instead of encrypting under a key that is
    // no longer anywhere.
    try {
      fs.writeFileSync(filePath, contents, { mode: 0o600, flag: 'wx' });
      return fs.readFileSync(filePath, 'utf8') === contents;
    } catch (fallbackError) {
      if ((fallbackError as { code?: string }).code === 'EEXIST') return false;
      throw fallbackError;
    }
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Never created, or already linked away. The link, or its absence, is what matters.
    }
  }
}

/**
 * Random rather than pid plus timestamp: containers sharing a bind-mounted config dir
 * have separate pid namespaces, so two of them really can be pid 1 in the same
 * millisecond, and that is exactly when both are minting a key.
 */
function tempPathFor(filePath: string): string {
  return path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomBytes(8).toString('hex')}.tmp`
  );
}

/**
 * What is currently at `cachePath`, established by looking rather than by remembering.
 *
 * An earlier version set a flag during load and consulted it during save. Every failure
 * mode nobody had thought of - an unreadable file, a truncated envelope, a delete that
 * did not happen - skipped the flag and therefore read as "safe to overwrite". Deciding
 * at the moment of the write, from the file itself, has no such default: anything not
 * positively identified is `unreadable`, and `unreadable` is never overwritten.
 */
type CacheFileState =
  | { status: 'absent' }
  | { status: 'plaintext'; raw: string }
  | { status: 'decrypted'; raw: string }
  | { status: 'unreadable'; reason: string };

async function readCacheFile(
  key: TokenCacheStorageKey,
  cachePath: string
): Promise<CacheFileState> {
  let onDisk: string;
  try {
    onDisk = readFileSync(cachePath, 'utf8');
  } catch (error) {
    // No existsSync first: that races, and a failed read is not the same as no file.
    if ((error as { code?: string }).code === 'ENOENT') return { status: 'absent' };
    return { status: 'unreadable', reason: (error as Error).message };
  }

  // Nothing in it to lose, so treat it as free space rather than something to protect.
  if (onDisk === '') return { status: 'absent' };

  if (isEncryptedCache(onDisk)) {
    const { keys } = await loadKeyState();
    const decrypted = decryptWithAnyKey(onDisk, keys, key);
    if (decrypted !== undefined) return { status: 'decrypted', raw: decrypted };

    // Drop the memoized key state so the next attempt re-reads the keychain instead of
    // staying stuck on the key list it saw while the keyring was locked. The encryption
    // key goes with it: keeping it would let a process re-read the keychain, decrypt a
    // sibling's cache under the sibling's key, and then write back under its own stale
    // one - which is stored nowhere, so from then on nobody can read the file and the
    // refusal below makes that permanent.
    keyStatePromise = undefined;
    encryptionKeyPromise = undefined;
    return { status: 'unreadable', reason: 'no known key opens it' };
  }

  // Plaintext has to be positively identified. A truncated or corrupt ciphertext also
  // fails isEncryptedCache, and calling that plaintext both feeds garbage to MSAL and
  // marks a damaged cache as safe to overwrite. Every genuine legacy format is JSON:
  // a v1 _cacheEnvelope, or the raw MSAL cache object that predates it.
  if (isPlainCacheJson(onDisk)) return { status: 'plaintext', raw: onDisk };
  return { status: 'unreadable', reason: 'not a recognisable auth cache' };
}

function isPlainCacheJson(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object';
  } catch {
    return false;
  }
}

/** Try every candidate key; undefined when none of them opens the envelope. */
function decryptWithAnyKey(raw: string, keys: Buffer[], purpose: string): string | undefined {
  for (const key of keys) {
    try {
      return decryptCache(raw, key, purpose);
    } catch {
      // Wrong key for this envelope, try the next one.
    }
  }
  return undefined;
}

/**
 * Refuse to write over a cache this run could not decrypt.
 *
 * Leaving the file alone during load is not enough on its own: the sign-in that follows
 * a failed load calls save() against the same path. The usual cause is a key that was
 * unreadable this run rather than gone, and the cache may hold more accounts than the
 * one just signed back in, so overwriting is the destructive move.
 *
 * Nothing is copied aside. A backup file has to be named, cleaned up, kept from
 * clobbering the previous one and deleted on logout, and every one of those is a way to
 * lose the thing it was protecting. Not writing is the version with no moving parts.
 */
async function assertOverwritable(key: TokenCacheStorageKey, cachePath: string): Promise<void> {
  const state = await readCacheFile(key, cachePath);
  if (state.status !== 'unreadable') {
    warnedUndecryptable.delete(key);
    return;
  }

  if (!warnedUndecryptable.has(key)) {
    warnedUndecryptable.add(key);
    logger.warn(
      `Not persisting ${key}: ${cachePath} cannot be read back (${state.reason}), and ` +
        'overwriting it would discard whatever it holds. A locked keychain usually reads ' +
        `fine on the next start. If it never does, delete ${cachePath} to start over.`
    );
  }
  throw new Error(`Refusing to overwrite the unreadable auth cache at ${cachePath}`);
}

export class DefaultTokenCacheStorage implements TokenCacheStorage {
  readonly description = 'default (encrypted file)';
  readonly failClosed = false;

  async load(key: TokenCacheStorageKey): Promise<string | undefined> {
    assertValidKey(key);
    migrateLegacyPaths();

    // Pre-encryption releases put the cache itself in the keychain. Read it once more so
    // an upgrade doesn't log the user out; save() clears it.
    let keytarRaw: string | undefined;
    try {
      const kt = await getKeytar();
      if (kt) {
        keytarRaw = (await kt.getPassword(SERVICE_NAME, storageAccountForKey(key))) ?? undefined;
        if (keytarRaw) legacyKeytarEntries.add(key);
      }
    } catch (error) {
      logger.warn(`Keychain access failed for ${key}: ${(error as Error).message}`);
    }

    const cachePath = filePathForKey(key);
    const state = await readCacheFile(key, cachePath);
    let fileRaw: string | undefined;
    if (state.status === 'decrypted' || state.status === 'plaintext') {
      // plaintext is pre-encryption; save() re-encrypts it
      fileRaw = state.raw;
    } else if (state.status === 'unreadable') {
      // Left exactly as it is. The usual cause is a key we could not read this run - a
      // locked keyring, a denied prompt - and the next run may read it fine. save()
      // re-checks and refuses rather than writing over it.
      logger.warn(
        `Could not read ${key} back (${state.reason}); leaving it in place and re-authenticating`
      );
    }

    return pickNewestRaw(keytarRaw, fileRaw);
  }

  async save(key: TokenCacheStorageKey, value: string): Promise<void> {
    assertValidKey(key);
    migrateLegacyPaths();

    const cachePath = filePathForKey(key);
    // Checked first so an unreadable cache costs nothing, then again immediately before
    // the write - resolving the key can prompt a keychain, which is time enough for the
    // file to change. Encryption is synchronous, so nothing moves after the second check.
    await assertOverwritable(key, cachePath);
    const encryptionKey = await getEncryptionKey();
    await assertOverwritable(key, cachePath);

    writeFileAtomically(cachePath, encryptCache(value, encryptionKey, key));
    await clearLegacyKeytarEntry(key);
  }

  async delete(key: TokenCacheStorageKey): Promise<void> {
    assertValidKey(key);
    try {
      const kt = await getKeytar();
      if (kt) {
        await kt.deletePassword(SERVICE_NAME, storageAccountForKey(key));
      }
    } catch (error) {
      logger.warn(`Keychain deletion failed for ${key}: ${(error as Error).message}`);
    }

    const cachePath = filePathForKey(key);
    try {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } catch (error) {
      logger.warn(`File deletion failed for ${key}: ${(error as Error).message}`);
    }
  }
}

interface CommandResult {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export class CommandTokenCacheStorage implements TokenCacheStorage {
  readonly description: string;
  readonly failClosed = true;

  constructor(
    private readonly commandPath: string,
    private readonly timeoutMs: number = DEFAULT_AUTH_CACHE_COMMAND_TIMEOUT_MS,
    private readonly spawnCommand: SpawnCommand = spawn
  ) {
    this.description = `command (${path.basename(commandPath)})`;
  }

  async load(key: TokenCacheStorageKey): Promise<string | undefined> {
    assertValidKey(key);
    const result = await this.invoke('load', key);
    const trimmed = result.stdout.trim();
    if (trimmed === '') {
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`Auth cache command returned invalid JSON for load ${key}.`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Auth cache command returned invalid JSON shape for load ${key}.`);
    }

    const response = parsed as { found?: unknown; value?: unknown };
    if (response.found === false) {
      return undefined;
    }
    if (response.found === true && typeof response.value === 'string') {
      return response.value;
    }

    throw new Error(`Auth cache command returned invalid load response for ${key}.`);
  }

  async save(key: TokenCacheStorageKey, value: string): Promise<void> {
    assertValidKey(key);
    await this.invoke('save', key, JSON.stringify({ value }));
  }

  async delete(key: TokenCacheStorageKey): Promise<void> {
    assertValidKey(key);
    await this.invoke('delete', key);
  }

  private async invoke(
    operation: 'load' | 'save' | 'delete',
    key: TokenCacheStorageKey,
    stdinPayload?: string
  ): Promise<CommandResult> {
    let result: CommandResult;
    try {
      result = await runCommand(
        this.commandPath,
        [operation, key],
        stdinPayload,
        this.timeoutMs,
        this.spawnCommand
      );
    } catch (error) {
      throw new Error(
        `Auth cache command failed for ${operation} ${key}: ${(error as Error).message}`
      );
    }

    if (result.timedOut) {
      throw new Error(`Auth cache command timed out for ${operation} ${key}.`);
    }
    if (result.exitCode !== 0) {
      throw new Error(
        `Auth cache command failed for ${operation} ${key} ` +
          `(exit ${result.exitCode ?? `signal ${result.signal ?? 'unknown'}`})${formatStderr(
            result.stderr
          )}.`
      );
    }

    return result;
  }
}

function formatStderr(stderr: string): string {
  const trimmed = stderr.trim();
  if (!trimmed) {
    return '';
  }
  const truncated =
    trimmed.length > STDERR_LIMIT ? `${trimmed.slice(0, STDERR_LIMIT)}...` : trimmed;
  return `: ${truncated}`;
}

function runCommand(
  commandPath: string,
  args: string[],
  stdinPayload: string | undefined,
  timeoutMs: number,
  spawnCommand: SpawnCommand
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawnCommand(commandPath, args, { stdio: 'pipe', shell: false });
    } catch (error) {
      reject(new Error(`could not be started: ${(error as Error).message}`));
      return;
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => {
        child.kill('SIGKILL');
      }, COMMAND_KILL_GRACE_MS);
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdin.on('error', () => {
      // Early-exiting wrappers may close stdin before consuming the payload; command
      // exit status/stdout/stderr remain the protocol signal.
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      reject(new Error(`could not be started: ${error.message}`));
    });
    child.once('close', (exitCode, signal) => {
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      resolve({ exitCode, signal, stdout, stderr, timedOut });
    });

    if (stdinPayload !== undefined) {
      child.stdin.end(stdinPayload, 'utf8');
    } else {
      child.stdin.end();
    }
  });
}

function parseTimeoutMs(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_AUTH_CACHE_COMMAND_TIMEOUT_MS;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${AUTH_CACHE_COMMAND_TIMEOUT_ENV} must be a positive integer.`);
  }
  return parsed;
}

async function assertCommandUsable(commandPath: string): Promise<void> {
  // A relative path resolves against cwd, which the client picks and the
  // operator may never have looked at. Require an absolute one so the value
  // names a specific executable rather than "whatever is in the current folder".
  if (!path.isAbsolute(commandPath)) {
    throw new Error(`${AUTH_CACHE_COMMAND_ENV} must be an absolute path.`);
  }

  let stats: fs.Stats;
  try {
    stats = await fs.promises.stat(commandPath);
  } catch {
    throw new Error(`${AUTH_CACHE_COMMAND_ENV} points to a path that does not exist.`);
  }

  if (!stats.isFile()) {
    throw new Error(`${AUTH_CACHE_COMMAND_ENV} must point to an executable file.`);
  }

  if (process.platform !== 'win32' && (stats.mode & 0o111) === 0) {
    throw new Error(`${AUTH_CACHE_COMMAND_ENV} must point to an executable file.`);
  }
}

export async function createTokenCacheStorage(
  options: CreateTokenCacheStorageOptions = {}
): Promise<TokenCacheStorage> {
  const allowCommandStorage = options.allowCommandStorage ?? true;
  const configuredCommand = process.env[AUTH_CACHE_COMMAND_ENV];

  let storage: TokenCacheStorage;
  if (allowCommandStorage && configuredCommand !== undefined) {
    const commandPath = configuredCommand.trim();
    if (commandPath === '') {
      throw new Error(`${AUTH_CACHE_COMMAND_ENV} was provided but is empty.`);
    }
    await assertCommandUsable(commandPath);
    storage = new CommandTokenCacheStorage(
      commandPath,
      parseTimeoutMs(process.env[AUTH_CACHE_COMMAND_TIMEOUT_ENV])
    );
  } else {
    storage = new DefaultTokenCacheStorage();
  }

  if (options.logProvider) {
    logger.info(`Auth cache storage provider: ${storage.description}`);
  }

  return storage;
}

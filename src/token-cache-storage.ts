import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TOKEN_CACHE_PATH = path.join(__dirname, '..', '.token-cache.json');
const DEFAULT_SELECTED_ACCOUNT_PATH = path.join(__dirname, '..', '.selected-account.json');
const memoryCache = new Map<string, string>();

export function wrapCache(data: string): string {
  return JSON.stringify({ _cacheEnvelope: true, data, savedAt: Date.now() });
}

export function unwrapCache(raw: string): { data: string; savedAt?: number } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed._cacheEnvelope === true && typeof parsed.data === 'string') {
      return { data: parsed.data, savedAt: parsed.savedAt };
    }
  } catch {
    // Legacy raw cache format.
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
  firstRaw: string | undefined,
  secondRaw: string | undefined
): string | undefined {
  if (!firstRaw && !secondRaw) return undefined;
  if (firstRaw && !secondRaw) return firstRaw;
  if (!firstRaw && secondRaw) return secondRaw;

  const first = unwrapCache(firstRaw!);
  const second = unwrapCache(secondRaw!);
  if (first.savedAt === undefined && second.savedAt === undefined) return firstRaw;
  if (first.savedAt !== undefined && second.savedAt === undefined) return firstRaw;
  if (first.savedAt === undefined && second.savedAt !== undefined) return secondRaw;
  return first.savedAt! >= second.savedAt! ? firstRaw : secondRaw;
}

export function getTokenCachePath(): string {
  return process.env.MS365_MCP_TOKEN_CACHE_PATH?.trim() || DEFAULT_TOKEN_CACHE_PATH;
}

export function getSelectedAccountPath(): string {
  return process.env.MS365_MCP_SELECTED_ACCOUNT_PATH?.trim() || DEFAULT_SELECTED_ACCOUNT_PATH;
}

function assertValidKey(key: TokenCacheStorageKey): void {
  if (key !== 'token-cache' && key !== 'selected-account') {
    throw new Error(`Unknown auth cache storage key: ${String(key)}`);
  }
}

function filePathForKey(key: TokenCacheStorageKey): string {
  assertValidKey(key);
  return key === 'token-cache' ? getTokenCachePath() : getSelectedAccountPath();
}

function readFileIfExists(filePath: string): string | undefined {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
  return undefined;
}

function writeFileSafely(filePath: string, value: string): void {
  if (process.env.VERCEL === '1') {
    memoryCache.set(filePath, value);
    return;
  }

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(filePath, value, { mode: 0o600 });
  } catch {
    memoryCache.set(filePath, value);
  }
}

export class DefaultTokenCacheStorage implements TokenCacheStorage {
  readonly description = 'default (memory+file)';
  readonly failClosed = false;

  async load(key: TokenCacheStorageKey): Promise<string | undefined> {
    const filePath = filePathForKey(key);
    return pickNewestRaw(memoryCache.get(filePath), readFileIfExists(filePath));
  }

  async save(key: TokenCacheStorageKey, value: string): Promise<void> {
    writeFileSafely(filePathForKey(key), value);
  }

  async delete(key: TokenCacheStorageKey): Promise<void> {
    const filePath = filePathForKey(key);
    memoryCache.delete(filePath);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore cache delete failures.
    }
  }
}

export class CommandTokenCacheStorage extends DefaultTokenCacheStorage {
  readonly description = 'command storage disabled fallback';
  readonly failClosed = false;
}

export async function createTokenCacheStorage(
  _options: CreateTokenCacheStorageOptions = {}
): Promise<TokenCacheStorage> {
  return new DefaultTokenCacheStorage();
}

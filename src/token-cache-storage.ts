import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs, { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_DIR = __dirname;
const DEFAULT_TOKEN_CACHE_PATH = path.join(FALLBACK_DIR, '..', '.token-cache.json');
const DEFAULT_SELECTED_ACCOUNT_PATH = path.join(FALLBACK_DIR, '..', '.selected-account.json');

// Memory storage for serverless environments
const memoryCache = new Map<string, string>();

let keytar: any = null;

async function getKeytar() {
  if (process.env.VERCEL === '1') {
    return null;
  }
  if (keytar === undefined) {
    return null;
  }
  if (keytar === null) {
    try {
      // Keep keytar fully optional. A plain dynamic import('keytar') can still be
      // statically resolved by TypeScript/bundlers and break Vercel builds when
      // the native package is intentionally not installed.
      const dynamicImport = new Function('specifier', 'return import(specifier)') as (
        specifier: string
      ) => Promise<any>;
      const mod = await dynamicImport('keytar');
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
  return envPath || DEFAULT_TOKEN_CACHE_PATH;
}

export function getSelectedAccountPath(): string {
  const envPath = process.env.MS365_MCP_SELECTED_ACCOUNT_PATH?.trim();
  return envPath || DEFAULT_SELECTED_ACCOUNT_PATH;
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
    throw new Error(`Unknown auth cache storage key: \${String(key)}`);
  }
}

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch {
    // In serverless environments, this might fail.
  }
}

function writeFileAtomically(filePath: string, value: string): void {
  if (process.env.VERCEL === '1') {
    memoryCache.set(filePath, value);
    return;
  }
  ensureParentDir(filePath);
  const tempPath = path.join(
    path.dirname(filePath),
    \`.\${path.basename(filePath)}.\${process.pid}.\${Date.now()}.tmp\`
  );
  try {
    fs.writeFileSync(tempPath, value, { mode: 0o600 });
    fs.renameSync(tempPath, filePath);
  } catch {
    memoryCache.set(filePath, value);
  }
}

export class DefaultTokenCacheStorage implements TokenCacheStorage {
  readonly description = 'default (keytar+file)';
  readonly failClosed = false;

  async load(key: TokenCacheStorageKey): Promise<string | undefined> {
    assertValidKey(key);

    // Check memory cache first (for serverless)
    const cachePath = filePathForKey(key);
    const memoryRaw = memoryCache.get(cachePath);
    if (memoryRaw) return memoryRaw;

    let keytarRaw: string | undefined;
    try {
      const kt = await getKeytar();
      if (kt) {
        keytarRaw = (await kt.getPassword(SERVICE_NAME, storageAccountForKey(key))) ?? undefined;
      }
    } catch (error) {
      logger.warn(\`Keychain access failed for \${key}: \${(error as Error).message}\`);
    }

    let fileRaw: string | undefined;
    if (existsSync(cachePath)) {
      try {
        fileRaw = readFileSync(cachePath, 'utf8');
      } catch {
        // Ignore unreadable local cache and behave as cache miss.
      }
    }

    return pickNewestRaw(keytarRaw, fileRaw);
  }

  async save(key: TokenCacheStorageKey, value: string): Promise<void> {
    assertValidKey(key);
    try {
      const kt = await getKeytar();
      if (kt) {
        await kt.setPassword(SERVICE_NAME, storageAccountForKey(key), value);
        return;
      }
    } catch (error) {
      logger.warn(
        \`Keychain save failed for \${key}, falling back to file storage: \${(error as Error).message}\`
      );
    }

    writeFileAtomically(filePathForKey(key), value);
  }

  async delete(key: TokenCacheStorageKey): Promise<void> {
    assertValidKey(key);
    memoryCache.delete(filePathForKey(key));
    try {
      const kt = await getKeytar();
      if (kt) {
        await kt.deletePassword(SERVICE_NAME, storageAccountForKey(key));
      }
    } catch (error) {
      logger.warn(\`Keychain deletion failed for \${key}: \${(error as Error).message}\`);
    }

    const cachePath = filePathForKey(key);
    try {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } catch (error) {
      logger.warn(\`File deletion failed for \${key}: \${(error as Error).message}\`);
    }
  }
}

export class CommandTokenCacheStorage implements TokenCacheStorage {
  readonly description: string;
  readonly failClosed = true;

  constructor(
    private readonly commandPath: string,
    private readonly timeoutMs: number = DEFAULT_AUTH_CACHE_COMMAND_TIMEOUT_MS,
    private readonly spawnCommand: SpawnCommand = spawn
  ) {
    this.description = \`command (\${path.basename(commandPath)})\`;
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
      throw new Error(\`Auth cache command returned invalid JSON for load \${key}.\`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error(\`Auth cache command returned invalid JSON shape for load \${key}.\`);
    }

    const response = parsed as { found?: unknown; value?: unknown };
    if (response.found === false) {
      return undefined;
    }
    if (response.found === true && typeof response.value === 'string') {
      return response.value;
    }

    throw new Error(\`Auth cache command returned invalid load response for \${key}.\`);
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
  ): Promise<any> {
    // Stub for command storage in serverless.
    throw new Error('Command storage not supported in serverless');
  }
}

export async function createTokenCacheStorage(
  options: CreateTokenCacheStorageOptions = {}
): Promise<TokenCacheStorage> {
  const allowCommandStorage = options.allowCommandStorage ?? true;
  const configuredCommand = process.env[AUTH_CACHE_COMMAND_ENV];

  let storage: TokenCacheStorage;
  if (allowCommandStorage && configuredCommand !== undefined && process.env.VERCEL !== '1') {
    const commandPath = configuredCommand.trim();
    storage = new CommandTokenCacheStorage(commandPath, DEFAULT_AUTH_CACHE_COMMAND_TIMEOUT_MS);
  } else {
    storage = new DefaultTokenCacheStorage();
  }

  if (options.logProvider) {
    logger.info(\`Auth cache storage provider: \${storage.description}\`);
  }

  return storage;
}

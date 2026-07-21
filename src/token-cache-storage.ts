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
  primaryRaw: string | undefined,
  fileRaw: string | undefined
): string | undefined {
  const newest = pickNewestRaw(primaryRaw, fileRaw);
  return newest ? unwrapCache(newest).data : undefined;
}

function pickNewestRaw(
  primaryRaw: string | undefined,
  fileRaw: string | undefined
): string | undefined {
  if (!primaryRaw && !fileRaw) return undefined;
  if (primaryRaw && !fileRaw) return primaryRaw;
  if (!primaryRaw && fileRaw) return fileRaw;

  const primary = unwrapCache(primaryRaw!);
  const file = unwrapCache(fileRaw!);

  if (primary.savedAt === undefined && file.savedAt === undefined) return primaryRaw;
  if (primary.savedAt !== undefined && file.savedAt === undefined) return primaryRaw;
  if (primary.savedAt === undefined && file.savedAt !== undefined) return fileRaw;
  return primary.savedAt! >= file.savedAt! ? primaryRaw : fileRaw;
}

export function getTokenCachePath(): string {
  const envPath = process.env.MS365_MCP_TOKEN_CACHE_PATH?.trim();
  return envPath || DEFAULT_TOKEN_CACHE_PATH;
}

export function getSelectedAccountPath(): string {
  const envPath = process.env.MS365_MCP_SELECTED_ACCOUNT_PATH?.trim();
  return envPath || DEFAULT_SELECTED_ACCOUNT_PATH;
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

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function writeFileAtomically(filePath: string, value: string): void {
  ensureParentDir(filePath);
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(tempPath, value, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

export class DefaultTokenCacheStorage implements TokenCacheStorage {
  readonly description = 'default (file)';
  readonly failClosed = false;

  async load(key: TokenCacheStorageKey): Promise<string | undefined> {
    assertValidKey(key);
    const cachePath = filePathForKey(key);
    if (existsSync(cachePath)) {
      return readFileSync(cachePath, 'utf8');
    }

    return undefined;
  }

  async save(key: TokenCacheStorageKey, value: string): Promise<void> {
    assertValidKey(key);
    writeFileAtomically(filePathForKey(key), value);
  }

  async delete(key: TokenCacheStorageKey): Promise<void> {
    assertValidKey(key);
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

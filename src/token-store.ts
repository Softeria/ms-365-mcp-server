import fs from 'node:fs';
import path from 'node:path';
import logger from './logger.js';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  updatedAt: number;
}

const tokenMap = new Map<string, StoredTokens>();
let storePath: string | undefined;

export function initTokenStore(dataDir?: string): void {
  if (!dataDir) return;
  storePath = path.join(dataDir, 'token-cache.json');
  try {
    const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    for (const [k, v] of Object.entries(data)) {
      tokenMap.set(k, v as StoredTokens);
    }
    logger.info(`Token store loaded: ${tokenMap.size} sessions`);
  } catch {
    logger.info('Token store: starting fresh');
  }
}

function save(): void {
  if (!storePath) return;
  try {
    const tmp = storePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(tokenMap)));
    fs.renameSync(tmp, storePath);
  } catch (e) {
    logger.error('Token store save failed:', e);
  }
}

/**
 * Derive a stable session key from the refresh token prefix.
 * The first refresh token in a session establishes the key;
 * subsequent rotations update the stored tokens but keep the same key.
 */
function sessionKey(refreshToken: string): string {
  return refreshToken.slice(0, 16);
}

export function storeTokens(
  originalRefreshToken: string,
  accessToken: string,
  refreshToken: string
): void {
  const key = sessionKey(originalRefreshToken);
  tokenMap.set(key, { accessToken, refreshToken, updatedAt: Date.now() });
  // Also index by the new refresh token prefix for future lookups
  const newKey = sessionKey(refreshToken);
  if (newKey !== key) {
    tokenMap.set(newKey, { accessToken, refreshToken, updatedAt: Date.now() });
  }
  save();
  logger.info('Token store: session updated');
}

export function getLatestRefreshToken(refreshToken: string): string {
  const key = sessionKey(refreshToken);
  const stored = tokenMap.get(key);
  if (stored && stored.refreshToken !== refreshToken) {
    logger.info('Token store: returning rotated refresh token');
    return stored.refreshToken;
  }
  return refreshToken;
}

// Cleanup sessions older than 7 days
export function cleanupTokenStore(): void {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [key, value] of tokenMap) {
    if (value.updatedAt < cutoff) {
      tokenMap.delete(key);
    }
  }
  save();
}

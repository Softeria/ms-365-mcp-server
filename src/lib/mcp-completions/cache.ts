import { createHash } from 'node:crypto';
import type { ClientCapabilityProfile } from '../mcp-capabilities/profile.js';

export const COMPLETION_CACHE_TTL_MS = 30_000;

export interface CompletionCacheKeyInput {
  tenantId: string;
  accountId?: string;
  provider: string;
  query: string;
  enabledToolsSet?: ReadonlySet<string>;
  capabilityProfile?: ClientCapabilityProfile;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly values: readonly string[];
}

const cache = new Map<string, CacheEntry>();

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function enabledToolsHash(enabledToolsSet?: ReadonlySet<string>): string {
  if (!enabledToolsSet) return 'none';
  return stableHash([...enabledToolsSet].sort().join('\n'));
}

function capabilityProfileHash(profile?: ClientCapabilityProfile): string {
  if (!profile) return 'none';
  return stableHash(
    JSON.stringify({
      transport: profile.transport,
      surface: profile.surface,
      phase8Enabled: profile.phase8Enabled,
      enabledFeatures: profile.enabledFeatures,
    })
  );
}

export function completionCacheKey(input: CompletionCacheKeyInput): string {
  return [
    input.tenantId,
    input.accountId ?? 'no-account',
    input.provider,
    input.query.trim().toLowerCase(),
    enabledToolsHash(input.enabledToolsSet),
    capabilityProfileHash(input.capabilityProfile),
  ].join('|');
}

export function getCachedCompletionValues(key: string, now = Date.now()): string[] | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return undefined;
  }
  return [...entry.values];
}

export function setCachedCompletionValues(
  key: string,
  values: readonly string[],
  ttlMs = COMPLETION_CACHE_TTL_MS,
  now = Date.now()
): string[] {
  const bounded = values.slice(0, 100);
  cache.set(key, { expiresAt: now + ttlMs, values: bounded });
  return [...bounded];
}

export function clearCompletionCacheForTesting(): void {
  cache.clear();
}

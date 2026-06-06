/**
 * Server-side refresh-token session store (plan 03-07, SECUR-02).
 *
 * Replaces v1's custom-header refresh-token read path (see
 * docs/migration-v1-to-v2.md for the deleted header name + migration notes).
 * Delegated sessions live in Redis under
 * `mcp:session:{tenantId}:{sha256(clientAccessToken)}`, envelope-encrypted
 * with the per-tenant DEK (same DEK the MSAL cache plugin uses — supplied by
 * TenantPool.getDekForTenant or plugin caller).
 *
 * Why sha256(clientAccessToken) as the key? The client-facing MCP bearer is
 * opaque to our server and must stay stable for clients that do not receive a
 * refresh token. Hashing it prevents the session key itself from exposing the
 * bearer in Redis key-listing. Graph-client 401 handling retrieves the matching
 * session and rotates the encrypted graphAccessToken inside the same record.
 *
 * TTL: defaults to 14 days (Entra refresh-token validity window), configurable
 * via `MS365_MCP_SESSION_TTL_SECONDS`. This is the UPPER bound — MSAL will
 * rotate the refresh token inside its cache (03-05), and the session blob is
 * re-written on every /token success.
 *
 * SECUR-02 invariant (test/integration/redis-ciphertext-only.test.ts): the
 * raw Redis value MUST NOT contain the substrings "refresh_token":,
 * "access_token":, or "secret":. Envelope encryption guarantees this —
 * ciphertext is base64-encoded inside a JSON envelope.
 *
 * Threat refs:
 *   - T-03-07-01 (I): header-path removal (see src/lib/microsoft-auth.ts)
 *   - T-03-07-02 (T): envelope AES-GCM auth tag detects tamper
 *   - T-03-07-03 (I): sha256 one-way hash conceals the access token
 *   - T-03-07-04 (E): TTL bounded by Entra refresh-token validity
 */
import { createHash } from 'node:crypto';
import type { RedisClient } from './redis.js';
import { wrapWithDek, unwrapWithDek, type Envelope } from './crypto/envelope.js';
import logger from '../logger.js';

export interface SessionRecord {
  tenantId: string;
  refreshToken?: string;
  accountHomeId?: string;
  msalCache?: string;
  graphAccessToken?: string;
  graphAccessTokenExpiresOn?: string;
  clientId: string;
  scopes: string[];
  tokenScopes?: string[];
  ownerSubject?: string;
  createdAt: number;
}

const DEFAULT_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days — Entra refresh-token validity

/**
 * Stable, deterministic sha256 hex digest of the access token. Used both as
 * the Redis key suffix (so the access token itself never appears in a key
 * listing) and by graph-client.ts's 401 handler to look up the session.
 */
export function hashAccessToken(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex');
}

function resolveTtl(explicit: number | undefined): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const envRaw = process.env.MS365_MCP_SESSION_TTL_SECONDS;
  if (envRaw) {
    const parsed = Number.parseInt(envRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TTL_SECONDS;
}

export class SessionStore {
  constructor(
    private readonly redis: RedisClient,
    private readonly dek: Buffer
  ) {}

  private keyFromHash(tenantId: string, accessTokenHash: string): string {
    return `mcp:session:${tenantId}:${accessTokenHash}`;
  }

  private key(tenantId: string, accessToken: string): string {
    return this.keyFromHash(tenantId, hashAccessToken(accessToken));
  }

  /**
   * Persist a session record keyed by (tenantId, sha256(clientAccessToken)) in
   * Redis as an envelope-encrypted blob. Overwrites any existing entry.
   *
   * **Contract (WR-09):** put() MUST be called with a unique
   * (tenantId, accessToken) tuple for each OAuth completion. Microsoft
   * Graph issues unique tokens, so collisions are unreachable in
   * production; this contract documents the invariant for tests and
   * future callers. Concurrent writes to the same key silently overwrite
   * (SET ... EX, no NX flag) — if the second write carries an older
   * refresh token, the session is silently stale by one rotation.
   * graph-client.ts:refreshSessionAndRetry handles rotation atomically
   * via put-then-delete in the single-replica case; cross-replica
   * concurrency is not an issue because each replica's MSAL cache
   * serializes tokens and SessionStore writes happen after MSAL acquire.
   *
   * @param ttlSeconds optional override; otherwise falls back to
   *   MS365_MCP_SESSION_TTL_SECONDS env var, then DEFAULT_TTL_SECONDS (14d).
   */
  async put(
    tenantId: string,
    accessToken: string,
    record: SessionRecord,
    ttlSeconds?: number
  ): Promise<void> {
    const k = this.key(tenantId, accessToken);
    const plaintext = Buffer.from(JSON.stringify(record), 'utf8');
    const envelope = wrapWithDek(plaintext, this.dek);
    await this.redis.set(k, JSON.stringify(envelope), 'EX', resolveTtl(ttlSeconds));
  }

  /**
   * Look up a session record by (tenantId, accessToken). Returns null when
   * the key is absent or when the envelope fails to decrypt (wrong DEK, KEK
   * rotation mismatch, corrupt ciphertext — all drop the key and warn).
   */
  async get(tenantId: string, accessToken: string): Promise<SessionRecord | null> {
    return this.getByAccessTokenHash(tenantId, hashAccessToken(accessToken));
  }

  /**
   * Look up a session record by an already-computed access-token hash. Used by
   * opaque gateway refresh handles so the refresh index never stores the raw
   * bearer token it points at.
   */
  async getByAccessTokenHash(
    tenantId: string,
    accessTokenHash: string
  ): Promise<SessionRecord | null> {
    const k = this.keyFromHash(tenantId, accessTokenHash);
    const raw = await this.redis.get(k);
    if (!raw) return null;
    try {
      const envelope = JSON.parse(raw) as Envelope;
      const plaintext = unwrapWithDek(envelope, this.dek);
      return JSON.parse(plaintext.toString('utf8')) as SessionRecord;
    } catch (err) {
      logger.warn(
        { tenantId, err: (err as Error).message },
        'session decrypt failed; dropping entry'
      );
      await this.redis.del(k);
      return null;
    }
  }

  /**
   * Remove a session entry. Used when a delegated session is corrupt, expired,
   * revoked, or explicitly invalidated.
   */
  async delete(tenantId: string, accessToken: string): Promise<void> {
    await this.deleteByAccessTokenHash(tenantId, hashAccessToken(accessToken));
  }

  /** Remove a session by an already-computed access-token hash. */
  async deleteByAccessTokenHash(tenantId: string, accessTokenHash: string): Promise<void> {
    await this.redis.del(this.keyFromHash(tenantId, accessTokenHash));
  }
}

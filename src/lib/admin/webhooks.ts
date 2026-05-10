/**
 * Microsoft Graph webhook receiver (plan 04-07, WEBHK-01 + WEBHK-02).
 *
 * Four critical paths per D-16:
 *
 *   0. Per-IP 401 rate limit (first branch, shed cheap).
 *      Counter `mcp:webhook:401:<ip>` via Redis INCR + EXPIRE 60s. When the
 *      counter has already hit MAX_401_PER_MINUTE_PER_IP before this
 *      request, short-circuit with 429 + Retry-After:60 WITHOUT any DB or
 *      decrypt work. Attack traffic sheds at the cheapest possible path.
 *
 *   1. Validation-token handshake (sync echo).
 *      Graph POSTs `?validationToken=X` on subscription creation; we echo X
 *      back within 10s as 200 text/plain, body = decodeURIComponent(X).
 *      PITFALL 1: never wrap in JSON. PITFALL 2: decode before echo
 *      (defensive against double-encoding proxies).
 *
 *   2. Notification receipt with clientState equality.
 *      Body is `{value: [{subscriptionId, changeType, resource, clientState,
 *      subscriptionExpirationDateTime, tenantId}]}`. Look up
 *      subscriptions.client_state (jsonb envelope), decrypt with the tenant
 *      DEK, compare EXACT-byte equality (no normalization — PITFALL 3).
 *      Mismatch or unknown subscription → 401 + audit webhook.unauthorized +
 *      increment per-IP 401 counter.
 *
 *   3. Redis SET NX dedup.
 *      Key = sha256(subId:resource:changeType:exp:tenantId); stored under
 *      `mcp:webhook:dedup:<key>` with 24h TTL. First receipt → 202 +
 *      webhook.received audit; duplicate → 202 + X-Webhook-Duplicate header
 *      + webhook.duplicate audit. Matches Graph's documented 4h max-retry
 *      window 6× over per D-16.
 *
 * Redaction (D-01 + D-16):
 *   - clientState plaintext NEVER logged or returned in responses.
 *   - audit meta.received_client_state_suffix = last 4 chars only.
 *   - audit meta.dedup_key_suffix = last 8 chars only.
 *   - Redis keys are opaque sha256 (dedup) or IP-only (rate-limit).
 *
 * Dependencies (DI factory — no import-time globals):
 *   - pgPool for subscriptions lookup + audit INSERT.
 *   - redis for dedup SET NX and per-IP INCR/EXPIRE.
 *   - tenantPool.getDekForTenant for warm path; fallback to direct
 *     unwrapTenantDek(wrapped_dek, kek) for cold pool (webhook is a
 *     distinct code path from MSAL acquire — should not force-load MSAL
 *     just to unwrap).
 *   - kek for the cold-path fallback.
 */
import type { Request, Response, RequestHandler } from 'express';
import type { Pool } from 'pg';
import { createHash } from 'node:crypto';
import type { RedisClient } from '../redis.js';
import type { TenantPool } from '../tenant/tenant-pool.js';
import type { TenantRow } from '../tenant/tenant-row.js';
import { writeAuditStandalone } from '../audit.js';
import { decryptWithKey, type Envelope } from '../crypto/envelope.js';
import { unwrapTenantDek } from '../crypto/dek.js';
import logger from '../../logger.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import { mapGraphNotificationToResourceUpdates } from '../delta/resource-updates.js';

// Module constants per D-16.
export const DEDUP_TTL_SECONDS = 24 * 60 * 60;
export const MAX_401_PER_MINUTE_PER_IP = 10;
export const UNAUTHORIZED_RATE_TTL_SECONDS = 60;

// ─── Dependency shape ──────────────────────────────────────────────────────

export interface WebhookDeps {
  pgPool: Pool;
  redis: RedisClient;
  tenantPool: TenantPool;
  kek: Buffer;
}

// ─── Wire types (Graph contract, CITED:
// https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)
// ──────────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  subscriptionId: string;
  changeType: string;
  resource: string;
  clientState: string;
  subscriptionExpirationDateTime: string;
  tenantId?: string;
  resourceData?: unknown;
}

// ─── Row shape returned by loadSubscriptionByGraphId ───────────────────────

export interface SubscriptionRow {
  id: string;
  graph_subscription_id: string;
  client_state: Envelope;
  resource: string;
  change_type: string;
}

// ─── Dedup key composition (D-16 + plan 04-07 interface block) ─────────────

/**
 * Deterministic sha256 dedup key for a notification. Per D-16 uses the
 * 5-tuple (subscriptionId, resource, changeType, subscriptionExpirationDateTime,
 * tenantId) so Graph retries for the same event hash identically while
 * distinct events (different changeType, expiration rotation) produce
 * different keys.
 */
export function computeDedupKey(n: {
  subscriptionId: string;
  resource: string;
  changeType: string;
  subscriptionExpirationDateTime: string;
  tenantId: string;
}): string {
  const composite = `${n.subscriptionId}:${n.resource}:${n.changeType}:${n.subscriptionExpirationDateTime}:${n.tenantId}`;
  return createHash('sha256').update(composite).digest('hex');
}

// ─── Subscription lookup ───────────────────────────────────────────────────

/**
 * Lookup subscription by (tenant_id, graph_subscription_id). Returns the
 * encrypted client_state envelope plus minimal row fields the handler needs.
 * Caller (webhook handler) treats a null return as an unknown subscription
 * and responds 401 (NOT 404) per D-16 to prevent id enumeration.
 */
export async function loadSubscriptionByGraphId(
  pool: Pool,
  tenantId: string,
  graphSubscriptionId: string
): Promise<SubscriptionRow | null> {
  const { rows } = await pool.query<SubscriptionRow>(
    `SELECT id, graph_subscription_id, client_state, resource, change_type
       FROM subscriptions
      WHERE tenant_id = $1 AND graph_subscription_id = $2
      LIMIT 1`,
    [tenantId, graphSubscriptionId]
  );
  return rows[0] ?? null;
}

// ─── DEK resolution ────────────────────────────────────────────────────────

/**
 * Resolve the per-tenant DEK without forcing an MSAL pool acquire. Warm path:
 * tenantPool already has the tenant and returns the DEK from its cached
 * PoolEntry. Cold path: unwrap the wrapped_dek envelope on the tenant row
 * directly via the KEK. This avoids constructing an MSAL client just to
 * unwrap the DEK for a webhook that doesn't issue a Graph call.
 *
 * Returns null when the tenant has no wrapped_dek (disabled / unprovisioned)
 * so callers can respond with 503 without leaking the absence to the caller
 * as a different error code from other DEK failures.
 */
function resolveTenantDek(tenant: TenantRow, deps: WebhookDeps): Buffer | null {
  try {
    return deps.tenantPool.getDekForTenant(tenant.id);
  } catch {
    // Cold pool — fall through to the direct unwrap path.
  }
  if (!tenant.wrapped_dek) return null;
  try {
    return unwrapTenantDek(tenant.wrapped_dek, deps.kek);
  } catch (err) {
    logger.warn(
      { tenantId: tenant.id, err: (err as Error).message },
      'webhook: wrapped_dek unwrap failed'
    );
    return null;
  }
}

// ─── Rate limit ────────────────────────────────────────────────────────────

/**
 * Per-IP 401 counter key. Plain IP (no PII) — matches D-16 rate-limit key
 * prefix. Fallback '0.0.0.0' guards against missing req.ip (e.g., unit-
 * tested harnesses that don't set it).
 */
function rateLimitKey(ip: string): string {
  return `mcp:webhook:401:${ip || '0.0.0.0'}`;
}

/**
 * Increment the per-IP 401 counter and set the 60s TTL on first increment.
 * Fire-and-forget: any Redis failure is logged but never propagates — a
 * Redis outage MUST NOT block the 401 response. Subsequent over-limit
 * detection will silently miss during a Redis outage, but that's the
 * correct trade-off (availability > DoS protection in partition mode per
 * T-04-17a; attackers gain temporary rate-limit bypass but no credential
 * advantage).
 */
async function incrementUnauthorizedCounter(redis: RedisClient, ip: string): Promise<void> {
  const key = rateLimitKey(ip);
  try {
    const next = await redis.incr(key);
    if (next === 1) {
      await redis.expire(key, UNAUTHORIZED_RATE_TTL_SECONDS);
    }
  } catch (err) {
    logger.warn(
      { ip, err: (err as Error).message },
      'webhook: rate-limit counter increment failed'
    );
  }
}

// ─── Audit helpers ─────────────────────────────────────────────────────────

interface AuditUnauthorizedArgs {
  deps: WebhookDeps;
  tenantId: string;
  req: Request;
  requestId: string;
  notification: NotificationItem;
  reason: 'clientstate_mismatch' | 'unknown_subscription' | 'decrypt_failed';
  extra?: Record<string, unknown>;
}

/**
 * Writes webhook.unauthorized + increments the per-IP 401 counter.
 * Fire-and-forget (writeAuditStandalone never throws — falls back to pino
 * shadow log on DB failure, per plan 03-10 invariants). Callers do NOT await
 * the audit write — HTTP response latency should not be coupled to audit
 * durability.
 *
 * The received_client_state_suffix is the LAST 4 chars of the received
 * value only. For attackers brute-forcing the token, suffix exposure gives
 * no material advantage (2^16 bits of remaining entropy); for operators
 * triaging real misconfigurations it's enough to correlate with subscription
 * creation logs.
 */
function auditUnauthorized(args: AuditUnauthorizedArgs): void {
  const { deps, tenantId, req, requestId, notification, reason, extra } = args;
  const received = notification.clientState ?? '';
  const suffix = received.length > 0 ? received.slice(-4) : '';
  const meta: Record<string, unknown> = {
    change_type: notification.changeType,
    resource: notification.resource,
    received_client_state_suffix: suffix,
    reason,
    ...(extra ?? {}),
  };
  void writeAuditStandalone(deps.pgPool, {
    tenantId,
    actor: 'graph',
    action: 'webhook.unauthorized',
    target: notification.subscriptionId ?? null,
    ip: req.ip ?? null,
    requestId,
    result: 'failure',
    meta,
  });
  void incrementUnauthorizedCounter(deps.redis, req.ip ?? '');
}

// ─── Request-body validation ───────────────────────────────────────────────

/**
 * Validate the shape of `{value: NotificationItem[]}` without allocating a
 * full Zod schema — Graph payloads can reach 200 KB per doc + high call rate,
 * so a hand-rolled shape check keeps the hot path lean. Returns either the
 * array of items OR an error-code string the handler uses to emit a 400.
 */
function parseNotifications(
  body: unknown
): NotificationItem[] | { error: 'empty_notifications' | 'malformed_notification' } {
  const arr =
    body !== null &&
    typeof body === 'object' &&
    Array.isArray((body as { value?: unknown[] }).value)
      ? ((body as { value: unknown[] }).value as unknown[])
      : null;
  if (!arr || arr.length === 0) {
    return { error: 'empty_notifications' };
  }
  const out: NotificationItem[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      return { error: 'malformed_notification' };
    }
    const n = item as Record<string, unknown>;
    if (
      typeof n.subscriptionId !== 'string' ||
      n.subscriptionId.length === 0 ||
      typeof n.clientState !== 'string'
    ) {
      return { error: 'malformed_notification' };
    }
    out.push({
      subscriptionId: n.subscriptionId,
      changeType: typeof n.changeType === 'string' ? n.changeType : '',
      resource: typeof n.resource === 'string' ? n.resource : '',
      clientState: n.clientState,
      subscriptionExpirationDateTime:
        typeof n.subscriptionExpirationDateTime === 'string'
          ? n.subscriptionExpirationDateTime
          : '',
      tenantId: typeof n.tenantId === 'string' ? n.tenantId : undefined,
      resourceData: n.resourceData,
    });
  }
  return out;
}

// ─── Dedup helpers ─────────────────────────────────────────────────────────

/**
 * Atomic first-wins SET NX with 24h TTL for webhook dedup. Returns true
 * when this receipt is the first (key was set), false when the notification
 * is a duplicate within the 24h window (SET NX returned null).
 *
 * The ioredis variadic .set() signature isn't covered by its TypeScript
 * overloads when combining EX + NX; we cast via `unknown` (same pattern as
 * RedisPkceStore) so the facade + real ioredis both accept the call shape.
 */
async function setDedupKeyFirstWins(redis: RedisClient, dedupKey: string): Promise<boolean> {
  const result = await (
    redis as unknown as {
      set: (
        key: string,
        value: string,
        mode: 'EX',
        seconds: number,
        nx: 'NX'
      ) => Promise<'OK' | null>;
    }
  ).set(`mcp:webhook:dedup:${dedupKey}`, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
  return result === 'OK';
}

// ─── Handler factory ───────────────────────────────────────────────────────

/**
 * Create the Express RequestHandler for POST /t/:tenantId/notifications.
 *
 * Expects loadTenant to have populated `req.tenant` (middleware runs before
 * this handler in server.ts). A missing req.tenant falls back to a defensive
 * 404 rather than throwing — this path should be unreachable in production.
 */
export function createWebhookHandler(deps: WebhookDeps): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    const requestId = (req as Request & { id?: string }).id ?? 'no-req-id';
    const ip = req.ip ?? '';

    // Guard 0: Per-IP rate limit. Read-only peek so we short-circuit BEFORE
    // touching the DB or attempting decryption — this is the cheapest shed
    // path for attack traffic. The counter is incremented on the actual 401
    // branch (auditUnauthorized → incrementUnauthorizedCounter) so valid
    // notifications and validationToken handshakes never touch the counter.
    let current = 0;
    try {
      const raw = await deps.redis.get(rateLimitKey(ip));
      current = raw ? Number.parseInt(raw, 10) || 0 : 0;
    } catch (err) {
      // Redis outage: fall through to the validation path rather than
      // failing closed — matches T-04-17a disposition (availability >
      // DoS protection during partition).
      logger.warn(
        { ip, err: (err as Error).message },
        'webhook: rate-limit peek failed (bypassing limiter)'
      );
    }
    if (current >= MAX_401_PER_MINUTE_PER_IP) {
      res.setHeader('Retry-After', String(UNAUTHORIZED_RATE_TTL_SECONDS));
      res.status(429).json({ error: 'rate_limited' });
      return;
    }

    // Guard 1: loadTenant must have run. Defensive 404 if not.
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(404).json({ error: 'tenant_not_found' });
      return;
    }

    // Branch 1: Validation-token handshake. MUST be ahead of body parsing so
    // Graph's subscription-creation probe responds fast. PITFALL 1: no JSON
    // wrapping. PITFALL 2: explicit decodeURIComponent is defensive against
    // proxy-double-encoding even though Express auto-decodes.
    const rawValidation = (req.query as Record<string, unknown>).validationToken;
    if (typeof rawValidation === 'string' && rawValidation.length > 0) {
      const token = decodeURIComponent(rawValidation);
      res.type('text/plain').status(200).send(token);
      return;
    }

    // Branch 2: Notification receipt. Parse body → authorize → dedup → 202.
    const parsed = parseNotifications(req.body);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const notifications = parsed;

    // Resolve DEK for decrypting subscription client_state envelopes.
    const dek = resolveTenantDek(tenant, deps);
    if (!dek) {
      logger.warn({ tenantId: tenant.id, requestId }, 'webhook: tenant DEK unavailable');
      res.status(503).json({ error: 'tenant_dek_unavailable' });
      return;
    }

    // Authorize every notification in the batch. Per D-16: 401 on ANY
    // mismatch rejects the whole batch (fail-closed). Only the mismatched
    // item produces an audit row — other items are legitimate Graph
    // retransmits that the operator does not need to triage.
    for (const n of notifications) {
      const subRow = await loadSubscriptionByGraphId(deps.pgPool, tenant.id, n.subscriptionId);
      if (!subRow) {
        auditUnauthorized({
          deps,
          tenantId: tenant.id,
          req,
          requestId,
          notification: n,
          reason: 'unknown_subscription',
        });
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      let expected: string;
      try {
        expected = decryptWithKey(subRow.client_state, dek).toString('utf8');
      } catch (err) {
        // Never log the envelope ciphertext — even the envelope wrapper can
        // be abused as a correlation vector. Only log the tenant id + a
        // generic reason.
        logger.warn(
          {
            tenantId: tenant.id,
            subscriptionId: n.subscriptionId,
            requestId,
            err: (err as Error).message,
          },
          'webhook: clientState decrypt failed'
        );
        auditUnauthorized({
          deps,
          tenantId: tenant.id,
          req,
          requestId,
          notification: n,
          reason: 'decrypt_failed',
          extra: { decrypt_failed: true },
        });
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      // PITFALL 3: exact-equality compare. No .toLowerCase(), no .trim() —
      // Graph preserves the subscription-creation clientState verbatim.
      if (expected !== n.clientState) {
        auditUnauthorized({
          deps,
          tenantId: tenant.id,
          req,
          requestId,
          notification: n,
          reason: 'clientstate_mismatch',
        });
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
    }

    // All notifications authorized. Apply per-notification SET NX dedup.
    // First-wins items emit webhook.received; duplicates emit webhook.duplicate
    // and add to the X-Webhook-Duplicate header count for operator
    // observability (Graph ignores our 2xx response headers per D-16 Pitfall 8).
    let duplicateCount = 0;
    for (const n of notifications) {
      const dedupKey = computeDedupKey({
        subscriptionId: n.subscriptionId,
        resource: n.resource,
        changeType: n.changeType,
        subscriptionExpirationDateTime: n.subscriptionExpirationDateTime,
        tenantId: tenant.id,
      });

      let firstReceipt = false;
      try {
        firstReceipt = await setDedupKeyFirstWins(deps.redis, dedupKey);
      } catch (err) {
        // Redis outage during dedup: emit webhook.received (best-effort
        // durability via pg + audit shadow log) rather than silently drop.
        // Matches T-04-15c — no silent drops on Redis partition.
        logger.warn(
          { tenantId: tenant.id, subscriptionId: n.subscriptionId, err: (err as Error).message },
          'webhook: dedup SET NX failed (proceeding as first receipt)'
        );
        firstReceipt = true;
      }

      if (!firstReceipt) {
        duplicateCount++;
        void writeAuditStandalone(deps.pgPool, {
          tenantId: tenant.id,
          actor: 'graph',
          action: 'webhook.duplicate',
          target: n.subscriptionId,
          ip: req.ip ?? null,
          requestId,
          result: 'success',
          meta: {
            dedup_key_suffix: dedupKey.slice(-8),
            subscription_id: n.subscriptionId,
            change_type: n.changeType,
          },
        });
        continue;
      }

      void writeAuditStandalone(deps.pgPool, {
        tenantId: tenant.id,
        actor: 'graph',
        action: 'webhook.received',
        target: n.subscriptionId,
        ip: req.ip ?? null,
        requestId,
        result: 'success',
        meta: { subscription_id: n.subscriptionId, change_type: n.changeType },
      });
      for (const update of mapGraphNotificationToResourceUpdates(tenant.id, n)) {
        void publishResourceUpdated(
          deps.redis,
          tenant.id,
          [update.uri],
          update.reason,
          update.source,
          update.changeType
        );
      }
    }

    if (duplicateCount > 0) {
      res.setHeader('X-Webhook-Duplicate', String(duplicateCount));
    }
    res.status(202).send();
  };
}

import { describe, expect, it, vi } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import {
  ErrorCode,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  type SubscribeRequest,
  type UnsubscribeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { publishResourceUpdated } from '../../../src/lib/mcp-notifications/events.js';
import {
  McpSessionRegistry,
  subscribeToAgenticEvents,
} from '../../../src/lib/mcp-notifications/session-registry.js';
import {
  RedisResourceSubscriptionStore,
  resourceSubscriptionKey,
} from '../../../src/lib/mcp-notifications/resource-subscriptions.js';
import { registerResourceSubscriptionHandlers } from '../../../src/lib/mcp-notifications/register-handlers.js';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';
import { __setPoolForTesting, withTransaction } from '../../../src/lib/postgres.js';
import {
  registerAuditResourcePublisher,
  writeAudit,
  writeAuditStandalone,
  type AuditRow,
} from '../../../src/lib/audit.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const SESSION_SUBSCRIBED = 'session-subscribed';
const SESSION_UNSUBSCRIBED = 'session-unsubscribed';
const BOOKMARKS_URI = `mcp://tenant/${TENANT_A}/bookmarks.json`;
const FACTS_URI = `mcp://tenant/${TENANT_A}/facts.json`;
const AUDIT_URI = `mcp://tenant/${TENANT_A}/audit/recent.json`;
const OTHER_TENANT_BOOKMARKS_URI = `mcp://tenant/${TENANT_B}/bookmarks.json`;

interface SentNotification {
  method: string;
  params?: unknown;
}

function makeServer(sent: SentNotification[]) {
  return {
    sendToolListChanged: vi.fn(),
    sendResourceListChanged: vi.fn(),
    sendResourceUpdated: vi.fn((params: unknown) => {
      sent.push({ method: 'notifications/resources/updated', params });
    }),
    sendPromptListChanged: vi.fn(() => {
      sent.push({ method: 'notifications/prompts/list_changed' });
    }),
    sendLoggingMessage: vi.fn(),
  };
}

function registerFakeSession(registry: McpSessionRegistry, sessionId: string): SentNotification[] {
  const sent: SentNotification[] = [];
  registry.registerSession({
    tenantId: TENANT_A,
    sessionId,
    server: makeServer(sent) as never,
    transport: {} as never,
    surface: 'discovery',
  });
  return sent;
}

async function waitFor(condition: () => boolean, microtaskTurns = 20): Promise<void> {
  for (let i = 0; i < microtaskTurns; i++) {
    if (condition()) return;
    await Promise.resolve();
  }
  expect(condition()).toBe(true);
}

function makeHandlerHarness(tenantId: string, store: RedisResourceSubscriptionStore) {
  let subscribeHandler:
    | ((request: SubscribeRequest, extra: { sessionId?: string }) => Promise<unknown>)
    | undefined;
  let unsubscribeHandler:
    | ((request: UnsubscribeRequest, extra: { sessionId?: string }) => Promise<unknown>)
    | undefined;
  const server = {
    server: {
      registerCapabilities: vi.fn(),
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === SubscribeRequestSchema) subscribeHandler = handler;
        if (schema === UnsubscribeRequestSchema) unsubscribeHandler = handler;
      }),
    },
  };

  registerResourceSubscriptionHandlers(server as never, { tenantId, store });
  if (!subscribeHandler || !unsubscribeHandler) {
    throw new Error('subscription handlers were not registered');
  }

  return {
    subscribe: subscribeHandler,
    unsubscribe: unsubscribeHandler,
    registerCapabilities: server.server.registerCapabilities,
  };
}

function makeAuditPool(): Pool {
  const db = newDb();
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });
  const { Pool: PgMemPool } = db.adapters.createPg();
  return new PgMemPool() as Pool;
}

async function installAuditSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE audit_log (
      id uuid PRIMARY KEY,
      tenant_id uuid NOT NULL,
      actor text NOT NULL,
      action text NOT NULL,
      target text,
      ip text,
      request_id text NOT NULL,
      result text NOT NULL,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `);
}

function auditRow(action: string): AuditRow {
  return {
    tenantId: TENANT_A,
    actor: 'test',
    action,
    target: TENANT_A,
    ip: null,
    requestId: `req-${action}`,
    result: 'success',
    meta: {},
  };
}

async function nextTick(microtaskTurns = 5): Promise<void> {
  for (let i = 0; i < microtaskTurns; i++) {
    await Promise.resolve();
  }
}

describe('Phase 7 Plan 07-08 Task 2 — resource subscriptions', () => {
  it('resources/subscribe stores the URI under mcp:resource-sub:{tenantId}:{sessionId}', async () => {
    const redis = new MemoryRedisFacade();
    const store = new RedisResourceSubscriptionStore(redis);

    await store.subscribe(TENANT_A, SESSION_SUBSCRIBED, BOOKMARKS_URI);

    const raw = await redis.get(resourceSubscriptionKey(TENANT_A, SESSION_SUBSCRIBED));
    expect(JSON.parse(raw ?? 'null')).toEqual([BOOKMARKS_URI]);
  });

  it('resources/unsubscribe removes only the requested URI', async () => {
    const redis = new MemoryRedisFacade();
    const store = new RedisResourceSubscriptionStore(redis);

    await store.subscribe(TENANT_A, SESSION_SUBSCRIBED, BOOKMARKS_URI);
    await store.subscribe(TENANT_A, SESSION_SUBSCRIBED, FACTS_URI);
    await store.unsubscribe(TENANT_A, SESSION_SUBSCRIBED, BOOKMARKS_URI);

    expect(await store.list(TENANT_A, SESSION_SUBSCRIBED)).toEqual([FACTS_URI]);
  });

  it('resources/subscribe rejects tenant resource URIs owned by another tenant', async () => {
    const redis = new MemoryRedisFacade();
    const store = new RedisResourceSubscriptionStore(redis);
    const handlers = makeHandlerHarness(TENANT_A, store);

    await expect(
      handlers.subscribe(
        { method: 'resources/subscribe', params: { uri: OTHER_TENANT_BOOKMARKS_URI } },
        { sessionId: SESSION_SUBSCRIBED }
      )
    ).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: { code: 'tenant_resource_mismatch' },
    });
    expect(await store.list(TENANT_A, SESSION_SUBSCRIBED)).toEqual([]);
    expect(handlers.registerCapabilities).toHaveBeenCalledWith({
      resources: { listChanged: true, subscribe: true },
    });
  });

  it('resource-updated events deliver only to sessions subscribed to the URI', async () => {
    const redis = new MemoryRedisFacade();
    const store = new RedisResourceSubscriptionStore(redis);
    const registry = new McpSessionRegistry({
      isResourceSubscribed: (tenantId, sessionId, uri) =>
        store.isSubscribed(tenantId, sessionId, uri),
    });
    const subscribed = registerFakeSession(registry, SESSION_SUBSCRIBED);
    const unsubscribed = registerFakeSession(registry, SESSION_UNSUBSCRIBED);

    await store.subscribe(TENANT_A, SESSION_SUBSCRIBED, BOOKMARKS_URI);
    await subscribeToAgenticEvents(redis, registry);
    await publishResourceUpdated(redis, TENANT_A, [BOOKMARKS_URI], 'bookmark-change');
    await waitFor(() => subscribed.length === 1);

    expect(subscribed).toEqual([
      {
        method: 'notifications/resources/updated',
        params: { uri: BOOKMARKS_URI, _meta: { reason: 'bookmark-change' } },
      },
    ]);
    expect(unsubscribed).toEqual([]);
  });

  it('audit writes publish audit/recent.json only after commit and not after rollback or shadow fallback', async () => {
    const pool = makeAuditPool();
    await installAuditSchema(pool);
    __setPoolForTesting(pool);
    const redis = new MemoryRedisFacade();
    const store = new RedisResourceSubscriptionStore(redis);
    const registry = new McpSessionRegistry({
      isResourceSubscribed: (tenantId, sessionId, uri) =>
        store.isSubscribed(tenantId, sessionId, uri),
    });
    const delivered = registerFakeSession(registry, SESSION_SUBSCRIBED);
    const rawEvents: Array<{ type: string; uris?: string[] }> = [];
    redis.on('message', (channel, message) => {
      if (channel === 'mcp:agentic-events') {
        rawEvents.push(JSON.parse(message) as { type: string; uris?: string[] });
      }
    });

    await store.subscribe(TENANT_A, SESSION_SUBSCRIBED, AUDIT_URI);
    await subscribeToAgenticEvents(redis, registry);
    registerAuditResourcePublisher((tenantId) =>
      publishResourceUpdated(
        redis,
        tenantId,
        [`mcp://tenant/${tenantId}/audit/recent.json`],
        'audit-write'
      )
    );

    try {
      await withTransaction(async (client) => {
        await writeAudit(client, auditRow('audit.committed.1'));
        await writeAudit(client, auditRow('audit.committed.2'));
      });
      await waitFor(() => delivered.length === 1);
      expect(delivered).toEqual([
        {
          method: 'notifications/resources/updated',
          params: { uri: AUDIT_URI, _meta: { reason: 'audit-write' } },
        },
      ]);

      const beforeRollback = rawEvents.length;
      await expect(
        withTransaction(async (client) => {
          await writeAudit(client, auditRow('audit.rolled-back'));
          throw new Error('rollback');
        })
      ).rejects.toThrow('rollback');
      await nextTick();
      expect(rawEvents).toHaveLength(beforeRollback);

      const beforeStandalone = rawEvents.length;
      await writeAuditStandalone(pool, auditRow('audit.standalone'));
      await waitFor(() => rawEvents.length === beforeStandalone + 1);

      const shadowPool = {
        query: vi.fn(async () => {
          throw new Error('audit table unavailable');
        }),
      } as unknown as Pool;
      await writeAuditStandalone(shadowPool, auditRow('audit.shadow'));
      await nextTick();
      expect(rawEvents).toHaveLength(beforeStandalone + 1);
    } finally {
      registerAuditResourcePublisher(undefined);
      __setPoolForTesting(null);
      await redis.quit();
      await pool.end();
    }
  });
});

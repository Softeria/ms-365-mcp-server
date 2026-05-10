import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import {
  AGENTIC_EVENTS_CHANNEL,
  publishResourceUpdated,
  publishToolsListChanged,
} from '../../../src/lib/mcp-notifications/events.js';
import {
  McpSessionRegistry,
  subscribeToAgenticEvents,
} from '../../../src/lib/mcp-notifications/session-registry.js';
import { ResourceNotificationCoalescer } from '../../../src/lib/mcp-notifications/coalesce.js';
import { RedisResourceSubscriptionStore } from '../../../src/lib/mcp-notifications/resource-subscriptions.js';
import { MemoryRedisFacade } from '../../../src/lib/redis-facade.js';
import { createStreamableHttpHandler } from '../../../src/lib/transports/streamable-http.js';
import { __setPoolForTesting } from '../../../src/lib/postgres.js';
import { createEnabledToolsRoutes } from '../../../src/lib/admin/enabled-tools.js';
import { createTenantsRoutes } from '../../../src/lib/admin/tenants.js';
import { createCursorSecret } from '../../../src/lib/admin/cursor.js';

vi.mock('../../../src/generated/client.js', () => ({
  api: {
    endpoints: [{ alias: 'mail.messages.send', method: 'post', path: '/me/sendMail' }],
  },
}));

vi.mock('../../../src/presets/generated-index.js', () => {
  const DISCOVERY = Object.freeze(new Set<string>(['bookmark-tool']));
  return {
    DISCOVERY_V1_OPS: DISCOVERY,
    ESSENTIALS_V1_OPS: DISCOVERY,
    PRESET_VERSIONS: new Map([
      ['discovery-v1', DISCOVERY],
      ['essentials-v2', DISCOVERY],
    ]),
  };
});

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const AUDIT_URI = `mcp://tenant/${TENANT_A}/audit/recent.json`;
const VALID_TENANT_BODY = {
  mode: 'delegated' as const,
  client_id: 'client-id',
  tenant_id: '33333333-3333-4333-8333-333333333333',
  cloud_type: 'global' as const,
  redirect_uri_allowlist: ['http://localhost:3000/callback'],
  cors_origins: ['http://localhost:3000'],
  allowed_scopes: ['User.Read'],
};

interface SentNotification {
  method: string;
  params?: unknown;
}

function makeServer(sent: SentNotification[]) {
  return {
    sendToolListChanged: vi.fn(() => {
      sent.push({ method: 'notifications/tools/list_changed' });
    }),
    sendResourceListChanged: vi.fn(() => {
      sent.push({ method: 'notifications/resources/list_changed' });
    }),
    sendResourceUpdated: vi.fn((params: unknown) => {
      sent.push({ method: 'notifications/resources/updated', params });
    }),
    sendPromptListChanged: vi.fn(() => {
      sent.push({ method: 'notifications/prompts/list_changed' });
    }),
    sendLoggingMessage: vi.fn((params: unknown) => {
      sent.push({ method: 'notifications/message', params });
    }),
  };
}

function registerFakeSession(
  registry: McpSessionRegistry,
  tenantId: string,
  sessionId: string,
  surface: 'discovery' | 'static' = 'discovery'
): SentNotification[] {
  const sent: SentNotification[] = [];
  registry.registerSession({
    tenantId,
    sessionId,
    server: makeServer(sent) as never,
    transport: {} as never,
    surface,
  });
  return sent;
}

class FakeResponse extends EventEmitter {
  statusCode = 200;
  headers = new Map<string, string>();
  body: unknown;
  chunks: string[] = [];

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(body: unknown): this {
    this.body = body;
    this.end();
    return this;
  }

  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  writeHead(statusCode: number, headers: Record<string, string>): void {
    this.statusCode = statusCode;
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value);
    }
  }

  write(chunk: string): void {
    this.chunks.push(chunk);
  }

  end(chunk?: string): this {
    if (chunk) this.write(chunk);
    this.emit('finish');
    return this;
  }
}

function makeRequest(method: string, body: unknown, sessionId?: string) {
  const headers: Record<string, string> = {};
  if (sessionId) headers['mcp-session-id'] = sessionId;
  return {
    method,
    headers,
    body,
    tenant: { id: TENANT_A, preset_version: 'discovery-v1' },
    get: (name: string) => headers[name.toLowerCase()],
  };
}

function makeTransportFactory() {
  const transports: Array<{
    sessionId?: string;
    onclose?: () => void;
    close: ReturnType<typeof vi.fn>;
    handleRequest: ReturnType<typeof vi.fn>;
  }> = [];
  const createTransport = vi.fn(
    (options: {
      onsessioninitialized?: (sessionId: string) => void | Promise<void>;
      onsessionclosed?: (sessionId: string) => void | Promise<void>;
    }) => {
      const transport = {
        sessionId: undefined as string | undefined,
        onclose: undefined as (() => void) | undefined,
        close: vi.fn(async () => {
          transport.onclose?.();
        }),
        handleRequest: vi.fn(
          async (
            req: { method: string; get: (name: string) => string | undefined },
            res: FakeResponse
          ) => {
            const sessionId = req.get('mcp-session-id');
            if (req.method === 'POST' && !sessionId) {
              transport.sessionId = 'generated-session';
              await options.onsessioninitialized?.('generated-session');
              res.setHeader('Mcp-Session-Id', 'generated-session');
              res.status(200).json({ initialized: true });
              return;
            }
            if (req.method === 'GET') {
              res.writeHead(200, { 'content-type': 'text/event-stream' });
              res.write('event: notifications\n\n');
              return;
            }
            if (req.method === 'DELETE') {
              await options.onsessionclosed?.(sessionId ?? '');
              res.status(200).end();
              return;
            }
            res.status(202).end();
          }
        ),
      };
      transports.push(transport);
      return transport;
    }
  );
  return { createTransport, transports };
}

function makeAdminPool(): Pool {
  const db = newDb();
  const { Pool: PgMemPool } = db.adapters.createPg();
  return new PgMemPool() as Pool;
}

async function installAdminSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE tenants (
      id uuid PRIMARY KEY,
      mode text NOT NULL,
      client_id text NOT NULL,
      client_secret_ref text,
      tenant_id uuid NOT NULL,
      cloud_type text NOT NULL,
      redirect_uri_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
      cors_origins jsonb NOT NULL DEFAULT '[]'::jsonb,
      allowed_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
      enabled_tools text,
      preset_version text NOT NULL DEFAULT 'discovery-v1',
      sharepoint_domain text,
      rate_limits jsonb,
      slug text UNIQUE,
      disabled_at timestamptz,
      wrapped_dek jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );

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

async function startAdminServer(pool: Pool, redis: MemoryRedisFacade) {
  const app = express();
  app.use(express.json() as unknown as express.RequestHandler);
  app.use((req, _res, next) => {
    (
      req as unknown as {
        admin?: { actor: string; source: 'entra'; tenantScoped: string | null };
      }
    ).admin = { actor: 'admin@example.com', source: 'entra', tenantScoped: null };
    (req as express.Request & { id?: string }).id = 'req-notifications';
    next();
  });
  const deps = {
    pgPool: pool,
    redis,
    tenantPool: { evict: vi.fn(), invalidate: vi.fn() },
    kek: randomBytes(32),
    cursorSecret: createCursorSecret(),
    adminOrigins: [],
    entraConfig: { appClientId: 'admin-app', groupId: 'admin-group' },
  } as unknown as import('../../../src/lib/admin/router.js').AdminRouterDeps;
  app.use('/admin/tenants', createTenantsRoutes(deps));
  app.use('/admin/tenants', createEnabledToolsRoutes(deps));
  const server = await new Promise<http.Server>((resolve) => {
    const s = http.createServer(app).listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function doJson(method: string, url: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // plain text response
  }
  return { status: res.status, body: parsed };
}

async function collectAgenticEvents(redis: MemoryRedisFacade, fn: () => Promise<void>) {
  const events: Array<{ type: string; tenantId: string }> = [];
  redis.on('message', (channel, message) => {
    if (channel === AGENTIC_EVENTS_CHANNEL) {
      events.push(JSON.parse(message) as { type: string; tenantId: string });
    }
  });
  await redis.subscribe(AGENTIC_EVENTS_CHANNEL);
  await fn();
  return events;
}

describe('Phase 7 Plan 07-08 Task 1 — agentic event session registry', () => {
  it('delivers tools/list_changed only to active discovery sessions for the event tenant', async () => {
    const redis = new MemoryRedisFacade();
    const registry = new McpSessionRegistry();
    const tenantADiscovery = registerFakeSession(registry, TENANT_A, 'a-discovery');
    const tenantAStatic = registerFakeSession(registry, TENANT_A, 'a-static', 'static');
    const tenantBDiscovery = registerFakeSession(registry, TENANT_B, 'b-discovery');

    await subscribeToAgenticEvents(redis, registry);
    await publishToolsListChanged(redis, TENANT_A, 'enabled-tools-change');

    expect(tenantADiscovery).toEqual([{ method: 'notifications/tools/list_changed' }]);
    expect(tenantAStatic).toEqual([]);
    expect(tenantBDiscovery).toEqual([]);
  });

  it('does not deliver tenant A tool-list events to active tenant B discovery sessions', async () => {
    const redis = new MemoryRedisFacade();
    const registry = new McpSessionRegistry();
    const tenantBDiscovery = registerFakeSession(registry, TENANT_B, 'b-discovery');

    await subscribeToAgenticEvents(redis, registry);
    await publishToolsListChanged(redis, TENANT_A, 'enabled-tools-change');

    expect(tenantBDiscovery).toEqual([]);
  });

  it('uses a duplicated Redis subscriber client when duplicate() is available', async () => {
    const registry = new McpSessionRegistry();
    const subscriber = {
      subscribe: vi.fn(async () => 1),
      on: vi.fn(),
    };
    const redis = {
      duplicate: vi.fn(() => subscriber),
    };

    const used = await subscribeToAgenticEvents(redis as never, registry);

    expect(redis.duplicate).toHaveBeenCalledTimes(1);
    expect(subscriber.subscribe).toHaveBeenCalledWith(AGENTIC_EVENTS_CHANNEL);
    expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(used).toBe(subscriber);
  });

  it('coalesces resource-updated burst delivery per tenant, session, and URI for 2 seconds', async () => {
    let now = 1_000;
    const coalescer = new ResourceNotificationCoalescer({
      windowMs: 2_000,
      now: () => now,
    });

    expect(coalescer.shouldDeliver(TENANT_A, 'session-1', AUDIT_URI)).toBe(true);
    now += 1_999;
    expect(coalescer.shouldDeliver(TENANT_A, 'session-1', AUDIT_URI)).toBe(false);
    expect(coalescer.shouldDeliver(TENANT_A, 'session-2', AUDIT_URI)).toBe(true);
    expect(
      coalescer.shouldDeliver(TENANT_A, 'session-1', `mcp://tenant/${TENANT_A}/bookmarks.json`)
    ).toBe(true);
    expect(coalescer.shouldDeliver(TENANT_B, 'session-1', AUDIT_URI)).toBe(true);

    now += 1;
    expect(coalescer.shouldDeliver(TENANT_A, 'session-1', AUDIT_URI)).toBe(true);
  });

  it('delivers resource-updated event payloads as MCP notification params', async () => {
    const redis = new MemoryRedisFacade();
    const registry = new McpSessionRegistry();
    const tenantADiscovery = registerFakeSession(registry, TENANT_A, 'a-discovery');

    await subscribeToAgenticEvents(redis, registry);
    await publishResourceUpdated(redis, TENANT_A, [AUDIT_URI], 'audit-write');

    expect(tenantADiscovery).toEqual([
      {
        method: 'notifications/resources/updated',
        params: { uri: AUDIT_URI, _meta: { reason: 'audit-write' } },
      },
    ]);
  });
});

describe('Phase 7 Plan 07-08 Task 3 — stateful streamable HTTP and admin list notifications', () => {
  it('reuses discovery Streamable HTTP sessions by Mcp-Session-Id and cleans up only on DELETE or true close', async () => {
    const registry = new McpSessionRegistry();
    const redis = new MemoryRedisFacade();
    const subscriptions = new RedisResourceSubscriptionStore(redis);
    const { createTransport, transports } = makeTransportFactory();
    const buildMcpServer = vi.fn(() => ({
      connect: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
      sendLoggingMessage: vi.fn(),
    }));
    const handler = createStreamableHttpHandler({
      buildMcpServer,
      sessionRegistry: registry,
      resourceSubscriptions: subscriptions,
      surface: 'discovery',
      createTransport,
    } as never);

    const initialRes = new FakeResponse();
    await handler(
      makeRequest('POST', { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) as never,
      initialRes as never,
      vi.fn()
    );

    expect(initialRes.getHeader('mcp-session-id')).toBe('generated-session');
    expect(registry.getSession('generated-session')).toBeDefined();
    expect(buildMcpServer).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledTimes(1);

    initialRes.emit('close');
    expect(registry.getSession('generated-session')).toBeDefined();

    const secondPostRes = new FakeResponse();
    await handler(
      makeRequest('POST', { jsonrpc: '2.0', id: 2, method: 'ping' }, 'generated-session') as never,
      secondPostRes as never,
      vi.fn()
    );
    expect(buildMcpServer).toHaveBeenCalledTimes(1);
    expect(transports[0].handleRequest).toHaveBeenCalledTimes(2);

    const getRes = new FakeResponse();
    await handler(
      makeRequest('GET', undefined, 'generated-session') as never,
      getRes as never,
      vi.fn()
    );
    expect(getRes.getHeader('content-type')).toBe('text/event-stream');
    expect(transports[0].handleRequest).toHaveBeenCalledTimes(3);

    await subscriptions.subscribe(TENANT_A, 'generated-session', AUDIT_URI);
    const deleteRes = new FakeResponse();
    await handler(
      makeRequest('DELETE', undefined, 'generated-session') as never,
      deleteRes as never,
      vi.fn()
    );
    expect(registry.getSession('generated-session')).toBeUndefined();
    expect(await subscriptions.list(TENANT_A, 'generated-session')).toEqual([]);

    const closeRes = new FakeResponse();
    await handler(
      makeRequest('POST', { jsonrpc: '2.0', id: 3, method: 'initialize', params: {} }) as never,
      closeRes as never,
      vi.fn()
    );
    expect(registry.getSession('generated-session')).toBeDefined();
    await transports[1].close();
    expect(registry.getSession('generated-session')).toBeUndefined();
  });

  it('admin enabled-tools and preset PATCH publish list-change events after commit but create/failure do not', async () => {
    const pool = makeAdminPool();
    await installAdminSchema(pool);
    __setPoolForTesting(pool);
    const redis = new MemoryRedisFacade();
    const server = await startAdminServer(pool, redis);

    try {
      const createEvents = await collectAgenticEvents(redis, async () => {
        const created = await doJson('POST', `${server.url}/admin/tenants`, VALID_TENANT_BODY);
        expect(created.status).toBe(201);
      });
      expect(createEvents).toEqual([]);

      const tenantId = (await pool.query<{ id: string }>('SELECT id FROM tenants LIMIT 1')).rows[0]
        .id;
      const enabledToolsEvents = await collectAgenticEvents(redis, async () => {
        const patched = await doJson(
          'PATCH',
          `${server.url}/admin/tenants/${tenantId}/enabled-tools`,
          {
            set: '',
          }
        );
        expect(patched.status).toBe(200);
      });
      expect(enabledToolsEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tenantId, type: 'tools/list_changed' }),
          expect.objectContaining({ tenantId, type: 'resources/list_changed' }),
        ])
      );

      const failedPatchEvents = await collectAgenticEvents(redis, async () => {
        const failed = await doJson(
          'PATCH',
          `${server.url}/admin/tenants/${tenantId}/enabled-tools`,
          { add: ['x'], remove: ['x'] }
        );
        expect(failed.status).toBe(400);
      });
      expect(failedPatchEvents).toEqual([]);

      const presetEvents = await collectAgenticEvents(redis, async () => {
        const patched = await doJson('PATCH', `${server.url}/admin/tenants/${tenantId}`, {
          preset_version: 'essentials-v2',
        });
        expect(patched.status).toBe(200);
      });
      expect(presetEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tenantId, type: 'tools/list_changed' }),
          expect.objectContaining({ tenantId, type: 'resources/list_changed' }),
        ])
      );
    } finally {
      __setPoolForTesting(null);
      await redis.quit();
      await server.close();
      await pool.end();
    }
  });
});

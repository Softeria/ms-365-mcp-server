/**
 * Plan 03-09 Task 1 — Streamable HTTP transport handler (TRANS-01).
 *
 * Tests the createStreamableHttpHandler factory. Mounted at
 * /t/:tenantId/mcp (GET+POST), stateless (sessionIdGenerator: undefined).
 *
 * Each request builds a fresh McpServer scoped to req.tenant via the
 * injected buildMcpServer factory.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../../src/request-context.js';
import { createStreamableHttpHandler } from '../../src/lib/transports/streamable-http.js';
import { McpSessionRegistry } from '../../src/lib/mcp-notifications/session-registry.js';
import logger from '../../src/logger.js';
import type { TenantRow } from '../../src/lib/tenant/tenant-row.js';

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const FAKE_TENANT: TenantRow = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  mode: 'delegated',
  client_id: 'fake-client',
  client_secret_ref: null,
  tenant_id: 'aaaaaaaa-1111-2222-3333-444444444444',
  cloud_type: 'global',
  redirect_uri_allowlist: [],
  cors_origins: [],
  allowed_scopes: ['User.Read'],
  enabled_tools: null,
  wrapped_dek: null,
  slug: null,
  disabled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

function buildTestMcpServer(): McpServer {
  // Minimal McpServer — we rely on the SDK's built-in initialize handler.
  return new McpServer({ name: 'test-mcp', version: '2.0.0' });
}

describe('Streamable HTTP transport (TRANS-01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let buildMcpServer: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    buildMcpServer = vi.fn((_tenant: TenantRow) => buildTestMcpServer());
    const handler = createStreamableHttpHandler({ buildMcpServer });

    const app = express();
    app.use(express.json());
    // Stub loadTenant: populate req.tenant from the URL param.
    app.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...FAKE_TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    app.post('/t/:tenantId/mcp', handler);
    app.get('/t/:tenantId/mcp', handler);
    app.delete('/t/:tenantId/mcp', handler);

    await new Promise<void>((resolve) => {
      server = http.createServer(app).listen(0, () => {
        const { port } = server!.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((r) => server!.close(() => r()));
      server = undefined;
    }
    vi.restoreAllMocks();
  });

  it('POST /t/:tenantId/mcp with initialize returns MCP-shaped JSON-RPC response', async () => {
    const res = await fetch(`${baseUrl}/t/${FAKE_TENANT.id}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    expect(res.status).toBe(200);
    // Streamable HTTP can respond with either JSON or SSE — both are valid
    // per the MCP spec. We accept either.
    const contentType = res.headers.get('content-type') ?? '';

    let body: { jsonrpc?: string; id?: number; result?: { protocolVersion?: string } };
    if (contentType.includes('application/json')) {
      body = (await res.json()) as typeof body;
    } else {
      // SSE-encoded response: first "data:" line contains the JSON-RPC frame.
      const text = await res.text();
      const dataLine = text.split('\n').find((line) => line.startsWith('data:'));
      expect(dataLine).toBeDefined();
      body = JSON.parse(dataLine!.slice(5).trim()) as typeof body;
    }

    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    expect(body.result).toBeDefined();
    expect(body.result!.protocolVersion).toBeDefined();
  });

  it('accepts comma-separated X-Forwarded-Proto values from proxy chains', async () => {
    const res = await fetch(`${baseUrl}/t/${FAKE_TENANT.id}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'X-Forwarded-Proto': 'https,http',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 10,
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'proxy-chain-client', version: '1.0.0' },
        },
      }),
    });

    expect(res.status).toBe(200);
    await res.text();
  });

  it('buildMcpServer is invoked with the tenant populated by loadTenant', async () => {
    await fetch(`${baseUrl}/t/${FAKE_TENANT.id}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 2,
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    expect(buildMcpServer).toHaveBeenCalled();
    const tenantArg = buildMcpServer.mock.calls[0]?.[0] as TenantRow;
    expect(tenantArg).toBeDefined();
    expect(tenantArg.id).toBe(FAKE_TENANT.id);
  });

  it('returns 500 loadTenant_middleware_missing when req.tenant is absent', async () => {
    // Separate app that skips the loadTenant stub — handler should refuse.
    const noLoadApp = express();
    noLoadApp.use(express.json());
    const handler = createStreamableHttpHandler({ buildMcpServer });
    noLoadApp.post('/mcp', handler); // No /t/:tenantId prefix → no req.tenant

    const probeServer = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(noLoadApp).listen(0, () => resolve(s));
    });
    try {
      const addr = probeServer.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${addr.port}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 3 }),
      });
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toBe('loadTenant_middleware_missing');
    } finally {
      await new Promise<void>((r) => probeServer.close(() => r()));
    }
  });

  it('two requests with different tenants build two distinct McpServer instances', async () => {
    const tenant1 = 'aaaaaaaa-1111-2222-3333-444444444444';
    const tenant2 = 'bbbbbbbb-5555-6666-7777-888888888888';

    const body = (id: number) =>
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id,
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });

    await fetch(`${baseUrl}/t/${tenant1}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: body(1),
    });
    await fetch(`${baseUrl}/t/${tenant2}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: body(2),
    });

    expect(buildMcpServer).toHaveBeenCalledTimes(2);
    const firstTenantArg = buildMcpServer.mock.calls[0]?.[0] as TenantRow;
    const secondTenantArg = buildMcpServer.mock.calls[1]?.[0] as TenantRow;
    expect(firstTenantArg.id).toBe(tenant1);
    expect(secondTenantArg.id).toBe(tenant2);
    expect(firstTenantArg).not.toBe(secondTenantArg);
  });

  it('closes stale sessions even when Redis subscription cleanup fails', async () => {
    const closeTransport = vi.fn();
    const closeServer = vi.fn();
    const deleteSession = vi.fn().mockRejectedValue(new Error('redis unavailable'));
    const registry = new McpSessionRegistry({ sessionTtlMs: 1, now: () => 10_000 });
    registry.registerSession({
      tenantId: FAKE_TENANT.id,
      sessionId: 'expired-session',
      surface: 'discovery',
      capabilityProfile: undefined,
      lastSeenAt: 1_000,
      server: {
        sendToolListChanged: vi.fn(),
        sendResourceListChanged: vi.fn(),
        sendResourceUpdated: vi.fn(),
        sendPromptListChanged: vi.fn(),
        sendLoggingMessage: vi.fn(),
        close: closeServer,
      },
      transport: { close: closeTransport } as never,
    });

    const cleanupApp = express();
    cleanupApp.use(express.json());
    cleanupApp.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...FAKE_TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    cleanupApp.post(
      '/t/:tenantId/mcp',
      createStreamableHttpHandler({
        buildMcpServer,
        sessionRegistry: registry,
        resourceSubscriptions: { deleteSession } as never,
        surface: 'static',
      })
    );

    const cleanupServer = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(cleanupApp).listen(0, () => resolve(s));
    });

    try {
      const addr = cleanupServer.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${addr.port}/t/${FAKE_TENANT.id}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 11,
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'cleanup-test-client', version: '1.0.0' },
          },
        }),
      });
      await res.text();

      expect(res.status).toBe(200);
      expect(deleteSession).toHaveBeenCalledWith(FAKE_TENANT.id, 'expired-session');
      expect(closeTransport).toHaveBeenCalledTimes(1);
      expect(closeServer).toHaveBeenCalledTimes(1);
      expect(registry.getSession('expired-session')).toBeUndefined();
    } finally {
      await new Promise<void>((r) => cleanupServer.close(() => r()));
    }
  });

  it('closes expired sessions pruned by notification delivery', async () => {
    const closeTransport = vi.fn();
    const closeServer = vi.fn();
    const deleteSession = vi.fn();
    const expiredServer = {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
      sendPromptListChanged: vi.fn(),
      sendLoggingMessage: vi.fn(),
      close: closeServer,
    };
    const activeServer = {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
      sendPromptListChanged: vi.fn(),
      sendLoggingMessage: vi.fn(),
    };
    const registry = new McpSessionRegistry({ sessionTtlMs: 1, now: () => 10_000 });
    void createStreamableHttpHandler({
      buildMcpServer,
      sessionRegistry: registry,
      resourceSubscriptions: { deleteSession } as never,
      surface: 'discovery',
    });
    registry.registerSession({
      tenantId: FAKE_TENANT.id,
      sessionId: 'expired-notification-session',
      surface: 'discovery',
      capabilityProfile: undefined,
      lastSeenAt: 1_000,
      server: expiredServer,
      transport: { close: closeTransport } as never,
    });
    registry.registerSession({
      tenantId: FAKE_TENANT.id,
      sessionId: 'active-notification-session',
      surface: 'discovery',
      capabilityProfile: undefined,
      lastSeenAt: 10_000,
      server: activeServer,
      transport: { close: vi.fn() } as never,
    });

    await registry.deliverToolsListChanged(FAKE_TENANT.id);

    expect(expiredServer.sendToolListChanged).not.toHaveBeenCalled();
    expect(activeServer.sendToolListChanged).toHaveBeenCalledTimes(1);
    expect(deleteSession).toHaveBeenCalledWith(FAKE_TENANT.id, 'expired-notification-session');
    expect(closeTransport).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(registry.getSession('expired-notification-session')).toBeUndefined();
  });

  it('restores the discovery session capability profile for existing-session requests', async () => {
    const profile = {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'apps-client' },
      transport: 'streamable-http',
      surface: 'discovery',
      phase8Enabled: true,
      capabilities: {},
      enabledFeatures: ['apps'],
      disabledFeatures: [],
      fallbacks: [],
    } as never;
    let capturedProfile: unknown;
    const handleRequest = vi.fn(async (_req: unknown, res: express.Response): Promise<void> => {
      capturedProfile = requestContext.getStore()?.capabilityProfile;
      res.status(204).end();
    });
    const registry = new McpSessionRegistry({ sessionTtlMs: 5_000, now: () => 10_000 });
    registry.registerSession({
      tenantId: FAKE_TENANT.id,
      sessionId: 'profile-session',
      surface: 'discovery',
      capabilityProfile: profile,
      lastSeenAt: 10_000,
      server: {
        sendToolListChanged: vi.fn(),
        sendResourceListChanged: vi.fn(),
        sendResourceUpdated: vi.fn(),
        sendPromptListChanged: vi.fn(),
        sendLoggingMessage: vi.fn(),
        close: vi.fn(),
      },
      transport: { handleRequest, close: vi.fn() } as never,
    });

    const profileApp = express();
    profileApp.use(express.json());
    profileApp.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...FAKE_TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    profileApp.post(
      '/t/:tenantId/mcp',
      createStreamableHttpHandler({
        buildMcpServer,
        sessionRegistry: registry,
        surface: 'discovery',
      })
    );

    const profileServer = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(profileApp).listen(0, () => resolve(s));
    });

    try {
      const addr = profileServer.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${addr.port}/t/${FAKE_TENANT.id}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'Mcp-Session-Id': 'profile-session',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', id: 23 }),
      });
      await res.text();

      expect(res.status).toBe(204);
      expect(handleRequest).toHaveBeenCalledTimes(1);
      expect(capturedProfile).toBe(profile);
    } finally {
      await new Promise<void>((r) => profileServer.close(() => r()));
    }
  });

  it('keeps in-flight POST session responses alive during TTL cleanup', async () => {
    let now = 2_500;
    let markPostEntered!: () => void;
    let releasePost!: () => void;
    const postEntered = new Promise<void>((resolve) => {
      markPostEntered = resolve;
    });
    const releasePromise = new Promise<void>((resolve) => {
      releasePost = resolve;
    });
    const handleRequest = vi.fn(async (_req: unknown, res: express.Response): Promise<void> => {
      markPostEntered();
      await releasePromise;
      res.status(202).end();
    });
    const registry = new McpSessionRegistry({ sessionTtlMs: 5_000, now: () => now });
    registry.registerSession({
      tenantId: FAKE_TENANT.id,
      sessionId: 'active-post',
      surface: 'discovery',
      capabilityProfile: undefined,
      lastSeenAt: 2_000,
      server: {
        sendToolListChanged: vi.fn(),
        sendResourceListChanged: vi.fn(),
        sendResourceUpdated: vi.fn(),
        sendPromptListChanged: vi.fn(),
        sendLoggingMessage: vi.fn(),
        close: vi.fn(),
      },
      transport: { handleRequest, close: vi.fn() } as never,
    });

    const postApp = express();
    postApp.use(express.json());
    postApp.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...FAKE_TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    const handler = createStreamableHttpHandler({
      buildMcpServer,
      sessionRegistry: registry,
      surface: 'discovery',
    });
    postApp.post('/t/:tenantId/mcp', handler);
    postApp.get('/t/:tenantId/mcp', handler);

    const postServer = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(postApp).listen(0, () => resolve(s));
    });

    try {
      const addr = postServer.address() as AddressInfo;
      const pendingPost = fetch(`http://127.0.0.1:${addr.port}/t/${FAKE_TENANT.id}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'Mcp-Session-Id': 'active-post',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 21 }),
      });

      await postEntered;
      expect(registry.getSession('active-post')?.activeSseStreams).toBe(1);

      now = 10_000;
      const cleanupProbe = await fetch(`http://127.0.0.1:${addr.port}/t/${FAKE_TENANT.id}/mcp`, {
        method: 'GET',
        headers: { 'Mcp-Session-Id': 'missing-session' },
      });
      await cleanupProbe.text();

      expect(cleanupProbe.status).toBe(404);
      expect(registry.getSession('active-post')).toBeDefined();

      releasePost();
      const postResponse = await pendingPost;
      expect(postResponse.status).toBe(202);
      await postResponse.text();
      expect(registry.getSession('active-post')?.activeSseStreams).toBe(0);
    } finally {
      releasePost();
      await new Promise<void>((r) => postServer.close(() => r()));
    }
  });

  it('contains synchronous cleanup throws and labels failed cleanup steps', async () => {
    const cleanupError = new Error('transport close unavailable');
    const closeTransport = vi.fn(() => {
      throw cleanupError;
    });
    const closeServer = vi.fn();
    const deleteSession = vi.fn();
    const registry = new McpSessionRegistry({ sessionTtlMs: 1, now: () => 10_000 });
    registry.registerSession({
      tenantId: FAKE_TENANT.id,
      sessionId: 'sync-throw-session',
      surface: 'discovery',
      capabilityProfile: undefined,
      lastSeenAt: 1_000,
      server: {
        sendToolListChanged: vi.fn(),
        sendResourceListChanged: vi.fn(),
        sendResourceUpdated: vi.fn(),
        sendPromptListChanged: vi.fn(),
        sendLoggingMessage: vi.fn(),
        close: closeServer,
      },
      transport: { close: closeTransport } as never,
    });

    const cleanupApp = express();
    cleanupApp.use(express.json());
    cleanupApp.use('/t/:tenantId', (req, _res, next) => {
      (req as express.Request & { tenant?: TenantRow }).tenant = {
        ...FAKE_TENANT,
        id: req.params.tenantId,
      };
      next();
    });
    cleanupApp.post(
      '/t/:tenantId/mcp',
      createStreamableHttpHandler({
        buildMcpServer,
        sessionRegistry: registry,
        resourceSubscriptions: { deleteSession } as never,
        surface: 'static',
      })
    );

    const cleanupServer = await new Promise<http.Server>((resolve) => {
      const s = http.createServer(cleanupApp).listen(0, () => resolve(s));
    });

    try {
      const addr = cleanupServer.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${addr.port}/t/${FAKE_TENANT.id}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 22,
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'sync-cleanup-test-client', version: '1.0.0' },
          },
        }),
      });
      await res.text();

      expect(res.status).toBe(200);
      expect(deleteSession).toHaveBeenCalledWith(FAKE_TENANT.id, 'sync-throw-session');
      expect(closeTransport).toHaveBeenCalledTimes(1);
      expect(closeServer).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: FAKE_TENANT.id,
          sessionId: 'sync-throw-session',
          cleanupStep: 'transport.close',
          err: cleanupError,
        }),
        'Streamable HTTP session cleanup step failed'
      );
    } finally {
      await new Promise<void>((r) => cleanupServer.close(() => r()));
    }
  });

  it('handles repeated stateless POSTs without ServerResponse MaxListeners warnings', async () => {
    const warnings: Error[] = [];
    const onWarning = (warning: Error): void => {
      if (
        warning.name === 'MaxListenersExceededWarning' &&
        warning.message.includes('ServerResponse') &&
        warning.message.includes('finish')
      ) {
        warnings.push(warning);
      }
    };
    process.on('warning', onWarning);

    try {
      const responses = await Promise.all(
        Array.from({ length: 25 }, async (_, index) => {
          const res = await fetch(`${baseUrl}/t/${FAKE_TENANT.id}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'initialize',
              id: index + 1,
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'listener-test-client', version: '1.0.0' },
              },
            }),
          });
          await res.text();
          return res.status;
        })
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(responses).toEqual(Array.from({ length: 25 }, () => 200));
      expect(warnings).toEqual([]);
    } finally {
      process.off('warning', onWarning);
    }
  });
});

/**
 * Streamable HTTP transport handler (plan 03-09, TRANS-01; stateful
 * discovery sessions added in plan 07-08).
 *
 * Mounted at /t/:tenantId/mcp (GET + POST + DELETE). Wraps the v1 stateless Streamable
 * HTTP code path from src/server.ts but per-tenant: every request builds a
 * fresh McpServer scoped to req.tenant + the per-request token in
 * requestContext.
 *
 * Per-request server construction (TRANS-05): the same factory produces an
 * McpServer for stdio + Streamable HTTP + legacy SSE so all three expose the
 * same tool surface. Tool registration is identical across transports — only
 * the transport differs.
 *
 * Static surfaces preserve the stateless v2 contract. Discovery-mode tenant
 * surfaces use stateful MCP sessions so GET can carry live notifications.
 */
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ExpressStreamableHTTPServerTransport,
  type ExpressStreamableHTTPServerTransportOptions,
} from './express-streamable-http-transport.js';
import type { Request, Response, RequestHandler } from 'express';
import type { TenantRow } from '../tenant/tenant-row.js';
import logger from '../../logger.js';
import { requestContext } from '../../request-context.js';
import { isDiscoverySurface } from '../tenant-surface/surface.js';
import {
  buildEffectiveCapabilityProfile,
  type ClientCapabilityProfile,
  type ClientInfo,
} from '../mcp-capabilities/profile.js';
import {
  mcpSessionRegistry,
  type McpNotificationServer,
  type McpNotificationSurface,
  type McpSessionRegistry,
  type RegisteredMcpSession,
} from '../mcp-notifications/session-registry.js';
import type { RedisResourceSubscriptionStore } from '../mcp-notifications/resource-subscriptions.js';

export interface StreamableHttpDeps {
  buildMcpServer: (tenant: TenantRow) => McpServer | Promise<McpServer>;
  sessionRegistry?: McpSessionRegistry;
  resourceSubscriptions?: RedisResourceSubscriptionStore;
  surface?: McpNotificationSurface;
  createTransport?: (
    options: ExpressStreamableHTTPServerTransportOptions
  ) => ExpressStreamableHTTPServerTransport;
  phase8Enabled?: (tenant: TenantRow, surface: McpNotificationSurface) => boolean;
}

/**
 * Factory: returns an Express RequestHandler for POST+GET /t/:tenantId/mcp.
 *
 * Contract:
 *   - Expects `req.tenant` populated by upstream loadTenant middleware. If
 *     missing, responds 500 `loadTenant_middleware_missing` — the mount order
 *     is wrong and no tool call should proceed.
 *   - Static requests construct a fresh McpServer and Web-standard-backed
 *     Express transport per request. Discovery requests reuse only explicitly
 *     registered stateful sessions keyed by Mcp-Session-Id.
 *   - Registers idempotent `res.once('close', ...)` cleanup so if the client
 *     disconnects mid-response, the transport + server are torn down without
 *     stacking duplicate response listeners.
 */
export function createStreamableHttpHandler(deps: StreamableHttpDeps): RequestHandler {
  const registry = deps.sessionRegistry ?? mcpSessionRegistry;
  const createTransport =
    deps.createTransport ?? ((options) => new ExpressStreamableHTTPServerTransport(options));
  registry.setExpiredSessionCleanup((session) => closeRegisteredSession(session, deps));

  return async (req: Request, res: Response): Promise<void> => {
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(500).json({ error: 'loadTenant_middleware_missing' });
      return;
    }

    await cleanupStaleSessions(registry, deps);

    const surface = deps.surface ?? (isDiscoverySurface(tenant) ? 'discovery' : 'static');
    const profile = profileFromInitialize(req, tenant, surface, deps);
    if (surface !== 'discovery') {
      await handleStatelessRequest(req, res, tenant, deps, profile);
      return;
    }

    const requestedSessionId = getSessionId(req);
    if (requestedSessionId) {
      const session = registry.getSession(requestedSessionId);
      if (!session || session.tenantId !== tenant.id || session.surface !== 'discovery') {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
          id: null,
        });
        return;
      }

      const tracksActiveResponse = req.method === 'GET' || req.method === 'POST';
      if (tracksActiveResponse) {
        registry.openSseStream(requestedSessionId);
      } else {
        registry.touchSession(requestedSessionId);
      }

      try {
        const existingCtx = requestContext.getStore() ?? {};
        await requestContext.run(
          {
            ...existingCtx,
            capabilityProfile: session.capabilityProfile ?? existingCtx.capabilityProfile,
          },
          async () => {
            await session.transport.handleRequest(
              req as unknown as Parameters<typeof session.transport.handleRequest>[0],
              res as unknown as Parameters<typeof session.transport.handleRequest>[1],
              req.body
            );
          }
        );
      } catch (err) {
        handleTransportError(res, err, tenant.id);
      } finally {
        if (tracksActiveResponse) registry.closeSseStream(requestedSessionId);
      }
      return;
    }

    const server = await deps.buildMcpServer(tenant);
    const notificationServer: McpNotificationServer = {
      sendToolListChanged: () => server.sendToolListChanged(),
      sendResourceListChanged: () => server.sendResourceListChanged(),
      sendResourceUpdated: (params) => server.server.sendResourceUpdated(params),
      sendPromptListChanged: () => server.sendPromptListChanged(),
      sendLoggingMessage: (message, sessionId) => server.sendLoggingMessage(message, sessionId),
      close: () => server.close(),
    };
    const cleanupSession = oncePerKey(async (sessionId: string): Promise<void> => {
      const session = registry.unregisterSession(sessionId);
      if (!session) return;
      await closeRegisteredSession(session, deps);
    });
    const transport = createTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: (sessionId) => {
        registry.registerSession({
          tenantId: tenant.id,
          sessionId,
          server: notificationServer,
          transport,
          surface: 'discovery',
          capabilityProfile: profile,
        });
      },
      onsessionclosed: cleanupSession,
    });
    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) void cleanupSession(sessionId);
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(
        req as unknown as Parameters<typeof transport.handleRequest>[0],
        res as unknown as Parameters<typeof transport.handleRequest>[1],
        req.body
      );
      if (!transport.sessionId) {
        await Promise.all([transport.close(), server.close()]);
      }
    } catch (err) {
      await Promise.allSettled([transport.close(), server.close()]);
      handleTransportError(res, err, tenant.id);
    }
  };
}

async function handleStatelessRequest(
  req: Request,
  res: Response,
  tenant: TenantRow,
  deps: StreamableHttpDeps,
  _profile: ClientCapabilityProfile
): Promise<void> {
  const server = await deps.buildMcpServer(tenant);
  const transport = new ExpressStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const cleanup = onceAsync(() =>
    Promise.all([transport.close(), server.close()]).then(() => undefined)
  );
  res.once('close', () => {
    void cleanup();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(
      req as unknown as Parameters<typeof transport.handleRequest>[0],
      res as unknown as Parameters<typeof transport.handleRequest>[1],
      req.body
    );
  } catch (err) {
    handleTransportError(res, err, tenant.id);
  }
}

async function cleanupStaleSessions(
  registry: McpSessionRegistry,
  deps: StreamableHttpDeps
): Promise<void> {
  const stale = [...registry.takeExpiredSessions(), ...registry.takeOverflowSessions()];
  if (stale.length === 0) return;

  await Promise.all(stale.map((session) => closeRegisteredSession(session, deps)));
}

async function closeRegisteredSession(
  session: RegisteredMcpSession,
  deps: StreamableHttpDeps
): Promise<void> {
  const cleanupSteps: Array<{ cleanupStep: string; run: () => void | Promise<void> }> = [
    {
      cleanupStep: 'resourceSubscriptions.deleteSession',
      run: () => deps.resourceSubscriptions?.deleteSession(session.tenantId, session.sessionId),
    },
    { cleanupStep: 'transport.close', run: () => session.transport.close() },
    { cleanupStep: 'server.close', run: () => session.server.close?.() },
  ];
  const cleanupResults = await Promise.allSettled(
    cleanupSteps.map((step) => Promise.resolve().then(step.run))
  );

  for (const [index, result] of cleanupResults.entries()) {
    if (result.status === 'rejected') {
      logger.warn(
        {
          tenantId: session.tenantId,
          sessionId: session.sessionId,
          cleanupStep: cleanupSteps[index]?.cleanupStep,
          err: result.reason,
        },
        'Streamable HTTP session cleanup step failed'
      );
    }
  }
}

function onceAsync<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  let called = false;
  return async (...args: T) => {
    if (called) return;
    called = true;
    await fn(...args);
  };
}

function oncePerKey<T>(fn: (key: T) => Promise<void>): (key: T) => Promise<void> {
  const pending = new Set<T>();
  return async (key: T) => {
    if (pending.has(key)) return;
    pending.add(key);
    try {
      await fn(key);
    } finally {
      pending.delete(key);
    }
  };
}

function getSessionId(req: Request): string | undefined {
  const value = req.get('mcp-session-id') ?? req.get('Mcp-Session-Id');
  if (!value) return undefined;
  return value;
}

function profileFromInitialize(
  req: Request,
  tenant: TenantRow,
  surface: McpNotificationSurface,
  deps: StreamableHttpDeps
): ClientCapabilityProfile {
  const body = req.body as { method?: unknown; params?: Record<string, unknown> } | undefined;
  const params = body?.method === 'initialize' ? body.params : undefined;
  const clientInfo = isClientInfo(params?.clientInfo);
  const phase8Enabled = deps.phase8Enabled?.(tenant, surface) ?? surface === 'discovery';
  return buildEffectiveCapabilityProfile({
    protocolVersion:
      typeof params?.protocolVersion === 'string' ? params.protocolVersion : undefined,
    clientInfo,
    advertisedCapabilities: isRecord(params?.capabilities) ? params.capabilities : {},
    transport: 'streamable-http',
    surface,
    tenantPolicy: { phase8Enabled },
  });
}

function isClientInfo(value: unknown): ClientInfo | undefined {
  if (!isRecord(value)) return undefined;
  return {
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    ...(typeof value.version === 'string' ? { version: value.version } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function handleTransportError(res: Response, err: unknown, tenantId: string): void {
  logger.error({ err: (err as Error).message, tenantId }, 'Streamable HTTP transport failed');
  if (!res.headersSent) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal server error' },
      id: null,
    });
  }
}

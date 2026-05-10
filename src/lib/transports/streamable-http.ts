/**
 * Streamable HTTP transport handler (plan 03-09, TRANS-01; stateful
 * discovery sessions added in plan 07-08).
 *
 * Mounted at /t/:tenantId/mcp (GET + POST). Wraps the v1 stateless Streamable
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
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Request, Response, RequestHandler } from 'express';
import type { TenantRow } from '../tenant/tenant-row.js';
import logger from '../../logger.js';
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
} from '../mcp-notifications/session-registry.js';
import type { RedisResourceSubscriptionStore } from '../mcp-notifications/resource-subscriptions.js';

export interface StreamableHttpDeps {
  buildMcpServer: (tenant: TenantRow) => McpServer | Promise<McpServer>;
  sessionRegistry?: McpSessionRegistry;
  resourceSubscriptions?: RedisResourceSubscriptionStore;
  surface?: McpNotificationSurface;
  createTransport?: (
    options: StreamableHTTPServerTransportOptions
  ) => StreamableHTTPServerTransport;
  phase8Enabled?: (tenant: TenantRow, surface: McpNotificationSurface) => boolean;
}

/**
 * Factory: returns an Express RequestHandler for POST+GET /t/:tenantId/mcp.
 *
 * Contract:
 *   - Expects `req.tenant` populated by upstream loadTenant middleware. If
 *     missing, responds 500 `loadTenant_middleware_missing` — the mount order
 *     is wrong and no tool call should proceed.
 *   - Constructs a fresh McpServer AND a fresh StreamableHTTPServerTransport
 *     per request. Both are cheap to allocate; keeping them per-request means
 *     no shared state leaks across tenants (TENANT-04 isolation).
 *   - Registers `res.on('close', ...)` cleanup so if the client disconnects
 *     mid-response, the transport + server are torn down immediately rather
 *     than leaking handles.
 */
export function createStreamableHttpHandler(deps: StreamableHttpDeps): RequestHandler {
  const registry = deps.sessionRegistry ?? mcpSessionRegistry;
  const createTransport =
    deps.createTransport ?? ((options) => new StreamableHTTPServerTransport(options));

  return async (req: Request, res: Response): Promise<void> => {
    const tenant = (req as Request & { tenant?: TenantRow }).tenant;
    if (!tenant) {
      res.status(500).json({ error: 'loadTenant_middleware_missing' });
      return;
    }

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

      try {
        await session.transport.handleRequest(
          req as unknown as Parameters<typeof session.transport.handleRequest>[0],
          res as unknown as Parameters<typeof session.transport.handleRequest>[1],
          req.body
        );
      } catch (err) {
        handleTransportError(res, err, tenant.id);
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
    const cleanupSession = async (sessionId: string): Promise<void> => {
      const session = registry.unregisterSession(sessionId);
      if (!session) return;
      await deps.resourceSubscriptions?.deleteSession(session.tenantId, sessionId);
      await session.server.close?.();
    };
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
    } catch (err) {
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
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
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

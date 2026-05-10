import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ResourceUpdatedNotification } from '@modelcontextprotocol/sdk/types.js';
import logger from '../../logger.js';
import type { ClientCapabilityProfile } from '../mcp-capabilities/profile.js';
import { AGENTIC_EVENTS_CHANNEL, type AgenticEvent, type McpLogMessage } from './events.js';
import {
  defaultResourceNotificationCoalescer,
  type ResourceNotificationCoalescer,
} from './coalesce.js';
import { clearSessionLogLevel, shouldEmitToSession } from '../mcp-logging/session-log-level.js';

export type McpNotificationSurface = 'discovery' | 'static';

export interface McpNotificationServer {
  sendToolListChanged(): void | Promise<void>;
  sendResourceListChanged(): void | Promise<void>;
  sendResourceUpdated(params: ResourceUpdatedNotification['params']): void | Promise<void>;
  sendPromptListChanged(): void | Promise<void>;
  sendLoggingMessage(message: McpLogMessage, sessionId?: string): void | Promise<void>;
  close?: () => void | Promise<void>;
}

export interface RegisteredMcpSession {
  tenantId: string;
  sessionId: string;
  server: McpNotificationServer;
  transport: StreamableHTTPServerTransport;
  surface: McpNotificationSurface;
  capabilityProfile?: ClientCapabilityProfile;
}

export type RegisterSessionInput = RegisteredMcpSession;

export interface RedisSubscriberLike {
  subscribe(...channels: string[]): Promise<unknown>;
  on(event: 'message', listener: (...args: unknown[]) => void): unknown;
}

export interface RedisWithOptionalDuplicate {
  subscribe?: (...channels: string[]) => Promise<unknown>;
  on?: (event: 'message', listener: (...args: unknown[]) => void) => unknown;
  duplicate?: () => unknown;
}

export type ResourceSubscriptionChecker = (
  tenantId: string,
  sessionId: string,
  uri: string
) => boolean | Promise<boolean>;

export interface McpSessionRegistryOptions {
  coalescer?: ResourceNotificationCoalescer;
  isResourceSubscribed?: ResourceSubscriptionChecker;
}

export class McpSessionRegistry {
  private readonly sessions = new Map<string, RegisteredMcpSession>();
  private readonly coalescer: ResourceNotificationCoalescer;
  private isResourceSubscribed?: ResourceSubscriptionChecker;

  constructor(options: McpSessionRegistryOptions = {}) {
    this.coalescer = options.coalescer ?? defaultResourceNotificationCoalescer;
    this.isResourceSubscribed = options.isResourceSubscribed;
  }

  setResourceSubscriptionChecker(checker: ResourceSubscriptionChecker | undefined): void {
    this.isResourceSubscribed = checker;
  }

  registerSession(input: RegisterSessionInput): RegisteredMcpSession {
    this.sessions.set(input.sessionId, input);
    return input;
  }

  getSession(sessionId: string): RegisteredMcpSession | undefined {
    return this.sessions.get(sessionId);
  }

  unregisterSession(sessionId: string): RegisteredMcpSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      clearSessionLogLevel(sessionId);
      this.sessions.delete(sessionId);
      this.coalescer.clearSession(session.tenantId, sessionId);
    }
    return session;
  }

  async deliverToolsListChanged(tenantId: string): Promise<void> {
    await Promise.all(
      this.matchingDiscoverySessions(tenantId).map((session) =>
        Promise.resolve(session.server.sendToolListChanged())
      )
    );
  }

  async deliverResourcesListChanged(tenantId: string): Promise<void> {
    await Promise.all(
      this.matchingDiscoverySessions(tenantId).map((session) =>
        Promise.resolve(session.server.sendResourceListChanged())
      )
    );
  }

  async deliverPromptsListChanged(tenantId: string): Promise<void> {
    await Promise.all(
      this.matchingDiscoverySessions(tenantId).map((session) =>
        Promise.resolve(session.server.sendPromptListChanged())
      )
    );
  }

  async deliverResourceUpdated(
    tenantId: string,
    uris: readonly string[],
    metadata: { reason?: string; source?: string; changeType?: string } = {}
  ): Promise<void> {
    const sends: Array<Promise<void>> = [];
    for (const session of this.matchingDiscoverySessions(tenantId)) {
      for (const uri of uris) {
        if (this.isResourceSubscribed) {
          const subscribed = await this.isResourceSubscribed(tenantId, session.sessionId, uri);
          if (!subscribed) continue;
        }
        if (!this.coalescer.shouldDeliver(tenantId, session.sessionId, uri, metadata.changeType)) {
          continue;
        }
        const params = resourceUpdatedParams(uri, metadata);
        sends.push(Promise.resolve(session.server.sendResourceUpdated(params)));
      }
    }
    await Promise.all(sends);
  }

  async deliverLoggingMessage(tenantId: string, message: McpLogMessage): Promise<void> {
    await Promise.all(
      this.matchingDiscoverySessions(tenantId)
        .filter((session) => shouldEmitToSession(session.sessionId, message.level))
        .map((session) => session.server.sendLoggingMessage(message, session.sessionId))
    );
  }

  listSessions(): RegisteredMcpSession[] {
    return [...this.sessions.values()];
  }

  private matchingDiscoverySessions(tenantId: string): RegisteredMcpSession[] {
    return [...this.sessions.values()].filter(
      (session) => session.tenantId === tenantId && session.surface === 'discovery'
    );
  }
}

export const mcpSessionRegistry = new McpSessionRegistry();

export function registerSession(input: RegisterSessionInput): RegisteredMcpSession {
  return mcpSessionRegistry.registerSession(input);
}

export function getSession(sessionId: string): RegisteredMcpSession | undefined {
  return mcpSessionRegistry.getSession(sessionId);
}

export function unregisterSession(sessionId: string): RegisteredMcpSession | undefined {
  return mcpSessionRegistry.unregisterSession(sessionId);
}

export function duplicateRedisForAgenticSubscription(
  redis: RedisWithOptionalDuplicate
): RedisSubscriberLike {
  if (typeof redis.duplicate === 'function') {
    const duplicate = redis.duplicate();
    if (isRedisSubscriber(duplicate)) {
      return duplicate;
    }
  }
  if (isRedisSubscriber(redis)) {
    return redis;
  }
  throw new Error('Redis subscriber must expose subscribe/on or duplicate()');
}

export async function subscribeToAgenticEvents(
  redis: RedisWithOptionalDuplicate,
  registry: McpSessionRegistry = mcpSessionRegistry
): Promise<RedisSubscriberLike> {
  const subscriber = duplicateRedisForAgenticSubscription(redis);
  await subscriber.subscribe(AGENTIC_EVENTS_CHANNEL);
  subscriber.on('message', (...args) => {
    const [channel, message] = args;
    if (typeof channel !== 'string' || typeof message !== 'string') return;
    if (channel !== AGENTIC_EVENTS_CHANNEL) return;
    void dispatchAgenticEvent(registry, message);
  });
  return subscriber;
}

async function dispatchAgenticEvent(registry: McpSessionRegistry, message: string): Promise<void> {
  let event: AgenticEvent;
  try {
    event = JSON.parse(message) as AgenticEvent;
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, messageLength: message.length },
      'mcp-notifications: malformed agentic event ignored'
    );
    return;
  }

  try {
    switch (event.type) {
      case 'tools/list_changed':
        await registry.deliverToolsListChanged(event.tenantId);
        return;
      case 'resources/list_changed':
        await registry.deliverResourcesListChanged(event.tenantId);
        return;
      case 'prompts/list_changed':
        await registry.deliverPromptsListChanged(event.tenantId);
        return;
      case 'resources/updated':
        await registry.deliverResourceUpdated(event.tenantId, event.uris, {
          reason: event.reason,
          source: event.source,
          changeType: event.changeType,
        });
        return;
      case 'logging/message':
        await registry.deliverLoggingMessage(event.tenantId, event.message);
        return;
      case 'progress':
      case 'cancelled':
        return;
    }
  } catch (err) {
    logger.error(
      { tenantId: event.tenantId, type: event.type, err: (err as Error).message },
      'mcp-notifications: event delivery failed'
    );
  }
}

function resourceUpdatedParams(
  uri: string,
  metadata: { reason?: string; source?: string; changeType?: string }
): ResourceUpdatedNotification['params'] {
  const meta = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;
  return Object.keys(meta).length > 0
    ? ({ uri, _meta: meta } as ResourceUpdatedNotification['params'])
    : { uri };
}

function isRedisSubscriber(value: unknown): value is RedisSubscriberLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'subscribe' in value &&
    typeof value.subscribe === 'function' &&
    'on' in value &&
    typeof value.on === 'function'
  );
}

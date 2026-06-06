import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ErrorCode,
  LoggingLevelSchema,
  McpError,
  SetLevelRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import logger from '../../logger.js';
import { getRedis } from '../redis.js';
import {
  publishMcpLogMessage,
  type McpLogLevel,
  type RedisFacade,
} from '../mcp-notifications/events.js';
import {
  mcpSessionRegistry,
  type McpSessionRegistry,
} from '../mcp-notifications/session-registry.js';
import { setSessionLogLevel } from './session-log-level.js';

export type McpLogEventName =
  | 'tool-call.start'
  | 'tool-call.success'
  | 'tool-call.error'
  | 'bookmark.created'
  | 'recipe.saved'
  | 'fact.recorded'
  | 'bulk-action.preview'
  | 'bulk-action.execute.plan'
  | 'bulk-action.confirmation_required'
  | 'bulk-action.confirmation_mismatch'
  | 'bulk-action.execute.start'
  | 'bulk-action.execute.complete'
  | 'bulk-action.result_stored'
  | 'bulk-action.result_read'
  | 'bulk-action.result_read_denied';

export interface RegisterMcpLoggingDeps {
  registry?: McpSessionRegistry;
}

export interface EmitMcpLogEventInput {
  tenantId?: string;
  event: McpLogEventName;
  level: McpLogLevel;
  data?: Record<string, unknown>;
  redis?: RedisFacade;
}

export function registerMcpLogging(server: McpServer, deps: RegisterMcpLoggingDeps = {}): void {
  const registry = deps.registry ?? mcpSessionRegistry;
  server.server.registerCapabilities({ logging: {} });
  server.server.setRequestHandler(SetLevelRequestSchema, async (request, extra) => {
    const sessionId = extra.sessionId;
    if (!sessionId || !registry.getSession(sessionId)) {
      throw new McpError(ErrorCode.InvalidParams, 'logging/setLevel requires an active session.', {
        code: 'session_required',
      });
    }

    const parsed = LoggingLevelSchema.safeParse(request.params.level);
    if (!parsed.success) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid logging level.', {
        code: 'invalid_log_level',
      });
    }

    setSessionLogLevel(sessionId, parsed.data);
    return {};
  });
}

export async function emitMcpLogEvent(input: EmitMcpLogEventInput): Promise<void> {
  if (!input.tenantId) return;

  try {
    await publishMcpLogMessage(input.redis ?? getRedis(), input.tenantId, {
      level: input.level,
      logger: 'ms365-mcp',
      data: redactLogData(input.event, input.data ?? {}),
    });
  } catch (err) {
    logger.warn(
      { tenantId: input.tenantId, event: input.event, err: (err as Error).message },
      'mcp-logging: failed to publish log notification'
    );
  }
}

function redactLogData(
  event: McpLogEventName,
  data: Record<string, unknown>
): Record<string, unknown> {
  switch (event) {
    case 'tool-call.start':
      return {
        event,
        alias: stringValue(data.alias),
        method: stringValue(data.method),
        paramKeys: stringArray(data.paramKeys),
      };
    case 'tool-call.success':
      return {
        event,
        alias: stringValue(data.alias),
        durationMs: numberValue(data.durationMs),
        bytes: numberValue(data.bytes),
      };
    case 'tool-call.error':
      return {
        event,
        alias: stringValue(data.alias),
        durationMs: numberValue(data.durationMs),
        code: stringValue(data.code) ?? 'tool_error',
      };
    case 'bookmark.created':
      return {
        event,
        alias: stringValue(data.alias),
        hasLabel: Boolean(data.hasLabel),
      };
    case 'recipe.saved':
      return {
        event,
        name: stringValue(data.name),
        alias: stringValue(data.alias),
      };
    case 'fact.recorded':
      return {
        event,
        scope: stringValue(data.scope),
      };
    case 'bulk-action.preview':
    case 'bulk-action.execute.plan':
    case 'bulk-action.confirmation_required':
    case 'bulk-action.confirmation_mismatch':
    case 'bulk-action.execute.start':
    case 'bulk-action.execute.complete':
    case 'bulk-action.result_stored':
    case 'bulk-action.result_read':
    case 'bulk-action.result_read_denied':
      return {
        event,
        digestPrefix: stringValue(data.digestPrefix),
        resultIdPrefix: stringValue(data.resultIdPrefix),
        itemCount: numberValue(data.itemCount),
        outputMode: stringValue(data.outputMode),
        requiresConfirmation:
          typeof data.requiresConfirmation === 'boolean' ? data.requiresConfirmation : undefined,
        successCount: numberValue(data.successCount),
        failureCount: numberValue(data.failureCount),
        stored: typeof data.stored === 'boolean' ? data.stored : undefined,
        code: stringValue(data.code),
      };
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === 'string');
  return strings.length > 0 ? strings : undefined;
}

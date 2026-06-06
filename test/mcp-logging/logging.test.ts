import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../../src/request-context.js';
import { registerDiscoveryTools } from '../../src/graph-tools.js';
import logger from '../../src/logger.js';
import { registerBookmarkTools } from '../../src/lib/memory/bookmark-tools.js';
import { registerRecipeTools } from '../../src/lib/memory/recipe-tools.js';
import { registerFactTools } from '../../src/lib/memory/fact-tools.js';
import { MemoryRedisFacade } from '../../src/lib/redis-facade.js';
import { __setRedisForTesting } from '../../src/lib/redis.js';
import {
  McpSessionRegistry,
  subscribeToAgenticEvents,
} from '../../src/lib/mcp-notifications/session-registry.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../../src/lib/tenant-surface/surface.js';
import { registerMcpLogging, emitMcpLogEvent } from '../../src/lib/mcp-logging/register.js';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const SESSION_A = 'session-a';
const SESSION_B = 'session-b';

const memoryMocks = vi.hoisted(() => ({
  upsertBookmark: vi.fn(),
  saveRecipe: vi.fn(),
  recordFact: vi.fn(),
  bodySchema: {
    safeParse(value: unknown) {
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as { content?: unknown }).content === 'string'
      ) {
        return { success: true, data: value };
      }
      return {
        success: false,
        error: {
          issues: [{ path: ['content'], code: 'invalid_type', message: 'Expected string' }],
        },
      };
    },
  },
}));

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'me.sendMail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send mail as the signed-in user.',
        parameters: [{ name: 'body', type: 'Body', schema: memoryMocks.bodySchema }],
      },
    ],
  },
}));

vi.mock('../../src/lib/memory/bookmarks.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/memory/bookmarks.js')>()),
  upsertBookmark: memoryMocks.upsertBookmark,
  getBookmarkCountsByAlias: vi.fn(async () => new Map()),
}));

vi.mock('../../src/lib/memory/recipes.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/memory/recipes.js')>()),
  saveRecipe: memoryMocks.saveRecipe,
}));

vi.mock('../../src/lib/memory/facts.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/memory/facts.js')>()),
  recordFact: memoryMocks.recordFact,
}));

interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface RequestHandlerExtra {
  sessionId?: string;
  requestId: string;
  sendNotification: ReturnType<typeof vi.fn>;
  sendRequest: ReturnType<typeof vi.fn>;
}

function discoveryContext() {
  return {
    tenantId: TENANT_A,
    enabledToolsSet: new Set([...DISCOVERY_META_TOOL_NAMES, 'me.sendMail']),
    enabledToolsExplicit: true,
    presetVersion: DISCOVERY_PRESET_VERSION,
  };
}

function makeExtra(sessionId?: string): RequestHandlerExtra {
  return {
    sessionId,
    requestId: 'test',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };
}

function registeredTool(server: McpServer, name: string) {
  const tool = (
    server as unknown as {
      _registeredTools: Record<
        string,
        { handler: (args: unknown, extra: RequestHandlerExtra) => Promise<CallToolResult> }
      >;
    }
  )._registeredTools[name];
  if (!tool) throw new Error(`tool ${name} not registered`);
  return tool.handler;
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
  sessionId = SESSION_A
): Promise<CallToolResult> {
  return registeredTool(server, name)(args, makeExtra(sessionId));
}

function setLevelHandler(server: McpServer) {
  const handler = (
    server.server as unknown as {
      _requestHandlers: Map<string, (req: unknown, extra: RequestHandlerExtra) => Promise<unknown>>;
    }
  )._requestHandlers.get('logging/setLevel');
  if (!handler) throw new Error('logging/setLevel handler not registered');
  return (level: string, sessionId?: string) =>
    handler({ method: 'logging/setLevel', params: { level } }, makeExtra(sessionId));
}

function registerSession(registry: McpSessionRegistry, tenantId: string, sessionId: string) {
  const sendLoggingMessage = vi.fn(async () => undefined);
  registry.registerSession({
    tenantId,
    sessionId,
    surface: 'discovery',
    server: {
      sendLoggingMessage,
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
    },
    transport: {} as never,
  });
  return sendLoggingMessage;
}

function loggedPayloads(sendLoggingMessage: ReturnType<typeof vi.fn>) {
  return sendLoggingMessage.mock.calls.map((call) => call[0] as { data: Record<string, unknown> });
}

async function createLoggingHarness() {
  const redis = new MemoryRedisFacade();
  __setRedisForTesting(redis);
  const registry = new McpSessionRegistry();
  await subscribeToAgenticEvents(redis, registry);

  const server = new McpServer({ name: 'logging-test', version: '0.0.0' });
  registerMcpLogging(server, { registry });
  return {
    redis,
    registry,
    server,
    setLevel: setLevelHandler(server),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  memoryMocks.upsertBookmark.mockResolvedValue({
    alias: 'me.sendMail',
    note: 'secret bookmark note',
  });
  memoryMocks.saveRecipe.mockResolvedValue({
    name: 'send status',
    alias: 'me.sendMail',
    params: { body: { content: 'secret recipe body' } },
    note: 'secret recipe note',
  });
  memoryMocks.recordFact.mockResolvedValue({
    scope: 'mailbox',
    content: 'secret fact content',
  });
});

afterEach(() => {
  __setRedisForTesting(null);
});

describe('Phase 7 Plan 07-09 Task 1 - MCP logging', () => {
  it('logging/setLevel stores MCP log levels by active session id only', async () => {
    const { registry, setLevel } = await createLoggingHarness();
    const sendA = registerSession(registry, TENANT_A, SESSION_A);
    const sendB = registerSession(registry, TENANT_A, SESSION_B);

    await setLevel('debug', SESSION_A);
    await setLevel('warning', SESSION_B);
    await expect(setLevel('info', 'missing-session')).rejects.toMatchObject({
      data: { code: 'session_required' },
    });

    await emitMcpLogEvent({
      tenantId: TENANT_A,
      event: 'tool-call.start',
      level: 'info',
      data: { alias: 'me.sendMail' },
    });

    expect(loggedPayloads(sendA).map((message) => message.data.event)).toEqual(['tool-call.start']);
    expect(sendB).not.toHaveBeenCalled();
  });

  it('registered discovery execute-tool emits start, success, and error with per-session level filtering', async () => {
    const { registry, setLevel } = await createLoggingHarness();
    const sendA = registerSession(registry, TENANT_A, SESSION_A);
    const sendB = registerSession(registry, TENANT_A, SESSION_B);
    await setLevel('debug', SESSION_A);
    await setLevel('warning', SESSION_B);

    const graphClient = {
      graphRequest: vi
        .fn()
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
        })
        .mockRejectedValueOnce(
          Object.assign(new Error('raw-token-123 should stay private'), {
            code: 'GraphFailure',
          })
        ),
    };
    const server = new McpServer({ name: 'tool-logging-test', version: '0.0.0' });
    registerDiscoveryTools(server, graphClient as never, false, true);

    await requestContext.run(discoveryContext(), () =>
      callTool(server, 'execute-tool', {
        tool_name: 'me.sendMail',
        parameters: {
          body: { content: 'private request body' },
          access_token: 'raw-token-123',
        },
      })
    );
    const loggerError = vi.spyOn(logger, 'error');
    const failedResult = await requestContext.run(discoveryContext(), () =>
      callTool(server, 'execute-tool', {
        tool_name: 'me.sendMail',
        parameters: { body: { content: 'private failure body' } },
      })
    );

    const errorResponse = JSON.stringify(failedResult);
    expect(errorResponse).not.toContain('raw-token-123');
    expect(errorResponse).not.toContain('private failure body');
    expect(errorResponse).toContain('GraphFailure');
    const loggerCalls = JSON.stringify(loggerError.mock.calls);
    expect(loggerCalls).not.toContain('raw-token-123');
    expect(loggerCalls).not.toContain('private failure body');
    loggerError.mockRestore();

    const eventsA = loggedPayloads(sendA).map((message) => message.data.event);
    expect(eventsA).toContain('tool-call.start');
    expect(eventsA).toContain('tool-call.success');
    expect(eventsA).toContain('tool-call.error');

    const eventsB = loggedPayloads(sendB).map((message) => message.data.event);
    expect(eventsB).toEqual(['tool-call.error']);

    const serialized = JSON.stringify(loggedPayloads(sendA));
    expect(serialized).not.toContain('raw-token-123');
    expect(serialized).not.toContain('private request body');
    expect(serialized).not.toContain('private failure body');
  });

  it('registered discovery execute-tool rejects invalid request bodies before Graph dispatch', async () => {
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
      }),
    };
    const server = new McpServer({ name: 'tool-validation-test', version: '0.0.0' });
    registerDiscoveryTools(server, graphClient as never, false, true);

    const result = await requestContext.run(discoveryContext(), () =>
      callTool(server, 'execute-tool', {
        tool_name: 'me.sendMail',
        parameters: { body: { content: 123 } },
      })
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('parameter_validation_failed');
    expect(graphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('registered bookmark, recipe, and fact tools emit curated success logs after writes', async () => {
    const { registry, setLevel } = await createLoggingHarness();
    const sendA = registerSession(registry, TENANT_A, SESSION_A);
    await setLevel('info', SESSION_A);

    const server = new McpServer({ name: 'memory-logging-test', version: '0.0.0' });
    registerBookmarkTools(server, { redis: new MemoryRedisFacade() as never });
    registerRecipeTools(server, {
      redis: new MemoryRedisFacade() as never,
      graphClient: {} as never,
    });
    registerFactTools(server, { redis: new MemoryRedisFacade() as never });

    await requestContext.run(discoveryContext(), async () => {
      await callTool(server, 'bookmark-tool', {
        alias: 'me.sendMail',
        note: 'secret bookmark note',
      });
      await callTool(server, 'save-recipe', {
        name: 'send status',
        alias: 'me.sendMail',
        params: { body: { content: 'secret recipe body' } },
        note: 'secret recipe note',
      });
      await callTool(server, 'record-fact', {
        scope: 'mailbox',
        fact: 'secret fact content',
      });
    });

    const events = loggedPayloads(sendA).map((message) => message.data.event);
    expect(events).toEqual(['bookmark.created', 'recipe.saved', 'fact.recorded']);
    expect(memoryMocks.upsertBookmark).toHaveBeenCalled();
    expect(memoryMocks.saveRecipe).toHaveBeenCalled();
    expect(memoryMocks.recordFact).toHaveBeenCalled();

    const serialized = JSON.stringify(loggedPayloads(sendA));
    expect(serialized).not.toContain('secret bookmark note');
    expect(serialized).not.toContain('secret recipe note');
    expect(serialized).not.toContain('secret recipe body');
    expect(serialized).not.toContain('secret fact content');
  });

  it('bulk-action log events publish curated data without raw result handles', async () => {
    const { registry, setLevel } = await createLoggingHarness();
    const sendA = registerSession(registry, TENANT_A, SESSION_A);
    await setLevel('info', SESSION_A);

    await emitMcpLogEvent({
      tenantId: TENANT_A,
      event: 'bulk-action.result_read',
      level: 'info',
      data: {
        resultId: 'bulk_raw-secret-handle',
        resultIdPrefix: 'abc123def456',
        itemCount: 2,
        rawPayload: { body: 'private body' },
      },
    });

    const payloads = loggedPayloads(sendA);
    expect(payloads).toEqual([
      {
        data: {
          event: 'bulk-action.result_read',
          resultIdPrefix: 'abc123def456',
          itemCount: 2,
        },
        level: 'info',
        logger: 'ms365-mcp',
      },
    ]);
    const serialized = JSON.stringify(payloads);
    expect(serialized).not.toContain('bulk_raw-secret-handle');
    expect(serialized).not.toContain('private body');
  });

  it('session log levels are cleared when unregisterSession removes a session', async () => {
    const { registry, setLevel } = await createLoggingHarness();
    registerSession(registry, TENANT_B, SESSION_A);
    await setLevel('warning', SESSION_A);
    registry.unregisterSession(SESSION_A);

    const sendA = registerSession(registry, TENANT_B, SESSION_A);
    await emitMcpLogEvent({
      tenantId: TENANT_B,
      event: 'tool-call.success',
      level: 'info',
      data: { alias: 'me.sendMail', durationMs: 1 },
    });

    expect(loggedPayloads(sendA).map((message) => message.data.event)).toEqual([
      'tool-call.success',
    ]);
  });
});

/**
 * Plan 05-04 Task 2 — dispatch-enforcement integration tests.
 *
 * Exercises the full dispatch gate inside `executeGraphTool`:
 *   - Tenant with NULL enabled_tools + essentials preset: preset tools dispatch;
 *     non-preset tools reject with MCP tool error (NOT HTTP 403).
 *   - Beta tool invocation (starts with `__beta__`) emits a structured pino
 *     info log with `{beta: true, toolAlias, tenantId}`.
 *
 * Strategy: register tools on a real `McpServer`, drive them via the SDK's
 * handler closure to exercise the end-to-end dispatch path. GraphClient is
 * mocked to return 200; requestContext is seeded via `requestContext.run`
 * around the handler invocation (mirroring what server.ts does in HTTP
 * mode).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type GraphClient from '../../src/graph-client.js';

vi.mock('../../src/logger.js', async () => {
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const debug = vi.fn();
  return {
    default: { info, warn, error, debug },
    rawPinoLogger: { info, warn, error, debug },
    enableConsoleLogging: vi.fn(),
    __mocks: { info, warn, error, debug },
  };
});

// Fixture registry: one preset tool, one non-preset tool, one __beta__ tool.
vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'mail-send',
        method: 'POST',
        path: '/me/sendMail',
        description: 'Send mail',
        parameters: [],
      },
      {
        alias: 'other-op',
        method: 'GET',
        path: '/other',
        description: 'Other op',
        parameters: [],
      },
      {
        alias: '__beta__security-alerts-list',
        method: 'GET',
        path: '/security/alerts_v2',
        description: 'Beta security alerts',
        parameters: [],
      },
    ],
  },
}));

// Stub preset-loader: preset contains only `mail-send`.
vi.mock('../../src/lib/tool-selection/preset-loader.js', () => {
  const PRESET = Object.freeze(new Set<string>(['mail-send']));
  const EMPTY = Object.freeze(new Set<string>());
  return {
    ESSENTIALS_V1_OPS: PRESET,
    DEFAULT_PRESET_VERSION: 'essentials-v1',
    presetFor: (version: string): ReadonlySet<string> =>
      version === 'essentials-v1' ? PRESET : EMPTY,
  };
});

function makeGraphClient(): GraphClient {
  return {
    graphRequest: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
    }),
  } as unknown as GraphClient;
}

/**
 * Capture the handler closure that registerGraphTools registers for a given
 * tool alias. We spy on McpServer.tool to grab the 5th argument (handler).
 */
function captureHandlers(
  registerGraphTools: typeof import('../../src/graph-tools.js').registerGraphTools
) {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const handlers = new Map<
    string,
    (args: Record<string, unknown>) => Promise<{ content: unknown[]; isError?: boolean }>
  >();
  const toolSpy = vi.spyOn(server, 'tool').mockImplementation(((
    name: string,
    ..._rest: unknown[]
  ) => {
    // The handler is the LAST argument in every tool() overload the SDK exposes.
    const handler = _rest[_rest.length - 1];
    if (typeof handler === 'function') {
      handlers.set(
        name,
        handler as (
          args: Record<string, unknown>
        ) => Promise<{ content: unknown[]; isError?: boolean }>
      );
    }
    return { register: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);

  registerGraphTools(server, makeGraphClient(), false);
  toolSpy.mockRestore();
  return handlers;
}

describe('plan 05-04 Task 2 — dispatch enforcement (integration)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear any stdio fallback bleed-in from other test files so the
    // "undefined ALS → reject" path surfaces correctly.
    const { setStdioFallback } = await import('../../src/lib/tool-selection/dispatch-guard.js');
    setStdioFallback(undefined);
  });

  it('Test 1: NULL enabled_tools + preset tool → Graph call proceeds (200)', async () => {
    const { registerGraphTools } = await import('../../src/graph-tools.js');
    const { requestContext } = await import('../../src/request-context.js');
    const { presetFor } = await import('../../src/lib/tool-selection/preset-loader.js');

    const handlers = captureHandlers(registerGraphTools);
    const sendMail = handlers.get('mail-send');
    expect(sendMail).toBeDefined();

    const result = await requestContext.run(
      {
        tenantId: '11111111-1111-1111-1111-111111111111',
        enabledToolsSet: presetFor('essentials-v1'),
        presetVersion: 'essentials-v1',
      },
      async () =>
        sendMail!({
          confirmation: true,
          confirmationId: 'confirm:mail-send:high',
        })
    );

    expect(result.isError).toBeFalsy();
    // Response content is the mock Graph response (`{ok: true}`)
    const firstContent = result.content[0] as { type: string; text: string };
    const body = JSON.parse(firstContent.text);
    expect(body.ok).toBe(true);
  });

  it('Test 2: NULL enabled_tools + non-preset tool → MCP tool error (not HTTP 403)', async () => {
    const { registerGraphTools } = await import('../../src/graph-tools.js');
    const { requestContext } = await import('../../src/request-context.js');
    const { presetFor } = await import('../../src/lib/tool-selection/preset-loader.js');

    const handlers = captureHandlers(registerGraphTools);
    const otherOp = handlers.get('other-op');
    expect(otherOp).toBeDefined();

    const result = await requestContext.run(
      {
        tenantId: '11111111-1111-1111-1111-111111111111',
        enabledToolsSet: presetFor('essentials-v1'),
        presetVersion: 'essentials-v1',
      },
      async () => otherOp!({})
    );

    expect(result.isError).toBe(true);
    const firstContent = result.content[0] as { type: string; text: string };
    const payload = JSON.parse(firstContent.text);
    expect(payload.error).toBe('tool_not_enabled_for_tenant');
    expect(payload.tool).toBe('other-op');
    expect(payload.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    expect(payload.enabled_preset_version).toBe('essentials-v1');
  });

  it('Test 3: beta tool dispatch emits pino info log with {beta:true, toolAlias, tenantId}', async () => {
    const loggerMod = (await import('../../src/logger.js')) as unknown as {
      default: { info: ReturnType<typeof vi.fn> };
      __mocks: { info: ReturnType<typeof vi.fn> };
    };
    loggerMod.__mocks.info.mockClear();

    const { registerGraphTools } = await import('../../src/graph-tools.js');
    const { requestContext } = await import('../../src/request-context.js');
    const { computeEnabledToolsSet } =
      await import('../../src/lib/tool-selection/enabled-tools-parser.js');

    // Enabled-tools that includes the beta tool via the "+__beta__security:*"
    // workload-expansion path. The parser strips __beta__ for workload
    // classification but the ALIAS stays __beta__security-alerts-list.
    const enabledSet = computeEnabledToolsSet('+security:*', 'essentials-v1');
    expect(enabledSet.has('__beta__security-alerts-list')).toBe(true);

    const handlers = captureHandlers(registerGraphTools);
    const betaTool = handlers.get('__beta__security-alerts-list');
    expect(betaTool).toBeDefined();

    const betaResult = await requestContext.run(
      {
        tenantId: '22222222-2222-2222-2222-222222222222',
        enabledToolsSet: enabledSet,
        presetVersion: 'essentials-v1',
      },
      async () => betaTool!({})
    );

    expect(betaResult.isError).toBeFalsy();

    // Find the "beta tool invoked" log entry
    const calls = loggerMod.__mocks.info.mock.calls;
    const betaLog = calls.find((c) => {
      const msg = typeof c[0] === 'string' ? c[0] : c[1];
      const meta = typeof c[0] === 'string' ? c[1] : c[0];
      return (
        msg === 'beta tool invoked' ||
        (meta && typeof meta === 'object' && (meta as Record<string, unknown>).beta === true)
      );
    });
    expect(betaLog).toBeDefined();
    const betaMeta = typeof betaLog![0] === 'string' ? betaLog![1] : betaLog![0];
    expect((betaMeta as Record<string, unknown>).beta).toBe(true);
    expect((betaMeta as Record<string, unknown>).toolAlias).toBe('__beta__security-alerts-list');
    expect((betaMeta as Record<string, unknown>).tenantId).toBe(
      '22222222-2222-2222-2222-222222222222'
    );
  });

  it('stdio fallback: undefined requestContext → fail-closed rejection (T-05-09)', async () => {
    const { registerGraphTools } = await import('../../src/graph-tools.js');

    const handlers = captureHandlers(registerGraphTools);
    const sendMail = handlers.get('mail-send');
    expect(sendMail).toBeDefined();

    // No requestContext.run wrapper → AsyncLocalStorage returns undefined.
    const result = await sendMail!({});
    expect(result.isError).toBe(true);
    const firstContent = result.content[0] as { type: string; text: string };
    const payload = JSON.parse(firstContent.text);
    expect(payload.error).toBe('tool_not_enabled_for_tenant');
    // Fail-closed: unknown tenantId + unknown preset_version
    expect(payload.tenantId).toBe('unknown');
    expect(payload.enabled_preset_version).toBe('unknown');
  });
});

// Zod is imported to silence an unused-import lint — z is transitively used
// by the generated client mock shape which the SDK tool() overload expects.
void z;

import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../src/request-context.js';
import type { CallToolResult } from '../src/graph-tools.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  rawPinoLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages',
        parameters: [],
      },
      {
        alias: 'send-mail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send mail',
        parameters: [],
      },
      {
        alias: 'delete-mail-message',
        method: 'delete',
        path: '/me/messages/:messageId',
        description: 'Delete message',
        parameters: [{ name: 'messageId', type: 'Path' }],
      },
    ],
  },
}));

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const registered = (
    server as unknown as {
      _registeredTools: Record<
        string,
        {
          annotations?: Record<string, unknown>;
          inputSchema?: Record<string, unknown>;
          handler: (args: unknown, extra: unknown) => Promise<CallToolResult>;
        }
      >;
    }
  )._registeredTools;
  const tool = registered[name];
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool.handler(args, { requestId: 'risk-test', sendNotification: vi.fn() });
}

function toolMeta(server: McpServer, name: string) {
  return (
    server as unknown as {
      _registeredTools: Record<
        string,
        { annotations?: Record<string, unknown>; inputSchema?: Record<string, unknown> }
      >;
    }
  )._registeredTools[name]!;
}

async function withTenant<T>(fn: () => Promise<T>): Promise<T> {
  return requestContext.run(
    {
      tenantId: 'tenant-a',
      enabledToolsSet: new Set(['list-mail-messages', 'send-mail', 'delete-mail-message']),
      enabledToolsExplicit: true,
      presetVersion: 'test',
    },
    fn
  );
}

describe('Phase 8 tool annotations and safe-write confirmation', () => {
  it('annotates direct tools with read/write/destructive/idempotent/open-world hints', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });

    registerGraphTools(server, { graphRequest: vi.fn() } as never, false, undefined, true);

    expect(toolMeta(server, 'list-mail-messages').annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
    expect(toolMeta(server, 'send-mail').annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
      riskLevel: 'high',
    });
    const sendMailSchema = toolMeta(server, 'send-mail').inputSchema as {
      shape: Record<string, unknown>;
    };
    expect(sendMailSchema.shape).toHaveProperty('confirmation');
    expect(sendMailSchema.shape).toHaveProperty('confirmationId');
  });

  it('returns confirmation_required with exact next call shape for high-risk direct tools', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphRequest = vi.fn();

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const result = await withTenant(() => callTool(server, 'send-mail', { body: { message: {} } }));
    const payload = JSON.parse(result.content[0]!.text) as {
      error: string;
      confirmationId: string;
      nextCall: unknown;
    };

    expect(result.isError).toBe(true);
    expect(payload.error).toBe('confirmation_required');
    expect(payload.confirmationId).toBe('confirm:send-mail:high');
    expect(payload.nextCall).toEqual({
      toolName: 'send-mail',
      parameters: {
        body: { message: {} },
        confirmation: true,
        confirmationId: 'confirm:send-mail:high',
      },
    });
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('lets read-only tools execute without confirmation and preserves static tool names', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
    });

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const names = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools
    );
    expect(names).toEqual(expect.arrayContaining(['list-mail-messages', 'send-mail']));
    expect(names).not.toContain('confirm-tool');

    const result = await withTenant(() => callTool(server, 'list-mail-messages', {}));

    expect(result.isError).toBeUndefined();
    expect(graphRequest).toHaveBeenCalledTimes(1);
  });

  it('gates high-risk discovery execute-tool calls without confirmation', async () => {
    const { registerDiscoveryTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphRequest = vi.fn();

    registerDiscoveryTools(server, { graphRequest } as never, false, true);

    const result = await withTenant(() =>
      callTool(server, 'execute-tool', { tool_name: 'send-mail', parameters: { body: {} } })
    );
    const payload = JSON.parse(result.content[0]!.text) as { error: string; nextCall: unknown };

    expect(payload.error).toBe('confirmation_required');
    expect(payload.nextCall).toEqual({
      toolName: 'send-mail',
      parameters: { body: {}, confirmation: true, confirmationId: 'confirm:send-mail:high' },
    });
    expect(graphRequest).not.toHaveBeenCalled();
  });
});

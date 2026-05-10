/**
 * Tests for the graph-batch MCP tool registration (Plan 02-05, Task 3).
 *
 * Coverage:
 *   1. graph-batch is registered in non-readOnly mode.
 *   2. graph-batch is SKIPPED in readOnly mode (can contain write sub-requests).
 *   3. graph-batch tool handler proxies the request to batch() and returns the
 *      per-sub-request results as a JSON-serialized envelope.
 *   4. graph-batch surfaces validation errors as `isError: true` MCP responses
 *      (without throwing out of the handler).
 *   5. graph-batch serializes typed GraphError per-item into JSON-safe fields
 *      (code, message, statusCode, requestId) — Error objects would otherwise
 *      lose their fields across JSON.stringify.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/generated/client.js', () => ({
  api: { endpoints: [] },
}));

interface RegisteredTool {
  name: string;
  description: string;
  paramSchema: unknown;
  hints: unknown;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Minimal McpServer stub that captures tool registrations by name so we can
 * look them up and invoke the handler directly. Mirrors the shape the real
 * `@modelcontextprotocol/sdk/server/mcp.js` exposes.
 */
function createMockServer(): { tools: Map<string, RegisteredTool>; server: unknown } {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    tool: (
      name: string,
      description: string,
      paramSchema: unknown,
      hints: unknown,
      handler: (params: Record<string, unknown>) => Promise<unknown>
    ) => {
      tools.set(name, { name, description, paramSchema, hints, handler });
    },
  };
  return { tools, server };
}

beforeEach(() => {
  vi.resetModules();
  if (!('File' in globalThis)) {
    Object.defineProperty(globalThis, 'File', {
      value: class File {},
      configurable: true,
    });
  }
});

describe('graph-batch tool registration', () => {
  it('registers graph-batch in non-readOnly mode', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { tools, server } = createMockServer();
    const mockGraphClient = {
      graphRequest: vi.fn(),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      false, // readOnly = false
      '^graph-batch$' // only register graph-batch
    );

    expect(tools.has('graph-batch')).toBe(true);
    const tool = tools.get('graph-batch')!;
    expect(tool.description).toMatch(/batch/i);
    expect(tool.description).toMatch(/20/);
    expect(tool.description).toMatch(/SSRF|absolute|relative/i);
  });

  it('is SKIPPED in readOnly mode (can carry write sub-requests)', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { tools, server } = createMockServer();
    const mockGraphClient = {
      graphRequest: vi.fn(),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      true, // readOnly = true
      '^graph-batch$'
    );

    expect(tools.has('graph-batch')).toBe(false);
  });
});

describe('graph-batch tool handler', () => {
  it('returns per-sub-request responses envelope on success', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { requestContext } = await import('../src/request-context.js');
    const { tools, server } = createMockServer();

    const fakeBatchResponses = [
      { id: '1', status: 200, body: { userId: 'abc' } },
      { id: '2', status: 200, body: { value: [] } },
    ];
    const mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ responses: fakeBatchResponses }) }],
      }),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      false,
      '^graph-batch$'
    );

    const tool = tools.get('graph-batch')!;
    const result = (await requestContext.run(
      {
        tenantId: 'tenant-batch',
        presetVersion: 'test',
        enabledToolsSet: new Set(['graph-batch']),
      },
      () =>
        tool.handler({
          requests: [
            { id: '1', method: 'GET', url: '/me' },
            { id: '2', method: 'GET', url: '/me/messages' },
          ],
        })
    )) as { content: Array<{ text: string }>; isError?: boolean };

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text) as {
      responses: Array<{ id: string; status: number; body?: unknown }>;
    };
    expect(parsed.responses).toHaveLength(2);
    expect(parsed.responses[0]).toMatchObject({ id: '1', status: 200, body: { userId: 'abc' } });
    expect(parsed.responses[1]).toMatchObject({ id: '2', status: 200, body: { value: [] } });
  });

  it('rejects when graph-batch is not enabled for the tenant', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { requestContext } = await import('../src/request-context.js');
    const { tools, server } = createMockServer();
    const mockGraphClient = {
      graphRequest: vi.fn(),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      false,
      '^graph-batch$'
    );

    const tool = tools.get('graph-batch')!;
    const result = (await requestContext.run(
      {
        tenantId: 'tenant-batch',
        presetVersion: 'discovery-v1',
        enabledToolsSet: new Set(['execute-tool']),
      },
      () =>
        tool.handler({
          requests: [{ id: '1', method: 'GET', url: '/me' }],
        })
    )) as { content: Array<{ text: string }>; isError?: boolean };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text) as { error: string; tool: string };
    expect(parsed.error).toBe('tool_not_enabled_for_tenant');
    expect(parsed.tool).toBe('graph-batch');
    expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('serializes typed GraphError into JSON-safe fields on failing sub-requests', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { tools, server } = createMockServer();

    const fakeBatchResponses = [
      { id: '1', status: 200, body: { ok: true } },
      {
        id: '2',
        status: 404,
        body: {
          error: {
            code: 'itemNotFound',
            message: 'Not found',
            innerError: { 'request-id': 'rid-2', 'client-request-id': 'crid-2' },
          },
        },
      },
    ];
    const mockGraphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ responses: fakeBatchResponses }) }],
      }),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      false,
      '^graph-batch$'
    );

    const tool = tools.get('graph-batch')!;
    const result = (await tool.handler({
      requests: [
        { id: '1', method: 'GET', url: '/me' },
        { id: '2', method: 'GET', url: '/users/does-not-exist' },
      ],
    })) as { content: Array<{ text: string }>; isError?: boolean };

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text) as {
      responses: Array<{
        id: string;
        status: number;
        error?: {
          code: string;
          message: string;
          statusCode: number;
          requestId?: string;
          clientRequestId?: string;
        };
      }>;
    };
    expect(parsed.responses[0].error).toBeUndefined();
    expect(parsed.responses[1].error).toBeDefined();
    expect(parsed.responses[1].error!.statusCode).toBe(404);
    expect(parsed.responses[1].error!.code).toBe('itemNotFound');
    expect(parsed.responses[1].error!.requestId).toBe('rid-2');
    expect(parsed.responses[1].error!.clientRequestId).toBe('crid-2');
  });

  it('returns isError:true on validation failure (e.g., absolute URL SSRF reject)', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { tools, server } = createMockServer();
    const mockGraphClient = {
      graphRequest: vi.fn(),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      false,
      '^graph-batch$'
    );

    const tool = tools.get('graph-batch')!;
    const result = (await tool.handler({
      requests: [{ id: '1', method: 'GET', url: 'https://attacker.example.com/exfil' }],
    })) as { content: Array<{ text: string }>; isError?: boolean };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text) as { error: string };
    expect(parsed.error).toMatch(/relative|absolute/i);
    // Validation happened BEFORE any POST — graphRequest must not have been called.
    expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();
  });

  it('returns isError:true on dependsOn cycle (client-side validation before POST)', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { tools, server } = createMockServer();
    const mockGraphClient = {
      graphRequest: vi.fn(),
    };

    registerGraphTools(
      server as Parameters<typeof registerGraphTools>[0],
      mockGraphClient as unknown as Parameters<typeof registerGraphTools>[1],
      false,
      '^graph-batch$'
    );

    const tool = tools.get('graph-batch')!;
    const result = (await tool.handler({
      requests: [
        { id: '1', method: 'GET', url: '/me', dependsOn: ['2'] },
        { id: '2', method: 'GET', url: '/me/messages', dependsOn: ['1'] },
      ],
    })) as { content: Array<{ text: string }>; isError?: boolean };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text) as { error: string };
    expect(parsed.error).toMatch(/cycle/i);
    expect(mockGraphClient.graphRequest).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientCapabilityProfile } from '../src/lib/mcp-capabilities/profile.js';
import {
  cancelOperation,
  isOperationCancelled,
  registerOperation,
  resetOperationsForTesting,
} from '../src/lib/mcp-progress/cancellation.js';
import { requestContext } from '../src/request-context.js';
import type { CallToolResult } from '../src/graph-tools.js';
import { fetchAllPages } from '../src/lib/middleware/page-iterator.js';

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
    ],
  },
}));

const progressProfile = {
  capabilities: {
    progress: { effective: true },
    cancellation: { effective: true },
  },
} as unknown as ClientCapabilityProfile;

function page(ids: string[], next = '') {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          value: ids.map((id) => ({ id })),
          ...(next ? { '@odata.nextLink': next } : {}),
        }),
      },
    ],
  };
}

async function callList(
  server: McpServer,
  args: Record<string, unknown>,
  sendNotification = vi.fn()
): Promise<CallToolResult> {
  const tool = (
    server as unknown as {
      _registeredTools: Record<
        string,
        { handler: (args: unknown, extra: unknown) => Promise<CallToolResult> }
      >;
    }
  )._registeredTools['list-mail-messages'];
  if (!tool) throw new Error('list-mail-messages not registered');
  return tool.handler(args, {
    requestId: 'request-1',
    sendNotification,
    sendRequest: vi.fn(),
    _meta: { progressToken: 'progress-1' },
  });
}

async function withTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return requestContext.run(
    {
      tenantId,
      requestId: 'request-1',
      enabledToolsSet: new Set(['list-mail-messages']),
      enabledToolsExplicit: true,
      presetVersion: 'test',
      capabilityProfile: progressProfile,
    },
    fn
  );
}

describe('Phase 8 progress and cancellation for paginated Graph tools', () => {
  it('keeps operation keys unambiguous when request IDs and progress tokens contain delimiters', () => {
    resetOperationsForTesting();
    const first = { tenantId: 'tenant-a', requestId: 'request:a', progressToken: 'b' };
    const second = { tenantId: 'tenant-a', requestId: 'request', progressToken: 'a:b' };

    try {
      registerOperation(first);
      registerOperation(second);

      expect(cancelOperation(first)).toBe(true);
      expect(isOperationCancelled(first)).toBe(true);
      expect(isOperationCancelled(second)).toBe(false);
    } finally {
      resetOperationsForTesting();
    }
  });

  it('emits increasing progress notifications when a progress token is supplied', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const sendNotification = vi.fn();
    const graphRequest = vi
      .fn()
      .mockResolvedValueOnce(page(['a'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=1'))
      .mockResolvedValueOnce(page(['b'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=2'))
      .mockResolvedValueOnce(page(['c']));

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const result = await withTenant('tenant-a', () =>
      callList(server, { fetchAllPages: true }, sendNotification)
    );

    expect(result.isError).toBeUndefined();
    const progress = sendNotification.mock.calls
      .map(([notification]) => notification)
      .filter((notification) => notification.method === 'notifications/progress');
    expect(progress.length).toBeGreaterThanOrEqual(2);
    expect(progress.map((n) => n.params.progress)).toEqual([1, 2, 3]);
    expect(progress.every((n) => n.params.progressToken === 'progress-1')).toBe(true);
  });

  it('cancels pagination and returns inline partial data without an unreadable resource URI', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphRequest = vi
      .fn()
      .mockResolvedValueOnce(page(['a'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=1'))
      .mockImplementationOnce(async (_path: string, options: { signal?: AbortSignal }) => {
        cancelOperation({
          tenantId: 'tenant-a',
          requestId: 'request-1',
          progressToken: 'progress-1',
        });
        if (options.signal?.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        return page(['b'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=2');
      });

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const result = await withTenant('tenant-a', () => callList(server, { fetchAllPages: true }));
    const payload = JSON.parse(result.content[0]!.text) as {
      status: string;
      resourceUri?: string;
      partial: { value: unknown[] };
    };

    expect(payload.status).toBe('cancelled');
    expect(payload.resourceUri).toBeUndefined();
    expect(result._meta?.partialResourceUri).toBeUndefined();
    expect(payload.partial.value).toHaveLength(1);
  });

  it('normalizes initial AbortError graph responses as cancellations', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphRequest = vi
      .fn()
      .mockImplementation(async (_path: string, options: { signal?: AbortSignal }) => {
        cancelOperation({
          tenantId: 'tenant-a',
          requestId: 'request-1',
          progressToken: 'progress-1',
        });
        expect(options.signal?.aborted).toBe(true);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'aborted' }) }],
          _meta: { errorCode: 'AbortError' },
          isError: true,
        };
      });

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const result = await withTenant('tenant-a', () => callList(server, { fetchAllPages: true }));
    const payload = JSON.parse(result.content[0]!.text) as {
      status: string;
      partial: { value: unknown[] };
    };

    expect(payload.status).toBe('cancelled');
    expect(payload.partial.value).toEqual([]);
    expect(result.isError).toBeUndefined();
    expect(result._meta?.cancelled).toBe(true);
  });

  it('aborts the active paginated Graph request signal when cancelOperation is called', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    let secondPageSignal: AbortSignal | undefined;
    let resolveSecondPageStarted: (() => void) | undefined;
    const secondPageStarted = new Promise<void>((resolve) => {
      resolveSecondPageStarted = resolve;
    });
    const graphRequest = vi
      .fn()
      .mockResolvedValueOnce(page(['a'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=1'))
      .mockImplementationOnce(
        async (_path: string, options: { signal?: AbortSignal }) =>
          new Promise<ReturnType<typeof page>>((resolve, reject) => {
            secondPageSignal = options.signal;
            resolveSecondPageStarted?.();
            const timer = setTimeout(() => resolve(page(['b'])), 10_000);
            options.signal?.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              },
              { once: true }
            );
          })
      );

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const resultPromise = withTenant('tenant-a', () => callList(server, { fetchAllPages: true }));
    await secondPageStarted;
    expect(secondPageSignal?.aborted).toBe(false);

    cancelOperation({
      tenantId: 'tenant-a',
      requestId: 'request-1',
      progressToken: 'progress-1',
    });

    const result = await resultPromise;
    const payload = JSON.parse(result.content[0]!.text) as {
      status: string;
      resourceUri?: string;
      partial: { value: unknown[] };
    };

    expect(secondPageSignal?.aborted).toBe(true);
    expect(payload.status).toBe('cancelled');
    expect(payload.resourceUri).toBeUndefined();
    expect(result._meta?.partialResourceUri).toBeUndefined();
    expect(payload.partial.value).toHaveLength(1);
  });

  it('stops fetchAllPages before the next page request when cancelled after progress', async () => {
    resetOperationsForTesting();
    const operationKey = {
      tenantId: 'tenant-a',
      requestId: 'request-1',
      progressToken: 'progress-1',
    };
    registerOperation(operationKey);
    const graphRequest = vi.fn().mockResolvedValue(page(['b']));
    const sendNotification = vi.fn(async () => {
      cancelOperation(operationKey);
    });

    try {
      const result = await fetchAllPages(
        '/me/messages',
        { method: 'GET', headers: {} },
        { graphRequest } as never,
        {
          seedFirstPage: JSON.parse(
            page(['a'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=1').content[0]!.text
          ) as Record<string, unknown>,
          progressToken: 'progress-1',
          sendNotification,
          capabilityProfile: progressProfile,
          operationKey,
        }
      );

      expect(result).toMatchObject({
        _cancelled: true,
      });
      expect((result as Record<string, unknown>)._partialResourceUri).toBeUndefined();
      expect(result.value).toHaveLength(1);
      expect(graphRequest).not.toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalledTimes(1);
    } finally {
      resetOperationsForTesting();
    }
  });

  it('marks seeded pagination as cancelled when cancelled before iteration yields', async () => {
    resetOperationsForTesting();
    const operationKey = {
      tenantId: 'tenant-a',
      requestId: 'request-1',
      progressToken: 'progress-1',
    };
    registerOperation(operationKey);
    cancelOperation(operationKey);
    const graphRequest = vi.fn();

    try {
      const result = await fetchAllPages(
        '/me/messages',
        { method: 'GET', headers: {} },
        { graphRequest } as never,
        {
          seedFirstPage: JSON.parse(
            page(['a'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=1').content[0]!.text
          ) as Record<string, unknown>,
          operationKey,
        }
      );

      expect(result).toMatchObject({
        _cancelled: true,
      });
      expect((result as Record<string, unknown>)._partialResourceUri).toBeUndefined();
      expect(result.value).toHaveLength(0);
      expect(graphRequest).not.toHaveBeenCalled();
    } finally {
      resetOperationsForTesting();
    }
  });

  it('does not allow Tenant A cancellation to cancel Tenant B work', async () => {
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphRequest = vi
      .fn()
      .mockResolvedValueOnce(page(['a'], 'https://graph.microsoft.com/v1.0/me/messages?$skip=1'))
      .mockImplementationOnce(async () => {
        cancelOperation({
          tenantId: 'tenant-a',
          requestId: 'request-1',
          progressToken: 'progress-1',
        });
        return page(['b']);
      });

    registerGraphTools(server, { graphRequest } as never, false, undefined, true);

    const result = await withTenant('tenant-b', () => callList(server, { fetchAllPages: true }));
    const payload = JSON.parse(result.content[0]!.text) as { value: unknown[] };

    expect(result.isError).toBeUndefined();
    expect(payload.value).toHaveLength(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type {
  CallToolResult,
  registerDiscoveryTools as registerDiscoveryToolsType,
} from '../src/graph-tools.js';
import { requestContext } from '../src/request-context.js';
import {
  createMcpErrorEnvelope,
  createMcpResultEnvelope,
  outputSchemaFor,
} from '../src/lib/mcp-results/envelope.js';
import {
  McpResultEnvelopeZod,
  McpStructuredContentZod,
  toOutputJsonSchema,
} from '../src/lib/mcp-results/schemas.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  rawPinoLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'me.ListMessages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages',
        parameters: [],
      },
      {
        alias: 'me.sendMail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send mail',
        parameters: [],
      },
      {
        alias: 'me.onlineMeetings.GetTranscriptsMetadataContent',
        method: 'get',
        path: '/me/onlineMeetings/:onlineMeetingId/transcripts/:callTranscriptId/metadataContent',
        description: 'Get transcript metadata content',
        parameters: [
          { name: 'onlineMeetingId', type: 'Path', schema: z.string() },
          { name: 'callTranscriptId', type: 'Path', schema: z.string() },
        ],
      },
      {
        alias: 'me.onlineMeetings.GetTranscriptsContent',
        method: 'get',
        path: '/me/onlineMeetings/:onlineMeetingId/transcripts/:callTranscriptId/content',
        description: 'Get transcript content',
        parameters: [
          { name: 'onlineMeetingId', type: 'Path', schema: z.string() },
          { name: 'callTranscriptId', type: 'Path', schema: z.string() },
        ],
      },
    ],
  },
}));

const forbiddenPayload = {
  ok: true,
  accessToken: 'token',
  nested: {
    refreshToken: 'refresh',
    keep: 'value',
  },
  items: [
    {
      clientSecret: 'secret',
      keep: true,
    },
  ],
  headers: {
    Authorization: 'Bearer abc',
    accept: 'application/json',
  },
};

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
          outputSchema?: unknown;
          handler: (args: unknown, extra: unknown) => Promise<CallToolResult>;
        }
      >;
    }
  )._registeredTools;
  const tool = registered[name];
  if (!tool || typeof tool.handler !== 'function') {
    throw new Error(`tool "${name}" not registered on test McpServer`);
  }
  return tool.handler(args, {
    requestId: 'structured-output-test',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  });
}

async function listTools(server: McpServer): Promise<{ tools: Array<{ name: string }> }> {
  const handlers = (
    server.server as unknown as {
      _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<{ tools: [] }>>;
    }
  )._requestHandlers;
  const handler = handlers.get('tools/list');
  if (!handler) throw new Error('tools/list handler not registered');
  return handler(
    { method: 'tools/list', params: {} },
    { requestId: 'structured-output-test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  );
}

function registeredTool(server: McpServer, name: string): { outputSchema?: unknown } {
  return (server as unknown as { _registeredTools: Record<string, { outputSchema?: unknown }> })
    ._registeredTools[name]!;
}

describe('MCP result envelope helpers', () => {
  it('creates schema-valid success envelopes with non-empty text fallback', () => {
    const result = createMcpResultEnvelope({
      toolName: 'search-tools',
      summary: 'Found 1 matching tool.',
      data: { found: 1, tools: [{ name: 'me-message-list', method: 'GET' }] },
      resources: [{ uri: 'm365://tenant/current/search/results.json', name: 'Search results' }],
      nextActions: ['Call get-tool-schema for me-message-list.'],
      meta: { tenantRef: 'tenant:opaque', correlationId: 'corr-1' },
    });

    expect(result.content[0]?.type).toBe('text');
    expect(result.content[0]?.text.trim().length).toBeGreaterThan(0);
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.summary).toBe('Found 1 matching tool.');
    expect(McpResultEnvelopeZod.parse(result)).toEqual(result);
    expect(McpStructuredContentZod.parse(result.structuredContent)).toEqual(
      result.structuredContent
    );
  });

  it('falls back to text and warning metadata when structuredContent is invalid', () => {
    const result = createMcpResultEnvelope({
      toolName: 'bad-tool',
      summary: '',
      data: { ok: true },
      nextActions: [],
    });

    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]?.text).toContain('Structured result unavailable');
    expect(result._meta?.structuredFallback).toBe(true);
    expect(result._meta?.warnings).toContain('structured_content_schema_invalid');
    expect(McpResultEnvelopeZod.parse(result)).toEqual(result);
  });

  it('creates schema-valid error envelopes with text and structured errors', () => {
    const result = createMcpErrorEnvelope({
      toolName: 'execute-tool',
      summary: 'Tool execution failed.',
      code: 'tool_error',
      message: 'Graph rejected the request.',
      nextActions: ['Check get-tool-schema and retry with valid parameters.'],
      meta: { correlationId: 'corr-2' },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('Tool execution failed.');
    expect(result.structuredContent?.data).toMatchObject({
      error: { code: 'tool_error', message: 'Graph rejected the request.' },
    });
    expect(McpResultEnvelopeZod.parse(result)).toEqual(result);
  });

  it('strips forbidden secret keys recursively from data and metadata', () => {
    const result = createMcpResultEnvelope({
      toolName: 'secret-test',
      summary: 'Secret-free result.',
      data: forbiddenPayload,
      meta: forbiddenPayload,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('accessToken');
    expect(serialized).not.toContain('refreshToken');
    expect(serialized).not.toContain('clientSecret');
    expect(serialized).not.toContain('Authorization');
    expect(serialized).not.toContain('Bearer abc');
    expect(result.structuredContent?.data).toMatchObject({
      ok: true,
      nested: { keep: 'value' },
      items: [{ keep: true }],
      headers: { accept: 'application/json' },
    });
    expect(McpResultEnvelopeZod.parse(result)).toEqual(result);
  });

  it('exposes stable JSON output schemas by tool name', () => {
    const schema = outputSchemaFor('search-tools');
    expect(schema).toEqual(toOutputJsonSchema('search-tools'));
    expect(schema).toHaveProperty('type', 'object');
    expect(JSON.stringify(schema)).toContain('structuredContent');
  });

  it('rejects forbidden keys when validating caller-supplied structured content directly', () => {
    expect(() =>
      McpStructuredContentZod.parse({
        summary: 'Bad payload.',
        data: { accessToken: 'token' },
        resources: [],
        nextActions: ['Remove secrets.'],
        warnings: [],
      })
    ).toThrow(z.ZodError);
  });
});

describe('Phase 8 structured discovery tool integration', () => {
  it('registers output schemas for search-tools, get-tool-schema, and execute-tool', async () => {
    const { registerDiscoveryTools } = (await import('../src/graph-tools.js')) as {
      registerDiscoveryTools: typeof registerDiscoveryToolsType;
    };
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [
          { type: 'text', text: JSON.stringify({ value: [{ id: 'm1', subject: 'Hello' }] }) },
        ],
      }),
    };
    registerDiscoveryTools(
      server,
      graphClient as unknown as Parameters<typeof registerDiscoveryTools>[1],
      false,
      true
    );

    for (const name of ['search-tools', 'get-tool-schema', 'execute-tool']) {
      expect(registeredTool(server, name).outputSchema).toBeDefined();
    }

    const tools = await listTools(server);
    for (const name of ['search-tools', 'get-tool-schema', 'execute-tool']) {
      const listed = tools.tools.find((tool) => tool.name === name) as { outputSchema?: unknown };
      expect(listed.outputSchema).toBeDefined();
    }
  });

  it('returns schema-valid structuredContent while preserving text-only content', async () => {
    const { registerDiscoveryTools } = (await import('../src/graph-tools.js')) as {
      registerDiscoveryTools: typeof registerDiscoveryToolsType;
    };
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [
          { type: 'text', text: JSON.stringify({ value: [{ id: 'm1', subject: 'Hello' }] }) },
        ],
      }),
    };
    registerDiscoveryTools(
      server,
      graphClient as unknown as Parameters<typeof registerDiscoveryTools>[1],
      false,
      true
    );

    const ctx = {
      tenantId: '11111111-1111-4111-8111-111111111111',
      enabledToolsSet: new Set(['me.ListMessages']),
      enabledToolsExplicit: true,
      presetVersion: 'discovery-v1',
    };

    const search = await requestContext.run(ctx, () =>
      callTool(server, 'search-tools', { query: 'list messages', limit: 1 })
    );
    expect(search.content[0]?.text.trim().length).toBeGreaterThan(0);
    expect(search.structuredContent).toBeDefined();
    expect(McpResultEnvelopeZod.parse(search)).toEqual(search);

    const schema = await requestContext.run(ctx, () =>
      callTool(server, 'get-tool-schema', { tool_name: 'me.ListMessages' })
    );
    expect(schema.content[0]?.text).toContain('me.ListMessages');
    expect(schema.structuredContent).toBeDefined();
    expect(McpResultEnvelopeZod.parse(schema)).toEqual(schema);

    const executed = await requestContext.run(ctx, () =>
      callTool(server, 'execute-tool', { tool_name: 'me.ListMessages', parameters: {} })
    );
    expect(executed.content[0]?.text.trim().length).toBeGreaterThan(0);
    expect(executed.structuredContent?.summary).toBe('Executed me.ListMessages.');
    expect(McpResultEnvelopeZod.parse(executed)).toEqual(executed);
  });

  it('preserves full transcript VTT text in visible and structured discovery execute-tool output', async () => {
    const { registerDiscoveryTools } = (await import('../src/graph-tools.js')) as {
      registerDiscoveryTools: typeof registerDiscoveryToolsType;
    };
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n${'Transcript line. '.repeat(400)}END`;
    const graphClient = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ message: 'OK!', rawResponse: vtt }) }],
      }),
    };
    registerDiscoveryTools(
      server,
      graphClient as unknown as Parameters<typeof registerDiscoveryTools>[1],
      false,
      true
    );

    const transcriptTools = [
      {
        name: 'me.onlineMeetings.GetTranscriptsMetadataContent',
        path: '/me/onlineMeetings/meeting-1/transcripts/transcript-1/metadataContent',
      },
      {
        name: 'me.onlineMeetings.GetTranscriptsContent',
        path: '/me/onlineMeetings/meeting-1/transcripts/transcript-1/content',
      },
    ];
    const ctx = {
      tenantId: '11111111-1111-4111-8111-111111111111',
      enabledToolsSet: new Set(transcriptTools.map((tool) => tool.name)),
      enabledToolsExplicit: true,
      presetVersion: 'discovery-v1',
    };

    for (const tool of transcriptTools) {
      graphClient.graphRequest.mockClear();
      const executed = await requestContext.run(ctx, () =>
        callTool(server, 'execute-tool', {
          tool_name: tool.name,
          parameters: { onlineMeetingId: 'meeting-1', callTranscriptId: 'transcript-1' },
        })
      );

      expect(executed.content[0]?.text).toContain('Fetched transcript content');
      expect(executed.content[0]?.text).toContain('WEBVTT');
      expect(executed.content[0]?.text).toContain('Transcript line. Transcript line.');
      expect(executed.content[0]?.text).toContain(vtt);
      expect(executed.structuredContent?.summary).toBe('Fetched transcript content.');
      expect(executed.structuredContent?.data).toMatchObject({
        contentType: 'text/vtt',
        content: vtt,
      });
      expect(executed.structuredContent?.nextActions).not.toContain(
        'Read structuredContent.data.content for the complete WEBVTT transcript.'
      );
      expect(JSON.stringify(executed.structuredContent?.data).length).toBeGreaterThan(4000);
      expect(McpResultEnvelopeZod.parse(executed)).toEqual(executed);

      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [path, options] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe(tool.path);
      expect(options.headers.Accept).toBe('text/vtt');
      expect(options.rawResponse).toBe(true);
    }
  });
});

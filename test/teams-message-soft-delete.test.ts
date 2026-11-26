import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAllowedScopeDiagnostics } from '../src/auth.js';
import type { GraphClient } from '../src/graph-client.js';
import { registerGraphTools } from '../src/graph-tools.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Real endpoints.json and the real generated client. Graph documents soft delete as
// delegated work/school only, on these paths:
// https://learn.microsoft.com/graph/api/chatmessage-softdelete?view=graph-rest-1.0
// https://learn.microsoft.com/graph/api/chatmessage-undosoftdelete?view=graph-rest-1.0

type ToolResult = { isError?: boolean; content: Array<{ text: string }> };
type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

interface Endpoint {
  toolName: string;
  pathPattern: string;
  method: string;
  presets?: string[];
  scopes?: string[];
  workScopes?: string[];
  appScopes?: unknown;
}

const endpoints = JSON.parse(
  readFileSync(path.join(__dirname, '../src/endpoints.json'), 'utf8')
) as Endpoint[];

const CHAT = { userId: 'u1', chatId: 'c1', chatMessageId: 'm1' };
const CHANNEL = { teamId: 't1', channelId: 'ch1', chatMessageId: 'm1' };
const REPLY = { ...CHANNEL, chatMessageId1: 'r1' };

const TOOLS = [
  ['delete-chat-message', CHAT, '/users/u1/chats/c1/messages/m1/softDelete', 'Chat.ReadWrite'],
  [
    'undo-delete-chat-message',
    CHAT,
    '/users/u1/chats/c1/messages/m1/undoSoftDelete',
    'Chat.ReadWrite',
  ],
  [
    'delete-channel-message',
    CHANNEL,
    '/teams/t1/channels/ch1/messages/m1/softDelete',
    'ChannelMessage.ReadWrite',
  ],
  [
    'undo-delete-channel-message',
    CHANNEL,
    '/teams/t1/channels/ch1/messages/m1/undoSoftDelete',
    'ChannelMessage.ReadWrite',
  ],
  [
    'delete-channel-message-reply',
    REPLY,
    '/teams/t1/channels/ch1/messages/m1/replies/r1/softDelete',
    'ChannelMessage.ReadWrite',
  ],
  [
    'undo-delete-channel-message-reply',
    REPLY,
    '/teams/t1/channels/ch1/messages/m1/replies/r1/undoSoftDelete',
    'ChannelMessage.ReadWrite',
  ],
] as const;

describe('Teams message soft delete tools', () => {
  let server: {
    tool: ReturnType<typeof vi.fn>;
    registerTool: ReturnType<typeof vi.fn>;
    server: object;
  };
  let graphClient: GraphClient;

  function register(options: { orgMode?: boolean; readOnly?: boolean } = { orgMode: true }) {
    server = { tool: vi.fn(), registerTool: vi.fn(), server: {} };
    graphClient = {
      graphRequest: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '' }] }),
      serialize: vi.fn((value) => JSON.stringify(value)),
    } as unknown as GraphClient;
    registerGraphTools(server, graphClient, options);
  }

  function registered(name: string) {
    const call = server.registerTool.mock.calls.find((c: unknown[]) => c[0] === name);
    expect(call, `tool ${name} should be registered`).toBeDefined();
    const meta = call![1] as {
      description: string;
      inputSchema: { shape: Record<string, unknown> };
      annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
    };
    return { meta, handler: call![call!.length - 1] as ToolHandler };
  }

  function names() {
    return server.registerTool.mock.calls.map((c: unknown[]) => c[0]);
  }

  beforeEach(() => {
    vi.stubEnv('MS365_MCP_REQUIRE_CONFIRM', 'false');
    register();
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(TOOLS)('%s posts to the documented path without a body', async (name, params, url) => {
    const result = await registered(name).handler({ ...params });
    expect(result.isError).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    const [requestPath, options] = vi.mocked(graphClient.graphRequest).mock.calls[0];
    expect(requestPath).toBe(url);
    expect(options!.method).toBe('POST');
    expect(options!.body).toBeUndefined();
  });

  it.each(TOOLS)('%s says it is a soft delete limited to own messages', (name) => {
    const { description } = registered(name).meta;
    expect(description).toMatch(/soft-delete/i);
    expect(description).toMatch(/only the signed-in user's own messages/i);
  });

  it.each(TOOLS)('%s takes the path ids and no body', (name, params) => {
    const { shape } = registered(name).meta.inputSchema;
    for (const key of Object.keys(params)) {
      expect(shape, `${name} should take ${key}`).toHaveProperty(key);
    }
    expect(shape).not.toHaveProperty('body');
  });

  it.each(TOOLS)('%s is annotated as a destructive write', (name) => {
    const { annotations } = registered(name).meta;
    expect(annotations?.readOnlyHint).toBe(false);
    expect(annotations?.destructiveHint).toBe(true);
  });

  it.each(TOOLS)('%s is refused without confirm when the gate is on', async (name, params) => {
    vi.stubEnv('MS365_MCP_REQUIRE_CONFIRM', 'true');
    register();
    const { meta, handler } = registered(name);
    expect(meta.inputSchema.shape).toHaveProperty('confirm');

    const refused = await handler({ ...params });
    expect(refused.isError).toBe(true);
    expect(JSON.parse(refused.content[0].text).error).toBe('confirmation_required');
    expect(graphClient.graphRequest).not.toHaveBeenCalled();

    const allowed = await handler({ ...params, confirm: true });
    expect(allowed.isError).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
  });

  it('is not registered in read-only mode', () => {
    register({ orgMode: true, readOnly: true });
    for (const [name] of TOOLS) expect(names()).not.toContain(name);
  });

  it('is not registered without org mode', () => {
    register({ orgMode: false });
    for (const [name] of TOOLS) expect(names()).not.toContain(name);
  });

  it.each(TOOLS)(
    '%s is delegated work/school only with the documented scope',
    (name, _p, _u, scope) => {
      const endpoint = endpoints.find((e) => e.toolName === name)!;
      expect(endpoint.method).toBe('post');
      expect(endpoint.workScopes).toEqual([scope]);
      expect(endpoint.scopes).toBeUndefined();
      expect(endpoint.appScopes).toBeUndefined();
      expect(endpoint.presets).toEqual(['teams', 'work']);
    }
  );

  it('requests no scope beyond those of the edit tools', () => {
    const scopesFor = (enabledTools: string) =>
      buildAllowedScopeDiagnostics({ enabledTools, orgMode: true }).effectivePermissions;
    const deleteTools = `^(${TOOLS.map(([name]) => name).join('|')})$`;
    const editTools = '^(update-chat-message|update-channel-message|update-channel-message-reply)$';
    expect(scopesFor(deleteTools)).toEqual(scopesFor(editTools));
  });
});

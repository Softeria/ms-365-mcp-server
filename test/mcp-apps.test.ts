import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport, McpServer } from '@modelcontextprotocol/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type AuthManager from '../src/auth.js';
import type { GraphClient } from '../src/graph-client.js';
import {
  registerDiscoveryTools,
  registerGraphTools,
  type GraphToolRegistrationOptions,
} from '../src/graph-tools.js';
import logger from '../src/logger.js';
import {
  checkMcpAppScript,
  MCP_APP_MIME_TYPE,
  mcpAppPath,
  mcpAppToolMeta,
  mcpAppUri,
  noteMcpAppTool,
  registerMcpAppViews,
  type McpAppBinding,
} from '../src/mcp-apps.js';
import MicrosoftGraphServer from '../src/server.js';
import { pageConfig } from './mcp-app-host.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const endpoints = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
) as Array<{ toolName: string; mcpApp?: McpAppBinding }>;
const toolNames = new Set(endpoints.map((e) => e.toolName));
const withApps = endpoints.filter((e) => e.mcpApp !== undefined);
const browser = withApps.find((e) => e.mcpApp!.view === 'file-browser')!.toolName;
const browserUri = mcpAppUri('file-browser', browser);
const onlyBrowser = `^${browser}$`;

const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

async function connect(server: McpServer) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: 'apps-client', version: '1' });
  await client.connect(b);
  clients.push(client);
  return client;
}

async function connectTools(options: GraphToolRegistrationOptions, discovery = false) {
  const graph = {
    graphRequest: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{"value":[]}' }] }),
  } as unknown as GraphClient;
  const server = new McpServer({ name: 'apps-test', version: '1' });
  if (discovery) registerDiscoveryTools(server, graph, options);
  else registerGraphTools(server, graph, options);
  return connect(server);
}

async function toolMeta(client: Client, name: string) {
  const tool = (await client.listTools()).tools.find((t) => t.name === name);
  expect(tool, name).toBeDefined();
  return tool!._meta;
}

async function servedPage(client: Client, view: string, toolName: string) {
  const uri = mcpAppUri(view, toolName);
  const { contents } = await client.readResource({ uri });
  expect(contents).toHaveLength(1);
  return contents[0] as { uri: string; mimeType: string; text: string; _meta: unknown };
}

async function servedConfig(client: Client, view: string, toolName: string) {
  return pageConfig((await servedPage(client, view, toolName)).text);
}

describe('endpoints.json mcpApp', () => {
  it('names views that exist and tools that exist', () => {
    expect(withApps.length).toBeGreaterThan(0);
    for (const { toolName, mcpApp } of withApps) {
      const { view, tools = {} } = mcpApp!;
      expect(view, toolName).toMatch(/^[a-z0-9-]+$/);
      expect(existsSync(mcpAppPath(`${view}.html`)), `${view}.html`).toBe(true);
      expect(existsSync(mcpAppPath(`${view}.js`)), `${view}.js`).toBe(true);
      for (const [role, name] of Object.entries(tools)) {
        expect(role, toolName).toMatch(/^[a-z][a-zA-Z]*$/);
        expect(toolNames.has(name), `${toolName} ${role}: ${name}`).toBe(true);
      }
    }
  });
});

describe('MCP Apps', () => {
  it('leaves tools and resources alone when off', async () => {
    const client = await connectTools({ enabledTools: onlyBrowser });
    expect(await toolMeta(client, browser)).toBeUndefined();
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('points the tool at its own view and serves it with both scripts inlined', async () => {
    const client = await connectTools({
      mcpApps: true,
      enabledTools: `^(${browser}|list-drives)$`,
    });
    expect(await toolMeta(client, browser)).toEqual({
      ui: { resourceUri: browserUri },
      'ui/resourceUri': browserUri,
    });
    const others = (await client.listTools()).tools.filter((t) => t.name !== browser);
    expect(others.length).toBeGreaterThan(0);
    for (const tool of others) expect(tool._meta, tool.name).toBeUndefined();

    const { resources } = await client.listResources();
    expect(resources).toEqual([
      expect.objectContaining({ uri: browserUri, mimeType: MCP_APP_MIME_TYPE }),
    ]);

    const page = await servedPage(client, 'file-browser', browser);
    expect(page.uri).toBe(browserUri);
    expect(page.mimeType).toBe(MCP_APP_MIME_TYPE);
    expect(page._meta).toEqual({ ui: { csp: {}, prefersBorder: true } });
    expect(page.text).not.toContain('__MCP_APP_');
    expect(page.text).toContain('function createMcpAppBridge');
    expect(page.text).toContain("name: 'ms-365-file-browser'");
    expect(pageConfig(page.text)).toEqual({ toolName: browser, tools: {} });
  });

  it('gives the mail view only the tools that are registered too', async () => {
    const all = await connectTools({
      mcpApps: true,
      enabledTools: '^(create-draft-email|get-mail-message|send-draft-message)$',
    });
    expect(await servedConfig(all, 'mail-draft', 'create-draft-email')).toEqual({
      toolName: 'create-draft-email',
      tools: { get: 'get-mail-message', send: 'send-draft-message' },
    });
    expect(await toolMeta(all, 'send-draft-message')).toBeUndefined();
    expect(await toolMeta(all, 'get-mail-message')).toBeUndefined();

    const noGet = await connectTools({
      mcpApps: true,
      enabledTools: '^(create-draft-email|send-draft-message)$',
    });
    expect((await servedConfig(noGet, 'mail-draft', 'create-draft-email')).tools).toEqual({
      send: 'send-draft-message',
    });

    // A deployment that may draft but not send gets no Send button
    const draftsOnly = await connectTools({ mcpApps: true, enabledTools: '^create-draft-email$' });
    expect((await servedConfig(draftsOnly, 'mail-draft', 'create-draft-email')).tools).toEqual({});
  });

  it('gives each tool that shares a view its own config', async () => {
    const client = await connectTools({
      mcpApps: true,
      orgMode: true,
      enabledTools:
        '^(create-reply-draft|get-mail-message|send-draft-message|create-shared-mailbox-reply-draft|get-shared-mailbox-message|send-shared-mailbox-draft)$',
    });
    expect((await client.listResources()).resources.map((r) => r.uri).sort()).toEqual(
      [
        mcpAppUri('mail-draft', 'create-reply-draft'),
        mcpAppUri('mail-draft', 'create-shared-mailbox-reply-draft'),
      ].sort()
    );
    expect((await servedConfig(client, 'mail-draft', 'create-reply-draft')).tools).toEqual({
      get: 'get-mail-message',
      send: 'send-draft-message',
    });
    expect(
      (await servedConfig(client, 'mail-draft', 'create-shared-mailbox-reply-draft')).tools
    ).toEqual({ get: 'get-shared-mailbox-message', send: 'send-shared-mailbox-draft' });
  });

  it('registers no view when its tool is filtered out', async () => {
    const client = await connectTools({ mcpApps: true, enabledTools: '^list-drives$' });
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('leaves the tool without a view, and serves none, when the view file is missing', async () => {
    expect(mcpAppToolMeta({ view: 'no-such-view' }, browser)).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no-such-view'));

    // Even a binding noted for a missing view is skipped when the views are served
    const server = new McpServer({ name: 'apps-test', version: '1' });
    noteMcpAppTool(server, browser, { view: 'no-such-view' });
    registerMcpAppViews(server);
    const client = await connect(server);
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('refuses a view script that would break out of its <script> element', () => {
    expect(() => checkMcpAppScript('a.js', 'x = "</SCRIPT>";')).toThrow('a.js contains </script');
    expect(() => checkMcpAppScript('a.js', 'x = /<!--/;')).toThrow('a.js contains <!--');
    expect(() => checkMcpAppScript('a.js', 'x = "__MCP_APP_CONFIG__";')).toThrow(
      'a.js contains a placeholder'
    );
    expect(checkMcpAppScript('a.js', 'x = /<!-{2}/;')).toBe('x = /<!-{2}/;');
  });

  it('registers the views again on every new server', async () => {
    for (let i = 0; i < 2; i++) {
      const client = await connectTools({ mcpApps: true, enabledTools: onlyBrowser });
      expect((await client.listResources()).resources.map((r) => r.uri)).toEqual([browserUri]);
    }
  });

  it('attaches to eager tools in discovery mode, and fills roles from eager tools only', async () => {
    const eager = await connectTools(
      { mcpApps: true, enabledTools: onlyBrowser, eagerTools: [browser] },
      true
    );
    expect((await toolMeta(eager, browser))?.ui).toEqual({ resourceUri: browserUri });

    const lazy = await connectTools({ mcpApps: true, enabledTools: onlyBrowser }, true);
    expect(lazy.getServerCapabilities()?.resources).toBeUndefined();

    const draftOnly = await connectTools(
      { mcpApps: true, eagerTools: ['create-draft-email'] },
      true
    );
    expect((await servedConfig(draftOnly, 'mail-draft', 'create-draft-email')).tools).toEqual({});
    const withSend = await connectTools(
      {
        mcpApps: true,
        eagerTools: ['create-draft-email', 'get-mail-message', 'send-draft-message'],
      },
      true
    );
    expect((await servedConfig(withSend, 'mail-draft', 'create-draft-email')).tools).toEqual({
      get: 'get-mail-message',
      send: 'send-draft-message',
    });
  });

  it('still hands the view the body when the model asks to leave it out', async () => {
    const draft = { id: 'AAMkDraft=', subject: 'Hi' };
    const reply = (value: unknown, isError = false) => ({
      content: [{ type: 'text', text: JSON.stringify(value) }],
      ...(isError ? { isError } : {}),
    });
    const graph = {
      graphRequest: vi.fn(async (_endpoint: string, options: Record<string, unknown>) => {
        if (String(options.body).includes('fail')) return reply({ error: 'Graph said no' }, true);
        return reply(options.excludeResponse ? { success: true } : draft);
      }),
    } as unknown as GraphClient;
    const connectWith = (options: GraphToolRegistrationOptions) => {
      const server = new McpServer({ name: 'apps-test', version: '1' });
      registerGraphTools(server, graph, options);
      return connect(server);
    };
    const enabledTools = '^(create-draft-email|get-mail-message)$';
    const call = async (client: Client, name: string, args: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: args });
      const [block] = result.content as Array<{ text: string }>;
      return {
        body: JSON.parse(block.text),
        view: result.structuredContent,
        failed: result.isError,
      };
    };
    const create = (subject: string, extra = {}) => ({ body: { subject }, ...extra });
    const leaveOut = { excludeResponse: true };

    const apps = await connectWith({ mcpApps: true, enabledTools });
    expect(await call(apps, 'create-draft-email', create('Hi', leaveOut))).toEqual({
      body: { success: true },
      view: draft,
      failed: undefined,
    });
    expect(await call(apps, 'create-draft-email', create('Hi'))).toEqual({
      body: draft,
      view: undefined,
      failed: undefined,
    });
    expect(await call(apps, 'create-draft-email', create('fail', leaveOut))).toEqual({
      body: { error: 'Graph said no' },
      view: undefined,
      failed: true,
    });

    // A tool without a view, and every tool when the apps are off, leave the body out as asked
    expect(await call(apps, 'get-mail-message', { messageId: 'AAMk=', ...leaveOut })).toEqual({
      body: { success: true },
      view: undefined,
      failed: undefined,
    });
    const off = await connectWith({ enabledTools });
    expect(await call(off, 'create-draft-email', create('Hi', leaveOut))).toEqual({
      body: { success: true },
      view: undefined,
      failed: undefined,
    });
  });

  it('reads the mail draft as text by default, the only body the view shows in full', async () => {
    const graph = {
      graphRequest: vi.fn(async () => ({
        content: [{ type: 'text', text: JSON.stringify({ id: 'AAMk=' }) }],
      })),
    } as unknown as GraphClient;
    const server = new McpServer({ name: 'apps-test', version: '1' });
    registerGraphTools(server, graph, { mcpApps: true, enabledTools: '^get-mail-message$' });
    const client = await connect(server);
    const prefer = async () => {
      await client.callTool({ name: 'get-mail-message', arguments: { messageId: 'AAMk=' } });
      const [, options] = vi.mocked(graph.graphRequest).mock.calls.at(-1)!;
      return (options as { headers?: Record<string, string> }).headers?.Prefer ?? '';
    };
    expect(await prefer()).toContain('outlook.body-content-type="text"');
    try {
      vi.stubEnv('MS365_MCP_BODY_FORMAT', 'html');
      expect(await prefer()).not.toContain('body-content-type');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('keeps the arguments the views send in the tool schemas', async () => {
    const client = await connectTools({
      mcpApps: true,
      orgMode: true,
      enabledTools: `^(${browser}|get-mail-message|send-draft-message|get-shared-mailbox-message|send-shared-mailbox-draft)$`,
      multiAccount: true,
      accountNames: ['a@example.com', 'b@example.com'],
    });
    const { tools } = await client.listTools();
    const params = (name: string) =>
      Object.keys(tools.find((t) => t.name === name)!.inputSchema.properties ?? {});
    expect(params(browser)).toEqual(
      expect.arrayContaining(['driveId', 'driveItemId', 'select', 'top', 'skiptoken', 'account'])
    );
    expect(params('get-mail-message')).toEqual(expect.arrayContaining(['messageId', 'account']));
    expect(params('send-draft-message')).toEqual(
      expect.arrayContaining(['messageId', 'confirm', 'account'])
    );
    expect(params('get-shared-mailbox-message')).toEqual(
      expect.arrayContaining(['userId', 'messageId', 'account'])
    );
    expect(params('send-shared-mailbox-draft')).toEqual(
      expect.arrayContaining(['userId', 'messageId', 'confirm', 'account'])
    );
  });

  it.each([
    [{ enableMcpApps: true }, true],
    [{ enableMcpApps: true, toon: true }, false],
    [{}, false],
  ])('serves the view for server options %o: %s', async (options, served) => {
    const owner = new MicrosoftGraphServer({} as AuthManager, {
      http: '127.0.0.1:3000',
      enabledTools: onlyBrowser,
      ...options,
    });
    const surface = (owner as unknown as { createMcpServer(): McpServer }).createMcpServer();
    const client = await connect(surface);
    expect(Boolean(await toolMeta(client, browser))).toBe(served);
  });
});

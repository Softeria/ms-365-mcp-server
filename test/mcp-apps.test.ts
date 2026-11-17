import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { MCP_APP_MIME_TYPE, mcpAppHtmlPath, mcpAppToolMeta, mcpAppUri } from '../src/mcp-apps.js';
import MicrosoftGraphServer from '../src/server.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const endpoints = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
) as Array<{ toolName: string; method: string; mcpApp?: string }>;
const withApps = endpoints.filter((e) => e.mcpApp !== undefined);
const browser = withApps.find((e) => e.mcpApp === 'file-browser')!;
const browserUri = mcpAppUri('file-browser');
const onlyBrowser = `^${browser.toolName}$`;

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

describe('endpoints.json mcpApp', () => {
  it('names a view that exists, on one GET tool each', () => {
    expect(withApps.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const e of withApps) {
      expect(e.mcpApp, e.toolName).toMatch(/^[a-z0-9-]+$/);
      expect(e.method, e.toolName).toBe('get');
      expect(existsSync(mcpAppHtmlPath(e.mcpApp!)), `${e.mcpApp}.html`).toBe(true);
      // The view calls its tool back by the one name the server fills in
      expect(seen.has(e.mcpApp!), `${e.mcpApp} on more than one tool`).toBe(false);
      seen.add(e.mcpApp!);
    }
  });
});

describe('MCP Apps', () => {
  it('leaves tools and resources alone when off', async () => {
    const client = await connectTools({ enabledTools: onlyBrowser });
    expect(await toolMeta(client, browser.toolName)).toBeUndefined();
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('points the tool at its view and serves the view', async () => {
    const client = await connectTools({
      mcpApps: true,
      enabledTools: `^(${browser.toolName}|list-drives)$`,
    });
    expect(await toolMeta(client, browser.toolName)).toEqual({
      ui: { resourceUri: browserUri },
      'ui/resourceUri': browserUri,
    });
    const others = (await client.listTools()).tools.filter((t) => t.name !== browser.toolName);
    expect(others.length).toBeGreaterThan(0);
    for (const tool of others) expect(tool._meta, tool.name).toBeUndefined();

    const { resources } = await client.listResources();
    expect(resources).toEqual([
      expect.objectContaining({ uri: browserUri, mimeType: MCP_APP_MIME_TYPE }),
    ]);

    const { contents } = await client.readResource({ uri: browserUri });
    expect(contents).toHaveLength(1);
    const [view] = contents as Array<{
      uri: string;
      mimeType: string;
      text: string;
      _meta: unknown;
    }>;
    expect(view.uri).toBe(browserUri);
    expect(view.mimeType).toBe(MCP_APP_MIME_TYPE);
    expect(view._meta).toEqual({ ui: { csp: {}, prefersBorder: true } });
    expect(view.text).not.toContain('__MCP_APP_CONFIG__');
    const config = /<script type="application\/json" id="mcp-app-config">([\s\S]*?)<\/script>/.exec(
      view.text
    );
    expect(JSON.parse(config![1])).toEqual({ toolName: browser.toolName });
  });

  it('registers no view when its tool is filtered out', async () => {
    const client = await connectTools({ mcpApps: true, enabledTools: '^list-drives$' });
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('leaves the tool without a view when the view file is missing', async () => {
    const server = new McpServer({ name: 'apps-test', version: '1' });
    expect(mcpAppToolMeta(server, 'no-such-view', browser.toolName)).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no-such-view'));
    const client = await connect(server);
    expect(client.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('registers the view again on every new server', async () => {
    for (let i = 0; i < 2; i++) {
      const client = await connectTools({ mcpApps: true, enabledTools: onlyBrowser });
      expect((await client.listResources()).resources.map((r) => r.uri)).toEqual([browserUri]);
    }
  });

  it('attaches to eager tools in discovery mode, not to discoverable ones', async () => {
    const eager = await connectTools(
      { mcpApps: true, enabledTools: onlyBrowser, eagerTools: [browser.toolName] },
      true
    );
    expect((await toolMeta(eager, browser.toolName))?.ui).toEqual({ resourceUri: browserUri });

    const lazy = await connectTools({ mcpApps: true, enabledTools: onlyBrowser }, true);
    expect(lazy.getServerCapabilities()?.resources).toBeUndefined();
  });

  it('keeps the arguments the file browser sends in its tool schema', async () => {
    const client = await connectTools({
      mcpApps: true,
      enabledTools: onlyBrowser,
      multiAccount: true,
      accountNames: ['a@example.com', 'b@example.com'],
    });
    const tool = (await client.listTools()).tools.find((t) => t.name === browser.toolName)!;
    expect(Object.keys(tool.inputSchema.properties ?? {})).toEqual(
      expect.arrayContaining(['driveId', 'driveItemId', 'select', 'top', 'skiptoken', 'account'])
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
    expect(Boolean(await toolMeta(client, browser.toolName))).toBe(served);
  });
});

/**
 * Both protocol eras over real HTTP, against the real `start()`: 2025-era
 * clients (initialize handshake) and 2026-07-28 clients (server/discover, per
 * request `_meta` envelope and Mcp-* headers) share one /mcp endpoint. Graph is
 * stubbed at GraphClient's outbound call, so every token a Graph request would
 * carry is visible here and no network is used.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client, ProtocolError, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import MicrosoftGraphServer from '../src/server.js';
import GraphClient from '../src/graph-client.js';
import type AuthManager from '../src/auth.js';
import type { CommandOptions } from '../src/cli.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), verbose: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

const MODERN = '2026-07-28';
const LEGACY = '2025-06-18';
const ENABLED = '^(get-current-user|send-mail)$';

async function freePort(): Promise<number> {
  const s: Server = createServer();
  await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve));
  const { port } = s.address() as AddressInfo;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return port;
}

function fakeAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
    listAccounts: async () => [],
    getToken: async () => 'SERVER_OWN_TOKEN',
    getTokenForAccount: async () => 'SERVER_OWN_TOKEN',
  } as unknown as AuthManager;
}

type Era = 'legacy' | 'modern';
const ERAS: Era[] = ['legacy', 'modern'];

function modernMeta() {
  return {
    'io.modelcontextprotocol/protocolVersion': MODERN,
    'io.modelcontextprotocol/clientInfo': { name: 'raw', version: '1' },
    'io.modelcontextprotocol/clientCapabilities': {},
  };
}

function modernHeaders(method: string, name?: string): Record<string, string> {
  return {
    'mcp-protocol-version': MODERN,
    'mcp-method': method,
    ...(name ? { 'mcp-name': name } : {}),
  };
}

type JsonSchema = Record<string, unknown>;

function collectRefs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') out.push(value);
      else collectRefs(value, out);
    }
  }
  return out;
}

describe('protocol eras over HTTP', () => {
  const savedEnv = { ...process.env };
  let server: MicrosoftGraphServer | undefined;
  let base: string;
  let clients: Client[] = [];
  let graphTokens: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MS365_MCP_RATE_LIMIT_DISABLED = 'true';
    delete process.env.MS365_MCP_PUBLIC_URL;
    delete process.env.MS365_MCP_BASE_URL;
    graphTokens = [];
    // The last hop before fetch: it receives the token GraphClient resolved
    vi.spyOn(
      GraphClient.prototype as unknown as {
        performRequest: (endpoint: string, accessToken: string) => Promise<Response>;
      },
      'performRequest'
    ).mockImplementation(async (_endpoint: string, accessToken: string) => {
      graphTokens.push(accessToken);
      return new Response(JSON.stringify({ displayName: `user-of-${accessToken}` }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  afterEach(async () => {
    for (const client of clients) await client.close().catch(() => {});
    clients = [];
    await server?.stop();
    server = undefined;
    vi.restoreAllMocks();
    process.env = { ...savedEnv };
  });

  async function start(extra: Partial<CommandOptions> = {}): Promise<void> {
    const port = await freePort();
    server = new MicrosoftGraphServer(fakeAuthManager(), {
      http: `127.0.0.1:${port}`,
      ...extra,
    });
    await server.initialize('0.0.0-test');
    await server.start();
    base = `http://127.0.0.1:${port}`;
  }

  async function connect(era: Era, token?: string): Promise<Client> {
    const client = new Client(
      { name: `test-${era}`, version: '1.0.0' },
      era === 'modern' ? { versionNegotiation: { mode: 'auto' } } : {}
    );
    const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
      requestInit: token ? { headers: { authorization: `Bearer ${token}` } } : undefined,
    });
    await client.connect(transport);
    clients.push(client);
    return client;
  }

  function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
    return fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  function textOf(result: unknown): string {
    const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
    return content.map((c) => c.text ?? '').join('\n');
  }

  it('serves the same tools, schemas and instructions to both eras', async () => {
    await start();
    const legacy = await connect('legacy', 'T');
    const modern = await connect('modern', 'T');
    expect(legacy.getProtocolEra()).toBe('legacy');
    expect(modern.getProtocolEra()).toBe('modern');

    const legacyTools = (await legacy.listTools()).tools;
    const modernTools = (await modern.listTools()).tools;
    expect(legacyTools.length).toBeGreaterThan(10);
    expect(modernTools.map((t) => t.name)).toEqual(legacyTools.map((t) => t.name));
    const schemas = (tools: typeof legacyTools) =>
      Object.fromEntries(tools.map((t) => [t.name, t.inputSchema]));
    expect(schemas(modernTools)).toEqual(schemas(legacyTools));

    expect(legacy.getInstructions()).toBeTruthy();
    expect(modern.getInstructions()).toBe(legacy.getInstructions());
  });

  it('answers raw 2025 POSTs with plain JSON and no session id (#619)', async () => {
    await start({ enabledTools: ENABLED });
    const auth = { authorization: 'Bearer RAW_TOKEN' };
    const exchanges = [
      {
        method: 'initialize',
        params: {
          protocolVersion: LEGACY,
          capabilities: {},
          clientInfo: { name: 'raw', version: '1' },
        },
      },
      { method: 'tools/list', params: {} },
      { method: 'tools/call', params: { name: 'get-current-user', arguments: {} } },
    ];
    for (const [index, exchange] of exchanges.entries()) {
      const res = await post({ jsonrpc: '2.0', id: index + 1, ...exchange }, auth);
      expect(res.status, exchange.method).toBe(200);
      expect(res.headers.get('content-type'), exchange.method).toMatch(/^application\/json/);
      expect(res.headers.get('mcp-session-id'), exchange.method).toBeNull();
      const body = await res.json();
      expect(body.id).toBe(index + 1);
      expect(body.error, exchange.method).toBeUndefined();
      if (exchange.method === 'tools/call') {
        expect(textOf(body.result)).toContain('user-of-RAW_TOKEN');
      }
    }
  });

  it('answers a raw modern tools/call with plain JSON', async () => {
    await start({ enabledTools: ENABLED });
    const res = await post(
      {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'get-current-user', arguments: {}, _meta: modernMeta() },
      },
      { authorization: 'Bearer RAW_TOKEN', ...modernHeaders('tools/call', 'get-current-user') }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(res.headers.get('mcp-session-id')).toBeNull();
    const body = await res.json();
    expect(body.error).toBeUndefined();
    expect(textOf(body.result)).toContain('user-of-RAW_TOKEN');
  });

  it('gives each concurrent caller its own token on both eras', async () => {
    await start({ enabledTools: ENABLED });
    const callers = [
      { era: 'legacy' as const, token: 'ALICE_LEGACY' },
      { era: 'modern' as const, token: 'BOB_MODERN' },
      { era: 'legacy' as const, token: 'CAROL_LEGACY' },
      { era: 'modern' as const, token: 'DAVE_MODERN' },
    ];
    const connected = await Promise.all(callers.map((c) => connect(c.era, c.token)));
    expect(connected.map((c) => c.getProtocolEra())).toEqual(callers.map((c) => c.era));

    // Hold every Graph call until all four are in flight, so the calls really
    // overlap and no caller can pick up a token left behind by another
    let release!: () => void;
    const allArrived = new Promise<void>((resolve) => (release = resolve));
    const original = vi.mocked(
      (GraphClient.prototype as unknown as { performRequest: () => Promise<Response> })
        .performRequest
    );
    const inner = original.getMockImplementation()!;
    original.mockImplementation(async (...args: unknown[]) => {
      const response = await (inner as (...a: unknown[]) => Promise<Response>)(...args);
      if (graphTokens.length === callers.length) release();
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        allArrived,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('the Graph calls did not overlap')), 5000);
        }),
      ]).finally(() => clearTimeout(timer));
      return response;
    });

    const results = await Promise.all(
      connected.map((client) => client.callTool({ name: 'get-current-user', arguments: {} }))
    );
    expect(graphTokens.length).toBe(callers.length);
    expect(new Set(graphTokens)).toEqual(new Set(callers.map((c) => c.token)));
    results.forEach((result, index) => {
      expect(result.isError, callers[index].token).toBeFalsy();
      expect(textOf(result)).toContain(`user-of-${callers[index].token}`);
      for (const other of callers.filter((_, i) => i !== index)) {
        expect(textOf(result)).not.toContain(other.token);
      }
    });
  });

  it('refuses a modern POST without the Mcp-Method header with -32020', async () => {
    await start({ enabledTools: ENABLED });
    const res = await post(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: { _meta: modernMeta() },
      },
      { authorization: 'Bearer T', 'mcp-protocol-version': MODERN }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe(-32020);
  });

  describe('--allow-unauthenticated-discovery', () => {
    it('lets a tokenless modern client discover and list, but not call', async () => {
      await start({ enabledTools: ENABLED, allowUnauthenticatedDiscovery: true });
      const modern = await connect('modern');
      expect(modern.getProtocolEra()).toBe('modern');
      const names = (await modern.listTools()).tools.map((t) => t.name);
      expect(names).toContain('get-current-user');

      const res = await post(
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: { name: 'get-current-user', arguments: {}, _meta: modernMeta() },
        },
        modernHeaders('tools/call', 'get-current-user')
      );
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toMatch(/^Bearer /);
      expect(graphTokens).toEqual([]);
    });

    it('answers a tokenless server/discover with 401 without the flag', async () => {
      await start({ enabledTools: ENABLED });
      const res = await post(
        { jsonrpc: '2.0', id: 'probe', method: 'server/discover', params: { _meta: modernMeta() } },
        modernHeaders('server/discover')
      );
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toMatch(/^Bearer .*resource_metadata=/);
    });
  });

  it('allows the modern Mcp-* headers in a CORS preflight', async () => {
    await start({ enabledTools: ENABLED });
    const res = await fetch(`${base}/mcp`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'mcp-method, mcp-name, mcp-protocol-version',
      },
    });
    expect(res.status).toBeLessThan(300);
    const allowed = (res.headers.get('access-control-allow-headers') ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase());
    expect(allowed).toEqual(
      expect.arrayContaining(['mcp-method', 'mcp-name', 'mcp-protocol-version'])
    );
  });

  describe.each(ERAS)('tool refusals on the %s era', (era) => {
    it('answers a tool denied by allowed scopes with an isError result', async () => {
      await start({ enabledTools: ENABLED, allowedScopes: 'User.Read' });
      const client = await connect(era, 'T');
      expect(client.getProtocolEra()).toBe(era);
      const result = await client.callTool({ name: 'send-mail', arguments: {} });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toMatch(
        /^Tool send-mail is not available in this server configuration: .*Mail\.Send/
      );
      expect(graphTokens).toEqual([]);
    });

    it('rejects an unknown tool with -32602', async () => {
      await start({ enabledTools: ENABLED, allowedScopes: 'User.Read' });
      const client = await connect(era, 'T');
      const call = client.callTool({ name: 'no-such-tool', arguments: {} });
      await expect(call).rejects.toBeInstanceOf(ProtocolError);
      await expect(call).rejects.toMatchObject({ code: -32602 });
    });
  });

  it('serves only #/$defs/ refs and draft-07 schemas to both eras', async () => {
    await start();
    for (const era of ERAS) {
      const client = await connect(era, 'T');
      expect(client.getProtocolEra()).toBe(era);
      const tools = (await client.listTools()).tools;
      const allRefs: string[] = [];
      for (const tool of tools) {
        const schema = tool.inputSchema as JsonSchema;
        if ('$schema' in schema) {
          expect(schema.$schema, `${era} ${tool.name}`).toBe(
            'http://json-schema.org/draft-07/schema#'
          );
        }
        const refs = collectRefs(schema);
        for (const ref of refs) {
          expect(ref, `${era} ${tool.name}`).toMatch(/^#\/\$defs\//);
        }
        allRefs.push(...refs);
      }
      // Otherwise the loop above proves nothing
      expect(allRefs.length, era).toBeGreaterThan(0);
    }
  });

  describe('bodies express.json() leaves unread', () => {
    function rawPost(contentType: string, body: string): Promise<Response> {
      return fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': contentType,
          accept: 'application/json, text/event-stream',
          authorization: 'Bearer T',
        },
        body,
      });
    }

    it('answers a non-JSON content type with 415, whatever its size', async () => {
      await start({ enabledTools: ENABLED });
      expect((await rawPost('text/plain', 'hello')).status).toBe(415);
      expect((await rawPost('text/plain', 'x'.repeat(200 * 1024))).status).toBe(415);
    });
  });

  it.each([
    'https://mcp.example.com/?x=1',
    'https://mcp.example.com/#frag',
    'ftp://mcp.example.com',
  ])('refuses to start with the public URL %s', async (publicUrl) => {
    const port = await freePort();
    const bad = new MicrosoftGraphServer(fakeAuthManager(), {
      http: `127.0.0.1:${port}`,
      publicUrl,
    });
    await bad.initialize('0.0.0-test');
    await expect(bad.start()).rejects.toThrow(/without a query or fragment/);
    await bad.stop();
  });

  describe('stop()', () => {
    function settlesWithin<T>(promise: Promise<T>, ms: number): Promise<'settled' | 'timed out'> {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return Promise.race([
        promise.then(
          () => 'settled' as const,
          () => 'settled' as const
        ),
        new Promise<'timed out'>((resolve) => {
          timer = setTimeout(() => resolve('timed out'), ms);
        }),
      ]).finally(() => clearTimeout(timer));
    }

    // The server declares no listChanged capability, so the SDK acknowledges a
    // listen with an empty filter and completes the stream at once: no
    // long-lived listen stream can be held open against this server at all.
    it('resolves promptly after modern subscriptions/listen requests', async () => {
      await start({ enabledTools: ENABLED });
      const modern = await connect('modern', 'T');
      expect(modern.getProtocolEra()).toBe('modern');
      const subscription = await modern.listen({ toolsListChanged: true });
      expect(subscription.honoredFilter).toEqual({});

      const res = await post(
        {
          jsonrpc: '2.0',
          id: 'listen-1',
          method: 'subscriptions/listen',
          params: { notifications: { toolsListChanged: true }, _meta: modernMeta() },
        },
        { authorization: 'Bearer T', ...modernHeaders('subscriptions/listen') }
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
      // The whole stream arrives without stop(): ack, then the graceful close
      const stream = res.text();
      expect(await settlesWithin(stream, 2000)).toBe('settled');
      const text = await stream;
      expect(text).toContain('notifications/subscriptions/acknowledged');
      expect(text).toContain('"resultType":"complete"');

      const stopping = server!.stop();
      server = undefined;
      expect(await settlesWithin(stopping, 5000)).toBe('settled');
    });

    it.each(ERAS)(
      'resolves promptly while a %s tools/call is still waiting on Graph',
      async (era) => {
        await start({ enabledTools: ENABLED });
        let arrived!: () => void;
        const inGraph = new Promise<void>((resolve) => (arrived = resolve));
        vi.mocked(
          (GraphClient.prototype as unknown as { performRequest: () => Promise<Response> })
            .performRequest
        ).mockImplementation(() => {
          arrived();
          return new Promise<Response>(() => {});
        });
        const client = await connect(era, 'T');
        expect(client.getProtocolEra()).toBe(era);
        const call = client.callTool({ name: 'get-current-user', arguments: {} });
        call.catch(() => {});
        await inGraph;

        const stopping = server!.stop();
        server = undefined;
        expect(await settlesWithin(stopping, 2000)).toBe('settled');
        await expect(stopping).resolves.toBeUndefined();
        // The dropped exchange is not left hanging on the client either
        expect(await settlesWithin(call, 2000)).toBe('settled');
        await expect(call).rejects.toThrow();
      }
    );
  });
});

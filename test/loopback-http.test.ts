import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import MicrosoftGraphServer, { isLoopbackHost, parseHttpOption } from '../src/server.js';
import type AuthManager from '../src/auth.js';
import type { CommandOptions } from '../src/cli.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  },
  enableConsoleLogging: vi.fn(),
}));

function fakeAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: () => false,
    isMultiAccount: async () => false,
    listAccounts: async () => [],
    getToken: async () => 'SERVER_OWN_TOKEN',
    getTokenForAccount: async () => 'SERVER_OWN_TOKEN',
  } as unknown as AuthManager;
}

async function freePort(host = '127.0.0.1'): Promise<number> {
  const s: Server = createServer();
  await new Promise<void>((resolve, reject) => {
    s.once('error', reject);
    s.listen(0, host, resolve);
  });
  const { port } = s.address() as AddressInfo;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return port;
}

async function ipv6LoopbackAvailable(): Promise<boolean> {
  try {
    await freePort('::1');
    return true;
  } catch {
    return false;
  }
}

interface RawResponse {
  status: number;
  body: string;
}

function send(
  port: number,
  opts: {
    connectHost?: string;
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    omitHost?: boolean;
    body?: unknown;
  } = {}
): Promise<RawResponse> {
  const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: opts.connectHost ?? '127.0.0.1',
        port,
        path: opts.path ?? '/',
        method: opts.method ?? 'GET',
        setHost: !opts.omitHost,
        headers: {
          ...(payload
            ? {
                'content-type': 'application/json',
                accept: 'application/json, text/event-stream',
                'content-length': String(Buffer.byteLength(payload)),
              }
            : {}),
          ...opts.headers,
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode!, body }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('loopback HTTP bind', () => {
  const savedEnv = { ...process.env };
  let started: MicrosoftGraphServer[] = [];

  beforeEach(() => {
    process.env.MS365_MCP_RATE_LIMIT_DISABLED = 'true';
    delete process.env.MS365_MCP_PUBLIC_URL;
    delete process.env.MS365_MCP_BASE_URL;
  });

  afterEach(async () => {
    for (const server of started) await server.stop();
    started = [];
    process.env = { ...savedEnv };
  });

  async function start(options: CommandOptions): Promise<void> {
    const server = new MicrosoftGraphServer(fakeAuthManager(), options);
    await server.initialize('0.0.0-test');
    started.push(server);
    await server.start();
  }

  describe('parsing', () => {
    it('classifies loopback hosts case-insensitively and nothing else', () => {
      for (const host of ['localhost', 'LOCALHOST', '127.0.0.1', '::1', '[::1]']) {
        expect(isLoopbackHost(host)).toBe(true);
      }
      for (const host of [undefined, '', '0.0.0.0', '::', '192.168.1.10', 'localhost.evil.com']) {
        expect(isLoopbackHost(host)).toBe(false);
      }
    });

    it('parses a bracketed IPv6 bind', () => {
      expect(parseHttpOption('[::1]:3100')).toEqual({ host: '::1', port: 3100 });
      expect(parseHttpOption('[::1]')).toEqual({ host: '::1', port: 3000 });
      expect(parseHttpOption('127.0.0.1:3100')).toEqual({ host: '127.0.0.1', port: 3100 });
      expect(parseHttpOption('3100')).toEqual({ host: undefined, port: 3100 });
    });
  });

  describe('DNS-rebinding guard on a loopback bind', () => {
    let port: number;

    beforeEach(async () => {
      port = await freePort();
      await start({ http: `127.0.0.1:${port}` });
    });

    it('accepts loopback Host headers regardless of case or port', async () => {
      for (const host of [
        `127.0.0.1:${port}`,
        `localhost:${port}`,
        `LOCALHOST:${port}`,
        'localhost',
        `[::1]:${port}`,
      ]) {
        expect((await send(port, { headers: { Host: host } })).status, host).toBe(200);
      }
    });

    it('rejects foreign and look-alike Host headers', async () => {
      for (const host of [
        `evil.example:${port}`,
        `localhost.evil.com:${port}`,
        `127.0.0.1.nip.io:${port}`,
        `[::2]:${port}`,
      ]) {
        expect((await send(port, { headers: { Host: host } })).status, host).toBe(403);
      }
    });

    it('rejects a request with no Host header', async () => {
      expect((await send(port, { omitHost: true })).status).toBeGreaterThanOrEqual(400);
    });

    it('accepts a missing or loopback Origin and rejects any other', async () => {
      const host = `localhost:${port}`;
      expect((await send(port, { headers: { Host: host } })).status).toBe(200);
      for (const origin of ['http://localhost:3000', 'http://LOCALHOST', 'http://[::1]:8080']) {
        expect((await send(port, { headers: { Host: host, Origin: origin } })).status, origin).toBe(
          200
        );
      }
      for (const origin of ['null', 'https://evil.example', 'http://localhost.evil.com']) {
        expect((await send(port, { headers: { Host: host, Origin: origin } })).status, origin).toBe(
          403
        );
      }
    });

    it('rejects a CORS preflight from a foreign Origin', async () => {
      const res = await send(port, {
        method: 'OPTIONS',
        path: '/mcp',
        headers: { Host: `localhost:${port}`, Origin: 'https://evil.example' },
      });
      expect(res.status).toBe(403);
    });

    it('guards the OAuth endpoints too', async () => {
      const res = await send(port, {
        path: '/.well-known/oauth-authorization-server',
        headers: { Host: `evil.example:${port}` },
      });
      expect(res.status).toBe(403);
    });

    it('guards /mcp before authentication runs', async () => {
      const res = await send(port, {
        method: 'POST',
        path: '/mcp',
        headers: { Host: `evil.example:${port}` },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('when the guard is on', () => {
    it('applies to an uppercase LOCALHOST bind', async () => {
      const port = await freePort();
      await start({ http: `LOCALHOST:${port}` });
      expect(
        (await send(port, { connectHost: 'localhost', headers: { Host: `evil.example:${port}` } }))
          .status
      ).toBe(403);
    });

    it('applies to a bracketed [::1] bind', async () => {
      if (!(await ipv6LoopbackAvailable())) return;
      const port = await freePort('::1');
      await start({ http: `[::1]:${port}` });
      expect(
        (await send(port, { connectHost: '::1', headers: { Host: `evil.example:${port}` } })).status
      ).toBe(403);
      expect(
        (await send(port, { connectHost: '::1', headers: { Host: `[::1]:${port}` } })).status
      ).toBe(200);
    });
  });

  describe('when the guard is off', () => {
    it('stays off with --public-url', async () => {
      const port = await freePort();
      await start({ http: `127.0.0.1:${port}`, publicUrl: 'https://mcp.example.com' });
      expect((await send(port, { headers: { Host: 'mcp.example.com' } })).status).toBe(200);
    });

    it('stays off with MS365_MCP_PUBLIC_URL', async () => {
      process.env.MS365_MCP_PUBLIC_URL = 'https://mcp.example.com';
      const port = await freePort();
      await start({ http: `127.0.0.1:${port}` });
      expect((await send(port, { headers: { Host: 'mcp.example.com' } })).status).toBe(200);
    });

    it('stays off for a wildcard bind', async () => {
      const port = await freePort();
      await start({ http: String(port) });
      expect((await send(port, { headers: { Host: `evil.example:${port}` } })).status).toBe(200);
    });
  });

  describe('--http-local-file-tools', () => {
    const FILE_TOOL = 'download-bytes-to-file';

    async function listTools(port: number): Promise<string[]> {
      const res = await send(port, {
        method: 'POST',
        path: '/mcp',
        headers: { Host: `127.0.0.1:${port}` },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      });
      expect(res.status).toBe(200);
      return (JSON.parse(res.body).result.tools as Array<{ name: string }>).map((t) => t.name);
    }

    async function callTool(
      port: number,
      name: string,
      args: Record<string, unknown>
    ): Promise<string> {
      const res = await send(port, {
        method: 'POST',
        path: '/mcp',
        headers: { Host: `127.0.0.1:${port}`, Authorization: 'Bearer opaque-test-token' },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
      });
      expect(res.status).toBe(200);
      return JSON.stringify(JSON.parse(res.body).result);
    }

    const discoverySearch = (port: number) =>
      callTool(port, 'search-tools', { query: FILE_TOOL, limit: 50 });

    it('keeps the tool off HTTP without the flag', async () => {
      const port = await freePort();
      await start({ http: `127.0.0.1:${port}`, allowUnauthenticatedDiscovery: true });
      const tools = await listTools(port);
      expect(tools).toContain('download-bytes');
      expect(tools).not.toContain(FILE_TOOL);
    });

    it('registers the tool with the flag', async () => {
      const port = await freePort();
      await start({
        http: `127.0.0.1:${port}`,
        allowUnauthenticatedDiscovery: true,
        httpLocalFileTools: true,
      });
      expect(await listTools(port)).toContain(FILE_TOOL);
    });

    it('keeps the tool out of discovery search without the flag', async () => {
      const port = await freePort();
      await start({ http: `127.0.0.1:${port}`, discovery: true });
      const result = await discoverySearch(port);
      expect(result).toContain('download-bytes');
      expect(result).not.toContain(FILE_TOOL);
      expect(await callTool(port, 'get-tool-schema', { tool_name: FILE_TOOL })).not.toContain(
        'outputPath'
      );
      expect(
        await callTool(port, 'execute-tool', {
          tool_name: FILE_TOOL,
          parameters: { target: '/me/photo/$value', outputPath: '/tmp/never-written.bin' },
        })
      ).toContain(`Tool not found: ${FILE_TOOL}`);
    });

    it('offers the tool through discovery search with the flag', async () => {
      const port = await freePort();
      await start({ http: `127.0.0.1:${port}`, discovery: true, httpLocalFileTools: true });
      expect(await discoverySearch(port)).toContain(FILE_TOOL);
      expect(await callTool(port, 'get-tool-schema', { tool_name: FILE_TOOL })).toContain(
        'outputPath'
      );
    });

    it.each<[string, CommandOptions, Record<string, string>]>([
      ['--trust-proxy-auth', { http: '127.0.0.1:3000', trustProxyAuth: true }, {}],
      ['a wildcard bind', { http: '3000' }, {}],
      ['--http with no value', { http: true }, {}],
      ['a non-loopback bind', { http: '0.0.0.0:3000' }, {}],
      ['--public-url', { http: '127.0.0.1:3000', publicUrl: 'https://mcp.example.com' }, {}],
      ['MS365_MCP_PUBLIC_URL', { http: '127.0.0.1:3000' }, { MS365_MCP_PUBLIC_URL: 'https://x' }],
      ['--base-url', { http: '127.0.0.1:3000', baseUrl: 'https://mcp.example.com' }, {}],
      ['MS365_MCP_BASE_URL', { http: '127.0.0.1:3000' }, { MS365_MCP_BASE_URL: 'https://x' }],
    ])('refuses to start with %s', async (_label, options, env) => {
      Object.assign(process.env, env);
      const server = new MicrosoftGraphServer(fakeAuthManager(), {
        ...options,
        httpLocalFileTools: true,
      });
      await expect(server.initialize('0.0.0-test')).rejects.toThrow(/--http-local-file-tools/);
    });

    it('is accepted and ignored in stdio mode', async () => {
      const server = new MicrosoftGraphServer(fakeAuthManager(), { httpLocalFileTools: true });
      await expect(server.initialize('0.0.0-test')).resolves.toBeUndefined();
    });
  });
});

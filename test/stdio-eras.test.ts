/**
 * Both protocol eras over stdio, against the real entry point in a child
 * process. MS365_MCP_OAUTH_TOKEN stands in for a login, and HOME, the logs and
 * the token cache point at a throwaway directory, so nothing here touches the
 * real account or keychain. tools/list needs no Graph call.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'src', 'index.ts');
const ENABLED = '^(get-current-user|list-mail-messages)$';
const SERVER_ARGS = ['--import', 'tsx', ENTRY, '--enabled-tools', ENABLED];

let sandbox: string;

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP']) {
    if (process.env[key]) env[key] = process.env[key]!;
  }
  return {
    ...env,
    HOME: sandbox,
    USERPROFILE: sandbox,
    MS365_MCP_LOG_DIR: path.join(sandbox, 'logs'),
    MS365_MCP_TOKEN_CACHE_PATH: path.join(sandbox, 'token-cache.json'),
    MS365_MCP_SELECTED_ACCOUNT_PATH: path.join(sandbox, 'selected-account.json'),
    MS365_MCP_USE_KEYTAR: '0',
    MS365_MCP_OAUTH_TOKEN: 'stdio-eras-test-token',
  };
}

async function connect(era: 'legacy' | 'modern'): Promise<Client> {
  const client = new Client(
    { name: `stdio-${era}`, version: '1.0.0' },
    era === 'modern' ? { versionNegotiation: { mode: 'auto' } } : {}
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: SERVER_ARGS,
    cwd: ROOT,
    env: childEnv(),
    stderr: 'pipe',
  });
  await client.connect(transport);
  return client;
}

describe('protocol eras over stdio', () => {
  beforeAll(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), 'ms365-stdio-eras-'));
  });

  afterAll(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  it('serves a default client on the legacy era and an auto client on the modern era, with the same tools', async () => {
    const legacy = await connect('legacy');
    const modern = await connect('modern');
    try {
      expect(legacy.getProtocolEra()).toBe('legacy');
      expect(modern.getProtocolEra()).toBe('modern');

      const legacyTools = (await legacy.listTools()).tools;
      const modernTools = (await modern.listTools()).tools;
      const legacyNames = legacyTools.map((t) => t.name);
      expect(legacyNames).toEqual(
        expect.arrayContaining(['get-current-user', 'list-mail-messages'])
      );
      expect(modernTools.map((t) => t.name)).toEqual(legacyNames);
      expect(modernTools.map((t) => t.inputSchema)).toEqual(legacyTools.map((t) => t.inputSchema));
      expect(modern.getInstructions()).toBe(legacy.getInstructions());
    } finally {
      await legacy.close();
      await modern.close();
    }
  }, 60_000);

  it('falls back to legacy on the same pipe after a server/discover probe', async () => {
    const child = spawn(process.execPath, SERVER_ARGS, {
      cwd: ROOT,
      env: childEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    try {
      const replies = new Map<number, { result?: Record<string, unknown>; error?: unknown }>();
      const waiters = new Map<number, () => void>();
      let buffered = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        buffered += chunk;
        const lines = buffered.split('\n');
        buffered = lines.pop()!;
        for (const line of lines.filter(Boolean)) {
          const message = JSON.parse(line);
          if (typeof message.id !== 'number') continue;
          replies.set(message.id, message);
          waiters.get(message.id)?.();
        }
      });
      const send = (message: Record<string, unknown>) =>
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
      const reply = (id: number) =>
        replies.has(id)
          ? Promise.resolve(replies.get(id)!)
          : new Promise<{ result?: Record<string, unknown>; error?: unknown }>((resolve) =>
              waiters.set(id, () => resolve(replies.get(id)!))
            );

      send({
        id: 1,
        method: 'server/discover',
        params: {
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientInfo': { name: 'probe', version: '1' },
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      });
      expect((await reply(1)).result).toBeDefined();

      // The client decides to stay on 2025 after all: the server must build a fresh instance
      send({
        id: 2,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'fallback', version: '1' },
        },
      });
      expect((await reply(2)).result?.serverInfo).toMatchObject({ name: 'Microsoft365MCP' });
      send({ method: 'notifications/initialized' });
      send({ id: 3, method: 'tools/list', params: {} });
      const tools = (await reply(3)).result?.tools as Array<{ name: string }>;
      expect(tools.map((t) => t.name)).toEqual(
        expect.arrayContaining(['get-current-user', 'list-mail-messages'])
      );
    } finally {
      child.kill('SIGKILL');
    }
  }, 60_000);

  it('exits on its own when stdin closes', async () => {
    const child = spawn(process.execPath, SERVER_ARGS, {
      cwd: ROOT,
      env: childEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const exited = new Promise<{ code: number | null; signal: string | null }>((resolve) =>
      child.once('exit', (code, signal) => resolve({ code, signal }))
    );
    try {
      // Answer one request first, so the server is past startup and serving
      let stdout = '';
      const answered = new Promise<void>((resolve) => {
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => {
          stdout += chunk;
          if (stdout.includes('"id":1')) resolve();
        });
      });
      child.stdin.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'eof', version: '1' },
          },
        }) + '\n'
      );
      await answered;
      expect(JSON.parse(stdout.trim().split('\n')[0]).result.serverInfo.name).toBe(
        'Microsoft365MCP'
      );

      const closedAt = Date.now();
      child.stdin.end();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const outcome = await Promise.race([
        exited,
        new Promise<'timed out'>((resolve) => {
          timer = setTimeout(() => resolve('timed out'), 5000);
        }),
      ]).finally(() => clearTimeout(timer));
      expect(outcome).not.toBe('timed out');
      // A clean exit, not one forced by a signal
      expect(outcome).toEqual({ code: 0, signal: null });
      expect(Date.now() - closedAt).toBeLessThan(5000);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  }, 60_000);
});

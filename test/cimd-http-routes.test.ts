/**
 * The OAuth routes as `start()` mounts them: discovery advertises CIMD, DCR is
 * off unless turned on, and /authorize checks CIMD clients before redirecting.
 * The CIMD document is stubbed at the resolver, so no network is used.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import MicrosoftGraphServer from '../src/server.js';
import type AuthManager from '../src/auth.js';
import type { CommandOptions } from '../src/cli.js';
import { ClientMetadataResolver } from '../src/lib/client-metadata.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), verbose: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

import logger from '../src/logger.js';

const CLAUDE_CODE = 'https://claude.ai/oauth/claude-code-client-metadata';

async function freePort(): Promise<number> {
  const s: Server = createServer();
  await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve));
  const { port } = s.address() as AddressInfo;
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return port;
}

function fakeAuthManager(): AuthManager {
  return {
    isOAuthModeEnabled: () => true,
    isMultiAccount: async () => false,
    listAccounts: async () => [],
    getToken: async () => 'T',
    getTokenForAccount: async () => 'T',
    setOAuthToken: async () => {},
  } as unknown as AuthManager;
}

describe('OAuth routes with CIMD', () => {
  const savedEnv = { ...process.env };
  let server: MicrosoftGraphServer | undefined;
  let base: string;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MS365_MCP_RATE_LIMIT_DISABLED = 'true';
    vi.spyOn(
      ClientMetadataResolver.prototype as unknown as { resolve: () => Promise<unknown> },
      'resolve'
    ).mockImplementation(async function (this: unknown, ...args: unknown[]) {
      if (args[0] !== CLAUDE_CODE) throw new Error('unexpected client_id');
      return {
        client_id: CLAUDE_CODE,
        client_name: 'Claude Code',
        redirect_uris: ['http://localhost/callback'],
      };
    });
  });

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    vi.restoreAllMocks();
    process.env = { ...savedEnv };
  });

  async function start(extra: Partial<CommandOptions> = {}) {
    const port = await freePort();
    server = new MicrosoftGraphServer(fakeAuthManager(), {
      http: `127.0.0.1:${port}`,
      enableDynamicRegistration: false,
      ...extra,
    });
    await server.initialize('0.0.0-test');
    await server.start();
    base = `http://127.0.0.1:${port}`;
  }

  const authorize = (params: Record<string, string>) =>
    fetch(`${base}/authorize?${new URLSearchParams({ response_type: 'code', ...params })}`, {
      redirect: 'manual',
    });

  it('advertises CIMD and the registration endpoint', async () => {
    await start();
    const meta = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    expect(meta.client_id_metadata_document_supported).toBe(true);
    expect(meta.registration_endpoint).toBe(`${base}/register`);
  });

  it('answers /register with how to turn DCR on while it is off', async () => {
    await start();
    const res = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['http://localhost/callback'] }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_client_metadata');
    expect(body.error_description).toMatch(/--enable-dynamic-registration/);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/Dynamic Client Registration/));
  });

  it('registers clients when DCR is on', async () => {
    await start({ enableDynamicRegistration: true });
    const res = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['http://localhost/callback'] }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).client_id).toMatch(/^mcp-client-/);
  });

  it('redirects a CIMD client to Microsoft with our own client_id', async () => {
    await start();
    const res = await authorize({
      client_id: CLAUDE_CODE,
      redirect_uri: 'http://localhost:4567/callback',
    });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.host).toBe('login.microsoftonline.com');
    expect(location.searchParams.get('client_id')).not.toBe(CLAUDE_CODE);
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:4567/callback');
  });

  it('rejects a CIMD client asking for a redirect URI its document does not list', async () => {
    await start({ enableDynamicRegistration: true });
    const res = await authorize({
      client_id: CLAUDE_CODE,
      redirect_uri: 'http://localhost:4567/elsewhere',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_request');
  });

  it.each([
    ['off', false],
    ['on', true],
  ])('accepts a plain client_id while DCR is %s, as before', async (_name, dcr) => {
    await start({ enableDynamicRegistration: dcr });
    const res = await authorize({
      client_id: 'mcp-client-1700000000000',
      redirect_uri: 'http://localhost:4567/callback',
    });
    expect(res.status).toBe(302);
  });
});

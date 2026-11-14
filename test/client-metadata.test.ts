import { afterEach, describe, expect, it, vi } from 'vitest';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import {
  CIMD_DEFAULT_TTL_MS,
  CIMD_MAX_CACHE_ENTRIES,
  CIMD_MAX_IN_FLIGHT,
  CIMD_MAX_STALE_MS,
  CIMD_MAX_TTL_MS,
  CIMD_MIN_TTL_MS,
  CIMD_TIMEOUT_MS,
  ClientMetadataError,
  ClientMetadataResolver,
  cacheTtlMs,
  checkAuthorizeClient,
  fetchDocument,
  isPublicAddress,
  parseCimdClientId,
  publicOnlyLookup,
  redirectUriMatches,
  validateClientMetadata,
  type FetchedDocument,
} from '../src/lib/client-metadata.js';

const CLAUDE_CODE = 'https://claude.ai/oauth/claude-code-client-metadata';
const CLAUDE_CODE_DOC = {
  client_id: CLAUDE_CODE,
  client_name: 'Claude Code',
  client_uri: 'https://claude.ai',
  redirect_uris: ['http://localhost/callback', 'http://127.0.0.1/callback'],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
};

const ok = (doc: unknown, cacheControl?: string): FetchedDocument => ({
  status: 200,
  body: JSON.stringify(doc),
  cacheControl,
});

describe('parseCimdClientId', () => {
  it('accepts an https URL with a path', () => {
    expect(parseCimdClientId(CLAUDE_CODE).host).toBe('claude.ai');
  });

  it.each([
    ['http://example.com/client.json', 'https'],
    ['https://example.com', 'path'],
    ['https://example.com/', 'path'],
    ['https://user:pw@example.com/c.json', 'credentials'],
    ['https://example.com/c.json#x', 'fragment'],
    ['https://example.com/a/../c.json', 'normalized'],
    ['https://EXAMPLE.com/c.json', 'normalized'],
    ['https://127.0.0.1/c.json', 'public'],
    ['https://[::1]/c.json', 'public'],
    ['https://10.1.2.3/c.json', 'public'],
    ['https://169.254.169.254/latest/meta-data', 'public'],
    ['not a url', 'valid URL'],
  ])('rejects %s', (id, reason) => {
    expect(() => parseCimdClientId(id)).toThrow(new RegExp(reason));
  });
});

describe('isPublicAddress', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.5.4',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '64:ff9b::a00:1',
    '64:ff9b::7f00:1',
    '64:ff9b::1',
    '64:ff9b:1::a04f:680a',
    '2002:a00:1::1',
    '0:0:0:0:0:ffff:7f00:1',
    '0:0:0:0:0:ffff:127.0.0.1',
    '::0:ffff:169.254.169.254',
    '::ffff:0:101:101',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    '1.1.1.1',
    '160.79.104.10',
    '2606:4700::1111',
    '::ffff:1.1.1.1',
    '64:ff9b::a04f:680a', // DNS64 for 160.79.104.10
    '64:ff9b:0:0:0:0:a04f:680a',
  ])('allows %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe('publicOnlyLookup', () => {
  const lookup = (host: string, all = false) =>
    new Promise<unknown>((resolve, reject) =>
      publicOnlyLookup(host, { all }, (err, address, family) =>
        err ? reject(err) : resolve(all ? address : { address, family })
      )
    );
  const stub = (v4: string[] | Error, v6: string[] | Error) => {
    const answer = (r: string[] | Error) => async () => {
      if (r instanceof Error) throw r;
      return r;
    };
    vi.spyOn(dns.promises.Resolver.prototype, 'resolve4').mockImplementation(answer(v4));
    vi.spyOn(dns.promises.Resolver.prototype, 'resolve6').mockImplementation(answer(v6));
  };
  afterEach(() => vi.restoreAllMocks());

  it('returns a public address', async () => {
    stub(['93.184.216.34'], new Error('ENODATA'));
    expect(await lookup('example.com')).toEqual({ address: '93.184.216.34', family: 4 });
  });

  it('returns every address when asked for all', async () => {
    stub(['93.184.216.34'], ['2606:2800:220:1::1']);
    expect(await lookup('example.com', true)).toEqual([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1::1', family: 6 },
    ]);
  });

  it('refuses the host when any address is private', async () => {
    stub(['93.184.216.34'], ['fd00::1']);
    await expect(lookup('example.com')).rejects.toThrow(/public address/);
  });

  it('passes on a DNS failure', async () => {
    stub(new Error('ENOTFOUND'), new Error('ENOTFOUND'));
    await expect(lookup('nope.example')).rejects.toThrow(/ENOTFOUND/);
  });
});

describe('fetchDocument', () => {
  // No network needed: these hosts never get a socket, the lookup refuses them.
  it.each([
    'https://localhost/client.json',
    'https://localhost:1/client.json',
    'https://app.localhost/client.json',
  ])('refuses a host that resolves to loopback (%s)', async (url) => {
    await expect(fetchDocument(new URL(url))).rejects.toThrow(/public address/);
  });

  it.each(['https://127.0.0.1/c.json', 'https://[::ffff:a9fe:a9fe]/c.json'])(
    'refuses a non-public IP literal, which never goes through the lookup (%s)',
    async (url) => {
      await expect(fetchDocument(new URL(url))).rejects.toThrow(/public address/);
    }
  );

  it('rejects a document over the size cap even when the whole body arrives in one read', async () => {
    // Valid JSON first, then padding past the cap, all in a single write: 'end'
    // fires after the destroy, and must not hand back the valid prefix.
    const doc = JSON.stringify(CLAUDE_CODE_DOC);
    const pad = ' '.repeat(6000);
    const chunk = (s: string) => `${s.length.toString(16)}\r\n${s}\r\n`;
    const raw =
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n' +
      chunk(doc) +
      chunk(pad) +
      '0\r\n\r\n';
    const server = net.createServer((socket) => socket.once('data', () => socket.end(raw)));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;
    // Plain http to the local socket: the real lookup would refuse 127.0.0.1.
    vi.spyOn(https, 'get').mockImplementation(((url: URL, _opts: unknown, cb: never) =>
      http.get(`http://127.0.0.1:${port}${url.pathname}`, { agent: false }, cb)) as never);
    try {
      await expect(fetchDocument(new URL('https://example.com/c.json'))).rejects.toThrow(
        /too large/
      );
    } finally {
      vi.restoreAllMocks();
      server.close();
    }
  });

  it('marks a fetch that runs past the deadline as transient', async () => {
    // Accepts the request and never answers.
    const sockets: net.Socket[] = [];
    const server = net.createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;
    vi.spyOn(https, 'get').mockImplementation(((url: URL, _opts: unknown, cb: never) =>
      http.get(`http://127.0.0.1:${port}${url.pathname}`, { agent: false }, cb)) as never);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const fetching = fetchDocument(new URL('https://example.com/c.json')).catch((e) => e);
      await vi.advanceTimersByTimeAsync(CIMD_TIMEOUT_MS);
      const err = await fetching;
      expect(err).toBeInstanceOf(ClientMetadataError);
      expect(err.message).toMatch(/timed out/);
      expect(err.transient).toBe(true);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
      sockets.forEach((socket) => socket.destroy());
      server.close();
    }
  });
});

describe('validateClientMetadata', () => {
  it('accepts the Claude Code document', () => {
    expect(validateClientMetadata(CLAUDE_CODE_DOC, CLAUDE_CODE)).toEqual({
      client_id: CLAUDE_CODE,
      client_name: 'Claude Code',
      redirect_uris: CLAUDE_CODE_DOC.redirect_uris,
    });
  });

  it.each([
    ['not an object', [], /JSON object/],
    ['client_id mismatch', { ...CLAUDE_CODE_DOC, client_id: 'https://evil.example/c' }, /match/],
    ['no client_name', { ...CLAUDE_CODE_DOC, client_name: undefined }, /client_name/],
    ['empty redirect_uris', { ...CLAUDE_CODE_DOC, redirect_uris: [] }, /redirect_uris/],
    ['non-string redirect_uri', { ...CLAUDE_CODE_DOC, redirect_uris: [1] }, /redirect_uris/],
    [
      'confidential client',
      { ...CLAUDE_CODE_DOC, token_endpoint_auth_method: 'private_key_jwt' },
      /none/,
    ],
  ])('rejects %s', (_name, doc, message) => {
    expect(() => validateClientMetadata(doc, CLAUDE_CODE)).toThrow(message);
  });
});

describe('redirectUriMatches', () => {
  const registered = CLAUDE_CODE_DOC.redirect_uris;

  it('matches loopback redirect URIs on any port (RFC 8252)', () => {
    expect(redirectUriMatches('http://localhost:54321/callback', registered)).toBe(true);
    expect(redirectUriMatches('http://127.0.0.1:8080/callback', registered)).toBe(true);
  });

  it.each([
    'http://localhost:54321/other',
    'http://localhost:54321/callback?x=1',
    'http://[::1]:54321/callback',
    'https://localhost:54321/callback',
    'http://evil.example/callback',
    'http://localhost:54321/callback#frag',
    'http://user:pw@localhost:54321/callback',
    'http://localhost:54321/x/../callback',
    'http://localhost:54321\\callback',
    'http://LOCALHOST:54321/callback',
  ])('rejects %s', (uri) => {
    expect(redirectUriMatches(uri, registered)).toBe(false);
  });

  it('matches web redirect URIs exactly, port included', () => {
    const web = ['https://claude.ai/api/mcp/auth_callback'];
    expect(redirectUriMatches('https://claude.ai/api/mcp/auth_callback', web)).toBe(true);
    expect(redirectUriMatches('https://claude.ai:8443/api/mcp/auth_callback', web)).toBe(false);
    expect(redirectUriMatches('https://claude.ai/api/mcp/auth_callback/', web)).toBe(false);
  });
});

describe('cacheTtlMs', () => {
  it.each([
    [undefined, CIMD_DEFAULT_TTL_MS],
    ['public', CIMD_DEFAULT_TTL_MS],
    ['max-age=600', 600_000],
    ['public, max-age=1', CIMD_MIN_TTL_MS],
    ['max-age=99999999', CIMD_MAX_TTL_MS],
    ['no-store', 0],
    ['no-cache, max-age=600', 0],
    ['max-age=0', 0],
    ['max-age="600"', 600_000],
  ])('%s -> %d', (header, ttl) => {
    expect(cacheTtlMs(header)).toBe(ttl);
  });
});

describe('ClientMetadataResolver', () => {
  it('caches a document for its max-age and fetches again after', async () => {
    let now = 1_000_000;
    const fetcher = vi.fn(async () => ok(CLAUDE_CODE_DOC, 'max-age=120'));
    const resolver = new ClientMetadataResolver({ fetcher, now: () => now });

    await resolver.resolve(CLAUDE_CODE);
    await resolver.resolve(CLAUDE_CODE);
    expect(fetcher).toHaveBeenCalledTimes(1);

    now += 121_000;
    await resolver.resolve(CLAUDE_CODE);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses an expired document when the refetch fails', async () => {
    let now = 1_000_000;
    const fetcher = vi
      .fn<() => Promise<FetchedDocument>>()
      .mockResolvedValueOnce(ok(CLAUDE_CODE_DOC, 'max-age=120'))
      .mockRejectedValue(new Error('ETIMEDOUT'));
    const resolver = new ClientMetadataResolver({ fetcher, now: () => now });
    await resolver.resolve(CLAUDE_CODE);

    now += 121_000;
    expect((await resolver.resolve(CLAUDE_CODE)).client_name).toBe('Claude Code');
    expect(fetcher).toHaveBeenCalledTimes(2);

    now += CIMD_MAX_STALE_MS;
    await expect(resolver.resolve(CLAUDE_CODE)).rejects.toThrow(/could not be fetched/);
  });

  // What the refetch does: answer with a status, or fail the way fetchDocument does.
  type Refetch = FetchedDocument | ClientMetadataError;
  const refetching = (answer: Refetch) => {
    const fetcher = vi
      .fn<() => Promise<FetchedDocument>>()
      .mockResolvedValueOnce(ok(CLAUDE_CODE_DOC, 'max-age=120'));
    if (answer instanceof ClientMetadataError) fetcher.mockRejectedValueOnce(answer);
    else fetcher.mockResolvedValueOnce(answer);
    return fetcher.mockRejectedValue(new Error('ETIMEDOUT'));
  };

  it.each<[string, Refetch]>([
    ['a server error', { status: 503, body: '' }],
    ['429', { status: 429, body: '' }],
    ['a timeout', new ClientMetadataError('client metadata fetch timed out', true)],
  ])('keeps an expired document when its host answers with %s', async (_, answer) => {
    let now = 1_000_000;
    const resolver = new ClientMetadataResolver({ fetcher: refetching(answer), now: () => now });
    await resolver.resolve(CLAUDE_CODE);

    now += 121_000;
    expect((await resolver.resolve(CLAUDE_CODE)).client_name).toBe('Claude Code');
  });

  it.each<[string, Refetch]>([
    ['a 404', { status: 404, body: '' }],
    ['a document that no longer validates', ok({ ...CLAUDE_CODE_DOC, redirect_uris: [] })],
    ['a document that is not JSON', { status: 200, body: '<html>' }],
    [
      'a private address',
      new ClientMetadataError('client_id host does not resolve to a public address'),
    ],
  ])('drops an expired document when its host answers with %s', async (_, answer) => {
    let now = 1_000_000;
    const resolver = new ClientMetadataResolver({ fetcher: refetching(answer), now: () => now });
    await resolver.resolve(CLAUDE_CODE);

    now += 121_000;
    await expect(resolver.resolve(CLAUDE_CODE)).rejects.toThrow(ClientMetadataError);
    // Gone for good: a later timeout has no stale copy to fall back on.
    await expect(resolver.resolve(CLAUDE_CODE)).rejects.toThrow(/could not be fetched/);
  });

  it('uses an expired document while every lookup slot is busy', async () => {
    let now = 1_000_000;
    let hang = false;
    const fetcher = vi.fn(async (url: URL) => {
      if (hang && url.hostname !== 'claude.ai') return new Promise<FetchedDocument>(() => {});
      return ok(CLAUDE_CODE_DOC, 'max-age=120');
    });
    const resolver = new ClientMetadataResolver({ fetcher, now: () => now });
    await resolver.resolve(CLAUDE_CODE);

    hang = true;
    for (let i = 0; i < CIMD_MAX_IN_FLIGHT; i++) void resolver.resolve(`https://h${i}.example/c`);
    now += 121_000;
    expect((await resolver.resolve(CLAUDE_CODE)).client_name).toBe('Claude Code');
    await expect(resolver.resolve('https://other.example/c')).rejects.toThrow(/too many/);
  });

  it('evicts the least recently used document when full', async () => {
    const doc = (url: URL) => ok({ ...CLAUDE_CODE_DOC, client_id: url.href }, 'max-age=600');
    const fetcher = vi.fn(async (url: URL) => doc(url));
    const resolver = new ClientMetadataResolver({ fetcher });
    await resolver.resolve(CLAUDE_CODE);
    for (let i = 0; i < CIMD_MAX_CACHE_ENTRIES - 1; i++) {
      await resolver.resolve(`https://h${i}.example/c`);
    }
    await resolver.resolve(CLAUDE_CODE); // a hit makes it the newest
    await resolver.resolve('https://new.example/c'); // evicts h0, not Claude Code
    fetcher.mockClear();

    await resolver.resolve(CLAUDE_CODE);
    expect(fetcher).not.toHaveBeenCalled();
    await resolver.resolve('https://h0.example/c');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('shares one fetch between concurrent requests', async () => {
    const fetcher = vi.fn(async () => ok(CLAUDE_CODE_DOC));
    const resolver = new ClientMetadataResolver({ fetcher });
    await Promise.all([resolver.resolve(CLAUDE_CODE), resolver.resolve(CLAUDE_CODE)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures or no-store documents', async () => {
    const fetcher = vi
      .fn<() => Promise<FetchedDocument>>()
      .mockResolvedValueOnce({ status: 500, body: '' })
      .mockResolvedValueOnce(ok(CLAUDE_CODE_DOC, 'no-store'))
      .mockResolvedValue(ok(CLAUDE_CODE_DOC));
    const resolver = new ClientMetadataResolver({ fetcher });

    await expect(resolver.resolve(CLAUDE_CODE)).rejects.toThrow(/could not be fetched/);
    await resolver.resolve(CLAUDE_CODE);
    await resolver.resolve(CLAUDE_CODE);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('reports redirects as errors rather than following them', async () => {
    const resolver = new ClientMetadataResolver({
      fetcher: async () => ({ status: 302, body: '' }),
    });
    await expect(resolver.resolve(CLAUDE_CODE)).rejects.toThrow(/redirects are not followed/);
  });

  it('hides low-level fetch errors behind a generic message', async () => {
    const resolver = new ClientMetadataResolver({
      fetcher: async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.5:443');
      },
    });
    const err = await resolver.resolve(CLAUDE_CODE).catch((e) => e);
    expect(err).toBeInstanceOf(ClientMetadataError);
    expect(err.message).not.toContain('10.0.0.5');
  });

  it('refuses new lookups while too many are in flight', async () => {
    const pending: Array<(doc: FetchedDocument) => void> = [];
    const resolver = new ClientMetadataResolver({
      fetcher: () => new Promise((resolve) => pending.push(resolve)),
    });
    const ids = Array.from({ length: 20 }, (_, i) => `https://example.com/c${i}.json`);
    const loads = ids.map((id) => resolver.resolve(id).catch(() => undefined));
    await expect(resolver.resolve('https://example.com/one-more.json')).rejects.toThrow(/too many/);
    pending.forEach((resolve) => resolve({ status: 500, body: '' }));
    await Promise.all(loads);
  });

  it('rejects an invalid client_id before fetching anything', async () => {
    const fetcher = vi.fn();
    const resolver = new ClientMetadataResolver({ fetcher });
    await expect(resolver.resolve('https://127.0.0.1/c.json')).rejects.toThrow(/public/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('checkAuthorizeClient', () => {
  const resolver = new ClientMetadataResolver({ fetcher: async () => ok(CLAUDE_CODE_DOC) });
  const check = (clientId: string | null, redirectUri: string | null) =>
    checkAuthorizeClient({ clientId, redirectUri, resolver });

  it('accepts a CIMD client whose document lists the redirect URI', async () => {
    expect(await check(CLAUDE_CODE, 'http://localhost:4000/callback')).toEqual({
      ok: true,
      clientName: 'Claude Code',
    });
  });

  it('rejects a CIMD client asking for a redirect URI its document does not list', async () => {
    const result = await check(CLAUDE_CODE, 'https://evil.example/cb');
    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
  });

  it('requires a redirect_uri from CIMD clients, before fetching anything', async () => {
    const fetcher = vi.fn();
    const result = await checkAuthorizeClient({
      clientId: CLAUDE_CODE,
      redirectUri: null,
      resolver: new ClientMetadataResolver({ fetcher }),
    });
    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['a DCR-issued client_id', 'mcp-client-1700000000000'],
    ['a static client_id', 'my-app'],
    ['no client_id', null],
    ['an http client_id', 'http://example.com/c.json'],
  ])('lets %s through without a lookup, as before', async (_name, clientId) => {
    const fetcher = vi.fn();
    const result = await checkAuthorizeClient({
      clientId,
      redirectUri: 'http://localhost:4000/callback',
      resolver: new ClientMetadataResolver({ fetcher }),
    });
    expect(result).toEqual({ ok: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects a CIMD client whose document cannot be loaded', async () => {
    const failing = new ClientMetadataResolver({
      fetcher: async () => ({ status: 404, body: '' }),
    });
    const result = await checkAuthorizeClient({
      clientId: CLAUDE_CODE,
      redirectUri: 'http://localhost:4000/callback',
      resolver: failing,
    });
    expect(result).toMatchObject({ ok: false, error: 'invalid_client' });
  });
});

/**
 * OAuth Client ID Metadata Documents (CIMD) for the /authorize endpoint.
 *
 * A CIMD client uses an https URL as its client_id. The document at that URL
 * names the client and lists its redirect URIs, and we only send a user back
 * to a redirect URI the document lists. This replaces Dynamic Client
 * Registration, which the MCP spec deprecated in 2026-07-28:
 * https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration
 *
 * The URL comes from whoever calls /authorize, so fetching it is an SSRF
 * risk: we resolve the host ourselves, refuse non-public addresses, connect
 * to the address we checked, follow no redirects, and cap time and size.
 */

import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import type { LookupFunction } from 'node:net';
import { isLoopbackHost } from './redirect-uri-validation.js';

export const CIMD_MAX_BYTES = 5 * 1024;
export const CIMD_TIMEOUT_MS = 5_000;
export const CIMD_DEFAULT_TTL_MS = 5 * 60_000;
export const CIMD_MIN_TTL_MS = 60_000;
export const CIMD_MAX_TTL_MS = 24 * 60 * 60_000;
export const CIMD_MAX_CACHE_ENTRIES = 500;
export const CIMD_MAX_IN_FLIGHT = 20;

export interface ClientMetadata {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
}

export class ClientMetadataError extends Error {}

/** Host of a client_id URL for logging, or undefined when it does not parse. */
export function clientIdHost(clientId: string): string | undefined {
  try {
    return new URL(clientId).host;
  } catch {
    return undefined;
  }
}

/** True when the client_id is meant as a CIMD URL (any https:// value). */
export function looksLikeCimdClientId(clientId: string): boolean {
  return clientId.toLowerCase().startsWith('https://');
}

/**
 * Parses a CIMD client_id: https, a path, no credentials or fragment, and in
 * canonical form (so "/a/../b" or an upper-case host can't pose as another).
 */
export function parseCimdClientId(clientId: string): URL {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    throw new ClientMetadataError('client_id is not a valid URL');
  }
  if (url.protocol !== 'https:') throw new ClientMetadataError('client_id must use https');
  if (url.username || url.password) {
    throw new ClientMetadataError('client_id must not contain credentials');
  }
  if (url.hash || clientId.includes('#')) {
    throw new ClientMetadataError('client_id must not contain a fragment');
  }
  if (url.pathname === '/' || url.pathname === '') {
    throw new ClientMetadataError('client_id must contain a path');
  }
  if (url.href !== clientId) {
    throw new ClientMetadataError('client_id must be a normalized URL');
  }
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && !isPublicAddress(url.hostname)) {
    throw new ClientMetadataError('client_id host is not a public address');
  }
  return url;
}

const blockedV4 = new net.BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedV4.addSubnet(prefix, bits, 'ipv4');
}

const blockedV6 = new net.BlockList();
for (const [prefix, bits] of [
  ['::', 128],
  ['::1', 128],
  ['::', 96], // IPv4-compatible (deprecated)
  ['::ffff:0:0', 96], // IPv4-mapped; public ones are let through above, before this list
  ['::ffff:0:0:0', 96], // IPv4-translated (SIIT)
  ['64:ff9b::', 96], // NAT64; public ones are let through above, before this list
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16], // 6to4
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blockedV6.addSubnet(prefix, bits, 'ipv6');
}

/** True only for globally routable unicast addresses. */
export function isPublicAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '');
  const family = net.isIP(ip);
  if (family === 4) return !blockedV4.check(ip, 'ipv4');
  if (family !== 6) return false;
  // The URL parser writes IPv6 in one canonical form (compressed, mapped IPv4
  // in hex), so spelling variants can't slip past the checks below.
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  // IPv4-mapped and NAT64 (what DNS64 hands out on IPv6-only networks) are
  // judged as the IPv4 they carry.
  const mapped = /^(?:::ffff|64:ff9b:):([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (mapped) {
    const hi = parseInt(mapped[1], 16);
    const lo = parseInt(mapped[2], 16);
    return isPublicAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return !blockedV6.check(canonical, 'ipv6');
}

/**
 * Resolves A and AAAA over the network rather than with dns.lookup: lookup
 * runs getaddrinfo on libuv's small thread pool, and a host whose DNS never
 * answers would tie it up for everything else in the process. /etc/hosts is
 * not read, which is fine since we only want public hosts.
 */
async function resolvePublic(hostname: string): Promise<dns.LookupAddress[]> {
  // RFC 6761: localhost names are loopback whatever DNS says.
  if (/(^|\.)localhost\.?$/i.test(hostname)) {
    throw new ClientMetadataError('client_id host does not resolve to a public address');
  }
  const resolver = new dns.promises.Resolver({ timeout: CIMD_TIMEOUT_MS / 2, tries: 1 });
  const [v4, v6] = await Promise.allSettled([
    resolver.resolve4(hostname),
    resolver.resolve6(hostname),
  ]);
  const list: dns.LookupAddress[] = [
    ...(v4.status === 'fulfilled' ? v4.value.map((address) => ({ address, family: 4 })) : []),
    ...(v6.status === 'fulfilled' ? v6.value.map((address) => ({ address, family: 6 })) : []),
  ];
  if (list.length === 0) {
    throw v4.status === 'rejected' ? v4.reason : new Error(`no addresses for ${hostname}`);
  }
  return list;
}

/**
 * Lookup that refuses the whole host if any address it resolves to is not
 * public, so the socket only ever connects to an address we checked.
 */
export const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  resolvePublic(hostname).then(
    (all) => {
      const list = options.family ? all.filter((a) => a.family === options.family) : all;
      if (list.length === 0 || all.some((a) => !isPublicAddress(a.address))) {
        const error = new ClientMetadataError(
          'client_id host does not resolve to a public address'
        );
        callback(error as Parameters<typeof callback>[0], '', 4);
        return;
      }
      if (options.all) {
        (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
      } else {
        callback(null, list[0].address, list[0].family);
      }
    },
    (err) => callback(err, '', 4)
  );
};

export interface FetchedDocument {
  status: number;
  body: string;
  cacheControl?: string;
}

export type DocumentFetcher = (url: URL) => Promise<FetchedDocument>;

/** GET over https with the public-only lookup, no redirects, and size and time caps. */
export const fetchDocument: DocumentFetcher = (url) =>
  new Promise((resolve, reject) => {
    // Node skips `lookup` for an IP literal, so check those here.
    const literal = url.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(literal) && !isPublicAddress(literal)) {
      reject(new ClientMetadataError('client_id host is not a public address'));
      return;
    }
    const req = https.get(
      url,
      {
        agent: false,
        lookup: publicOnlyLookup,
        headers: { accept: 'application/json' },
        timeout: CIMD_TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode !== 200) {
          clearTimeout(deadline);
          resolve({ status: res.statusCode ?? 0, body: '' });
          req.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > CIMD_MAX_BYTES) {
            req.destroy(new ClientMetadataError('client metadata document is too large'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          clearTimeout(deadline);
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            cacheControl: res.headers['cache-control'],
          });
        });
        res.on('error', (err) => {
          clearTimeout(deadline);
          reject(err);
        });
      }
    );
    // `timeout` above only fires on an idle socket; this caps the whole fetch.
    const deadline = setTimeout(
      () => req.destroy(new ClientMetadataError('client metadata fetch timed out')),
      CIMD_TIMEOUT_MS
    );
    req.on('timeout', () =>
      req.destroy(new ClientMetadataError('client metadata fetch timed out'))
    );
    req.on('error', (err) => {
      clearTimeout(deadline);
      reject(err);
    });
  });

/** Checks the fields we rely on. Extra fields are allowed and ignored. */
export function validateClientMetadata(raw: unknown, clientId: string): ClientMetadata {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ClientMetadataError('client metadata document is not a JSON object');
  }
  const doc = raw as Record<string, unknown>;
  if (doc.client_id !== clientId) {
    throw new ClientMetadataError('client metadata client_id does not match the URL');
  }
  if (typeof doc.client_name !== 'string' || doc.client_name.trim() === '') {
    throw new ClientMetadataError('client metadata is missing client_name');
  }
  if (
    !Array.isArray(doc.redirect_uris) ||
    doc.redirect_uris.length === 0 ||
    !doc.redirect_uris.every((u) => typeof u === 'string')
  ) {
    throw new ClientMetadataError('client metadata is missing redirect_uris');
  }
  // We only issue tokens to public clients (token_endpoint_auth_methods_supported: none).
  if (doc.token_endpoint_auth_method !== undefined && doc.token_endpoint_auth_method !== 'none') {
    throw new ClientMetadataError('client metadata token_endpoint_auth_method must be none');
  }
  return {
    client_id: clientId,
    client_name: doc.client_name,
    redirect_uris: doc.redirect_uris as string[],
  };
}

/** Cache lifetime from Cache-Control, clamped; 0 means do not cache. */
export function cacheTtlMs(cacheControl: string | undefined): number {
  if (!cacheControl) return CIMD_DEFAULT_TTL_MS;
  const directives = cacheControl.toLowerCase();
  if (/(^|[\s,])(no-store|no-cache)\b/.test(directives)) return 0;
  const maxAge = /(^|[\s,])max-age="?(\d+)"?/.exec(directives);
  if (!maxAge) return CIMD_DEFAULT_TTL_MS;
  const ms = Number(maxAge[2]) * 1000;
  if (ms === 0) return 0;
  return Math.min(CIMD_MAX_TTL_MS, Math.max(CIMD_MIN_TTL_MS, ms));
}

/**
 * Exact match, except that for http loopback redirect URIs the port may
 * differ (RFC 8252 section 7.3): native clients such as Claude Code list
 * http://localhost/callback and listen on whatever port is free. Only the
 * port: the registered URI with the requested port put in must equal the
 * requested one character for character.
 */
export function redirectUriMatches(requested: string, registered: string[]): boolean {
  if (registered.includes(requested)) return true;
  let req: URL;
  try {
    req = new URL(requested);
  } catch {
    return false;
  }
  if (req.protocol !== 'http:' || !isLoopbackHost(req.hostname)) return false;
  return registered.some((candidate) => {
    let reg: URL;
    try {
      reg = new URL(candidate);
    } catch {
      return false;
    }
    if (reg.protocol !== 'http:' || !isLoopbackHost(reg.hostname)) return false;
    reg.port = req.port;
    return reg.href === requested;
  });
}

interface CacheEntry {
  metadata: ClientMetadata;
  expiresAt: number;
}

/** How long past its expiry a cached document may stand in when a refetch can't be done. */
export const CIMD_MAX_STALE_MS = 24 * 60 * 60_000;

export interface ClientMetadataResolverOptions {
  fetcher?: DocumentFetcher;
  now?: () => number;
}

export class ClientMetadataResolver {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<ClientMetadata>>();
  private readonly fetcher: DocumentFetcher;
  private readonly now: () => number;

  constructor(options: ClientMetadataResolverOptions = {}) {
    this.fetcher = options.fetcher ?? fetchDocument;
    this.now = options.now ?? Date.now;
  }

  async resolve(clientId: string): Promise<ClientMetadata> {
    const url = parseCimdClientId(clientId);
    const cached = this.cache.get(clientId);
    if (cached) {
      // Least recently used goes first when the cache is full, so a client
      // people actually log in with is not pushed out by one-off ids.
      this.cache.delete(clientId);
      this.cache.set(clientId, cached);
      if (cached.expiresAt > this.now()) return cached.metadata;
    }
    // stale-if-error (RFC 5861): an expired document beats locking the client
    // out because its host is slow or the lookup slots are busy.
    const stale =
      cached && cached.expiresAt + CIMD_MAX_STALE_MS > this.now() ? cached.metadata : undefined;

    let pending = this.inFlight.get(clientId);
    if (!pending) {
      if (this.inFlight.size >= CIMD_MAX_IN_FLIGHT) {
        if (stale) return stale;
        throw new ClientMetadataError('too many client metadata lookups in progress, try again');
      }
      pending = this.load(url, clientId).finally(() => this.inFlight.delete(clientId));
      this.inFlight.set(clientId, pending);
    }
    if (!stale) return pending;
    return pending.catch(() => stale);
  }

  private async load(url: URL, clientId: string): Promise<ClientMetadata> {
    let fetched: FetchedDocument;
    try {
      fetched = await this.fetcher(url);
    } catch (err) {
      if (err instanceof ClientMetadataError) throw err;
      throw new ClientMetadataError('client metadata document could not be fetched');
    }
    if (fetched.status !== 200) {
      throw new ClientMetadataError(
        'client metadata document could not be fetched (it must answer 200; redirects are not followed)'
      );
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fetched.body);
    } catch {
      throw new ClientMetadataError('client metadata document is not valid JSON');
    }
    const metadata = validateClientMetadata(raw, clientId);

    const ttl = cacheTtlMs(fetched.cacheControl);
    this.cache.delete(clientId);
    if (ttl > 0) {
      while (this.cache.size >= CIMD_MAX_CACHE_ENTRIES) {
        const oldest = this.cache.keys().next().value;
        if (oldest === undefined) break;
        this.cache.delete(oldest);
      }
      this.cache.set(clientId, { metadata, expiresAt: this.now() + ttl });
    }
    return metadata;
  }
}

export const DCR_DISABLED_HINT =
  'Dynamic Client Registration is off on this server. Use a client that supports ' +
  'Client ID Metadata Documents, or start the server with --enable-dynamic-registration ' +
  '(or MS365_MCP_ENABLE_DCR=true).';

export type AuthorizeClientCheck =
  | { ok: true; clientName?: string }
  | { ok: false; error: 'invalid_client' | 'invalid_request'; description: string };

/**
 * Decides whether /authorize may go on for this client_id and redirect_uri.
 * CIMD client_ids are checked against their document. Any other client_id
 * (including none) goes through as before: we send our own client_id to
 * Entra anyway, so refusing it would only break existing setups.
 */
export async function checkAuthorizeClient(params: {
  clientId: string | null;
  redirectUri: string | null;
  resolver: ClientMetadataResolver;
}): Promise<AuthorizeClientCheck> {
  const { clientId, redirectUri, resolver } = params;

  if (!clientId || !looksLikeCimdClientId(clientId)) return { ok: true };

  // Before the fetch: a request that is going to fail anyway costs no outbound call.
  if (!redirectUri) {
    return { ok: false, error: 'invalid_request', description: 'redirect_uri is required' };
  }

  let metadata: ClientMetadata;
  try {
    metadata = await resolver.resolve(clientId);
  } catch (err) {
    const reason = err instanceof ClientMetadataError ? err.message : 'client metadata error';
    return { ok: false, error: 'invalid_client', description: reason };
  }
  if (!redirectUriMatches(redirectUri, metadata.redirect_uris)) {
    return {
      ok: false,
      error: 'invalid_request',
      description: 'redirect_uri is not listed in the client metadata document',
    };
  }
  return { ok: true, clientName: metadata.client_name };
}

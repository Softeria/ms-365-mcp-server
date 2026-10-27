import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkClientCredentials } from '../src/lib/microsoft-auth.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const SECRET = 'client-secret-value-SENTINEL';
const realFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown) {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

describe('checkClientCredentials (startup self-test)', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('posts a client_credentials request to the tenant token endpoint', async () => {
    const calls = mockFetch(200, { access_token: 'x', token_type: 'Bearer', expires_in: 3599 });
    const r = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe('https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token');
    const p = new URLSearchParams(calls[0].body);
    expect(p.get('grant_type')).toBe('client_credentials');
    expect(p.get('client_id')).toBe('client-id');
    expect(p.get('client_secret')).toBe(SECRET);
    expect(p.get('scope')).toBe('https://graph.microsoft.com/.default');
  });

  it('reports a rejected secret with the AADSTS code and correlation id, nothing else', async () => {
    mockFetch(401, {
      error: 'invalid_client',
      error_description: `AADSTS7000215: Invalid client secret provided. ${SECRET}`,
      error_codes: [7000215],
      correlation_id: 'corr-1',
    });
    const r = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r).toMatchObject({
      ok: false,
      status: 401,
      error: 'invalid_client',
      error_codes: [7000215],
      correlation_id: 'corr-1',
    });
    expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(JSON.stringify(r)).not.toContain('error_description');
  });

  it('never throws: an unparsed body and a network failure become results', async () => {
    globalThis.fetch = (async () =>
      new Response('<html>gateway</html>', { status: 502 })) as typeof fetch;
    const r1 = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r1.ok).toBe(false);
    expect(r1.status).toBe(502);
    expect(r1.detail).toBe('unparsed response (20 chars)');

    globalThis.fetch = (async () => {
      throw Object.assign(new Error(`connect ${SECRET}`), { code: 'ECONNREFUSED' });
    }) as typeof fetch;
    const r2 = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r2.ok).toBe(false);
    expect(r2.detail).toBe('request failed: Error code=ECONNREFUSED');
  });
});

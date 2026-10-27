import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkClientCredentials, credentialCheckMessage } from '../src/lib/microsoft-auth.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const SECRET = 'client-secret-value-SENTINEL';
const realFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown) {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (url: string | URL, init?: { body?: unknown }) => {
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
    expect(r.verdict).toBe('accepted');
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
      verdict: 'rejected',
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
    expect(r1.verdict).toBe('malformed');
    expect(r1.detail).toBe('HTTP 502, unparsed response (20 chars)');

    globalThis.fetch = (async () => {
      throw Object.assign(new Error(`connect ${SECRET}`), { code: 'ECONNREFUSED' });
    }) as typeof fetch;
    const r2 = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r2.ok).toBe(false);
    expect(r2.verdict).toBe('unavailable');
    expect(r2.detail).toBe('request failed: Error code=ECONNREFUSED');
  });

  it('does not call an empty 200 a success, and reports bad error fields as malformed', async () => {
    mockFetch(200, {});
    const r1 = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r1.ok).toBe(false);
    expect(r1.verdict).toBe('malformed');

    mockFetch(401, { error: `bad ${SECRET} value`, error_codes: 'x', correlation_id: { a: 1 } });
    const r2 = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r2.verdict).toBe('malformed');
    expect(JSON.stringify(r2)).not.toContain(SECRET);

    mockFetch(401, {
      error: 'invalid_client',
      error_codes: [7000215, 'x'],
      correlation_id: 'not a guid!',
    });
    const r3 = await checkClientCredentials('client-id', SECRET, 'tenant-id');
    expect(r3).toMatchObject({ verdict: 'rejected', error_codes: [7000215] });
    expect(r3.correlation_id).toBeUndefined();
  });

  it('gives up on a held connection within the deadline', async () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }) as typeof fetch;
    const started = Date.now();
    const r = await checkClientCredentials('client-id', SECRET, 'tenant-id', 'global', 150);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(signal).toBeDefined();
    expect(r.verdict).toBe('unavailable');
    expect(r.detail).toBe('no answer within 150 ms');
  });

  it('prescribes the secret only for the two codes that are about the secret', () => {
    const base = {
      ok: false,
      verdict: 'rejected' as const,
      checkedAt: 'now',
      status: 401,
      error: 'invalid_client',
      correlation_id: 'corr',
    };
    const wrong = credentialCheckMessage({ ...base, error_codes: [7000215] }, 't');
    expect(wrong).toContain('not a current secret value');
    expect(wrong).toContain('secret value is corrected');
    const expired = credentialCheckMessage({ ...base, error_codes: [7000222] }, 't');
    expect(expired).toContain('expired');
    const notFound = credentialCheckMessage({ ...base, error_codes: [700016] }, 't');
    expect(notFound).toContain('error_codes [700016]');
    expect(notFound).not.toContain('secret is corrected');
    expect(notFound).not.toContain('secret value is corrected');
    expect(notFound).toContain('says nothing about the secret');
    const down = credentialCheckMessage(
      {
        ok: false,
        verdict: 'unavailable',
        checkedAt: 'now',
        detail: 'request failed: Error code=ECONNREFUSED',
      },
      't'
    );
    expect(down).toContain('were not judged');
    expect(down).not.toContain('secret');
  });
});

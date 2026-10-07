import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCloudEndpoints, getGraphBaseUrl } from '../src/cloud-config.js';
import { ENV_FILE_ALLOWLIST } from '../src/load-env.js';
import OboClient from '../src/obo-client.js';
import GraphClient from '../src/graph-client.js';
import type { AuthManager } from '../src/auth.js';
import type { AppSecrets } from '../src/secrets.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const acquireTokenOnBehalfOf = vi.hoisted(() => vi.fn());
vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: class {
    acquireTokenOnBehalfOf = acquireTokenOnBehalfOf;
  },
}));

describe('MS365_MCP_GRAPH_BASE_URL', () => {
  const original = process.env.MS365_MCP_GRAPH_BASE_URL;

  beforeEach(() => {
    delete process.env.MS365_MCP_GRAPH_BASE_URL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.MS365_MCP_GRAPH_BASE_URL;
    else process.env.MS365_MCP_GRAPH_BASE_URL = original;
    vi.restoreAllMocks();
  });

  it('leaves the cloud endpoints alone when unset', () => {
    expect(getCloudEndpoints('global').graphApi).toBe('https://graph.microsoft.com');
    expect(getCloudEndpoints('china').graphApi).toBe('https://microsoftgraph.chinacloudapi.cn');
    expect(getGraphBaseUrl('global')).toBe('https://graph.microsoft.com');
    expect(getGraphBaseUrl('china')).toBe('https://microsoftgraph.chinacloudapi.cn');
  });

  it('overrides the base URL, not the cloud endpoints', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'http://127.0.0.1:10255/tenant-a/outlook';
    expect(getGraphBaseUrl('global')).toBe('http://127.0.0.1:10255/tenant-a/outlook');
    expect(getGraphBaseUrl('china')).toBe('http://127.0.0.1:10255/tenant-a/outlook');
    // graphApi names the Graph resource (the OBO scope), so it must stay put.
    expect(getCloudEndpoints('global').graphApi).toBe('https://graph.microsoft.com');
    expect(getCloudEndpoints('china').graphApi).toBe('https://microsoftgraph.chinacloudapi.cn');
    expect(getCloudEndpoints('global').authority).toBe('https://login.microsoftonline.com');
  });

  it('strips a trailing slash so callers can append /v1.0', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'http://127.0.0.1:10255/prefix/';
    expect(getGraphBaseUrl('global')).toBe('http://127.0.0.1:10255/prefix');
  });

  it('ignores blank values', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = '   ';
    expect(getGraphBaseUrl('global')).toBe('https://graph.microsoft.com');
  });

  it.each([
    'graph.example.test/v1',
    'ftp://proxy/graph',
    'http://proxy/graph?x=1',
    'http://proxy/graph#f',
  ])('rejects %s', (value) => {
    process.env.MS365_MCP_GRAPH_BASE_URL = value;
    expect(() => getGraphBaseUrl('global')).toThrow(/MS365_MCP_GRAPH_BASE_URL/);
  });

  it('is not read from .env: a cwd file must not redirect bearer-token traffic', () => {
    expect(ENV_FILE_ALLOWLIST).not.toContain('MS365_MCP_GRAPH_BASE_URL');
  });

  it('keeps the OBO resource on the real Graph origin', async () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'http://127.0.0.1:10255/tenant-a/outlook';
    acquireTokenOnBehalfOf.mockResolvedValue({ accessToken: 'obo-token' });

    const client = new OboClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tenantId: 'tenant-id',
      cloudType: 'global',
    } as unknown as AppSecrets);
    await expect(client.exchangeToken('user-assertion')).resolves.toBe('obo-token');

    expect(acquireTokenOnBehalfOf).toHaveBeenCalledWith({
      oboAssertion: 'user-assertion',
      scopes: ['https://graph.microsoft.com/.default'],
    });
  });

  it('sends Graph requests to the override, path prefix included', async () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'http://127.0.0.1:10255/tenant-a/outlook';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ value: [] }),
      text: async () => '{"value":[]}',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new GraphClient(
      { getToken: vi.fn().mockResolvedValue('token') } as unknown as AuthManager,
      { cloudType: 'global' } as unknown as AppSecrets
    );
    await client.graphRequest('/me/messages', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://127.0.0.1:10255/tenant-a/outlook/v1.0/me/messages'
    );
  });
});

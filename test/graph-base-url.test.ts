import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCloudEndpoints } from '../src/cloud-config.js';
import GraphClient from '../src/graph-client.js';
import type { AuthManager } from '../src/auth.js';
import type { AppSecrets } from '../src/secrets.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
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
  });

  it('replaces the Graph base URL for every cloud and keeps the login authority', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'http://127.0.0.1:10255/tenant-a/outlook';
    expect(getCloudEndpoints('global').graphApi).toBe('http://127.0.0.1:10255/tenant-a/outlook');
    expect(getCloudEndpoints('china').graphApi).toBe('http://127.0.0.1:10255/tenant-a/outlook');
    expect(getCloudEndpoints('global').authority).toBe('https://login.microsoftonline.com');
  });

  it('strips a trailing slash so callers can append /v1.0', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'http://127.0.0.1:10255/prefix/';
    expect(getCloudEndpoints('global').graphApi).toBe('http://127.0.0.1:10255/prefix');
  });

  it('ignores blank values', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = '   ';
    expect(getCloudEndpoints('global').graphApi).toBe('https://graph.microsoft.com');
  });

  it('rejects a value that is not an absolute http(s) URL', () => {
    process.env.MS365_MCP_GRAPH_BASE_URL = 'graph.example.test/v1';
    expect(() => getCloudEndpoints('global')).toThrow(/MS365_MCP_GRAPH_BASE_URL/);
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

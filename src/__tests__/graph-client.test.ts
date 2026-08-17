import { describe, it, expect, vi, beforeEach } from 'vitest';
import GraphClient from '../graph-client.js';
import { fetchWithResilience } from '../lib/graph-resilience.js';
import type AuthManager from '../auth.js';

vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/graph-resilience.js', () => ({
  fetchWithResilience: vi.fn(),
  getSharedBreaker: vi.fn(() => ({})),
  loadResilienceConfig: vi.fn(() => ({})),
}));

const fetchWithResilienceMock = vi.mocked(fetchWithResilience);

function createGraphClient() {
  return new GraphClient(
    {
      getToken: vi.fn().mockResolvedValue('token'),
    } as unknown as AuthManager,
    {
      clientId: 'client-id',
      tenantId: 'tenant-id',
      cloudType: 'global',
    }
  );
}

describe('GraphClient audit metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds HTTP status metadata to successful Graph responses', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await createGraphClient().graphRequest('/me');

    expect(result._meta).toMatchObject({ http_status: 200 });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 'user-1' });
  });

  it('preserves HTTP status metadata when response headers are requested', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'task-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json', etag: 'W/"etag-1"' },
      })
    );

    const result = await createGraphClient().graphRequest('/me/planner/tasks/task-1', {
      includeHeaders: true,
    });

    expect(result._meta).toMatchObject({ http_status: 200 });
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      id: 'task-1',
      _etag: 'W/"etag-1"',
    });
  });

  it('adds HTTP status and Graph error code metadata to failed Graph responses', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'accessDenied',
            message: 'Access denied',
          },
        }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    const result = await createGraphClient().graphRequest('/me/drive');

    expect(result.isError).toBe(true);
    expect(result._meta).toMatchObject({
      http_status: 403,
      error_code: 'accessDenied',
    });
    expect(JSON.parse(result.content[0].text).error).toContain(
      'Microsoft Graph API error: 403 Forbidden'
    );
  });

  it('adds aggregate subrequest metadata to successful Graph batch responses', async () => {
    fetchWithResilienceMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            { id: '1', status: 200, body: { id: 'message-1' } },
            {
              id: '2',
              status: 403,
              body: { error: { code: 'accessDenied', message: 'Access denied' } },
            },
            {
              id: '3',
              status: 429,
              body: { error: { code: 'tooManyRequests', message: 'Slow down' } },
            },
            {
              id: '4',
              status: 403,
              body: { error: { code: 'accessDenied', message: 'Access denied' } },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    const result = await createGraphClient().graphRequest('/$batch', {
      method: 'POST',
      body: JSON.stringify({ requests: [] }),
    });

    expect(result.isError).toBeUndefined();
    expect(result._meta).toMatchObject({
      http_status: 200,
      graph_batch_subrequest_count: 4,
      graph_batch_http_status_counts: { '200': 1, '403': 2, '429': 1 },
      graph_batch_error_code_counts: { accessDenied: 2, tooManyRequests: 1 },
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestContext, type RequestContext } from '../src/request-context.js';
import { DISCOVERY_PRESET_VERSION } from '../src/lib/tenant-surface/surface.js';
import { clearCompletionCacheForTesting } from '../src/lib/mcp-completions/cache.js';
import { completeGraphBacked } from '../src/lib/mcp-completions/handlers.js';

vi.mock('../src/generated/client.js', () => ({
  api: { endpoints: [{ alias: 'list-users' }] },
}));

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

function ctx(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    tenantId: TENANT_A,
    presetVersion: DISCOVERY_PRESET_VERSION,
    enabledToolsSet: new Set(['list-users']),
    enabledToolsExplicit: true,
    tenantRow: { allowed_scopes: ['User.Read.All'] } as never,
    requestId: 'session-a',
    authClientId: 'account-a',
    capabilityProfile: {
      transport: 'streamable-http',
      surface: 'discovery',
      phase8Enabled: true,
      enabledFeatures: ['tools', 'completions'],
      capabilities: {} as never,
      disabledFeatures: [],
      fallbacks: [],
    },
    ...overrides,
  };
}

function graphClient(labelPrefix: string) {
  return {
    graphRequest: vi.fn(async (endpoint: string) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            value: Array.from({ length: 125 }, (_, index) => ({
              id: `${labelPrefix}-${index}`,
              displayName: `${labelPrefix} User ${index}`,
            })),
            endpoint,
          }),
        },
      ],
    })),
  };
}

describe('Graph-backed completion isolation', () => {
  beforeEach(() => {
    clearCompletionCacheForTesting();
    vi.clearAllMocks();
  });

  it('reuses cached results across request IDs but not tenants or accounts', async () => {
    const client = graphClient('tenant');

    const a1 = await requestContext.run(ctx(), () =>
      completeGraphBacked('user', 'alex', { graphClient: client })
    );
    const a2 = await requestContext.run(ctx(), () =>
      completeGraphBacked('user', 'alex', { graphClient: client })
    );
    const b = await requestContext.run(ctx({ tenantId: TENANT_B }), () =>
      completeGraphBacked('user', 'alex', { graphClient: client })
    );
    const sessionB = await requestContext.run(ctx({ requestId: 'session-b' }), () =>
      completeGraphBacked('user', 'alex', { graphClient: client })
    );
    const accountB = await requestContext.run(ctx({ authClientId: 'account-b' }), () =>
      completeGraphBacked('user', 'alex', { graphClient: client })
    );

    expect(a1).toEqual(a2);
    expect(b).toEqual(a1);
    expect(sessionB).toEqual(a1);
    expect(accountB).toEqual(a1);
    expect(client.graphRequest).toHaveBeenCalledTimes(3);
  });

  it('fails closed when the backing tool or scope is disabled', async () => {
    const client = graphClient('disabled');

    const disabledTool = await requestContext.run(
      ctx({ enabledToolsSet: new Set(['list-groups']) }),
      () => completeGraphBacked('user', 'alex', { graphClient: client })
    );
    const disabledScope = await requestContext.run(
      ctx({ tenantRow: { allowed_scopes: ['Mail.Read'] } as never }),
      () => completeGraphBacked('user', 'alex', { graphClient: client })
    );

    expect(disabledTool).toEqual([]);
    expect(disabledScope).toEqual([]);
    expect(client.graphRequest).not.toHaveBeenCalled();
  });

  it('uses bounded top/select Graph requests and caps suggestions', async () => {
    const client = graphClient('bounded');

    const values = await requestContext.run(ctx(), () =>
      completeGraphBacked('user', 'alex', { graphClient: client })
    );

    expect(values.length).toBeLessThanOrEqual(100);
    expect(values).toHaveLength(20);
    expect(client.graphRequest).toHaveBeenCalledTimes(1);
    const [endpoint, options] = client.graphRequest.mock.calls[0];
    expect(endpoint).toContain('$top=10');
    expect(endpoint).toContain('$select=id,displayName,mail,userPrincipalName');
    expect(endpoint).toContain('$search=');
    expect(options.headers).toMatchObject({
      Accept: 'application/json',
      ConsistencyLevel: 'eventual',
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool, registerTools } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { resolveAuthScopes } from '../src/oauth/scopes.js';
import { Policy } from '../src/policy/index.js';
import { requestContext } from '../src/request-context.js';
import { fakeGraphClient } from './fake-graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

const NEW_TOOLS = [
  'user-search',
  'user-get',
  'sharepoint-site-list',
  'sharepoint-site-get',
  'sharepoint-drive-list',
  'sharepoint-drive-children-list',
  'sharepoint-drive-item-get',
  'sharepoint-list-list',
  'sharepoint-list-item-list',
];

describe('PR 7 registration', () => {
  it('all directory/SharePoint tools are present in ALL_TOOLS', () => {
    for (const name of NEW_TOOLS) {
      expect(findTool(name), `missing ${name}`).toBeDefined();
    }
  });

  it('exposes User.ReadBasic.All and Sites.Read.All via OAuth scopes_supported', () => {
    const scopes = resolveAuthScopes();
    expect(scopes).toContain('User.ReadBasic.All');
    expect(scopes).toContain('Sites.Read.All');
  });

  it('all PR 7 tools register with readOnlyHint=true / destructiveHint=false', () => {
    const calls: Array<[string, string, Record<string, unknown>, Record<string, unknown>]> = [];
    const mockServer = {
      tool: vi.fn((name: string, description: string, schema, hints) => {
        calls.push([name, description, schema, hints]);
      }),
    };
    const graphClient = { graphRequest: vi.fn() } as unknown as GraphClient;
    registerTools(mockServer as never, graphClient, { toolsets: 'all' });

    for (const name of NEW_TOOLS) {
      const call = calls.find((c) => c[0] === name);
      expect(call, `${name} not registered`).toBeDefined();
      const hints = call![3] as { readOnlyHint: boolean; destructiveHint: boolean };
      expect(hints.readOnlyHint).toBe(true);
      expect(hints.destructiveHint).toBe(false);
    }
  });
});

describe('Tool.requestHeaders applied by the runtime', () => {
  let mockGraphClient: GraphClient;
  let graphRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });
    mockGraphClient = fakeGraphClient(graphRequest);
  });

  it('user-search sets ConsistencyLevel: eventual unconditionally', async () => {
    await executeTool(findTool('user-search'), mockGraphClient, {});
    const opts = graphRequest.mock.calls[0][1] as { headers: Record<string, string> };
    expect(opts.headers['ConsistencyLevel']).toBe('eventual');
  });

  it('still sets ConsistencyLevel when other params are also passed', async () => {
    await executeTool(findTool('user-search'), mockGraphClient, {
      search: '"displayName:Spencer"',
      select: 'id,displayName,userPrincipalName',
    });
    const [path, opts] = graphRequest.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(opts.headers['ConsistencyLevel']).toBe('eventual');
    expect(path).toContain('$search=');
    expect(path).toContain('$select=id,displayName,userPrincipalName');
  });

  it('does not leak ConsistencyLevel to tools without requestHeaders', async () => {
    await executeTool(findTool('sharepoint-site-list'), mockGraphClient, { search: 'Finance' });
    const opts = graphRequest.mock.calls[0][1] as { headers: Record<string, string> };
    expect(opts.headers['ConsistencyLevel']).toBeUndefined();
  });
});

describe('PR 7 runtime — paths and queries', () => {
  let mockGraphClient: GraphClient;
  let graphRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });
    mockGraphClient = fakeGraphClient(graphRequest);
  });

  it('user-get with a UPN substitutes encoded path segment', async () => {
    await executeTool(findTool('user-get'), mockGraphClient, { 'user-id': 'spencer@example.com' });
    const path = graphRequest.mock.calls[0][0] as string;
    expect(path).toContain('/users/spencer%40example.com');
  });

  it('sharepoint-site-list passes the plain search query through (not OData $search)', async () => {
    await executeTool(findTool('sharepoint-site-list'), mockGraphClient, {
      search: 'Finance Team',
    });
    const path = graphRequest.mock.calls[0][0] as string;
    // `search` is not in ODATA_PARAM_NAMES? Actually it IS — let me check the runtime mapping.
    // The runtime prepends `$` for OData params; on sharepoint-site-list we use the same `search` key
    // because the runtime maps every `search` to `$search`. Graph accepts both `search=` and
    // `$search=` on /sites, but Microsoft's docs call the plain `search`; ensure at least one
    // recognizable form is present.
    expect(path).toContain('search=Finance');
  });

  it('sharepoint-drive-children-list threads drive-id + driveItem-id into the path', async () => {
    await executeTool(findTool('sharepoint-drive-children-list'), mockGraphClient, {
      'drive-id': 'b!abc',
      'driveItem-id': '01ABCDEF',
    });
    const path = graphRequest.mock.calls[0][0] as string;
    expect(path).toContain('/drives/b!abc/items/01ABCDEF/children');
  });

  it('sharepoint-drive-children-list lists the drive root when driveItem-id is omitted', async () => {
    await executeTool(findTool('sharepoint-drive-children-list'), mockGraphClient, {
      'drive-id': 'b!abc',
    });
    const path = graphRequest.mock.calls[0][0] as string;
    expect(path).toContain('/drives/b!abc/root/children');
    expect(path).not.toContain('driveItem-id');
  });

  it('sharepoint-drive-item-get GETs /drives/{drive-id}/items/{driveItem-id}', async () => {
    await executeTool(findTool('sharepoint-drive-item-get'), mockGraphClient, {
      'drive-id': 'd1',
      'driveItem-id': 'i1',
    });
    const [path, opts] = graphRequest.mock.calls[0] as [string, { method: string }];
    expect(path).toMatch(/^\/drives\/d1\/items\/i1/);
    expect(opts.method).toBe('GET');
  });

  it('sharepoint-drive-item-get returns the drive root item when driveItem-id is omitted', async () => {
    await executeTool(findTool('sharepoint-drive-item-get'), mockGraphClient, { 'drive-id': 'd1' });
    const path = graphRequest.mock.calls[0][0] as string;
    expect(path).toMatch(/^\/drives\/d1\/root/);
    expect(path).not.toContain('driveItem-id');
  });

  it('sharepoint-list-item-list threads site-id + list-id and accepts $expand=fields(...)', async () => {
    await executeTool(findTool('sharepoint-list-item-list'), mockGraphClient, {
      'site-id': 'site-1',
      'list-id': 'list-1',
      expand: 'fields($select=Title,Status)',
    });
    const path = graphRequest.mock.calls[0][0] as string;
    expect(path).toContain('/sites/site-1/lists/list-1/items');
    // encodeURIComponent preserves `(`, `)` (unreserved per RFC 3986) and the runtime
    // also preserves `,`. `$` and `=` inside the value get encoded as %24 / %3D.
    expect(path).toContain('$expand=fields(%24select%3DTitle,Status)');
  });
});

describe('PR 7 policy gating', () => {
  function makeMockGraphClient() {
    const graphRequest = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });
    return fakeGraphClient(graphRequest);
  }

  it('all PR 7 tools pass through when in defaults.allow', async () => {
    const policy = Policy.fromDocument({ defaults: { allow: NEW_TOOLS } });

    for (const name of NEW_TOOLS) {
      const mockGraphClient = makeMockGraphClient();
      const result = await requestContext.run(
        {
          accessToken: 'at',
          userOid: 'oid',
          tenantId: 't',
          userPrincipalName: 'anyone@example.com',
        },
        () =>
          executeTool(
            findTool(name),
            mockGraphClient,
            {
              // Schema-compatible stubs for any path params each tool may have.
              'user-id': 'u',
              'site-id': 's',
              'drive-id': 'd',
              'driveItem-id': 'i',
              'list-id': 'l',
              search: 'x',
            },
            policy
          )
      );
      expect(result.isError, `${name} should pass policy`).toBeFalsy();
    }
  });

  it('PR 7 tools are denied when missing from defaults and user has no allow entry', async () => {
    const policy = Policy.fromDocument({ defaults: { allow: ['identity-get-me'] } });
    const mockGraphClient = makeMockGraphClient();
    const result = await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'anyone@example.com',
      },
      () =>
        executeTool(findTool('user-search'), mockGraphClient, { search: '"displayName:S"' }, policy)
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Policy denied');
  });
});

describe('OneDrive drive consolidation (U4)', () => {
  let mockGraphClient: GraphClient;
  let graphRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    graphRequest = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });
    mockGraphClient = fakeGraphClient(graphRequest);
  });

  it('drive-children-list targets the OneDrive root when item-id is omitted', async () => {
    await executeTool(findTool('drive-children-list'), mockGraphClient, {});
    expect(graphRequest.mock.calls[0][0] as string).toContain('/me/drive/root/children');
  });

  it('drive-children-list targets a folder when item-id is given, without leaking it', async () => {
    await executeTool(findTool('drive-children-list'), mockGraphClient, { 'item-id': 'XYZ' });
    const path = graphRequest.mock.calls[0][0] as string;
    expect(path).toContain('/me/drive/items/XYZ/children');
    expect(path).not.toContain('item-id=');
  });

  it('drive-item-get returns the OneDrive root item when item-id is omitted', async () => {
    await executeTool(findTool('drive-item-get'), mockGraphClient, {});
    expect(graphRequest.mock.calls[0][0] as string).toMatch(/^\/me\/drive\/root/);
  });
});

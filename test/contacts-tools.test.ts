/**
 * Read-only Outlook contacts surface: contact-list, contact-get,
 * contact-folder-list. Behavioral coverage for: the personalNotes/categories
 * default-projection boundary (NOT an authorization boundary), Graph-path-
 * segment safety (no traversal via dot segments/separators, preserving '='
 * padding), opaque signed-cursor pagination bound to tool + EXACT collection
 * path + caller (never a client-controlled continuation URL or a same-host
 * different-resource nextLink, never silently incomplete across empty Graph
 * pages or response-ceiling truncation), and that fetchAllPages cannot
 * bypass any of it. contact-list/contact-folder-list are shaped from the raw
 * Graph object via `GraphClient.makeRequest` + `formatJsonResponse` (so a
 * thrown Graph error is caught by executeTool's existing catch-all, same as
 * every other tool) — mocked here at that seam. TOON-format and multi-page
 * real-GraphClient coverage lives in test/contacts-real-graphclient.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import GraphClient from '../src/graph-client.js';
import { executeTool, registerTools } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { Policy } from '../src/policy/index.js';
import { requestContext } from '../src/request-context.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

/**
 * Fakes the transport seam contacts tools use: `makeRequest` + `formatJsonResponse`
 * (contact-list/contact-folder-list shape the raw object for cursor paging;
 * contact-get compacts it via `Tool.shape`). `graphRequest` stays for any
 * unshaped flow.
 * `formatJsonResponse` mimics the real JSON-mode behavior closely enough for
 * these unit tests; real JSON/TOON serialization is exercised against the
 * actual `GraphClient` in test/contacts-real-graphclient.test.ts.
 */
function fakeGraphClient(rawValue: unknown = { value: [] }) {
  const graphRequest = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(rawValue) }],
    isError: false,
  });
  const makeRequest = vi.fn().mockResolvedValue(rawValue);
  const formatJsonResponse = vi.fn(
    (data: unknown, _rawResponse?: boolean, excludeResponse?: boolean) => {
      if (excludeResponse) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );
  return {
    gc: { graphRequest, makeRequest, formatJsonResponse } as unknown as GraphClient,
    graphRequest,
    makeRequest,
    formatJsonResponse,
  };
}

const userA = {
  accessToken: 'at',
  userOid: 'oid-A',
  tenantId: 't',
  userPrincipalName: 'a@example.com',
};
const userB = {
  accessToken: 'at',
  userOid: 'oid-B',
  tenantId: 't',
  userPrincipalName: 'b@example.com',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MS365_MCP_SESSION_KEY = crypto.randomBytes(32).toString('base64');
});
afterEach(() => {
  delete process.env.MS365_MCP_SESSION_KEY;
  delete process.env.MS365_MCP_DEFAULT_TOP;
  delete process.env.MS365_MCP_MAX_RESPONSE_CHARS;
});

describe('contact projections', () => {
  it('compact listing includes categories but omits personalNotes', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-list'), gc, {});
    const url = new URL(`https://graph.microsoft.com/v1.0${makeRequest.mock.calls[0][0]}`);
    const selected = url.searchParams.get('$select')?.split(',');
    expect(selected).toContain('categories');
    expect(selected).not.toContain('personalNotes');
  });

  it('allows explicit selection of notes on contact-list', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-list'), gc, { select: 'id,personalNotes' });
    const url = new URL(`https://graph.microsoft.com/v1.0${makeRequest.mock.calls[0][0]}`);
    expect(url.searchParams.get('$select')).toBe('id,personalNotes');
  });

  it('detailed listing lifts the default projection', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-list'), gc, { response_format: 'detailed' });
    expect(String(makeRequest.mock.calls[0][0])).not.toContain('$select=');
  });

  it('contact-get reads full detail by default', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-get'), gc, { 'contact-id': 'AAMk' });
    expect(String(makeRequest.mock.calls[0][0])).not.toContain('$select=');
    expect(String(makeRequest.mock.calls[0][0])).toMatch(/^\/me\/contacts\/AAMk/);
  });
});

describe('nested contact folder coverage', () => {
  it('lists top-level folders without a parent id', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-folder-list'), gc, {});
    expect(String(makeRequest.mock.calls[0][0])).toMatch(/^\/me\/contactFolders(\?|$)/);
  });

  it('lists child folders without leaking the parent id into the query', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-folder-list'), gc, { 'parent-folder-id': 'FOLDER-A' });
    const path = String(makeRequest.mock.calls[0][0]);
    expect(path).toMatch(/^\/me\/contactFolders\/FOLDER-A\/childFolders/);
    expect(path).not.toContain('parent-folder-id');
  });

  it('lists contacts in a nested folder', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-list'), gc, { 'folder-id': 'NESTED-GRANDCHILD' });
    expect(String(makeRequest.mock.calls[0][0])).toMatch(
      /^\/me\/contactFolders\/NESTED-GRANDCHILD\/contacts/
    );
  });

  it('reads contact detail in a nested folder', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-get'), gc, {
      'contact-id': 'C1',
      'folder-id': 'NESTED-GRANDCHILD',
    });
    expect(String(makeRequest.mock.calls[0][0])).toMatch(
      /^\/me\/contactFolders\/NESTED-GRANDCHILD\/contacts\/C1/
    );
  });
});

describe('contact paging schema', () => {
  it('exposes cursor instead of fetchAllPages', () => {
    const schemas: Record<string, Record<string, unknown>> = {};
    const mockServer = {
      tool: vi.fn((name: string, _description: string, schema: Record<string, unknown>) => {
        schemas[name] = schema;
      }),
    };
    registerTools(mockServer as never, fakeGraphClient().gc, { toolsets: 'all' });
    for (const name of ['contact-list', 'contact-folder-list']) {
      expect(schemas[name]?.cursor).toBeDefined();
      expect(schemas[name]?.fetchAllPages).toBeUndefined();
    }
  });
});

describe('ID path-segment safety (schema + runtime, before any Graph call)', () => {
  const DANGEROUS = ['.', '..', '', '/', 'a/b', 'a\\b'];

  it('contact-id schema rejects dangerous values, accepts a normal id', () => {
    const schema = findTool('contact-get').params.find((p) => p.name === 'contact-id')!.schema;
    for (const v of DANGEROUS) {
      expect(schema.safeParse(v).success, `expected ${JSON.stringify(v)} to fail`).toBe(false);
    }
    expect(schema.safeParse('AAMkAGVm').success).toBe(true);
  });

  it('folder-id schema (optional) still rejects dangerous values when explicitly provided', () => {
    const schema = findTool('contact-list').params.find((p) => p.name === 'folder-id')!.schema;
    expect(schema.safeParse(undefined).success).toBe(true);
    for (const v of DANGEROUS) {
      expect(schema.safeParse(v).success, `expected ${JSON.stringify(v)} to fail`).toBe(false);
    }
  });

  it('parent-folder-id schema (optional) rejects dangerous values on contact-folder-list', () => {
    const schema = findTool('contact-folder-list').params.find(
      (p) => p.name === 'parent-folder-id'
    )!.schema;
    for (const v of DANGEROUS) {
      expect(schema.safeParse(v).success, `expected ${JSON.stringify(v)} to fail`).toBe(false);
    }
  });

  it('contact-get refuses a dot-segment contact-id before any Graph call (default path)', async () => {
    const { gc, graphRequest } = fakeGraphClient();
    const result = await executeTool(findTool('contact-get'), gc, { 'contact-id': '..' });
    expect(result.isError).toBe(true);
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('contact-get refuses a dot-segment folder-id before any Graph call (folder-scoped path)', async () => {
    const { gc, graphRequest } = fakeGraphClient();
    const result = await executeTool(findTool('contact-get'), gc, {
      'contact-id': 'C1',
      'folder-id': '..',
    });
    expect(result.isError).toBe(true);
    expect(graphRequest).not.toHaveBeenCalled();
  });

  it('contact-list refuses an empty-string folder-id before any Graph call', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    const result = await executeTool(findTool('contact-list'), gc, { 'folder-id': '' });
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('contact-folder-list refuses a slash-containing parent-folder-id before any Graph call', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    const result = await executeTool(findTool('contact-folder-list'), gc, {
      'parent-folder-id': 'a/b',
    });
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('preserves base64 "=" padding in a valid contact id (established path encoder)', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-get'), gc, { 'contact-id': 'AAMkAGVmMDEzMTM4AAA=' });
    const path = String(makeRequest.mock.calls[0][0]);
    expect(path).toContain('AAMkAGVmMDEzMTM4AAA=');
    expect(path).not.toContain('%3D');
  });

  it('preserves "=" padding in a valid folder id used with contact-list', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    await executeTool(findTool('contact-list'), gc, { 'folder-id': 'FOLDER==' });
    const path = String(makeRequest.mock.calls[0][0]);
    expect(path).toContain('/me/contactFolders/FOLDER==/contacts');
    expect(path).not.toContain('%3D');
  });
});

describe('policy gating', () => {
  function run(name: string, policy: Policy) {
    const { gc } = fakeGraphClient();
    return requestContext.run(userA, () =>
      executeTool(findTool(name), gc, { 'contact-id': 'c1' }, policy)
    );
  }

  it('contact-list/contact-get/contact-folder-list are denied when missing from defaults.allow', async () => {
    const policy = Policy.fromDocument({ defaults: { allow: ['identity-get-me'] } });
    for (const name of ['contact-list', 'contact-get', 'contact-folder-list']) {
      const result = await run(name, policy);
      expect(result.isError, `${name} should be denied`).toBe(true);
      expect(result.content[0].text).toContain('Policy denied');
    }
  });

  it('contact-list/contact-get/contact-folder-list pass through when allowed', async () => {
    const policy = Policy.fromDocument({
      defaults: { allow: ['contact-list', 'contact-get', 'contact-folder-list'] },
    });
    for (const name of ['contact-list', 'contact-get', 'contact-folder-list']) {
      const result = await run(name, policy);
      expect(result.isError, `${name} should pass policy`).toBeFalsy();
    }
  });
});

describe('fetchAllPages is neither advertised nor honored on cursor-pagination tools', () => {
  it('contact-list refuses fetchAllPages at runtime before any Graph call', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    const result = await executeTool(findTool('contact-list'), gc, { fetchAllPages: true });
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('contact-folder-list refuses fetchAllPages at runtime before any Graph call', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    const result = await executeTool(findTool('contact-folder-list'), gc, { fetchAllPages: true });
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

describe('a thrown Graph error is caught by the existing executeTool catch-all', () => {
  it('makeRequest rejecting (e.g. a 403) produces a clean isError result, not a crash', async () => {
    const makeRequest = vi
      .fn()
      .mockRejectedValue(
        new Error('Microsoft Graph API error: 403 Forbidden - insufficient scope')
      );
    const gc = { makeRequest, formatJsonResponse: vi.fn() } as unknown as GraphClient;
    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, {})
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('403');
  });
});

describe('cursor: empty Graph pages still advance (never claim exhaustion while nextLink exists)', () => {
  it('an empty page with @odata.nextLink reports hasMore + a usable cursor, which then yields the real items', async () => {
    const makeRequest = vi
      .fn()
      .mockResolvedValueOnce({
        value: [],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/contacts?$top=10&$skip=10',
      })
      .mockResolvedValueOnce({ value: [{ id: 'c1' }] });
    const formatJsonResponse = vi.fn((data: unknown) => ({
      content: [{ type: 'text', text: JSON.stringify(data) }],
    }));
    const gc = { makeRequest, formatJsonResponse } as unknown as GraphClient;

    const first = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { top: 10 })
    );
    const firstBody = JSON.parse(first.content[0].text);
    expect(firstBody.value).toEqual([]);
    expect(firstBody.hasMore).toBe(true);
    expect(typeof firstBody.cursor).toBe('string');

    const second = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { cursor: firstBody.cursor })
    );
    const secondBody = JSON.parse(second.content[0].text);
    expect(secondBody.value).toEqual([{ id: 'c1' }]);
    expect(secondBody.hasMore).toBe(false);
    expect(makeRequest.mock.calls[1][0]).toBe('/me/contacts?$top=10&$skip=10');
  });
});

describe('cursor: malformed continuation metadata', () => {
  it.each([123, false, { token: 'bad' }, ['bad']])(
    'refuses malformed nextLink %j instead of reporting exhaustion',
    async (nextLink) => {
      const { gc } = fakeGraphClient({ value: [{ id: 'c1' }], '@odata.nextLink': nextLink });
      const result = await requestContext.run(userA, () =>
        executeTool(findTool('contact-list'), gc, {})
      );
      expect(result.isError).toBe(true);
    }
  );
});

describe('cursor: rejects a same-host nextLink pointing at a different collection', () => {
  it("does not silently follow or sign a cursor for a resource other than this call's collection", async () => {
    const makeRequest = vi.fn().mockResolvedValue({
      value: [{ id: 'x' }],
      // Same origin + /v1.0, but a different Graph collection entirely.
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$top=5&$skip=5',
    });
    const formatJsonResponse = vi.fn((data: unknown) => ({
      content: [{ type: 'text', text: JSON.stringify(data) }],
    }));
    const gc = { makeRequest, formatJsonResponse } as unknown as GraphClient;

    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, {})
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });
});

describe('cursor: malicious / cross-boundary rejection', () => {
  async function mintCursor(
    toolName: string,
    params: Record<string, unknown>,
    ctx: typeof userA
  ): Promise<string> {
    const makeRequest = vi.fn().mockImplementation(async (path: string) => {
      const nextLink = new URL(`https://graph.microsoft.com/v1.0${path}`);
      nextLink.searchParams.set('$skip', '5');
      return { value: [{ id: 'x' }], '@odata.nextLink': nextLink.href };
    });
    const formatJsonResponse = vi.fn((data: unknown) => ({
      content: [{ type: 'text', text: JSON.stringify(data) }],
    }));
    const gc = { makeRequest, formatJsonResponse } as unknown as GraphClient;
    const result = await requestContext.run(ctx, () => executeTool(findTool(toolName), gc, params));
    const cursor = JSON.parse(result.content[0].text).cursor;
    expect(typeof cursor).toBe('string');
    return cursor;
  }

  it('rejects a cursor minted for a different tool', async () => {
    const cursor = await mintCursor('contact-folder-list', {}, userA);
    const { gc, makeRequest } = fakeGraphClient();
    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { cursor })
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects a cursor minted for a different folder scope', async () => {
    const cursor = await mintCursor('contact-list', { 'folder-id': 'FOLDER-A' }, userA);
    const { gc, makeRequest } = fakeGraphClient();
    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { cursor, 'folder-id': 'FOLDER-B' })
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects a cursor minted for a different caller', async () => {
    const cursor = await mintCursor('contact-list', {}, userA);
    const { gc, makeRequest } = fakeGraphClient();
    const result = await requestContext.run(userB, () =>
      executeTool(findTool('contact-list'), gc, { cursor })
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects a tampered (bit-flipped) cursor', async () => {
    const cursor = await mintCursor('contact-list', {}, userA);
    const last2 = cursor.slice(-2);
    const tampered = cursor.slice(0, -2) + (last2 === 'AA' ? 'BB' : 'AA');
    const { gc, makeRequest } = fakeGraphClient();
    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { cursor: tampered })
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it.each(['', 123])(
    'rejects an explicitly invalid cursor %j instead of restarting',
    async (cursor) => {
      const { gc, makeRequest } = fakeGraphClient();
      const result = await requestContext.run(userA, () =>
        executeTool(findTool('contact-list'), gc, { cursor })
      );
      expect(result.isError).toBe(true);
      expect(makeRequest).not.toHaveBeenCalled();
    }
  );

  it('rejects a garbage cursor string without throwing', async () => {
    const { gc, makeRequest } = fakeGraphClient();
    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { cursor: 'not-a-real-cursor' })
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fails closed (not open) when MS365_MCP_SESSION_KEY is unset during cursor verification', async () => {
    const cursor = await mintCursor('contact-list', {}, userA);
    delete process.env.MS365_MCP_SESSION_KEY;
    const { gc, makeRequest } = fakeGraphClient();
    const result = await requestContext.run(userA, () =>
      executeTool(findTool('contact-list'), gc, { cursor })
    );
    expect(result.isError).toBe(true);
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

describe('cursor: response-ceiling truncation withholds and fully recovers rows, no duplicates', () => {
  it('a truncated page is fully recovered via withheld-tail cursor replay before advancing to the real next page', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({
      id: `p1-${i}`,
      displayName: 'x'.repeat(10),
    }));
    const page2 = [{ id: 'p2-0' }];
    const makeRequest = vi.fn(async (path: string) =>
      path.includes('$skip=20')
        ? { value: page2 }
        : {
            value: page1,
            '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/contacts?$top=20&$skip=20',
          }
    );
    const formatJsonResponse = vi.fn((data: unknown) => ({
      content: [{ type: 'text', text: JSON.stringify(data) }],
    }));
    const gc = { makeRequest, formatJsonResponse } as unknown as GraphClient;

    // Full page1 envelope (20 items + overhead) is well over 1000 chars;
    // a single item + cursor/hint overhead is comfortably under it, so this
    // forces real multi-response withholding without tripping the
    // single-item-too-large edge case.
    process.env.MS365_MCP_MAX_RESPONSE_CHARS = '1000';
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 25; i++) {
      const params = cursor ? { cursor } : { top: 20 };
      const result = await requestContext.run(userA, () =>
        executeTool(findTool('contact-list'), gc, params)
      );
      expect(result.isError, `iteration ${i} should not error`).toBeFalsy();
      const body = JSON.parse(result.content[0].text);
      for (const item of body.value as { id: string }[]) seen.push(item.id);
      if (!body.hasMore) break;
      cursor = body.cursor;
    }

    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual([...page1.map((p) => p.id), 'p2-0'].sort());
    const page1Calls = makeRequest.mock.calls.filter(
      (c) => !String(c[0]).includes('$skip=20')
    ).length;
    expect(page1Calls).toBeGreaterThan(1);
  });
});

describe('cursor: exhaustive traversal of a large, uniquely-identified mailbox (JSON)', () => {
  function makeRequestAwareGraphClient(dataset: { id: string }[]) {
    const makeRequest = vi.fn(async (path: string) => {
      const url = new URL(`https://graph.microsoft.com/v1.0${path}`);
      const skip = Number(url.searchParams.get('$skip') ?? '0');
      const top = Number(url.searchParams.get('$top') ?? '100');
      const page = dataset.slice(skip, skip + top);
      const body: Record<string, unknown> = { value: page };
      if (skip + top < dataset.length) {
        body['@odata.nextLink'] =
          `https://graph.microsoft.com/v1.0${url.pathname.slice('/v1.0'.length)}?$top=${top}&$skip=${skip + top}`;
      }
      return body;
    });
    const formatJsonResponse = vi.fn((data: unknown) => ({
      content: [{ type: 'text', text: JSON.stringify(data) }],
    }));
    return { gc: { makeRequest, formatJsonResponse } as unknown as GraphClient };
  }

  it('walks 3,500 uniquely-identified contacts to hasMore=false with exact coverage, no duplicates, including a mid-walk ceiling truncation', async () => {
    const dataset = Array.from({ length: 3500 }, (_, i) => ({ id: `contact-${i}` }));
    const { gc } = makeRequestAwareGraphClient(dataset);

    const seen = new Set<string>();
    let cursor: string | undefined;
    let call = 0;
    const maxCalls = 200;
    while (call < maxCalls) {
      call++;
      if (call === 10) process.env.MS365_MCP_MAX_RESPONSE_CHARS = '600';
      if (call === 15) delete process.env.MS365_MCP_MAX_RESPONSE_CHARS;

      const params = cursor ? { cursor } : { top: 100 };
      const result = await requestContext.run(userA, () =>
        executeTool(findTool('contact-list'), gc, params)
      );
      expect(result.isError, `call ${call} should not error`).toBeFalsy();
      const body = JSON.parse(result.content[0].text);
      for (const item of body.value as { id: string }[]) {
        expect(seen.has(item.id), `duplicate id ${item.id} at call ${call}`).toBe(false);
        seen.add(item.id);
      }
      if (!body.hasMore) break;
      cursor = body.cursor;
      expect(typeof cursor).toBe('string');
    }

    expect(call).toBeLessThan(maxCalls);
    expect(seen.size).toBe(3500);
    for (let i = 0; i < 3500; i++) expect(seen.has(`contact-${i}`)).toBe(true);
  }, 20_000);
});

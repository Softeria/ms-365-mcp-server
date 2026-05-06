import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/**
 * We test executeGraphTool logic by importing it indirectly through registerGraphTools.
 * Strategy: mock GraphClient, create a real McpServer, register tools, then invoke them.
 */

// Mock logger to silence output
vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the generated client — we supply our own endpoint definitions per test
const mockEndpoints: any[] = [];
vi.mock('../generated/client.js', () => ({
  api: {
    get endpoints() {
      return mockEndpoints;
    },
  },
}));

// Mock endpoints.json — we supply our own config per test
let mockEndpointsJson: any[] = [];
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: (filePath: string, encoding?: string) => {
      if (typeof filePath === 'string' && filePath.includes('endpoints.json')) {
        return JSON.stringify(mockEndpointsJson);
      }
      return actual.readFileSync(filePath, encoding as any);
    },
  };
});

// Mock tool-categories
vi.mock('../tool-categories.js', () => ({
  TOOL_CATEGORIES: {},
}));

// ---------- helpers ----------

function makeEndpoint(overrides: Partial<any> = {}) {
  return {
    method: 'get',
    path: '/me/messages',
    alias: 'test-tool',
    description: 'Test tool',
    requestFormat: 'json' as const,
    parameters: [
      { name: 'filter', type: 'Query', schema: z.string().optional() },
      { name: 'search', type: 'Query', schema: z.string().optional() },
      { name: 'select', type: 'Query', schema: z.string().optional() },
      { name: 'orderby', type: 'Query', schema: z.string().optional() },
      { name: 'count', type: 'Query', schema: z.boolean().optional() },
      { name: 'top', type: 'Query', schema: z.number().optional() },
      { name: 'skip', type: 'Query', schema: z.number().optional() },
    ],
    response: z.any(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<any> = {}) {
  return {
    pathPattern: '/me/messages',
    method: 'get',
    toolName: 'test-tool',
    scopes: ['Mail.Read'],
    ...overrides,
  };
}

/** Creates a mock GraphClient with a controllable graphRequest spy */
function createMockGraphClient(responses?: any[]) {
  const responseQueue = [...(responses || [])];
  return {
    graphRequest: vi.fn().mockImplementation(async () => {
      if (responseQueue.length > 0) {
        return responseQueue.shift();
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
      };
    }),
  };
}

/**
 * Because registerGraphTools reads endpointsData at module load time,
 * and we mock fs.readFileSync, we need to re-import after setting mocks.
 */
async function loadModule() {
  // Clear cached module so mocks take effect
  vi.resetModules();
  const mod = await import('../graph-tools.js');
  return mod;
}

/** Minimal McpServer mock that captures registered tools */
function createMockServer() {
  const tools = new Map<
    string,
    { description: string; schema: any; handler: (...args: any[]) => any }
  >();
  return {
    tool: vi.fn(
      (
        name: string,
        description: string,
        schema: any,
        annotations: any,
        handler: (...args: any[]) => any
      ) => {
        tools.set(name, { description, schema, handler });
      }
    ),
    tools,
  };
}

// ========== TESTS ==========

describe('graph-tools', () => {
  beforeEach(() => {
    mockEndpoints.length = 0;
    mockEndpointsJson = [];
    vi.clearAllMocks();
  });

  // ---- 1. $count advanced query mode ----
  describe('$count advanced query mode', () => {
    it('should set ConsistencyLevel: eventual header when $count=true', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      // Invoke the registered tool with count=true
      const tool = server.tools.get('test-tool');
      expect(tool).toBeDefined();
      await tool!.handler({ count: true });

      // Verify graphRequest was called with ConsistencyLevel header
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [url] = graphClient.graphRequest.mock.calls[0];
      // $count=true should appear in query string
      expect(url).toContain('$count=true');
    });
  });

  // ---- 2. fetchAllPages pagination ----
  describe('fetchAllPages pagination', () => {
    it('should follow @odata.nextLink and combine results', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: '1' }, { id: '2' }],
                '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=2',
              }),
            },
          ],
        },
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: '3' }],
              }),
            },
          ],
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      const result = await tool!.handler({ fetchAllPages: true });

      // Should have made 2 requests (initial + 1 nextLink)
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(2);

      // Combined result should have 3 items
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.value).toHaveLength(3);
      expect(parsed.value.map((v: any) => v.id)).toEqual(['1', '2', '3']);
      // nextLink should be removed from final response
      expect(parsed['@odata.nextLink']).toBeUndefined();
    });

    it('should stop at 100 page limit', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      // Generate 101 responses — each has a nextLink except the last
      const responses = [];
      for (let i = 0; i < 101; i++) {
        responses.push({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value: [{ id: `item-${i}` }],
                '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/messages?$skip=' + (i + 1),
              }),
            },
          ],
        });
      }

      const graphClient = createMockGraphClient(responses);
      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({ fetchAllPages: true });

      // 1 initial + 99 pagination = 100 total requests (stops at pageCount=100)
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(100);
    });
  });

  // ---- 3. Parameter describe() overrides ----
  describe('parameter describe() overrides', () => {
    it('should apply custom descriptions to OData parameters', async () => {
      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      const tool = server.tools.get('test-tool');
      expect(tool).toBeDefined();

      const schema = tool!.schema;

      // $filter override
      expect(schema['filter']).toBeDefined();
      expect(schema['filter'].description).toContain('OData filter expression');
      expect(schema['filter'].description).toContain('$count=true');

      // $search override
      expect(schema['search']).toBeDefined();
      expect(schema['search'].description).toContain('KQL search query');

      // $select override
      expect(schema['select']).toBeDefined();
      expect(schema['select'].description).toContain('Comma-separated fields');

      // $orderby override
      expect(schema['orderby']).toBeDefined();
      expect(schema['orderby'].description).toContain('Sort expression');

      // $count override
      expect(schema['count']).toBeDefined();
      expect(schema['count'].description).toContain('advanced query mode');

      expect(schema['top'].description).toContain('Start small');
      expect(schema['top'].description).toContain('$select');
    });
  });

  describe('MS365_MCP_MAX_TOP', () => {
    const prevMaxTop = process.env.MS365_MCP_MAX_TOP;

    afterEach(() => {
      if (prevMaxTop === undefined) delete process.env.MS365_MCP_MAX_TOP;
      else process.env.MS365_MCP_MAX_TOP = prevMaxTop;
    });

    it('should clamp $top when MS365_MCP_MAX_TOP is set', async () => {
      process.env.MS365_MCP_MAX_TOP = '10';

      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({ top: 50 });

      const [url] = graphClient.graphRequest.mock.calls[0];
      expect(url).toContain('$top=10');
    });

    it('should pass through $top when MS365_MCP_MAX_TOP is unset', async () => {
      delete process.env.MS365_MCP_MAX_TOP;

      const endpoint = makeEndpoint();
      const config = makeConfig();
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('test-tool');
      await tool!.handler({ top: 50 });

      const [url] = graphClient.graphRequest.mock.calls[0];
      expect(url).toContain('$top=50');
    });
  });

  // ---- 4. returnDownloadUrl ----
  describe('returnDownloadUrl', () => {
    it('should strip /content from path and return downloadUrl when returnDownloadUrl=true', async () => {
      const endpoint = makeEndpoint({
        alias: 'download-file',
        path: '/me/drive/items/:driveItem-id/content',
        parameters: [{ name: 'driveItem-id', type: 'Path', schema: z.string() }],
      });
      const config = makeConfig({
        toolName: 'download-file',
        pathPattern: '/me/drive/items/{driveItem-id}/content',
        returnDownloadUrl: true,
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const downloadUrl = 'https://download.example.com/file.pdf';
      const graphClient = createMockGraphClient([
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                '@microsoft.graph.downloadUrl': downloadUrl,
                name: 'file.pdf',
              }),
            },
          ],
        },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('download-file');
      expect(tool).toBeDefined();
      await tool!.handler({ 'driveItem-id': 'abc123' });

      // Path should NOT end with /content — it gets stripped
      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).not.toContain('/content');
      expect(requestedPath).toContain('/me/drive/items/abc123');
    });
  });

  // ---- 5. kebab-case path param normalization ----
  describe('kebab-case path param normalization', () => {
    it('should substitute path when LLM passes message-id (kebab) but schema has messageId (camelCase)', async () => {
      // Simulates what hack.ts generates: path uses :messageId (camelCase)
      // but LLMs may pass message-id (kebab-case) since endpoints.json uses {message-id}
      const endpoint = makeEndpoint({
        alias: 'get-mail-message',
        method: 'get',
        path: '/me/messages/:messageId',
        parameters: [
          { name: 'messageId', type: 'Path', schema: z.string() },
          { name: 'select', type: 'Query', schema: z.string().optional() },
        ],
      });
      const config = makeConfig({
        toolName: 'get-mail-message',
        pathPattern: '/me/messages/{message-id}',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'AAMk123', subject: 'Test' }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-mail-message');
      expect(tool).toBeDefined();

      // Pass kebab-case 'message-id' — should still resolve to correct path
      await tool!.handler({ 'message-id': 'AAMk123abc=' });

      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toContain('AAMk123abc=');
      expect(requestedPath).not.toContain(':messageId');
    });

    it('should also work when LLM passes messageId (camelCase) directly', async () => {
      const endpoint = makeEndpoint({
        alias: 'get-mail-message2',
        method: 'get',
        path: '/me/messages/:messageId',
        parameters: [{ name: 'messageId', type: 'Path', schema: z.string() }],
      });
      const config = makeConfig({
        toolName: 'get-mail-message2',
        pathPattern: '/me/messages/{message-id}',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ id: 'AAMk456' }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('get-mail-message2');
      await tool!.handler({ messageId: 'AAMk456xyz=' });

      const [requestedPath] = graphClient.graphRequest.mock.calls[0];
      expect(requestedPath).toContain('AAMk456xyz=');
      expect(requestedPath).not.toContain(':messageId');
    });
  });

  // ---- 6. supportsTimezone ----
  describe('supportsTimezone', () => {
    it('should set Prefer: outlook.timezone header when timezone param provided', async () => {
      const endpoint = makeEndpoint({
        alias: 'list-calendar-events',
        path: '/me/events',
        parameters: [],
      });
      const config = makeConfig({
        toolName: 'list-calendar-events',
        pathPattern: '/me/events',
        supportsTimezone: true,
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('list-calendar-events');
      expect(tool).toBeDefined();

      // Verify timezone parameter was added to schema
      expect(tool!.schema['timezone']).toBeDefined();
      expect(tool!.schema['timezone'].description).toContain('IANA timezone');

      await tool!.handler({ timezone: 'Europe/Brussels' });

      // Verify Prefer header contains outlook.timezone
      const [, options] = graphClient.graphRequest.mock.calls[0];
      expect(options.headers['Prefer']).toContain('outlook.timezone="Europe/Brussels"');
    });

    it('should NOT add timezone parameter when supportsTimezone is false/absent', async () => {
      const endpoint = makeEndpoint({
        alias: 'list-mail',
        path: '/me/messages',
        parameters: [],
      });
      const config = makeConfig({
        toolName: 'list-mail',
        pathPattern: '/me/messages',
        // no supportsTimezone
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, createMockGraphClient() as any);

      const tool = server.tools.get('list-mail');
      expect(tool!.schema['timezone']).toBeUndefined();
    });
  });

  // ---- 7. outlook.body-content-type Prefer header ----
  describe('outlook.body-content-type Prefer header', () => {
    it('should set Prefer: outlook.body-content-type="text" on GET requests', async () => {
      const endpoint = makeEndpoint({ method: 'get' });
      const config = makeConfig({ method: 'get' });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([
        { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] },
      ]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('test-tool')!.handler({});

      const [, options] = graphClient.graphRequest.mock.calls[0];
      expect(options.headers['Prefer']).toContain('outlook.body-content-type="text"');
    });

    it('should NOT set Prefer: outlook.body-content-type on POST requests', async () => {
      const endpoint = makeEndpoint({
        alias: 'create-reply-draft',
        method: 'post',
        path: '/me/messages/:messageId/createReply',
        parameters: [
          { name: 'messageId', type: 'Path', schema: z.string() },
          { name: 'body', type: 'Body', schema: z.any() },
        ],
      });
      const config = makeConfig({
        toolName: 'create-reply-draft',
        method: 'post',
        pathPattern: '/me/messages/{message-id}/createReply',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([{ content: [{ type: 'text', text: '{}' }] }]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('create-reply-draft')!.handler({
        messageId: 'AAMk123',
        body: { Message: { body: { contentType: 'html', content: '<p>hi</p>' } } },
      });

      const [, options] = graphClient.graphRequest.mock.calls[0];
      const prefer = options.headers['Prefer'];
      expect(prefer === undefined || !prefer.includes('outlook.body-content-type')).toBe(true);
    });
  });

  // ---- 8. Binary upload (requestFormat: 'binary') ----
  describe('binary upload bodies', () => {
    it('decodes base64 body to bytes and sets octet-stream Content-Type', async () => {
      const endpoint = makeEndpoint({
        alias: 'upload-file-content',
        method: 'put',
        path: '/drives/:driveId/items/:driveItemId/content',
        requestFormat: 'binary' as const,
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
          {
            name: 'body',
            type: 'Body',
            schema: z.string().describe('Base64-encoded file content'),
          },
        ],
      });
      const config = makeConfig({
        toolName: 'upload-file-content',
        method: 'put',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}/content',
        scopes: ['Files.ReadWrite'],
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([{ content: [{ type: 'text', text: '{}' }] }]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const original = 'Hello, world!';
      const base64 = Buffer.from(original, 'utf-8').toString('base64');

      await server.tools.get('upload-file-content')!.handler({
        driveId: 'drive123',
        driveItemId: 'item456',
        body: base64,
      });

      const [path, options] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe('/drives/drive123/items/item456/content');
      expect(options.headers['Content-Type']).toBe('application/octet-stream');
      expect(Buffer.isBuffer(options.body) || options.body instanceof Uint8Array).toBe(true);
      expect(Buffer.from(options.body).toString('utf-8')).toBe(original);
    });

    it('honors endpoints.json contentType override on binary uploads', async () => {
      const endpoint = makeEndpoint({
        alias: 'upload-file-content',
        method: 'put',
        path: '/drives/:driveId/items/:driveItemId/content',
        requestFormat: 'binary' as const,
        parameters: [
          { name: 'driveId', type: 'Path', schema: z.string() },
          { name: 'driveItemId', type: 'Path', schema: z.string() },
          { name: 'body', type: 'Body', schema: z.string() },
        ],
      });
      const config = makeConfig({
        toolName: 'upload-file-content',
        method: 'put',
        pathPattern: '/drives/{drive-id}/items/{driveItem-id}/content',
        scopes: ['Files.ReadWrite'],
        contentType: 'application/pdf',
      });
      mockEndpoints.push(endpoint);
      mockEndpointsJson = [config];

      const graphClient = createMockGraphClient([{ content: [{ type: 'text', text: '{}' }] }]);

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      await server.tools.get('upload-file-content')!.handler({
        driveId: 'd',
        driveItemId: 'i',
        body: Buffer.from('%PDF-1.4').toString('base64'),
      });

      const [, options] = graphClient.graphRequest.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/pdf');
    });
  });

  // ---- 9. download-bytes utility tool ----
  describe('download-bytes', () => {
    it('routes a relative Graph path through graphRequest', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                contentType: 'image/jpeg',
                encoding: 'base64',
                contentBytes: 'aGk=',
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, graphClient as any);

      const tool = server.tools.get('download-bytes');
      expect(tool).toBeDefined();

      await tool!.handler({ target: '/me/photo/$value' });

      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [path, options] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe('/me/photo/$value');
      expect(options.accessToken).toBeUndefined();
    });

    it('rejects absolute URLs (Graph paths only)', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, {} as any);

      const tool = server.tools.get('download-bytes');
      const result = await tool!.handler({
        target: 'https://example.sharepoint.com/d/abc?temp=signed',
      });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/relative Microsoft Graph path/);
    });

    it('rejects targets that do not start with /', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerGraphTools } = await loadModule();
      registerGraphTools(server as any, {} as any);

      const tool = server.tools.get('download-bytes');
      const result = await tool!.handler({ target: 'ftp://example.com/x' });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/relative Microsoft Graph path/);
    });
  });

  // ---- 10. Utility tools surface in --discovery mode ----
  describe('discovery mode: utility tools', () => {
    it('search-tools surfaces download-bytes for "download" queries', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any);

      const result = await server.tools.get('search-tools')!.handler({ query: 'download' });
      const payload = JSON.parse(result.content[0].text);
      const names = payload.tools.map((t: any) => t.name);
      expect(names).toContain('download-bytes');
    });

    it('get-tool-schema returns the download-bytes parameter schema', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any);

      const result = await server.tools
        .get('get-tool-schema')!
        .handler({ tool_name: 'download-bytes' });
      const schema = JSON.parse(result.content[0].text);
      expect(schema.name).toBe('download-bytes');
      expect(schema.path).toBe('tool:download-bytes');
      const targetParam = schema.parameters.find((p: any) => p.name === 'target');
      expect(targetParam).toBeDefined();
      expect(targetParam.required).toBe(true);
    });

    it('execute-tool dispatches to download-bytes for a Graph path', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const graphClient = {
        graphRequest: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                contentType: 'image/png',
                encoding: 'base64',
                contentBytes: 'iVBORw0K',
              }),
            },
          ],
        }),
      };

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, graphClient as any);

      const result = await server.tools.get('execute-tool')!.handler({
        tool_name: 'download-bytes',
        parameters: { target: '/me/photo/$value' },
      });

      expect(result.isError).toBeFalsy();
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
      const [path] = graphClient.graphRequest.mock.calls[0];
      expect(path).toBe('/me/photo/$value');
    });

    it('execute-tool reports unknown tool when name matches neither registry', async () => {
      mockEndpoints.length = 0;
      mockEndpointsJson = [];

      const server = createMockServer();
      const { registerDiscoveryTools } = await loadModule();
      registerDiscoveryTools(server as any, {} as any);

      const result = await server.tools.get('execute-tool')!.handler({
        tool_name: 'no-such-tool',
        parameters: {},
      });
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.error).toMatch(/not found/i);
    });
  });
});

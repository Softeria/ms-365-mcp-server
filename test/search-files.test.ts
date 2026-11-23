import { McpServer } from '@modelcontextprotocol/server';
import { readFileSync } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { resolveAuthScopes } from '../src/auth.js';
import type { GraphClient } from '../src/graph-client.js';
import {
  buildToolsRegistry,
  registerDiscoveryTools,
  registerGraphTools,
  type GraphToolRegistrationOptions,
} from '../src/graph-tools.js';
import { serveToolInputSchema } from '../src/lib/body-schema-budget.js';
import { describeToolSchema, toParamJsonSchema } from '../src/lib/tool-schema.js';
import logger from '../src/logger.js';
import { TOOL_CATEGORIES } from '../src/tool-categories.js';

// search-files is search-query (POST /search/query) with its body fixed to driveItem
// results. The caller fills three leaves of that body, queryString, size and from, through the
// entry's bodyParams; nothing else the caller sends reaches the body.
const TOOL = 'search-files';

const FIXED_BODY = {
  requests: [{ entityTypes: ['driveItem'], query: { queryString: '' }, from: 0, size: 10 }],
};

/** The exact body search-files has to send for this query, size and offset. */
function sentBody(queryString: string, size = 10, from = 0) {
  return { requests: [{ entityTypes: ['driveItem'], query: { queryString }, from, size }] };
}

type BodyParamConfig = {
  target: Array<string | number>;
  type: string;
  description: string;
  required?: boolean;
  minimum?: number;
};

type EndpointEntry = {
  toolName: string;
  pathPattern: string;
  method: string;
  readOnly?: boolean;
  scopes?: unknown;
  workScopes?: unknown;
  appScopes?: unknown;
  presets?: string[];
  queryParams?: string[];
  fixedBody?: unknown;
  bodyParams?: Record<string, BodyParamConfig>;
  descriptionOverride?: string;
  llmTip?: string;
};

const endpointsJson = JSON.parse(
  readFileSync(new URL('../src/endpoints.json', import.meta.url), 'utf8')
) as EndpointEntry[];

type Result = { content: Array<{ type: string; text: string }>; isError?: boolean };
type Handler = (params: Record<string, unknown>) => Promise<Result>;
type Registered = {
  handler: Handler;
  inputSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  annotations: Record<string, unknown>;
};

function mockGraphClient() {
  return {
    graphRequest: vi.fn(async () => ({
      content: [{ type: 'text', text: JSON.stringify({ value: [] }) }],
    })),
    serialize: vi.fn((data: unknown) => JSON.stringify(data)),
  } as unknown as GraphClient & { graphRequest: ReturnType<typeof vi.fn> };
}

type MockGraphClient = ReturnType<typeof mockGraphClient>;

function lastRequest(graphClient: MockGraphClient) {
  return graphClient.graphRequest.mock.calls.at(-1) as [string, { method: string; body?: string }];
}

/** The body of the last Graph request, parsed. */
function sent(graphClient: MockGraphClient): unknown {
  return JSON.parse(lastRequest(graphClient)[1].body as string);
}

function registerAll(
  graphClient: GraphClient,
  options: GraphToolRegistrationOptions = { orgMode: true }
): Map<string, Registered> {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const tools = new Map<string, Registered>();
  vi.spyOn(server, 'registerTool').mockImplementation(((
    name: string,
    def: { inputSchema: Registered['inputSchema']; annotations: Record<string, unknown> },
    handler: Handler
  ) => {
    tools.set(name, { handler, inputSchema: def.inputSchema, annotations: def.annotations });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registerTool() has many overloads
  }) as any);
  registerGraphTools(server, graphClient, options);
  return tools;
}

/** search-files as normal registration serves it: the prod path, with no --discovery. */
function registered(graphClient: GraphClient): Registered {
  const tool = registerAll(graphClient).get(TOOL);
  expect(tool, `${TOOL} is registered`).toBeDefined();
  return tool as Registered;
}

/** search-files through discovery mode's execute-tool, which runs no SDK validation. */
function throughExecuteTool(graphClient: GraphClient): Handler {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const handlers = new Map<string, Handler>();
  vi.spyOn(server, 'registerTool').mockImplementation(((
    name: string,
    _def: unknown,
    handler: Handler
  ) => {
    handlers.set(name, handler);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);
  registerDiscoveryTools(server, graphClient, { orgMode: true });
  const execute = handlers.get('execute-tool');
  expect(execute, 'execute-tool is registered').toBeDefined();
  return (params) => execute!({ tool_name: TOOL, parameters: params });
}

const MODES = ['the registered tool', 'execute-tool'] as const;

function searchFiles(mode: (typeof MODES)[number], graphClient: GraphClient): Handler {
  return mode === 'execute-tool'
    ? throughExecuteTool(graphClient)
    : registered(graphClient).handler;
}

afterEach(() => {
  delete process.env.MS365_MCP_REQUIRE_CONFIRM;
  vi.restoreAllMocks();
});

describe.each(MODES)('search-files through %s', (mode) => {
  /**
   * The tool after one call that has to go out. A refusal that follows is then the tool's
   * own: execute-tool also answers isError, with no Graph call, for a tool it doesn't know.
   */
  async function readyToCall(graphClient: MockGraphClient): Promise<Handler> {
    const call = searchFiles(mode, graphClient);
    const accepted = await call({ queryString: 'x' });
    expect(accepted.isError, accepted.content[0]?.text).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    expect(sent(graphClient)).toStrictEqual(sentBody('x'));
    return call;
  }

  it('sends driveItem and the caller query, whatever else the caller puts in or around the body', async () => {
    const graphClient = mockGraphClient();
    const result = await searchFiles(
      mode,
      graphClient
    )({
      queryString: 'x',
      body: {
        requests: [
          {
            entityTypes: ['message', 'chatMessage'],
            query: { queryString: 'y' },
            size: 500,
            from: 50,
          },
          { entityTypes: ['chatMessage'], query: { queryString: 'z' } },
        ],
      },
      requests: [{ entityTypes: ['message', 'chatMessage'], query: { queryString: 'y' } }],
      entityTypes: ['message', 'chatMessage'],
      query: { queryString: 'y' },
    });
    expect(result.isError, result.content[0]?.text).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    const [path, options] = lastRequest(graphClient);
    expect(path).toBe('/search/query');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toStrictEqual(sentBody('x'));
  });

  it.each([
    ['"10", as the number 10', '10', 10],
    ['1, the minimum', 1, 1],
    ['200, under no maximum of ours', 200, 200],
  ])('sends size %s', async (_label, size, expected) => {
    const graphClient = mockGraphClient();
    const result = await searchFiles(mode, graphClient)({ queryString: 'x', size });
    expect(result.isError, result.content[0]?.text).not.toBe(true);
    expect(sent(graphClient)).toStrictEqual(sentBody('x', expected));
  });

  it.each([
    ['"25", as the number 25', '25', 25],
    ['"0", as the number 0', '0', 0],
    ['0, the first page', 0, 0],
  ])('sends from %s', async (_label, from, expected) => {
    const graphClient = mockGraphClient();
    const result = await searchFiles(mode, graphClient)({ queryString: 'x', size: 25, from });
    expect(result.isError, result.content[0]?.text).not.toBe(true);
    expect(sent(graphClient)).toStrictEqual(sentBody('x', 25, expected));
  });

  it.each([{ from: -1 }, { from: '-1' }, { from: 2.5 }, { from: 'abc' }])(
    'refuses from $from, without calling Graph',
    async ({ from }) => {
      const graphClient = mockGraphClient();
      const call = await readyToCall(graphClient);
      const refused = await call({ queryString: 'x', from });
      expect(refused.isError).toBe(true);
      expect(refused.content[0].text).toContain('from');
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    }
  );

  it('starts every call from the configured body: size and from are back to 10 and 0, and the config is untouched', async () => {
    const config = buildToolsRegistry(false, true).get(TOOL)?.config;
    expect(config?.fixedBody, `${TOOL} config`).toStrictEqual(FIXED_BODY);
    const graphClient = mockGraphClient();
    // The config as it stands while Graph is being called: writing the caller's values
    // into it and putting it back afterwards would leak them into a concurrent call
    const configDuringCall: unknown[] = [];
    graphClient.graphRequest.mockImplementation(async () => {
      configDuringCall.push(structuredClone(config!.fixedBody));
      return { content: [{ type: 'text', text: JSON.stringify({ value: [] }) }] };
    });
    const call = searchFiles(mode, graphClient);
    await call({ queryString: 'first', size: 5, from: 5 });
    expect(sent(graphClient)).toStrictEqual(sentBody('first', 5, 5));
    await call({ queryString: 'second' });
    expect(sent(graphClient)).toStrictEqual(sentBody('second', 10));
    expect(config!.fixedBody).toStrictEqual(FIXED_BODY);
    expect(configDuringCall).toStrictEqual([FIXED_BODY, FIXED_BODY]);
  });

  it('passes a KQL query through as written: quotes, braces, backslashes, $ patterns', async () => {
    const query = 'filename:"a b" OR Contoso*} {x} \\ $\' $& $1 é';
    const graphClient = mockGraphClient();
    const result = await searchFiles(mode, graphClient)({ queryString: query });
    expect(result.isError, result.content[0]?.text).not.toBe(true);
    expect(sent(graphClient)).toStrictEqual(sentBody(query));
  });

  it.each([
    ['missing', {}],
    ['empty', { queryString: '' }],
    ['a number', { queryString: 5 }],
    ['null', { queryString: null }],
    ['an array', { queryString: ['x'] }],
    [
      'only inside a Graph body',
      { body: { requests: [{ entityTypes: ['driveItem'], query: { queryString: 'x' } }] } },
    ],
  ])('refuses a queryString that is %s, without calling Graph', async (_label, params) => {
    const graphClient = mockGraphClient();
    const call = await readyToCall(graphClient);
    const refused = await call(params);
    expect(refused.isError).toBe(true);
    expect(refused.content[0].text).toContain('queryString');
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    { size: 0 },
    { size: '0' },
    { size: '00' },
    { size: -1 },
    { size: 2.5 },
    { size: '2.5' },
    { size: 'abc' },
    { size: '1e3' },
    { size: ' 10' },
    { size: '10abc' },
    { size: true },
    { size: [5] },
  ])('refuses size $size, without calling Graph', async ({ size }) => {
    const graphClient = mockGraphClient();
    const call = await readyToCall(graphClient);
    const refused = await call({ queryString: 'x', size });
    expect(refused.isError).toBe(true);
    expect(refused.content[0].text).toContain('size');
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
  });

  it.each([{ $select: 'id' }, { select: 'id' }, { $filter: "name eq 'a'" }, { $top: 5 }])(
    'refuses OData option %j, which would go out in the URL',
    async (option) => {
      const graphClient = mockGraphClient();
      const call = await readyToCall(graphClient);
      const refused = await call({ queryString: 'x', ...option });
      expect(refused.isError).toBe(true);
      expect(JSON.parse(refused.content[0].text).error).toBe('invalid_query_parameter');
      expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    }
  );

  it('reads queryString, size and from as its own params, not as unrecognized ones', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const dropped = () =>
      warn.mock.calls
        .map((args) => String(args[0]))
        .filter((message) => message.includes('Dropping unrecognized parameter'));
    const graphClient = mockGraphClient();
    const call = searchFiles(mode, graphClient);
    await call({ queryString: 'x', size: 5, from: 5 });
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    expect(dropped()).toEqual([]);
    // The spy does see a param that really is unknown
    await call({ queryString: 'x', notAParam: 1 });
    expect(dropped()).toHaveLength(1);
  });
});

describe('search-files as registered for prod (no --discovery)', () => {
  it('serves queryString as its only required param, and size and from as optional integers', () => {
    const { inputSchema } = registered(mockGraphClient());
    const served = serveToolInputSchema(inputSchema.shape) as {
      required?: string[];
      properties: Record<string, { type?: string; description?: string; anyOf?: unknown[] }>;
    };
    expect(served.required).toEqual(['queryString']);
    expect(Object.keys(served.properties).sort()).toEqual([
      'excludeResponse',
      'from',
      'includeHeaders',
      'queryString',
      'size',
    ]);
    expect(served.properties.queryString.type).toBe('string');
    expect(served.properties.size.anyOf).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'integer', minimum: 1 })])
    );
    expect(served.properties.from.anyOf).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'integer', minimum: 0 })])
    );
    expect(served.properties.queryString.description).toMatch(/\S/);
    expect(served.properties.size.description).toMatch(/\S/);
    expect(served.properties.from.description).toMatch(/\S/);
  });

  it('parses size "10" to 10 on the way in, as the SDK does with the arguments', () => {
    const { inputSchema } = registered(mockGraphClient());
    expect(inputSchema.parse({ queryString: 'x', size: '10' }).size).toBe(10);
    expect(inputSchema.parse({ queryString: 'x' }).size).toBeUndefined();
    expect(inputSchema.parse({ queryString: 'x', from: '0' }).from).toBe(0);
    expect(inputSchema.parse({ queryString: 'x' }).from).toBeUndefined();
  });

  it.each([
    {},
    { queryString: '' },
    { queryString: 5 },
    { queryString: 'x', size: '0' },
    { queryString: 'x', size: '00' },
    { queryString: 'x', size: 0 },
    { queryString: 'x', size: 2.5 },
    { queryString: 'x', size: 'abc' },
    { queryString: 'x', from: -1 },
    { queryString: 'x', from: '-1' },
    { queryString: 'x', from: 2.5 },
  ])('refuses %j before the handler runs', (args) => {
    const { inputSchema } = registered(mockGraphClient());
    expect(inputSchema.safeParse(args).success).toBe(false);
  });

  it('is a read: no confirm gate, read-only hints, and still there in --read-only', async () => {
    process.env.MS365_MCP_REQUIRE_CONFIRM = 'true';
    const graphClient = mockGraphClient();
    const tool = registered(graphClient);
    expect(Object.keys(tool.inputSchema.shape)).not.toContain('confirm');
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    const result = await tool.handler({ queryString: 'x' });
    expect(result.isError, result.content[0]?.text).not.toBe(true);
    expect(graphClient.graphRequest).toHaveBeenCalledTimes(1);
    expect(buildToolsRegistry(true, true).has(TOOL)).toBe(true);
  });
});

describe('search-files in discovery mode (get-tool-schema)', () => {
  function described() {
    const entry = buildToolsRegistry(false, true).get(TOOL);
    expect(entry, `${TOOL} in the registry`).toBeDefined();
    return describeToolSchema(entry!.tool, entry!.config);
  }

  it('lists queryString (required), size and from (optional) as top-level params, and no body', () => {
    const schema = described();
    expect(schema.method).toBe('POST');
    expect(schema.path).toBe('/search/query');
    expect(schema.parameters.map((p) => p.name).sort()).toEqual(['from', 'queryString', 'size']);
    const byName = Object.fromEntries(schema.parameters.map((p) => [p.name, p]));
    expect(byName.queryString).toMatchObject({
      in: 'Query',
      required: true,
      schema: { type: 'string' },
    });
    expect(byName.size).toMatchObject({ in: 'Query', required: false });
    expect((byName.size.schema as { anyOf?: unknown[] }).anyOf).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'integer', minimum: 1 })])
    );
    expect(byName.from).toMatchObject({ in: 'Query', required: false });
    expect((byName.from.schema as { anyOf?: unknown[] }).anyOf).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'integer', minimum: 0 })])
    );
  });

  it('describes each body param with the schema normal registration serves', () => {
    const parameters = described().parameters;
    const shape = registered(mockGraphClient()).inputSchema.shape;
    for (const name of ['queryString', 'size', 'from']) {
      const schema = shape[name];
      expect(schema, `registered ${name}`).toBeDefined();
      const inner = schema instanceof z.ZodOptional ? (schema.unwrap() as z.ZodTypeAny) : schema;
      const param = parameters.find((p) => p.name === name);
      expect(param?.schema, name).toEqual(toParamJsonSchema(inner));
      expect(param?.required, name).toBe(!schema.isOptional());
      expect(param?.description, name).toBe(schema.description ?? inner.description);
    }
  });
});

describe('search-files: where it is offered', () => {
  // --allowed-scopes and --enabled-tools of the files pod in prod (0.185.0)
  const P = 'Files.Read.All Files.ReadWrite Sites.Read.All Sites.ReadWrite.All User.Read';
  const FILES_POD = [
    'create-onedrive-folder',
    'create-upload-session',
    'download-bytes',
    'get-current-user',
    'get-download-url',
    'get-drive-item',
    'get-drive-root-item',
    'get-sharepoint-site',
    'get-sharepoint-site-by-path',
    'get-sharepoint-site-list-item',
    'list-drive-item-versions',
    'list-drives',
    'list-sharepoint-site-drives',
    'list-sharepoint-site-items',
    'list-sharepoint-site-list-items',
    'list-sharepoint-site-lists',
    'move-rename-onedrive-item',
    'search-onedrive-files',
    'search-sharepoint-sites',
    'upload-file-content',
  ];
  const filesPodWithSearchFiles = `^(?:${[...FILES_POD, TOOL].join('|')})$`;

  function registeredNames(options: GraphToolRegistrationOptions): string[] {
    // Declared like src/server.ts does, so tools/call exists for the denied-tool audit hook
    const server = new McpServer(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: { listChanged: false } } }
    );
    const names: string[] = [];
    const record = ((name: string) => {
      names.push(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    vi.spyOn(server, 'registerTool').mockImplementation(record);
    registerGraphTools(server, {} as GraphClient, options);
    return names.sort();
  }

  it('joins the files pod under its prod args, and nothing else on that pod changes', () => {
    expect(
      registeredNames({
        orgMode: true,
        httpMode: true,
        enabledTools: filesPodWithSearchFiles,
        allowedScopes: P,
      })
    ).toEqual([...FILES_POD, TOOL].sort());
  });

  it('leaves the login scopes of the files pod at the prod baseline', () => {
    // The pattern has to reach the tool, or the scope check below proves nothing
    expect(
      buildToolsRegistry(false, true, new RegExp(filesPodWithSearchFiles, 'i'), P).has(TOOL)
    ).toBe(true);
    expect(
      resolveAuthScopes({ orgMode: true, enabledTools: filesPodWithSearchFiles, allowedScopes: P })
    ).toEqual(['Files.ReadWrite', 'Sites.Read.All', 'User.Read']);
  });

  it('asks for Sites.Read.All at login, or Files.Read.All when only that one is allowed', () => {
    const enabledTools = `^${TOOL}$`;
    expect(resolveAuthScopes({ orgMode: true, enabledTools })).toEqual(['Sites.Read.All']);
    expect(
      resolveAuthScopes({ orgMode: true, enabledTools, allowedScopes: 'Files.Read.All User.Read' })
    ).toEqual(['Files.Read.All']);
  });

  it('is offered under any allowlist covering Sites.Read.All or Files.Read.All, and no other', () => {
    const offered = (allowedScopes: string) =>
      buildToolsRegistry(false, true, undefined, allowedScopes).has(TOOL);
    const allowlists = [
      P,
      'Sites.Read.All User.Read',
      'Files.Read.All User.Read',
      // A .ReadWrite.All covers its .Read.All: taking just the two read scopes out of P
      // leaves the tool on
      'Files.ReadWrite Sites.ReadWrite.All User.Read',
      'Files.ReadWrite.All User.Read',
      'Files.ReadWrite User.Read',
      'Files.ReadWrite Sites.Selected User.Read',
    ];
    expect(Object.fromEntries(allowlists.map((a) => [a, offered(a)]))).toEqual({
      [P]: true,
      'Sites.Read.All User.Read': true,
      'Files.Read.All User.Read': true,
      'Files.ReadWrite Sites.ReadWrite.All User.Read': true,
      'Files.ReadWrite.All User.Read': true,
      'Files.ReadWrite User.Read': false,
      'Files.ReadWrite Sites.Selected User.Read': false,
    });
  });

  it('is a work-account tool: there in org mode, not in personal mode', () => {
    expect(buildToolsRegistry(false, true).has(TOOL)).toBe(true);
    expect(buildToolsRegistry(false, false).has(TOOL)).toBe(false);
  });

  it('belongs to the search and work presets, not to files, so --preset files asks no new scope', () => {
    const inPreset = Object.fromEntries(
      ['search', 'work', 'files', 'onedrive', 'personal'].map((preset) => [
        preset,
        TOOL_CATEGORIES[preset].pattern.test(TOOL),
      ])
    );
    expect(inPreset).toEqual({
      search: true,
      work: true,
      files: false,
      onedrive: false,
      personal: false,
    });
  });
});

describe('search-files: shipped config', () => {
  function entry(): EndpointEntry {
    const found = endpointsJson.find((e) => e.toolName === TOOL);
    expect(found, `${TOOL} in endpoints.json`).toBeDefined();
    return found!;
  }

  it('is POST /search/query, read-only and org-only, with a body fixed to driveItem', () => {
    const e = entry();
    expect(e).toMatchObject({
      pathPattern: '/search/query',
      method: 'post',
      readOnly: true,
      workScopes: [['Sites.Read.All'], ['Files.Read.All']],
      presets: ['search', 'work'],
      queryParams: [],
    });
    expect(e.scopes).toBeUndefined();
    expect(e.appScopes).toBeUndefined();
    expect(e.fixedBody).toStrictEqual(FIXED_BODY);
  });

  it('lets the caller fill queryString (required), size (at least 1) and from (at least 0), nothing else', () => {
    const { bodyParams } = entry();
    expect(Object.keys(bodyParams ?? {}).sort()).toEqual(['from', 'queryString', 'size']);
    expect(bodyParams!.queryString).toMatchObject({
      target: ['requests', 0, 'query', 'queryString'],
      type: 'string',
      required: true,
    });
    expect(bodyParams!.size).toMatchObject({
      target: ['requests', 0, 'size'],
      type: 'integer',
      minimum: 1,
    });
    expect(bodyParams!.size.required ?? false).toBe(false);
    expect(bodyParams!.from).toMatchObject({
      target: ['requests', 0, 'from'],
      type: 'integer',
      minimum: 0,
    });
    expect(bodyParams!.from.required ?? false).toBe(false);
  });

  it('tells the model the search is KQL keywords, in the description rather than a tip', () => {
    const { llmTip, descriptionOverride } = entry();
    expect(descriptionOverride).toContain('KQL');
    expect(llmTip).toBeUndefined();
  });

  it('leaves search-query, the operation it copies, as it was', async () => {
    const registry = buildToolsRegistry(false, true);
    const copy = registry.get(TOOL);
    expect(copy, `${TOOL} in the registry`).toBeDefined();
    expect(copy!.tool.method).toBe('post');
    expect(copy!.tool.path).toBe('/search/query');
    expect(copy!.tool.parameters.map((p) => p.name)).not.toContain('body');

    const source = registry.get('search-query')!;
    expect(source.tool.parameters.map((p) => p.name)).toContain('body');
    expect(source.config).not.toHaveProperty('fixedBody');
    expect(source.config).not.toHaveProperty('bodyParams');
    const graphClient = mockGraphClient();
    const callerBody = {
      requests: [{ entityTypes: ['message'], query: { queryString: 'y' }, size: 3 }],
    };
    const result = await registerAll(graphClient)
      .get('search-query')!
      .handler({ body: callerBody });
    expect(result.isError, result.content[0]?.text).not.toBe(true);
    expect(sent(graphClient)).toStrictEqual(callerBody);
  });
});

type BodyParamsModule = {
  bodyParamSchemas: (bodyParams: Record<string, BodyParamConfig>) => Record<string, z.ZodTypeAny>;
  buildFixedBody: (
    fixedBody: unknown,
    bodyParams: Record<string, BodyParamConfig>,
    params: Record<string, unknown>
  ) => { body?: unknown; error?: unknown };
};

// Loaded per test, so the rest of this file still runs while the module is missing
const loadBodyParams = () =>
  import('../src/lib/body-params.js') as unknown as Promise<BodyParamsModule>;

describe('body-params, the mechanism under search-files', () => {
  // A shape other than search-files' own, so a mechanism that only knows requests[0] shows
  const FIXED = { a: [{ keep: 1 }, { b: { c: '' } }], n: 3 };
  const PARAMS: Record<string, BodyParamConfig> = {
    text: { target: ['a', 1, 'b', 'c'], type: 'string', required: true, description: 'Text.' },
    count: { target: ['n'], type: 'integer', minimum: 2, description: 'A count.' },
  };

  it('writes each parsed value at its target, on a copy of the body', async () => {
    const { buildFixedBody } = await loadBodyParams();
    const fixedBody = structuredClone(FIXED);
    const result = buildFixedBody(fixedBody, PARAMS, { text: 'hello', count: '7', other: 'x' });
    expect(result.error).toBeUndefined();
    expect(result.body).toStrictEqual({ a: [{ keep: 1 }, { b: { c: 'hello' } }], n: 7 });
    expect(fixedBody).toStrictEqual(FIXED);
  });

  it('keeps the configured value of an optional param the caller leaves out', async () => {
    const { buildFixedBody } = await loadBodyParams();
    expect(buildFixedBody(structuredClone(FIXED), PARAMS, { text: 'x' }).body).toStrictEqual({
      a: [{ keep: 1 }, { b: { c: 'x' } }],
      n: 3,
    });
  });

  it.each([
    ['a required param is missing', { count: 5 }],
    ['a required string is empty', { text: '' }],
    ['an integer is under its minimum', { text: 'x', count: 1 }],
    ['an integer string is under its minimum', { text: 'x', count: '1' }],
    ['an integer is not whole', { text: 'x', count: 2.5 }],
  ])('returns an error and no body when %s', async (_label, params) => {
    const { buildFixedBody } = await loadBodyParams();
    const result = buildFixedBody(structuredClone(FIXED), PARAMS, params);
    expect(result.body).toBeUndefined();
    expect(result.error).toBeTruthy();
  });

  it('builds one schema per param, optional unless required, with the minimum on both integer forms', async () => {
    const { bodyParamSchemas } = await loadBodyParams();
    const schemas = bodyParamSchemas(PARAMS);
    expect(Object.keys(schemas).sort()).toEqual(['count', 'text']);
    expect(schemas.text.isOptional()).toBe(false);
    expect(schemas.count.isOptional()).toBe(true);
    expect(schemas.count.safeParse('7')).toMatchObject({ success: true, data: 7 });
    expect(schemas.count.safeParse(2)).toMatchObject({ success: true, data: 2 });
    expect(schemas.count.safeParse('1').success).toBe(false);
    expect(schemas.count.safeParse(1).success).toBe(false);
    expect(schemas.text.safeParse('').success).toBe(false);
  });
});

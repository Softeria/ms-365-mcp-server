import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Node 18 lacks the File global that the generated Zod schemas reference.
// Must be set before the dynamic import below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!globalThis.File) (globalThis as any).File = Blob;

const { api, schemas } = await import('../src/generated/client.js');
const { api: betaApi } = await import('../src/generated/client-beta.js');
const { generatedPathFor, UTILITY_TOOLS } = await import('../src/graph-tools.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A leaf of a fixedBody the caller may fill, under the param name it is keyed by
interface BodyParam {
  target: Array<string | number>;
  type: string;
  description: string;
  required?: boolean;
  minimum?: number;
}

interface Endpoint {
  toolName: string;
  pathPattern: string;
  method: string;
  scopes?: string[] | string[][];
  workScopes?: string[] | string[][];
  appScopes?: string[] | string[][];
  returnDownloadUrl?: boolean;
  llmTip?: string;
  queryParams?: string[];
  extraQueryParams?: Record<string, Record<string, unknown>>;
  maxTop?: number;
  nameFilter?: boolean;
  mentionShorthand?: boolean;
  fixedBody?: Record<string, unknown>;
  bodyParams?: Record<string, BodyParam>;
  descriptionOverride?: string;
  deltaToken?: boolean;
  plainSearch?: boolean;
  honorNonIndexedQueries?: boolean;
}

const endpoints: Endpoint[] = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
);

// Names executeGraphTool already reads off a call: its control params, the OData options
// (with or without $) and the generic body. A body param under one of them would be read
// as that instead.
const RESERVED_PARAM_NAMES = new Set(
  [
    'account',
    'confirm',
    'fetchAllPages',
    'includeHeaders',
    'excludeResponse',
    'timezone',
    'expandExtendedProperties',
    'fileName',
    'name',
    'token',
    'accept',
    'body',
    'filter',
    'select',
    'expand',
    'orderby',
    'skip',
    'skiptoken',
    'top',
    'count',
    'search',
    'format',
  ].map((name) => name.toLowerCase())
);

/** The value at `target` in `body`: numbers index arrays, strings name object keys. */
function resolveTarget(body: unknown, target: unknown): { found: boolean; value?: unknown } {
  if (!Array.isArray(target) || target.length === 0) return { found: false };
  let node = body;
  for (const step of target) {
    if (typeof step === 'number') {
      if (!Array.isArray(node) || !Number.isInteger(step) || step < 0 || step >= node.length) {
        return { found: false };
      }
      node = node[step];
    } else if (typeof step === 'string') {
      if (
        node === null ||
        typeof node !== 'object' ||
        Array.isArray(node) ||
        !Object.prototype.hasOwnProperty.call(node, step)
      ) {
        return { found: false };
      }
      node = (node as Record<string, unknown>)[step];
    } else {
      return { found: false };
    }
  }
  return { found: true, value: node };
}

/** What is wrong with an entry's bodyParams; empty when nothing is. */
function bodyParamProblems(e: Partial<Endpoint> & { toolName: string }): string[] {
  if (!e.bodyParams) return [];
  if (!e.fixedBody) return [`${e.toolName}: bodyParams without a fixedBody`];
  const problems: string[] = [];
  const pathParams = [...(e.pathPattern ?? '').matchAll(/\{([^}]+)\}/g)].map((m) =>
    m[1].replace(/-/g, '').toLowerCase()
  );
  const targets = new Set<string>();
  for (const [name, param] of Object.entries(e.bodyParams)) {
    const label = `${e.toolName}.bodyParams.${name}`;
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) problems.push(`${label}: not a plain param name`);
    if (RESERVED_PARAM_NAMES.has(name.toLowerCase()) || pathParams.includes(name.toLowerCase())) {
      problems.push(`${label}: the name is already taken`);
    }
    if (param.type !== 'string' && param.type !== 'integer') {
      problems.push(`${label}: type ${JSON.stringify(param.type)} is not string or integer`);
    }
    if (typeof param.description !== 'string' || param.description.trim() === '') {
      problems.push(`${label}: no description`);
    }
    if (param.required !== undefined && typeof param.required !== 'boolean') {
      problems.push(`${label}: required is not a boolean`);
    }
    if (
      param.minimum !== undefined &&
      (param.type !== 'integer' || !Number.isInteger(param.minimum))
    ) {
      problems.push(`${label}: minimum only goes with an integer, and is one`);
    }
    const key = JSON.stringify(param.target);
    if (targets.has(key)) problems.push(`${label}: another param fills ${key}`);
    targets.add(key);

    const leaf = resolveTarget(e.fixedBody, param.target);
    if (!leaf.found) {
      problems.push(`${label}: target ${key} is not in fixedBody`);
      continue;
    }
    if (leaf.value === null || typeof leaf.value === 'object') {
      problems.push(`${label}: target ${key} is not a leaf`);
      continue;
    }
    if (param.type === 'string' && typeof leaf.value !== 'string') {
      problems.push(`${label}: string param on a ${typeof leaf.value} leaf`);
    }
    if (param.type === 'integer') {
      if (!Number.isInteger(leaf.value)) {
        problems.push(`${label}: integer param on a leaf that is not one`);
      } else if (
        !param.required &&
        param.minimum !== undefined &&
        (leaf.value as number) < param.minimum
      ) {
        // An optional param sends the leaf's own value when the caller leaves it out
        problems.push(`${label}: default ${leaf.value} is under minimum ${param.minimum}`);
      }
    }
  }
  return problems;
}

describe('endpoints.json validation', () => {
  it('should not have endpoints with both scopes and workScopes', () => {
    const violations = endpoints.filter((e) => e.scopes && e.workScopes);

    if (violations.length > 0) {
      const details = violations
        .map(
          (e) =>
            `  ${e.toolName}: scopes=${JSON.stringify(e.scopes)} workScopes=${JSON.stringify(e.workScopes)}`
        )
        .join('\n');
      expect.fail(
        `${violations.length} endpoint(s) have both scopes and workScopes. ` +
          `Use scopes for personal-account-compatible endpoints, workScopes for org-only endpoints, never both.\n${details}`
      );
    }
  });

  it('should not give appScopes to /me endpoints, which need a signed-in user', () => {
    const violations = endpoints
      .filter((e) => e.appScopes !== undefined && /^\/me(\/|$)/.test(e.pathPattern))
      .map((e) => e.toolName);
    expect(violations).toEqual([]);
  });

  it('should not put delegated-only permissions in appScopes', () => {
    // .Shared and the chat/channel send scopes exist only as delegated permissions
    const delegatedOnly = /\.Shared$|^ChatMessage\.Send$|^ChannelMessage\.Send$/;
    const violations = endpoints.flatMap((e) =>
      (e.appScopes ?? [])
        .flat()
        .filter((scope) => delegatedOnly.test(scope))
        .map((scope) => `${e.toolName}: ${scope}`)
    );
    expect(violations).toEqual([]);
  });

  it('should have well-formed scope groups (flat string[] or nested string[][])', () => {
    const isStringArray = (v: unknown): boolean =>
      Array.isArray(v) && v.every((s) => typeof s === 'string');

    const malformed: string[] = [];
    for (const e of endpoints) {
      for (const field of ['scopes', 'workScopes', 'appScopes'] as const) {
        const value = e[field];
        if (value === undefined) continue;
        if (!Array.isArray(value)) {
          malformed.push(`${e.toolName}.${field}: must be an array`);
          continue;
        }
        if (value.length === 0) continue; // empty = no scope required, valid
        const nested = Array.isArray(value[0]);
        // All entries must be consistent: either all strings (flat) or all non-empty string[] (groups).
        const ok = nested
          ? value.every((g) => isStringArray(g) && (g as string[]).length > 0)
          : isStringArray(value);
        if (!ok) {
          malformed.push(`${e.toolName}.${field}: ${JSON.stringify(value)}`);
        }
      }
    }

    if (malformed.length > 0) {
      expect.fail(
        `${malformed.length} endpoint(s) have malformed scope groups. ` +
          `Use string[] for a single required set, or string[][] for OR-groups.\n${malformed.join('\n')}`
      );
    }
  });

  it('should not have duplicate tool names', () => {
    const seen = new Set<string>();
    const duplicates = endpoints.filter((e) => {
      if (seen.has(e.toolName)) return true;
      seen.add(e.toolName);
      return false;
    });

    if (duplicates.length > 0) {
      const details = duplicates
        .map((e) => `  ${e.toolName} (${e.method.toUpperCase()} ${e.pathPattern})`)
        .join('\n');
      expect.fail(
        `${duplicates.length} duplicate toolName(s) in endpoints.json. ` +
          `Each tool must be defined exactly once.\n${details}`
      );
    }
  });

  it('should keep tool names short enough for clients that add the server name (#801)', () => {
    // Bedrock refuses tool names over 64 characters, and LibreChat sends each tool as
    // <tool>_mcp_<server>. 52 leaves room for that with a server name of up to 7
    // characters, such as the README's ms365.
    const maxLength = 52;
    const names = [...endpoints.map((e) => e.toolName), ...UTILITY_TOOLS.map((t) => t.name)];
    const tooLong = names.filter((name) => name.length > maxLength);

    if (tooLong.length > 0) {
      expect.fail(
        `${tooLong.length} tool name(s) over ${maxLength} characters:\n` +
          tooLong.map((name) => `  ${name} (${name.length})`).join('\n')
      );
    }
  });

  it('should have a matching generated client endpoint for every entry', () => {
    const generated = [...api.endpoints, ...betaApi.endpoints];
    const generatedTools = new Set(generated.map((e) => e.alias));
    // A fixedBody entry shares another tool's operation, so it is matched by that
    // operation's path and method rather than by its own name.
    const generatedOps = new Set(generated.map((e) => `${e.method} ${e.path}`));
    const orphans = endpoints.filter((e) =>
      e.fixedBody
        ? !generatedOps.has(`${e.method.toLowerCase()} ${generatedPathFor(e.pathPattern)}`)
        : !generatedTools.has(e.toolName)
    );

    if (orphans.length > 0) {
      const details = orphans
        .map((e) => `  ${e.toolName} (${e.method.toUpperCase()} ${e.pathPattern})`)
        .join('\n');
      expect.fail(
        `${orphans.length} endpoint(s) in endpoints.json have no matching generated client entry. ` +
          `Run npm run generate, or check that the path and method exist in the OpenAPI spec.\n${details}`
      );
    }
  });

  it('should give every fixedBody entry its own description', () => {
    // A fixedBody tool is a copy of another tool's operation, so without an override it
    // would be described as that operation (delete-mail-message as a plain move)
    const undescribed = endpoints
      .filter((e) => e.fixedBody && !e.descriptionOverride)
      .map((e) => e.toolName);
    expect(undescribed).toEqual([]);
  });

  describe('bodyParams', () => {
    // The only body a fixedBody tool sends is its fixedBody, so a body param can only fill
    // a leaf of it; that leaf holds the value sent when an optional param is left out.
    it('should put bodyParams only on fixedBody entries, each on an existing leaf of it', () => {
      // Without a shipped entry to check, the assertion below would pass on nothing
      expect(endpoints.filter((e) => e.bodyParams).map((e) => e.toolName)).toContain(
        'search-files'
      );
      expect(endpoints.flatMap((e) => bodyParamProblems(e))).toEqual([]);
    });

    const text = { target: ['q'], type: 'string', required: true, description: 'Query.' };
    it.each([
      ['bodyParams with no fixedBody', { bodyParams: { q: text } }],
      ['a target missing from fixedBody', { fixedBody: { a: '' }, bodyParams: { q: text } }],
      [
        'a target that stops at an object',
        { fixedBody: { q: { r: '' } }, bodyParams: { q: text } },
      ],
      [
        'an index past the end of an array',
        { fixedBody: { a: [''] }, bodyParams: { q: { ...text, target: ['a', 1] } } },
      ],
      [
        'a string key into an array',
        { fixedBody: { a: [''] }, bodyParams: { q: { ...text, target: ['a', '0'] } } },
      ],
      [
        'a type the runtime does not handle',
        { fixedBody: { q: true }, bodyParams: { q: { ...text, type: 'boolean' } } },
      ],
      [
        'an integer param on a string leaf',
        { fixedBody: { q: '10' }, bodyParams: { q: { ...text, type: 'integer' } } },
      ],
      [
        'an optional integer whose default is under its minimum',
        {
          fixedBody: { n: 0 },
          bodyParams: {
            n: { target: ['n'], type: 'integer', minimum: 1, description: 'How many.' },
          },
        },
      ],
      [
        'a param with no description',
        { fixedBody: { q: '' }, bodyParams: { q: { ...text, description: '' } } },
      ],
      ['a name the runtime already reads', { fixedBody: { q: '' }, bodyParams: { account: text } }],
      [
        'two params on one leaf',
        { fixedBody: { q: '' }, bodyParams: { q: text, other: { ...text, required: false } } },
      ],
    ])('should catch %s', (_label, entry) => {
      expect(bodyParamProblems({ toolName: 'example', pathPattern: '/x', ...entry })).not.toEqual(
        []
      );
    });

    it('should accept a well-formed entry', () => {
      expect(
        bodyParamProblems({
          toolName: 'example',
          pathPattern: '/x',
          fixedBody: { a: [{ q: { s: '' }, n: 10 }] },
          bodyParams: {
            s: { target: ['a', 0, 'q', 's'], type: 'string', required: true, description: 'S.' },
            n: { target: ['a', 0, 'n'], type: 'integer', minimum: 1, description: 'N.' },
          },
        })
      ).toEqual([]);
    });
  });

  it('should generate non-void response schemas for Planner task chat read/create tools', () => {
    const plannerChatTools = ['list-planner-task-messages', 'create-planner-task-message'];

    for (const toolName of plannerChatTools) {
      const endpoint = betaApi.endpoints.find((e) => e.alias === toolName);
      expect(endpoint, `${toolName} should exist in the beta generated client`).toBeDefined();
      expect(
        endpoint?.response.safeParse(undefined).success,
        `${toolName} should parse the Graph response body instead of z.void()`
      ).toBe(false);
    }
  });

  it('should treat meeting recording content as authenticated bytes, not a pre-authenticated URL', () => {
    const endpoint = endpoints.find((e) => e.toolName === 'get-meeting-recording-content');

    expect(endpoint, 'get-meeting-recording-content should exist').toBeDefined();
    expect(endpoint?.returnDownloadUrl).toBeUndefined();
    expect(endpoint?.llmTip).toContain('authenticated meeting recording video bytes');
    expect(endpoint?.llmTip).toContain('does not expose a pre-authenticated download URL');
  });

  it('should prefer get-download-url for out-of-band drive file downloads', () => {
    const endpoint = endpoints.find((e) => e.toolName === 'get-drive-item');

    expect(endpoint, 'get-drive-item should exist').toBeDefined();
    expect(endpoint?.llmTip).toContain('call get-download-url');
    expect(endpoint?.llmTip).toContain('out-of-band');
    expect(endpoint?.llmTip).toContain('call download-bytes');
  });

  it('should request the org-wide Notes scopes for SharePoint-site OneNote tools', () => {
    // Notes.Read / Notes.Create / Notes.ReadWrite only reach the user's own notebooks;
    // Graph 403s /sites/{site-id}/onenote/... without Notes.Read.All or Notes.ReadWrite.All (#781)
    const siteTools = endpoints.filter((e) => e.toolName.includes('sharepoint-site-onenote'));

    expect(siteTools).toHaveLength(13);
    for (const endpoint of siteTools) {
      expect(endpoint.workScopes, endpoint.toolName).toEqual(
        endpoint.method === 'get' ? ['Notes.Read.All'] : ['Notes.ReadWrite.All']
      );
    }
  });

  it('should not declare delegated ChatMessage.Read', () => {
    // Graph 403s every chat message read with only ChatMessage.Read and asks for Chat.Read (#849)
    const offenders = endpoints
      .filter((e) =>
        [...(e.scopes ?? []), ...(e.workScopes ?? [])].flat().includes('ChatMessage.Read')
      )
      .map((e) => e.toolName);

    expect(offenders).toEqual([]);
  });

  it('should not expose chat message replies', () => {
    // Replies are channel-only; Graph 404s GET and POST on /chats/.../replies
    const offenders = endpoints
      .filter((e) => /(^|\/)chats\/[^/]+\/messages\/[^/]+\/replies(\/|$)/.test(e.pathPattern))
      .map((e) => `${e.method} ${e.toolName}`);

    expect(offenders).toEqual([]);
  });

  it('should route To Do step edits to the checklist-item tools, not update-todo-task', () => {
    const checklistTools = [
      'list-todo-checklist-items',
      'create-todo-checklist-item',
      'update-todo-checklist-item',
      'delete-todo-checklist-item',
    ];

    for (const toolName of checklistTools) {
      const endpoint = endpoints.find((e) => e.toolName === toolName);
      expect(endpoint, `${toolName} should exist`).toBeDefined();
      expect(endpoint?.scopes).toEqual(
        endpoint?.method === 'get' ? ['Tasks.Read'] : ['Tasks.ReadWrite']
      );
    }

    // Graph 400s a PATCH on the task that carries checklistItems, so the model has to be
    // pointed at the /checklistItems tools instead.
    const updateTask = endpoints.find((e) => e.toolName === 'update-todo-task');
    expect(updateTask?.llmTip).toContain('update-todo-checklist-item');
    expect(updateTask?.llmTip).toContain('create-todo-checklist-item');
    expect(updateTask?.llmTip).toContain('delete-todo-checklist-item');
  });

  it('should document the @mention shape on the Teams send/reply tools', () => {
    const mentionTools = ['send-chat-message', 'send-channel-message', 'reply-to-channel-message'];

    for (const toolName of mentionTools) {
      const endpoint = endpoints.find((e) => e.toolName === toolName);
      expect(endpoint, `${toolName} should exist`).toBeDefined();
      // Model omits userIdentityType without this, and Graph 400s (issue #558)
      expect(endpoint?.llmTip, `${toolName} llmTip`).toContain('<at id');
      expect(endpoint?.llmTip, `${toolName} llmTip`).toContain('userIdentityType');
    }
  });

  describe('per-tool behavior fields', () => {
    const generated = new Map([...api.endpoints, ...betaApi.endpoints].map((e) => [e.alias, e]));
    const queryNames = (toolName: string) =>
      (generated.get(toolName)?.parameters ?? [])
        .filter((p) => p.type === 'Query')
        .map((p) => p.name.replace(/^\$/, '').toLowerCase());

    it('lists only query params the generated tool has, plus the skiptoken cursor', () => {
      for (const e of endpoints.filter((x) => x.queryParams)) {
        const known = new Set([...queryNames(e.toolName), 'skiptoken']);
        const listed = e.queryParams!.map((p) => p.toLowerCase());
        for (const name of listed) {
          expect(known.has(name), `${e.toolName} queryParams has unknown "${name}"`).toBe(true);
        }
        expect(new Set(listed).size, `${e.toolName} queryParams has duplicates`).toBe(
          listed.length
        );
      }
    });

    // The generator adds these to the operation. hack.ts strips $ and _ from param names,
    // so a name with either would reach Graph renamed, and a queryParams list that leaves
    // one out hides it. Path params go by camelCase at runtime ({site-id} is siteId).
    it('declares extraQueryParams the generator adds as plain optional query params', () => {
      for (const e of endpoints.filter((x) => x.extraQueryParams)) {
        expect(e.fixedBody, `${e.toolName} extraQueryParams on a fixedBody entry`).toBeUndefined();
        const pathParams = [...e.pathPattern.matchAll(/\{([^}]+)\}/g)].map((m) =>
          m[1].replace(/-/g, '').toLowerCase()
        );
        for (const [name, schema] of Object.entries(e.extraQueryParams!)) {
          const label = `${e.toolName} extraQueryParams.${name}`;
          expect(name, label).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
          expect(pathParams, label).not.toContain(name.toLowerCase());
          expect(typeof schema.type, `${label} type`).toBe('string');
          expect(typeof schema.description, `${label} description`).toBe('string');
          expect(queryNames(e.toolName), `${label} not generated`).toContain(name.toLowerCase());
          if (e.queryParams) {
            expect(
              e.queryParams.map((p) => p.toLowerCase()),
              label
            ).toContain(name.toLowerCase());
          }
        }
      }
    });

    it('caps $top only where the tool takes $top', () => {
      for (const e of endpoints.filter((x) => x.maxTop !== undefined)) {
        expect(Number.isInteger(e.maxTop) && e.maxTop! > 0, `${e.toolName} maxTop`).toBe(true);
        expect(queryNames(e.toolName), `${e.toolName} has no $top`).toContain('top');
        if (e.queryParams) expect(e.queryParams.map((p) => p.toLowerCase())).toContain('top');
      }
    });

    it('puts nameFilter only on GET tools', () => {
      for (const e of endpoints.filter((x) => x.nameFilter)) {
        expect(e.method, `${e.toolName} nameFilter`).toBe('get');
      }
    });

    it('puts deltaToken only on GET delta() tools', () => {
      for (const e of endpoints.filter((x) => x.deltaToken)) {
        expect(e.method, `${e.toolName} deltaToken`).toBe('get');
        expect(e.pathPattern, `${e.toolName} deltaToken`).toMatch(/\/delta\(\)$/);
      }
    });

    it('puts plainSearch only on GET tools', () => {
      for (const e of endpoints.filter((x) => x.plainSearch)) {
        expect(e.method, `${e.toolName} plainSearch`).toBe('get');
        expect(queryNames(e.toolName), `${e.toolName} has no $search`).toContain('search');
      }
    });

    it('puts honorNonIndexedQueries only on GET tools that take $filter', () => {
      const flagged = endpoints.filter((x) => x.honorNonIndexedQueries);
      // Without a shipped entry to check, the loop below would pass on nothing
      expect(flagged.map((e) => e.toolName)).toContain('list-sharepoint-site-list-items');
      for (const e of flagged) {
        expect(e.method, `${e.toolName} honorNonIndexedQueries`).toBe('get');
        expect(queryNames(e.toolName), `${e.toolName} has no $filter`).toContain('filter');
        if (e.queryParams) expect(e.queryParams.map((p) => p.toLowerCase())).toContain('filter');
      }
    });

    // Nothing in the body schema explains the shorthand, so a flag the llmTip doesn't
    // mention is invisible to the model, and a tip without the flag promises a rewrite
    // the server doesn't do
    it('puts mentionShorthand exactly on the tools whose llmTip explains <at user-id>', () => {
      for (const e of endpoints) {
        expect(!!e.mentionShorthand, `${e.toolName} mentionShorthand`).toBe(
          !!e.llmTip?.includes('user-id=')
        );
        if (e.mentionShorthand) {
          expect(['post', 'patch'], `${e.toolName} mentionShorthand`).toContain(e.method);
        }
      }
    });
  });

  it('should accept and preserve userIdentityType on a mentions payload (passthrough schema)', () => {
    const chatMessage = (
      schemas as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>
    ).microsoft_graph_chatMessage;
    const payload = {
      body: { contentType: 'html', content: 'Hi <at id="0">Jane</at>' },
      mentions: [
        {
          id: 0,
          mentionText: 'Jane',
          mentioned: { user: { id: 'guid', displayName: 'Jane', userIdentityType: 'aadUser' } },
        },
      ],
    };

    const result = chatMessage.safeParse(payload);
    expect(result.success).toBe(true);
    // userIdentityType isn't a modeled field - it survives only because the schemas are
    // .passthrough(). So this guards the codegen trait, not request serialization.
    const mentioned = (
      result.data as { mentions: Array<{ mentioned: { user: { userIdentityType?: string } } }> }
    ).mentions[0].mentioned.user;
    expect(mentioned.userIdentityType).toBe('aadUser');
  });
});

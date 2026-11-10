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
  maxTop?: number;
  nameFilter?: boolean;
  mentionShorthand?: boolean;
  fixedBody?: Record<string, unknown>;
  descriptionOverride?: string;
  deltaToken?: boolean;
}

const endpoints: Endpoint[] = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
);

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
    const mentionTools = [
      'send-chat-message',
      'send-channel-message',
      'reply-to-channel-message',
      'reply-to-chat-message',
    ];

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

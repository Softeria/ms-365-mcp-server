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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Endpoint {
  toolName: string;
  pathPattern: string;
  method: string;
  scopes?: string[] | string[][];
  workScopes?: string[] | string[][];
  returnDownloadUrl?: boolean;
  llmTip?: string;
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

  it('should have well-formed scope groups (flat string[] or nested string[][])', () => {
    const isStringArray = (v: unknown): boolean =>
      Array.isArray(v) && v.every((s) => typeof s === 'string');

    const malformed: string[] = [];
    for (const e of endpoints) {
      for (const field of ['scopes', 'workScopes'] as const) {
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

  it('should have a matching generated client endpoint for every entry', () => {
    const generatedTools = new Set([...api.endpoints, ...betaApi.endpoints].map((e) => e.alias));
    const orphans = endpoints.filter((e) => !generatedTools.has(e.toolName));

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

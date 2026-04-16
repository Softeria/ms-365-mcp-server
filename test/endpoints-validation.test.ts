import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Node 18 lacks the File global that the generated Zod schemas reference.
// Must be set before the dynamic import below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!globalThis.File) (globalThis as any).File = Blob;

const { api } = await import('../src/generated/client.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EndpointFull {
  toolName: string;
  pathPattern: string;
  method: string;
  scopes?: string[];
  workScopes?: string[];
  apiVersion?: string;
  llmTip?: string;
}

const endpoints: EndpointFull[] = JSON.parse(
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

  it('should have a matching generated client endpoint for every entry', () => {
    const generatedTools = new Set(api.endpoints.map((e) => e.alias));
    // Beta endpoints are not in the v1.0 OpenAPI spec and are registered separately at runtime
    const orphans = endpoints.filter(
      (e) => !generatedTools.has(e.toolName) && !e.apiVersion
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
});

describe('chat endpoint config invariants', () => {
  it('list-chats must use beta API for viewpoint support', () => {
    const listChats = endpoints.find((e) => e.toolName === 'list-chats');
    expect(listChats).toBeDefined();
    expect(listChats!.apiVersion).toBe('beta');
  });

  it('list-chats llmTip must reference $select (not $expand) for viewpoint', () => {
    const listChats = endpoints.find((e) => e.toolName === 'list-chats');
    expect(listChats).toBeDefined();
    expect(listChats!.llmTip).toBeDefined();
    expect(listChats!.llmTip).toContain('$select');
    expect(listChats!.llmTip).not.toContain('$expand=viewpoint');
  });

  it('list-chat-messages-delta must NOT exist (per-chat delta is not supported by Graph)', () => {
    // /chats/{chat-id}/messages/delta() appears in Graph OData metadata but the backend
    // returns "Change tracking is not supported against microsoft.graph.chatMessage".
    // See: https://github.com/microsoftgraph/msgraph-metadata/issues/607
    const chatDelta = endpoints.find((e) => e.toolName === 'list-chat-messages-delta');
    expect(chatDelta).toBeUndefined();
  });

  it('list-chat-messages must have an llmTip guiding toward date-based filtering', () => {
    const listChatMessages = endpoints.find((e) => e.toolName === 'list-chat-messages');
    expect(listChatMessages).toBeDefined();
    expect(listChatMessages!.llmTip).toBeDefined();
    expect(listChatMessages!.llmTip).toContain('lastModifiedDateTime');
  });
});

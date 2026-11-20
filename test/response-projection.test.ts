/**
 * Unit 1 — server-side response shaping: default field projection ($select)
 * and default page size ($top). Asserts on the path handed to the Graph client.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { fakeGraphClient } from './fake-graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

function makeGraphClient(): { gc: GraphClient; calls: () => string[] } {
  const graphRequest = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: '{"value":[]}' }],
    isError: false,
  });
  return {
    gc: fakeGraphClient(graphRequest),
    calls: () => graphRequest.mock.calls.map((c) => String(c[0])),
  };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  delete process.env.MS365_MCP_DEFAULT_TOP;
  delete process.env.MS365_MCP_MAX_TOP;
});

describe('default projection ($select)', () => {
  it('injects the Minimal* mail field set when the caller omits $select', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, {});
    const path = calls()[0];
    expect(path).toContain('$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview');
  });

  it('injects the Minimal* user field set for user-search', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('user-search'), gc, {});
    expect(calls()[0]).toContain('$select=id,displayName,userPrincipalName,mail');
  });

  it("response_format: 'detailed' suppresses the default projection", async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, { response_format: 'detailed' });
    expect(calls()[0]).not.toContain('$select=');
  });

  it('respects an explicit caller $select (does not override)', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, { select: 'id,subject' });
    const path = calls()[0];
    expect(path).toContain('$select=id,subject');
    expect(path).not.toContain('bodyPreview');
  });

  it('does not project a by-id read (mail-message-get has no projection)', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-get'), gc, { 'message-id': 'abc' });
    expect(calls()[0]).not.toContain('$select=');
  });
});

describe('default page size ($top)', () => {
  it('injects $top=15 for a list GET when the caller omits it', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, {});
    expect(calls()[0]).toContain('$top=15');
  });

  it('honors MS365_MCP_DEFAULT_TOP', async () => {
    process.env.MS365_MCP_DEFAULT_TOP = '5';
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, {});
    expect(calls()[0]).toContain('$top=5');
  });

  it('respects an explicit caller top', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, { top: 50 });
    const path = calls()[0];
    expect(path).toContain('$top=50');
    expect(path).not.toContain('$top=15');
  });

  it('does not inject $top for a by-id read (no top param)', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-get'), gc, { 'message-id': 'abc' });
    expect(calls()[0]).not.toContain('$top=');
  });

  it('does not inject a default $top when fetchAllPages is requested', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, { fetchAllPages: true });
    expect(calls()[0]).not.toContain('$top=15');
  });
});

describe('mail-message-list folder scoping (U3)', () => {
  it('lists across the mailbox when folder-id is omitted', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, {});
    expect(calls()[0]).toMatch(/^\/me\/messages/);
  });

  it('scopes to a folder when folder-id is given, without leaking it to the query', async () => {
    const { gc, calls } = makeGraphClient();
    await executeTool(findTool('mail-message-list'), gc, { 'folder-id': 'AAMkFolder' });
    const path = calls()[0];
    expect(path).toMatch(/^\/me\/mailFolders\/AAMkFolder\/messages/);
    expect(path).not.toContain('folder-id');
  });
});

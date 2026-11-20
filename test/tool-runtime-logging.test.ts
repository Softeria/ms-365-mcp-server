/**
 * Verifies that `executeTool` and `registerUtilityToolWithMcp` correctly
 * record tool call entries into the toolCallLog singleton for every status path.
 *
 * Pattern mirrors write-tools.test.ts + policy-manager.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphClient from '../src/graph-client.js';
import { executeTool } from '../src/tool-runtime.js';
import { ALL_TOOLS, type Tool } from '../src/tools/index.js';
import { Policy } from '../src/policy/index.js';
import { requestContext } from '../src/request-context.js';
import { toolCallLog } from '../src/admin/tool-call-log.ts';

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const findTool = (name: string) => ALL_TOOLS.find((t) => t.name === name) as Tool;

function makeGraphClient(responseText = '{"id":"me"}'): GraphClient {
  return {
    graphRequest: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: responseText }],
      isError: false,
    }),
  } as unknown as GraphClient;
}

beforeEach(() => {
  toolCallLog.clear();
  vi.clearAllMocks();
});

describe('executeTool logging — status: allowed', () => {
  it('records status=allowed for a successful tool call', async () => {
    const gc = makeGraphClient('{"id":"test-me"}');
    const tool = findTool('identity-get-me');

    await requestContext.run(
      { accessToken: 'at', userOid: 'oid', tenantId: 't', userPrincipalName: 'alice@example.com' },
      () => executeTool(tool, gc, {})
    );

    const snap = toolCallLog.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].toolName).toBe('identity-get-me');
    expect(snap[0].status).toBe('allowed');
    expect(snap[0].upn).toBe('alice@example.com');
    expect(snap[0].errorText).toBeNull();
    expect(snap[0].responseExcerpt).toContain('test-me');
    expect(snap[0].latencyMs).toBeGreaterThanOrEqual(0);
    expect(snap[0].id).toBeTruthy();
    expect(snap[0].ts).toBeGreaterThan(0);
  });

  it('records upn=null when no request context is present', async () => {
    const gc = makeGraphClient();
    const tool = findTool('identity-get-me');

    // Call outside requestContext.run — simulates utility/pre-auth path.
    await executeTool(tool, gc, {});

    const snap = toolCallLog.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].upn).toBeNull();
    expect(snap[0].status).toBe('allowed');
  });
});

describe('executeTool logging — status: denied_by_policy', () => {
  it('records status=denied_by_policy when the policy check fails', async () => {
    const gc = makeGraphClient();
    const tool = findTool('identity-get-me');

    const denyAll = Policy.fromDocument({ defaults: { allow: [] } });

    await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'blocked@example.com',
      },
      () => executeTool(tool, gc, {}, denyAll)
    );

    const snap = toolCallLog.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].status).toBe('denied_by_policy');
    expect(snap[0].upn).toBe('blocked@example.com');
    expect(snap[0].toolName).toBe('identity-get-me');
    expect(snap[0].errorText).toMatch(/Policy denied/);
    expect(snap[0].responseExcerpt).toBeNull();
    // Graph client must NOT have been called.
    expect(
      (gc as unknown as { graphRequest: ReturnType<typeof vi.fn> }).graphRequest
    ).not.toHaveBeenCalled();
  });
});

describe('executeTool logging — status: precondition_failed', () => {
  it('records status=precondition_failed when precondition throws', async () => {
    // mail-message-update has an isDraft precondition (probed via makeRequest).
    const gc = {
      makeRequest: vi.fn().mockResolvedValue({ isDraft: false }),
    } as unknown as GraphClient;

    const tool = findTool('mail-message-update');

    await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'user@example.com',
      },
      () =>
        executeTool(tool, gc, {
          'message-id': 'msg-1',
          body: { isRead: true },
        })
    );

    const snap = toolCallLog.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].status).toBe('precondition_failed');
    expect(snap[0].upn).toBe('user@example.com');
    expect(snap[0].errorText).toMatch(/not a draft/i);
    expect(snap[0].responseExcerpt).toBeNull();
  });
});

describe('executeTool logging — status: graph_error (outer catch)', () => {
  it('records status=graph_error when the Graph request throws', async () => {
    const gc = {
      graphRequest: vi.fn().mockRejectedValue(new Error('Network timeout')),
    } as unknown as GraphClient;

    const tool = findTool('identity-get-me');

    const result = await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'user@example.com',
      },
      () => executeTool(tool, gc, {})
    );

    expect(result.isError).toBe(true);

    const snap = toolCallLog.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].status).toBe('graph_error');
    expect(snap[0].upn).toBe('user@example.com');
    expect(snap[0].errorText).toMatch(/Network timeout/);
    expect(snap[0].responseExcerpt).toBeNull();
  });

  it('records status=graph_error when the Graph response has isError=true', async () => {
    const gc = {
      graphRequest: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"error":{"code":"ItemNotFound"}}' }],
        isError: true,
      }),
    } as unknown as GraphClient;

    const tool = findTool('identity-get-me');

    const result = await requestContext.run(
      {
        accessToken: 'at',
        userOid: 'oid',
        tenantId: 't',
        userPrincipalName: 'user@example.com',
      },
      () => executeTool(tool, gc, {})
    );

    expect(result.isError).toBe(true);

    const snap = toolCallLog.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].status).toBe('graph_error');
    expect(snap[0].errorText).toContain('ItemNotFound');
    expect(snap[0].responseExcerpt).toBeNull();
  });
});

describe('executeTool logging — argsExcerpt redaction', () => {
  it('does not log raw token values in argsExcerpt', async () => {
    const gc = makeGraphClient();
    const tool = findTool('identity-get-me');

    await requestContext.run(
      { accessToken: 'at', userOid: 'oid', tenantId: 't', userPrincipalName: 'u@example.com' },
      () =>
        executeTool(tool, gc, {
          // identity-get-me has no params so these won't be in the Graph call,
          // but the tool receives them as raw params
          access_token: 'supersecret',
        })
    );

    const snap = toolCallLog.snapshot();
    expect(snap[0].argsExcerpt).not.toContain('supersecret');
    expect(snap[0].argsExcerpt).toContain('[REDACTED]');
  });
});

describe('executeTool logging — multiple calls accumulate', () => {
  it('records one entry per tool call', async () => {
    const gc = makeGraphClient();

    await requestContext.run(
      { accessToken: 'at', userOid: 'oid', tenantId: 't', userPrincipalName: 'u@example.com' },
      async () => {
        await executeTool(findTool('identity-get-me'), gc, {});
        await executeTool(findTool('identity-get-me'), gc, {});
        await executeTool(findTool('identity-get-me'), gc, {});
      }
    );

    expect(toolCallLog.snapshot()).toHaveLength(3);
  });
});

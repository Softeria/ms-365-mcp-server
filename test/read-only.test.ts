import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseArgs } from '../src/cli.js';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/cli.js', () => {
  const parseArgsMock = vi.fn();
  return {
    parseArgs: parseArgsMock,
  };
});

vi.mock('../src/generated/client.js', () => {
  return {
    api: {
      endpoints: [
        {
          alias: 'list-mail-messages',
          method: 'get',
          path: '/me/messages',
          parameters: [],
        },
        {
          alias: 'send-mail',
          method: 'post',
          path: '/me/sendMail',
          parameters: [],
        },
        {
          alias: 'delete-mail-message',
          method: 'delete',
          path: '/me/messages/{message-id}',
          parameters: [],
        },
        {
          alias: 'get-schedule',
          method: 'post',
          path: '/me/calendar/getSchedule',
          parameters: [],
        },
        {
          alias: 'update-mail-folder',
          method: 'patch',
          path: '/me/mailFolders/{mailFolder-id}',
          parameters: [],
        },
      ],
    },
  };
});

vi.mock('../src/logger.js', () => {
  return {
    default: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('Read-Only Mode', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    delete process.env.READ_ONLY;

    mockServer = {
      tool: vi.fn(),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should respect --read-only flag from CLI', () => {
    vi.mocked(parseArgs).mockReturnValue({ readOnly: true } as ReturnType<typeof parseArgs>);

    const options = parseArgs();
    expect(options.readOnly).toBe(true);

    registerGraphTools(mockServer, {} as GraphClient, options.readOnly);

    // 1 GET endpoint + download-bytes utility tool (parse-teams-url removed — Teams out of scope)
    expect(mockServer.tool).toHaveBeenCalledTimes(2);

    const toolCalls = mockServer.tool.mock.calls.map((call: unknown[]) => call[0]);
    expect(toolCalls).toContain('list-mail-messages');
    expect(toolCalls).not.toContain('send-mail');
    expect(toolCalls).not.toContain('delete-mail-message');
  });

  it('should register all endpoints when not in read-only mode', () => {
    vi.mocked(parseArgs).mockReturnValue({ readOnly: false } as ReturnType<typeof parseArgs>);

    const options = parseArgs();
    expect(options.readOnly).toBe(false);

    registerGraphTools(mockServer, {} as GraphClient, options.readOnly);

    // 5 mocked endpoints + download-bytes utility tool (parse-teams-url removed — Teams out of scope)
    expect(mockServer.tool).toHaveBeenCalledTimes(6);

    const toolCalls = mockServer.tool.mock.calls.map((call: unknown[]) => call[0]);
    expect(toolCalls).toContain('list-mail-messages');
    expect(toolCalls).toContain('send-mail');
    expect(toolCalls).toContain('delete-mail-message');
    expect(toolCalls).toContain('update-mail-folder');
  });

  // Enabi fork: get-schedule (and other read-only POST endpoints) were removed
  // from src/endpoints.json — there are no read-only POST endpoints left in
  // Enabi's mail/calendar/contacts scope. The registration logic that handles
  // them still exists in graph-tools.ts, but it is unreachable from this
  // codebase. Re-enable this test if a read-only POST is ever re-added.
  it.skip('should allow POST endpoints with readOnly: true in endpoints.json in read-only mode', () => {
    // get-schedule is a POST endpoint with "readOnly": true in endpoints.json,
    // but it only has workScopes so orgMode must be enabled for it to be considered.
    const readOnly = true;
    const enabledToolsPattern = undefined;
    const orgMode = true;

    registerGraphTools(mockServer, {} as GraphClient, readOnly, enabledToolsPattern, orgMode);

    const toolCalls = mockServer.tool.mock.calls.map((call: unknown[]) => call[0]);

    // GET endpoint should be registered
    expect(toolCalls).toContain('list-mail-messages');
    // POST endpoint with readOnly: true should be registered
    expect(toolCalls).toContain('get-schedule');
    // Regular POST endpoint (no readOnly flag) should still be skipped
    expect(toolCalls).not.toContain('send-mail');
    // DELETE endpoint should still be skipped
    expect(toolCalls).not.toContain('delete-mail-message');
    // PATCH endpoint should still be skipped (readOnly bypass is POST-only)
    expect(toolCalls).not.toContain('update-mail-folder');

    // 2 graph tools (list-mail-messages + get-schedule)
    expect(mockServer.tool).toHaveBeenCalledTimes(2);
  });

  it('should block PATCH and DELETE endpoints in read-only mode regardless of readOnly flag', () => {
    // The readOnly: true bypass in endpoints.json only applies to POST methods.
    // PATCH and DELETE must always be blocked in read-only mode.
    const readOnly = true;
    const enabledToolsPattern = undefined;
    const orgMode = true;

    registerGraphTools(mockServer, {} as GraphClient, readOnly, enabledToolsPattern, orgMode);

    const toolCalls = mockServer.tool.mock.calls.map((call: unknown[]) => call[0]);

    // PATCH is always blocked in read-only mode
    expect(toolCalls).not.toContain('update-mail-folder');
    // DELETE is always blocked in read-only mode
    expect(toolCalls).not.toContain('delete-mail-message');
  });
});

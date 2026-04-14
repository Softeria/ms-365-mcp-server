import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGraphTools } from '../src/graph-tools.js';
import type { GraphClient } from '../src/graph-client.js';
import { READ_ONLY_POLICY } from '../src/security/write-policy.js';

vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      { alias: 'list-mail-messages', method: 'get', path: '/me/messages', parameters: [] },
      { alias: 'send-mail', method: 'post', path: '/me/sendMail', parameters: [] },
      { alias: 'delete-mail-message', method: 'delete', path: '/me/messages/{id}', parameters: [] },
      { alias: 'list-calendar-events', method: 'get', path: '/me/events', parameters: [] },
      { alias: 'create-calendar-event', method: 'post', path: '/me/events', parameters: [] },
      { alias: 'delete-calendar-event', method: 'delete', path: '/me/events/{id}', parameters: [] },
    ],
  },
}));

vi.mock('../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));

describe('gated tools (read-first write policy)', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockServer = { tool: vi.fn() };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function toolNames(): string[] {
    return mockServer.tool.mock.calls.map((c) => c[0] as string);
  }

  it('default (no flags, no writePolicy) registers GETs only', () => {
    registerGraphTools(mockServer, {} as GraphClient);
    expect(toolNames().sort()).toEqual(['list-calendar-events', 'list-mail-messages']);
  });

  it('--read-only blocks every non-GET, even if writePolicy would allow it', () => {
    registerGraphTools(
      mockServer,
      {} as GraphClient,
      true, // legacy readOnly
      undefined,
      false,
      undefined,
      false,
      [],
      { mail: true, calendar: true }
    );
    expect(toolNames()).not.toContain('send-mail');
    expect(toolNames()).not.toContain('create-calendar-event');
    expect(toolNames()).toContain('list-mail-messages');
    expect(toolNames()).toContain('list-calendar-events');
  });

  it('--enable-send unlocks mail writes but not calendar writes', () => {
    registerGraphTools(
      mockServer,
      {} as GraphClient,
      false,
      undefined,
      false,
      undefined,
      false,
      [],
      { mail: true, calendar: false }
    );
    const names = toolNames();
    expect(names).toContain('send-mail');
    expect(names).toContain('delete-mail-message');
    expect(names).not.toContain('create-calendar-event');
    expect(names).not.toContain('delete-calendar-event');
  });

  it('--enable-write unlocks calendar writes but not mail writes', () => {
    registerGraphTools(
      mockServer,
      {} as GraphClient,
      false,
      undefined,
      false,
      undefined,
      false,
      [],
      { mail: false, calendar: true }
    );
    const names = toolNames();
    expect(names).toContain('create-calendar-event');
    expect(names).toContain('delete-calendar-event');
    expect(names).not.toContain('send-mail');
    expect(names).not.toContain('delete-mail-message');
  });

  it('both --enable-send and --enable-write registers every tool', () => {
    registerGraphTools(
      mockServer,
      {} as GraphClient,
      false,
      undefined,
      false,
      undefined,
      false,
      [],
      { mail: true, calendar: true }
    );
    expect(toolNames()).toHaveLength(6);
  });

  it('passing READ_ONLY_POLICY explicitly matches the default', () => {
    registerGraphTools(
      mockServer,
      {} as GraphClient,
      false,
      undefined,
      false,
      undefined,
      false,
      [],
      READ_ONLY_POLICY
    );
    expect(toolNames().sort()).toEqual(['list-calendar-events', 'list-mail-messages']);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  McpSessionRegistry,
  type RegisterSessionInput,
} from '../src/lib/mcp-notifications/session-registry.js';

function makeSession(overrides: Partial<RegisterSessionInput> = {}): RegisterSessionInput {
  return {
    tenantId: 'tenant-a',
    sessionId: 'session-a',
    surface: 'discovery',
    server: {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
      sendPromptListChanged: vi.fn(),
      sendLoggingMessage: vi.fn(),
    },
    transport: { close: vi.fn() } as never,
    ...overrides,
  };
}

describe('McpSessionRegistry session lifecycle bounds', () => {
  it('stamps createdAt and lastSeenAt and updates lastSeenAt on touch', () => {
    let now = 1_000;
    const registry = new McpSessionRegistry({ now: () => now });

    const registered = registry.registerSession(makeSession());
    expect(registered.createdAt).toBe(1_000);
    expect(registered.lastSeenAt).toBe(1_000);

    now = 2_500;
    const touched = registry.touchSession('session-a');

    expect(touched?.createdAt).toBe(1_000);
    expect(touched?.lastSeenAt).toBe(2_500);
    expect(registry.getSession('session-a')?.lastSeenAt).toBe(2_500);
  });

  it('takes expired sessions without removing active sessions', () => {
    let now = 10_000;
    const registry = new McpSessionRegistry({ sessionTtlMs: 5_000, now: () => now });

    registry.registerSession(makeSession({ sessionId: 'old', lastSeenAt: 1_000 }));
    registry.registerSession(makeSession({ sessionId: 'active', lastSeenAt: 7_500 }));

    const expired = registry.takeExpiredSessions();

    expect(expired.map((session) => session.sessionId)).toEqual(['old']);
    expect(registry.getSession('old')).toBeUndefined();
    expect(registry.getSession('active')).toBeDefined();
  });

  it('keeps open SSE sessions alive during TTL cleanup', () => {
    const registry = new McpSessionRegistry({ sessionTtlMs: 5_000, now: () => 10_000 });

    registry.registerSession(
      makeSession({ sessionId: 'open-sse', activeSseStreams: 1, lastSeenAt: 1_000 })
    );

    const expired = registry.takeExpiredSessions();

    expect(expired).toEqual([]);
    expect(registry.getSession('open-sse')).toMatchObject({
      activeSseStreams: 1,
      lastSeenAt: 10_000,
    });
  });

  it('prunes and cleans expired sessions before notification delivery', async () => {
    const cleanup = vi.fn();
    const expiredServer = {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
      sendPromptListChanged: vi.fn(),
      sendLoggingMessage: vi.fn(),
    };
    const activeServer = {
      sendToolListChanged: vi.fn(),
      sendResourceListChanged: vi.fn(),
      sendResourceUpdated: vi.fn(),
      sendPromptListChanged: vi.fn(),
      sendLoggingMessage: vi.fn(),
    };
    const registry = new McpSessionRegistry({
      expiredSessionCleanup: cleanup,
      sessionTtlMs: 5_000,
      now: () => 10_000,
    });
    registry.registerSession(
      makeSession({ sessionId: 'expired-notify', lastSeenAt: 1_000, server: expiredServer })
    );
    registry.registerSession(
      makeSession({ sessionId: 'active-notify', lastSeenAt: 8_000, server: activeServer })
    );

    await registry.deliverToolsListChanged('tenant-a');

    expect(expiredServer.sendToolListChanged).not.toHaveBeenCalled();
    expect(activeServer.sendToolListChanged).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'expired-notify' }));
    expect(registry.getSession('expired-notify')).toBeUndefined();
  });

  it('tracks active SSE stream counts and touches activity on open and close', () => {
    let now = 10_000;
    const registry = new McpSessionRegistry({ now: () => now });
    registry.registerSession(makeSession({ sessionId: 'sse-session' }));

    registry.openSseStream('sse-session');
    registry.openSseStream('sse-session');
    expect(registry.getSession('sse-session')).toMatchObject({
      activeSseStreams: 2,
      lastSeenAt: 10_000,
    });

    now = 12_000;
    registry.closeSseStream('sse-session');
    registry.closeSseStream('sse-session');
    registry.closeSseStream('sse-session');

    expect(registry.getSession('sse-session')).toMatchObject({
      activeSseStreams: 0,
      lastSeenAt: 12_000,
    });
  });

  it('prefers inactive sessions when evicting overflow sessions', () => {
    const registry = new McpSessionRegistry({ maxSessions: 2, now: () => 10_000 });

    registry.registerSession(
      makeSession({ sessionId: 'open-old', activeSseStreams: 1, lastSeenAt: 1_000 })
    );
    registry.registerSession(makeSession({ sessionId: 'inactive-new', lastSeenAt: 9_000 }));
    registry.registerSession(makeSession({ sessionId: 'inactive-old', lastSeenAt: 5_000 }));

    const overflow = registry.takeOverflowSessions();

    expect(overflow.map((session) => session.sessionId)).toEqual(['inactive-old']);
    expect(registry.getSession('open-old')).toBeDefined();
  });

  it('takes overflow sessions from oldest lastSeenAt first', () => {
    const registry = new McpSessionRegistry({ maxSessions: 2, now: () => 10_000 });

    registry.registerSession(makeSession({ sessionId: 'newest', lastSeenAt: 9_000 }));
    registry.registerSession(makeSession({ sessionId: 'oldest', lastSeenAt: 1_000 }));
    registry.registerSession(makeSession({ sessionId: 'middle', lastSeenAt: 5_000 }));

    const overflow = registry.takeOverflowSessions();

    expect(overflow.map((session) => session.sessionId)).toEqual(['oldest']);
    expect(
      registry
        .listSessions()
        .map((session) => session.sessionId)
        .sort()
    ).toEqual(['middle', 'newest']);
  });
});

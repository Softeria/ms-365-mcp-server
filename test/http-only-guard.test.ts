import { describe, it, expect, vi } from 'vitest';
import MicrosoftGraphServer from '../src/server.js';
import type AuthManager from '../src/auth.js';

// Guards the PR 1 invariant that stdio mode has been removed. Without --http the
// server must refuse to start so a misconfiguration cannot silently fall back to
// a transport that PR 3's per-user session auth does not support.
describe('server HTTP-only guard', () => {
  const stubAuth = {
    isMultiAccount: vi.fn().mockResolvedValue(false),
    listAccounts: vi.fn().mockResolvedValue([]),
  } as unknown as AuthManager;

  it('throws when --http is not provided', async () => {
    const server = new MicrosoftGraphServer(stubAuth, {});
    await server.initialize('0.0.0');
    await expect(server.start()).rejects.toThrow(/only runs over HTTP/);
  });

  it('throws with a message that names the --http flag so the operator can act on it', async () => {
    const server = new MicrosoftGraphServer(stubAuth, {});
    await server.initialize('0.0.0');
    await expect(server.start()).rejects.toThrow(/--http/);
  });
});

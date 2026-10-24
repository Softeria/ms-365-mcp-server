import { afterEach, describe, expect, it, vi } from 'vitest';
import type AuthManager from '../src/auth.js';
import { registerAuthTools } from '../src/auth-tools.js';
import MicrosoftGraphServer from '../src/server.js';

const graphToolMocks = vi.hoisted(() => ({
  registerDiscoveryTools: vi.fn(),
  registerGraphTools: vi.fn(),
}));

vi.mock('../src/graph-tools.js', () => graphToolMocks);

vi.mock('../src/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  enableConsoleLogging: vi.fn(),
}));

const ALL = [
  'login',
  'logout',
  'verify-login',
  'list-accounts',
  'select-account',
  'remove-account',
];

function registeredNames(options?: { enabledTools?: string; readOnly?: boolean }): string[] {
  const names: string[] = [];
  const server = { tool: vi.fn((name: string) => names.push(name)) };
  registerAuthTools(server as never, {} as AuthManager, options);
  return names;
}

describe('registerAuthTools filtering', () => {
  it('registers every account tool by default', () => {
    expect(registeredNames()).toEqual(ALL);
  });

  it('applies --enabled-tools like it does to every other tool', () => {
    expect(registeredNames({ enabledTools: '^(get-mail-message)$' })).toEqual([]);
    expect(registeredNames({ enabledTools: '^(verify-login|list-accounts)$' })).toEqual([
      'verify-login',
      'list-accounts',
    ]);
  });

  it('drops the account tools that change state under --read-only', () => {
    expect(registeredNames({ readOnly: true })).toEqual(['verify-login', 'list-accounts']);
  });

  it('ignores an invalid --enabled-tools pattern, as the Graph tools do', () => {
    expect(registeredNames({ enabledTools: '(' })).toEqual(ALL);
  });
});

describe('account tools with MS365_MCP_OAUTH_TOKEN', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function toolNames(): string[] {
    const authManager = { isOAuthModeEnabled: () => true } as unknown as AuthManager;
    const server = new MicrosoftGraphServer(authManager, {});
    Object.assign(server, { graphClient: {}, version: 'test' });
    const mcp = (server as unknown as { createMcpServer: () => unknown }).createMcpServer() as {
      _registeredTools: Record<string, unknown>;
    };
    return Object.keys(mcp._registeredTools);
  }

  it('are not registered when the token comes from the environment', () => {
    vi.stubEnv('MS365_MCP_OAUTH_TOKEN', 'dummy');
    expect(toolNames()).toEqual([]);
  });

  it('are registered in stdio mode otherwise', () => {
    vi.stubEnv('MS365_MCP_OAUTH_TOKEN', undefined);
    expect(toolNames()).toEqual(ALL);
  });
});

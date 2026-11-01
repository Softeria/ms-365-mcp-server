import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { GraphClient } from '../src/graph-client.js';

vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/generated/client-beta.js', () => ({ api: { endpoints: [] } }));
vi.mock('../src/generated/client.js', () => ({
  api: {
    endpoints: [
      {
        alias: 'list-mail-messages',
        method: 'get',
        path: '/me/messages',
        description: 'List messages.',
        parameters: [],
      },
      {
        alias: 'send-mail',
        method: 'post',
        path: '/me/sendMail',
        description: 'Send mail.',
        parameters: [
          { name: 'body', type: 'Body', schema: z.object({ message: z.object({}).loose() }) },
        ],
      },
    ],
  },
}));

// A connector budget every surface overflows, and a fit that fails for one tool only.
vi.mock('../src/lib/body-schema-budget.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/body-schema-budget.js')>();
  return {
    ...actual,
    CONNECTOR_DEFINITION_BUDGET: 10,
    fitToolDefinitionToBudget: vi.fn(
      (...args: Parameters<typeof actual.fitToolDefinitionToBudget>) => {
        if (args[3]?.endsWith('|send-mail')) throw new Error('fit failed');
        return actual.fitToolDefinitionToBudget(...args);
      }
    ),
  };
});

describe('tool definition budget during registration', () => {
  let mockServer: { tool: ReturnType<typeof vi.fn>; registerTool: ReturnType<typeof vi.fn> };

  // The budget summary is logged once per surface per process, so each test gets a fresh
  // copy of the module (and of the mocked logger it writes to).
  async function register(options: { httpMode: boolean }) {
    vi.resetModules();
    const { registerGraphTools } = await import('../src/graph-tools.js');
    const { default: logger } = await import('../src/logger.js');
    const count = registerGraphTools(mockServer as never, {} as GraphClient, options);
    return { count, logger: vi.mocked(logger) };
  }

  beforeEach(() => {
    mockServer = { tool: vi.fn(), registerTool: vi.fn() };
  });

  it('fails only the tool whose schema cannot be fitted, not the whole registration', async () => {
    const { logger } = await register({ httpMode: false });

    const registered = mockServer.registerTool.mock.calls.map((c: unknown[]) => c[0]);
    expect(registered).toContain('list-mail-messages');
    expect(registered).not.toContain('send-mail');
    expect(logger.error).toHaveBeenCalledWith('Failed to register tool send-mail: fit failed');
  });

  it('does not warn about omitted tools over stdio, where every tool is served', async () => {
    const { logger } = await register({ httpMode: false });

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('silently omitted'));
  });

  it('warns about omitted tools in HTTP mode, where a hosted connector admits them', async () => {
    const { logger } = await register({ httpMode: true });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('silently omitted'));
  });
});

/**
 * Phase 7 Plan 07-07 — MCP prompt parser and renderer contract.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  loadPromptDirectory,
  parsePromptMarkdown,
  type PromptTemplateDefinition,
} from '../../src/lib/mcp-prompts/frontmatter.js';
import { registerMcpPrompts } from '../../src/lib/mcp-prompts/register.js';
import { renderPromptTemplate } from '../../src/lib/mcp-prompts/renderer.js';
import MicrosoftGraphServer from '../../src/server.js';
import {
  DISCOVERY_META_TOOL_NAMES,
  DISCOVERY_PRESET_VERSION,
} from '../../src/lib/tenant-surface/surface.js';

vi.mock('../../src/generated/client.js', () => ({
  api: {
    endpoints: [{ alias: 'me.sendMail', method: 'post', path: '/me/sendMail' }],
  },
}));

const VALID_PROMPT = `---
name: inbox-triage
description: Triage unread mail
arguments:
  - name: account
    description: Optional account hint
  - name: since
    description: Required lower bound
    required: true
---
Use {{account}} to triage mail since {{since}}.
`;

const TENANT_SKILL_PROMPT: PromptTemplateDefinition = {
  sourcePath: 'tenant-skills:11111111-1111-4111-8111-111111111111/custom_triage',
  name: 'custom_triage',
  description: 'Custom tenant prompt',
  arguments: [{ name: 'account', required: true }],
  template: 'Tenant skill for {{account}}',
};

const LOCKED_PROMPT_SPECS = {
  'inbox-triage': [
    { name: 'account', required: false },
    { name: 'since', required: false },
  ],
  'calendar-summary': [
    { name: 'account', required: false },
    { name: 'range', required: false },
  ],
  'teams-digest': [
    { name: 'team', required: false },
    { name: 'since', required: false },
  ],
  'permissions-audit': [],
  'onboard-tenant': [],
  'file-search-deep': [
    { name: 'query', required: true },
    { name: 'site', required: false },
  ],
  'meeting-prep': [
    { name: 'eventId', required: false },
    { name: 'attendeeFocus', required: false },
  ],
  'recent-activity': [{ name: 'userId', required: false }],
  'security-overview': [],
  'recipe-author': [],
} as const;

const LOCKED_PROMPT_NAMES = Object.keys(LOCKED_PROMPT_SPECS).sort();
const PROMPT_DIR = path.join(process.cwd(), 'src', 'prompts');
const REQUIRED_REAL_PROMPT_ARGS: Record<string, Record<string, string>> = {
  'file-search-deep': { query: 'quarterly planning documents' },
};
const PROMPT_TOOL_REFERENCES = [
  'search-tools',
  'get-tool-schema',
  'execute-tool',
  'bookmark-tool',
  'save-recipe',
] as const;

let tmpDirs: string[] = [];

interface ListPromptsResponse {
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{ name: string; required?: boolean }>;
  }>;
}

interface GetPromptResponse {
  messages: Array<{ role: string; content: { type: string; text: string } }>;
}

function makeTmpDir(): string {
  const dir = path.join(os.tmpdir(), `plan-07-07-prompts-${crypto.randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

function writePrompt(dir: string, fileName = 'inbox-triage.md'): void {
  fs.writeFileSync(path.join(dir, fileName), VALID_PROMPT);
}

async function invokePromptsList(server: McpServer): Promise<ListPromptsResponse> {
  const handler = (
    server.server as unknown as {
      _requestHandlers: Map<string, (req: unknown, extra: unknown) => ListPromptsResponse>;
    }
  )._requestHandlers.get('prompts/list');
  if (!handler) {
    throw new Error('prompts/list handler not registered on McpServer');
  }
  return handler(
    { method: 'prompts/list', params: {} },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  );
}

async function invokePromptGet(
  server: McpServer,
  name: string,
  args: Record<string, string>
): Promise<GetPromptResponse> {
  const handler = (
    server.server as unknown as {
      _requestHandlers: Map<string, (req: unknown, extra: unknown) => Promise<GetPromptResponse>>;
    }
  )._requestHandlers.get('prompts/get');
  if (!handler) {
    throw new Error('prompts/get handler not registered on McpServer');
  }
  return handler(
    { method: 'prompts/get', params: { name, arguments: args } },
    { requestId: 'test', sendNotification: vi.fn(), sendRequest: vi.fn() }
  );
}

function capabilitiesOf(server: McpServer): { prompts?: { listChanged?: boolean } } {
  return (
    server.server as unknown as {
      getCapabilities: () => { prompts?: { listChanged?: boolean } };
    }
  ).getCapabilities();
}

function createServerFactory(
  promptDeps: Parameters<typeof registerMcpPrompts>[1]
): MicrosoftGraphServer {
  return new MicrosoftGraphServer(
    {
      isMultiAccount: vi.fn(async () => false),
      listAccounts: vi.fn(async () => []),
    } as never,
    { http: true, orgMode: true },
    [],
    { promptDeps } as never
  );
}

function loadLockedPrompts(): PromptTemplateDefinition[] {
  return loadPromptDirectory(PROMPT_DIR);
}

function promptNames(prompts: readonly PromptTemplateDefinition[]): string[] {
  return prompts.map((prompt) => prompt.name).sort();
}

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

describe('Phase 7 Plan 07-07 — prompt frontmatter loader', () => {
  it('rejects prompt names outside the bounded MCP-safe pattern', () => {
    expect(() =>
      parsePromptMarkdown(`---
name: ../../escape
description: Bad prompt
arguments: []
---
Body`)
    ).toThrow(/name/i);

    expect(() =>
      parsePromptMarkdown(`---
name: ${'a'.repeat(65)}
description: Bad prompt
arguments: []
---
Body`)
    ).toThrow(/name/i);
  });

  it('requires name, description, and arguments frontmatter', () => {
    expect(() =>
      parsePromptMarkdown(`---
name: missing-description
arguments: []
---
Body`)
    ).toThrow(/description/i);

    expect(() =>
      parsePromptMarkdown(`---
name: missing-args
description: Missing arguments
---
Body`)
    ).toThrow(/arguments/i);
  });

  it('returns validated prompt metadata and the markdown template body', () => {
    const parsed = parsePromptMarkdown(VALID_PROMPT, 'inbox-triage.md');

    expect(parsed).toEqual({
      sourcePath: 'inbox-triage.md',
      name: 'inbox-triage',
      description: 'Triage unread mail',
      arguments: [
        { name: 'account', description: 'Optional account hint' },
        { name: 'since', description: 'Required lower bound', required: true },
      ],
      template: 'Use {{account}} to triage mail since {{since}}.\n',
    });
  });
});

describe('Phase 7 Plan 07-12 — locked workflow prompt content', () => {
  it('loads exactly the 10 locked SPEC prompt names from src/prompts', () => {
    expect(promptNames(loadLockedPrompts())).toEqual(LOCKED_PROMPT_NAMES);
  });

  it('pins each prompt frontmatter argument list to the SPEC contract', () => {
    const prompts = loadLockedPrompts();

    for (const prompt of prompts) {
      expect(prompt.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(prompt.name.length).toBeLessThanOrEqual(64);
      expect(prompt.description.trim().length).toBeGreaterThan(0);
      expect(
        prompt.arguments.map((arg) => ({ name: arg.name, required: arg.required === true }))
      ).toEqual(LOCKED_PROMPT_SPECS[prompt.name as keyof typeof LOCKED_PROMPT_SPECS]);
    }
  });

  it('keeps prompt bodies focused on discovery and memory meta tools, not embedded schemas', () => {
    for (const prompt of loadLockedPrompts()) {
      expect(
        PROMPT_TOOL_REFERENCES.some((toolName) => prompt.template.includes(toolName)),
        prompt.name
      ).toBe(true);
      expect(prompt.template).not.toMatch(/"?(?:inputSchema|properties|parameters)"?\s*:/);
      expect(prompt.template).not.toMatch(/\bz\.object\s*\(/);
    }
  });

  it('renders every locked prompt through prompts/get with required args supplied', async () => {
    const graphServer = createServerFactory({ promptDir: PROMPT_DIR });
    const mcp = graphServer.createMcpServer({
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    } as never);

    await expect(invokePromptsList(mcp)).resolves.toMatchObject({
      prompts: LOCKED_PROMPT_NAMES.map((name) => ({
        name,
      })),
    });

    for (const promptName of LOCKED_PROMPT_NAMES) {
      const result = await invokePromptGet(
        mcp,
        promptName,
        REQUIRED_REAL_PROMPT_ARGS[promptName] ?? {}
      );
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        role: 'user',
        content: { type: 'text' },
      });
      expect(result.messages[0].content.text).toContain('execute-tool');
      expect(result.messages[0].content.text).not.toContain('missing_required_argument');
    }
  });

  it('requires file-search-deep.query before prompts/get dispatches', async () => {
    const graphServer = createServerFactory({ promptDir: PROMPT_DIR });
    const mcp = graphServer.createMcpServer({
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    } as never);

    await expect(invokePromptGet(mcp, 'file-search-deep', {})).rejects.toThrow(/query/);
  });
});

describe('Phase 7 Plan 07-07 — MCP prompt registration', () => {
  it('registers prompt definitions from a supplied prompt directory or injected loader fixture', async () => {
    const promptDir = makeTmpDir();
    writePrompt(promptDir);

    const dirServer = new McpServer({ name: 'test', version: '0.0.0' });
    expect(registerMcpPrompts(dirServer, { promptDir })).toEqual({ registered: 1 });
    await expect(invokePromptsList(dirServer)).resolves.toMatchObject({
      prompts: [
        {
          name: 'inbox-triage',
          description: 'Triage unread mail',
        },
      ],
    });

    const fixtureServer = new McpServer({ name: 'test', version: '0.0.0' });
    const fixture = parsePromptMarkdown(VALID_PROMPT, 'fixture.md');
    expect(registerMcpPrompts(fixtureServer, { loadPrompts: () => [fixture] })).toEqual({
      registered: 1,
    });
    await expect(invokePromptsList(fixtureServer)).resolves.toMatchObject({
      prompts: [{ name: 'inbox-triage' }],
    });
  });

  it('prompts/get returns a user text message for a valid prompt', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerMcpPrompts(server, {
      loadPrompts: () => [parsePromptMarkdown(VALID_PROMPT, 'fixture.md')],
    });

    await expect(invokePromptGet(server, 'inbox-triage', { since: '2026-04-25' })).resolves.toEqual(
      {
        description: 'Triage unread mail',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Use  to triage mail since 2026-04-25.\n',
            },
          },
        ],
      }
    );
  });

  it('static tenant server has no prompt capability or prompt list handler', () => {
    const graphServer = createServerFactory({
      loadPrompts: () => [parsePromptMarkdown(VALID_PROMPT, 'fixture.md')],
    });
    const mcp = graphServer.createMcpServer({
      preset_version: 'essentials-v1',
      enabled_tools_set: Object.freeze(new Set(['me.sendMail'])),
    } as never);
    const handlers = (
      mcp.server as unknown as {
        _requestHandlers: Map<string, unknown>;
      }
    )._requestHandlers;

    expect(handlers.has('prompts/list')).toBe(false);
    expect(handlers.has('prompts/get')).toBe(false);
    expect(capabilitiesOf(mcp).prompts).toBeUndefined();
  });

  it('discovery tenant prompt capability uses prompts.listChanged true for editable skills', async () => {
    const graphServer = createServerFactory({
      loadPrompts: () => [parsePromptMarkdown(VALID_PROMPT, 'fixture.md')],
    });
    const mcp = graphServer.createMcpServer({
      preset_version: DISCOVERY_PRESET_VERSION,
      enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
    } as never);

    expect(capabilitiesOf(mcp).prompts).toEqual({ listChanged: true });
    await expect(invokePromptsList(mcp)).resolves.toMatchObject({
      prompts: [{ name: 'inbox-triage' }],
    });
  });

  it('discovery tenant server registers DB-backed skill prompts', async () => {
    const graphServer = createServerFactory({
      loadPrompts: () => [parsePromptMarkdown(VALID_PROMPT, 'fixture.md')],
    });
    const mcp = graphServer.createMcpServer(
      {
        preset_version: DISCOVERY_PRESET_VERSION,
        enabled_tools_set: DISCOVERY_META_TOOL_NAMES,
      } as never,
      [TENANT_SKILL_PROMPT]
    );

    await expect(invokePromptsList(mcp)).resolves.toMatchObject({
      prompts: expect.arrayContaining([
        expect.objectContaining({ name: 'custom_triage' }),
        expect.objectContaining({ name: 'inbox-triage' }),
      ]),
    });
    await expect(
      invokePromptGet(mcp, 'custom_triage', { account: '<img>' })
    ).resolves.toMatchObject({
      description: 'Custom tenant prompt',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'Tenant skill for &lt;img&gt;' },
        },
      ],
    });
  });
});

describe('Phase 7 Plan 07-07 — bounded prompt renderer', () => {
  it('substitutes identifier tokens with provided values', () => {
    const result = renderPromptTemplate(
      'Run {{tool_name}} for {{account}}.',
      { tool_name: 'me.sendMail', account: 'primary' },
      [{ name: 'tool_name', required: true }, { name: 'account' }]
    );

    expect(result).toEqual({
      ok: true,
      text: 'Run me.sendMail for primary.',
    });
  });

  it('renders missing optional args as empty strings and returns safe required-arg errors', () => {
    const optional = renderPromptTemplate('Account={{account}}.', {}, [{ name: 'account' }]);
    expect(optional).toEqual({ ok: true, text: 'Account=.' });

    const missingRequired = renderPromptTemplate('Query={{query}}.', {}, [
      { name: 'query', required: true },
    ]);
    expect(missingRequired).toEqual({
      ok: false,
      error: {
        code: 'missing_required_argument',
        message: 'Missing required prompt argument: query',
        argument: 'query',
      },
    });
  });

  it('does not execute arbitrary code or nested expressions', () => {
    const result = renderPromptTemplate(
      'Unsafe {{globalThis.process.exit()}} nested {{outer{{inner}}}} safe {{inner}}.',
      { inner: 'VALUE' },
      [{ name: 'inner' }]
    );

    expect(result).toEqual({
      ok: true,
      text: 'Unsafe {{globalThis.process.exit()}} nested {{outer{{inner}}}} safe VALUE.',
    });
  });
});

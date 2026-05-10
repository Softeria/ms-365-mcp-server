import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/mcp-completions/handlers.js', () => ({
  completeAccount: () => [],
  completeAlias: () => [],
  completeBookmark: () => [],
  completeFactScope: () => [],
  completeRecipeName: () => [],
  completeSkillName: () => [],
  completeTenantId: () => [],
}));

import { registerMcpPrompts } from '../src/lib/mcp-prompts/register.js';
import { skillRowToPrompt, visibleSkillWhereClause } from '../src/lib/mcp-skills/store.js';
import { publishPromptsListChanged } from '../src/lib/mcp-notifications/events.js';

interface RegisteredPrompt {
  options: { title?: string; description?: string; argsSchema?: Record<string, unknown> };
  handler: (args: Record<string, unknown>) => unknown;
}

function makePromptServer() {
  const prompts = new Map<string, RegisteredPrompt>();
  const capabilities: unknown[] = [];
  return {
    prompts,
    capabilities,
    server: {
      registerCapabilities: (capability: unknown) => capabilities.push(capability),
    },
    registerPrompt: (
      name: string,
      options: RegisteredPrompt['options'],
      handler: RegisteredPrompt['handler']
    ) => prompts.set(name, { options, handler }),
  };
}

const builtinPrompt = {
  sourcePath: '<builtin>',
  name: 'mail_triage',
  description: 'Built-in mail triage',
  arguments: [{ name: 'account', required: true, description: 'Account' }],
  template: 'Summarize mail for {{account}}',
};

const tenantSkill = skillRowToPrompt({
  id: 'skill-1',
  tenant_id: '11111111-1111-4111-8111-111111111111',
  owner_subject: null,
  name: 'custom_triage',
  title: 'Custom triage',
  description: 'Custom tenant prompt',
  frontmatter: {},
  body: 'Tenant skill for {{account}}',
  arguments: [{ name: 'account', required: true }],
  visibility: 'tenant',
  source: 'custom',
  source_skill_name: null,
  version: 1,
  enabled: true,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
});

describe('MCP prompt registration with skills', () => {
  it('keeps static prompt behavior listChanged=false without editable skills', () => {
    const server = makePromptServer();
    const result = registerMcpPrompts(server as never, { loadPrompts: () => [builtinPrompt] });

    expect(result).toEqual({ registered: 1 });
    expect(server.prompts.has('mail_triage')).toBe(true);
    expect(server.capabilities).toEqual([{ prompts: { listChanged: false } }]);
  });

  it('merges built-in prompts and DB-backed skills when editable skills are enabled', () => {
    const server = makePromptServer();
    const result = registerMcpPrompts(server as never, {
      loadPrompts: () => [builtinPrompt],
      loadSkillPrompts: () => [tenantSkill],
      enableEditableSkills: true,
    });

    expect(result).toEqual({ registered: 2 });
    expect(server.prompts.has('mail_triage')).toBe(true);
    expect(server.prompts.has('custom_triage')).toBe(true);
    expect(server.capabilities).toContainEqual({ prompts: { listChanged: true } });
  });

  it('renders DB skills through prompts/get with escaped substitutions', () => {
    const server = makePromptServer();
    registerMcpPrompts(server as never, {
      loadPrompts: () => [],
      loadSkillPrompts: () => [tenantSkill],
      enableEditableSkills: true,
    });

    const response = server.prompts.get('custom_triage')?.handler({ account: '<img>' });
    expect(response).toMatchObject({
      description: 'Custom tenant prompt',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: 'Tenant skill for &lt;img&gt;' },
        },
      ],
    });
  });

  it('uses tenant and owner predicates for visible skill queries', () => {
    expect(visibleSkillWhereClause(1, 'user-a')).toEqual({
      clause:
        "WHERE tenant_id = $1 AND enabled = true AND ((visibility IN ('tenant', 'admin', 'builtin-copy') AND owner_subject IS NULL) OR (visibility = 'user' AND owner_subject = $2))",
      params: ['user-a'],
    });
    expect(visibleSkillWhereClause(1)).toEqual({
      clause:
        "WHERE tenant_id = $1 AND enabled = true AND visibility IN ('tenant', 'admin', 'builtin-copy') AND owner_subject IS NULL",
      params: [],
    });
  });

  it('publishes prompts/list_changed events for skill mutations', async () => {
    const redis = { publish: vi.fn().mockResolvedValue(1) };
    await publishPromptsListChanged(redis, '11111111-1111-4111-8111-111111111111', 'skill.updated');
    expect(redis.publish).toHaveBeenCalledWith(
      'mcp:agentic-events',
      expect.stringContaining('"type":"prompts/list_changed"')
    );
  });
});

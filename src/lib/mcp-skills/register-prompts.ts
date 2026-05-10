import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import type { PromptTemplateDefinition } from '../mcp-prompts/frontmatter.js';
import { renderSkillTemplate } from './schema.js';

export interface SkillPromptDefinition extends PromptTemplateDefinition {
  readonly readOnly?: boolean;
}

export function builtinPromptToSkillPrompt(
  prompt: PromptTemplateDefinition
): SkillPromptDefinition {
  return { ...prompt, readOnly: true };
}

export function renderSkillPrompt(
  prompt: PromptTemplateDefinition,
  args: Record<string, unknown>
): GetPromptResult {
  const rendered = renderSkillTemplate(prompt.template, args, prompt.arguments);
  if (!rendered.ok) {
    return {
      description: prompt.description,
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: JSON.stringify({ error: rendered.error }, null, 2) },
        },
      ],
    };
  }
  return {
    description: prompt.description,
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: rendered.text },
      },
    ],
  };
}

export function mergeBuiltInAndSkillPrompts(
  builtIns: readonly PromptTemplateDefinition[],
  skills: readonly PromptTemplateDefinition[]
): PromptTemplateDefinition[] {
  const merged = new Map<string, PromptTemplateDefinition>();
  for (const prompt of builtIns) merged.set(prompt.name, builtinPromptToSkillPrompt(prompt));
  for (const skill of skills) merged.set(skill.name, skill);
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

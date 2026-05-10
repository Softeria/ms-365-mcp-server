import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { completable } from '@modelcontextprotocol/sdk/server/completable.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  loadPromptDirectory,
  type PromptArgumentDefinition,
  type PromptTemplateDefinition,
} from './frontmatter.js';
import { renderPromptTemplate } from './renderer.js';
import { mergeBuiltInAndSkillPrompts, renderSkillPrompt } from '../mcp-skills/register-prompts.js';
import {
  completeAccount,
  completeAlias,
  completeBookmark,
  completeFactScope,
  completeRecipeName,
  completeSkillName,
  completeTenantId,
  type AccountCompletionAuthManager,
} from '../mcp-completions/handlers.js';

const DEFAULT_PROMPT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'prompts'
);

export interface RegisterMcpPromptsDeps {
  readonly promptDir?: string;
  readonly loadPrompts?: () => readonly PromptTemplateDefinition[];
  readonly loadSkillPrompts?: () => readonly PromptTemplateDefinition[];
  readonly enableEditableSkills?: boolean;
  readonly authManager?: AccountCompletionAuthManager;
}

export interface RegisterMcpPromptsResult {
  readonly registered: number;
}

function loadPromptDefinitions(deps: RegisterMcpPromptsDeps): PromptTemplateDefinition[] {
  const builtIns = deps.loadPrompts
    ? [...deps.loadPrompts()]
    : loadPromptDirectory(deps.promptDir ?? DEFAULT_PROMPT_DIR);
  const definitions = deps.enableEditableSkills
    ? mergeBuiltInAndSkillPrompts(builtIns, deps.loadSkillPrompts?.() ?? [])
    : builtIns;
  return definitions.sort((a, b) => a.name.localeCompare(b.name));
}

function assertUniquePromptNames(prompts: readonly PromptTemplateDefinition[]): void {
  const seen = new Set<string>();
  for (const prompt of prompts) {
    if (seen.has(prompt.name)) {
      throw new Error(`Duplicate MCP prompt name: ${prompt.name}`);
    }
    seen.add(prompt.name);
  }
}

function promptArgsSchema(
  args: readonly PromptArgumentDefinition[],
  deps: RegisterMcpPromptsDeps
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const arg of args) {
    let schema: z.ZodTypeAny = z
      .string()
      .describe(arg.description ?? `Prompt argument ${arg.name}`);
    const complete =
      arg.name === 'tenantId'
        ? completeTenantId
        : arg.name === 'account'
          ? (value: string) => completeAccount(value, { authManager: deps.authManager })
          : arg.name === 'alias'
            ? (value: string) => completeAlias(value)
            : arg.name === 'skill' || arg.name === 'skillName'
              ? (value: string) => completeSkillName(value)
              : arg.name === 'recipe' || arg.name === 'recipeName'
                ? (value: string) => completeRecipeName(value)
                : arg.name === 'bookmark' ||
                    arg.name === 'bookmarkLabel' ||
                    arg.name === 'bookmarkAlias'
                  ? (value: string) => completeBookmark(value)
                  : arg.name === 'factScope' || arg.name === 'scope'
                    ? (value: string) => completeFactScope(value)
                    : undefined;
    if (arg.required !== true) {
      schema = schema.optional();
    }
    if (complete) {
      schema = completable(schema, complete);
    }
    shape[arg.name] = schema;
  }
  return shape;
}

function validationErrorResult(
  prompt: PromptTemplateDefinition,
  error: Exclude<ReturnType<typeof renderPromptTemplate>, { ok: true }>['error']
): GetPromptResult {
  return {
    description: prompt.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: JSON.stringify({ error }, null, 2),
        },
      },
    ],
  };
}

export function registerMcpPrompts(
  server: McpServer,
  deps: RegisterMcpPromptsDeps = {}
): RegisterMcpPromptsResult {
  const prompts = loadPromptDefinitions(deps);
  if (prompts.length === 0) {
    return { registered: 0 };
  }

  assertUniquePromptNames(prompts);

  for (const prompt of prompts) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.name,
        description: prompt.description,
        argsSchema: promptArgsSchema(prompt.arguments, deps),
      },
      (args): GetPromptResult => {
        if (deps.enableEditableSkills && prompt.sourcePath.startsWith('tenant-skills:')) {
          return renderSkillPrompt(prompt, args as Record<string, unknown>);
        }

        const rendered = renderPromptTemplate(
          prompt.template,
          args as Record<string, unknown>,
          prompt.arguments
        );
        if (!rendered.ok) {
          return validationErrorResult(prompt, rendered.error);
        }

        return {
          description: prompt.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: rendered.text,
              },
            },
          ],
        };
      }
    );
  }

  server.server.registerCapabilities({
    prompts: { listChanged: deps.enableEditableSkills === true },
  });

  return { registered: prompts.length };
}

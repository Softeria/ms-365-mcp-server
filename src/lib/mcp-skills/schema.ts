import { z } from 'zod';
import {
  PROMPT_ARGUMENT_NAME_PATTERN,
  PROMPT_NAME_PATTERN,
  type PromptArgumentDefinition,
} from '../mcp-prompts/frontmatter.js';

export const SkillNameZod = z.string().regex(PROMPT_NAME_PATTERN);
export const SkillTitleZod = z.string().trim().min(1).max(256);
export const SkillDescriptionZod = z.string().trim().min(1).max(2000);
export const SkillBodyZod = z.string().min(1).max(50_000);
export const SkillVisibilityZod = z.enum(['tenant', 'user', 'admin', 'builtin-copy']);
export const SkillSourceZod = z.enum(['builtin', 'fork', 'custom', 'import']);

export const SkillArgumentZod = z
  .object({
    name: z.string().regex(PROMPT_ARGUMENT_NAME_PATTERN),
    description: z.string().max(512).optional(),
    required: z.boolean().optional(),
  })
  .strict();

export const SkillFrontmatterZod = z
  .object({
    tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
    scopes: z.array(z.string().trim().min(1).max(256)).max(64).optional(),
    tools: z.array(z.string().trim().min(1).max(256)).max(64).optional(),
    resources: z.array(z.string().trim().min(1).max(512)).max(64).optional(),
    recipes: z.array(z.string().trim().min(1).max(256)).max(64).optional(),
    bookmarks: z.array(z.string().trim().min(1).max(256)).max(64).optional(),
    facts: z.array(z.string().trim().min(1).max(256)).max(64).optional(),
    risk: z.enum(['low', 'medium', 'high']).optional(),
  })
  .passthrough();

export const SkillInputZod = z
  .object({
    name: SkillNameZod,
    title: SkillTitleZod,
    description: SkillDescriptionZod,
    frontmatter: SkillFrontmatterZod.default({}),
    body: SkillBodyZod,
    arguments: z.array(SkillArgumentZod).max(32).default([]),
    visibility: SkillVisibilityZod.default('tenant'),
    source: SkillSourceZod.default('custom'),
    sourceSkillName: SkillNameZod.optional(),
    version: z.number().int().min(1).default(1),
    enabled: z.boolean().default(true),
  })
  .strict()
  .superRefine((skill, ctx) => {
    const seen = new Set<string>();
    skill.arguments.forEach((argument, index) => {
      if (seen.has(argument.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['arguments', index, 'name'],
          message: `Duplicate skill argument name: ${argument.name}`,
        });
      }
      seen.add(argument.name);
    });
  });

export const SkillTemplateArgsZod = z.record(z.union([z.string(), z.number(), z.boolean()]));

export type SkillArgument = z.infer<typeof SkillArgumentZod>;
export type SkillInput = z.infer<typeof SkillInputZod>;
export type SkillVisibility = z.infer<typeof SkillVisibilityZod>;
export type SkillSource = z.infer<typeof SkillSourceZod>;

export interface SkillRenderSuccess {
  readonly ok: true;
  readonly text: string;
}

export interface SkillRenderError {
  readonly ok: false;
  readonly error: {
    readonly code: 'missing_required_argument';
    readonly message: string;
    readonly argument: string;
  };
}

export type SkillRenderResult = SkillRenderSuccess | SkillRenderError;

const SKILL_TOKEN_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function escapeTemplateValue(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSkillTemplate(
  template: string,
  args: Record<string, unknown>,
  argSpec: readonly Pick<PromptArgumentDefinition, 'name' | 'required'>[]
): SkillRenderResult {
  const missingRequired = argSpec.find(
    (spec) => spec.required === true && (args[spec.name] === undefined || args[spec.name] === null)
  );
  if (missingRequired) {
    return {
      ok: false,
      error: {
        code: 'missing_required_argument',
        message: `Missing required skill argument: ${missingRequired.name}`,
        argument: missingRequired.name,
      },
    };
  }

  const knownArgs = new Set(argSpec.map((spec) => spec.name));
  const text = SkillBodyZod.parse(template).replace(SKILL_TOKEN_PATTERN, (raw, name: string) => {
    if (!knownArgs.has(name)) return raw;
    const value = args[name];
    return value === undefined || value === null ? '' : escapeTemplateValue(value);
  });
  return { ok: true, text };
}

import { z } from 'zod';
import { buildToolsRegistry } from '../../graph-tools.js';
import { classifyToolRisk } from '../safe-writes/classifier.js';
import { listBookmarks } from '../memory/bookmarks.js';
import { recallFacts } from '../memory/facts.js';
import { getRecipeByName } from '../memory/recipes.js';
import { parseMcpResourceUri, assertTenantResourceOwner } from '../mcp-resources/uri.js';
import { SkillInputZod, type SkillInput } from './schema.js';

export interface SkillValidationDeps {
  readonly tenantId: string;
  readonly enabledToolsSet?: ReadonlySet<string>;
  readonly readOnly?: boolean;
  readonly orgMode?: boolean;
}

export interface SkillValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly ref?: string;
}

export interface SkillValidationResult {
  readonly ok: boolean;
  readonly errors: SkillValidationIssue[];
  readonly warnings: SkillValidationIssue[];
  readonly highRiskTools: string[];
  readonly confirmationRequired: boolean;
}

const StringArrayZod = z.array(z.string());

function stringArray(value: unknown): string[] {
  return StringArrayZod.catch([]).parse(value);
}

function issue(code: string, message: string, ref?: string): SkillValidationIssue {
  return { code, message, ...(ref ? { ref } : {}) };
}

async function validateRecipeRefs(
  tenantId: string,
  refs: readonly string[]
): Promise<SkillValidationIssue[]> {
  const checks = await Promise.all(refs.map((name) => getRecipeByName(tenantId, name)));
  return refs.flatMap((ref, index) =>
    checks[index]
      ? []
      : [issue('recipe_not_visible', `Referenced recipe is not visible: ${ref}`, ref)]
  );
}

async function validateBookmarkRefs(
  tenantId: string,
  refs: readonly string[]
): Promise<SkillValidationIssue[]> {
  if (refs.length === 0) return [];
  const bookmarks = await listBookmarks(tenantId);
  return refs.flatMap((ref) => {
    const found = bookmarks.some(
      (bookmark) => bookmark.id === ref || bookmark.alias === ref || bookmark.label === ref
    );
    return found
      ? []
      : [issue('bookmark_not_visible', `Referenced bookmark is not visible: ${ref}`, ref)];
  });
}

async function validateFactRefs(
  tenantId: string,
  refs: readonly string[]
): Promise<SkillValidationIssue[]> {
  const checks = await Promise.all(refs.map((scope) => recallFacts(tenantId, { scope, limit: 1 })));
  return refs.flatMap((ref, index) =>
    checks[index].length > 0
      ? []
      : [issue('fact_not_visible', `Referenced fact scope is not visible: ${ref}`, ref)]
  );
}

function validateResourceRefs(tenantId: string, refs: readonly string[]): SkillValidationIssue[] {
  return refs.flatMap((ref) => {
    const parsed = assertTenantResourceOwner(parseMcpResourceUri(ref), tenantId);
    if (!parsed.ok) {
      return [issue(parsed.code, parsed.message, ref)];
    }
    return [];
  });
}

function validateToolRefs(
  skill: SkillInput,
  deps: SkillValidationDeps
): { errors: SkillValidationIssue[]; highRiskTools: string[] } {
  const registry = buildToolsRegistry(Boolean(deps.readOnly), Boolean(deps.orgMode));
  const toolRefs = stringArray(skill.frontmatter.tools);
  const errors: SkillValidationIssue[] = [];
  const highRiskTools: string[] = [];

  for (const alias of toolRefs) {
    const entry = registry.get(alias);
    if (!entry) {
      errors.push(issue('tool_not_found', `Referenced tool is not registered: ${alias}`, alias));
      continue;
    }
    if (deps.enabledToolsSet && !deps.enabledToolsSet.has(alias)) {
      errors.push(
        issue('tool_not_enabled', `Referenced tool is not enabled for caller: ${alias}`, alias)
      );
      continue;
    }

    const risk = classifyToolRisk({
      alias,
      method: entry.tool.method,
      path: entry.tool.path,
      readOnly: entry.config?.readOnly,
    });
    if (risk.riskLevel === 'high') {
      highRiskTools.push(alias);
    }
  }

  return { errors, highRiskTools };
}

export async function validateSkillReferences(
  input: unknown,
  deps: SkillValidationDeps
): Promise<{ skill?: SkillInput; validation: SkillValidationResult }> {
  const parsed = SkillInputZod.safeParse(input);
  if (!parsed.success) {
    return {
      validation: {
        ok: false,
        errors: parsed.error.issues.map((zodIssue) =>
          issue('invalid_skill', `${zodIssue.path.join('.') || 'skill'}: ${zodIssue.message}`)
        ),
        warnings: [],
        highRiskTools: [],
        confirmationRequired: false,
      },
    };
  }

  const skill = parsed.data;
  const toolResult = validateToolRefs(skill, deps);
  const [recipeErrors, bookmarkErrors, factErrors] = await Promise.all([
    validateRecipeRefs(deps.tenantId, stringArray(skill.frontmatter.recipes)),
    validateBookmarkRefs(deps.tenantId, stringArray(skill.frontmatter.bookmarks)),
    validateFactRefs(deps.tenantId, stringArray(skill.frontmatter.facts)),
  ]);
  const resourceErrors = validateResourceRefs(
    deps.tenantId,
    stringArray(skill.frontmatter.resources)
  );
  const errors = [
    ...toolResult.errors,
    ...recipeErrors,
    ...bookmarkErrors,
    ...factErrors,
    ...resourceErrors,
  ];
  const highRiskTools = [...new Set(toolResult.highRiskTools)].sort();

  return {
    skill,
    validation: {
      ok: errors.length === 0,
      errors,
      warnings: errors,
      highRiskTools,
      confirmationRequired: highRiskTools.length > 0,
    },
  };
}

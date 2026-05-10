import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import logger from '../../logger.js';
import type AuthManager from '../../auth.js';
import type GraphClient from '../../graph-client.js';
import { executeToolAlias } from '../../graph-tools.js';
import { getRequestOwnerSubject, getRequestTenant } from '../../request-context.js';
import type { RedisClient } from '../redis.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import { emitMcpLogEvent } from '../mcp-logging/register.js';
import { createMcpErrorEnvelope, createMcpResultEnvelope } from '../mcp-results/envelope.js';
import { MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA } from '../mcp-results/schemas.js';
import {
  RecipeAliasZod,
  RecipeNameZod,
  RecipeNoteZod,
  RecipeParamsZod,
  RecipeVisibilityZod,
  getRecipeByName,
  listRecipes,
  markRecipeRun,
  mergeRecipeParams,
  saveRecipe,
} from './recipes.js';

const RECIPE_CHANGE_REASON = 'recipe-change';

const SaveRecipeInputZod = z.object({
  name: RecipeNameZod.describe('Caller-friendly recipe name unique within this tenant.'),
  alias: RecipeAliasZod.describe('Exact Graph/product alias discovered by search-tools.'),
  params: RecipeParamsZod.describe('Known-good parameters to replay when this recipe runs.'),
  note: RecipeNoteZod.describe('Optional note describing when this recipe is useful.'),
  visibility: RecipeVisibilityZod.default('tenant').describe(
    'tenant shares with all callers; user keeps it private to the authenticated caller.'
  ),
});

const ListRecipesInputZod = z.object({
  filter: z.string().trim().min(1).max(512).optional().describe('Optional text filter.'),
});

const RunRecipeInputZod = z.object({
  name: RecipeNameZod.describe('Recipe name to run for this tenant.'),
  paramOverrides: RecipeParamsZod.optional().describe(
    'Optional parameters that override the saved recipe params for this run.'
  ),
});

export interface RecipeToolDeps {
  redis: RedisClient;
  graphClient: GraphClient;
  authManager?: AuthManager;
  readOnly?: boolean;
  orgMode?: boolean;
}

function jsonResult(value: Record<string, unknown>, isError = false, toolName = 'save-recipe') {
  if (isError) {
    const code = typeof value.error === 'string' ? value.error : 'recipe_tool_error';
    return {
      ...createMcpErrorEnvelope({
        toolName,
        summary: `Recipe operation failed: ${code}.`,
        code,
        message: code,
        data: value,
        nextActions: ['Check the supplied recipe arguments and retry.'],
      }),
      content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    };
  }
  return {
    ...createMcpResultEnvelope({
      toolName,
      summary: `Recipe operation completed for ${toolName}.`,
      data: value,
      nextActions: ['Use run-recipe or execute-tool for the next step.'],
    }),
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  };
}

function requireTenant():
  | {
      id: string;
    }
  | undefined {
  const tenant = getRequestTenant();
  if (!tenant.id) return undefined;
  return { id: tenant.id };
}

function ownerForVisibility(visibility: 'tenant' | 'user'): string | undefined {
  return visibility === 'user' ? getRequestOwnerSubject() : undefined;
}

async function publishRecipeChange(redis: RedisClient, tenantId: string): Promise<void> {
  try {
    await publishResourceUpdated(
      redis,
      tenantId,
      [`m365://tenant/${tenantId}/recipes.json`, `mcp://tenant/${tenantId}/recipes.json`],
      RECIPE_CHANGE_REASON
    );
  } catch (err) {
    logger.warn(
      { tenantId, err: (err as Error).message },
      'recipe-tools: publish recipe change failed; Redis notification skipped'
    );
  }
}

export function registerRecipeTools(server: McpServer, deps: RecipeToolDeps): void {
  server.tool(
    'save-recipe',
    'Save a reusable Microsoft Graph tool alias and parameter shape for this tenant.',
    {
      name: SaveRecipeInputZod.shape.name,
      alias: SaveRecipeInputZod.shape.alias,
      params: SaveRecipeInputZod.shape.params,
      note: SaveRecipeInputZod.shape.note,
      visibility: SaveRecipeInputZod.shape.visibility,
    },
    {
      title: 'save-recipe',
      readOnlyHint: false,
      openWorldHint: false,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'save-recipe');

      const parsed = SaveRecipeInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_recipe',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const ownerSubject = ownerForVisibility(parsed.data.visibility);
      if (parsed.data.visibility === 'user' && !ownerSubject) {
        return jsonResult({ error: 'owner_subject_required' }, true, 'save-recipe');
      }

      const recipeInput = {
        name: parsed.data.name,
        alias: parsed.data.alias,
        params: parsed.data.params,
        note: parsed.data.note,
      };
      const recipe = await saveRecipe(tenant.id, recipeInput, ownerSubject);
      await emitMcpLogEvent({
        tenantId: tenant.id,
        event: 'recipe.saved',
        level: 'info',
        data: {
          name: parsed.data.name,
          alias: parsed.data.alias,
        },
      });
      await publishRecipeChange(deps.redis, tenant.id);
      return jsonResult({ recipe }, false, 'save-recipe');
    }
  );

  server.tool(
    'list-recipes',
    'List saved workflow recipes for this tenant.',
    {
      filter: ListRecipesInputZod.shape.filter,
    },
    {
      title: 'list-recipes',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'save-recipe');

      const parsed = ListRecipesInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_recipe_filter',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const recipes = await listRecipes(tenant.id, parsed.data.filter, getRequestOwnerSubject());
      return jsonResult({ recipes }, false, 'list-recipes');
    }
  );

  server.tool(
    'run-recipe',
    'Run a saved recipe through the same guarded dispatch path as execute-tool.',
    {
      name: RunRecipeInputZod.shape.name,
      paramOverrides: RunRecipeInputZod.shape.paramOverrides,
    },
    {
      title: 'run-recipe',
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'save-recipe');

      const parsed = RunRecipeInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_recipe_run',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const recipe = await getRecipeByName(tenant.id, parsed.data.name, getRequestOwnerSubject());
      if (!recipe) {
        return jsonResult({ error: 'recipe_not_found' }, true);
      }

      const merged = mergeRecipeParams(recipe.params, parsed.data.paramOverrides ?? {});
      const result = await executeToolAlias({
        toolName: recipe.alias,
        parameters: merged,
        graphClient: deps.graphClient,
        authManager: deps.authManager,
        readOnly: deps.readOnly ?? false,
        orgMode: deps.orgMode ?? false,
      });

      if (!result.isError && result.structuredContent === undefined) {
        result.structuredContent = {
          summary: `Recipe ${recipe.name} ran ${recipe.alias}.`,
          data: { recipe: recipe.name, alias: recipe.alias, result: result.content[0]?.text },
          resources: [],
          nextActions: ['Review the recipe result and rerun with overrides if needed.'],
          warnings: [],
        };
      }

      if (!result.isError) {
        await markRecipeRun(tenant.id, recipe.name, recipe.ownerSubject);
        await publishRecipeChange(deps.redis, tenant.id);
      }

      return result;
    }
  );

  for (const name of ['list-recipes', 'run-recipe'] as const) {
    (
      server as unknown as {
        _registeredTools: Record<string, { update: (input: { outputSchema: never }) => void }>;
      }
    )._registeredTools[name]?.update({
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never,
    });
  }
}

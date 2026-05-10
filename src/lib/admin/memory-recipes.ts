import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import logger from '../../logger.js';
import type { AdminRouterDeps } from './router.js';
import { problemBadRequest, problemInternal, problemNotFound } from './problem-json.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import { RecipeInputZod, deleteRecipe, saveRecipe } from '../memory/recipes.js';

const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECIPE_CHANGE_REASON = 'recipe-change';

interface AdminContext {
  actor: string;
  source: 'entra' | 'api-key';
  tenantScoped: string | null;
}

type RequestWithAdmin = Request<any, any, any, any>;

const BulkRecipesZod = z.array(RecipeInputZod).min(1).max(100);
const RecipeIdZod = z.string().trim().min(1).max(512);

function canActOnTenant(admin: AdminContext, tenantId: string): boolean {
  if (admin.tenantScoped === null) return true;
  return admin.tenantScoped === tenantId;
}

async function publishRecipeChange(deps: Pick<AdminRouterDeps, 'redis'>, tenantId: string) {
  try {
    await publishResourceUpdated(
      deps.redis,
      tenantId,
      [`m365://tenant/${tenantId}/recipes.json`, `mcp://tenant/${tenantId}/recipes.json`],
      RECIPE_CHANGE_REASON
    );
  } catch (err) {
    logger.warn(
      { tenantId, err: (err as Error).message },
      'admin-memory-recipes: publish recipe change failed; Redis notification skipped'
    );
  }
}

export function createMemoryRecipeRoutes(deps: Pick<AdminRouterDeps, 'redis'>): Router {
  const r = Router();

  // POST /:id/recipes
  r.post('/:id/recipes', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    const id = req.params.id;
    if (!TENANT_GUID.test(id) || !canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    const parsed = BulkRecipesZod.safeParse(req.body);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((issue) => issue.message).join('; '), req.id);
      return;
    }

    try {
      const recipes = [];
      for (const input of parsed.data) {
        recipes.push(await saveRecipe(id, input));
      }
      await publishRecipeChange(deps, id);
      res.status(200).json({ recipes });
    } catch (err) {
      logger.error(
        { tenantId: id, err: (err as Error).message },
        'admin-memory-recipes: bulk upsert failed'
      );
      problemInternal(res, req.id);
    }
  });

  // DELETE /:id/recipes/:recipeId
  r.delete('/:id/recipes/:recipeId', async (req: RequestWithAdmin, res: Response) => {
    const admin = req.admin;
    if (!admin) {
      problemInternal(res, req.id);
      return;
    }

    const id = req.params.id;
    if (!TENANT_GUID.test(id) || !canActOnTenant(admin, id)) {
      problemNotFound(res, 'tenant', req.id);
      return;
    }

    const parsed = RecipeIdZod.safeParse(req.params.recipeId);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((issue) => issue.message).join('; '), req.id);
      return;
    }

    try {
      const result = await deleteRecipe(id, parsed.data);
      if (result.deleted) await publishRecipeChange(deps, id);
      res.status(200).json(result);
    } catch (err) {
      logger.error(
        { tenantId: id, err: (err as Error).message },
        'admin-memory-recipes: delete failed'
      );
      problemInternal(res, req.id);
    }
  });

  return r;
}

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import logger from '../../logger.js';
import type { AdminRouterDeps } from './router.js';
import { problemBadRequest, problemInternal, problemNotFound } from './problem-json.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import {
  FactScopeZod,
  InvalidFactCursorError,
  forgetFact,
  listFactsForAdmin,
} from '../memory/facts.js';

const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AdminContext {
  actor: string;
  source: 'entra' | 'api-key';
  tenantScoped: string | null;
}

type RequestWithAdmin = Request<any, any, any, any>;

const FactListQueryZod = z.object({
  scope: FactScopeZod.optional(),
  limit: z.preprocess(
    (value) => (typeof value === 'string' && value.length > 0 ? Number(value) : value),
    z.number().int().optional()
  ),
  cursor: z.string().trim().min(1).optional(),
});

const FactIdZod = z.string().trim().min(1).max(512);

function canActOnTenant(admin: AdminContext, tenantId: string): boolean {
  if (admin.tenantScoped === null) return true;
  return admin.tenantScoped === tenantId;
}

async function publishFactChange(deps: Pick<AdminRouterDeps, 'redis'>, tenantId: string) {
  try {
    await publishResourceUpdated(deps.redis, tenantId, [
      `m365://tenant/${tenantId}/facts.json`,
      `mcp://tenant/${tenantId}/facts.json`,
    ]);
  } catch (err) {
    logger.warn(
      { tenantId, err: (err as Error).message },
      'admin-memory-facts: publish facts.json update failed; Redis notification skipped'
    );
  }
}

export function createMemoryFactRoutes(deps: Pick<AdminRouterDeps, 'redis'>): Router {
  const r = Router();

  r.get('/:id/facts', async (req: RequestWithAdmin, res: Response) => {
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

    const parsed = FactListQueryZod.safeParse(req.query);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((issue) => issue.message).join('; '), req.id);
      return;
    }

    try {
      const result = await listFactsForAdmin(id, parsed.data);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof InvalidFactCursorError) {
        problemBadRequest(res, 'invalid_fact_cursor', req.id);
        return;
      }
      logger.error(
        { tenantId: id, err: (err as Error).message },
        'admin-memory-facts: list failed'
      );
      problemInternal(res, req.id);
    }
  });

  r.delete('/:id/facts/:factId', async (req: RequestWithAdmin, res: Response) => {
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

    const parsed = FactIdZod.safeParse(req.params.factId);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((issue) => issue.message).join('; '), req.id);
      return;
    }

    try {
      const result = await forgetFact(id, parsed.data);
      if (!result.deleted) {
        problemNotFound(res, 'fact', req.id);
        return;
      }

      await publishFactChange(deps, id);
      res.status(200).json(result);
    } catch (err) {
      logger.error(
        { tenantId: id, err: (err as Error).message },
        'admin-memory-facts: delete failed'
      );
      problemInternal(res, req.id);
    }
  });

  return r;
}

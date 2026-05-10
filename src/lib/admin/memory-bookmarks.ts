import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import logger from '../../logger.js';
import type { AdminRouterDeps } from './router.js';
import { problemBadRequest, problemInternal, problemNotFound } from './problem-json.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import { publishToolSelectionInvalidation } from '../tool-selection/tool-selection-invalidation.js';
import { BookmarkInputZod, deleteBookmark, upsertBookmark } from '../memory/bookmarks.js';

const TENANT_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOOKMARK_CHANGE_REASON = 'bookmark-change';

interface AdminContext {
  actor: string;
  source: 'entra' | 'api-key';
  tenantScoped: string | null;
}

type RequestWithAdmin = Request<any, any, any, any>;

const BulkBookmarksZod = z.array(BookmarkInputZod).min(1).max(100);
const BookmarkIdZod = z.string().trim().min(1).max(512);

function canActOnTenant(admin: AdminContext, tenantId: string): boolean {
  if (admin.tenantScoped === null) return true;
  return admin.tenantScoped === tenantId;
}

async function publishBookmarkChange(deps: Pick<AdminRouterDeps, 'redis'>, tenantId: string) {
  try {
    await publishToolSelectionInvalidation(deps.redis, tenantId, BOOKMARK_CHANGE_REASON);
    await publishResourceUpdated(
      deps.redis,
      tenantId,
      [`m365://tenant/${tenantId}/bookmarks.json`, `mcp://tenant/${tenantId}/bookmarks.json`],
      BOOKMARK_CHANGE_REASON
    );
  } catch (err) {
    logger.warn(
      { tenantId, err: (err as Error).message },
      'admin-memory-bookmarks: publish bookmark change failed; Redis notification skipped'
    );
  }
}

export function createMemoryBookmarkRoutes(deps: Pick<AdminRouterDeps, 'redis'>): Router {
  const r = Router();

  r.post('/:id/bookmarks', async (req: RequestWithAdmin, res: Response) => {
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

    const parsed = BulkBookmarksZod.safeParse(req.body);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((issue) => issue.message).join('; '), req.id);
      return;
    }

    try {
      const bookmarks = [];
      for (const input of parsed.data) {
        bookmarks.push(await upsertBookmark(id, input));
      }
      await publishBookmarkChange(deps, id);
      res.status(200).json({ bookmarks });
    } catch (err) {
      logger.error(
        { tenantId: id, err: (err as Error).message },
        'admin-memory-bookmarks: bulk upsert failed'
      );
      problemInternal(res, req.id);
    }
  });

  r.delete('/:id/bookmarks/:bookmarkId', async (req: RequestWithAdmin, res: Response) => {
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

    const parsed = BookmarkIdZod.safeParse(req.params.bookmarkId);
    if (!parsed.success) {
      problemBadRequest(res, parsed.error.issues.map((issue) => issue.message).join('; '), req.id);
      return;
    }

    try {
      const result = await deleteBookmark(id, parsed.data);
      if (result.ambiguous) {
        problemBadRequest(
          res,
          'Bookmark label is ambiguous; delete by bookmark id or alias.',
          req.id
        );
        return;
      }
      if (result.deleted) await publishBookmarkChange(deps, id);
      res.status(200).json(result);
    } catch (err) {
      logger.error(
        { tenantId: id, err: (err as Error).message },
        'admin-memory-bookmarks: delete failed'
      );
      problemInternal(res, req.id);
    }
  });

  return r;
}

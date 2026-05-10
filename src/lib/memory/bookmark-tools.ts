import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import logger from '../../logger.js';
import { getRequestTenant } from '../../request-context.js';
import type { RedisClient } from '../redis.js';
import { publishResourceUpdated } from '../mcp-notifications/events.js';
import { emitMcpLogEvent } from '../mcp-logging/register.js';
import { createMcpErrorEnvelope, createMcpResultEnvelope } from '../mcp-results/envelope.js';
import { MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA } from '../mcp-results/schemas.js';
import { publishToolSelectionInvalidation } from '../tool-selection/tool-selection-invalidation.js';
import {
  BookmarkAliasZod,
  BookmarkLabelZod,
  BookmarkNoteZod,
  deleteBookmark,
  listBookmarks,
  upsertBookmark,
} from './bookmarks.js';

const BOOKMARK_CHANGE_REASON = 'bookmark-change';

const BookmarkToolInputZod = z.object({
  alias: BookmarkAliasZod.describe('Exact Graph/product alias discovered by search-tools.'),
  label: BookmarkLabelZod.describe('Optional short label for this bookmark.'),
  note: BookmarkNoteZod.describe('Optional note describing when this alias works well.'),
});

const ListBookmarksInputZod = z.object({
  filter: z.string().trim().min(1).max(512).optional().describe('Optional text filter.'),
});

const UnbookmarkToolInputZod = z.object({
  label_or_alias: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .describe('Bookmark id, alias, or label to delete.'),
});

export interface BookmarkToolDeps {
  redis: RedisClient;
}

function jsonResult(value: unknown, isError = false, toolName = 'bookmark-tool') {
  if (isError) {
    const errorValue =
      typeof value === 'object' && value !== null ? (value as { error?: unknown }) : {};
    const code = typeof errorValue.error === 'string' ? errorValue.error : 'bookmark_tool_error';
    return {
      ...createMcpErrorEnvelope({
        toolName,
        summary: `Bookmark operation failed: ${code}.`,
        code,
        message: code,
        data: value,
        nextActions: ['Check the supplied bookmark arguments and retry.'],
      }),
      content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    };
  }
  return {
    ...createMcpResultEnvelope({
      toolName,
      summary: `Bookmark operation completed for ${toolName}.`,
      data: value,
      nextActions: ['Use search-tools or execute-tool with the saved alias as needed.'],
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

async function publishBookmarkChange(redis: RedisClient, tenantId: string): Promise<void> {
  try {
    await publishToolSelectionInvalidation(redis, tenantId, BOOKMARK_CHANGE_REASON);
    await publishResourceUpdated(
      redis,
      tenantId,
      [`m365://tenant/${tenantId}/bookmarks.json`, `mcp://tenant/${tenantId}/bookmarks.json`],
      BOOKMARK_CHANGE_REASON
    );
  } catch (err) {
    logger.warn(
      { tenantId, err: (err as Error).message },
      'bookmark-tools: publish bookmark change failed; Redis notification skipped'
    );
  }
}

export function registerBookmarkTools(server: McpServer, deps: BookmarkToolDeps): void {
  server
    .tool(
      'bookmark-tool',
      'Save a working Microsoft Graph tool alias for this tenant so future discovery searches rank it higher.',
      {
        alias: BookmarkToolInputZod.shape.alias,
        label: BookmarkToolInputZod.shape.label,
        note: BookmarkToolInputZod.shape.note,
      },
      {
        title: 'bookmark-tool',
        readOnlyHint: false,
        openWorldHint: false,
      },
      async (args) => {
        const tenant = requireTenant();
        if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'bookmark-tool');

        const parsed = BookmarkToolInputZod.safeParse(args);
        if (!parsed.success) {
          return jsonResult(
            {
              error: 'invalid_bookmark',
              details: parsed.error.issues.map((issue) => issue.message),
            },
            true
          );
        }

        const bookmark = await upsertBookmark(tenant.id, parsed.data);
        await emitMcpLogEvent({
          tenantId: tenant.id,
          event: 'bookmark.created',
          level: 'info',
          data: {
            alias: parsed.data.alias,
            hasLabel: Boolean(parsed.data.label),
          },
        });
        await publishBookmarkChange(deps.redis, tenant.id);
        return jsonResult(bookmark, false, 'bookmark-tool');
      }
    )
    .update({ outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never });

  server
    .tool(
      'list-bookmarks',
      'List saved tool aliases for this tenant.',
      {
        filter: ListBookmarksInputZod.shape.filter,
      },
      {
        title: 'list-bookmarks',
        readOnlyHint: true,
        openWorldHint: false,
      },
      async (args) => {
        const tenant = requireTenant();
        if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'list-bookmarks');

        const parsed = ListBookmarksInputZod.safeParse(args);
        if (!parsed.success) {
          return jsonResult(
            {
              error: 'invalid_bookmark_filter',
              details: parsed.error.issues.map((issue) => issue.message),
            },
            true,
            'list-bookmarks'
          );
        }

        const bookmarks = await listBookmarks(tenant.id, parsed.data.filter);
        return jsonResult({ bookmarks }, false, 'list-bookmarks');
      }
    )
    .update({ outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never });

  server.tool(
    'unbookmark-tool',
    'Remove a saved tool alias bookmark for this tenant.',
    {
      label_or_alias: UnbookmarkToolInputZod.shape.label_or_alias,
    },
    {
      title: 'unbookmark-tool',
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    async (args) => {
      const tenant = requireTenant();
      if (!tenant) return jsonResult({ error: 'tenant_required' }, true, 'bookmark-tool');

      const parsed = UnbookmarkToolInputZod.safeParse(args);
      if (!parsed.success) {
        return jsonResult(
          {
            error: 'invalid_unbookmark',
            details: parsed.error.issues.map((issue) => issue.message),
          },
          true
        );
      }

      const result = await deleteBookmark(tenant.id, parsed.data.label_or_alias);
      if (result.ambiguous) {
        return jsonResult(
          {
            error: 'ambiguous_bookmark_label',
            label: parsed.data.label_or_alias,
            tip: 'Use the bookmark id or exact alias to delete one row.',
          },
          true
        );
      }
      if (result.deleted) await publishBookmarkChange(deps.redis, tenant.id);
      return jsonResult(result, false, 'unbookmark-tool');
    }
  );

  for (const name of ['bookmark-tool', 'list-bookmarks'] as const) {
    (
      server as unknown as {
        _registeredTools: Record<string, { update: (input: { outputSchema: never }) => void }>;
      }
    )._registeredTools[name]?.update({
      outputSchema: MCP_STRUCTURED_CONTENT_OUTPUT_SCHEMA.shape as never,
    });
  }
}

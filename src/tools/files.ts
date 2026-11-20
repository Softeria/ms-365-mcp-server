import { z } from 'zod';
import { OData, type Tool } from './types.js';
import { driveItemDetail, driveItemSummary, listShape } from './shapes.js';

const itemIdParam: Tool['params'][number] = {
  name: 'item-id',
  location: 'query',
  schema: z
    .string()
    .describe('Optional OneDrive item id. Omit to address the drive root.')
    .optional(),
};

/**
 * v1 OneDrive surface, scoped to `/me/drive/...` (Files.Read). SharePoint and
 * other-user drives live in `sharepoint.ts` under the `sharepoint` toolset
 * (Sites.Read.All) — for SharePoint document libraries use the `sharepoint-*`
 * tools, not these.
 */
export const filesTools: readonly Tool[] = [
  {
    name: 'drive-children-list',
    description:
      "List child items (files and folders) in the signed-in user's OneDrive. Omit item-id for the drive root; pass a folder item-id to list inside that folder. For SharePoint document libraries, use the sharepoint-drive-children-list tool instead.",
    method: 'GET',
    path: '/me/drive/root/children',
    scopes: ['Files.Read'],
    projection: 'driveItem',
    shape: listShape(driveItemSummary),
    resolverParams: ['item-id'],
    pathResolver: (p) =>
      typeof p['item-id'] === 'string' && p['item-id'].length > 0
        ? `/me/drive/items/${encodeURIComponent(p['item-id'])}/children`
        : '/me/drive/root/children',
    params: [
      itemIdParam,
      OData.filter,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
      OData.count,
      OData.expand,
    ],
    llmTip:
      'Files vs folders: items with a `folder` facet are folders; items with a `file` facet are files. ' +
      "To fetch a file's bytes, call download-bytes with target `/me/drive/items/{item-id}/content`.",
  },
  {
    name: 'drive-item-get',
    description:
      'Get metadata for a OneDrive item (file or folder). Omit item-id for the drive root item; pass an item-id for a specific item. For SharePoint, use sharepoint-drive-item-get.',
    method: 'GET',
    path: '/me/drive/root',
    scopes: ['Files.Read'],
    projection: 'driveItem',
    shape: driveItemDetail,
    resolverParams: ['item-id'],
    pathResolver: (p) =>
      typeof p['item-id'] === 'string' && p['item-id'].length > 0
        ? `/me/drive/items/${encodeURIComponent(p['item-id'])}`
        : '/me/drive/root',
    params: [itemIdParam, OData.select, OData.expand],
  },
];

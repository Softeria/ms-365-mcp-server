import { z } from 'zod';
import type GraphClient from '../graph-client.js';
import { ToolRefusal, type Tool } from './types.js';
import { encodePathValue, requireSafePathSegment } from './graph-path.js';
import { driveItemDetail } from './shapes.js';

/**
 * OneDrive / SharePoint file writes. Delegated Files.ReadWrite.All reaches
 * every file the signed-in user can edit; these tools narrow what an agent can
 * do with it, in code:
 *
 * - one item per call — no bulk or recursive operations;
 * - new files and folders never overwrite: upload first checks the name is
 *   free, and both send `conflictBehavior=fail` for Graph to enforce too;
 * - content overwrites require the eTag the agent read: the server compares it
 *   to the item's current eTag and also sends `If-Match`, so a concurrent
 *   human edit is never silently clobbered;
 * - move and copy stay inside the source item's drive (both ends checked;
 *   shortcuts to other drives are refused). This bounds these tools only — an
 *   agent with download-bytes and drive-file-upload can still re-upload
 *   content it can read into any drive it can write;
 * - delete removes single files only — never folders, notebooks, or the root;
 * - no sharing-link or permission tools exist.
 *
 * Refusals throw ToolRefusal, which the runtime reports as precondition_failed.
 */

/** Simple-upload cap. Base64 in a tool argument; Graph upload sessions are not exposed. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Characters SharePoint/OneDrive reject in a file or folder name. */
const INVALID_NAME_CHARS = /["*:<>?/\\|]/;

function requireName(value: unknown): string {
  const name = typeof value === 'string' ? value : '';
  if (
    name.trim() === '' ||
    name !== name.trim() ||
    name.endsWith('.') ||
    INVALID_NAME_CHARS.test(name) ||
    name.length > 255
  ) {
    throw new ToolRefusal(
      `name ${JSON.stringify(name)} is not a valid file/folder name: no leading/trailing spaces, ` +
        'no trailing ".", none of " * : < > ? / \\ |, at most 255 characters.'
    );
  }
  return name;
}

/** Decode and size-check base64 file content. */
function requireContent(params: Record<string, unknown>): Buffer {
  const base64 = String(params['contentBytes'] ?? '').replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new ToolRefusal('contentBytes must be base64.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new ToolRefusal('contentBytes is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new ToolRefusal(`file is ${bytes.length} bytes; the limit is ${MAX_UPLOAD_BYTES}.`);
  }
  return bytes;
}

function contentTypeHeader(params: Record<string, unknown>): string {
  const contentType = params['contentType'];
  return typeof contentType === 'string' && contentType !== ''
    ? contentType
    : 'application/octet-stream';
}

/** `/drives/{drive-id}` when given, else the signed-in user's OneDrive. */
function driveBase(params: Record<string, unknown>): string {
  const driveId = params['drive-id'];
  return typeof driveId === 'string' && driveId !== ''
    ? `/drives/${requireSafePathSegment(driveId, 'drive-id')}`
    : '/me/drive';
}

function itemPath(params: Record<string, unknown>, key: string): string {
  return `${driveBase(params)}/items/${requireSafePathSegment(String(params[key] ?? ''), key)}`;
}

/** A folder to create in: `parent-id`, or the drive root when omitted. */
function parentPath(params: Record<string, unknown>): string {
  const parentId = params['parent-id'];
  return typeof parentId === 'string' && parentId !== ''
    ? itemPath(params, 'parent-id')
    : `${driveBase(params)}/root`;
}

interface ItemProbe {
  id?: string;
  name?: string;
  eTag?: string;
  folder?: unknown;
  package?: unknown;
  root?: unknown;
  remoteItem?: unknown;
  parentReference?: { driveId?: string };
}

async function probe(graphClient: GraphClient, path: string): Promise<ItemProbe> {
  return ((await graphClient.makeRequest(
    `${path}?$select=id,name,eTag,folder,package,root,remoteItem,parentReference`,
    { method: 'GET' }
  )) ?? {}) as ItemProbe;
}

const isPlainFile = (item: ItemProbe) =>
  !item.folder && !item.package && !item.root && !item.remoteItem;

/**
 * Move/copy guard: source and destination must be in the same drive, the
 * destination must be a folder, and neither may be the root or a shortcut
 * (`remoteItem`, whose content lives in another drive). Returns the shared
 * driveId and the destination's real id (the one checked — never the
 * caller's alias such as "root").
 */
async function assertSameDriveFolder(
  graphClient: GraphClient,
  params: Record<string, unknown>
): Promise<{ driveId: string; destinationId: string }> {
  const source = await probe(graphClient, itemPath(params, 'item-id'));
  const destination = await probe(graphClient, itemPath(params, 'destination-folder-id'));
  if (source.root) throw new ToolRefusal('the drive root cannot be moved or copied.');
  if (source.remoteItem || destination.remoteItem) {
    throw new ToolRefusal(
      'shortcuts to items in other drives cannot be moved, copied, or used as a destination.'
    );
  }
  if ((!destination.folder && !destination.root) || !destination.id) {
    throw new ToolRefusal(`destination ${destination.id ?? ''} is not a folder.`);
  }
  const sourceDrive = source.parentReference?.driveId;
  const destinationDrive = destination.parentReference?.driveId;
  if (!sourceDrive || sourceDrive !== destinationDrive) {
    throw new ToolRefusal(
      'source and destination must be in the same drive (document library or OneDrive); ' +
        'moving or copying across drives is not allowed.'
    );
  }
  return { driveId: sourceDrive, destinationId: destination.id };
}

/** Refuse unless `parentPath:/name:` does not exist yet (Graph also enforces conflictBehavior=fail). */
async function assertNameFree(graphClient: GraphClient, parent: string, name: string) {
  try {
    await graphClient.makeRequest(`${parent}:/${encodePathValue(name)}:?$select=id`, {
      method: 'GET',
    });
  } catch (err) {
    if (err instanceof Error && /\b404\b/.test(err.message)) return;
    throw err;
  }
  throw new ToolRefusal(
    `an item named ${JSON.stringify(name)} already exists there; use drive-file-update to change it.`
  );
}

const driveIdParam = {
  name: 'drive-id',
  location: 'query' as const,
  schema: z
    .string()
    .optional()
    .describe(
      "Drive id (driveId from sharepoint-search, sharepoint-drive-list, or an item get). Omit for the signed-in user's OneDrive."
    ),
};

const itemIdParam = {
  name: 'item-id',
  location: 'query' as const,
  schema: z.string().min(1).describe('Item id within the drive'),
};

const parentIdParam = {
  name: 'parent-id',
  location: 'query' as const,
  schema: z.string().optional().describe('Folder id to create in. Omit for the drive root.'),
};

const nameSchema = z.string().min(1).max(255);

const WRITE_SCOPES = ['Files.ReadWrite.All'];

export const driveWriteTools: readonly Tool[] = [
  {
    name: 'drive-file-upload',
    description:
      `Upload a NEW file (up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB) into a OneDrive or SharePoint folder. Never ` +
      'overwrites: if the name already exists the call is refused — use drive-file-update to change an ' +
      'existing file. Returns the new item (id, name, driveId, eTag, webUrl).',
    method: 'PUT',
    path: '/drives/{drive-id}/items/{parent-id}:/{name}:/content',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const name = requireName(params['name']);
      const bytes = requireContent(params);
      const parent = parentPath(params);
      await assertNameFree(graphClient, parent, name);
      return driveItemDetail(
        await graphClient.makeRequest(
          `${parent}:/${encodePathValue(name)}:/content?@microsoft.graph.conflictBehavior=fail`,
          { method: 'PUT', headers: { 'Content-Type': contentTypeHeader(params) }, body: bytes }
        )
      );
    },
    params: [
      driveIdParam,
      parentIdParam,
      {
        name: 'name',
        location: 'body',
        schema: nameSchema.describe('File name, e.g. "Q3 model.xlsx"'),
      },
      {
        name: 'contentBytes',
        location: 'body',
        schema: z.string().min(1).describe('File content, base64-encoded'),
      },
      {
        name: 'contentType',
        location: 'body',
        schema: z.string().optional().describe('MIME type, e.g. application/pdf'),
      },
    ],
  },
  {
    name: 'drive-file-update',
    description:
      `Replace an existing file's content (up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB). Requires the eTag from your ` +
      'most recent read of the item (drive-item-get / sharepoint-drive-item-get): if the file changed ' +
      'since, the call is refused and nothing is overwritten — re-read and retry. Libraries with ' +
      'versioning (the default) keep the previous version.',
    method: 'PUT',
    path: '/drives/{drive-id}/items/{item-id}/content',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const eTag = params['eTag'];
      if (typeof eTag !== 'string' || !/^"[^"*]+"$/.test(eTag)) {
        throw new ToolRefusal(
          'eTag must be the quoted eTag from your latest read of this item (e.g. "\\"{…},3\\""); "*" is not accepted.'
        );
      }
      const bytes = requireContent(params);
      const path = itemPath(params, 'item-id');
      const item = await probe(graphClient, path);
      if (!isPlainFile(item)) throw new ToolRefusal(`item ${item.id ?? ''} is not a file.`);
      if (item.eTag !== eTag) {
        throw new ToolRefusal(
          'the file changed since you read it (eTag mismatch); nothing was overwritten. Re-read it and retry.'
        );
      }
      return driveItemDetail(
        await graphClient.makeRequest(`${path}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': contentTypeHeader(params), 'If-Match': eTag },
          body: bytes,
        })
      );
    },
    params: [
      driveIdParam,
      itemIdParam,
      {
        name: 'eTag',
        location: 'header',
        schema: z.string().min(1).describe('eTag from your latest read of this item'),
      },
      {
        name: 'contentBytes',
        location: 'body',
        schema: z.string().min(1).describe('New file content, base64-encoded'),
      },
      {
        name: 'contentType',
        location: 'body',
        schema: z.string().optional().describe('MIME type, e.g. application/pdf'),
      },
    ],
  },
  {
    name: 'drive-folder-create',
    description:
      'Create a folder. Fails if an item with that name already exists in the parent. Returns the new folder (id, name, driveId, webUrl).',
    method: 'POST',
    path: '/drives/{drive-id}/items/{parent-id}/children',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const name = requireName(params['name']);
      return driveItemDetail(
        await graphClient.makeRequest(`${parentPath(params)}/children`, {
          method: 'POST',
          body: JSON.stringify({
            name,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          }),
        })
      );
    },
    params: [
      driveIdParam,
      parentIdParam,
      { name: 'name', location: 'body', schema: nameSchema.describe('Folder name') },
    ],
  },
  {
    name: 'drive-item-rename',
    description:
      'Rename a file or folder in place (same folder, same drive). Fails if the new name is taken. Returns the item.',
    method: 'PATCH',
    path: '/drives/{drive-id}/items/{item-id}',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const name = requireName(params['name']);
      return driveItemDetail(
        await graphClient.makeRequest(itemPath(params, 'item-id'), {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        })
      );
    },
    params: [
      driveIdParam,
      itemIdParam,
      {
        name: 'name',
        location: 'body',
        schema: nameSchema.describe('New name, including extension'),
      },
    ],
  },
  {
    name: 'drive-item-move',
    description:
      'Move a file or folder into another folder in the SAME drive (document library or OneDrive). ' +
      'Moves across drives are refused. To rename in place, use drive-item-rename. Returns the moved item.',
    method: 'PATCH',
    path: '/drives/{drive-id}/items/{item-id}',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const { destinationId } = await assertSameDriveFolder(graphClient, params);
      const newName = params['name'] === undefined ? undefined : requireName(params['name']);
      return driveItemDetail(
        await graphClient.makeRequest(itemPath(params, 'item-id'), {
          method: 'PATCH',
          body: JSON.stringify({
            parentReference: { id: destinationId },
            ...(newName ? { name: newName } : {}),
          }),
        })
      );
    },
    params: [
      driveIdParam,
      itemIdParam,
      {
        name: 'destination-folder-id',
        location: 'query',
        schema: z.string().min(1).describe('Folder id in the same drive'),
      },
      {
        name: 'name',
        location: 'body',
        schema: nameSchema.optional().describe('Optional new name for the moved item'),
      },
    ],
  },
  {
    name: 'drive-item-copy',
    description:
      'Copy a file or folder into a folder in the SAME drive. Copies across drives are refused. ' +
      'Graph copies asynchronously and a name clash fails the copy silently: the result is ' +
      '{ accepted: true }, so confirm the copy with drive-children-list / ' +
      'sharepoint-drive-children-list on the destination after a moment.',
    method: 'POST',
    path: '/drives/{drive-id}/items/{item-id}/copy',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const { driveId, destinationId } = await assertSameDriveFolder(graphClient, params);
      const newName = params['name'] === undefined ? undefined : requireName(params['name']);
      await graphClient.makeRequest(
        `${itemPath(params, 'item-id')}/copy?@microsoft.graph.conflictBehavior=fail`,
        {
          method: 'POST',
          body: JSON.stringify({
            parentReference: { driveId, id: destinationId },
            ...(newName ? { name: newName } : {}),
          }),
        }
      );
      return { accepted: true, destinationFolderId: destinationId, driveId };
    },
    params: [
      driveIdParam,
      itemIdParam,
      {
        name: 'destination-folder-id',
        location: 'query',
        schema: z.string().min(1).describe('Folder id in the same drive'),
      },
      {
        name: 'name',
        location: 'body',
        schema: nameSchema.optional().describe('Optional name for the copy'),
      },
    ],
  },
  {
    name: 'drive-file-delete',
    description:
      'Delete ONE file. It goes to the recycle bin (restorable for the tenant retention period, ' +
      '93 days by default). Folders, OneNote notebooks, shortcuts, and the drive root are refused — ' +
      'a single call can never remove a tree.',
    method: 'DELETE',
    path: '/drives/{drive-id}/items/{item-id}',
    scopes: WRITE_SCOPES,
    execute: async (graphClient, params) => {
      const path = itemPath(params, 'item-id');
      const item = await probe(graphClient, path);
      if (!isPlainFile(item)) {
        throw new ToolRefusal(
          `'${item.name ?? item.id ?? ''}' is a folder, notebook, or shortcut; this tool deletes single files only.`
        );
      }
      await graphClient.makeRequest(path, { method: 'DELETE' });
      return { deleted: true, id: item.id, name: item.name };
    },
    params: [driveIdParam, itemIdParam],
  },
];

/**
 * Mail folder display-name → folder-ID resolver.
 *
 * The Microsoft Graph API requires folder IDs (or well-known names like
 * "inbox") when addressing mail folders. Custom folders created by users
 * can only be addressed by their opaque AAM… ID.
 *
 * This module resolves human-readable display names to folder IDs,
 * with per-token caching to avoid redundant API calls.
 */

import GraphClient from './graph-client.js';
import logger from './logger.js';

/** Well-known folder names that Graph accepts directly as path segments. */
const WELL_KNOWN_FOLDERS: Record<string, string> = {
  inbox: 'inbox',
  sent: 'sentitems',
  'sent items': 'sentitems',
  sentitems: 'sentitems',
  drafts: 'drafts',
  deleted: 'deleteditems',
  'deleted items': 'deleteditems',
  deleteditems: 'deleteditems',
  junk: 'junkemail',
  'junk email': 'junkemail',
  junkemail: 'junkemail',
  archive: 'archive',
  outbox: 'outbox',
};

/** Graph API folder IDs start with "AAM" and are base64-like strings. */
function looksLikeFolderId(value: string): boolean {
  return /^AAM[A-Za-z0-9_+/=-]{20,}$/.test(value);
}

interface FolderEntry {
  id: string;
  displayName: string;
  childFolderCount: number;
}

// Cache keyed by access token hash (first 16 chars) to scope per-user.
const cache = new Map<string, Map<string, string>>();

function cacheKey(accessToken?: string): string {
  return accessToken ? accessToken.slice(-16) : '__default__';
}

async function fetchAllFolders(
  graphClient: GraphClient,
  accessToken?: string
): Promise<FolderEntry[]> {
  const options: { method: string; accessToken?: string } = { method: 'GET' };
  if (accessToken) options.accessToken = accessToken;

  const result = await graphClient.graphRequest('/me/mailFolders?$top=100', options);
  if (!result?.content?.[0]?.text) return [];

  let topLevel: FolderEntry[];
  try {
    const parsed = JSON.parse(result.content[0].text);
    topLevel = (parsed.value ?? []) as FolderEntry[];
  } catch {
    return [];
  }

  // Fetch child folders for parents that have children
  const allFolders = [...topLevel];
  for (const folder of topLevel) {
    if (folder.childFolderCount > 0) {
      try {
        const childResult = await graphClient.graphRequest(
          `/me/mailFolders/${folder.id}/childFolders?$top=100`,
          options
        );
        if (childResult?.content?.[0]?.text) {
          const childParsed = JSON.parse(childResult.content[0].text);
          allFolders.push(...((childParsed.value ?? []) as FolderEntry[]));
        }
      } catch (err) {
        logger.warn(`Failed to fetch child folders for ${folder.displayName}: ${err}`);
      }
    }
  }

  return allFolders;
}

function populateCache(
  key: string,
  folders: FolderEntry[]
): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const f of folders) {
    if (f.displayName && f.id) {
      mapping.set(f.displayName.toLowerCase(), f.id);
    }
  }
  cache.set(key, mapping);
  return mapping;
}

/**
 * Resolve a folder reference to a Graph API-usable value.
 *
 * Resolution order:
 * 1. If it already looks like a folder ID (AAM…) → return as-is
 * 2. Well-known folder names (inbox, sent, drafts, etc.) → return canonical name
 * 3. Cached display name → folder ID
 * 4. Fresh API fetch → folder ID
 * 5. Return original value (let Graph return a clear error)
 */
export async function resolveMailFolder(
  value: string,
  graphClient: GraphClient,
  accessToken?: string
): Promise<string> {
  // 1. Already a folder ID
  if (looksLikeFolderId(value)) {
    return value;
  }

  // 2. Well-known name
  const wellKnown = WELL_KNOWN_FOLDERS[value.toLowerCase()];
  if (wellKnown) {
    return wellKnown;
  }

  const key = cacheKey(accessToken);

  // 3. Check cache
  const cached = cache.get(key);
  if (cached) {
    const id = cached.get(value.toLowerCase());
    if (id) {
      logger.info(`Folder "${value}" resolved from cache → ${id.slice(0, 20)}…`);
      return id;
    }
  }

  // 4. Fetch and cache
  logger.info(`Folder "${value}" not cached, fetching all folders…`);
  const folders = await fetchAllFolders(graphClient, accessToken);
  const mapping = populateCache(key, folders);
  const id = mapping.get(value.toLowerCase());
  if (id) {
    logger.info(`Folder "${value}" resolved → ${id.slice(0, 20)}…`);
    return id;
  }

  // 5. Fallback — reject path traversal, otherwise pass through
  if (value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw new Error(`Folder "${value}" not found`);
  }

  logger.warn(`Folder "${value}" not found in mailbox, passing through as-is`);
  return value;
}

/** Clear cached folder mappings. */
export function invalidateFolderCache(accessToken?: string): void {
  if (accessToken) {
    cache.delete(cacheKey(accessToken));
  } else {
    cache.clear();
  }
}

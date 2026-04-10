/**
 * Download a drive item from Microsoft Graph and run text extraction.
 * Used by the `download-drive-file-text` MCP tool and other server-side callers.
 */
import logger from '../logger.js';
import type GraphClient from '../graph-client.js';
import type { GraphRequestOptions } from '../graph-client.js';
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_CHARS, extractDriveFileText } from './text-extraction.js';

interface DriveItemMetadata {
  name?: string;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
  '@microsoft.graph.downloadUrl'?: string;
}

export interface DownloadAndExtractDriveFileParams {
  graphClient: GraphClient;
  driveId: string;
  driveItemId: string;
  /** Passed through to GraphClient (multi-account / OAuth context). */
  graphOptions?: GraphRequestOptions;
  maxBytes?: number;
  maxChars?: number;
}

/**
 * Fetches item metadata, downloads bytes (prefer @microsoft.graph.downloadUrl), then extracts text.
 */
export async function downloadDriveFileAndExtractText(
  params: DownloadAndExtractDriveFileParams
): Promise<{
  text: string;
  truncated: boolean;
  extractor: string;
  sizeBytes: number;
  mimeType: string | undefined;
  fileName: string | undefined;
}> {
  const { graphClient, driveId, driveItemId, graphOptions, maxBytes, maxChars } = params;

  const metaPath = `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItemId)}`;
  const metadata = (await graphClient.makeRequest(
    metaPath,
    graphOptions ?? {}
  )) as DriveItemMetadata;

  if (metadata.folder) {
    throw new Error('Drive item is a folder, not a file. Pass a file item ID.');
  }

  const fileName = metadata.name;
  const mimeType = metadata.file?.mimeType;
  const downloadUrl = metadata['@microsoft.graph.downloadUrl'];

  let buffer: Uint8Array;

  if (downloadUrl) {
    logger.info('drive-item-text-extraction: fetching via @microsoft.graph.downloadUrl');
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(
        `Download URL request failed: ${res.status} ${res.statusText}. Try again or use Graph /content.`
      );
    }
    buffer = new Uint8Array(await res.arrayBuffer());
  } else {
    const contentPath = `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItemId)}/content`;
    logger.info('drive-item-text-extraction: fetching via /content');
    buffer = await graphClient.fetchBinary(contentPath, graphOptions ?? {});
  }

  return extractDriveFileText({
    buffer,
    mimeType,
    fileName,
    maxBytes: maxBytes ?? DEFAULT_MAX_BYTES,
    maxChars: maxChars ?? DEFAULT_MAX_CHARS,
  });
}

import type GraphClient from '../graph-client.js';
import type { DriveConflictBehavior } from './attachment-tickets.js';

/** Graph attaches up to 150 MB to a message or event. */
export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
/** Below this Graph takes the bytes inline as base64 contentBytes; at or above it needs an upload session. */
const INLINE_UPLOAD_LIMIT = 3 * 1024 * 1024;
/** Upload-session chunk: a multiple of 320 KiB, as Graph requires. */
const UPLOAD_CHUNK_BYTES = 320 * 1024 * 12;

interface UploadSessionResponse {
  uploadUrl?: string;
}

export interface AttachmentUpload {
  /** The `/attachments` collection of a draft message or an event. */
  target: string;
  name: string;
  contentType: string;
  /** Exact byte length of the source; a source that is longer or shorter fails the upload. */
  size: number;
  /**
   * Makes the attachment inline under this Content-ID, so the HTML body can show
   * it with <img src="cid:...">, e.g. a picture in an email signature.
   */
  contentId?: string;
  accessToken?: string;
}

/** Graph refused the upload because the folder already has a file with that name. */
export class DriveNameConflictError extends Error {}

/** An upload-session PUT answered with a status other than 200, 201 or 202. */
class ChunkStatusError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function putChunk(
  uploadUrl: string,
  chunk: Buffer,
  start: number,
  total: number
): Promise<Response> {
  const end = start + chunk.length - 1;
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(chunk.length),
      'Content-Range': `bytes ${start}-${end}/${total}`,
    },
    // A standalone ArrayBuffer: fetch's body typing wants a BufferSource, and a
    // Buffer view over a pooled slab is neither the right type nor the right bytes.
    body: chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer,
  });
  if (![200, 201, 202].includes(response.status)) {
    throw new ChunkStatusError(
      `Upload session chunk ${start}-${end} answered HTTP ${response.status}`,
      response.status
    );
  }
  return response;
}

/**
 * Stream `source` to a Graph upload session in fixed chunks, so no more than one
 * chunk is held in memory. Returns the response to the last chunk, which for a
 * drive session carries the created driveItem.
 */
async function streamToSession(
  uploadUrl: string,
  size: number,
  source: AsyncIterable<Buffer>
): Promise<Response | undefined> {
  let pending: Buffer[] = [];
  let pendingBytes = 0;
  let offset = 0;
  let last: Response | undefined;
  for await (const piece of source) {
    pending.push(piece);
    pendingBytes += piece.length;
    if (offset + pendingBytes > size) {
      throw new Error(`Source is longer than the declared ${size} bytes`);
    }
    while (pendingBytes >= UPLOAD_CHUNK_BYTES) {
      const joined = Buffer.concat(pending);
      const chunk = joined.subarray(0, UPLOAD_CHUNK_BYTES);
      last = await putChunk(uploadUrl, chunk, offset, size);
      offset += chunk.length;
      const rest = joined.subarray(UPLOAD_CHUNK_BYTES);
      pending = rest.length ? [Buffer.from(rest)] : [];
      pendingBytes = rest.length;
    }
  }
  if (pendingBytes > 0) {
    last = await putChunk(uploadUrl, Buffer.concat(pending), offset, size);
    offset += pendingBytes;
  }
  if (offset !== size) throw new Error(`Source ended before the declared ${size} bytes`);
  return last;
}

/**
 * Attach the bytes of `source` to `upload.target`. Small files are POSTed
 * inline; larger ones stream through a Graph upload session in fixed chunks, so
 * no more than one chunk of a large file is held in memory. Only the inline
 * POST answers with the attachment id.
 */
export async function uploadAttachment(
  graphClient: GraphClient,
  upload: AttachmentUpload,
  source: AsyncIterable<Buffer>
): Promise<{ id?: string }> {
  const { target, name, contentType, size, accessToken, contentId } = upload;
  const inline = contentId ? { isInline: true, contentId } : {};

  if (size < INLINE_UPLOAD_LIMIT) {
    const chunks: Buffer[] = [];
    let received = 0;
    for await (const chunk of source) {
      received += chunk.length;
      if (received > size) throw new Error(`Source is longer than the declared ${size} bytes`);
      chunks.push(chunk);
    }
    if (received !== size) throw new Error(`Source ended before the declared ${size} bytes`);
    const created = (await graphClient.makeRequest(target, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name,
        contentType,
        contentBytes: Buffer.concat(chunks).toString('base64'),
        ...inline,
      }),
    })) as { id?: string };
    return { id: created?.id };
  }

  const session = (await graphClient.makeRequest(`${target}/createUploadSession`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({
      AttachmentItem: { attachmentType: 'file', name, size, contentType, ...inline },
    }),
  })) as UploadSessionResponse;
  if (!session?.uploadUrl) throw new Error('Upload session returned no uploadUrl');

  await streamToSession(session.uploadUrl, size, source);
  return {};
}

export interface DriveUpload {
  /** The parent folder: a drive item path or a drive's root, e.g. /me/drive/root. */
  target: string;
  name: string;
  size: number;
  conflictBehavior: DriveConflictBehavior;
  accessToken?: string;
}

export interface DriveUploadResult {
  id?: string;
  name?: string;
  size?: number;
  webUrl?: string;
}

/**
 * Write the bytes of `source` as a file named `upload.name` in the `upload.target`
 * folder. Always through an upload session, whatever the size: the session takes the
 * conflict behaviour in its body (a simple PUT would silently replace an existing
 * file), and its last chunk answers with the new driveItem.
 */
export async function uploadToDrive(
  graphClient: GraphClient,
  upload: DriveUpload,
  source: AsyncIterable<Buffer>
): Promise<DriveUploadResult> {
  const { target, name, size, conflictBehavior, accessToken } = upload;
  let session: UploadSessionResponse;
  try {
    session = (await graphClient.makeRequest(
      `${target}:/${encodeURIComponent(name)}:/createUploadSession`,
      {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          item: { '@microsoft.graph.conflictBehavior': conflictBehavior, name },
        }),
      }
    )) as UploadSessionResponse;
  } catch (error) {
    // makeRequest throws a GraphApiError carrying httpStatus.
    if ((error as { httpStatus?: unknown }).httpStatus === 409) {
      throw new DriveNameConflictError((error as Error).message);
    }
    throw error;
  }
  if (!session?.uploadUrl) throw new Error('Upload session returned no uploadUrl');
  const uploadUrl = session.uploadUrl;

  let item: { id?: unknown; name?: unknown; size?: unknown; webUrl?: unknown } | undefined;
  try {
    const last = await streamToSession(uploadUrl, size, source);
    // 202 means Graph still waits for byte ranges; only 200/201 commit the file.
    if (!last || (last.status !== 200 && last.status !== 201)) {
      throw new Error(`Upload session did not complete (HTTP ${last?.status ?? 'none'})`);
    }
    item = (await last.json().catch(() => undefined)) as typeof item;
    if (typeof item?.id !== 'string') throw new Error('Upload session returned no driveItem');
  } catch (error) {
    // The ticket is spent and nothing can resume this session, so drop its fragments now
    // instead of leaving them until Graph expires the session.
    await fetch(uploadUrl, { method: 'DELETE' }).catch(() => undefined);
    if (error instanceof ChunkStatusError && error.status === 409) {
      throw new DriveNameConflictError(error.message);
    }
    throw error;
  }
  return {
    ...(typeof item?.id === 'string' && { id: item.id }),
    ...(typeof item?.name === 'string' && { name: item.name }),
    ...(typeof item?.size === 'number' && { size: item.size }),
    ...(typeof item?.webUrl === 'string' && { webUrl: item.webUrl }),
  };
}

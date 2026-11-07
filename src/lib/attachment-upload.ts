import type GraphClient from '../graph-client.js';

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

async function putChunk(
  uploadUrl: string,
  chunk: Buffer,
  start: number,
  total: number
): Promise<void> {
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
    throw new Error(`Upload session chunk ${start}-${end} answered HTTP ${response.status}`);
  }
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

  let pending: Buffer[] = [];
  let pendingBytes = 0;
  let offset = 0;
  for await (const piece of source) {
    pending.push(piece);
    pendingBytes += piece.length;
    if (offset + pendingBytes > size) {
      throw new Error(`Source is longer than the declared ${size} bytes`);
    }
    while (pendingBytes >= UPLOAD_CHUNK_BYTES) {
      const joined = Buffer.concat(pending);
      const chunk = joined.subarray(0, UPLOAD_CHUNK_BYTES);
      await putChunk(session.uploadUrl, chunk, offset, size);
      offset += chunk.length;
      const rest = joined.subarray(UPLOAD_CHUNK_BYTES);
      pending = rest.length ? [Buffer.from(rest)] : [];
      pendingBytes = rest.length;
    }
  }
  if (pendingBytes > 0) {
    await putChunk(session.uploadUrl, Buffer.concat(pending), offset, size);
    offset += pendingBytes;
  }
  if (offset !== size) throw new Error(`Source ended before the declared ${size} bytes`);
  return {};
}

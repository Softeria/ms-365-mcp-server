/**
 * Redemption route for server-minted attachment URLs.
 *
 * The URL a document-conversion sidecar fetches looks like:
 *
 *     GET /attachment?t=<ticket>&dgk=<key-id>&dgx=<expiry>&dgs=<signature>
 *
 * **This route ignores `dgk`/`dgx`/`dgs` entirely, and that is correct.** Those
 * three exist for the sidecar, which verifies them before it will dial a
 * private address at all; they are the sidecar's authorisation to *dial*, not
 * anyone's authorisation to *redeem*. What authorises redemption here is `t` --
 * a single-use, short-TTL capability this server minted and remembers. Checking
 * the signature here as well would buy nothing (the key is ours, so a valid
 * signature says only that we minted the URL, which the ticket already proves)
 * and would cost something real: it would couple redemption to the sidecar's
 * clock and to the key surviving a restart, turning two independent failures
 * into one.
 *
 * No Authorization header is required or read. The fetcher holds no Microsoft
 * credential -- that is the entire point of handing it a URL instead of bytes --
 * so the ticket is the only credential in play, and the response is streamed
 * with the identity the ticket was minted under: this server's own Graph token,
 * or the token of the request that minted it.
 */

import type { Handler, Request, Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import logger from './logger.js';
import type GraphClient from './graph-client.js';
import type AuthManager from './auth.js';
import {
  type AttachmentTicketStore,
  isPlainGraphPath,
  TICKET_PARAM,
} from './lib/attachment-tickets.js';

export interface AttachmentRouteDeps {
  store: AttachmentTicketStore;
  getGraphClient: () => GraphClient | null;
  authManager: AuthManager;
}

/**
 * One body for every refusal.
 *
 * Unknown id, already redeemed, expired and malformed all answer an identical
 * 404. A distinguishable response would confirm a guessed ticket id -- "this
 * one existed but is spent" is most of the way to knowing an id is real -- and
 * ticket ids are the whole capability.
 */
const NOT_FOUND_BODY = 'Not found';

/**
 * Re-emit an upstream `content-disposition` as an attachment carrying at most its filename.
 *
 * Always `attachment`: this serves untrusted bytes from a mailbox, and on the shared
 * listener it does so from the same origin as `/mcp`, where a browser would happily render
 * an upstream `inline` text/html. `nosniff` does not stop that.
 *
 * Parsed rather than pattern-matched off the end of the header, because a `;` inside a
 * quoted parameter value ends a naive match in the wrong place -- emitting unbalanced
 * quotes and a filename lifted out of some other parameter -- and `filename = "x"` with
 * spaces around the `=` gets dropped. One parameter goes out, whatever came in.
 */
export function forceAttachment(header: string | null): string {
  if (!header) return 'attachment';
  const params: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < header.length; i += 1) {
    const char = header[i];
    if (quoted && char === '\\' && i + 1 < header.length) {
      current += char + header[i + 1];
      i += 1;
      continue;
    }
    if (char === '"') quoted = !quoted;
    else if (char === ';' && !quoted) {
      params.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  params.push(current);

  let filename: string | undefined;
  let extended: string | undefined;
  for (const param of params.slice(1)) {
    const eq = param.indexOf('=');
    if (eq === -1) continue;
    const name = param.slice(0, eq).trim().toLowerCase();
    // Controls would be refused by setHeader anyway; dropping them keeps the refusal here,
    // where it costs a filename rather than the whole response.
    const value = Array.from(param.slice(eq + 1).trim())
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code > 0x1f && code !== 0x7f;
      })
      .join('');
    if (!value) continue;
    if (name === 'filename*') extended = value;
    else if (name === 'filename') filename = value;
  }
  // RFC 5987 wins where both are present, which is what it exists for.
  if (extended) return `attachment; filename*=${extended}`;
  if (filename) return `attachment; filename=${filename}`;
  return 'attachment';
}

function refuse(res: Response): void {
  res.status(404).type('text/plain').send(NOT_FOUND_BODY);
}

export function createAttachmentHandler(deps: AttachmentRouteDeps): Handler {
  return async (req: Request, res: Response): Promise<void> => {
    // Express routes HEAD to a GET handler when no HEAD handler is registered, so without
    // this a probe from a proxy or scanner redeems the ticket, has its body discarded, and
    // leaves the fetch that matters to fail as an unexplained 404.
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      res.status(405).type('text/plain').send('Method not allowed');
      return;
    }

    const raw = req.query[TICKET_PARAM];
    // Express parses a repeated `?t=a&t=b` into an array. Refuse rather than
    // picking one: two tickets in one request is not a shape any legitimate
    // caller produces, and silently taking the first would let an attacker
    // append a guess to a valid URL and learn from the timing which was used.
    if (typeof raw !== 'string' || raw.length === 0) {
      refuse(res);
      return;
    }

    const ticket = deps.store.redeem(raw);
    // An upload ticket presented to the download route is burnt and refused:
    // one ticket, one purpose, and the refusal is indistinguishable from any other.
    if (!ticket || ticket.purpose !== 'download') {
      refuse(res);
      return;
    }

    // Re-checked here, not because the store is untrusted, but because this is the last
    // point before a fetch runs under the ticket's token: a target that reaches it
    // malformed should fail closed rather than resolve to whatever the path concatenation
    // makes of it.
    if (!isPlainGraphPath(ticket.target)) {
      logger.error('Attachment redemption refused: ticket target is not a plain Graph path');
      refuse(res);
      return;
    }

    const graphClient = deps.getGraphClient();
    if (!graphClient) {
      // Redeemed but unservable: the ticket is already burnt, deliberately.
      // Re-adding it would make this path a way to keep a ticket alive.
      logger.error('Attachment redemption failed: Graph client is not initialised');
      res.status(503).type('text/plain').send('Service unavailable');
      return;
    }

    let stream: Awaited<ReturnType<GraphClient['downloadStream']>>;
    try {
      const accessToken =
        ticket.kind === 'request-token'
          ? ticket.accessToken
          : await deps.authManager.getTokenForAccount(ticket.accountName);
      // downloadStream falls back to AuthManager when handed no token, which for a
      // request-token ticket would fetch as whatever account this server has cached.
      if (!accessToken) throw new Error('No access token for this ticket');
      stream = await graphClient.downloadStream(ticket.target, { accessToken });
    } catch (error) {
      // The target path is logged; the ticket id and token never are. The path is
      // what an operator needs to diagnose a failure and is not itself a capability --
      // reaching it still requires a Graph token.
      logger.error(
        `Attachment redemption failed for ${ticket.target}: ${(error as Error).message}`
      );
      res.status(502).type('text/plain').send('Upstream fetch failed');
      return;
    }

    res.status(200);
    res.setHeader('content-type', stream.contentType);
    if (stream.contentLength !== null) {
      res.setHeader('content-length', String(stream.contentLength));
    }
    // Graph's own filename when it gave one. `attachment` either way: this
    // endpoint serves untrusted bytes from a mailbox, and a browser that
    // wandered onto the URL must not render an inline text/html attachment as
    // a page on this origin.
    res.setHeader('content-disposition', forceAttachment(stream.contentDisposition));
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');

    try {
      await pipeline(Readable.fromWeb(stream.body as never), res);
    } catch (error) {
      // Headers are already sent, so there is no status left to change. Destroy
      // rather than end, so the peer sees a truncated transfer instead of a
      // short body that looks complete.
      logger.error(`Attachment stream aborted for ${ticket.target}: ${(error as Error).message}`);
      res.destroy();
    }
  };
}

// ---------------------------------------------------------------------------
// Upload: PUT /attachment?t=<ticket>  (raw file bytes, Content-Length required)
// ---------------------------------------------------------------------------

/** Graph attaches up to 150 MB to a message or event. */
export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
/** Below this Graph takes the bytes inline as base64 contentBytes; at or above it needs an upload session. */
const INLINE_UPLOAD_LIMIT = 3 * 1024 * 1024;
/** Upload-session chunk: a multiple of 320 KiB, as Graph requires. */
const UPLOAD_CHUNK_BYTES = 320 * 1024 * 12;

interface UploadSessionResponse {
  uploadUrl?: string;
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
 * Redeem an upload ticket: the request body is the file, and it becomes an
 * attachment in the ticket's target collection as the identity that minted
 * the ticket. Small files are POSTed inline; larger ones stream through a
 * Graph upload session in fixed chunks, so the server never holds more than
 * one chunk of a large file.
 */
export function createAttachmentUploadHandler(deps: AttachmentRouteDeps): Handler {
  return async (req: Request, res: Response): Promise<void> => {
    if (req.method !== 'PUT') {
      res.setHeader('allow', 'GET, PUT');
      res.status(405).type('text/plain').send('Method not allowed');
      return;
    }

    const raw = req.query[TICKET_PARAM];
    if (typeof raw !== 'string' || raw.length === 0) {
      refuse(res);
      return;
    }

    const ticket = deps.store.redeem(raw);
    if (!ticket || ticket.purpose !== 'upload') {
      refuse(res);
      return;
    }
    if (!isPlainGraphPath(ticket.target)) {
      logger.error('Attachment upload refused: ticket target is not a plain Graph path');
      refuse(res);
      return;
    }

    // The ticket is burnt above whatever happens next: a rejected body cannot
    // be retried against the same capability.
    const declared = Number(req.headers['content-length']);
    if (!Number.isInteger(declared) || declared < 0) {
      res.status(411).type('text/plain').send('Content-Length required');
      return;
    }
    if (declared === 0) {
      res.status(400).type('text/plain').send('Empty upload');
      return;
    }
    if (declared > MAX_UPLOAD_BYTES) {
      res.status(413).type('text/plain').send(`Upload exceeds ${MAX_UPLOAD_BYTES} bytes`);
      return;
    }

    const graphClient = deps.getGraphClient();
    if (!graphClient) {
      logger.error('Attachment upload failed: Graph client is not initialised');
      res.status(503).type('text/plain').send('Service unavailable');
      return;
    }

    let accessToken: string | undefined;
    try {
      accessToken =
        ticket.kind === 'request-token'
          ? ticket.accessToken
          : await deps.authManager.getTokenForAccount(ticket.accountName);
      if (!accessToken) throw new Error('No access token for this ticket');
    } catch (error) {
      logger.error(`Attachment upload failed for ${ticket.target}: ${(error as Error).message}`);
      res.status(502).type('text/plain').send('Upstream upload failed');
      return;
    }

    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');

    try {
      if (declared < INLINE_UPLOAD_LIMIT) {
        const chunks: Buffer[] = [];
        let received = 0;
        for await (const chunk of req) {
          received += (chunk as Buffer).length;
          if (received > declared) throw new Error('Body exceeds Content-Length');
          chunks.push(chunk as Buffer);
        }
        if (received !== declared) throw new Error('Body shorter than Content-Length');
        const created = (await graphClient.makeRequest(ticket.target, {
          method: 'POST',
          accessToken,
          body: JSON.stringify({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: ticket.name,
            contentType: ticket.contentType,
            contentBytes: Buffer.concat(chunks).toString('base64'),
          }),
        })) as { id?: string };
        res.status(201).json({ ok: true, name: ticket.name, size: declared, id: created?.id });
        return;
      }

      const session = (await graphClient.makeRequest(`${ticket.target}/createUploadSession`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          AttachmentItem: {
            attachmentType: 'file',
            name: ticket.name,
            size: declared,
            contentType: ticket.contentType,
          },
        }),
      })) as UploadSessionResponse;
      if (!session?.uploadUrl) throw new Error('Upload session returned no uploadUrl');

      let pending: Buffer[] = [];
      let pendingBytes = 0;
      let offset = 0;
      for await (const piece of req) {
        pending.push(piece as Buffer);
        pendingBytes += (piece as Buffer).length;
        if (offset + pendingBytes > declared) throw new Error('Body exceeds Content-Length');
        while (pendingBytes >= UPLOAD_CHUNK_BYTES) {
          const joined = Buffer.concat(pending);
          const chunk = joined.subarray(0, UPLOAD_CHUNK_BYTES);
          await putChunk(session.uploadUrl, chunk, offset, declared);
          offset += chunk.length;
          const rest = joined.subarray(UPLOAD_CHUNK_BYTES);
          pending = rest.length ? [Buffer.from(rest)] : [];
          pendingBytes = rest.length;
        }
      }
      if (pendingBytes > 0) {
        await putChunk(session.uploadUrl, Buffer.concat(pending), offset, declared);
        offset += pendingBytes;
      }
      if (offset !== declared) throw new Error('Body shorter than Content-Length');
      res.status(201).json({ ok: true, name: ticket.name, size: declared });
    } catch (error) {
      logger.error(`Attachment upload failed for ${ticket.target}: ${(error as Error).message}`);
      if (!res.headersSent) res.status(502).type('text/plain').send('Upstream upload failed');
    }
  };
}

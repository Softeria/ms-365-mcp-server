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
 * with this server's own Graph token.
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
    if (!ticket) {
      refuse(res);
      return;
    }

    // Re-checked here, not because the store is untrusted, but because this is the last
    // point before a fetch runs under the server's own token: a target that reaches it
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
      let accessToken: string | undefined;
      if (!deps.authManager.isOAuthModeEnabled()) {
        accessToken = await deps.authManager.getTokenForAccount(ticket.accountName);
      }
      stream = await graphClient.downloadStream(ticket.target, { accessToken });
    } catch (error) {
      // The target path is logged; the ticket id never is. The path is what an
      // operator needs to diagnose a failure and is not itself a capability --
      // reaching it still requires this server's Graph token.
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

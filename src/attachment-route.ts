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
import { type AttachmentTicketStore, TICKET_PARAM } from './lib/attachment-tickets.js';

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

function refuse(res: Response): void {
  res.status(404).type('text/plain').send(NOT_FOUND_BODY);
}

export function createAttachmentHandler(deps: AttachmentRouteDeps): Handler {
  return async (req: Request, res: Response): Promise<void> => {
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
    res.setHeader('content-disposition', stream.contentDisposition ?? 'attachment');
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

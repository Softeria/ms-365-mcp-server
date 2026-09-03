/**
 * Short-TTL, single-redemption tickets for Graph byte resources that expose no
 * pre-authenticated download URL of their own.
 *
 * A ticket is a capability and nothing else: it names one Graph path and one
 * account, it is redeemable once, and it expires. It carries no credential --
 * the redemption route authenticates to Graph with the server's own token, the
 * same way every tool does. Holding a ticket therefore authorises exactly one
 * authenticated GET of exactly one resource, which is the smallest grant that
 * makes an out-of-band fetch possible at all.
 *
 * Memory-only, deliberately. Persisting tickets would mean a redeemable
 * capability surviving a restart, and re-reading it from disk is a second place
 * for it to leak; a ticket outliving the process it was minted in has no
 * legitimate use when the TTL is measured in minutes.
 */

import { randomBytes } from 'node:crypto';
import { ATTACHMENT_ROUTE, type AttachmentUrlConfig } from './attachment-url-config.js';
import { signUrl } from './url-signing.js';

/** Query parameter carrying the ticket id. */
export const TICKET_PARAM = 't';

/**
 * Build the signed, redeemable URL for a minted ticket.
 *
 * **The ticket travels in the query, never the path**, and that is a hard
 * requirement of the verifying sidecar rather than a style choice: docglean's
 * error messages keep a fetched URL's path (so an operator can tell which
 * document failed) and strip its query. A ticket in the path would be signed
 * just as correctly and would also land in every one of those messages.
 */
export function buildAttachmentUrl(
  config: AttachmentUrlConfig,
  ticketId: string,
  nowMs: number = Date.now()
): string {
  const url = new URL(ATTACHMENT_ROUTE, config.base);
  url.searchParams.set(TICKET_PARAM, ticketId);
  return signUrl(
    url.toString(),
    { key: config.key, keyId: config.keyId, ttlSeconds: config.ttlSeconds },
    nowMs
  );
}

export interface AttachmentTicket {
  /** Relative Graph path, exactly as the minting tool validated it. */
  readonly target: string;
  /** Account this ticket was minted for; undefined in single-account mode. */
  readonly accountName: string | undefined;
  /** Epoch milliseconds after which this ticket is dead. */
  readonly expiresAtMs: number;
}

/**
 * Cap on live tickets. A ticket is ~200 bytes, so this bounds the store at a
 * few hundred KB -- but the reason for a cap is not memory, it is that an agent
 * in a retry loop should hit a refusal it can report rather than grow the
 * process without limit. Minting refuses when full, after sweeping; it never
 * evicts a live ticket, because evicting the oldest would let a caller minting
 * in a loop invalidate tickets someone else is about to redeem.
 */
const MAX_LIVE_TICKETS = 256;

/** 32 bytes of CSPRNG output -- the ticket id is the whole capability. */
const TICKET_BYTES = 32;

export class TicketStoreFullError extends Error {
  constructor(public readonly limit: number) {
    super(`No ticket slots available (limit ${limit}); retry once outstanding tickets expire.`);
    this.name = 'TicketStoreFullError';
  }
}

export class AttachmentTicketStore {
  private readonly tickets = new Map<string, AttachmentTicket>();

  constructor(private readonly ttlSeconds: number) {}

  /** Drop every expired ticket. Called before each mint and each redemption. */
  private sweep(nowMs: number): void {
    for (const [id, ticket] of this.tickets) {
      if (ticket.expiresAtMs <= nowMs) this.tickets.delete(id);
    }
  }

  mint(
    target: string,
    accountName: string | undefined,
    nowMs: number = Date.now()
  ): { id: string; expiresAtMs: number } {
    this.sweep(nowMs);
    if (this.tickets.size >= MAX_LIVE_TICKETS) {
      throw new TicketStoreFullError(MAX_LIVE_TICKETS);
    }
    const id = randomBytes(TICKET_BYTES).toString('base64url');
    const expiresAtMs = nowMs + this.ttlSeconds * 1000;
    this.tickets.set(id, { target, accountName, expiresAtMs });
    return { id, expiresAtMs };
  }

  /**
   * Return the ticket and burn it, or undefined.
   *
   * One `undefined` for every failure -- unknown id, already redeemed, expired.
   * The caller answers 404 to all three, so a probe cannot use the response to
   * tell "never existed" from "already used", which would confirm a guessed id.
   *
   * The delete happens before the value is returned rather than in the caller,
   * so an exception on the streaming path cannot leave a redeemed ticket live.
   */
  redeem(id: string, nowMs: number = Date.now()): AttachmentTicket | undefined {
    this.sweep(nowMs);
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    this.tickets.delete(id);
    // No second expiry check here: `sweep` above ran against this same `nowMs`
    // and already removed anything at or past its expiry, so a surviving entry
    // is live by construction. A re-check would be unreachable code asserting a
    // guarantee the sweep already provides -- and because both use one captured
    // timestamp, there is no sweep/get race for it to cover.
    return ticket;
  }

  /** Live ticket count, for tests and diagnostics. Never logged with ids. */
  size(nowMs: number = Date.now()): number {
    this.sweep(nowMs);
    return this.tickets.size;
  }

  clear(): void {
    this.tickets.clear();
  }
}

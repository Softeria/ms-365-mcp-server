/**
 * Process-wide handle on the attachment-minting feature.
 *
 * A module singleton rather than another parameter on `UtilityToolContext`,
 * following the same shape as this server's existing request-token context:
 * `registerGraphTools` and `registerDiscoveryTools` already take six and seven
 * positional arguments respectively, and threading a seventh and eighth through
 * both -- plus every call site and every test that constructs a context --
 * spreads a feature that exactly one tool reads across a dozen signatures.
 *
 * Configured once, from `server.ts`, before any tool can run. `getAttachmentMinting`
 * returns null when the feature is off, which is the state every stdio run and
 * every HTTP run without `--enable-attachment-urls` stays in.
 */

import type { AttachmentTicketStore } from './attachment-tickets.js';
import type { AttachmentUrlConfig } from './attachment-url-config.js';

export interface AttachmentMinting {
  store: AttachmentTicketStore;
  config: AttachmentUrlConfig;
}

let current: AttachmentMinting | null = null;

export function configureAttachmentMinting(minting: AttachmentMinting | null): void {
  current = minting;
}

export function getAttachmentMinting(): AttachmentMinting | null {
  return current;
}

/** Test helper -- drops any configured state so cases cannot leak into each other. */
export function resetAttachmentMinting(): void {
  current = null;
}

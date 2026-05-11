/**
 * redirect_uri allowlist validator per D-02 policy (plan 01-06, AUTH-06).
 *
 * Always forbidden: javascript:, data:, file:, about:, vbscript: (regardless of mode)
 * Always permitted: http://localhost:* / http://127.0.0.1:* / http://[::1]:* (loopback)
 * Always permitted: https://<host> when host matches policy.publicUrlHost
 * Always permitted: https://<host> when host matches an entry in
 *                   policy.extraAllowedHosts (case-insensitive, exact match)
 * Dev mode only:    any https://
 * Prod mode:        everything else is rejected with { ok: false, reason }
 *
 * `extraAllowedHosts` exists for OAuth Dynamic Client Registration (RFC
 * 7591) callers like the Claude.ai connector, whose redirect_uri lives on
 * the connector's domain (e.g. `claude.ai`), not on the gateway's host.
 * Operators populate this list via `MS365_MCP_OAUTH_REDIRECT_HOSTS` (CSV).
 *
 * Pure function — no project imports, no side effects.
 */

export type RedirectUriMode = 'dev' | 'prod';

export interface RedirectUriPolicy {
  mode: RedirectUriMode;
  /** Parsed host of MS365_MCP_PUBLIC_URL; null when PUBLIC_URL is unset. */
  publicUrlHost: string | null;
  /**
   * Extra hosts allowed in prod mode for HTTPS redirect_uris. Used by
   * DCR for third-party MCP clients (Claude.ai connectors etc.) whose
   * callbacks live on a different domain than the gateway. Comparison is
   * case-insensitive and exact-match (no wildcards). Optional — empty /
   * undefined = behave as before.
   */
  extraAllowedHosts?: readonly string[];
}

const FORBIDDEN_SCHEMES = new Set(['javascript:', 'data:', 'file:', 'about:', 'vbscript:']);
// Node's URL parser preserves brackets on IPv6 hostnames (`[::1]`), while the
// WHATWG URL spec and some other implementations strip them to `::1`. Accept
// both literal forms so the validator works regardless of upstream host parsing.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function normalizeRedirectHostEntry(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (url.username || url.password) return null;
    return url.hostname || null;
  } catch {
    return null;
  }
}

export function validateRedirectUri(
  raw: string,
  policy: RedirectUriPolicy
): { ok: true } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'not a valid URL' };
  }

  if (FORBIDDEN_SCHEMES.has(url.protocol)) {
    return { ok: false, reason: `forbidden scheme: ${url.protocol}` };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: `non-http(s) scheme: ${url.protocol}` };
  }

  // Loopback: HTTP only, hostname must be localhost / 127.0.0.1 / ::1 / [::1].
  // Node's URL parser preserves brackets on IPv6 literals in `hostname`; we
  // accept both bracketed and unbracketed forms for cross-implementation safety.
  if (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)) {
    return { ok: true };
  }

  // Host matches configured PUBLIC_URL — always OK regardless of mode.
  if (url.protocol === 'https:' && policy.publicUrlHost && url.hostname === policy.publicUrlHost) {
    return { ok: true };
  }

  // Host matches one of the operator-configured extra hosts — OK regardless
  // of mode. Exact-match, case-insensitive (URL.hostname is already
  // lowercased by the WHATWG URL parser, but we lowercase the policy entry
  // for symmetry against operator input).
  if (
    url.protocol === 'https:' &&
    policy.extraAllowedHosts &&
    policy.extraAllowedHosts.some((h) => normalizeRedirectHostEntry(h) === url.hostname)
  ) {
    return { ok: true };
  }

  // Dev mode permits any https://.
  if (policy.mode === 'dev' && url.protocol === 'https:') {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `host not in allowlist (mode=${policy.mode}): ${url.hostname}`,
  };
}

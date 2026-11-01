/**
 * --obo access checks around the On-Behalf-Of exchange (#696).
 *
 * The signature of the inbound assertion is deliberately not verified here:
 * Entra verifies it during the exchange, and a forged, expired or mis-addressed
 * assertion gets no Graph token. What this adds is the answer the client sees
 * and an optional allowlist:
 *
 *  - When Entra rejects the assertion, the client gets 401 with the usual
 *    WWW-Authenticate challenge, so an MCP client re-authenticates, instead of
 *    500 "Internal server error". Configuration and network failures still 500.
 *  - MS365_MCP_OBO_ALLOWED_TENANTS / MS365_MCP_OBO_ALLOWED_USERS (tenant ids /
 *    user object ids, comma or space separated) refuse other callers with 403
 *    before any exchange. The claims are read unverified, which is safe here:
 *    a token that lies about its tid/oid to pass the list still has to survive
 *    the exchange, and a genuine token's claims are true.
 */

export interface OboAllowlist {
  tenants: Set<string>;
  users: Set<string>;
}

const splitList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function readOboAllowlist(
  env: Record<string, string | undefined> = process.env
): OboAllowlist {
  return {
    tenants: new Set(splitList(env.MS365_MCP_OBO_ALLOWED_TENANTS)),
    users: new Set(splitList(env.MS365_MCP_OBO_ALLOWED_USERS)),
  };
}

function readClaims(token: string): Record<string, unknown> | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** Why the caller is refused by the allowlist, or undefined when allowed (or no list is set). */
export function oboAllowlistRefusal(token: string, allow: OboAllowlist): string | undefined {
  if (allow.tenants.size === 0 && allow.users.size === 0) return undefined;
  const claims = readClaims(token);
  if (!claims) return 'The access token is not a JWT, so its tenant and user cannot be checked.';
  const tid = typeof claims.tid === 'string' ? claims.tid.toLowerCase() : '';
  const oid = typeof claims.oid === 'string' ? claims.oid.toLowerCase() : '';
  if (allow.tenants.size > 0 && !allow.tenants.has(tid)) {
    return "The caller's tenant is not allowed on this server.";
  }
  if (allow.users.size > 0 && !allow.users.has(oid)) {
    return 'The caller is not allowed on this server.';
  }
  return undefined;
}

// Entra's answers when the assertion itself is unusable (bad signature, expired,
// wrong audience, consent or sign-in needed). The remedy for all of them is a
// fresh sign-in, which is what a 401 challenge asks the client for.
const ASSERTION_ERROR_CODES = new Set([
  'invalid_grant',
  'interaction_required',
  'consent_required',
  'login_required',
]);
// AADSTS5002723 ("Invalid JWT token", e.g. a token issued for another app) arrives
// with errorCode invalid_client, which otherwise means a server-side credential
// problem, so it is matched by its code. (A forged or expired assertion for a
// personal account comes back as AADSTS70012 temporarily_unavailable, which a
// real outage also returns, so it stays a 500.)
const ASSERTION_AADSTS = /\bAADSTS(50013|500133|50027|50173|700082|65001|50076|50079|5002723)\b/;

export function isRejectedAssertion(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { errorCode?: unknown; message?: unknown; errorMessage?: unknown };
  if (typeof e.errorCode === 'string' && ASSERTION_ERROR_CODES.has(e.errorCode)) return true;
  const text = `${typeof e.errorMessage === 'string' ? e.errorMessage : ''} ${typeof e.message === 'string' ? e.message : ''}`;
  return ASSERTION_AADSTS.test(text);
}

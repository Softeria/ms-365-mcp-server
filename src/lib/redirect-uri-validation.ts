/**
 * Validation for OAuth `redirect_uri` parameters forwarded to Microsoft's
 * authorization endpoint and accepted at our /authorize endpoint.
 *
 * CWE-601 (Open Redirect): The /authorize endpoint forwards client-supplied
 * `redirect_uri` values into the Microsoft Entra authorization URL. While
 * Entra ID validates redirect URIs against the registered app, deployments
 * with broad redirect URI patterns or wildcard configurations could allow an
 * attacker to craft a link that steals the authorization code by redirecting
 * to an attacker-controlled origin. We defensively validate the URI here so
 * that obviously dangerous schemes (javascript:, data:, file:) and arbitrary
 * remote http origins are rejected before we ever forward the request.
 *
 * Behaviour:
 * - Malformed URIs are rejected.
 * - Only `http:` and `https:` schemes are allowed.
 * - `http:` is only allowed for loopback hosts (localhost, 127.0.0.1, ::1)
 *   when no explicit allowlist has been configured.
 * - When `MS365_MCP_ALLOWED_REDIRECT_URIS` is configured (comma-separated),
 *   the redirect_uri must exactly match one of the allowlisted entries.
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function isLoopbackHost(host: string): boolean {
  // URL.host includes brackets for IPv6, hostname does not.
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

export function parseAllowlist(raw: string | undefined | null): string[] | null {
  if (!raw) return null;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

/**
 * Returns true if `value` is an acceptable redirect_uri.
 *
 * @param value      The candidate redirect_uri string from the client.
 * @param allowlist  Optional explicit allowlist of acceptable URIs. When
 *                   non-null, only exact matches are accepted.
 */
export function isAllowedRedirectUri(
  value: string,
  allowlist: string[] | null | undefined
): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  // Reject anything that isn't http(s) — this blocks javascript:, data:,
  // file:, and similar dangerous schemes outright.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  if (allowlist && allowlist.length > 0) {
    return allowlist.includes(value);
  }

  // No explicit allowlist: permit https everywhere, http only on loopback.
  if (url.protocol === 'http:') {
    return isLoopbackHost(url.hostname);
  }

  return true;
}

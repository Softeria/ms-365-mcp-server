/**
 * RFC 9728 / MCP 2025-06-18 — WWW-Authenticate: Bearer header builder
 *
 * MCP clients (Claude.ai connectors, etc.) discover the OAuth Protected
 * Resource Metadata document via the `resource_metadata` parameter on the
 * `WWW-Authenticate: Bearer` challenge served on a 401 response. Without
 * this header, browsers / connectors fail with a generic "Couldn't reach
 * the MCP server" message because there is no entry point into the OAuth
 * dance.
 *
 * Header value format (RFC 9728 §5.3, RFC 6750 §3):
 *   Bearer realm="<resource>", error="...", error_description="...",
 *          resource_metadata="<absolute URL>"
 *
 * The resource-metadata document itself is served by Phase 06-05 at:
 *   - /.well-known/oauth-protected-resource (root, legacy singleton)
 *   - /t/:tenantId/.well-known/oauth-protected-resource (per-tenant)
 *
 * Public-base URL resolution mirrors src/server.ts:1460-1466:
 *   1. MS365_MCP_PUBLIC_URL env (canonical)
 *   2. Deprecated MS365_MCP_BASE_URL env
 *   3. Fallback: req.protocol + req.get('host') (honours X-Forwarded-Proto
 *      only when MS365_MCP_TRUST_PROXY explicitly enables Express trust
 *      proxy handling).
 */
import type { Request } from 'express';
import { buildWwwAuthenticateMetadata } from './connector-identity/metadata.js';

export interface WwwAuthenticateOptions {
  req: Request;
  tenantId?: string | undefined;
  error?: string | undefined;
  errorDescription?: string | undefined;
}

export function buildWwwAuthenticate(opts: WwwAuthenticateOptions): string {
  const { req, tenantId, error, errorDescription } = opts;
  const base = resolvePublicBase(req);
  const metadata = buildWwwAuthenticateMetadata({ publicBaseUrl: base, tenantId });

  const params: string[] = [`realm="${metadata.realm}"`];
  if (error) params.push(`error="${quoteSafe(error)}"`);
  if (errorDescription) params.push(`error_description="${quoteSafe(errorDescription)}"`);
  params.push(`resource_metadata="${metadata.resourceMetadata}"`);
  return `Bearer ${params.join(', ')}`;
}

export function resolvePublicBase(req: Request): string {
  const env = process.env.MS365_MCP_PUBLIC_URL || process.env.MS365_MCP_BASE_URL;
  if (env) {
    try {
      return new URL(env).href.replace(/\/$/, '');
    } catch {
      // Bad env — fall through to req-derived base. The /.well-known
      // endpoints in src/server.ts perform the same fallback, so the
      // resource_metadata URL we emit will resolve against the same
      // metadata document regardless of which path resolves the base.
    }
  }
  const proto = req.protocol || 'http';
  const host = req.get('host') ?? 'localhost';
  return `${proto}://${host}`;
}

/**
 * RFC 6750 quoted-string values forbid `"` and `\` unescaped. Our error
 * codes are stable identifiers (`bearer_token_required`, `tenant_mismatch`,
 * etc.) and never contain those characters, so this is purely defensive
 * against future strings.
 */
function quoteSafe(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

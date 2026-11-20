import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request identity + token carried via AsyncLocalStorage so deep callers
 * (graph-client, tool-runtime) can reach it without prop-drilling. Populated
 * by sessionAuth middleware after the session lookup + refresh.
 */
export interface RequestContext {
  accessToken: string;
  /** Set by sessionAuth middleware. Optional so tests that exercise only the token flow can omit it. */
  userOid?: string;
  /** Set by sessionAuth middleware. Optional for the same reason as userOid. */
  tenantId?: string;
  /** Set by sessionAuth middleware. May be null when Entra returns no UPN claim. */
  userPrincipalName?: string | null;
  /** Space-separated delegated scopes Microsoft granted this session's token. Set by the /mcp handler. */
  grantedScopes?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/** Returns the active request context, or undefined if outside an MCP request. */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/** Legacy alias kept for graph-client.ts; returns the same store. */
export const getRequestTokens = getRequestContext;

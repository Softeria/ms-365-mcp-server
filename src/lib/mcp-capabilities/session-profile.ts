import type { Request } from 'express';
import type { ClientCapabilityProfile } from './profile.js';
import type { McpSessionRegistry } from '../mcp-notifications/session-registry.js';
import { getRequestTokens } from '../../request-context.js';

export function getSessionCapabilityProfile(
  registry: McpSessionRegistry,
  sessionId: string | undefined
): ClientCapabilityProfile | undefined {
  if (!sessionId) return undefined;
  return registry.getSession(sessionId)?.capabilityProfile;
}

export function getRequestCapabilityProfile(): ClientCapabilityProfile | undefined {
  return getRequestTokens()?.capabilityProfile;
}

export function getProfileForRequest(
  registry: McpSessionRegistry,
  req: Pick<Request, 'get'>
): ClientCapabilityProfile | undefined {
  return getSessionCapabilityProfile(
    registry,
    req.get('mcp-session-id') ?? req.get('Mcp-Session-Id')
  );
}

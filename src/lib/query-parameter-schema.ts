import { z } from 'zod';
import { getODataParamDescription, shouldOmitTopParam } from './param-descriptions.js';

// Microsoft's OpenAPI collection parameters disagree with these endpoints' REST contracts:
// https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
// https://learn.microsoft.com/en-us/graph/api/associatedteaminfo-list
const TEAM_LIST_TOOLS = new Set(['list-joined-teams', 'list-my-associated-teams']);

/**
 * Defines the query contract shared by registration, discovery, and execution.
 * Undefined means the endpoint does not support this query parameter.
 */
export function queryParameterSchema(
  toolName: string,
  name: string,
  providerSchema: z.ZodTypeAny
): z.ZodTypeAny | undefined {
  const bareName = name.replace(/^\$/, '').toLowerCase();
  if (TEAM_LIST_TOOLS.has(toolName)) return undefined;
  if (bareName === 'top' && shouldOmitTopParam(toolName)) return undefined;

  const source = providerSchema instanceof z.ZodOptional ? providerSchema.unwrap() : providerSchema;
  let schema = source;
  switch (bareName) {
    case 'select':
    case 'expand':
    case 'orderby':
      // Both forms serialize to Graph's comma-separated field list. Previously
      // discovery advertised an array while normal registration required a string.
      schema = z.union([z.string(), z.array(z.string())]);
      break;
    case 'filter':
    case 'search':
      schema = z.string();
      break;
    case 'skiptoken':
      // Synthetic cursors have no generated parameter definition at execution.
      schema = z.string();
      break;
    case 'top':
      // https://learn.microsoft.com/en-us/graph/api/chat-list
      // Intersect so a stricter bound from the provider is never relaxed.
      if (toolName === 'list-chats') schema = source.and(z.number().max(50));
      break;
  }
  if (providerSchema.isOptional()) schema = schema.optional();
  const description = getODataParamDescription(bareName);
  return description ? schema.describe(description) : schema;
}

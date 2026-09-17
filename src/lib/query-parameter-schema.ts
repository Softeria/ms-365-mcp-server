import { z } from 'zod';
import { getODataParamDescription, shouldOmitTopParam } from './param-descriptions.js';

// Microsoft's OpenAPI collection parameters disagree with these endpoints' REST contracts:
// https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
// https://learn.microsoft.com/en-us/graph/api/associatedteaminfo-list
const TEAM_LIST_TOOLS = new Set(['list-joined-teams', 'list-my-associated-teams']);
const CUSTOM_EMOJI_QUERY_DESCRIPTIONS: Record<string, string> = {
  top: 'Number of custom emojis to return in one page. Each emoji includes base64 image content; use a small page size to keep the response manageable.',
  filter:
    'OData filter expression for custom emojis, forwarded to Microsoft Graph. Filter support is determined by the beta API.',
};

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
  // The generated collection schema advertises generic OData options, but the
  // custom-emoji REST contract documents only $top/$filter. Keep the synthetic
  // cursor for following a returned @odata.nextLink through the existing paging path.
  // https://learn.microsoft.com/graph/api/teamworkmessaging-list-customemojis?view=graph-rest-beta
  if (toolName === 'list-custom-emojis' && !['top', 'filter', 'skiptoken'].includes(bareName)) {
    return undefined;
  }
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
  const description =
    (toolName === 'list-custom-emojis' && CUSTOM_EMOJI_QUERY_DESCRIPTIONS[bareName]) ||
    getODataParamDescription(bareName);
  return description ? schema.describe(description) : schema;
}

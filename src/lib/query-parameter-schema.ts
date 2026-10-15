import { z } from 'zod';
import { getODataParamDescription, isQueryParamSupported } from './param-descriptions.js';

const CUSTOM_EMOJI_QUERY_DESCRIPTIONS: Record<string, string> = {
  top: 'Number of custom emojis to return in one page. Base64 image content is opt-in with select; use a small page size when selecting contentBytes.',
  filter:
    'OData filter expression for custom emojis, forwarded to Microsoft Graph. Filter support is determined by the beta API.',
  select:
    'Properties to return as a comma-separated string or string array. Explicitly select contentBytes to retrieve base64 PNG/GIF images, for example displayName,contentBytes. Graph can return contentBytes: null when it is not explicitly selected.',
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
  if (!isQueryParamSupported(toolName, bareName)) return undefined;

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

import { z } from 'zod';
import {
  getODataParamDescription,
  isQueryParamSupported,
  type QueryParamConfig,
} from './param-descriptions.js';

/**
 * Defines the query contract shared by registration, discovery, and execution.
 * Undefined means the endpoint does not support this query parameter.
 */
export function queryParameterSchema(
  name: string,
  providerSchema: z.ZodTypeAny,
  config?: QueryParamConfig
): z.ZodTypeAny | undefined {
  const bareName = name.replace(/^\$/, '').toLowerCase();
  if (!isQueryParamSupported(config, bareName)) return undefined;

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
      // Intersect so a stricter bound from the provider is never relaxed.
      if (config?.maxTop !== undefined) schema = source.and(z.number().max(config.maxTop));
      break;
  }
  if (providerSchema.isOptional()) schema = schema.optional();
  const description = getODataParamDescription(bareName, config);
  return description ? schema.describe(description) : schema;
}

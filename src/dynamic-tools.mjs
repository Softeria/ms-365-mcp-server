import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import logger from './logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAPI_PATH = path.join(__dirname, '..', 'openapi', 'openapi.yaml');

function mapToZodType(schema) {
  if (!schema) return z.any();

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (refName.toLowerCase().includes('string')) return z.string();
    if (refName.toLowerCase().includes('int') || refName.toLowerCase().includes('number'))
      return z.number();
    if (refName.toLowerCase().includes('boolean')) return z.boolean();
    if (refName.toLowerCase().includes('date')) return z.string();
    if (refName.toLowerCase().includes('object')) return z.object({}).passthrough();
    if (refName.toLowerCase().includes('array')) return z.array(z.any());

    return z.object({}).passthrough();
  }

  switch (schema.type) {
    case 'string':
      const stringSchema = z.string();
      if (schema.format === 'date-time') return stringSchema;
      if (schema.enum) return z.enum(schema.enum);
      return stringSchema;
    case 'integer':
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(mapToZodType(schema.items || {}));
    case 'object':
      const properties = schema.properties || {};
      const shape = {};

      Object.entries(properties).forEach(([key, prop]) => {
        shape[key] = mapToZodType(prop);
        if (schema.required && schema.required.includes(key)) {
        } else {
          shape[key] = shape[key].optional();
        }
      });

      return z.object(shape).passthrough();
    default:
      return z.any();
  }
}

function processParameter(parameter) {
  const zodSchema = mapToZodType(parameter.schema);

  let schema = parameter.description ? zodSchema.describe(parameter.description) : zodSchema;

  if (!parameter.required) {
    schema = schema.optional();
  }

  return schema;
}

export const TARGET_ENDPOINTS = [
  {
    pathPattern: '/me/messages',
    method: 'get',
    toolName: 'list-mail-messages',
  },
  {
    pathPattern: '/me/mailFolders',
    method: 'get',
    toolName: 'list-mail-folders',
  },
  {
    pathPattern: '/me/mailFolders/{mailFolder-id}/messages',
    method: 'get',
    toolName: 'list-mail-folder-messages',
  },
  {
    pathPattern: '/me/messages/{message-id}',
    method: 'get',
    toolName: 'get-mail-message',
  },
  {
    pathPattern: '/me/events',
    method: 'get',
    toolName: 'list-calendar-events',
  },
  {
    pathPattern: '/me/events/{event-id}',
    method: 'get',
    toolName: 'get-calendar-event',
  },
  {
    pathPattern: '/me/events',
    method: 'post',
    toolName: 'create-calendar-event',
  },
  {
    pathPattern: '/me/events/{event-id}',
    method: 'patch',
    toolName: 'update-calendar-event',
  },
  {
    pathPattern: '/me/events/{event-id}',
    method: 'delete',
    toolName: 'delete-calendar-event',
  },
  {
    pathPattern: '/me/calendarView',
    method: 'get',
    toolName: 'get-calendar-view',
  },
];

export async function registerDynamicTools(server, graphClient) {
  try {
    logger.info('Loading OpenAPI spec...');
    const openapiContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    const openapi = yaml.load(openapiContent);

    logger.info('Generating dynamic tools from OpenAPI spec...');

    for (const endpoint of TARGET_ENDPOINTS) {
      const path = openapi.paths[endpoint.pathPattern];

      if (!path) {
        logger.warn(`Path ${endpoint.pathPattern} not found in OpenAPI spec`);
        continue;
      }

      const operation = path[endpoint.method];

      if (!operation) {
        logger.warn(`Method ${endpoint.method} not found for path ${endpoint.pathPattern}`);
        continue;
      }

      logger.info(
        `Creating tool ${endpoint.toolName} for ${endpoint.method.toUpperCase()} ${endpoint.pathPattern}`
      );

      const paramsSchema = {};

      const pathParams = endpoint.pathPattern.match(/\{([^}]+)}/g) || [];
      pathParams.forEach((param) => {
        const paramName = param.slice(1, -1);
        paramsSchema[paramName] = z.string().describe(`Path parameter: ${paramName}`);
      });

      if (operation.parameters) {
        operation.parameters.forEach((param) => {
          if (param.in === 'query') {
            if (!pathParams.includes(`{${param.name}}`)) {
              paramsSchema[param.name] = processParameter(param);
            }
          }
        });
      }
      
      if (['post', 'put', 'patch'].includes(endpoint.method) && operation.requestBody) {
        const contentType = operation.requestBody.content?.['application/json'] ||
                           operation.requestBody.content?.['*/*'] ||
                           {};
        
        if (contentType.schema) {
          paramsSchema.body = z.object({}).passthrough().describe(
            operation.requestBody.description || 'Request body'
          );
        }
      }

      const handler = async (params) => {
        let url = endpoint.pathPattern;

        pathParams.forEach((param) => {
          const paramName = param.slice(1, -1);
          url = url.replace(param, params[paramName]);
        });

        const queryParams = [];

        if (operation.parameters) {
          operation.parameters.forEach((param) => {
            if (param.in === 'query' && params[param.name] !== undefined) {
              if (param.name.startsWith('$')) {
                if (Array.isArray(params[param.name])) {
                  queryParams.push(`${param.name}=${params[param.name].join(',')}`);
                } else {
                  queryParams.push(`${param.name}=${encodeURIComponent(params[param.name])}`);
                }
              } else {
                queryParams.push(`${param.name}=${encodeURIComponent(params[param.name])}`);
              }
            }
          });
        }
        
        if (queryParams.length > 0) {
          url += '?' + queryParams.join('&');
        }

        const options = {
          method: endpoint.method.toUpperCase(),
        };

        if (['post', 'put', 'patch'].includes(endpoint.method.toLowerCase()) && params.body) {
          options.body = JSON.stringify(params.body);
        }

        return graphClient.graphRequest(url, options);
      };

      server.tool(endpoint.toolName, paramsSchema, handler);
    }
    logger.info(`Dynamic tools registration complete.`);
  } catch (error) {
    logger.error('Error registering dynamic tools:', error);
    throw error;
  }
}

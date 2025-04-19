import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import logger from './logger.mjs';
import { createFriendlyParamName, registerParamMapping } from './param-mapper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const OPENAPI_PATH = path.join(__dirname, '..', 'openapi', 'openapi.yaml');

export function loadOpenApiSpec() {
  try {
    logger.info('Loading OpenAPI spec...');
    const openapiContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    return yaml.load(openapiContent);
  } catch (error) {
    logger.error('Error loading OpenAPI spec:', error);
    throw error;
  }
}

export function mapToZodType(schema) {
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

export function processParameter(parameter) {
  const zodSchema = mapToZodType(parameter.schema);

  let schema = parameter.description ? zodSchema.describe(parameter.description) : zodSchema;

  if (!parameter.required) {
    schema = schema.optional();
  }

  return schema;
}

export function findPathAndOperation(openapi, pathPattern, method) {
  const path = openapi.paths[pathPattern];

  if (!path) {
    logger.warn(`Path ${pathPattern} not found in OpenAPI spec`);
    return null;
  }

  const operation = path[method.toLowerCase()];

  if (!operation) {
    logger.warn(`Method ${method} not found for path ${pathPattern}`);
    return null;
  }

  return { path, operation };
}

export function isMethodWithBody(method) {
  return ['post', 'put', 'patch'].includes(method);
}

export function buildParameterSchemas(endpoint, operation) {
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
          const friendlyName = createFriendlyParamName(param.name);
          registerParamMapping(endpoint.toolName, friendlyName, param.name);
          paramsSchema[friendlyName] = processParameter(param);
        }
      }
    });
  }

  if (isMethodWithBody(endpoint.method) && operation.requestBody) {
    const contentType =
      operation.requestBody.content?.['application/json'] ||
      operation.requestBody.content?.['*/*'] ||
      {};

    if (contentType.schema) {
      paramsSchema.body = z
        .object({})
        .passthrough()
        .describe(operation.requestBody.description || 'Request body');
    }
  }

  if (endpoint.isExcelOp) {
    paramsSchema.filePath = z.string().describe('Path to the Excel file in OneDrive');

    if (endpoint.pathPattern.includes('range(address=')) {
      paramsSchema.address = z.string().describe('Excel range address (e.g., "A1:B10")');
    }
  }

  return paramsSchema;
}

export function buildRequestUrl(baseUrl, params, pathParams, queryParamDefs) {
  let url = baseUrl;

  pathParams.forEach((param) => {
    const paramName = param.slice(1, -1);
    url = url.replace(param, params[paramName]);
  });

  if (url.includes("range(address='{address}')") && params.address) {
    url = url.replace('{address}', encodeURIComponent(params.address));
  }

  const queryParams = [];

  if (queryParamDefs) {
    queryParamDefs.forEach((param) => {
      if (param.in === 'query') {
        const friendlyName = createFriendlyParamName(param.name);

        if (params[friendlyName] !== undefined) {
          if (Array.isArray(params[friendlyName])) {
            queryParams.push(`${param.name}=${params[friendlyName].join(',')}`);
          } else {
            queryParams.push(`${param.name}=${encodeURIComponent(params[friendlyName])}`);
          }
        }
      }
    });
  }

  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&');
  }

  return url;
}

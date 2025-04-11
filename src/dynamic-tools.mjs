import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import logger from './logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAPI_PATH = path.join(__dirname, '..', 'openapi', 'openapi.yaml');

const TOOL_CATEGORIES = {
  mail: {
    pattern: /\/me\/messages|\/me\/mailFolders/i,
    methods: {
      list: { match: /^(list|get)/i, description: 'List email messages' },
      read: { match: /^get[A-Z].*message/i, description: 'Read email message content' },
      send: { match: /(send|create|post)/i, description: 'Send or create email messages' },
      move: { match: /(move|copy)/i, description: 'Move or copy email messages' },
      delete: { match: /(delete|remove)/i, description: 'Delete email messages' },
    },
  },
  files: {
    pattern: /\/me\/drive|drives/i,
    methods: {
      list: { match: /^(list|get)/i, description: 'List files and folders' },
      get: { match: /^get[A-Z].*item/i, description: 'Get file or folder content/metadata' },
      create: { match: /(create|post|upload)/i, description: 'Create or upload files/folders' },
      update: { match: /update/i, description: 'Update file properties or content' },
      delete: { match: /(delete|remove)/i, description: 'Delete files or folders' },
      share: { match: /share/i, description: 'Share files with others' },
    },
  },
  calendar: {
    pattern: /\/me\/events|\/me\/calendar/i,
    methods: {
      list: { match: /^(list|get)/i, description: 'List calendar events' },
      create: { match: /(create|post)/i, description: 'Create calendar events' },
      update: { match: /update/i, description: 'Update calendar events' },
      delete: { match: /(delete|remove|cancel)/i, description: 'Delete or cancel calendar events' },
      respond: {
        match: /(accept|decline|tentativelyAccept)/i,
        description: 'Respond to calendar events',
      },
    },
  },
  chat: {
    pattern: /\/me\/chats|\/me\/joinedTeams/i,
    methods: {
      list: { match: /^(list|get)/i, description: 'List chats and teams' },
      messages: { match: /messages/i, description: 'Work with chat messages' },
      create: { match: /(create|post|send)/i, description: 'Create chats or send messages' },
      members: { match: /members/i, description: 'Manage chat/team members' },
    },
  },
  contacts: {
    pattern: /\/me\/contacts/i,
    methods: {
      list: { match: /^(list|get)/i, description: 'List contacts' },
      create: { match: /(create|post)/i, description: 'Create contacts' },
      update: { match: /update/i, description: 'Update contacts' },
      delete: { match: /(delete|remove)/i, description: 'Delete contacts' },
    },
  },
  tasks: {
    pattern: /\/me\/todo/i,
    methods: {
      list: { match: /^(list|get)/i, description: 'List tasks and task lists' },
      create: { match: /(create|post)/i, description: 'Create tasks or task lists' },
      update: { match: /update/i, description: 'Update tasks' },
      delete: { match: /(delete|remove)/i, description: 'Delete tasks or task lists' },
    },
  },
};

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

function generateToolHandler(pathInfo, method, operation) {
  return async function (params, graphClient) {
    let url = pathInfo;
    const pathParams = pathInfo.match(/\{([^}]+)}/g) || [];

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
              queryParams.push(`${param.name}=${params[param.name]}`);
            }
          } else {
            queryParams.push(`${param.name}=${params[param.name]}`);
          }
        }
      });
    }

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    const options = {
      method: method.toUpperCase(),
    };

    if (method !== 'get' && method !== 'delete' && operation.requestBody) {
      options.body = JSON.stringify(params.body || {});
    }

    return graphClient.graphRequest(url, options);
  };
}

export async function registerDynamicTools(server, graphClient) {
  try {
    logger.info('Loading OpenAPI spec...');
    const openapiContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    const openapi = yaml.load(openapiContent);

    logger.info('Generating dynamic tools...');

    const categoryMap = {};

    for (const [pathInfo, pathData] of Object.entries(openapi.paths)) {
      for (const [method, operation] of Object.entries(pathData)) {
        if (method === 'description' || method === 'parameters') continue;
        if (!operation.operationId) continue;

        let matchedCategory = null;
        let matchedMethod = null;

        for (const [categoryName, categoryConfig] of Object.entries(TOOL_CATEGORIES)) {
          if (categoryConfig.pattern.test(pathInfo)) {
            matchedCategory = categoryName;

            for (const [methodName, methodConfig] of Object.entries(categoryConfig.methods)) {
              if (methodConfig.match.test(operation.operationId)) {
                matchedMethod = methodName;
                break;
              }
            }

            if (!matchedMethod) {
              if (method === 'get') matchedMethod = 'list';
              else if (method === 'post') matchedMethod = 'create';
              else if (method === 'patch' || method === 'put') matchedMethod = 'update';
              else if (method === 'delete') matchedMethod = 'delete';
              else matchedMethod = 'other';
            }

            break;
          }
        }

        if (!matchedCategory) {
          const segments = pathInfo.split('/').filter(Boolean);
          if (segments.length > 0) {
            matchedCategory = segments[segments.length - 1].replace(/[{}]/g, '');
            matchedMethod = method;
          } else {
            matchedCategory = 'other';
            matchedMethod = method;
          }
        }

        if (!categoryMap[matchedCategory]) {
          categoryMap[matchedCategory] = {};
        }

        if (!categoryMap[matchedCategory][matchedMethod]) {
          categoryMap[matchedCategory][matchedMethod] = [];
        }

        categoryMap[matchedCategory][matchedMethod].push({
          pathInfo,
          method,
          operation,
          httpMethod: method,
        });
      }
    }

    let totalTools = 0;

    for (const [categoryName, methodMap] of Object.entries(categoryMap)) {
      for (const [methodName, operations] of Object.entries(methodMap)) {
        if (operations.length === 0) continue;

        const toolName = `ms365-${categoryName}-${methodName}`;
        logger.info(`Creating consolidated tool: ${toolName} with ${operations.length} operations`);

        const paramsSchema = {
          operation: z
            .string()
            .describe(
              `Specific operation to perform within the ${categoryName} ${methodName} category`
            ),
        };

        const allParams = new Map();

        operations.forEach(({ operation, pathInfo }) => {
          const pathParams = pathInfo.match(/\{([^}]+)}/g) || [];
          pathParams.forEach((param) => {
            const paramName = param.slice(1, -1);
            allParams.set(paramName, {
              param: { name: paramName, in: 'path', required: true },
              schema: z.string().describe(`Path parameter: ${paramName}`).optional(),
            });
          });

          if (operation.parameters) {
            operation.parameters.forEach((param) => {
              if (param.in !== 'path' || !pathParams.includes(`{${param.name}}`)) {
                const zodSchema = processParameter(param);
                allParams.set(param.name, { param, schema: zodSchema });
              }
            });
          }
        });

        for (const [paramName, { schema }] of allParams.entries()) {
          paramsSchema[paramName] = schema;
        }

        const needsBody = operations.some(
          ({ httpMethod }) => httpMethod !== 'get' && httpMethod !== 'delete'
        );

        if (needsBody) {
          paramsSchema.body = z
            .object({})
            .passthrough()
            .describe('Request body (for create/update operations)')
            .optional();
        }

        const handler = async (params) => {
          const { operation: selectedOperation, ...restParams } = params;

          const match = operations.find(
            (op) =>
              op.operation.operationId.toLowerCase() === selectedOperation.toLowerCase() ||
              op.operation.summary?.toLowerCase() === selectedOperation.toLowerCase()
          );

          if (!match) {
            const partialMatch = operations.find(
              (op) =>
                op.operation.operationId.toLowerCase().includes(selectedOperation.toLowerCase()) ||
                (op.operation.summary &&
                  op.operation.summary.toLowerCase().includes(selectedOperation.toLowerCase()))
            );

            if (partialMatch) {
              return generateToolHandler(
                partialMatch.pathInfo,
                partialMatch.httpMethod,
                partialMatch.operation
              )(restParams, graphClient);
            }

            const availableOps = operations
              .map((op) => op.operation.operationId || op.operation.summary || 'Unnamed operation')
              .join(', ');

            throw new Error(
              `Operation '${selectedOperation}' not found. Available operations: ${availableOps}`
            );
          }

          return generateToolHandler(
            match.pathInfo,
            match.httpMethod,
            match.operation
          )(restParams, graphClient);
        };

        // TODO: Use?
        const description = getToolDescription(categoryName, methodName);
        server.tool(toolName, paramsSchema, handler);

        totalTools++;
      }
    }

    server.tool(
      'ms365-list-operations',
      {
        category: z
          .string()
          .optional()
          .describe('Filter operations by category (e.g., mail, calendar, files)'),
      },
      async ({ category }) => {
        const result = { categories: {} };

        for (const [catName, methodMap] of Object.entries(categoryMap)) {
          if (category && category.toLowerCase() !== catName.toLowerCase()) continue;

          result.categories[catName] = {};

          for (const [methodName, operations] of Object.entries(methodMap)) {
            result.categories[catName][methodName] = operations.map((op) => ({
              id: op.operation.operationId,
              summary: op.operation.summary || op.operation.operationId,
              path: op.pathInfo,
              method: op.httpMethod.toUpperCase(),
            }));
          }
        }

        return result;
      }
    );

    logger.info(
      `Dynamic tools registration complete. Created ${totalTools + 1} consolidated tools.`
    );
  } catch (error) {
    logger.error('Error registering dynamic tools:', error);
    throw error;
  }
}

function getToolDescription(category, method) {
  if (TOOL_CATEGORIES[category]?.methods[method]?.description) {
    return TOOL_CATEGORIES[category].methods[method].description;
  }

  return `Perform ${method} operations on Microsoft 365 ${category}`;
}

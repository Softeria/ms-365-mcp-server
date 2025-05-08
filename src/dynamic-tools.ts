import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import endpoints from './endpoints.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Re-export endpoints as TARGET_ENDPOINTS for backward compatibility
export const TARGET_ENDPOINTS: any = endpoints;

interface OpenApiSpec {
  paths: {
    [path: string]: {
      [method: string]: {
        parameters?: Array<{
          name: string;
          in: string;
          required?: boolean;
          description?: string;
          schema?: any;
        }>;
        requestBody?: {
          description?: string;
          content?: {
            [contentType: string]: {
              schema?: any;
            };
          };
        };
      };
    };
  };
}

/**
 * Validates that all endpoints in TARGET_ENDPOINTS exist in the OpenAPI spec
 */
export function validateEndpoints(): typeof TARGET_ENDPOINTS {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const openApiPath = path.join(__dirname, '..', 'openapi', 'openapi.yaml');
    const openApiContent = readFileSync(openApiPath, 'utf8');
    const openApiSpec = yaml.load(openApiContent) as OpenApiSpec;

    const missingEndpoints = TARGET_ENDPOINTS.filter((endpoint: any) => {
      const path = openApiSpec.paths[endpoint.pathPattern];
      if (!path) {
        return true;
      }

      const operation = path[endpoint.method];
      if (!operation) {
        return true;
      }

      return false;
    });

    return missingEndpoints;
  } catch (error) {
    logger.warn(`Error validating endpoints: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Registers dynamic tools with the MCP server based on the OpenAPI spec
 */
export async function registerDynamicTools(
  server: McpServer,
  graphClient: GraphClient
): Promise<void> {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const openApiPath = path.join(__dirname, '..', 'openapi', 'openapi.yaml');
    const openApiContent = readFileSync(openApiPath, 'utf8');
    const openApiSpec = yaml.load(openApiContent) as OpenApiSpec;

    for (const endpoint of TARGET_ENDPOINTS) {
      const path = openApiSpec.paths[endpoint.pathPattern];

      if (!path) {
        logger.warn(`Path not found in OpenAPI spec: ${endpoint.pathPattern}`);
        continue;
      }

      const operation = path[endpoint.method];

      if (!operation) {
        logger.warn(`Method ${endpoint.method} not found for path ${endpoint.pathPattern}`);
        continue;
      }

      let paramsSchema: Record<string, z.ZodType> = {};

      const pathParams: string[] = endpoint.pathPattern.match(/\{([^}]+)}/g) || [];
      pathParams.forEach((param) => {
        const paramName = param.slice(1, -1);
        paramsSchema[paramName] = z.string().describe(`Path parameter: ${paramName}`);
      });

      if (operation.parameters) {
        operation.parameters.forEach((param) => {
          if (param.in === 'query' && !pathParams.includes(`{${param.name}}`)) {
            // Use friendly param name (without $ prefix)
            const friendlyName = param.name.startsWith('$') ? param.name.substring(1) : param.name;

            let schema = z.string();
            if (param.description) {
              schema = schema.describe(param.description);
            }
            if (!param.required) {
              paramsSchema[friendlyName] = schema.optional();
            } else {
              paramsSchema[friendlyName] = schema;
            }
          }
        });
      }

      if (['post', 'put', 'patch'].includes(endpoint.method) && operation.requestBody) {
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

      // Add custom parameters for specific endpoints
      if (endpoint.hasCustomParams) {
        if (endpoint.toolName === 'upload-file') {
          paramsSchema.content = z.string().describe('File content to upload');
          paramsSchema.contentType = z
            .string()
            .optional()
            .describe('Content type of the file (e.g., "application/pdf", "image/jpeg")');
        } else if (endpoint.toolName === 'create-folder') {
          paramsSchema.name = z.string().describe('Name of the folder to create');
          paramsSchema.description = z.string().optional().describe('Description of the folder');
        }
      }

      const handler = async (params: Record<string, any>, _extra: any) => {
        let url = endpoint.pathPattern;
        let options: Record<string, any> = {
          method: endpoint.method.toUpperCase(),
        };

        if (endpoint.isExcelOp) {
          if (!params.filePath) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'filePath parameter is required for Excel operations',
                  }),
                },
              ],
            };
          }
          options.excelFile = params.filePath;
        }

        if (endpoint.toolName === 'download-file') {
          options.rawResponse = true;
        }

        pathParams.forEach((param) => {
          const paramName = param.slice(1, -1);
          url = url.replace(param, params[paramName]);
        });

        if (url.includes("range(address='{address}')") && params.address) {
          url = url.replace('{address}', encodeURIComponent(params.address));
        }

        // Fix path formatting for file paths
        if (url.includes('/me/drive/root:/{path}')) {
          url = url.replace('/{path}', '/' + params.path);
          // Ensure we have the correct format with a colon after 'root'
          url = url.replace('/me/drive/root:/', '/me/drive/root:/');
        }

        // Fix content paths
        if (url.includes('/content')) {
          url = url.replace('//content', ':/content');
        }

        const queryParams: string[] = [];

        if (operation.parameters) {
          operation.parameters.forEach((param) => {
            if (param.in === 'query') {
              const friendlyName = param.name.startsWith('$')
                ? param.name.substring(1)
                : param.name;
              if (params[friendlyName] !== undefined) {
                queryParams.push(`${param.name}=${encodeURIComponent(params[friendlyName])}`);
              }
            }
          });
        }

        if (queryParams.length > 0) {
          url += '?' + queryParams.join('&');
        }

        if (endpoint.toolName === 'upload-file' && params.content) {
          options.body = params.content;
          options.headers = {
            'Content-Type': params.contentType || 'application/octet-stream',
          };
        } else if (endpoint.toolName === 'create-folder' && params.name) {
          options.body = JSON.stringify({
            name: params.name,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
            ...(params.description && { description: params.description }),
          });
          options.headers = {
            'Content-Type': 'application/json',
          };
        } else if (['post', 'put', 'patch'].includes(endpoint.method) && params.body) {
          options.body = JSON.stringify(params.body);
        }

        return graphClient.graphRequest(url, options);
      };

      server.tool(endpoint.toolName, paramsSchema, handler as any);
    }
  } catch (error) {
    logger.error(`Error registering dynamic tools: ${(error as Error).message}`);
  }
}

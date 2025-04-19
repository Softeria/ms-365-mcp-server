import { z } from 'zod';
import logger from './logger.mjs';
import {
  loadOpenApiSpec,
  findPathAndOperation,
  buildParameterSchemas,
  buildRequestUrl,
  isMethodWithBody,
} from './openapi-helpers.mjs';

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

  {
    pathPattern: '/workbook/worksheets/{id}/charts/add',
    method: 'post',
    toolName: 'create-chart',
    isExcelOp: true,
  },
  {
    pathPattern: "/workbook/worksheets/{id}/range(address='{address}')/format",
    method: 'patch',
    toolName: 'format-range',
    isExcelOp: true,
  },
  {
    pathPattern: "/workbook/worksheets/{id}/range(address='{address}')/sort/apply",
    method: 'post',
    toolName: 'sort-range',
    isExcelOp: true,
  },
  {
    pathPattern: "/workbook/worksheets/{id}/range(address='{address}')",
    method: 'get',
    toolName: 'get-range',
    isExcelOp: true,
  },
  {
    pathPattern: '/workbook/worksheets',
    method: 'get',
    toolName: 'list-worksheets',
    isExcelOp: true,
  },
];

export async function registerDynamicTools(server, graphClient) {
  try {
    const openapi = loadOpenApiSpec();
    logger.info('Generating dynamic tools from OpenAPI spec...');

    for (const endpoint of TARGET_ENDPOINTS) {
      const result = findPathAndOperation(openapi, endpoint.pathPattern, endpoint.method);
      if (!result) continue;

      const { operation } = result;

      logger.info(
        `Creating tool ${endpoint.toolName} for ${endpoint.method.toUpperCase()} ${endpoint.pathPattern}`
      );

      const paramsSchema = buildParameterSchemas(endpoint, operation);

      const pathParams = endpoint.pathPattern.match(/\{([^}]+)}/g) || [];

      const handler = async (params) => {
        if (endpoint.isExcelOp && !params.filePath) {
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

        const options = {
          method: endpoint.method.toUpperCase(),
        };

        if (endpoint.isExcelOp) {
          options.excelFile = params.filePath;
        }

        const url = buildRequestUrl(
          endpoint.pathPattern,
          params,
          pathParams,
          operation.parameters,
          endpoint.toolName
        );

        if (isMethodWithBody(endpoint.method.toLowerCase()) && params.body) {
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

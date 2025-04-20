import logger from './logger.mjs';
import {
  buildParameterSchemas,
  buildRequestUrl,
  findPathAndOperation,
  isMethodWithBody,
  loadOpenApiSpec,
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
    pathPattern: '/users/{user-id}/drive',
    method: 'get',
    toolName: 'get-user-drive',
  },
  {
    pathPattern: '/drives',
    method: 'get',
    toolName: 'list-drives',
  },
  {
    pathPattern: '/drives/{drive-id}/root',
    method: 'get',
    toolName: 'get-drive-root-item',
  },
  {
    pathPattern: '/drives/{drive-id}/root',
    method: 'get',
    toolName: 'get-root-folder',
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/children',
    method: 'get',
    toolName: 'list-folder-files',
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/children',
    method: 'post',
    toolName: 'create-item-in-folder',
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/children/{driveItem-id1}/content',
    method: 'get',
    toolName: 'download-file-content',
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
    method: 'delete',
    toolName: 'delete-file',
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
    method: 'patch',
    toolName: 'update-file-metadata',
  },
  {
    pathPattern:
      '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/charts/add',
    method: 'post',
    toolName: 'create-chart',
    isExcelOp: true,
  },
  {
    pathPattern:
      '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/range()/format',
    method: 'patch',
    toolName: 'format-range',
    isExcelOp: true,
  },
  {
    pathPattern:
      '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/range()/sort',
    method: 'patch',
    toolName: 'sort-range',
    isExcelOp: true,
  },
  {
    pathPattern:
      "/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/range(address='{address}')",
    method: 'get',
    toolName: 'get-range',
    isExcelOp: true,
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets',
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

        if (endpoint.toolName === 'download-file') {
          options.rawResponse = true;
        }

        const url = buildRequestUrl(endpoint.pathPattern, params, pathParams, operation.parameters);

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
        } else if (isMethodWithBody(endpoint.method.toLowerCase()) && params.body) {
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

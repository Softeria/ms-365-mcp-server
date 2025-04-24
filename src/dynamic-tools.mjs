import logger from './logger.mjs';
import {
  buildParameterSchemas,
  buildRequestUrl,
  findPathAndOperation,
  isMethodWithBody,
  loadOpenApiSpec,
} from './openapi-helpers.mjs';
import { z } from 'zod';

/**
 * Validates all endpoints in TARGET_ENDPOINTS against the OpenAPI spec.
 * Returns an array of endpoints that don't exist in the spec.
 *
 * @returns {Array} Array of missing endpoints
 */
export function validateEndpoints() {
  const openapi = loadOpenApiSpec();
  const missingEndpoints = [];

  for (const endpoint of TARGET_ENDPOINTS) {
    const result = findPathAndOperation(openapi, endpoint.pathPattern, endpoint.method);
    if (!result) {
      missingEndpoints.push({
        toolName: endpoint.toolName,
        pathPattern: endpoint.pathPattern,
        method: endpoint.method,
      });
    }
  }

  return missingEndpoints;
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
    pathPattern: '/me/messages',
    method: 'post',
    toolName: 'send-mail',
  },
  {
    pathPattern: '/me/messages/{message-id}',
    method: 'delete',
    toolName: 'delete-mail-message',
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
    pathPattern: '/me/calendars',
    method: 'get',
    toolName: 'list-calendars',
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

  {
    pathPattern: '/me/joinedTeams',
    method: 'get',
    toolName: 'list-joined-teams',
  },
  {
    pathPattern: '/teams/{team-id}',
    method: 'get',
    toolName: 'get-team',
  },
  {
    pathPattern: '/teams/{team-id}/channels',
    method: 'get',
    toolName: 'list-team-channels',
  },
  {
    pathPattern: '/teams/{team-id}/channels/{channel-id}',
    method: 'get',
    toolName: 'get-channel',
  },
  {
    pathPattern: '/teams/{team-id}/channels/{channel-id}/messages',
    method: 'get',
    toolName: 'list-channel-messages',
  },
  {
    pathPattern: '/teams/{team-id}/channels/{channel-id}/messages',
    method: 'post',
    toolName: 'send-channel-message',
  },
  {
    pathPattern: '/me/chats',
    method: 'get',
    toolName: 'list-chats',
  },
  {
    pathPattern: '/me/chats/{chat-id}/messages',
    method: 'get',
    toolName: 'list-chat-messages',
  },
  {
    pathPattern: '/me/chats/{chat-id}/messages',
    method: 'post',
    toolName: 'send-chat-message',
  },

  {
    pathPattern: '/me/onenote/notebooks',
    method: 'get',
    toolName: 'list-notebooks',
  },
  {
    pathPattern: '/me/onenote/notebooks/{notebook-id}/sections',
    method: 'get',
    toolName: 'list-notebook-sections',
  },
  {
    pathPattern: '/me/onenote/notebooks/{notebook-id}/sections/{onenoteSection-id}/pages',
    method: 'get',
    toolName: 'list-section-pages',
  },
  {
    pathPattern: '/me/onenote/pages/{onenotePage-id}/content',
    method: 'get',
    toolName: 'get-page-content',
  },
  {
    pathPattern: '/me/onenote/pages',
    method: 'post',
    toolName: 'create-page',
  },

  {
    pathPattern: '/me/todo/lists',
    method: 'get',
    toolName: 'list-task-lists',
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks',
    method: 'get',
    toolName: 'list-tasks',
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks/{todoTask-id}',
    method: 'get',
    toolName: 'get-task',
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks',
    method: 'post',
    toolName: 'create-task',
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks/{todoTask-id}',
    method: 'patch',
    toolName: 'update-task',
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks/{todoTask-id}',
    method: 'delete',
    toolName: 'delete-task',
  },

  {
    pathPattern: '/me/planner/tasks',
    method: 'get',
    toolName: 'list-planner-tasks',
  },
  {
    pathPattern: '/planner/plans/{plannerPlan-id}',
    method: 'get',
    toolName: 'get-plan',
  },
  {
    pathPattern: '/planner/plans/{plannerPlan-id}/tasks',
    method: 'get',
    toolName: 'list-plan-tasks',
  },
  {
    pathPattern: '/planner/tasks/{plannerTask-id}',
    method: 'get',
    toolName: 'get-planner-task',
  },
  {
    pathPattern: '/planner/tasks',
    method: 'post',
    toolName: 'create-planner-task',
  },

  {
    pathPattern: '/sites',
    method: 'get',
    toolName: 'list-sites',
  },
  {
    pathPattern: '/sites/{site-id}',
    method: 'get',
    toolName: 'get-site',
  },
  {
    pathPattern: '/sites/{site-id}/lists',
    method: 'get',
    toolName: 'list-site-lists',
  },
  {
    pathPattern: '/sites/{site-id}/lists/{list-id}/items',
    method: 'get',
    toolName: 'list-items',
  },

  {
    pathPattern: '/me/contacts',
    method: 'get',
    toolName: 'list-contacts',
  },
  {
    pathPattern: '/me/contacts/{contact-id}',
    method: 'get',
    toolName: 'get-contact',
  },
  {
    pathPattern: '/me/contacts',
    method: 'post',
    toolName: 'create-contact',
  },
  {
    pathPattern: '/me/contacts/{contact-id}',
    method: 'patch',
    toolName: 'update-contact',
  },
  {
    pathPattern: '/me/contacts/{contact-id}',
    method: 'delete',
    toolName: 'delete-contact',
  },

  {
    pathPattern: '/me',
    method: 'get',
    toolName: 'get-current-user',
  },
  {
    pathPattern: '/users',
    method: 'get',
    toolName: 'list-users',
  },
  {
    pathPattern: '/users/{user-id}',
    method: 'get',
    toolName: 'get-user',
  },
  {
    pathPattern: '/groups',
    method: 'get',
    toolName: 'list-groups',
  },
  {
    pathPattern: '/groups/{group-id}',
    method: 'get',
    toolName: 'get-group',
  },
  {
    pathPattern: '/groups/{group-id}/members',
    method: 'get',
    toolName: 'list-group-members',
  },
];

export async function registerDynamicTools(server, graphClient) {
  try {
    const openapi = loadOpenApiSpec();
    logger.info('Generating dynamic tools from OpenAPI spec...');

    const missingEndpoints = validateEndpoints();
    if (missingEndpoints.length > 0) {
      logger.warn('Some endpoints are missing from the OpenAPI spec:');
      missingEndpoints.forEach((endpoint) => {
        logger.warn(
          `- Tool: ${endpoint.toolName}, Path: ${endpoint.pathPattern}, Method: ${endpoint.method}`
        );
      });
    }

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

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
    scopes: ['Mail.Read'],
  },
  {
    pathPattern: '/me/mailFolders',
    method: 'get',
    toolName: 'list-mail-folders',
    scopes: ['Mail.Read'],
  },
  {
    pathPattern: '/me/mailFolders/{mailFolder-id}/messages',
    method: 'get',
    toolName: 'list-mail-folder-messages',
    scopes: ['Mail.Read'],
  },
  {
    pathPattern: '/me/messages/{message-id}',
    method: 'get',
    toolName: 'get-mail-message',
    scopes: ['Mail.Read'],
  },
  {
    pathPattern: '/me/messages',
    method: 'post',
    toolName: 'send-mail',
    scopes: ['Mail.Send'],
  },
  {
    pathPattern: '/me/messages/{message-id}',
    method: 'delete',
    toolName: 'delete-mail-message',
    scopes: ['Mail.ReadWrite'],
  },

  {
    pathPattern: '/me/events',
    method: 'get',
    toolName: 'list-calendar-events',
    scopes: ['Calendars.Read'],
  },
  {
    pathPattern: '/me/events/{event-id}',
    method: 'get',
    toolName: 'get-calendar-event',
    scopes: ['Calendars.Read'],
  },
  {
    pathPattern: '/me/events',
    method: 'post',
    toolName: 'create-calendar-event',
    scopes: ['Calendars.ReadWrite'],
  },
  {
    pathPattern: '/me/events/{event-id}',
    method: 'patch',
    toolName: 'update-calendar-event',
    scopes: ['Calendars.ReadWrite'],
  },
  {
    pathPattern: '/me/events/{event-id}',
    method: 'delete',
    toolName: 'delete-calendar-event',
    scopes: ['Calendars.ReadWrite'],
  },
  {
    pathPattern: '/me/calendarView',
    method: 'get',
    toolName: 'get-calendar-view',
    scopes: ['Calendars.Read'],
  },
  {
    pathPattern: '/me/calendars',
    method: 'get',
    toolName: 'list-calendars',
    scopes: ['Calendars.Read'],
  },

  {
    pathPattern: '/drives',
    method: 'get',
    toolName: 'list-drives',
    scopes: ['Files.Read'],
  },
  {
    pathPattern: '/drives/{drive-id}/root',
    method: 'get',
    toolName: 'get-drive-root-item',
    scopes: ['Files.Read'],
  },
  {
    pathPattern: '/drives/{drive-id}/root',
    method: 'get',
    toolName: 'get-root-folder',
    scopes: ['Files.Read'],
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/children',
    method: 'get',
    toolName: 'list-folder-files',
    scopes: ['Files.Read'],
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/children',
    method: 'post',
    toolName: 'create-item-in-folder',
    scopes: ['Files.ReadWrite'],
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/children/{driveItem-id1}/content',
    method: 'get',
    toolName: 'download-file-content',
    scopes: ['Files.Read'],
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
    method: 'delete',
    toolName: 'delete-file',
    scopes: ['Files.ReadWrite'],
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}',
    method: 'patch',
    toolName: 'update-file-metadata',
    scopes: ['Files.ReadWrite'],
  },

  {
    pathPattern:
      '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/charts/add',
    method: 'post',
    toolName: 'create-chart',
    isExcelOp: true,
    scopes: ['Files.ReadWrite'],
  },
  {
    pathPattern:
      '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/range()/format',
    method: 'patch',
    toolName: 'format-range',
    isExcelOp: true,
    scopes: ['Files.ReadWrite'],
  },
  {
    pathPattern:
      '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/range()/sort',
    method: 'patch',
    toolName: 'sort-range',
    isExcelOp: true,
    scopes: ['Files.ReadWrite'],
  },
  {
    pathPattern:
      "/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets/{workbookWorksheet-id}/range(address='{address}')",
    method: 'get',
    toolName: 'get-range',
    isExcelOp: true,
    scopes: ['Files.Read'],
  },
  {
    pathPattern: '/drives/{drive-id}/items/{driveItem-id}/workbook/worksheets',
    method: 'get',
    toolName: 'list-worksheets',
    isExcelOp: true,
    scopes: ['Files.Read'],
  },

  {
    pathPattern: '/me/onenote/notebooks',
    method: 'get',
    toolName: 'list-notebooks',
    scopes: ['Notes.Read'],
  },
  {
    pathPattern: '/me/onenote/notebooks/{notebook-id}/sections',
    method: 'get',
    toolName: 'list-notebook-sections',
    scopes: ['Notes.Read'],
  },
  {
    pathPattern: '/me/onenote/notebooks/{notebook-id}/sections/{onenoteSection-id}/pages',
    method: 'get',
    toolName: 'list-section-pages',
    scopes: ['Notes.Read'],
  },
  {
    pathPattern: '/me/onenote/pages/{onenotePage-id}/content',
    method: 'get',
    toolName: 'get-page-content',
    scopes: ['Notes.Read'],
  },
  {
    pathPattern: '/me/onenote/pages',
    method: 'post',
    toolName: 'create-page',
    scopes: ['Notes.Create'],
  },

  {
    pathPattern: '/me/todo/lists',
    method: 'get',
    toolName: 'list-task-lists',
    scopes: ['Tasks.Read'],
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks',
    method: 'get',
    toolName: 'list-tasks',
    scopes: ['Tasks.Read'],
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks/{todoTask-id}',
    method: 'get',
    toolName: 'get-task',
    scopes: ['Tasks.Read'],
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks',
    method: 'post',
    toolName: 'create-task',
    scopes: ['Tasks.ReadWrite'],
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks/{todoTask-id}',
    method: 'patch',
    toolName: 'update-task',
    scopes: ['Tasks.ReadWrite'],
  },
  {
    pathPattern: '/me/todo/lists/{todoTaskList-id}/tasks/{todoTask-id}',
    method: 'delete',
    toolName: 'delete-task',
    scopes: ['Tasks.ReadWrite'],
  },

  {
    pathPattern: '/me/planner/tasks',
    method: 'get',
    toolName: 'list-planner-tasks',
    scopes: ['Group.Read'],
  },
  {
    pathPattern: '/planner/plans/{plannerPlan-id}',
    method: 'get',
    toolName: 'get-plan',
    scopes: ['Group.Read'],
  },
  {
    pathPattern: '/planner/plans/{plannerPlan-id}/tasks',
    method: 'get',
    toolName: 'list-plan-tasks',
    scopes: ['Group.Read'],
  },
  {
    pathPattern: '/planner/tasks/{plannerTask-id}',
    method: 'get',
    toolName: 'get-planner-task',
    scopes: ['Group.Read'],
  },
  {
    pathPattern: '/planner/tasks',
    method: 'post',
    toolName: 'create-planner-task',
    scopes: ['Group.ReadWrite'],
  },

  {
    pathPattern: '/me/contacts',
    method: 'get',
    toolName: 'list-contacts',
    scopes: ['Contacts.Read'],
  },
  {
    pathPattern: '/me/contacts/{contact-id}',
    method: 'get',
    toolName: 'get-contact',
    scopes: ['Contacts.Read'],
  },
  {
    pathPattern: '/me/contacts',
    method: 'post',
    toolName: 'create-contact',
    scopes: ['Contacts.ReadWrite'],
  },
  {
    pathPattern: '/me/contacts/{contact-id}',
    method: 'patch',
    toolName: 'update-contact',
    scopes: ['Contacts.ReadWrite'],
  },
  {
    pathPattern: '/me/contacts/{contact-id}',
    method: 'delete',
    toolName: 'delete-contact',
    scopes: ['Contacts.ReadWrite'],
  },

  {
    pathPattern: '/me',
    method: 'get',
    toolName: 'get-current-user',
    scopes: ['User.Read'],
  },

  {
    pathPattern: '/groups',
    method: 'get',
    toolName: 'list-groups',
    scopes: ['Group.Read'],
  },
  {
    pathPattern: '/groups/{group-id}',
    method: 'get',
    toolName: 'get-group',
    scopes: ['Group.Read'],
  },
  {
    pathPattern: '/groups/{group-id}/members',
    method: 'get',
    toolName: 'list-group-members',
    scopes: ['Group.Read'],
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

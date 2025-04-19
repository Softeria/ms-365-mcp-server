import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mock yaml content'),
}));

vi.mock('js-yaml', () => ({
  load: vi.fn(),
}));

vi.mock('../src/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { TARGET_ENDPOINTS } from '../src/dynamic-tools.mjs';

async function testRegisterDynamicTools(server, graphClient, mockOpenApiSpec) {
  for (const endpoint of TARGET_ENDPOINTS) {
    const path = mockOpenApiSpec.paths[endpoint.pathPattern];

    if (!path) {
      continue;
    }

    const operation = path[endpoint.method];

    if (!operation) {
      continue;
    }

    const paramsSchema = {};

    const pathParams = endpoint.pathPattern.match(/\{([^}]+)}/g) || [];
    pathParams.forEach((param) => {
      const paramName = param.slice(1, -1);
      paramsSchema[paramName] = z.string().describe(`Path parameter: ${paramName}`);
    });

    if (operation.parameters) {
      operation.parameters.forEach((param) => {
        if (param.in === 'query' && !pathParams.includes(`{${param.name}}`)) {
          let schema = z.string();
          if (param.description) {
            schema = schema.describe(param.description);
          }
          if (!param.required) {
            schema = schema.optional();
          }
          paramsSchema[param.name] = schema;
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

    const handler = async (params) => {
      let url = endpoint.pathPattern;
      let options = {};

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
        options = {
          method: endpoint.method.toUpperCase(),
          excelFile: params.filePath,
        };
      } else {
        options = {
          method: endpoint.method.toUpperCase(),
        };
      }

      pathParams.forEach((param) => {
        const paramName = param.slice(1, -1);
        url = url.replace(param, params[paramName]);
      });

      if (url.includes("range(address='{address}')") && params.address) {
        url = url.replace('{address}', encodeURIComponent(params.address));
      }

      const queryParams = [];

      if (operation.parameters) {
        operation.parameters.forEach((param) => {
          if (param.in === 'query' && params[param.name] !== undefined) {
            queryParams.push(`${param.name}=${encodeURIComponent(params[param.name])}`);
          }
        });
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      if (['post', 'put', 'patch'].includes(endpoint.method) && params.body) {
        options.body = JSON.stringify(params.body);
      }

      return graphClient.graphRequest(url, options);
    };

    server.tool(endpoint.toolName, paramsSchema, handler);
  }
}

const MOCK_OPENAPI_SPEC = {
  paths: {
    '/me/messages': {
      get: {
        parameters: [{ name: '$filter', in: 'query', schema: { type: 'string' } }],
      },
    },
    '/me/mailFolders': { get: {} },
    '/me/mailFolders/{mailFolder-id}/messages': { get: {} },
    '/me/messages/{message-id}': { get: {} },
    '/me/events': {
      get: {
        parameters: [
          {
            name: '$select',
            in: 'query',
            description: 'Select properties to be returned',
            schema: { type: 'string' },
          },
          {
            name: '$filter',
            in: 'query',
            description: 'Filter items by property values',
            schema: { type: 'string' },
          },
        ],
      },
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    },
    '/me/events/{event-id}': {
      get: {},
      patch: {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
      delete: {},
    },
    '/me/calendarView': {
      get: {
        parameters: [
          {
            name: 'startDateTime',
            in: 'query',
            required: true,
            description: 'The start date and time of the view window',
            schema: { type: 'string' },
          },
          {
            name: 'endDateTime',
            in: 'query',
            required: true,
            description: 'The end date and time of the view window',
            schema: { type: 'string' },
          },
        ],
      },
    },
    '/workbook/worksheets/{id}/charts/add': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    },
    "/workbook/worksheets/{id}/range(address='{address}')/format": {
      patch: {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    },
    "/workbook/worksheets/{id}/range(address='{address}')/sort/apply": {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    },
    "/workbook/worksheets/{id}/range(address='{address}')": {
      get: {},
    },
    '/workbook/worksheets': {
      get: {},
    },
  },
};

describe('Dynamic Tools Calendar Tools', () => {
  let mockServer;
  let registeredTools;
  let mockGraphClient;

  beforeEach(() => {
    vi.clearAllMocks();

    registeredTools = {};

    mockServer = {
      tool: vi.fn((name, schema, handler) => {
        registeredTools[name] = { schema, handler };
      }),
    };

    mockGraphClient = {
      graphRequest: vi.fn(),
    };
  });

  it('should register all calendar tools with the correct schemas', async () => {
    const calendarEndpoints = TARGET_ENDPOINTS.filter(
      (endpoint) =>
        endpoint.pathPattern.includes('/events') || endpoint.pathPattern.includes('/calendarView')
    );

    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    calendarEndpoints.forEach((endpoint) => {
      expect(mockServer.tool).toHaveBeenCalledWith(
        endpoint.toolName,
        expect.any(Object),
        expect.any(Function)
      );

      expect(registeredTools).toHaveProperty(endpoint.toolName);
    });

    const listEventsSchema = registeredTools['list-calendar-events'].schema;
    expect(listEventsSchema).toHaveProperty('$select');
    expect(listEventsSchema).toHaveProperty('$filter');

    const createEventSchema = registeredTools['create-calendar-event'].schema;
    expect(createEventSchema).toHaveProperty('body');

    const updateEventSchema = registeredTools['update-calendar-event'].schema;
    expect(updateEventSchema).toHaveProperty('event-id');
    expect(updateEventSchema).toHaveProperty('body');

    const deleteEventSchema = registeredTools['delete-calendar-event'].schema;
    expect(deleteEventSchema).toHaveProperty('event-id');

    const calendarViewSchema = registeredTools['get-calendar-view'].schema;
    expect(calendarViewSchema).toHaveProperty('startDateTime');
    expect(calendarViewSchema).toHaveProperty('endDateTime');
  });

  it('should create handlers that correctly process path parameters', async () => {
    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    const getEventHandler = registeredTools['get-calendar-event'].handler;

    await getEventHandler.call(null, { 'event-id': '123456' });

    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      '/me/events/123456',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should create handlers that correctly handle POST requests with body', async () => {
    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    const createEventHandler = registeredTools['create-calendar-event'].handler;

    const testEvent = {
      body: {
        subject: 'Test Event',
        start: { dateTime: '2023-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2023-01-01T11:00:00', timeZone: 'UTC' },
      },
    };

    await createEventHandler.call(null, testEvent);

    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      '/me/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(testEvent.body),
      })
    );
  });

  it('should create handlers that correctly process query parameters', async () => {
    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    const calendarViewHandler = registeredTools['get-calendar-view'].handler;

    await calendarViewHandler.call(null, {
      startDateTime: '2023-01-01T00:00:00Z',
      endDateTime: '2023-01-31T23:59:59Z',
    });

    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      '/me/calendarView?startDateTime=2023-01-01T00%3A00%3A00Z&endDateTime=2023-01-31T23%3A59%3A59Z',
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('Dynamic Tools Excel Tools', () => {
  let mockServer;
  let registeredTools;
  let mockGraphClient;

  beforeEach(() => {
    vi.clearAllMocks();

    registeredTools = {};

    mockServer = {
      tool: vi.fn((name, schema, handler) => {
        registeredTools[name] = { schema, handler };
      }),
    };

    mockGraphClient = {
      graphRequest: vi.fn(),
    };
  });

  it('should register all Excel tools with the correct schemas', async () => {
    const excelEndpoints = TARGET_ENDPOINTS.filter((endpoint) => endpoint.isExcelOp);

    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    excelEndpoints.forEach((endpoint) => {
      expect(mockServer.tool).toHaveBeenCalledWith(
        endpoint.toolName,
        expect.any(Object),
        expect.any(Function)
      );

      expect(registeredTools).toHaveProperty(endpoint.toolName);
    });

    // Check that all Excel operations have filePath parameter
    const excelTools = [
      'list-worksheets',
      'get-range',
      'format-range',
      'sort-range',
      'create-chart',
    ];
    excelTools.forEach((toolName) => {
      expect(registeredTools[toolName].schema).toHaveProperty('filePath');
    });

    // Check that range operations have address parameter
    const rangeOps = ['get-range', 'format-range', 'sort-range'];
    rangeOps.forEach((toolName) => {
      expect(registeredTools[toolName].schema).toHaveProperty('address');
    });

    // Check that POST/PATCH operations have body parameter
    const writeOps = ['create-chart', 'format-range', 'sort-range'];
    writeOps.forEach((toolName) => {
      expect(registeredTools[toolName].schema).toHaveProperty('body');
    });
  });

  it('should handle Excel operations correctly', async () => {
    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    // Test get-range handler
    const getRangeHandler = registeredTools['get-range'].handler;
    await getRangeHandler.call(null, {
      filePath: '/test.xlsx',
      id: 'Sheet1',
      address: 'A1:C10',
    });

    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      expect.stringMatching(/\/workbook\/worksheets\/Sheet1\/range\(address=\'.*'\)/),
      expect.objectContaining({
        method: 'GET',
        excelFile: '/test.xlsx',
      })
    );

    // Test format-range handler
    const formatRangeHandler = registeredTools['format-range'].handler;
    await formatRangeHandler.call(null, {
      filePath: '/test.xlsx',
      id: 'Sheet1',
      address: 'A1:C10',
      body: {
        bold: true,
        fontColor: '#FF0000',
      },
    });

    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      expect.stringMatching(/\/workbook\/worksheets\/Sheet1\/range\(address=\'.*'\)\/format/),
      expect.objectContaining({
        method: 'PATCH',
        excelFile: '/test.xlsx',
        body: JSON.stringify({
          bold: true,
          fontColor: '#FF0000',
        }),
      })
    );
  });
});

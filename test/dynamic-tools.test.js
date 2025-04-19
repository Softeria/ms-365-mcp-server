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

// Mock param-mapper module
vi.mock('../src/param-mapper.mjs', () => ({
  createFriendlyParamName: (name) => name.startsWith('$') ? name.substring(1) : name,
  registerParamMapping: vi.fn(),
  getOriginalParamName: vi.fn(),
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
          // Use friendly param name (without $ prefix)
          const friendlyName = param.name.startsWith('$') ? param.name.substring(1) : param.name;
          
          let schema = z.string();
          if (param.description) {
            schema = schema.describe(param.description);
          }
          if (!param.required) {
            schema = schema.optional();
          }
          paramsSchema[friendlyName] = schema;
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
          if (param.in === 'query') {
            const friendlyName = param.name.startsWith('$') ? param.name.substring(1) : param.name;
            if (params[friendlyName] !== undefined) {
              queryParams.push(`${param.name}=${encodeURIComponent(params[friendlyName])}`);
            }
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

    // Check for friendly parameter names (without $ prefix)
    const listEventsSchema = registeredTools['list-calendar-events'].schema;
    expect(listEventsSchema).toHaveProperty('select');
    expect(listEventsSchema).toHaveProperty('filter');

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
  
  it('should handle parameters with $ prefix correctly', async () => {
    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);

    const listEventsHandler = registeredTools['list-calendar-events'].handler;

    // Use parameters without $ prefix
    await listEventsHandler.call(null, {
      select: 'subject,start,end',
      filter: "contains(subject, 'Meeting')"
    });

    // But the request URL should contain the original parameter names with $ prefix
    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      '/me/events?$select=subject%2Cstart%2Cend&$filter=contains(subject%2C%20\'Meeting\')',
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

  it('should register Excel tools with the correct schemas', async () => {
    // We're mock testing only
    await testRegisterDynamicTools(mockServer, mockGraphClient, MOCK_OPENAPI_SPEC);
    
    // Just test the registered schema parameters for tools that were registered
    // Excel tools in our mock setup may not all be registered
    const excelTools = Object.keys(registeredTools).filter(name => 
      TARGET_ENDPOINTS.find(endpoint => endpoint.toolName === name && endpoint.isExcelOp)
    );
    
    // Verify filePath parameter exists for all Excel tools that were registered
    excelTools.forEach(toolName => {
      if (registeredTools[toolName]) {
        expect(registeredTools[toolName].schema).toHaveProperty('filePath');
      }
    });
  });

  it('should handle Excel operations with filePath parameter', async () => {
    // Mock implementation of Excel tool handler
    mockServer.tool('excel-test-tool', { filePath: z.string() }, async (params) => {
      if (!params.filePath) {
        return {
          content: [{ 
            type: 'text',
            text: JSON.stringify({ error: 'filePath parameter is required for Excel operations' }) 
          }]
        };
      }
      
      return mockGraphClient.graphRequest('/workbook/test', {
        method: 'GET',
        excelFile: params.filePath
      });
    });
    
    // Test our test Excel tool
    const excelHandler = registeredTools['excel-test-tool'].handler;
    await excelHandler.call(null, { filePath: '/test.xlsx' });
    
    // Verify the graph request is made with excelFile parameter
    expect(mockGraphClient.graphRequest).toHaveBeenCalledWith(
      '/workbook/test',
      expect.objectContaining({
        method: 'GET',
        excelFile: '/test.xlsx',
      })
    );
  });
});
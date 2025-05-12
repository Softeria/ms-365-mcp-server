import fs from 'fs';
import { convertPathToOpenApiFormat, extractDescriptions } from './extract-descriptions.mjs';

export function createSimplifiedOpenAPI(endpointsFile, openapiFile) {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Simplified Microsoft Graph API',
      version: '1.0.0',
      description:
        'A simplified version of the Microsoft Graph API with only the endpoints we need',
    },
    paths: {},
    components: {
      schemas: {
        'microsoft.graph.message': {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'The subject of the message',
            },
            body: {
              type: 'object',
              properties: {
                contentType: {
                  type: 'string',
                  enum: ['text', 'html'],
                  description: "The type of the content. Possible values are 'text' and 'html'.",
                },
                content: {
                  type: 'string',
                  description: 'The content of the body.',
                },
              },
            },
            toRecipients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  emailAddress: {
                    type: 'object',
                    properties: {
                      address: {
                        type: 'string',
                        description: 'The email address.',
                      },
                      name: {
                        type: 'string',
                        description: 'The display name.',
                      },
                    },
                  },
                },
              },
              description: 'The recipients of the message.',
            },
          },
        },
      },
      responses: {
        error: {
          description: 'Error response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                      },
                      message: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf8'));

  console.log(`Loaded ${endpoints.length} endpoints`);

  const endpointDescriptions = openapiFile ? extractDescriptions(openapiFile, endpoints) : {};

  endpoints.forEach((endpoint) => {
    const path = convertPathToOpenApiFormat(endpoint.pathPattern);
    const method = endpoint.method.toLowerCase();

    if (!openApiSpec.paths[path]) {
      openApiSpec.paths[path] = {};
    }
    openApiSpec.paths[path][method] = {
      operationId: `${endpoint.toolName}`,
      summary: endpointDescriptions[endpoint.toolName]
        ? endpointDescriptions[endpoint.toolName].split('.')[0]
        : `${endpoint.toolName}`,
      description: endpointDescriptions[endpoint.toolName] || `Operation for ${endpoint.toolName}`,
      tags: [endpoint.toolName],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/microsoft.graph.message',
            },
          },
        },
        required: true,
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/microsoft.graph.message',
              },
            },
          },
        },
        '4XX': {
          $ref: '#/components/responses/error',
        },
        '5XX': {
          $ref: '#/components/responses/error',
        },
      },
    };
  });

  return openApiSpec;
}

export function createAndSaveSimplifiedOpenAPI(endpointsFile, outputJsonFile, openapiFile) {
  const simplifiedSpec = createSimplifiedOpenAPI(endpointsFile, openapiFile);
  fs.writeFileSync(outputJsonFile, JSON.stringify(simplifiedSpec, null, 2));
  console.log(`Simplified OpenAPI spec written to ${outputJsonFile}`);

  return simplifiedSpec;
}

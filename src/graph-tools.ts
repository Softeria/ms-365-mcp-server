import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import { api } from './generated/client.js';
import { z } from 'zod';

type TextContent = {
  type: 'text';
  text: string;
  [key: string]: unknown;
};

type ImageContent = {
  type: 'image';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type AudioContent = {
  type: 'audio';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type ResourceTextContent = {
  type: 'resource';
  resource: {
    text: string;
    uri: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResourceBlobContent = {
  type: 'resource';
  resource: {
    blob: string;
    uri: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResourceContent = ResourceTextContent | ResourceBlobContent;

type ContentItem = TextContent | ImageContent | AudioContent | ResourceContent;

interface CallToolResult {
  content: ContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;

  [key: string]: unknown;
}

export function registerGraphTools(
  server: McpServer,
  graphClient: GraphClient,
  readOnly: boolean = false
): void {
  for (const tool of api.endpoints) {
    if (readOnly && tool.method.toUpperCase() !== 'GET') {
      logger.info(`Skipping write operation ${tool.alias} in read-only mode`);
      continue;
    }

    const paramSchema: Record<string, any> = {};
    if (tool.parameters && tool.parameters.length > 0) {
      for (const param of tool.parameters) {
        // Use z.any() as a fallback schema if the parameter schema is not specified
        paramSchema[param.name] = param.schema || z.any();
      }
    }

    server.tool(
      tool.alias,
      tool.description ?? '',
      paramSchema,
      {
        title: tool.alias,
        readOnlyHint: tool.method.toUpperCase() === 'GET',
      },
      async (params, extra) => {
        logger.info(`Tool ${tool.alias} called with params: ${JSON.stringify(params)}`);
        try {
          logger.info(`params: ${JSON.stringify(params)}`);

          const parameterDefinitions = tool.parameters || [];

          let path = tool.path;
          const queryParams: Record<string, string> = {};
          const headers: Record<string, string> = {};
          let body: any = null;
          for (let [paramName, paramValue] of Object.entries(params)) {
            // Ok, so, MCP clients (such as claude code) doesn't support $ in parameter names,
            // and others might not support __, so we strip them in hack.ts and restore them here
            const odataParams = [
              'filter',
              'select',
              'expand',
              'orderby',
              'skip',
              'top',
              'count',
              'search',
              'format',
            ];
            const fixedParamName = odataParams.includes(paramName.toLowerCase())
              ? `$${paramName.toLowerCase()}`
              : paramName;
            const paramDef = parameterDefinitions.find((p) => p.name === paramName);

            if (paramDef) {
              switch (paramDef.type) {
                case 'Path':
                  path = path
                    .replace(`{${paramName}}`, encodeURIComponent(paramValue as string))
                    .replace(`:${paramName}`, encodeURIComponent(paramValue as string));
                  break;

                case 'Query':
                  queryParams[fixedParamName] = `${paramValue}`;
                  break;

                case 'Body':
                  body = paramValue;
                  break;

                case 'Header':
                  headers[fixedParamName] = `${paramValue}`;
                  break;
              }
            } else if (paramName === 'body') {
              body = paramValue;
              logger.info(`Set legacy body param: ${JSON.stringify(body)}`);
            }
          }

          if (Object.keys(queryParams).length > 0) {
            const queryString = Object.entries(queryParams)
              .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
              .join('&');
            path = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
          }

          const options: any = {
            method: tool.method.toUpperCase(),
            headers,
          };

          if (options.method !== 'GET' && body) {
            options.body = JSON.stringify(body);
          }

          logger.info(`Making graph request to ${path} with options: ${JSON.stringify(options)}`);
          const response = await graphClient.graphRequest(path, options);

          if (response && response.content && response.content.length > 0) {
            const responseText = response.content[0].text;
            const responseSize = responseText.length;
            logger.info(`Response size: ${responseSize} characters`);

            try {
              const jsonResponse = JSON.parse(responseText);
              if (jsonResponse.value && Array.isArray(jsonResponse.value)) {
                logger.info(`Response contains ${jsonResponse.value.length} items`);
                if (jsonResponse.value.length > 0 && jsonResponse.value[0].body) {
                  logger.info(
                    `First item has body field with size: ${JSON.stringify(jsonResponse.value[0].body).length} characters`
                  );
                }
              }
              if (jsonResponse['@odata.nextLink']) {
                logger.info(`Response has pagination nextLink: ${jsonResponse['@odata.nextLink']}`);
              }
              const preview = responseText.substring(0, 500);
              logger.info(`Response preview: ${preview}${responseText.length > 500 ? '...' : ''}`);
            } catch (e) {
              const preview = responseText.substring(0, 500);
              logger.info(
                `Response preview (non-JSON): ${preview}${responseText.length > 500 ? '...' : ''}`
              );
            }
          }

          // Convert McpResponse to CallToolResult with the correct structure
          const content: ContentItem[] = response.content.map((item) => {
            // GraphClient only returns text content items, so create proper TextContent items
            const textContent: TextContent = {
              type: 'text',
              text: item.text,
            };
            return textContent;
          });

          const result: CallToolResult = {
            content,
            _meta: response._meta,
            isError: response.isError,
          };

          return result;
        } catch (error) {
          logger.error(`Error in tool ${tool.alias}: ${(error as Error).message}`);
          const errorContent: TextContent = {
            type: 'text',
            text: JSON.stringify({
              error: `Error in tool ${tool.alias}: ${(error as Error).message}`,
            }),
          };

          return {
            content: [errorContent],
            isError: true,
          };
        }
      }
    );
  }
}

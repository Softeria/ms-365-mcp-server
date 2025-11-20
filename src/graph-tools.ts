import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import { api } from './generated/client.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EndpointConfig {
  pathPattern: string;
  method: string;
  toolName: string;
  scopes?: string[];
  workScopes?: string[];
  returnDownloadUrl?: boolean;
  supportsTimezone?: boolean;
  llmTip?: string;
}

const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as EndpointConfig[];

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
  readOnly: boolean = false,
  enabledToolsPattern?: string,
  orgMode: boolean = false
): void {
  let enabledToolsRegex: RegExp | undefined;
  if (enabledToolsPattern) {
    try {
      enabledToolsRegex = new RegExp(enabledToolsPattern, 'i');
      logger.info(`Tool filtering enabled with pattern: ${enabledToolsPattern}`);
    } catch {
      logger.error(`Invalid tool filter regex pattern: ${enabledToolsPattern}. Ignoring filter.`);
    }
  }

  // Register utility tool: get today's date
  server.tool(
    'get-todays-date',
    'Get today\'s date in ISO 8601 format (YYYY-MM-DD) or with additional formatting options',
    {
      format: z
        .enum(['iso', 'full', 'long', 'medium', 'short'])
        .describe('Date format: iso (YYYY-MM-DD), full, long, medium, or short')
        .optional()
        .default('iso'),
      timezone: z
        .string()
        .describe('Timezone name (e.g., "America/New_York", "Europe/London"). Defaults to system timezone.')
        .optional(),
    },
    {
      title: 'Get Today\'s Date',
      readOnlyHint: true,
    },
    async (params) => {
      try {
        const format = params.format || 'iso';
        const timezone = params.timezone as string | undefined;

        let date: Date;
        if (timezone) {
          // Get date in specified timezone
          const dateString = new Date().toLocaleString('en-US', { timeZone: timezone });
          date = new Date(dateString);
        } else {
          date = new Date();
        }

        let formattedDate: string;
        switch (format) {
          case 'iso':
            formattedDate = date.toISOString().split('T')[0];
            break;
          case 'full':
            formattedDate = date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: timezone,
            });
            break;
          case 'long':
            formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: timezone,
            });
            break;
          case 'medium':
            formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: timezone,
            });
            break;
          case 'short':
            formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              timeZone: timezone,
            });
            break;
          default:
            formattedDate = date.toISOString().split('T')[0];
        }

        const result = {
          date: formattedDate,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }),
          timestamp: date.toISOString(),
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        const textContent: TextContent = {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        };

        return {
          content: [textContent],
        };
      } catch (error) {
        logger.error(`Error in get_todays_date tool: ${(error as Error).message}`);
        const errorContent: TextContent = {
          type: 'text',
          text: JSON.stringify({
            error: `Error getting today's date: ${(error as Error).message}`,
          }),
        };

        return {
          content: [errorContent],
          isError: true,
        };
      }
    }
  );

  for (const tool of api.endpoints) {
    const endpointConfig = endpointsData.find((e) => e.toolName === tool.alias);
    if (!orgMode && endpointConfig && !endpointConfig.scopes && endpointConfig.workScopes) {
      logger.info(`Skipping work account tool ${tool.alias} - not in org mode`);
      continue;
    }

    if (readOnly && tool.method.toUpperCase() !== 'GET') {
      logger.info(`Skipping write operation ${tool.alias} in read-only mode`);
      continue;
    }

    if (enabledToolsRegex && !enabledToolsRegex.test(tool.alias)) {
      logger.info(`Skipping tool ${tool.alias} - doesn't match filter pattern`);
      continue;
    }

    const paramSchema: Record<string, unknown> = {};
    if (tool.parameters && tool.parameters.length > 0) {
      for (const param of tool.parameters) {
        paramSchema[param.name] = param.schema || z.any();
      }
    }

    if (tool.method.toUpperCase() === 'GET' && tool.path.includes('/')) {
      paramSchema['fetchAllPages'] = z
        .boolean()
        .describe('Automatically fetch all pages of results')
        .optional();
    }

    // Add includeHeaders parameter for all tools to capture ETags and other headers
    paramSchema['includeHeaders'] = z
      .boolean()
      .describe('Include response headers (including ETag) in the response metadata')
      .optional();

    // Add excludeResponse parameter to only return success/failure indication
    paramSchema['excludeResponse'] = z
      .boolean()
      .describe('Exclude the full response body and only return success or failure indication')
      .optional();

    // Add timezone parameter for calendar endpoints that support it
    if (endpointConfig?.supportsTimezone) {
      paramSchema['timezone'] = z
        .string()
        .describe(
          'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo") for calendar event times. If not specified, times are returned in UTC.'
        )
        .optional();
    }

    // Build the tool description, optionally appending LLM tips
    let toolDescription =
      tool.description || `Execute ${tool.method.toUpperCase()} request to ${tool.path}`;
    if (endpointConfig?.llmTip) {
      toolDescription += `\n\n💡 TIP: ${endpointConfig.llmTip}`;
    }

    server.tool(
      tool.alias,
      toolDescription,
      paramSchema,
      {
        title: tool.alias,
        readOnlyHint: tool.method.toUpperCase() === 'GET',
      },
      async (params) => {
        logger.info(`Tool ${tool.alias} called with params: ${JSON.stringify(params)}`);
        try {
          logger.info(`params: ${JSON.stringify(params)}`);

          const parameterDefinitions = tool.parameters || [];

          let path = tool.path;
          const queryParams: Record<string, string> = {};
          const headers: Record<string, string> = {};
          let body: unknown = null;

          for (let [paramName, paramValue] of Object.entries(params)) {
            // Skip pagination control parameter - it's not part of the Microsoft Graph API - I think 🤷
            if (paramName === 'fetchAllPages') {
              continue;
            }

            // Skip headers control parameter - it's not part of the Microsoft Graph API
            if (paramName === 'includeHeaders') {
              continue;
            }

            // Skip excludeResponse control parameter - it's not part of the Microsoft Graph API
            if (paramName === 'excludeResponse') {
              continue;
            }

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
                  if (paramDef.schema) {
                    const parseResult = paramDef.schema.safeParse(paramValue);
                    if (!parseResult.success) {
                      const wrapped = { [paramName]: paramValue };
                      const wrappedResult = paramDef.schema.safeParse(wrapped);
                      if (wrappedResult.success) {
                        logger.info(
                          `Auto-corrected parameter '${paramName}': AI passed nested field directly, wrapped it as {${paramName}: ...}`
                        );
                        body = wrapped;
                      } else {
                        body = paramValue;
                      }
                    } else {
                      body = paramValue;
                    }
                  } else {
                    body = paramValue;
                  }
                  break;

                case 'Header':
                  headers[fixedParamName] = `${paramValue}`;
                  break;
              }
            } else if (paramName === 'body') {
              body = paramValue;
              logger.info(`Set body param: ${JSON.stringify(body)}`);
            }
          }

          // Handle timezone parameter for calendar endpoints
          if (endpointConfig?.supportsTimezone && params.timezone) {
            headers['Prefer'] = `outlook.timezone="${params.timezone}"`;
            logger.info(`Setting timezone header: Prefer: outlook.timezone="${params.timezone}"`);
          }

          if (Object.keys(queryParams).length > 0) {
            const queryString = Object.entries(queryParams)
              .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
              .join('&');
            path = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
          }

          const options: {
            method: string;
            headers: Record<string, string>;
            body?: string;
            rawResponse?: boolean;
            includeHeaders?: boolean;
            excludeResponse?: boolean;
          } = {
            method: tool.method.toUpperCase(),
            headers,
          };

          if (options.method !== 'GET' && body) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
          }

          const isProbablyMediaContent =
            tool.errors?.some((error) => error.description === 'Retrieved media content') ||
            path.endsWith('/content');

          if (endpointConfig?.returnDownloadUrl && path.endsWith('/content')) {
            path = path.replace(/\/content$/, '');
            logger.info(
              `Auto-returning download URL for ${tool.alias} (returnDownloadUrl=true in endpoints.json)`
            );
          } else if (isProbablyMediaContent) {
            options.rawResponse = true;
          }

          // Set includeHeaders if requested
          if (params.includeHeaders === true) {
            options.includeHeaders = true;
          }

          // Set excludeResponse if requested
          if (params.excludeResponse === true) {
            options.excludeResponse = true;
          }

          logger.info(`Making graph request to ${path} with options: ${JSON.stringify(options)}`);
          let response = await graphClient.graphRequest(path, options);

          const fetchAllPages = params.fetchAllPages === true;
          if (fetchAllPages && response && response.content && response.content.length > 0) {
            try {
              let combinedResponse = JSON.parse(response.content[0].text);
              let allItems = combinedResponse.value || [];
              let nextLink = combinedResponse['@odata.nextLink'];
              let pageCount = 1;

              while (nextLink) {
                logger.info(`Fetching page ${pageCount + 1} from: ${nextLink}`);

                const url = new URL(nextLink);
                const nextPath = url.pathname.replace('/v1.0', '');
                const nextOptions = { ...options };

                const nextQueryParams: Record<string, string> = {};
                for (const [key, value] of url.searchParams.entries()) {
                  nextQueryParams[key] = value;
                }
                nextOptions.queryParams = nextQueryParams;

                const nextResponse = await graphClient.graphRequest(nextPath, nextOptions);
                if (nextResponse && nextResponse.content && nextResponse.content.length > 0) {
                  const nextJsonResponse = JSON.parse(nextResponse.content[0].text);
                  if (nextJsonResponse.value && Array.isArray(nextJsonResponse.value)) {
                    allItems = allItems.concat(nextJsonResponse.value);
                  }
                  nextLink = nextJsonResponse['@odata.nextLink'];
                  pageCount++;

                  if (pageCount > 100) {
                    logger.warn(`Reached maximum page limit (100) for pagination`);
                    break;
                  }
                } else {
                  break;
                }
              }

              combinedResponse.value = allItems;
              if (combinedResponse['@odata.count']) {
                combinedResponse['@odata.count'] = allItems.length;
              }
              delete combinedResponse['@odata.nextLink'];

              response.content[0].text = JSON.stringify(combinedResponse);

              logger.info(
                `Pagination complete: collected ${allItems.length} items across ${pageCount} pages`
              );
            } catch (e) {
              logger.error(`Error during pagination: ${e}`);
            }
          }

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
            } catch {
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

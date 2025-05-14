import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import { api } from './generated/client.js';

export function registerGraphTools(server: McpServer, graphClient: GraphClient): void {
  for (const tool of api.endpoints) {
    server.tool(
      tool.alias,
      tool.description ?? '',
      tool.parameters?.reduce((o: any, param) => {
        o[param.name] = param.schema;
        return o;
      }, {}) ?? {},
      (params: any) => {
        logger.info(`Tool ${tool.alias} called with params: ${JSON.stringify(params)}`);
        try {
          logger.info(`params: ${JSON.stringify(params)}`);

          const parameterDefinitions = tool.parameters || [];

          let path = tool.path;
          const queryParams: Record<string, string> = {};
          const headers: Record<string, string> = {};
          let body: any = null;
          for (let [paramName, paramValue] of Object.entries(params)) {
            const fixedParamName = paramName.replace(/__/g, '$');
            const paramDef = parameterDefinitions.find((p) => p.name === paramName);

            if (paramDef) {
              switch (paramDef.type) {
                case 'Path':
                  path = path.replace(`{${paramName}}`, encodeURIComponent(paramValue as string))
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
          return graphClient.graphRequest(path, options);
        } catch (error) {
          logger.error(`Error in tool ${tool.alias}: ${(error as Error).message}`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Error in tool ${tool.alias}: ${(error as Error).message}`,
                }),
              },
            ],
          };
        }
      }
    );
  }
}

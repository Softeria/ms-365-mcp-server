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
          if (Array.isArray(params)) {
            for (const parameter of params) {
              // We need a hack since MCP won't support $ in parameter names
              parameter.name = parameter.name.replace(/__/g, '$');
            }
          } else {
            params = [params];
          }

          let body = params?.find((p: any) => p.body)?.body;
          if (body?.body) body = body.body;

          const options: any = {
            method: tool.method.toUpperCase(),
          };
          if (options.method !== 'GET') {
            options.body = body ? JSON.stringify(body) : JSON.stringify(params);
          }
          return graphClient.graphRequest(tool.path, options);
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

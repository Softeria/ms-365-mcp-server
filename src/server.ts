import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import GraphClient from './graph-client.js';
import AuthManager from './auth.js';
import type { CommandOptions } from './cli.ts';
import { api } from './generated/client.js';

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient;
  private server: McpServer | null;

  constructor(authManager: AuthManager, options: CommandOptions = {}) {
    this.authManager = authManager;
    this.options = options;
    this.graphClient = new GraphClient(authManager);
    this.server = null;
  }

  async initialize(version: string): Promise<void> {
    this.server = new McpServer({
      name: 'Microsoft365MCP',
      version,
    });

    registerAuthTools(this.server, this.authManager);

    for (const tool of api.endpoints) {
      this.server.tool(
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
            return this.graphClient.graphRequest(tool.path, options);
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

  async start(): Promise<void> {
    if (this.options.v) {
      enableConsoleLogging();
    }

    logger.info('Microsoft 365 MCP Server starting...');

    const transport = new StdioServerTransport();
    await this.server!.connect(transport);
    logger.info('Server connected to transport');
  }
}

export default MicrosoftGraphServer;

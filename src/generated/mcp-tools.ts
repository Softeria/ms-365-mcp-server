import { z } from 'zod';
import { schemas, message } from './zod-schemas.js';

// MCP Tool definition interface
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  parameters?: Record<string, any>;
}

// Tool creation function
export function createMcpTool(def: McpToolDefinition): McpToolDefinition {
  return def;
}

// Generated MCP tool definitions
export const send_mailTool = createMcpTool({
  name: "send-mail",
  description: "Send the message specified in the request body using either JSON or MIME format. When using JSON format, you can include a file attachment in the same sendMail action call. When using MIME format: This method saves the message in the Sent Items folder. Alternatively, create a draft message to send later. To learn more about the steps involved in the backend before a mail is delivered to recipients, see here.",
  inputSchema: message.schema.shape,
  parameters: {
    method: "POST",
    path: "/me/sendMail",
    schemaName: "microsoft.graph.message"
  }
});

// Export all tools
export const mcpTools = {
  "send-mail": send_mailTool,
};

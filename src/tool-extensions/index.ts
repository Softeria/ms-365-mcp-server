import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type GraphClient from '../graph-client.js';
import type AuthManager from '../auth.js';
import type { ToolCategory } from '../tool-categories.js';
import type { McpRegistrationContext, McpToolRegistration } from './types.js';
import logger from '../logger.js';
import {
  buildDownloadDriveFileTextMcpRegistration,
  runDownloadDriveFileTextTool,
} from './download-drive-file-text.js';
import { buildParseTeamsUrlMcpRegistration, runParseTeamsUrlTool } from './parse-teams-url.js';

/**
 * Non–OpenAPI tools: same definitions drive (1) discovery `search-tools` / `execute-tool`
 * and (2) optional top-level MCP tools in normal mode via `buildMcpRegistration`.
 *
 * To add one:
 * 1. Add a module under `tool-extensions/` with `execute` and (for normal MCP) `buildMcpRegistration`.
 * 2. Append to `SERVER_TOOL_EXTENSIONS` below.
 */

export type { McpRegistrationContext, McpToolRegistration } from './types.js';

export type ServerToolExtensionResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export type ServerToolExtensionExecute = (
  params: Record<string, unknown>,
  graphClient: GraphClient,
  authManager: AuthManager | undefined
) => Promise<ServerToolExtensionResult>;

export interface ServerToolExtension {
  name: string;
  method: string;
  path: string;
  description: string;
  execute: ServerToolExtensionExecute;
  /**
   * When set, `registerGraphTools` registers a top-level MCP tool with this schema (non-discovery).
   * Omit for discovery-only tools (callable via `execute-tool` but no direct MCP tool).
   */
  buildMcpRegistration?: (ctx: McpRegistrationContext) => McpToolRegistration;
}

export function serverToolExtensionMatchesSearch(
  ext: Pick<ServerToolExtension, 'name' | 'path' | 'description'>,
  categoryDef: ToolCategory | undefined,
  queryLower: string | undefined
): boolean {
  if (categoryDef && !categoryDef.pattern.test(ext.name)) {
    return false;
  }
  if (!queryLower) {
    return true;
  }
  const blob = `${ext.name} ${ext.path} ${ext.description}`.toLowerCase();
  return blob.includes(queryLower);
}

/** All registered non–OpenAPI tools (discovery + optional MCP registration). */
export const SERVER_TOOL_EXTENSIONS: readonly ServerToolExtension[] = [
  {
    name: 'parse-teams-url',
    method: 'POST',
    path: '/utility/parse-teams-url',
    description:
      'Converts any Teams meeting URL format (short /meet/, full /meetup-join/, or recap ?threadId=) into a standard joinWebUrl for list-online-meetings. Not a raw Graph OpenAPI operation—server-side extension.',
    execute: runParseTeamsUrlTool,
    buildMcpRegistration: buildParseTeamsUrlMcpRegistration,
  },
  {
    name: 'download-drive-file-text',
    method: 'GET',
    path: '/drives/{drive-id}/items/{driveItem-id} (download bytes, extract text)',
    description:
      'Downloads a file from a Graph drive (OneDrive or SharePoint library), extracts text (PDF, DOCX, plain text), returns JSON with a `text` field. Parameters: driveId, driveItemId, optional maxBytes, maxChars, optional account (multi-account). Not a raw Graph OpenAPI operation—server-side extension.',
    execute: runDownloadDriveFileTextTool,
    buildMcpRegistration: buildDownloadDriveFileTextMcpRegistration,
  },
];

/**
 * Register top-level MCP tools for extensions that define `buildMcpRegistration` (normal / non-discovery mode).
 * When `enabledToolsRegex` is set (same `--enabled-tools` pattern as Graph tools), only extensions whose
 * `name` matches the regex are registered. Discovery (`search-tools` / `execute-tool`) still lists all extensions.
 */
export function registerServerToolExtensionsAsMcpTools(
  server: McpServer,
  graphClient: GraphClient,
  authManager: AuthManager | undefined,
  multiAccount: boolean,
  accountNames: string[],
  enabledToolsRegex?: RegExp
): number {
  const ctx: McpRegistrationContext = { multiAccount, accountNames };
  let registered = 0;

  for (const ext of SERVER_TOOL_EXTENSIONS) {
    if (!ext.buildMcpRegistration) {
      continue;
    }
    if (enabledToolsRegex && !enabledToolsRegex.test(ext.name)) {
      continue;
    }

    try {
      const mcp = ext.buildMcpRegistration(ctx);
      server.tool(
        ext.name,
        mcp.description,
        mcp.schema,
        {
          title: ext.name,
          readOnlyHint: mcp.readOnlyHint ?? true,
          openWorldHint: mcp.openWorldHint ?? true,
        },
        async (params) => ext.execute(params, graphClient, authManager)
      );
      registered++;
    } catch (error) {
      logger.error(
        `Failed to register MCP extension tool ${ext.name}: ${(error as Error).message}`
      );
    }
  }

  return registered;
}

import { z } from 'zod';
import GraphClient from '../graph-client.js';
import AuthManager from '../auth.js';
import logger from '../logger.js';
import { getRequestTokens } from '../request-context.js';
import { downloadDriveFileAndExtractText } from '../lib/drive-item-text-extraction.js';
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_CHARS } from '../lib/text-extraction.js';
import type { McpRegistrationContext, McpToolRegistration } from './types.js';

async function resolveAccessToken(
  authManager: AuthManager | undefined,
  account: string | undefined
): Promise<string | undefined> {
  if (authManager && !authManager.isOAuthModeEnabled() && !getRequestTokens()) {
    return authManager.getTokenForAccount(account);
  }
  return undefined;
}

type TextToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

/** Core handler for `download-drive-file-text` (MCP tool or discovery `execute-tool`). */
export async function runDownloadDriveFileTextTool(
  params: Record<string, unknown>,
  graphClient: GraphClient,
  authManager: AuthManager | undefined
): Promise<TextToolResult> {
  const driveId = params.driveId as string;
  const driveItemId = params.driveItemId as string;
  const maxBytes = (params.maxBytes as number | undefined) ?? DEFAULT_MAX_BYTES;
  const maxChars = (params.maxChars as number | undefined) ?? DEFAULT_MAX_CHARS;
  const account = params.account as string | undefined;

  if (typeof driveId !== 'string' || typeof driveItemId !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'driveId and driveItemId are required strings.',
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    let accessToken: string | undefined;
    try {
      accessToken = await resolveAccessToken(authManager, account);
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: (err as Error).message }),
          },
        ],
        isError: true,
      };
    }

    const result = await downloadDriveFileAndExtractText({
      graphClient,
      driveId,
      driveItemId,
      graphOptions: accessToken ? { accessToken } : {},
      maxBytes,
      maxChars,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    logger.error(`download-drive-file-text: ${(error as Error).message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: (error as Error).message }),
        },
      ],
      isError: true,
    };
  }
}

/** MCP schema + description for normal (non-discovery) mode; used by `registerServerToolExtensionsAsMcpTools`. */
export function buildDownloadDriveFileTextMcpRegistration(
  ctx: McpRegistrationContext
): McpToolRegistration {
  const accountHint =
    ctx.multiAccount && ctx.accountNames.length > 0
      ? `Known accounts: ${ctx.accountNames.join(', ')}. `
      : '';

  const schema: Record<string, z.ZodTypeAny> = {
    driveId: z.string().describe('Drive ID (from list-drives, list-sharepoint-site-drives, etc.)'),
    driveItemId: z
      .string()
      .describe('File item ID (from list-folder-files, get-drive-item, or site item metadata)'),
    maxBytes: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`Max file size in bytes (default ${DEFAULT_MAX_BYTES})`),
    maxChars: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`Max characters of extracted text returned (default ${DEFAULT_MAX_CHARS})`),
  };

  if (ctx.multiAccount) {
    schema['account'] = z
      .string()
      .optional()
      .describe(
        `${accountHint}Account to use when multiple Microsoft accounts are configured. Required when multiple accounts exist.`
      );
  }

  return {
    schema,
    description:
      'Downloads file content from a OneDrive or SharePoint document library (Microsoft Graph drive), extracts readable text (PDF, DOCX, plain text, and similar), and returns that text in the tool result for the assistant to use. Use list-folder-files / list-sharepoint-site-drives to obtain driveId and a file driveItemId. For only a temporary download URL without text extraction, use download-onedrive-file-content. (If the server operator sets TEXT_EXTRACTION_URL, extraction uses that service first — JSON body by default, or TEXT_EXTRACTION_FORMAT=multipart for standard file uploads — then falls back to built-in extractors on failure.)',
    readOnlyHint: true,
    openWorldHint: true,
  };
}

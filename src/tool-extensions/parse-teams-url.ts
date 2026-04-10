import { z } from 'zod';
import GraphClient from '../graph-client.js';
import AuthManager from '../auth.js';
import { parseTeamsUrl } from '../lib/teams-url-parser.js';
import type { McpRegistrationContext, McpToolRegistration } from './types.js';

type ParseTeamsUrlResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

/** Core handler for `parse-teams-url` (MCP tool or discovery `execute-tool`). */
export async function runParseTeamsUrlTool(
  params: Record<string, unknown>,
  _graphClient: GraphClient,
  _authManager: AuthManager | undefined
): Promise<ParseTeamsUrlResult> {
  const url = params.url;
  if (typeof url !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'url is required and must be a string.' }),
        },
      ],
      isError: true,
    };
  }

  try {
    const joinWebUrl = parseTeamsUrl(url);
    return { content: [{ type: 'text', text: joinWebUrl }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
      isError: true,
    };
  }
}

/** MCP schema + description for normal (non-discovery) mode. */
export function buildParseTeamsUrlMcpRegistration(
  _ctx: McpRegistrationContext
): McpToolRegistration {
  return {
    schema: {
      url: z.string().describe('Teams meeting URL in any format'),
    },
    description:
      'Converts any Teams meeting URL format (short /meet/, full /meetup-join/, or recap ?threadId=) into a standard joinWebUrl. Use this before list-online-meetings when the user provides a recap or short URL.',
    readOnlyHint: true,
    openWorldHint: false,
  };
}

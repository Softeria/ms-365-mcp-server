/** Shared context for MCP `initialize.instructions` (hosts that forward it to the model). */
import type { Toolset } from './tools/types.js';
import {
  resolveEnabledToolsets,
  isToolsetEnabled,
  type ToolsetSelection,
} from './toolset-config.js';

export type McpInstructionsContext = {
  multiAccount: boolean;
  /**
   * Enabled toolsets, so the instruction manual carries only guidance for the
   * tools a session actually has. Defaults to `MS365_MCP_TOOLSETS` (unset = core
   * only) — kept in sync with tool registration, which reads the same source.
   */
  toolsets?: ToolsetSelection;
};

/** One instruction fragment. `toolset` gates it to a domain; absent = always included (core/general). */
type Fragment = { text: string; toolset?: Toolset };

const FRAGMENTS: readonly Fragment[] = [
  {
    text: 'Areté Microsoft 365 MCP exposes Microsoft Graph through MCP tools. Use each tool name, description, and parameter schema as the source of truth.',
  },
  {
    text: 'Microsoft Graph OData: do not combine $filter with $search on the same request. For lists, prefer modest $top (or top) and $select; avoid very large pages unless the user needs them. List tools already return a compact field set by default — pass response_format="detailed" or an explicit $select for more.',
  },
  {
    // Mail reads are in the core toolset, so this guidance is always relevant.
    text: 'Mail and message $search uses KQL; the $search query parameter value must be double-quoted per Graph (see search-query-parameter in Microsoft Graph docs).',
  },
  {
    text: 'When you need an organizational user or recipient address, resolve it with user-search (or another directory tool); do not invent SMTP addresses.',
  },
  {
    text: 'Directory $search on collections such as /users or /groups requires ConsistencyLevel: eventual when the tool exposes that header.',
  },
  {
    text: 'Teams chat and channel messages: prefer HTML contentType in the body; plain text is often mangled by Graph.',
    toolset: 'teams',
  },
  {
    text: 'Finding a Teams message: use teams-message-search. Chats cannot be filtered on content, and a group chat usually has no topic, so listing chats will not identify the right one. Search returns a snippet plus ids; fetch the body with teams-chat-message-get or teams-channel-message-get.',
    toolset: 'teams',
  },
  {
    text: 'Finding a file or folder: use sharepoint-search (OneDrive and every SharePoint site you can read). The *-children-list tools only browse a folder you already know.',
    toolset: 'sharepoint',
  },
  {
    text: 'Changing a file: read it first (drive-item-get or sharepoint-drive-item-get) for its eTag, then call drive-file-update with that eTag. New files use drive-file-upload, which never overwrites.',
    toolset: 'files',
  },
  {
    text: 'People outside the tenant (clients, lenders) are not in user-search; find them with people-search, which ranks everyone you correspond with.',
    toolset: 'directory',
  },
  {
    text: 'Files / binary content: use download-bytes for any binary read (drive file content, mail attachments, profile photos, Teams hosted content, meeting recordings); pass it a relative Graph path ending in /content or /$value.',
  },
];

export function buildMcpServerInstructions(opts: McpInstructionsContext): string {
  const enabled = resolveEnabledToolsets(opts.toolsets);
  const parts = FRAGMENTS.filter(
    (f) => f.toolset === undefined || isToolsetEnabled(f.toolset, enabled)
  ).map((f) => f.text);
  if (opts.multiAccount) {
    parts.push('Multiple accounts: pass the account parameter when required (see list-accounts).');
  }
  return parts.join(' ');
}

/** Shared context for MCP `initialize.instructions` (hosts that forward it to the model). */
export type McpInstructionsContext = {
  multiAccount: boolean;
};

export function buildMcpServerInstructions(opts: McpInstructionsContext): string {
  const parts = [
    'Areté Microsoft 365 MCP exposes Microsoft Graph through MCP tools. Use each tool name, description, and parameter schema as the source of truth.',
    'Microsoft Graph OData: do not combine $filter with $search on the same request. For lists, prefer modest $top (or top) and $select; avoid very large pages unless the user needs them.',
    'Mail and message $search uses KQL; the $search query parameter value must be double-quoted per Graph (see search-query-parameter in Microsoft Graph docs).',
    'When you need an organizational user or recipient address, resolve it with list-users (or another directory tool); do not invent SMTP addresses.',
    'Directory $search on collections such as /users or /groups requires ConsistencyLevel: eventual when the tool exposes that header.',
    'Teams chat and channel messages: prefer HTML contentType in the body; plain text is often mangled by Graph.',
    'Files / binary content: use download-bytes for any binary read (drive file content, mail attachments, profile photos, Teams hosted content, meeting recordings); pass it a Graph path or an absolute @microsoft.graph.downloadUrl from a metadata response. For uploads, upload-file-content takes a base64 string body up to 4MB; use create-upload-session above that.',
  ];
  if (opts.multiAccount) {
    parts.push('Multiple accounts: pass the account parameter when required (see list-accounts).');
  }
  return parts.join(' ');
}

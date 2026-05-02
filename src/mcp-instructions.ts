/** Shared context for MCP `initialize.instructions` (hosts that forward it to the model). */
export type McpInstructionsContext = {
  orgMode: boolean;
  readOnly: boolean;
  multiAccount: boolean;
};

function buildGeneralMcpInstructions(opts: McpInstructionsContext): string {
  const parts = [
    'Microsoft 365 MCP exposes Microsoft Graph through MCP tools. Use each tool name, description, and parameter schema as the source of truth.',
    'Microsoft Graph OData: do not combine $filter with $search on the same request. For lists, prefer modest $top (or top) and $select; avoid very large pages unless the user needs them.',
    'Mail and message $search uses KQL; the $search query parameter value must be double-quoted per Graph (see search-query-parameter in Microsoft Graph docs).',
    'When you need an organizational user or recipient address, resolve it with list-users (or another directory tool); do not invent SMTP addresses.',
    'Directory $search on collections such as /users or /groups requires ConsistencyLevel: eventual when the tool exposes that header.',
    'Teams chat and channel messages: prefer HTML contentType in the body; plain text is often mangled by Graph.',
  ];
  if (opts.readOnly) parts.push('This server is read-only; write operations are disabled.');
  if (opts.multiAccount)
    parts.push('Multiple accounts: pass the account parameter when required (see list-accounts).');
  if (!opts.orgMode)
    parts.push('Work/school-only tools require starting the server with --org-mode.');
  return parts.join(' ');
}

const DISCOVERY_MODE_INSTRUCTIONS_ADDON =
  'DISCOVERY MODE ADD-ON: Graph is reached via search-tools → get-tool-schema → execute-tool (plus auth helpers). ' +
  'Workflow: (1) call search-tools with short natural-language keywords (BM25-ranked); ' +
  '(2) call get-tool-schema(tool_name) to see the parameters, required fields, and enum values; ' +
  '(3) call execute-tool with tool_name exactly as returned and parameters shaped per the schema. ' +
  'Skipping get-tool-schema is the leading cause of Graph 400 errors here. ' +
  'If search-tools returns no matches, retry with shorter or different keywords.';

/**
 * Full MCP `initialize.instructions` string: general guidance for every mode, plus a discovery-only suffix when applicable.
 */
export function buildMcpServerInstructions(
  opts: McpInstructionsContext & { discovery: boolean }
): string {
  const general = buildGeneralMcpInstructions(opts);
  if (!opts.discovery) return general;
  return `${general} ${DISCOVERY_MODE_INSTRUCTIONS_ADDON}`;
}

---
applyTo: src/endpoints.json
---

# endpoints.json — Tool Configuration

This file is the **source of truth** for which Microsoft Graph API endpoints are exposed as MCP tools. The code generation pipeline (`npm run generate`) uses this to trim the OpenAPI spec and generate the typed client.

## Adding a New Endpoint

1. Find the Graph API path in the [Microsoft Graph REST API reference](https://learn.microsoft.com/en-us/graph/api/overview)
2. Add an entry with these fields:

```json
{
  "pathPattern": "/me/messages/{message-id}",
  "method": "get",
  "toolName": "get-mail-message",
  "scopes": ["Mail.Read"],
  "llmTip": "Returns full message including body. Use $select to limit fields."
}
```

### Required Fields
- `pathPattern`: Exact Graph API path using `{param-id}` placeholders (must match OpenAPI spec)
- `method`: HTTP method (lowercase: `get`, `post`, `patch`, `delete`)
- `toolName`: Kebab-case tool name (this becomes the MCP tool alias)
- `scopes` or `workScopes`: Required Graph API permissions (array of strings)

### Optional Fields
- `llmTip`: Guidance appended to tool description — tips about required params, common mistakes, recommended $select fields. Write these as if advising an AI that has never used this endpoint.
- `workScopes`: Scopes for org-mode. If only `workScopes` (no `scopes`), tool is org-mode only.
- `supportsTimezone`: Set `true` for calendar endpoints that accept Prefer: outlook.timezone
- `supportsExpandExtendedProperties`: Set `true` if endpoint supports $expand=singleValueExtendedProperties
- `returnDownloadUrl`: Set `true` for file content endpoints (returns @microsoft.graph.downloadUrl instead of streaming)
- `skipEncoding`: Array of param names that should NOT be URL-encoded (for function-style API paths like `range(address='A1:G10')`)
- `contentType`: Override Content-Type header (e.g., `"text/html"` for OneNote pages)
- `acceptType`: Override Accept header (e.g., `"text/vtt"` for transcript content)
- `disabled`: Set `true` to exclude from generation without deleting the entry

## Naming Conventions
- Tool names use kebab-case: `list-mail-messages`, `get-calendar-event`, `create-todo-task`
- Prefix with action: `list-` (collection), `get-` (single), `create-`, `update-`, `delete-`
- Include the resource domain: `mail`, `calendar`, `drive`, `todo`, `planner`, `chat`, `channel`, etc.

## After Editing
Run `npm run generate` to regenerate the trimmed OpenAPI spec, typed client, and schema index.

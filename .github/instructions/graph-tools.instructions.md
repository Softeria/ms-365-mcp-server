---
applyTo: src/graph-tools.ts,src/schema-tools.ts,src/auth-tools.ts
---

# MCP Tool Registration

## How Tools Are Registered

Tools are registered via the MCP SDK's `server.tool()` method. There are three registration paths:

1. **Standard mode** (`registerGraphTools`): Loops over `api.endpoints` from the generated client. Each endpoint gets a Zod parameter schema built from its OpenAPI definition, plus injected params (OData, fetchAllPages, account, timezone, etc.).

2. **Discovery mode** (`registerDiscoveryTools`): Registers just `search-tools` + `execute-tool`. The full tool registry is built internally but tools are invoked by name through `execute-tool`.

3. **Schema mode** (`registerSchemaTools`): Registers introspection-only tools. No Graph API calls, no auth — reads pre-built schema index JSON.

## server.tool() Signature

```typescript
server.tool(
  toolAlias,          // string: kebab-case tool name
  toolDescription,    // string: shown to AI (include llmTip here)
  paramSchema,        // Record<string, z.ZodTypeAny>: parameter definitions
  annotations,        // { title, readOnlyHint, destructiveHint, openWorldHint }
  handler             // async (params) => CallToolResult
);
```

## Key Patterns in graph-tools.ts

- **OData param normalisation**: MCP clients may not support `$` in param names. Params like `filter` are accepted and mapped back to `$filter` for Graph API calls.
- **Path param injection**: Path params from URL patterns (`:messageId`) are auto-added to the schema if not already defined by the generated client.
- **Multi-account param**: When multiple accounts are cached, an `account` param is injected into every tool schema with known account names in the description.
- **Read-only filtering**: In `--read-only` mode, non-GET tools are skipped during registration.

## Adding a New Hand-Crafted Tool

For tools that don't map to a single Graph API endpoint (like `parse-teams-url`), register them directly at the bottom of `registerGraphTools()`:

```typescript
server.tool(
  'my-tool-name',
  'Description of what this tool does',
  { param: z.string().describe('Param description') },
  { title: 'my-tool-name', readOnlyHint: true, openWorldHint: false },
  async ({ param }) => {
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);
```

Set `openWorldHint: true` if the tool calls external APIs, `false` for pure computation.

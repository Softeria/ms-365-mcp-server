# Changelog

## [Unreleased] — Slim Mode Feature Branch

### Overview

This change set introduces a `--slim` operating mode for the ms-365-mcp-server. The feature was developed to solve a fundamental context-window problem when running the server with AI models such as Claude Code: the default full-registration mode exposes 200+ tools, each with complete Zod input schemas, which consumes the entire model context window and leaves the AI unable to reason or respond. Slim mode reduces context overhead by approximately 8× while retaining full tool functionality via an on-demand schema lookup mechanism.

A subsequent fix was required after observing that Claude Code (following an internal update) serializes MCP tool argument values as JSON strings rather than parsed JSON objects. This caused all slim-mode tool calls to silently fail because Zod's `z.record(z.any())` rejects string input. A `z.preprocess` step was added to auto-parse JSON strings before Zod validation.

---

### Problem This Resolves

**Without slim mode**, the server registers each Microsoft Graph API tool with its full Zod schema. An `npm run generate` produces 200+ tools. When an AI model connects, the complete tool list (with all parameter schemas) is injected into the model's context window. For Claude Code this consumed the entire context, making the server unusable in practice.

**The slim mode solution** registers every tool with a single opaque input field (`parameters: Record<string, any>`), reducing the per-tool schema to name + description only. A dedicated `get-tool-schema` meta-tool allows the model to retrieve the full parameter list for any individual tool on demand, before calling it.

**The string-coercion fix** addresses a breaking change in Claude Code's MCP client that began sending the `parameters` field value as a serialized JSON string (e.g., `'{"messageId":"..."}'`) rather than a parsed object. Without the fix, Zod's `z.record(z.any())` returns an `invalid_type` error ("Expected object, received string"), causing 100% of slim-mode tool calls to fail silently — path parameters are never substituted into URLs, request bodies are never sent, and Graph API returns 400 or 500 errors with no useful diagnostic.

---

### Files Changed

#### `src/cli.ts`

Added the `--slim` flag to the CLI option parser.

**Before:**
```ts
.option('--discovery', 'Enable runtime tool discovery and loading (experimental feature)')
.option('--cloud <type>', ...)
```

**After:**
```ts
.option('--discovery', 'Enable runtime tool discovery and loading (experimental feature)')
.option(
  '--slim',
  'Register all tools with minimal schemas (name+description only). Use get-tool-schema for parameter details. Reduces context by ~8x vs full mode.'
)
.option('--cloud <type>', ...)
```

The `slim?: boolean` property was also added to the `CommandOptions` interface export.

---

#### `src/server.ts`

Three changes:

1. **Import** — `registerSlimTools` added to the import from `./graph-tools.js`.

2. **MCP server instructions** — When slim mode is active, a system-level instruction block is injected into the MCP server at construction time. This instruction tells the connected AI that it is in slim mode and that it *must* call `get-tool-schema` before using any tool.

   ```ts
   const slimInstructions = this.options.slim
     ? `This MCP server is running in slim mode. Tool parameter schemas are intentionally minimal...
        IMPORTANT: Before calling any tool, you MUST first call get-tool-schema...`
     : undefined;

   const server = new McpServer(
     { name: 'Microsoft365MCP', version: this.version },
     slimInstructions ? { instructions: slimInstructions } : undefined
   );
   ```

3. **Registration branch** — A new `else if (this.options.slim)` branch routes to `registerSlimTools` instead of `registerGraphTools` when the flag is set. The discovery mode branch is unchanged and takes precedence.

   ```ts
   } else if (this.options.slim) {
     registerSlimTools(server, this.graphClient!, this.options.readOnly,
       this.options.orgMode, this.authManager, this.multiAccount, this.accountNames);
   } else {
     registerGraphTools(...);
   }
   ```

4. **Logging** — A log line is emitted at startup when slim mode is active.

---

#### `src/graph-tools.ts`

Two additions:

**1. `isZodOptional` helper function**

A small utility used by `registerSlimTools`'s `get-tool-schema` meta-tool to determine whether a parameter in a full tool definition is optional or required. It inspects the Zod schema's internal `_def.typeName` property.

```ts
function isZodOptional(schema: z.ZodTypeAny): boolean {
  const typeName = schema?._def?.typeName;
  return typeName === 'ZodOptional' || typeName === 'ZodDefault';
}
```

**2. `registerSlimTools` export function**

The core of the feature. This function registers all available tools (filtered by `readOnly` and `orgMode` via the existing `buildToolsRegistry`) using a minimal schema, and registers one meta-tool for schema lookup.

**`get-tool-schema` meta-tool**

Accepts a `tool_name` string and returns the full parameter list (name, placement, description, required) for that tool. This is how the AI retrieves parameter details without those details being in context at all times. The parameter list format mirrors the original full-mode schema: each entry includes `placement` (Path / Query / Body / Control / Header) so the AI knows how each parameter is used.

**Per-tool slim registration — the `z.preprocess` fix**

Each Graph API tool is registered with this input schema:

```ts
{
  parameters: z
    .preprocess(
      (val) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return val; }
        }
        return val;
      },
      z.record(z.any())
    )
    .describe('Key-value parameters for this tool. Call get-tool-schema first if unsure what to pass.')
    .optional(),
}
```

The `z.preprocess` step is the fix for the Claude Code serialization issue. Without it, the schema was:

```ts
parameters: z.record(z.any()).describe(...).optional()
```

This bare `z.record(z.any())` passes when the MCP client sends `parameters` as a parsed object, but fails with `invalid_type: Expected object, received string` when the client sends it as a serialized JSON string. The preprocess step accepts either form: if the value is a string it attempts `JSON.parse`; if parsing fails the raw string is passed through and Zod will surface a meaningful error; if the value is already an object it is used as-is.

The handler then passes the parsed `parameters` map directly to `executeGraphTool`, which already handles path-parameter substitution, query-string building, and request-body assembly from the flat key-value map:

```ts
async ({ parameters = {} }) =>
  executeGraphTool(tool, config, graphClient, parameters, authManager)
```

**`parse-teams-url` re-registration**

The slim registration also re-registers `parse-teams-url` (which is separately defined in `registerGraphTools`) to ensure it remains available in slim mode.

---

### How to Use Slim Mode

**Starting the server in slim mode:**
```
node dist/index.js --slim
```

Can be combined with `--org-mode` (recommended — limits tool count to work-safe endpoints) and `--read-only`:
```
node dist/index.js --org-mode --slim
```

**Workflow for the AI model:**

1. Use the standard tools list to find an available tool name (e.g. `send-mail`).
2. Call `get-tool-schema` with that name to retrieve its parameters:
   ```
   get-tool-schema({ tool_name: "send-mail" })
   ```
3. Call the tool, passing all parameters inside the `parameters` field as a flat object:
   ```
   send-mail({ parameters: { body: { message: { ... } } } })
   ```

**Claude Code config example** (`.claude.json`):
```json
{
  "ms365": {
    "command": "node",
    "args": [
      "C:/path/to/ms-365-mcp-server/dist/index.js",
      "--org-mode",
      "--slim"
    ]
  }
}
```

---

### Root Cause Analysis — String Serialization Bug

The `z.preprocess` fix was discovered during live use. Observed failure sequence:

- `reply-all-mail-message` returned `400 ErrorInvalidIdMalformed` — the `:messageId` placeholder was never substituted in the URL path, indicating `executeGraphTool` received an empty `parameters` map.
- `send-mail` returned `500 Internal Server Error` — no request body was sent.
- `update-mail-message` returned `400 Empty Payload` — same root cause.
- Direct testing confirmed: passing `parameters` as a JSON string caused `MCP error -32602: invalid_type — Expected object, received string` at the Zod validation layer.
- The MCP SDK (`@modelcontextprotocol/sdk` v1.28.0) validates tool inputs via `safeParseAsync` and strips unknown keys — meaning top-level params passed outside the `parameters` wrapper were silently discarded with no error, making the failure non-obvious.

Read operations (GET endpoints) appeared to work because they succeeded without needing a body or path-parameter substitution in certain cases, masking the underlying issue.

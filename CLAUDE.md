# CLAUDE.md - ms-365-mcp-server

## Project Overview

Microsoft 365 MCP Server — a Model Context Protocol server that exposes Microsoft Graph API operations as MCP tools. Built with TypeScript, the `@modelcontextprotocol/sdk`, and Zod for schema validation. Published as `@softeria/ms-365-mcp-server` (MIT license).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+, TypeScript, ESM modules |
| MCP SDK | `@modelcontextprotocol/sdk` (stdio + Streamable HTTP transports) |
| Auth | MSAL (`@azure/msal-node`), OAuth 2.0 device flow + authorization code |
| Schema validation | Zod |
| Code generation | `openapi-zod-client` from Microsoft Graph OpenAPI spec |
| Build | tsup (ESM bundle, no splitting) |
| Test | Vitest |
| CLI | Commander |
| Logging | Winston |

## Repository Structure

```
ms-365-mcp-server/
├── bin/
│   ├── generate-graph-client.mjs   # Orchestrates code generation pipeline
│   └── modules/
│       ├── download-openapi.mjs    # Downloads Graph OpenAPI spec
│       ├── simplified-openapi.mjs  # Trims spec to endpoints.json subset
│       ├── generate-mcp-tools.mjs  # Runs openapi-zod-client
│       └── generate-schema-index.mjs # Builds schema introspection index
├── openapi/
│   ├── openapi.yaml                # Full Microsoft Graph OpenAPI spec (~36MB)
│   └── openapi-trimmed.yaml        # Trimmed to endpoints.json subset (~1.5MB)
├── src/
│   ├── index.ts                    # Entry point
│   ├── cli.ts                      # Commander CLI options + parsing
│   ├── server.ts                   # MicrosoftGraphServer class (bootstrap)
│   ├── graph-tools.ts              # registerGraphTools() + registerDiscoveryTools()
│   ├── schema-tools.ts             # registerSchemaTools() — introspection mode
│   ├── schema-index.ts             # Schema index loader + query helpers
│   ├── auth-tools.ts               # Auth MCP tools (login/logout/list-accounts)
│   ├── auth.ts                     # AuthManager, MSAL, token cache
│   ├── graph-client.ts             # GraphClient — HTTP requests to Graph API
│   ├── tool-categories.ts          # Tool preset categories (regex filters)
│   ├── endpoints.json              # Curated endpoint configs (scopes, llmTip, etc.)
│   ├── cloud-config.ts             # Global vs China cloud endpoints
│   ├── folder-resolver.ts          # Mail folder display name → ID resolution
│   ├── logger.ts                   # Winston logging config
│   ├── oauth-provider.ts           # OAuth provider for HTTP transport
│   ├── request-context.ts          # AsyncLocalStorage for per-request tokens
│   ├── secrets.ts                  # Secret loading (env, Key Vault)
│   ├── version.ts                  # Version from package.json
│   ├── lib/
│   │   ├── microsoft-auth.ts       # Token exchange/refresh helpers
│   │   └── teams-url-parser.ts     # Teams URL format normalisation
│   └── generated/                  # Auto-generated (DO NOT EDIT)
│       ├── client.ts               # Generated Zod-typed Graph API client
│       ├── endpoint-types.ts       # Endpoint/Parameter type definitions
│       ├── hack.ts                 # Zodios compatibility shim
│       └── schema-index.json       # Pre-built schema introspection index
├── test/                           # Test files
├── tsup.config.ts                  # Build configuration
└── vitest.config.js                # Test configuration
```

## Code Generation Pipeline

The core architecture pattern: **endpoints.json drives everything**.

```
endpoints.json (curated: path, method, scopes, llmTip)
  + openapi.yaml (full Microsoft Graph spec, downloaded)
  → openapi-trimmed.yaml (subset matching endpoints.json)
  → openapi-zod-client → src/generated/client.ts (Zod schemas)
  → generate-schema-index → src/generated/schema-index.json
```

**To add a new Graph API tool:**
1. Add an entry to `src/endpoints.json` with pathPattern, method, toolName, scopes
2. Run `npm run generate` — this downloads the spec (if missing), trims it, generates the client and schema index
3. The tool is automatically registered by `registerGraphTools()` in `graph-tools.ts`

**Never edit files in `src/generated/` manually** — they are overwritten by `npm run generate`.

## Server Modes

| Flag | Mode | Auth Required | Tools Registered |
|------|------|---------------|-----------------|
| (default) | Standard | Yes | All Graph tools (127+) |
| `--discovery` | Discovery | Yes | search-tools + execute-tool (2 meta-tools) |
| `--schema` | Schema | No | search-graph-schema + describe-graph-endpoint + describe-graph-schema |
| `--read-only` | Read-only | Yes | GET-only Graph tools |

Schema mode is for AI-assisted development — provides Graph API schema information without requiring authentication or calling the Graph API.

## Build & Development

```bash
npm install
npm run generate          # Download OpenAPI spec + generate client + schema index
npm run build             # tsup build to dist/
npm run dev               # tsx dev server (stdio)
npm run dev:http          # tsx dev server (HTTP on :3000)
npm test                  # Vitest
npm run verify            # Lint + format + test
```

## Key Patterns

### endpoints.json Entry

```json
{
  "pathPattern": "/me/messages",
  "method": "get",
  "toolName": "list-mail-messages",
  "scopes": ["Mail.Read"],
  "llmTip": "Always use $select to limit fields..."
}
```

Fields: `pathPattern`, `method`, `toolName`, `scopes` (personal), `workScopes` (org-mode), `llmTip`, `supportsTimezone`, `supportsExpandExtendedProperties`, `returnDownloadUrl`, `skipEncoding`, `contentType`, `acceptType`, `disabled`.

### Tool Registration (graph-tools.ts)

`registerGraphTools()` loops over `api.endpoints` (from generated client), matches each to its `endpoints.json` config, builds a Zod parameter schema, and calls `server.tool()`. It handles:
- OData parameter normalisation (stripping `$` prefix, re-adding it)
- Path parameter injection from URL patterns
- Read-only mode filtering (skip non-GET)
- Tool category filtering via regex
- Multi-account parameter injection
- `llmTip` appended to tool descriptions

### Tool Categories (tool-categories.ts)

Regex-based presets that filter tools by name. Used with `--preset` or `--enabled-tools` CLI flags. Categories: mail, calendar, files, personal, work, excel, contacts, tasks, onenote, search, users, all.

### Authentication

Three flows: device code (stdio default), OAuth authorization code with PKCE (HTTP mode), BYOT via env var. Tokens cached to OS credential store (keytar) with file fallback. Multi-account supported.

## Code Conventions

- ESM modules throughout (`import`/`export`, `.js` extensions in imports)
- Zod for all parameter validation
- Winston for logging (never `console.log` in src/)
- Prettier + ESLint enforced via `npm run verify`
- No `any` types except in generated code compatibility layers

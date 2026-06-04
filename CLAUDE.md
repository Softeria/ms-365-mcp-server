<!-- GSD:project-start source:PROJECT.md -->
## Project

**ms-365-mcp-server v2 — Enterprise Multi-Tenant Microsoft 365 MCP Gateway**

An enterprise-grade Model Context Protocol server that gives AI assistants full, governed access to Microsoft 365 (Graph API) across multiple Azure AD tenants from a single Docker Compose deployment. It is the v2 major rewrite of `ms-365-mcp-server`: same project identity, fundamentally new runtime — Dockerized, multi-tenant, production-hardened, and aimed at organizations that want to register many orgs / app registrations against one MCP gateway and expose a curated set of Graph tools to their AI clients (Claude Desktop, Claude Code, Cursor, Continue, and bespoke integrations).

**Core Value:** **One deployable, multi-tenant MCP gateway that exposes the entire Microsoft Graph surface an organization needs — with tenant isolation, resilient Graph transport, and all four identity flows — so AI assistants can safely act on behalf of any user or app across any registered tenant.**

If everything else fails, this must hold: a correctly-authenticated request against any registered tenant must reach Graph with full retry/throttle/batch/pagination/error semantics, never leak a token across tenant boundaries, and return a typed, normalized response.

### Constraints

- **Tech stack**: TypeScript ESM, Node 22 LTS, keep `@modelcontextprotocol/sdk` + `@azure/msal-node` + `express` — v1 stack extended, not replaced. Add Postgres (official `pg` or `postgres` client) and Redis (`ioredis`). — Continuity, ecosystem fit, and SDK-audit recommendation to retain `openapi-zod-client` generator.
- **Deployment**: Docker Compose on a single VM is the reference target. Must work without Kubernetes / Azure-native services. — User's operational constraint; aligned with "build for portability".
- **Transports**: Must expose all three concurrently (legacy HTTP+SSE, Streamable HTTP, stdio). — Maximum MCP-client compatibility through the transition window; users can drop legacy SSE when their clients catch up.
- **Identity**: All four auth flows (delegated OAuth, app-only client credentials, bearer pass-through, device code) must be supported concurrently and correctly isolated. — Organizational requirement; each covers a use case the others do not.
- **Admin API**: Dual-secured — Entra OAuth (admin app reg + group check) AND rotatable API keys. — Humans use OAuth, automation uses API keys; both must be first-class.
- **Tenancy model**: Runtime onboarding (REST API), persisted in Postgres. No restart to add a tenant. — User's operational preference; enables self-service onboarding flow.
- **Per-tenant isolation**: Token cache, PKCE state, rate limit, audit log all keyed by tenantId. Cross-tenant leak = bug. — Security foundation for multi-tenant deployment.
- **Coverage scope**: All Graph v1.0 + curated beta operations in the generated catalog. — User's "fully featured for my organization" requirement; beta curation prevents preview-API churn from destabilizing tenants.
- **Tool surface control**: Per-tenant enabled-tools selection with a ~150-op "essentials" default preset. — MCP clients cannot cope with 5,000 tools in one catalog; per-tenant scoping is how we ship all v1.0 without breaking clients.
- **Security posture**: No PII in default-level logs. Tokens AES-GCM encrypted at rest. `redirect_uris` validated. Refresh tokens off custom headers. — Multi-tenant trust requirements; v1 concerns must not carry over.
- **Backwards compatibility**: v2 is a clean break; v1 users migrate explicitly. — User's "v2 major rewrite" choice.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5.8.3 — All server source code under `src/` (compiled to ES2020 ESM)
- JavaScript (ESM, Node) — Build/codegen scripts under `bin/` and config files (`vitest.config.js`, `eslint.config.js`)
- JSON — Declarative endpoint catalog at `src/endpoints.json` (1453 lines, 212 Microsoft Graph tool definitions) and configuration files
- Bicep — Infrastructure-as-code example at `examples/azure-container-apps/main.bicep`
- PowerShell — Deployment orchestrator at `examples/azure-container-apps/deploy.ps1`
- Dockerfile — Multi-stage container build at `Dockerfile`
## Runtime
- Node.js >= 18 (declared in `package.json` `engines.node`); README recommends >= 20
- Module system: ESM (`"type": "module"` in `package.json`)
- Distribution target: ES2020 modules (`tsconfig.json` and `tsup.config.ts`)
- Container base images: `node:24-alpine` (build stage), `node:20-alpine` (release stage) — `Dockerfile`
- CI matrix: Node.js 18.x, 20.x, 22.x — `.github/workflows/build.yml`
- npm (no other lockfiles present)
- Lockfile: `package-lock.json` (471KB, present)
- Install in production: `npm i --ignore-scripts --omit=dev` — `Dockerfile`
## Frameworks
- `@modelcontextprotocol/sdk` ^1.29.0 — MCP server framework. Used for `McpServer`, `StdioServerTransport`, `StreamableHTTPServerTransport`, `mcpAuthRouter`, and `ProxyOAuthServerProvider`. Imported in `src/server.ts`, `src/auth-tools.ts`, `src/graph-tools.ts`, `src/oauth-provider.ts`.
- `express` ^5.2.1 — HTTP server for `--http` Streamable HTTP mode. Used in `src/server.ts` for OAuth endpoints (`/authorize`, `/token`, `/.well-known/*`, `/mcp`) and CORS middleware.
- `@azure/msal-node` ^3.8.0 — Microsoft Authentication Library; powers `PublicClientApplication`, device-code, and interactive auth flows in `src/auth.ts`.
- `commander` ^11.1.0 — CLI argument parsing in `src/cli.ts` (defines `--http`, `--login`, `--org-mode`, `--read-only`, `--cloud`, `--enabled-tools`, `--preset`, `--public-url`, `--auth-browser`, etc.).
- `zod` ^3.24.2 — Runtime schema validation for tool parameters and generated OpenAPI client (`src/generated/client.ts`).
- `zod-to-json-schema` ^3.25.1 — Converts Zod schemas to JSON Schema for the discovery `get-tool-schema` tool — `src/lib/tool-schema.ts`.
- `vitest` ^3.1.1 — Test runner with globals enabled (`vitest.config.js`); environment `node`; setup file `test/setup.ts`.
- `@vitest/coverage-v8` ^3.2.4 — V8-based coverage provider.
- `tsup` ^8.5.0 — TypeScript bundler. Configured in `tsup.config.ts` to emit per-file ESM, copy `endpoints.json`, mark MSAL/MCP/express/keytar/zod/winston/etc. as external, and `chmod +x dist/index.js`.
- `tsx` ^4.19.4 — TypeScript executor for dev (`npm run dev`, `npm run dev:http`).
- `typescript` ^5.8.3 — Type checker; `tsconfig.json` uses `target: ES2020`, `module: NodeNext`, `strict: true`, `rootDir: src`.
- `eslint` ^9.31.0 with `@typescript-eslint/eslint-plugin` ^8.38.0 and `@typescript-eslint/parser` ^8.38.0 — Flat config in `eslint.config.js`. Enables `no-unused-vars` (warn, ignore `_`-prefixed args) and `no-explicit-any` (warn). Ignores `dist/`, `coverage/`, `bin/`, `src/generated/`.
- `prettier` ^3.5.3 — `.prettierrc`: semi, single-quote, ES5 trailing comma, print width 100, tab width 2.
## Key Dependencies
- `@modelcontextprotocol/sdk` — Defines server contract; if upgraded, transports and the OAuth router shape change.
- `@azure/msal-node` — Token cache serialization format and PublicClientApplication API are load-bearing in `src/auth.ts`.
- `winston` ^3.17.0 — Logging only; never `console.log` in stdio mode (would corrupt MCP JSON-RPC). See `src/logger.ts`.
- `dotenv` ^17.0.1 — `.env` loaded at process start via `import 'dotenv/config'` in `src/index.ts`.
- `js-yaml` ^4.1.0 — Used by codegen pipeline (`bin/modules/simplified-openapi.mjs`) to read/trim Microsoft Graph OpenAPI YAML.
- `open` ^11.0.0 — Lazy-imported in `src/auth.ts` to launch the system browser for `--auth-browser` interactive OAuth.
- `@toon-format/toon` ^0.8.0 — Optional output encoding (TOON format) selected via `--toon` flag — `src/graph-client.ts` `serializeData()`.
- `@azure/identity` ^4.5.0 — Lazy-imported in `src/secrets.ts` `KeyVaultSecretsProvider.getSecrets()` only when `MS365_MCP_KEYVAULT_URL` is set.
- `@azure/keyvault-secrets` ^4.9.0 — Lazy-imported alongside `@azure/identity` for Key Vault secret retrieval.
- `keytar` ^7.9.0 — Lazy-imported in `src/auth.ts` (`getKeytar()`) for OS keychain token storage. Falls back silently to file storage on alpine/Docker where keytar fails to install.
- `@redocly/cli` ^2.11.1 — OpenAPI processing CLI (referenced by codegen pipeline).
- `openapi-zod-client` — Invoked via `npx -y` in `bin/modules/generate-mcp-tools.mjs` to regenerate `src/generated/client.ts` from a trimmed Microsoft Graph OpenAPI spec.
- `semantic-release` ^25.0.2 with `@semantic-release/exec`, `@semantic-release/git`, `@semantic-release/github`, `@semantic-release/npm` — Driven by `.releaserc.json`, runs from `.github/workflows/release.yml` on push to `main`.
## Configuration
- `MS365_MCP_CLIENT_ID` — Azure AD app client ID (`src/secrets.ts`); falls back to a built-in default per cloud (`src/cloud-config.ts` `DEFAULT_CLIENT_IDS`).
- `MS365_MCP_TENANT_ID` — Tenant or `common` (default).
- `MS365_MCP_CLIENT_SECRET` — Optional; enables confidential-client flow.
- `MS365_MCP_CLOUD_TYPE` — `global` (default) or `china`.
- `MS365_MCP_KEYVAULT_URL` — When set, switches secrets provider to Azure Key Vault.
- `MS365_MCP_OAUTH_TOKEN` — Pre-supplied bearer token; activates OAuth/HTTP mode in `AuthManager` constructor.
- `MS365_MCP_TOKEN_CACHE_PATH`, `MS365_MCP_SELECTED_ACCOUNT_PATH` — Override default `.token-cache.json` and `.selected-account.json` locations.
- `MS365_MCP_LOG_DIR` — Override `~/.ms-365-mcp-server/logs` log directory (`src/logger.ts`).
- `MS365_MCP_CORS_ORIGIN` — Override `Access-Control-Allow-Origin` (default `http://localhost:3000`).
- `MS365_MCP_PUBLIC_URL` (and deprecated `MS365_MCP_BASE_URL`) — Public base URL for browser-facing OAuth redirects when behind a proxy.
- `MS365_MCP_ORG_MODE`, `MS365_MCP_FORCE_WORK_SCOPES` — Boolean toggles for organization/work scopes.
- `MS365_MCP_OUTPUT_FORMAT=toon` — Switch global output to TOON.
- `MS365_MCP_MAX_TOP` — Caps Microsoft Graph `$top` query parameter (`src/graph-tools.ts`).
- `MS365_MCP_BODY_FORMAT` — `text` (default) or `html` for Outlook body content type.
- `READ_ONLY`, `ENABLED_TOOLS` — CLI overrides (`src/cli.ts`).
- `LOG_LEVEL` — Winston log level; default `info`.
- `SILENT` — Suppress console transport output even when enabled.
- `NODE_ENV` — Logged at startup; `production` in `Dockerfile` release stage.
- `tsconfig.json` — TypeScript compiler config.
- `tsup.config.ts` — Build config; explicit `external` list for runtime deps so they stay in `node_modules`.
- `vitest.config.js` — Test config.
- `eslint.config.js` — Flat ESLint config.
- `.prettierrc` — Formatting rules.
- `.releaserc.json` — semantic-release config.
- `.npmignore` — Excludes source TS, tests, `openapi/`, IDE files from published package.
- `.env.example` — Template for local OAuth configuration; renamed to `.env` and consumed by `dotenv`.
- `glama.json` — Glama.ai MCP registry maintainer manifest.
- `npm run build` → `tsup` (emits to `dist/`)
- `npm run generate` → `node bin/generate-graph-client.mjs` (regenerates `src/generated/client.ts` from Microsoft Graph OpenAPI spec — required before build in CI per `.github/workflows/build.yml`).
- `npm run verify` → generate + lint + format:check + build + test.
## Platform Requirements
- Node.js 18+ (CI tests 18, 20, 22).
- npm.
- Optional: `keytar` build toolchain (Python, C++ compiler) for OS keychain support; not required.
- Container deployment recommended. Reference deployments documented for:
- Distribution: published to npm as `@softeria/ms-365-mcp-server` and Docker image `ghcr.io/softeria/ms-365-mcp-server`.
- Binary entrypoint: `dist/index.js` (declared as `bin.ms-365-mcp-server` in `package.json`); shebang `#!/usr/bin/env node` set in `src/index.ts` and `chmod +x` applied by tsup `onSuccess`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Source files: kebab-case `.ts` (e.g., `graph-client.ts`, `auth-tools.ts`, `cloud-config.ts`, `microsoft-auth.ts`, `request-context.ts`)
- Test files: kebab-case with `.test.ts` suffix (e.g., `auth-paths.test.ts`, `multi-account.test.ts`, `path-encoding.test.ts`)
- One legacy `.test.js` test exists at `test/calendar-fix.test.js`
- Setup file: `test/setup.ts`
- Generated code lives under `src/generated/` (`client.ts`, `endpoint-types.ts`, `hack.ts`) and is excluded from lint via `eslint.config.js`
- Library/utility modules grouped under `src/lib/` (e.g., `src/lib/bm25.ts`, `src/lib/teams-url-parser.ts`, `src/lib/microsoft-auth.ts`, `src/lib/tool-schema.ts`)
- camelCase for all functions: `parseArgs`, `buildScopesFromEndpoints`, `getCloudEndpoints`, `parseCloudType`, `isBinaryContentType`, `clampTopQueryParam`, `wrapCache`, `unwrapCache`, `pickNewest`
- Async functions use the `async` keyword: `async function exchangeCodeForToken(...)`, `async function refreshAccessToken(...)`
- Internal helpers can be unexported in the same file (e.g., `createMsalConfig`, `ensureParentDir` in `src/auth.ts`)
- React-style hook naming is not used (this is a Node CLI/server)
- camelCase for locals and parameters: `accessToken`, `refreshToken`, `clientCodeChallenge`, `serverCodeVerifier`, `tenantId`
- SCREAMING_SNAKE_CASE for module-level constants: `SERVICE_NAME`, `TOKEN_CACHE_ACCOUNT`, `SELECTED_ACCOUNT_KEY`, `FALLBACK_DIR`, `DEFAULT_TOKEN_CACHE_PATH`, `CLOUD_ENDPOINTS`, `DEFAULT_CLIENT_IDS`, `TOOL_CATEGORIES`, `SCOPE_HIERARCHY`, `DISCOVERY_MODE_INSTRUCTIONS_ADDON`
- Underscore-prefixed names for intentionally unused destructured / lint-ignored values: `const { accessToken: _redacted, ...safeOptions } = options;` and `const { $schema: _s, ...schema } = jsonSchema`. Lint rule allows `argsIgnorePattern: '^_'`.
- PascalCase for `interface` and `type`: `AppSecrets`, `CloudEndpoints`, `CommandOptions`, `EndpointConfig`, `ScopeHierarchy`, `LoginTestResult`, `RequestContext`, `BM25Index`, `BM25Doc`, `McpInstructionsContext`, `GraphRequestOptions`, `McpResponse`, `CallToolResult`, `DiscoverySearchIndex`
- String-literal union types for closed enums: `export type CloudType = 'global' | 'china';`, `outputFormat: 'json' | 'toon'`
- Class names PascalCase: `AuthManager`, `MicrosoftGraphServer`, `GraphClient`, `MicrosoftOAuthProvider`, `EnvironmentSecretsProvider`, `KeyVaultSecretsProvider`
- Type-only imports are used where appropriate: `import type { AccountInfo, Configuration } from '@azure/msal-node';`, `import type { AppSecrets } from './secrets.js';`, `import type { CommandOptions } from './cli.ts';`
## Code Style
- Tool: Prettier 3.x (`prettier@^3.5.3`), config at `.prettierrc`
- Settings (verbatim from `.prettierrc`):
- Format scripts in `package.json`:
- CI runs `format:check` (see `.github/workflows/build.yml`)
- Tool: ESLint 9.x with flat config at `eslint.config.js`
- Bases: `@eslint/js` recommended + `@typescript-eslint/eslint-plugin` recommended
- Parser: `@typescript-eslint/parser`, `ecmaVersion: 2022`, `sourceType: 'module'`
- Globals: `globals.node`, `globals.vitest`, `globals.jest`, plus a custom `fs: 'readonly'` global
- Custom rules:
- Ignored paths: `node_modules/**`, `dist/**`, `coverage/**`, `bin/**`, `src/generated/**`, `.venv/**`
- Lint scripts: `npm run lint` (eslint .), `npm run lint:fix` (eslint . --fix)
- Config at `tsconfig.json`:
- `include: ['src/**/*']`, `exclude: ['test/**/*']` — tests are not type-checked by `tsc` build (vitest handles them via tsx)
- Build via `tsup` (`tsup.config.ts`): emits ESM, target `es2020`, no bundling, no `dts`, `noExternal: []`, externals listed explicitly
- ESM throughout (`"type": "module"` in `package.json`); imports must include `.js` extensions even for `.ts` source: `import { parseArgs } from './cli.js';` — required by `module: NodeNext`
## Import Organization
- None. All imports use relative paths (`./`, `../`).
- `__dirname` polyfilled in ESM via `path.dirname(fileURLToPath(import.meta.url))` (see `src/cli.ts`, `src/auth.ts`, `src/logger.ts`, `src/version.ts`, `src/graph-tools.ts`)
## Error Handling
- Standard pattern: `(error as Error).message` after catching `unknown`. Used throughout `src/auth.ts`, `src/auth-tools.ts`, `src/index.ts`, `src/server.ts`.
- Fallback for non-Error throwables in entry point — `src/index.ts:102`:
## Logging
- Two file transports written to `MS365_MCP_LOG_DIR` (default `~/.ms-365-mcp-server/logs/`):
- Log directory created with mode `0o700` (owner-only)
- Optional console transport added by `enableConsoleLogging()` from `src/logger.ts:36-43` — invoked from `src/server.ts:157` when `args.v` (verbose) is set
- Format: `${timestamp} ${LEVEL}: ${message}` with timestamps formatted as `YYYY-MM-DD HH:mm:ss`
- Import: `import logger from './logger.js';`
- Levels in use: `logger.info(...)`, `logger.warn(...)`, `logger.error(...)` — `debug` exists but is rarely used in production code (only in `vi.mock` shims)
- Backtick template literals are the standard format: `logger.info(\`Selected account: ${this.selectedAccountId}\`)`
- Errors logged with both message and the error object: `logger.error('Microsoft Graph API request failed:', error);`
- **Secret redaction is mandatory before logging** — see `src/graph-tools.ts:382-385` for the established pattern:
- Logging at request boundaries — token endpoint, OAuth flows, and Graph API calls all log entry/exit (see `src/server.ts:399-404` for `Token endpoint called` log with redacted body summary)
- `console.log` / `console.error` are reserved for CLI bin output meant to be machine-readable (e.g., `JSON.stringify` results in `src/index.ts` and `src/cli.ts`)
- The lint rule `'no-console': 'off'` permits this; do not use `console.*` for application logging — use `logger.*`
## Comments
- Module-level JSDoc blocks describe purpose and design rationale (e.g., `src/secrets.ts:1-6`, `src/cloud-config.ts:1-9`, `src/lib/bm25.ts:1-6`)
- Function-level JSDoc for non-trivial public/exported functions documents purpose and parameters (e.g., `src/cloud-config.ts:55-60` `getDefaultClientId`, `src/lib/bm25.ts:30-37` `buildBM25Index`)
- Inline `//` comments explain the **why** of subtle decisions, not the **what**:
- Reference issue/URL pointers when fixing tricky bugs: `src/graph-tools.ts:211` references `https://github.com/Softeria/ms-365-mcp-server/issues/245`
- Used for exported helpers and provider interfaces; `@param`, `@returns`, `@throws`, `@deprecated`, `@see` tags appear (see `src/cloud-config.ts:60-65`)
- `@deprecated` tag used for soft-deprecation in `CommandOptions` interface (`src/cli.ts:101-102`):
- Convention is to use `DEPRECATED:` prefix in block comments for migration notes rather than `TODO`/`FIXME` (see `src/server.ts:215-222`, `src/cli.ts:71-73`)
- Inline `// eslint-disable-next-line` comments must include a justification on the same line. From `test/multi-account.test.ts:32`:
- No `// @ts-ignore` or `// @ts-expect-error` directives in `src/`. Maintain that — prefer narrowing over silencing the type checker.
## Function Design
- Most functions are ≤ 50 lines. The notable outlier is `MicrosoftGraphServer.start()` in `src/server.ts:155-651` which composes the entire HTTP/Express setup inline. Prefer extracting new HTTP handlers into helpers when adding routes.
- Pure helpers in `src/lib/` are short and single-purpose (e.g., `tokenize`, `parseTeamsUrl`, `unwrapOptional`).
- Plain positional parameters dominate (e.g., `executeGraphTool(tool, config, graphClient, params, authManager?)`)
- Default values supplied at the parameter list when reasonable: `tenantId: string = 'common'`, `cloudType: CloudType = 'global'`, `outputFormat: 'json' | 'toon' = 'json'`
- Options objects used when the parameter set is open-ended (e.g., `GraphRequestOptions` in `src/graph-client.ts:45-56`)
- Optional parameters use `?:` rather than `| undefined`
- Async functions explicitly return `Promise<T>`; `void` is annotated when there is no return value (e.g., `async function main(): Promise<void>` in `src/index.ts:10`)
- Tool handlers return a uniform `CallToolResult` (or `McpResponse`) object — always with a `content: [{ type: 'text', text: ... }]` array; failures add `isError: true`
- Pure functions return new objects rather than mutating inputs (immutability followed except in deliberately-mutating helpers like `removeODataProps` in `src/graph-client.ts:303-313` and `clampTopQueryParam` in `src/graph-tools.ts:57-64`, both of which document the mutation by name)
## Module Design
- Default exports for the primary class/instance of a module: `AuthManager` (`src/auth.ts`), `MicrosoftGraphServer` (`src/server.ts`), `GraphClient` (`src/graph-client.ts`), `logger` (`src/logger.ts`)
- Named exports for utilities, helpers, and types: `parseArgs`, `buildScopesFromEndpoints`, `registerAuthTools`, `registerGraphTools`, `registerDiscoveryTools`, `getCloudEndpoints`, `parseCloudType`, `getSecrets`, `clearSecretsCache`, `requestContext`, `getRequestTokens`, `tokenize`, `buildBM25Index`, `scoreQuery`, `parseTeamsUrl`, `describeToolSchema`
- Re-export type aliases inline: `export type { AppSecrets }` style is preferred to namespace pollution
- None. Each module is imported directly. Adding new code: keep a 1:1 file-to-feature relationship; do not introduce `index.ts` re-export barrels in `src/`.
## Validation
- Tool parameters: `z.boolean().default(false).describe('...')` (see `src/auth-tools.ts:10`), `z.string().describe('...')`
- Body parameter validation with `safeParse` and a graceful auto-wrap fallback for AI clients that pass nested fields raw (`src/graph-tools.ts:233-251`)
- Cloud type input validated through `parseCloudType` (`src/cloud-config.ts:94-103`) which throws on invalid input rather than silently defaulting
- `--enabled-tools` regex validated at startup (`src/cli.ts:144-154`) — invalid pattern fails fast rather than silently exposing all tools (security).
- Cloud type validated before storage (`src/cli.ts:186-188`).
- Environment variables read with explicit defaults: `process.env.MS365_MCP_TENANT_ID || 'common'`, `process.env.LOG_LEVEL || 'info'`, `process.env.MS365_MCP_BODY_FORMAT || 'text'`
- Boolean envs check both `'true'` and `'1'`: `process.env.READ_ONLY === 'true' || process.env.READ_ONLY === '1'` (used consistently across `src/cli.ts`, `src/logger.ts`)
- Numeric envs validated with `Number.parseInt` + `Number.isFinite` and an `info`/`warn` log on invalid input (`src/graph-tools.ts:43-55`)
## Async Patterns
- Always `async`/`await`; no raw `.then()` chains in `src/`
- `Promise.all` used for independent operations: `src/secrets.ts:70-77` parallel Key Vault fetches
- `AsyncLocalStorage` used for per-request token isolation: `src/request-context.ts:8` — call `requestContext.run(ctx, handler)` to scope, `getRequestTokens()` to read. Test coverage in `test/request-context.test.ts` proves no token leakage across overlapping requests.
- Lazy `await import(...)` for optional dependencies that may not be installed: `keytar` (`src/auth.ts:13-28`), `@azure/identity` and `@azure/keyvault-secrets` (`src/secrets.ts:62-63`)
## Verification Pipeline
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Tool catalog (~250+ Graph endpoints) is generated at build time from a trimmed Microsoft Graph OpenAPI spec into `src/generated/client.ts`, then registered as MCP tools at runtime by iterating `api.endpoints`.
- Single-binary CLI (`src/index.ts`) acts as both the server entry point and an out-of-band auth/admin tool (login, list-accounts, list-permissions, etc.).
- Two transport modes share the same MCP server construction path: `StdioServerTransport` (default, single user/process) and `StreamableHTTPServerTransport` (HTTP, stateless, with OAuth).
- Authentication is bimodal: MSAL device-code/interactive in stdio mode, full OAuth 2.1 + PKCE proxy (with two-leg PKCE) in HTTP mode.
- Per-request token isolation in HTTP mode via `AsyncLocalStorage` (`src/request-context.ts`), enabling multi-tenant request handling without leaking tokens between concurrent calls.
- Endpoint metadata is decoupled from generated code via `src/endpoints.json`, which carries scopes, `llmTip` strings, and per-endpoint flags (`returnDownloadUrl`, `supportsTimezone`, `skipEncoding`, `readOnly`, `contentType`, `acceptType`).
## Layers
- Purpose: Bootstrap the process; parse CLI flags/env vars; route between admin commands and server start.
- Location: `src/index.ts`, `src/cli.ts`
- Contains: `main()` orchestration, Commander definitions, env-var fallbacks, preset resolution, scope precomputation, account-management short-circuits.
- Depends on: `src/auth.js`, `src/server.js`, `src/cli.js`, `src/version.js`, `src/tool-categories.js`, `src/logger.js`.
- Used by: Node's `bin` entry (`dist/index.js` after build).
- Purpose: Construct `McpServer`, wire transports, and (in HTTP mode) host Express OAuth endpoints.
- Location: `src/server.ts`
- Contains: `MicrosoftGraphServer` class, `parseHttpOption`, two-leg PKCE store, `/authorize`, `/token`, `/register`, `/.well-known/oauth-*`, `/mcp` GET/POST handlers, CORS middleware, transport instantiation.
- Depends on: `@modelcontextprotocol/sdk`, `express`, `src/auth.js`, `src/graph-client.js`, `src/oauth-provider.js`, `src/lib/microsoft-auth.js`, `src/secrets.js`, `src/cloud-config.js`, `src/request-context.js`.
- Used by: `src/index.ts`.
- Purpose: MSAL token acquisition, account management, OAuth-mode passthrough, scope construction from the endpoint catalog.
- Location: `src/auth.ts`, `src/auth-tools.ts`, `src/oauth-provider.ts`, `src/lib/microsoft-auth.ts`
- Contains: `AuthManager` (MSAL `PublicClientApplication`), `buildScopesFromEndpoints`, scope hierarchy collapsing (`Mail.ReadWrite` shadows `Mail.Read`), keytar+file token cache with newest-wins selection, multi-account selection persistence, `MicrosoftOAuthProvider` (subclass of SDK `ProxyOAuthServerProvider`), `microsoftBearerTokenAuthMiddleware`, `exchangeCodeForToken`, `refreshAccessToken`.
- Depends on: `@azure/msal-node`, optional `keytar`, `src/secrets.js`, `src/cloud-config.js`.
- Used by: `src/index.ts`, `src/server.ts`, `src/graph-tools.ts`, `src/graph-client.ts`.
- Purpose: Translate the generated endpoint catalog into MCP tools with parameter schemas, scope/mode filtering, and discovery search.
- Location: `src/graph-tools.ts`, `src/auth-tools.ts`
- Contains: `registerGraphTools`, `registerDiscoveryTools`, `executeGraphTool`, `buildToolsRegistry`, `buildDiscoverySearchIndex`, `scoreDiscoveryQuery`, OData parameter decoration, multi-account `account` parameter injection, `parse-teams-url` utility tool, BM25 indexing.
- Depends on: `src/generated/client.js`, `src/endpoints.json`, `src/lib/bm25.js`, `src/lib/tool-schema.js`, `src/lib/teams-url-parser.js`, `src/tool-categories.js`, `src/request-context.js`.
- Used by: `src/server.ts` (called from `MicrosoftGraphServer.createMcpServer`).
- Purpose: Execute the actual outbound HTTP call to Microsoft Graph, handle 401-refresh, content-type sniffing, OData property scrubbing, and response shaping for MCP.
- Location: `src/graph-client.ts`
- Contains: `GraphClient.makeRequest`, `performRequest`, `graphRequest`, `formatJsonResponse`, `isBinaryContentType`, TOON serialization fallback.
- Depends on: `src/auth.js`, `src/secrets.js`, `src/cloud-config.js`, `src/lib/microsoft-auth.js`, `src/request-context.js`, `@toon-format/toon`.
- Used by: `src/graph-tools.ts` (via injected client).
- Purpose: Vendored, build-time-generated Zod-typed endpoint catalog from a trimmed Microsoft Graph OpenAPI spec.
- Location: `src/generated/client.ts` (gitignored, regenerated by `npm run generate`), `src/generated/hack.ts`, `src/generated/endpoint-types.ts`, `src/generated/README.md`
- Contains: `api.endpoints` array, `Zodios` shim, parameter normalization (strips `$`/`_`), path-param injection.
- Depends on: `zod`.
- Used by: `src/graph-tools.ts`, `src/lib/tool-schema.ts`.
- Purpose: Download Microsoft Graph OpenAPI spec, trim it to the curated endpoint set in `src/endpoints.json`, generate Zod client, post-process generated TypeScript.
- Location: `bin/generate-graph-client.mjs`, `bin/modules/download-openapi.mjs`, `bin/modules/simplified-openapi.mjs`, `bin/modules/generate-mcp-tools.mjs`, `bin/modules/extract-descriptions.mjs`
- Contains: spec download, schema pruning, recursive `$ref` flattening, `openapi-zod-client` invocation, HTML-entity decoding of generated path patterns, `.strict()` → `.passthrough()` rewrite, errors-array stripping.
- Depends on: `js-yaml`, npx `openapi-zod-client`, `@redocly/cli`.
- Used by: `npm run generate` (manually invoked, also runs in Docker build and CI).
- Purpose: Shared helpers and configuration with no upward dependencies.
- Location: `src/logger.ts`, `src/secrets.ts`, `src/cloud-config.ts`, `src/request-context.ts`, `src/version.ts`, `src/mcp-instructions.ts`, `src/tool-categories.ts`, `src/lib/*`
- Contains: Winston file logger (mcp-server.log + error.log under `~/.ms-365-mcp-server/logs`), env-or-Key-Vault secrets provider, cloud endpoint table (global/china), AsyncLocalStorage-based per-request token store, MCP `initialize.instructions` builder, regex-based tool-category presets, BM25 index, Teams URL parser, JSON-Schema describer.
- Depends on: `winston`, `@azure/identity` and `@azure/keyvault-secrets` (optional), Node built-ins.
- Used by: All other layers.
## Data Flow
- **Persistent**: MSAL token cache in OS keychain (via `keytar`) or `.token-cache.json` next to the `dist/` output (path overridable via `MS365_MCP_TOKEN_CACHE_PATH`); selected-account ID in the same dual storage (`MS365_MCP_SELECTED_ACCOUNT_PATH`). Both files are wrapped in a `_cacheEnvelope` with a `savedAt` timestamp so the newest copy wins on conflicts. Files are written with mode `0o600`.
- **In-memory (process)**: cached `AppSecrets` (`src/secrets.ts`), MSAL `PublicClientApplication` instance, `AuthManager.accessToken`/`tokenExpiry`, the two-leg PKCE store (`Map<state, …>` in `src/server.ts`, capped at 1000 entries / 10 min TTL).
- **Per-request**: `AsyncLocalStorage<RequestContext>` (`src/request-context.ts`) holds `{ accessToken, refreshToken }` for the lifetime of a single HTTP MCP call.
## Key Abstractions
- Purpose: SDK-provided server primitive that owns tool registration and JSON-RPC dispatch.
- Examples: instantiated in `src/server.ts:79` (`createMcpServer`), one instance per HTTP request in stateless mode (`src/server.ts:530`, `src/server.ts:580`).
- Pattern: server.tool(name, description, paramSchema, hints, handler).
- Purpose: Application-level wrapper that bundles transport choice, OAuth Express app, and per-mode tool wiring.
- Examples: `new MicrosoftGraphServer(authManager, args)` in `src/index.ts:98`.
- Pattern: Constructor → `initialize(version)` → `start()`.
- Purpose: Single owner of MSAL state, scope set, account selection, and OAuth-mode passthrough.
- Examples: `AuthManager.create(scopes)` in `src/index.ts:30`; consumed by `src/server.ts`, `src/graph-client.ts`, `src/graph-tools.ts`, `src/auth-tools.ts`, `src/oauth-provider.ts`.
- Pattern: Async factory (`create`) loads secrets first, then constructs MSAL config.
- Purpose: Token-aware HTTP client for Microsoft Graph; the single chokepoint for all outbound Graph traffic.
- Examples: instantiated in `src/server.ts:144` (`new GraphClient(authManager, secrets, outputFormat)`); used by `executeGraphTool` in `src/graph-tools.ts:388`.
- Pattern: `graphRequest(endpoint, options)` returns a normalized `McpResponse` (`{ content, _meta?, isError? }`).
- Purpose: Two-file source of truth for the tool surface. The generated file carries Zod schemas, methods, paths, and aliases; the JSON file carries scopes, work/personal split, `llmTip`, and per-endpoint feature flags.
- Examples: iterated in `src/graph-tools.ts:519` (`for (const tool of api.endpoints)`); the JSON is loaded via `readFileSync` in `src/auth.ts:42`, `src/graph-tools.ts:39`, and `src/server.ts` (indirectly via auth).
- Pattern: lookup pattern `endpointsData.find(e => e.toolName === tool.alias)` joins the two by tool name.
- Purpose: Subclasses the SDK's `ProxyOAuthServerProvider` to wire Microsoft's authorize/token/revocation URLs and verify access tokens by hitting `/me`.
- Examples: instantiated in `src/server.ts:201`, mounted via `mcpAuthRouter`.
- Pattern: dependency-injected into the SDK auth router.
- Purpose: Concurrency-safe per-request token storage using `AsyncLocalStorage`; replaces the MSAL cache as the source of truth for HTTP-mode tokens.
- Examples: `requestContext.run({ accessToken, refreshToken }, handler)` in `src/server.ts:546`/`src/server.ts:596`; `getRequestTokens()` consumed in `src/graph-client.ts:89` and `src/graph-tools.ts:133`.
- Pattern: read-through fallback — `options.accessToken ?? contextTokens?.accessToken ?? authManager.getToken()`.
- Purpose: Lazy alternative to upfront tool registration — when `--discovery` is set, the server registers exactly three meta-tools (`search-tools`, `get-tool-schema`, `execute-tool`) plus auth helpers, and a BM25-ranked index drives discovery.
- Examples: `buildDiscoverySearchIndex` (`src/graph-tools.ts:790`), `scoreDiscoveryQuery` (`src/graph-tools.ts:832`), `registerDiscoveryTools` (`src/graph-tools.ts:859`).
- Pattern: tokens from name (5×), path (2×), capped llmTip (12 tokens), capped description (40 tokens) feed BM25; query scoring then adds a name-precision bonus.
## Entry Points
- Location: `src/index.ts` (compiled to `dist/index.js`, `#!/usr/bin/env node` shebang made executable by `tsup` `onSuccess` hook).
- Triggers: `npx @softeria/ms-365-mcp-server`, the `bin` entry from `package.json`, MCP host configurations.
- Responsibilities: parse args, run admin sub-commands and exit, or instantiate `MicrosoftGraphServer` and connect to `StdioServerTransport`.
- Location: `src/server.ts:174` (the `if (this.options.http)` branch inside `start()`).
- Triggers: `--http [host:port]` CLI flag.
- Responsibilities: build Express app, mount OAuth discovery / authorize / token / register / `/mcp` routes, listen on the requested host:port.
- Location: `src/graph-tools.ts:120` (`executeGraphTool`).
- Triggers: any MCP `tools/call` whose alias matches a registered Graph endpoint, or `execute-tool` in discovery mode.
- Responsibilities: parameter normalization, scope/account resolution, request construction, pagination (`fetchAllPages`), response shaping.
- Location: `bin/generate-graph-client.mjs`.
- Triggers: `npm run generate` (manual; required before `npm run build` and run inside the Docker `builder` stage).
- Responsibilities: download upstream OpenAPI YAML → trim per `src/endpoints.json` → run `openapi-zod-client` → post-process the generated `src/generated/client.ts`.
## Error Handling
- **CLI errors**: `src/index.ts` catches at the `main()` boundary, logs via Winston, `console.error`s the message, and exits with code 1.
- **Tool execution errors**: `executeGraphTool` (`src/graph-tools.ts:479`) catches everything and returns `{ content: [{ type: 'text', text: JSON.stringify({ error }) }], isError: true }` so MCP clients see a structured error rather than a transport-level exception.
- **Graph 401**: `GraphClient.makeRequest` (`src/graph-client.ts:101`) attempts a single refresh-token swap and retries.
- **Graph 403 with "scope" or "permission"**: thrown with a hint to restart the server with `--org-mode` (`src/graph-client.ts:113`).
- **OAuth endpoint errors**: HTTP handlers in `src/server.ts` log via Winston and respond with RFC-6749 error envelopes (`{ error, error_description }`) and appropriate status codes (400/500/503).
- **Account resolution errors**: `AuthManager.resolveAccount` and `getTokenForAccount` throw with a list of available accounts in the message so the LLM can self-correct.
- **Codegen / Key Vault failures**: surface as thrown errors at startup; Key Vault failures are non-recoverable, env fallback only kicks in if `MS365_MCP_KEYVAULT_URL` is unset.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- The project graph is intentionally scoped to `src/**` and `test/**`; `src/generated/**` is excluded because generated Graph clients drown out useful relationships.
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files.
- Use `graphify query` for broad relationship questions, `graphify path` for dependency chains between two concepts, and `graphify explain` for one-node context.
- When spawning GSD, lazy, or general-purpose agents for exploration, planning, review, debugging, or implementation, include: "Read `graphify-out/GRAPH_REPORT.md` first. Prefer `graphify query`, `graphify path`, and `graphify explain` before raw search. After code changes, run `graphify update .` and verify `/gsd-graphify status` is fresh."
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost), then run `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs graphify status` and confirm `stale: false` and `commit_stale: false`.

## Cloud-session bootstrap

`.claude/settings.json` registers a SessionStart hook at `scripts/cc-web-bootstrap.sh`. It is a no-op on local sessions and only fires when `CLAUDE_CODE_REMOTE=true`. The hook installs dependencies, exports build-time env stubs that mirror CI, provisions Postgres/pgvector/Redis for cloud sessions, and delegates to `.claude/setup.sh` for downstream wiring.

## GSD agent invocation in this repo

GSD subagent definitions live at `.claude/agents/gsd-*.md` and are auto-registered as native `subagent_type` values when cloud sessions load them. Prefer `Agent(subagent_type: "gsd-planner", ...)` over the `lazy-agent` skill bridge in this repo. The `lazy-agent` skill is retained as a compatibility shim for local sessions where the user-scope `~/.claude/agents-lazy/` convention applies.

This repo's `.claude/` override supersedes any user-global rule that forbids `Agent(subagent_type: "gsd-*")`.

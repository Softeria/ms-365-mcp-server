# ms-365-mcp-server

[![npm version](https://img.shields.io/npm/v/@softeria/ms-365-mcp-server.svg)](https://www.npmjs.com/package/@softeria/ms-365-mcp-server) [![build status](https://github.com/softeria/ms-365-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/softeria/ms-365-mcp-server/actions/workflows/build.yml) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/softeria/ms-365-mcp-server/blob/main/LICENSE)

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 and Microsoft Office services through the Graph
API.

## Supported Clouds

This server supports multiple Microsoft cloud environments:

| Cloud                | Description                        | Auth Endpoint             | Graph API Endpoint              |
| -------------------- | ---------------------------------- | ------------------------- | ------------------------------- |
| **Global** (default) | International Microsoft 365        | login.microsoftonline.com | graph.microsoft.com             |
| **China** (21Vianet) | Microsoft 365 operated by 21Vianet | login.chinacloudapi.cn    | microsoftgraph.chinacloudapi.cn |

## Prerequisites

- Node.js >= 20 (recommended)
- Node.js 14+ may work with dependency warnings

## Features

- Authentication via Microsoft Authentication Library (MSAL)
- Comprehensive Microsoft 365 service integration
- Read-only mode support for safe operations
- Tool filtering for granular access control

## Output Format: JSON vs TOON

The server supports two output formats that can be configured globally:

### JSON Format (Default)

Standard JSON output with pretty-printing:

```json
{
  "value": [
    {
      "id": "1",
      "displayName": "Alice Johnson",
      "mail": "alice@example.com",
      "jobTitle": "Software Engineer"
    }
  ]
}
```

### (experimental) TOON Format

[Token-Oriented Object Notation](https://github.com/toon-format/toon) for efficient LLM token usage:

```
value[1]{id,displayName,mail,jobTitle}:
  "1",Alice Johnson,alice@example.com,Software Engineer
```

**Benefits:**

- 30-60% fewer tokens vs JSON
- Best for uniform array data (lists of emails, calendar events, files, etc.)
- Ideal for cost-sensitive applications at scale

**Usage:**
(experimental) Enable TOON format globally:

Via CLI flag:

```bash
npx @softeria/ms-365-mcp-server --toon
```

Via Claude Desktop configuration:

```json
{
  "mcpServers": {
    "ms365": {
      "command": "npx",
      "args": ["-y", "@softeria/ms-365-mcp-server", "--toon"]
    }
  }
}
```

Via environment variable:

```bash
MS365_MCP_OUTPUT_FORMAT=toon npx @softeria/ms-365-mcp-server
```

## Supported Services & Tools

The server provides 200+ tools covering most of the Microsoft Graph API surface. Each tool maps 1-to-1 to a Graph API endpoint and is defined declaratively in [`src/endpoints.json`](src/endpoints.json).

### Personal Account Tools (Available by default)

Email (Outlook), Calendar, OneDrive Files, Excel, OneNote, To Do Tasks, Planner, Contacts, User Profile, Search

### Organization Account Tools (Requires --org-mode flag)

Teams & Chats, Online Meetings, Transcripts & Recordings, Attendance Reports, SharePoint Sites & Lists, Shared Mailboxes & Calendars, User Management, Presence, Virtual Events

### Required Graph API Permissions

Permissions are requested dynamically based on which tools are enabled. Use `--list-permissions` to see the exact permissions for your configuration:

```bash
# Personal mode (default)
npx @softeria/ms-365-mcp-server --list-permissions

# Organization mode (includes Teams, SharePoint, etc.)
npx @softeria/ms-365-mcp-server --org-mode --list-permissions

# Filtered by preset
npx @softeria/ms-365-mcp-server --preset mail --list-permissions
```

This is useful for enterprise environments where Graph API permissions must be pre-approved and admin-consented before deploying a new version.

The `--list-permissions` JSON includes:

- `toolPermissions`: permissions implied by the tool surface before `--allowed-scopes` filtering
- `effectivePermissions`: permissions implied by the tools that remain enabled after `--allowed-scopes`
- `permissions`: legacy alias for `effectivePermissions`, kept for compatibility with existing scripts
- `allowedScopes`: the configured scope allowlist, when provided
- `disabledTools`: tools hidden because their required Graph scopes are not covered by `allowedScopes`
- `missingAllowedScopesForTools`: unique missing scopes across disabled tools
- `extraAllowedScopesNotUsedByTools`: allowed scopes that are not used by the current tool surface

### Allowed Scopes

By default, MSAL requests the scopes implied by the enabled tools, and the tool surface is controlled by `--enabled-tools`, `--preset`, `--org-mode`, and `--read-only`.

Enterprise and headless deployments can add a scope boundary with `--allowed-scopes` or `MS365_MCP_ALLOWED_SCOPES`. When configured, the server first computes the normal tool surface, then hides Graph tools whose required scopes are not covered by the allowlist. OAuth metadata and login flows request only the effective permissions for the tools that remain enabled.

```bash
npx @softeria/ms-365-mcp-server \
  --org-mode \
  --enabled-tools '^(list-mail-messages|get-mail-message|list-drives|get-drive-item|download-bytes)$' \
  --allowed-scopes 'User.Read Mail.Read Files.Read'
```

CLI value takes precedence over `MS365_MCP_ALLOWED_SCOPES`; if neither is set, the default tool-derived scope behavior is unchanged. Supplying an empty value fails at startup so deployments do not accidentally fall back to a wider tool surface.

Scope coverage is hierarchy-aware: for example, `Mail.ReadWrite` covers tools that require `Mail.Read`, and `Files.ReadWrite.All` covers tools that require `Files.Read`.

In HTTP mode, OAuth discovery advertises the effective filtered permissions so clients request the same consent surface. On-Behalf-Of mode (`--obo`) still advertises `api://<clientId>/access_as_user` for protected-resource metadata; `--allowed-scopes` does not override OBO.

## Organization/Work Mode

To access work/school features (Teams, SharePoint, etc.), enable organization mode using any of these flags:

```json
{
  "mcpServers": {
    "ms365": {
      "command": "npx",
      "args": ["-y", "@softeria/ms-365-mcp-server", "--org-mode"]
    }
  }
}
```

Organization mode must be enabled from the start to access work account features. Without this flag, only personal
account features (email, calendar, OneDrive, etc.) are available.

## Shared Mailbox Access

To access shared mailboxes, you need:

1. **Organization mode**: Shared mailbox tools require `--org-mode` flag (work/school accounts only)
2. **Delegated permissions**: `Mail.Read.Shared` or `Mail.Send.Shared` scopes
3. **Exchange permissions**: The signed-in user must have been granted access to the shared mailbox
4. **Usage**: Use the shared mailbox's email address as the `user-id` parameter in the shared mailbox tools

**Finding shared mailboxes**: Use the `list-users` tool to discover available users and shared mailboxes in your
organization.

Example: `list-shared-mailbox-messages` with `user-id` set to `shared-mailbox@company.com`

## Quick Start Example

Test login in Claude Desktop:

![Login example](https://github.com/user-attachments/assets/27f57f0e-57b8-4366-a8d1-c0bdab79900c)

## Examples

![Image](https://github.com/user-attachments/assets/ed275100-72e8-4924-bcf2-cd8e1b4c6f3a)

## Integration

### Claude Desktop

To add this MCP server to Claude Desktop, edit the config file under Settings > Developer.

#### Personal Account (MSA)

```json
{
  "mcpServers": {
    "ms365": {
      "command": "npx",
      "args": ["-y", "@softeria/ms-365-mcp-server"]
    }
  }
}
```

#### Work/School Account (Global)

```json
{
  "mcpServers": {
    "ms365": {
      "command": "npx",
      "args": ["-y", "@softeria/ms-365-mcp-server", "--org-mode"]
    }
  }
}
```

#### Work/School Account (China 21Vianet)

```json
{
  "mcpServers": {
    "ms365-china": {
      "command": "npx",
      "args": ["-y", "@softeria/ms-365-mcp-server", "--org-mode", "--cloud", "china"]
    }
  }
}
```

### Claude Code CLI

#### Personal Account (MSA)

```bash
claude mcp add ms365 -- npx -y @softeria/ms-365-mcp-server
```

#### Work/School Account (Global)

```bash
# macOS/Linux
claude mcp add ms365 -- npx -y @softeria/ms-365-mcp-server --org-mode

# Windows (use cmd /c wrapper)
claude mcp add ms365 -s user -- cmd /c "npx -y @softeria/ms-365-mcp-server --org-mode"
```

#### Work/School Account (China 21Vianet)

```bash
# macOS/Linux
claude mcp add ms365-china -- npx -y @softeria/ms-365-mcp-server --org-mode --cloud china

# Windows (use cmd /c wrapper)
claude mcp add ms365-china -s user -- cmd /c "npx -y @softeria/ms-365-mcp-server --org-mode --cloud china"
```

For other interfaces that support MCPs, please refer to their respective documentation for the correct
integration method.

### Open WebUI

Open WebUI supports MCP servers via HTTP transport with OAuth 2.1.

1. Start the server with HTTP mode:

   ```bash
   npx @softeria/ms-365-mcp-server --http
   ```

2. In Open WebUI, go to **Admin Settings → Tools** (`/admin/settings/tools`) → **Add Connection**:
   - **Type**: MCP Streamable HTTP
   - **URL**: Your MCP server URL with `/mcp` path
   - **Auth**: OAuth 2.1

3. Click **Register Client**.

> **Note**: Dynamic client registration is enabled by default in HTTP mode. Use `--no-dynamic-registration` to disable it. If using a custom Azure Entra app, add your redirect URI under "Mobile and desktop applications" platform (not "Single-page application").

**Quick test setup** using the default Azure app (ID `ms-365` and `localhost:8080` are pre-configured):

```bash
docker run -d -p 8080:8080 \
  -e WEBUI_AUTH=false \
  -e OPENAI_API_KEY \
  ghcr.io/open-webui/open-webui:main

npx @softeria/ms-365-mcp-server --http
```

Then add connection with URL `http://localhost:3000/mcp` and ID `ms-365`.

![Open WebUI MCP Connection](https://github.com/user-attachments/assets/dcab71dd-cf02-4bcb-b7db-5725d6be4064)

> **Running in Docker behind a reverse proxy?** Set `--public-url https://your-domain.com` so the OAuth authorize URL handed to the user's browser is reachable from outside the container network. See [docs/deployment.md](docs/deployment.md) for the full guide.

### Local Development

For local development or testing:

```bash
# From the project directory
claude mcp add ms -- npx tsx src/index.ts --org-mode
```

Or configure Claude Desktop manually:

```json
{
  "mcpServers": {
    "ms365": {
      "command": "node",
      "args": ["/absolute/path/to/ms-365-mcp-server/dist/index.js", "--org-mode"]
    }
  }
}
```

> **Note**: Run `npm run build` after code changes to update the `dist/` folder.

### Authentication

> ⚠️ You must authenticate before using tools.

The server supports three authentication methods:

#### 1. Device Code Flow (Default)

For interactive authentication via device code:

- **MCP client login**:
  - Call the `login` tool (auto-checks existing token)
  - If needed, get URL+code, visit in browser
  - Use `verify-login` tool to confirm
- **CLI login**:
  ```bash
  npx @softeria/ms-365-mcp-server --login
  ```
  Follow the URL and code prompt in the terminal.

Tokens are cached securely in your OS credential store (fallback to file).

#### 2. OAuth Authorization Code Flow (HTTP mode only)

When running with `--http`, the server **requires** OAuth authentication:

```bash
npx @softeria/ms-365-mcp-server --http 3000
```

This mode:

- Advertises OAuth capabilities to MCP clients
- Provides OAuth endpoints at `/auth/*` (authorize, token, metadata)
- **Requires** `Authorization: Bearer <token>` for all MCP requests
- Validates tokens with Microsoft Graph API
- **Disables** login/logout tools by default (use `--enable-auth-tools` to enable them)

MCP clients will automatically handle the OAuth flow when they see the advertised capabilities.

##### Setting up Azure AD for OAuth Testing

To use OAuth mode with custom Azure credentials (recommended for production), you'll need to set up an Azure AD app
registration:

1. **Create Azure AD App Registration**:

- Go to [Azure Portal](https://portal.azure.com)
- Navigate to Azure Active Directory → App registrations → New registration
- Set name: "MS365 MCP Server"

2. **Configure Redirect URIs**:

- **Configure the OAuth callback URI**: Go to your app registration and on the left side, go to Authentication.
- Under Platform configurations:
  - Click Add a platform (if you don’t already see one for "Mobile and desktop applications" / "Public client").
  - Choose Mobile and desktop applications or Public client/native (mobile & desktop) (label depends on portal version).

3. **Testing with MCP Inspector (`npm run inspector`)**:

- Go to your app registration and on the left side, go to Authentication.
- Under Platform configurations:
  - Click Add a platform (if you don’t already see one for "Web").
  - Choose Web.
  - Configure the following redirect URIs
    - `http://localhost:6274/oauth/callback`
    - `http://localhost:6274/oauth/callback/debug`
    - `http://localhost:3000/callback` (optional, for server callback)

4. **Get Credentials**:

- Copy the **Application (client) ID** from Overview page
- Go to Certificates & secrets → New client secret → Copy the secret value (optional for public apps)

5. **Configure Environment Variables**:
   Create a `.env` file in your project root:
   ```env
   MS365_MCP_CLIENT_ID=your-azure-ad-app-client-id-here
   MS365_MCP_CLIENT_SECRET=your-secret-here  # Optional for public apps
   MS365_MCP_TENANT_ID=common
   ```

With these configured, the server will use your custom Azure app instead of the built-in one.

#### 3. Bring Your Own Token (BYOT)

If you are running ms-365-mcp-server as part of a larger system that manages Microsoft OAuth tokens externally, you can
provide an access token directly to this MCP server:

```bash
MS365_MCP_OAUTH_TOKEN=your_oauth_token npx @softeria/ms-365-mcp-server
```

This method:

- Bypasses the interactive authentication flows
- Use your pre-existing OAuth token for Microsoft Graph API requests
- Does not handle token refresh (token lifecycle management is your responsibility)

> **Note**: HTTP mode requires authentication. For unauthenticated testing, use stdio mode with device code flow.
>
> **Authentication Tools**: In HTTP mode, login/logout tools are disabled by default since OAuth handles authentication.
> Use `--enable-auth-tools` if you need them available.

## Multi-Account Support

Use a single server instance to serve multiple Microsoft accounts. When more than one account is logged in, an `account` parameter is automatically injected into every tool, allowing you to specify which account to use per tool call.

**Login multiple accounts** (one-time per account):

```bash
# Login first account (device code flow)
npx @softeria/ms-365-mcp-server --login
# Follow the device code prompt, sign in as personal@outlook.com

# Login second account
npx @softeria/ms-365-mcp-server --login
# Follow the device code prompt, sign in as work@company.com
```

**List configured accounts:**

```bash
npx @softeria/ms-365-mcp-server --list-accounts
```

**Use in tool calls:** Pass `"account": "work@company.com"` in any tool request:

```json
{ "tool": "list-mail-messages", "arguments": { "account": "work@company.com" } }
```

**Behavior:**

- With a **single account** configured, it auto-selects (no `account` parameter needed).
- With **multiple accounts** and no `account` parameter, the server uses the selected default or returns a helpful error listing available accounts.
- **100% backward compatible**: existing single-account setups work unchanged.
- The `account` parameter accepts email address (e.g. `user@outlook.com`) or MSAL `homeAccountId`.

### Strict Account Pinning

Headless stdio deployments can pin the local MSAL cache to one expected Microsoft account:

```bash
# Username matching is case-insensitive
MS365_MCP_EXPECTED_USERNAME=work@company.com npx @softeria/ms-365-mcp-server --login

# Or pin the exact MSAL homeAccountId shown by --list-accounts
npx @softeria/ms-365-mcp-server --expected-home-account-id <homeAccountId> --login
```

Use `--list-accounts` to discover `homeAccountId` values. The MCP `list-accounts` tool intentionally hides account IDs, so use the CLI for exact ID pinning.

Pinning is opt-in and local-MSAL only:

- CLI values (`--expected-username`, `--expected-home-account-id`) take precedence over `MS365_MCP_EXPECTED_USERNAME` and `MS365_MCP_EXPECTED_HOME_ACCOUNT_ID`.
- Supplying an empty pin value fails at startup instead of being ignored.
- Username pins are compared case-insensitively; `homeAccountId` pins are exact.
- If both pins are set, they must resolve to the same cached account.
- Local stdio startup fails fast when the expected account is not in the token cache. Bootstrap by setting the pin, running `--login`, then starting the headless server.
- Device-code and browser logins reject a missing or mismatched account before persisting the selected account or token cache.
- Pinning collapses the effective MCP mode to single-account: the server does not advertise an `account` parameter and MCP instructions do not suggest account switching.
- `--http`, `--obo`, and `MS365_MCP_OAUTH_TOKEN` use request-provided tokens for Graph calls, so account pins are warning-only in those modes. If HTTP auth tools are enabled, the pin still applies to those local MSAL helper flows.
- `--logout` clears all cached accounts, including the pinned account. For surgical cleanup, prefer `--remove-account <id>`.

> **For MCP multiplexers (Legate, Governor):** Multi-account mode replaces the N-process pattern. Instead of spawning one server per account, a single instance handles all accounts via the `account` parameter, reducing tool duplication from N×110 to 110.

## Tool Presets

To reduce initial connection overhead, use preset tool categories instead of loading all 90+ tools:

```bash
npx @softeria/ms-365-mcp-server --preset mail
npx @softeria/ms-365-mcp-server --list-presets  # See all available presets
```

Available presets: `mail`, `calendar`, `files`, `personal`, `work`, `excel`, `contacts`, `tasks`, `onenote`, `search`, `users`, `outlook`, `onedrive`, `teams`, `all`

Each endpoint in `endpoints.json` declares which presets it belongs to via a `presets` array, so every preset is an exact tool-name allow-list that never over-matches across apps (e.g. `mail` does not include shared-mailbox tools; those are in `work`).

The `outlook`, `onedrive` and `teams` presets are app-scoped: they expose exactly one Microsoft app. Use these for "expose exactly one app" deployments:

```bash
# Outlook only (mail + calendar + contacts; no shared mailboxes, no files)
npx @softeria/ms-365-mcp-server --preset outlook

# Teams only (requires --org-mode)
npx @softeria/ms-365-mcp-server --org-mode --preset teams
```

## Dynamic Tool Discovery

Instead of loading all 90+ tools upfront, use dynamic discovery so the LLM finds and loads tools only when it needs them:

```bash
npx @softeria/ms-365-mcp-server --discovery
```

Keeps the initial context small and cuts token usage, especially useful for long sessions or cost-sensitive setups (e.g. Open WebUI running against a paid API).

## CLI Options

The following options can be used when running ms-365-mcp-server directly from the command line:

```
--login           Login using device code flow
--logout          Log out and clear saved credentials
--verify-login    Verify login without starting the server
--list-permissions List required Graph API permissions and exit (respects --org-mode, --preset, --enabled-tools, --allowed-scopes)
--org-mode        Enable organization/work mode from start (includes Teams, SharePoint, etc.)
--work-mode       Alias for --org-mode
--force-work-scopes Backwards compatibility alias for --org-mode (deprecated)
--cloud <type>    Microsoft cloud environment: global (default) or china (21Vianet)
--allowed-scopes <scopes> Limit exposed tools to Graph scopes covered by this allowlist
--expected-username <username> Require local MSAL auth to use this account username
--expected-home-account-id <id> Require local MSAL auth to use this exact homeAccountId
```

### Server Options

When running as an MCP server, the following options can be used:

```
-v                Enable verbose logging
--read-only       Start server in read-only mode, disabling write operations
--http [port]     Use Streamable HTTP transport instead of stdio (optionally specify port, default: 3000)
                  Starts Express.js server with MCP endpoint at /mcp
--enable-auth-tools Enable login/logout tools when using HTTP mode (disabled by default in HTTP mode)
--no-dynamic-registration Disable OAuth Dynamic Client Registration (enabled by default in HTTP mode)
--enabled-tools <pattern> Filter tools using regex pattern (e.g., "excel|contact" to enable Excel and Contact tools)
--preset <names>  Use preset tool categories (comma-separated). See "Tool Presets" section above
--list-presets    List all available presets and exit
--toon            (experimental) Enable TOON output format for 30-60% token reduction
--discovery       Dynamic tool discovery: loads tools on demand to reduce initial token usage (see "Dynamic Tool Discovery" above)
--public-url <url> Public base URL for OAuth when behind a reverse proxy (see Open WebUI section and docs/deployment.md)
```

Environment variables:

- `READ_ONLY=true|1`: Alternative to --read-only flag
- `ENABLED_TOOLS`: Filter tools using a regex pattern (alternative to --enabled-tools flag)
- `MS365_MCP_ORG_MODE=true|1`: Enable organization/work mode (alternative to --org-mode flag)
- `MS365_MCP_FORCE_WORK_SCOPES=true|1`: Backwards compatibility for MS365_MCP_ORG_MODE
- `MS365_MCP_OUTPUT_FORMAT=toon`: Enable TOON output format (alternative to --toon flag)
- `MS365_MCP_MAX_TOP=<n>`: Hard cap for Graph `$top` / `top` on list requests (positive integer). When the model passes a larger value, the server clamps it to `n` so responses stay smaller. Example: `MS365_MCP_MAX_TOP=15`
- `MS365_MCP_MAX_PAGES=<n>`: Maximum number of pages followed when a tool is called with `fetchAllPages: true` (positive integer, default `100`). Bounds memory and latency for large result sets.
- `MS365_MCP_MAX_ITEMS=<n>`: Maximum number of items accumulated when `fetchAllPages: true` (positive integer, default `10000`). Pagination stops and the response is truncated once this many items are collected.
- `MS365_MCP_ALLOW_PAGINATION=0|false|no`: Disable multi-page following entirely. When set, the `fetchAllPages` parameter is not advertised on tools, and any request that still passes it returns only the first page (default: pagination enabled).
- `MS365_MCP_BODY_FORMAT=html`: Return email bodies as HTML instead of plain text (default: text)
- `MS365_MCP_RATE_LIMIT_DISABLED=true|1`: Disable per-IP rate limiting in HTTP mode (default: enabled — 30 req/min on `/authorize`, `/token`, `/register`; 120 req/min on `/mcp`)
- `MS365_MCP_TRUST_PROXY_HOPS=<n>`: Number of trusted reverse-proxy hops in HTTP mode (default `1`). Accurate per-IP rate limiting depends on this matching your deployment — set to the number of proxies in front of the server, `0` to use the raw socket peer IP, or a comma-separated subnet list
- `MS365_MCP_CLOUD_TYPE=global|china`: Microsoft cloud environment (alternative to --cloud flag)
- `LOG_LEVEL`: Set logging level (default: 'info')
- `SILENT=true|1`: Disable console output
- `MS365_MCP_REDACT_PII=true|1`: Scrub JWTs, Bearer headers, OAuth token fields, and email addresses from log messages before they are written (default: disabled). Useful when logs are shipped to a central store or shared host.
- `MS365_MCP_CLIENT_ID`: Custom Azure app client ID (defaults to built-in app)
- `MS365_MCP_TENANT_ID`: Custom tenant ID (defaults to 'common' for multi-tenant)
- `MS365_MCP_OAUTH_TOKEN`: Pre-existing OAuth token for Microsoft Graph API (BYOT method)
- `MS365_MCP_KEYVAULT_URL`: Azure Key Vault URL for secrets management (see Azure Key Vault section)
- `MS365_MCP_TOKEN_CACHE_PATH`: Custom file path for MSAL token cache (see Token Storage below)
- `MS365_MCP_SELECTED_ACCOUNT_PATH`: Custom file path for selected account metadata (see Token Storage below)
- `MS365_MCP_AUTH_CACHE_COMMAND`: External executable wrapper for provider-neutral auth-cache storage (see Token Storage below)
- `MS365_MCP_AUTH_CACHE_COMMAND_TIMEOUT_MS`: Per-invocation timeout for `MS365_MCP_AUTH_CACHE_COMMAND` (default: `10000`)
- `MS365_MCP_EXPECTED_USERNAME`: Require local MSAL auth to use this Microsoft account username (case-insensitive; CLI flag takes precedence)
- `MS365_MCP_EXPECTED_HOME_ACCOUNT_ID`: Require local MSAL auth to use this exact MSAL homeAccountId (CLI flag takes precedence)

## Token Storage

Authentication tokens are stored using the OS credential store (via keytar) when available. If keytar is not installed or fails (common on headless Linux), the server falls back to file-based storage.

**Default fallback paths** are relative to the installed package directory. This means tokens can be lost when the package is reinstalled or updated via npm.

To persist tokens across updates, set custom paths outside the package directory:

```bash
export MS365_MCP_TOKEN_CACHE_PATH="$HOME/.config/ms365-mcp/.token-cache.json"
export MS365_MCP_SELECTED_ACCOUNT_PATH="$HOME/.config/ms365-mcp/.selected-account.json"
```

Parent directories are created automatically. Files are written with `0600` permissions.

> **Security note**: File-based token storage writes sensitive credentials to disk. Ensure the chosen directory has appropriate access controls. The OS credential store (keytar) is preferred when available.

> **Hosted/sandboxed environments** (e.g. Anthropic Cowork): Set `MS365_MCP_TOKEN_CACHE_PATH` and `MS365_MCP_SELECTED_ACCOUNT_PATH` to a persistent mount so tokens survive between sessions.

### External auth-cache command

Headless local-MSAL deployments can replace the built-in keytar/file storage with a provider-neutral external command:

```bash
export MS365_MCP_AUTH_CACHE_COMMAND="/path/to/ms365-auth-cache-store"
export MS365_MCP_AUTH_CACHE_COMMAND_TIMEOUT_MS=10000
```

When `MS365_MCP_AUTH_CACHE_COMMAND` is set for a local auth flow, the server uses only that command for the MSAL token cache and selected-account metadata. It does not fall back to keytar or local files. If the command path is missing, not executable on POSIX, exits non-zero, times out, or returns malformed data, auth-cache operations fail closed with a sanitized error message.

The value must be a real executable wrapper path. It is not a shell command string, and there is no companion args environment variable. Put any interpreter, region, profile, or provider-specific settings inside the wrapper. Windows users should point the variable at a wrapper executable or script that can be launched directly by Node without shell parsing.

The server invokes the wrapper with:

```text
$MS365_MCP_AUTH_CACHE_COMMAND load token-cache
$MS365_MCP_AUTH_CACHE_COMMAND save token-cache
$MS365_MCP_AUTH_CACHE_COMMAND delete token-cache
$MS365_MCP_AUTH_CACHE_COMMAND load selected-account
$MS365_MCP_AUTH_CACHE_COMMAND save selected-account
$MS365_MCP_AUTH_CACHE_COMMAND delete selected-account
```

Protocol v1:

- `load <key>` reads no stdin. Exit `0` with `{"found":true,"value":"<stored envelope string>"}` when present. A miss is exit `0` with `{"found":false}` or empty stdout.
- `save <key>` receives `{"value":"<stamped envelope string>"}` on stdin and must exit `0` only after the value is durably committed. There are no fire-and-forget or coalesced saves in v1.
- `delete <key>` reads no stdin and exits `0` whether the key existed or not.
- `<key>` is `token-cache` or `selected-account`.
- Any non-zero exit is a storage error. Do not use exit code `2` for cache misses.
- Stderr is captured and truncated in sanitized errors. Stdin and stdout payloads are never logged by the server.
- Token-cache payloads can be large; wrappers should handle at least 256 KB values.

Normal stateless HTTP Graph requests do not use local auth-cache storage. In HTTP mode, command storage is skipped at startup and per request unless local auth tools are explicitly enabled or a local account command such as `--login`, `--verify-login`, `--list-accounts`, `--select-account`, or `--logout` is used.

## Azure Key Vault Integration

For production deployments, you can store secrets in Azure Key Vault instead of environment variables. This is particularly useful for Azure Container Apps with managed identity.

### Setup

1. **Create a Key Vault** (if you don't have one):

   ```bash
   az keyvault create --name your-keyvault-name --resource-group your-rg --location eastus
   ```

2. **Add secrets to Key Vault**:

   ```bash
   az keyvault secret set --vault-name your-keyvault-name --name ms365-mcp-client-id --value "your-client-id"
   az keyvault secret set --vault-name your-keyvault-name --name ms365-mcp-tenant-id --value "your-tenant-id"
   # Optional: if using confidential client flow
   az keyvault secret set --vault-name your-keyvault-name --name ms365-mcp-client-secret --value "your-secret"
   ```

3. **Grant access to Key Vault**:

   For Azure Container Apps with managed identity:

   ```bash
   # Get the managed identity principal ID
   PRINCIPAL_ID=$(az containerapp show --name your-app --resource-group your-rg --query identity.principalId -o tsv)

   # Grant access to Key Vault secrets
   az keyvault set-policy --name your-keyvault-name --object-id $PRINCIPAL_ID --secret-permissions get list
   ```

   For local development with Azure CLI:

   ```bash
   # Your Azure CLI identity already has access if you have appropriate RBAC roles
   az login
   ```

4. **Configure the server**:
   ```bash
   MS365_MCP_KEYVAULT_URL=https://your-keyvault-name.vault.azure.net npx @softeria/ms-365-mcp-server
   ```

### Secret Name Mapping

| Key Vault Secret Name   | Environment Variable    | Required                  |
| ----------------------- | ----------------------- | ------------------------- |
| ms365-mcp-client-id     | MS365_MCP_CLIENT_ID     | Yes                       |
| ms365-mcp-tenant-id     | MS365_MCP_TENANT_ID     | No (defaults to 'common') |
| ms365-mcp-client-secret | MS365_MCP_CLIENT_SECRET | No                        |

### Authentication

The Key Vault integration uses `DefaultAzureCredential` from the Azure Identity SDK, which automatically tries multiple authentication methods in order:

1. Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
2. Managed Identity (recommended for Azure Container Apps)
3. Azure CLI credentials (for local development)
4. Visual Studio Code credentials
5. Azure PowerShell credentials

### Optional Dependencies

The Azure Key Vault packages (`@azure/identity` and `@azure/keyvault-secrets`) are optional dependencies. They are only loaded when `MS365_MCP_KEYVAULT_URL` is configured. If you don't use Key Vault, these packages are not required.

## Production Deployment

See [docs/deployment.md](docs/deployment.md) for a full guide to hosting the server for organization-wide access, including Docker, Azure Container Apps, Azure App Service, Azure AD app registration, reverse proxy setup, client configuration, and exposed endpoints.

## Contributing

We welcome contributions! Before submitting a pull request, please ensure your changes meet our quality standards.

Run the verification script to check all code quality requirements:

```bash
npm run verify
```

### For Developers

After cloning the repository, you may need to generate the client code from the Microsoft Graph OpenAPI specification:

```bash
npm run generate
```

## Related Projects

- [ms-365-admin-mcp-server](https://github.com/okapi-ca/ms-365-admin-mcp-server) by [@okapi-ca](https://github.com/okapi-ca): companion server for admin/daemon scenarios using application permissions (client credentials flow), covering security alerts, audit logs, service health, and usage reports.

## Support

If you're having problems or need help:

- Create an [issue](https://github.com/softeria/ms-365-mcp-server/issues)
- Start a [discussion](https://github.com/softeria/ms-365-mcp-server/discussions)
- Email: eirikb@eirikb.no
- Discord: https://discord.gg/WvGVNScrAZ or @eirikb

## License

MIT © 2026 Softeria

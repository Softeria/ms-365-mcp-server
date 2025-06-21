# ms-365-mcp-server

[![npm version](https://img.shields.io/npm/v/@softeria/ms-365-mcp-server.svg)](https://www.npmjs.com/package/@softeria/ms-365-mcp-server) [![build status](https://github.com/softeria/ms-365-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/softeria/ms-365-mcp-server/actions/workflows/build.yml) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/softeria/ms-365-mcp-server/blob/main/LICENSE)

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 services through the Graph API.

## Prerequisites

- Node.js >= 14

## Features

- Authentication via Microsoft Authentication Library (MSAL)
- Excel file operations
- Calendar event management
- Mail operations
- OneDrive file management
- OneNote notebooks and pages
- To Do tasks and task lists
- Planner plans and tasks
- Outlook contacts

## Quick Start Example

Test login in Claude Desktop:

![Login example](https://github.com/user-attachments/assets/27f57f0e-57b8-4366-a8d1-c0bdab79900c)

## Examples

![Image](https://github.com/user-attachments/assets/ed275100-72e8-4924-bcf2-cd8e1b4c6f3a)

## Integration

### Claude Desktop

To add this MCP server to Claude Desktop:

Edit the config file under Settings > Developer:

```json
{
  "mcpServers": {
    "ms365": {
      "command": "npx",
      "args": [
        "-y",
        "@softeria/ms-365-mcp-server"
      ]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add ms365 -- npx -y @softeria/ms-365-mcp-server
```

For other interfaces that support MCPs, please refer to their respective documentation for the correct
integration method.

### Authentication

> ⚠️ You must authenticate before using tools.

The server supports two authentication methods:

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

MCP clients will automatically handle the OAuth flow when they see the advertised capabilities. For manual testing:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_MICROSOFT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "1.0.0", "capabilities": {}}, "id": 1}'
```

> **Note**: HTTP mode requires authentication. For unauthenticated testing, use stdio mode with device code flow.
>
> **Authentication Tools**: In HTTP mode, login/logout tools are disabled by default since OAuth handles authentication.
> Use `--enable-auth-tools` if you need them available.

## CLI Options

The following options can be used when running ms-365-mcp-server directly from the command line:

```
--login           Login using device code flow
--logout          Log out and clear saved credentials
--verify-login    Verify login without starting the server
```

### Server Options

When running as an MCP server, the following options can be used:

```
-v                Enable verbose logging
--read-only       Start server in read-only mode, disabling write operations
--http [port]     Use Streamable HTTP transport instead of stdio (optionally specify port, default: 3000)
                  Starts Express.js server with MCP endpoint at /mcp
--enable-auth-tools Enable login/logout tools when using HTTP mode (disabled by default in HTTP mode)
```

Environment variables:

- `READ_ONLY=true|1`: Alternative to --read-only flag
- `LOG_LEVEL`: Set logging level (default: 'info')
- `SILENT=true`: Disable console output
- `MS365_MCP_CLIENT_ID`: Custom Azure app client ID (defaults to built-in app)
- `MS365_MCP_TENANT_ID`: Custom tenant ID (defaults to 'common' for multi-tenant)

## Support

If you're having problems or need help:

- Create an [issue](https://github.com/softeria/ms-365-mcp-server/issues)
- Start a [discussion](https://github.com/softeria/ms-365-mcp-server/discussions)
- Email: eirikb@eirikb.no
- Discord: https://discord.gg/WvGVNScrAZ or @eirikb

## License

MIT © 2025 Softeria

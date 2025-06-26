# ms-365-mcp-server

[![npm version](https://img.shields.io/npm/v/@softeria/ms-365-mcp-server.svg)](https://www.npmjs.com/package/@softeria/ms-365-mcp-server) [![build status](https://github.com/softeria/ms-365-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/softeria/ms-365-mcp-server/actions/workflows/build.yml) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/softeria/ms-365-mcp-server/blob/main/LICENSE)

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 and Microsoft Office services through the Graph
API.

## Prerequisites

- Node.js >= 14

## Features

- Authentication via Microsoft Authentication Library (MSAL)
- Comprehensive Microsoft 365 service integration
- Read-only mode support for safe operations
- Tool filtering for granular access control

## Supported Services & Tools

#### Email (Outlook)

`list-mail-messages`, `list-mail-folders`, `list-mail-folder-messages`, `get-mail-message`, `send-mail`,
`delete-mail-message`

### Calendar

`list-calendars`, `list-calendar-events`, `get-calendar-event`, `get-calendar-view`, `create-calendar-event`,
`update-calendar-event`, `delete-calendar-event`

### OneDrive & SharePoint Files

`list-drives`, `get-drive-root-item`, `list-folder-files`, `download-onedrive-file-content`, `upload-file-content`,
`upload-new-file`, `delete-onedrive-file`

### Excel Operations

`list-excel-worksheets`, `get-excel-range`, `create-excel-chart`, `format-excel-range`, `sort-excel-range`

### OneNote

`list-onenote-notebooks`, `list-onenote-notebook-sections`, `list-onenote-section-pages`, `get-onenote-page-content`,
`create-onenote-page`

### To Do Tasks

`list-todo-task-lists`, `list-todo-tasks`, `get-todo-task`, `create-todo-task`, `update-todo-task`, `delete-todo-task`

### Planner

`list-planner-tasks`, `get-planner-plan`, `list-plan-tasks`, `get-planner-task`, `create-planner-task`

### Contacts

`list-outlook-contacts`, `get-outlook-contact`, `create-outlook-contact`, `update-outlook-contact`,
`delete-outlook-contact`

### Teams & Chats (Work/School accounts only)

`list-chats`, `get-chat`, `list-chat-messages`, `get-chat-message`, `send-chat-message`, `list-chat-message-replies`,
`reply-to-chat-message`, `list-joined-teams`, `get-team`, `list-team-channels`, `get-team-channel`,
`list-channel-messages`, `get-channel-message`, `send-channel-message`, `list-team-members`

### SharePoint Sites (Work/School accounts only)

`search-sharepoint-sites`, `get-sharepoint-site`, `get-sharepoint-site-by-path`, `list-sharepoint-site-drives`,
`get-sharepoint-site-drive-by-id`, `list-sharepoint-site-items`, `get-sharepoint-site-item`,
`list-sharepoint-site-lists`, `get-sharepoint-site-list`, `list-sharepoint-site-list-items`,
`get-sharepoint-site-list-item`, `get-sharepoint-sites-delta`

### User Profile

`get-current-user`

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

MCP clients will automatically handle the OAuth flow when they see the advertised capabilities.

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
--enabled-tools <pattern> Filter tools using regex pattern (e.g., "excel|contact" to enable Excel and Contact tools)
```

Environment variables:

- `READ_ONLY=true|1`: Alternative to --read-only flag
- `ENABLED_TOOLS`: Filter tools using regex pattern (alternative to --enabled-tools flag)
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

# ms-365-mcp-server

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 services through the Graph API.

[![npm version](https://img.shields.io/npm/v/@softeria/ms-365-mcp-server.svg)](https://www.npmjs.com/package/@softeria/ms-365-mcp-server)

## Features

- Authentication using Microsoft Authentication Library (MSAL)
- Excel file operations
- Calendar event management
- Mail operations
- OneDrive file management
- Built on the Model Context Protocol

## Installation

```bash
npx @softeria/ms-365-mcp-server
```

## Quick Start Example

Login and test authentication in Claude Desktop:

![MS 365 MCP Server login example in Claude Desktop](https://github.com/user-attachments/assets/936d16bc-b3e1-437b-b3f1-03c54874a816)

## Integration with Claude

### Claude Desktop

To add this MCP server to Claude Desktop:

1. Launch Claude Desktop
2. Go to Settings > MCPs
3. Click "Add MCP"
4. Set the following configuration:
    - Name: `ms` (or any name you prefer)
    - Command: `npx @softeria/ms-365-mcp-server`
    - Click "Add"

Alternatively, you can edit Claude Desktop's configuration file directly. The location varies by platform, but you can
find it by going to Settings > Developer > Edit Config. Add this to your configuration file:

```json
{
  "mcpServers": {
    "ms": {
      "command": "npx",
      "args": [
        "-y",
        "@softeria/ms-365-mcp-server"
      ]
    }
  }
}
```

### Using Claude Code CLI

Claude Code CLI integration is available but configuration methods may vary based on the current version. Please refer
to the [official Claude Code documentation](https://github.com/anthropics/claude-code) for the most up-to-date
instructions on adding MCP servers.

For other Claude interfaces that support MCPs, please refer to their respective documentation for the correct
integration method.

## Usage

### Command Line Options

```bash
npx @softeria/ms-365-mcp-server [options]
```

Options:

- `--login`: Force login using device code flow and verify Graph API access
- `--logout`: Log out and clear saved credentials
- `--verify-login`: Test current authentication and verify Graph API access without starting the server
- `-v`: Enable verbose logging

### Authentication

**Important:** You must authenticate before using the MCP server. There are two ways to authenticate:

1. Running the server with the `--login` flag:
   ```bash
   npx @softeria/ms-365-mcp-server --login
   ```
   This will display the login URL and code in the terminal.

2. When using Claude Code or other MCP clients, use the login tools:
    - First use the `login` tool, which will return the login URL and code
    - Visit the URL and enter the code in your browser
    - Then use the `verify-login` tool to check if the login was successful

Both methods trigger the device code flow authentication, but they handle the UI interaction differently:

- CLI version displays the instructions directly in the terminal
- MCP tool version returns the instructions as data that can be shown in the client UI

You can verify your authentication status with the `--verify-login` flag, which will check if your token can successfully
fetch user data from Microsoft Graph API:

```bash
npx @softeria/ms-365-mcp-server --verify-login
```

Both `--login` and `--verify-login` will return a JSON response that includes your basic user information from Microsoft
Graph API if authentication is successful:

```json
{
  "success": true,
  "message": "Login successful",
  "userData": {
    "displayName": "Your Name",
    "userPrincipalName": "your.email@example.com"
  }
}
```

Authentication tokens are cached securely in your system's credential store with fallback to file storage if needed.

### MCP Tools

This server provides several MCP tools for interacting with Microsoft 365 services, including:

- Authentication (login, logout)
- Files/OneDrive management
- Excel operations
- Calendar management
- Mail operations

For a complete list of available tools and their parameters, use an MCP-enabled Claude interface and explore the available tools.

## For Developers

### Setup

```bash
# Clone the repository
git clone https://github.com/softeria-eu/ms-365-mcp-server.git
cd ms-365-mcp-server

# Install dependencies
npm install

# Run tests
npm test
```

### GitHub Actions

This repository uses GitHub Actions for continuous integration and deployment:

- **Build Workflow**: Runs on all pushes to main and pull requests. Verifies the project builds successfully and passes
  all tests.
- **Publish Workflow**: Automatically publishes to npm when a new GitHub release is created.

[![Build Status](https://github.com/softeria-eu/ms-365-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/softeria-eu/ms-365-mcp-server/actions/workflows/build.yml)

### Release Process

To create a new release:

```bash
# Default (patch version): 0.1.11 -> 0.1.12
npm run release

# Minor version: 0.1.11 -> 0.2.0
npm run release minor

# Major version: 0.1.11 -> 1.0.0
npm run release major
```

This script will:

1. Run tests to verify everything works
2. Bump the version number according to the specified type (patch by default)
3. Commit the version changes
4. Push to GitHub
5. Create a GitHub release
6. Trigger the publishing workflow to publish to npm

# ms-365-mcp-server

Microsoft 365 MCP Server

A Model Context Protocol (MCP) server for interacting with Microsoft 365 services through the Graph API.

[![Build Status](https://github.com/softeria-eu/ms-365-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/softeria-eu/ms-365-mcp-server/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@softeria/ms-365-mcp-server.svg)](https://www.npmjs.com/package/@softeria/ms-365-mcp-server)

## Quick Start Example

Login and test authentication in Claude Desktop:

![MS 365 MCP Server login example in Claude Desktop](https://github.com/user-attachments/assets/936d16bc-b3e1-437b-b3f1-03c54874a816)

## Features

- Authentication using Microsoft Authentication Library (MSAL)
- Excel file operations:
    - Update cell values
    - Create and manage charts
    - Format cells
    - Sort data
    - Create tables
    - Read cell values
    - List worksheets
- Built on the Model Context Protocol

## Installation

```bash
npx @softeria/ms-365-mcp-server
```

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

## Development

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

This server provides several MCP tools for interacting with Microsoft 365 services:

#### Authentication Tools

- `login`: Start a new login process with Microsoft (returns login URL and code)
- `verify-login`: Check if login was completed successfully and verify Graph API access
- `logout`: Log out of Microsoft and clear credentials

#### Files/OneDrive Tools

- `list-files`: List files and folders in a specified path
- `get-file`: Get details of a specific file
- `create-folder`: Create a new folder
- `delete-item`: Delete a file or folder
- `copy-item`: Copy a file or folder to a new location
- `move-item`: Move a file or folder to a new location
- `rename-item`: Rename a file or folder
- `search-files`: Search for files matching a query
- `get-shared-items`: Get a list of items shared with you
- `create-sharing-link`: Create a sharing link for a file or folder
- `get-file-content`: Get the content of a file

#### Excel Tools

All Excel tools require a `filePath` parameter to specify which Excel file to operate on. You can use the Files tools to
find and manage your Excel files.

- `update-excel`: Update cell values in an Excel worksheet
- `create-chart`: Create a chart in an Excel worksheet
- `format-range`: Apply formatting to a range of cells
- `sort-range`: Sort a range of cells
- `create-table`: Create a table from a range of cells
- `get-range`: Get values from a range of cells
- `list-worksheets`: List all worksheets in the workbook
- `close-session`: Close the session for a specific Excel file
- `close-all-sessions`: Close all active Excel sessions
- `delete-chart`: Delete a chart from a worksheet
- `get-charts`: Get all charts in a worksheet

Example workflow:

1. Use `list-files` to find Excel files in your OneDrive
2. Use `list-worksheets` with the file path to see available worksheets
3. Use `get-range` to retrieve data from the Excel file
4. Use other Excel tools to manipulate the file as needed

#### Calendar Tools

Tools for working with Outlook calendars.

- `list-calendars`: List all calendars
- `get-default-calendar`: Get information about the default calendar
- `list-events`: List events from a calendar with optional filtering, sorting, and date ranges
- `get-detailed-events`: Get events with expanded properties and options to include body, attendees, extensions, etc.
- `get-event`: Get detailed information about a specific calendar event
- `create-event`: Create a new calendar event with comprehensive options (sensitivity, importance, free/busy status,
  optional attendees, reminders, online meetings, categories)
- `create-recurring-event`: Create recurring events (daily, weekly, monthly, yearly) with the same comprehensive options
  and flexible recurrence patterns
- `update-event`: Update an existing calendar event
- `delete-event`: Delete a calendar event
- `accept-event`: Accept a calendar meeting invitation
- `decline-event`: Decline a calendar meeting invitation
- `tentatively-accept-event`: Tentatively accept a calendar meeting invitation
- `find-meeting-times`: Find available meeting times for a set of attendees
- `get-schedules`: Get availability information for multiple users or resource rooms

#### Mail Tools

Tools for working with Outlook email.

- `list-messages`: List emails from any mail folder with powerful filtering, searching, and sorting options
- `get-message`: Get detailed information about a specific email message with options to include attachments and other
  metadata

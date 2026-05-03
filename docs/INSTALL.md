# Install Guide — Enabi M365 MCP

Two paths through this guide: a **one-line installer** for everyone, and a manual setup for people who want to know what is happening.

If anything goes wrong, ping the IT support channel in Slack with the output of the failing command.

---

## Path A: I just want it to work (recommended)

Most employees should use this. It works on macOS and Linux. Windows users use Path B for now.

### 1. Open a terminal and run

```bash
curl -fsSL https://raw.githubusercontent.com/enabisolutions/mcp-ms365/main/scripts/install.sh | bash
```

> **Note:** If you have not been added to the Enabi GitHub org, ask Daniel first. The repo is private.

The script will:

1. Install Node.js 20 if it is not already there.
2. Clone this repo at the latest release tag.
3. Build the MCP.
4. Open a browser window for Microsoft sign-in (use your `@enabi.io` account).
5. Add the MCP to Claude Desktop and Claude Code config files automatically.

When it finishes, restart Claude Desktop. Done.

### 2. Verify it works

Open Claude (Desktop or Code) and ask:

> "What is on my calendar today?"

If Claude lists today's events, you are set. If it says it cannot find a calendar tool, see Troubleshooting below.

---

## Path B: Manual install

Use this if Path A failed or you are on Windows.

### Prerequisites

- **Node.js 20 or newer.** Check with `node --version`. If you do not have it, get it from https://nodejs.org/.
- **Git.** Check with `git --version`.
- An Enabi `@enabi.io` Microsoft account.

### 1. Clone and build

```bash
git clone https://github.com/enabisolutions/mcp-ms365.git
cd mcp-ms365
git checkout enabi-v1.0.0   # or whatever the latest release tag is
npm install
npm run build
```

### 2. Set your environment

Create a `.env` file in the repo root:

```env
MS365_MCP_CLIENT_ID=<ask Daniel for the Enabi Azure app client ID>
MS365_MCP_TENANT_ID=<ask Daniel for the Enabi tenant ID>
```

Daniel keeps these in 1Password under "Enabi M365 MCP — App Registration".

### 3. Sign in

```bash
npm run dev -- --login
```

A browser window opens. Sign in with your `@enabi.io` account. The first time, you will see a consent screen listing the requested permissions. They should match `docs/SCOPES.md` exactly. If anything else is on the list, stop and report it.

### 4. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%AppData%\Claude\claude_desktop_config.json` (Windows). Add an entry under `mcpServers`:

```json
{
  "mcpServers": {
    "enabi-m365": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-ms365/dist/index.js"],
      "env": {
        "MS365_MCP_CLIENT_ID": "<the same client id>",
        "MS365_MCP_TENANT_ID": "<the same tenant id>"
      }
    }
  }
}
```

Restart Claude Desktop.

### 5. Add to Claude Code

```bash
claude mcp add enabi-m365 --scope user -- node /absolute/path/to/mcp-ms365/dist/index.js
```

Then in your `~/.claude/settings.json`, add the env vars:

```json
{
  "env": {
    "MS365_MCP_CLIENT_ID": "<the client id>",
    "MS365_MCP_TENANT_ID": "<the tenant id>"
  }
}
```

---

## How the sign-in works

When you run the MCP for the first time, it opens a browser and sends you to Microsoft's standard sign-in page. You log in with your Enabi account. Microsoft then asks if you want to allow the "Enabi M365 MCP" app to access your mailbox, calendar, and contacts. You click yes once. After that, the MCP stores a refresh token on your machine and never asks again until the token expires (about 90 days of inactivity).

The app is registered in Enabi's Azure tenant. Daniel and IT control it. If you leave Enabi or your access is revoked in Azure, the MCP stops working immediately on next refresh.

The token lives in your OS keychain (macOS Keychain, Windows Credential Manager, or `~/.token-cache.json` with `0600` permissions on Linux). It never leaves your machine.

---

## Verifying it works (the good test)

Ask Claude:

> "List my next three calendar events with their times."

A working install returns three events. A broken install returns "I do not have access to your calendar" or a Graph API error.

If the calendar test passes, also try:

> "Show me my five most recent unread emails."

If both work, you are good.

---

## Troubleshooting

### "Tool not found" or Claude does not mention M365 tools

Restart Claude Desktop or Claude Code completely. New MCPs only load on startup.

### "MS365_MCP_CLIENT_ID is not set"

The MCP refuses to fall back to anyone else's Azure app. Set the env var as shown above.

### Sign-in browser opens but nothing happens

The redirect URL probably is not registered for the Azure app. Send Daniel the URL it tried to redirect to.

### "Insufficient privileges to complete the operation"

The Azure tenant has a policy that requires admin consent for some scope. Send Daniel the exact error and the tool name you were trying to use.

### I want to log out / sign in as a different account

```bash
npm run dev -- --logout
npm run dev -- --login
```

### The MCP stopped working after a Microsoft password reset

Refresh tokens are invalidated on password change. Run `--login` again.

---

## For developers working on this repo

```bash
npm install
npm run build:client     # generate src/generated/client.ts from endpoints.json
npm run lint
npm run test
npm run audit:capabilities   # verify tools/scopes match the baseline
npm run dev              # run from source against stdio
```

Before opening a PR, run `npm run verify`. CI runs the same thing.

# Migrating from the Softeria MCP

You already have `softeria/ms-365-mcp-server` installed and working in Claude Desktop and Claude Code. This guide walks you through replacing it with the Enabi fork.

Do this only after the Azure app registration in `docs/AZURE_APP_SETUP.md` is done.

## What is changing

- The old MCP gave Claude access to all of Microsoft 365 (270+ tools, 60+ scopes).
- The new one only handles mail, calendar, contacts (75 tools, 8 scopes).
- The old one used Softeria's public Azure app registration. The new one uses Enabi's own.
- The old one is signed in with whatever account you authorized. The new one needs you to sign in fresh because the app registration is different.

So expect: a fresh sign-in screen the first time you use the Enabi one, and Claude responding "I cannot do that" if you ask it to do something OneDrive or Teams related (which is intended).

## Step 1: Find what is currently configured

### Claude Desktop

```bash
cat "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
```

Look for an entry under `mcpServers` whose name probably contains `m365`, `office`, `microsoft`, or `softeria`.

### Claude Code

```bash
claude mcp list
```

Look for the same kind of entry.

Note the names you find. You will remove them in the next step.

## Step 2: Remove the Softeria install from Claude

### From Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` in your editor of choice and delete the entry for the Softeria MCP. Save.

### From Claude Code

```bash
claude mcp remove <name-you-found>
```

If it was at user scope add `--scope user`.

## Step 3: Log out of the old Softeria MCP (cleanup)

Cleans up the cached tokens for the old client ID.

If you installed the old one via npm globally:

```bash
npx -y @softeria/ms-365-mcp-server --logout
```

Or if you cloned it locally, run `--logout` from that checkout. If you cannot remember, skip this — the worst that happens is an orphan token cache file sitting unused on disk.

## Step 4: Install the Enabi fork

Pull the credentials from 1Password ("Enabi M365 MCP — App Registration") and run:

```bash
export MS365_MCP_CLIENT_ID=<from 1Password>
export MS365_MCP_TENANT_ID=<from 1Password>
curl -fsSL https://raw.githubusercontent.com/enabisolutions/mcp-ms365/main/scripts/install.sh | bash
```

The installer will:
1. Clone to `~/.local/share/enabi-m365-mcp/`
2. Build it
3. Open a browser for sign-in (use your `@enabi.io` account)
4. Add the MCP to Claude Desktop config under the name `enabi-m365`
5. Add it to Claude Code

If the installer fails partway, see `docs/INSTALL.md` Path B for the manual version.

## Step 5: Restart Claude Desktop

Fully quit (Cmd+Q on macOS, not just close the window) and reopen. New MCPs only register on startup.

For Claude Code, just start a fresh session.

## Step 6: Smoke tests

Open a new Claude conversation and run these in order. They cover the three permission areas and a tool that should be denied.

### Test 1: Identity (smallest possible call)

> "Who am I signed in as in Microsoft 365?"

Expected: Claude calls `get-current-user` and tells you your name and `@enabi.io` email.

If it fails: probably an auth problem. Run `~/.local/share/enabi-m365-mcp/dist/index.js --verify-login` from a terminal.

### Test 2: Calendar read

> "What is on my calendar today?"

Expected: Claude calls `get-calendar-view` with today's date range and lists your events.

If it returns nothing and you do have events: Claude probably called `list-calendar-events` instead, which does not expand recurring events. Tell it to use `get-calendar-view`.

### Test 3: Mail read

> "Show me my five most recent unread emails."

Expected: Claude calls `list-mail-messages` with `$top=5`, `$filter=isRead eq false`, and a sensible `$select`.

### Test 4: Mail compose (do NOT send)

> "Draft an email to me at daniel@enabi.io with subject 'MCP smoke test' and body 'this is a draft test'. Do not send it yet."

Expected: Claude calls `create-draft-email`, returns confirmation, the draft shows up in your Drafts folder in Outlook.

Open Outlook, verify the draft is there, delete it.

### Test 5: Calendar write

> "Create a 15-minute calendar event tomorrow at 14:00 titled 'MCP test'. Do not invite anyone."

Expected: Claude calls `create-calendar-event`. The event shows up in Outlook.

Delete it from Outlook.

### Test 6: Contacts read

> "List my Outlook contacts."

Expected: Claude calls `list-outlook-contacts`. Most likely returns a small list or empty (most people do not use Outlook contacts heavily).

### Test 7: Out-of-scope (the important one)

> "List my OneDrive files."

Expected: Claude responds something like "this MCP does not handle OneDrive — use the OneDrive web interface for that". It should NOT silently succeed or fail with a 403. The tool should not be in its list at all.

If Claude does call a OneDrive tool: stop. Something is misconfigured. Ping Daniel.

### Test 8: Shared mailbox read (if you have access to a shared mailbox)

> "Read the most recent message in support@enabi.io shared mailbox."

Expected: Claude calls `list-shared-mailbox-messages` with `userId=support@enabi.io`. Skip this test if you do not have shared mailbox access in Outlook.

### Test 9: Shared mailbox write (should be denied)

> "Send an email from the support@enabi.io mailbox to me saying hello."

Expected: Claude says something like "I cannot send from a shared mailbox through this MCP — please send from Outlook directly". The `send-shared-mailbox-mail` tool is intentionally not exposed.

## Step 7: Verify the audit log

```bash
ls -la ~/.config/enabi-m365-mcp/audit/
cat ~/.config/enabi-m365-mcp/audit/audit-$(date -u +%Y-%m-%d).log | head
```

You should see one JSON line per tool call you made during the smoke tests, with timestamps, tool names, durations, and sanitized arguments. Email bodies should appear as `[redacted]`.

## If something goes wrong

The two most common failure modes:

**Claude does not see any of the new tools.** Restart Claude Desktop or Claude Code. New MCPs load only at startup.

**The sign-in browser opens but never returns.** The redirect URI is wrong on the Azure app. Confirm `http://localhost` is registered as a public-client redirect URI. See `docs/AZURE_APP_SETUP.md` step 3.

For anything else, grab the tail of:
- `~/.ms-365-mcp-server/logs/mcp-server.log` (operational log)
- `~/.config/enabi-m365-mcp/audit/audit-*.log` (audit log)

and paste it into the support thread.

## After successful smoke tests

You are done. The only ongoing thing is: when the weekly upstream-sync PR opens (once we set that up), you (or whoever is reviewer) reads `docs/UPSTREAM_SYNC.md` and approves or rejects.

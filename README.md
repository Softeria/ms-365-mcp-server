# Enabi M365 MCP

A hardened fork of [softeria/ms-365-mcp-server](https://github.com/softeria/ms-365-mcp-server). It lets Claude Desktop and Claude Code work with each Enabi employee's Microsoft 365 mailbox, calendar, and contacts. Nothing else.

Each employee installs it locally, signs in with their own Microsoft account, and Claude gets exactly the access that employee already has. Tokens stay on the employee's machine.

## What it can do

- Read and send mail. Manage folders, rules, drafts, attachments, focused inbox.
- Read shared mailboxes (e.g. `support@enabi.io`). Sending from a shared mailbox is intentionally not exposed.
- Read and write calendar events on personal calendars.
- Read and write personal Outlook contacts.
- Read and create Outlook categories.

## What it cannot do (by design)

OneDrive, SharePoint, Teams chat or channels, Planner, ToDo, OneNote, room booking, group management, user-directory lookups, sending from shared mailboxes. If you need any of these, open a PR with a justification rather than reaching for upstream.

## Why we forked

Upstream exposes 270+ Graph API tools and asks for over 60 OAuth scopes. That is a lot of surface for an AI agent to walk around in. Enabi only needs a small slice of M365, so this fork removes the rest, locks in an explicit allowlist, and adds CI guardrails that flag any drift on every PR. See [`docs/INVESTIGATION.md`](docs/INVESTIGATION.md) and [`docs/SCOPES.md`](docs/SCOPES.md).

## Install

For employees: see [`docs/INSTALL.md`](docs/INSTALL.md). The install script in `scripts/install.sh` does everything for you.

For developers working on this repo: see the developer notes at the bottom of `INSTALL.md`.

## Documentation

| File | Read it when |
|------|--------------|
| [`docs/INSTALL.md`](docs/INSTALL.md) | You want to use the MCP in Claude Desktop or Claude Code. |
| [`docs/MIGRATION.md`](docs/MIGRATION.md) | You already have the Softeria MCP installed and want to switch. |
| [`docs/AZURE_APP_SETUP.md`](docs/AZURE_APP_SETUP.md) | One-time Azure AD app registration setup (Daniel does this once). |
| [`docs/USAGE.md`](docs/USAGE.md) | You want recipes for the most common things people ask Claude to do. |
| [`docs/SCOPES.md`](docs/SCOPES.md) | You want to know what permissions are requested and why. |
| [`docs/SECURITY.md`](docs/SECURITY.md) | You want the threat model and how to report issues. |
| [`docs/INVESTIGATION.md`](docs/INVESTIGATION.md) | You want the full Phase 1 audit of upstream. |
| [`docs/ENABI_PATCHES.md`](docs/ENABI_PATCHES.md) | You are reviewing an upstream-sync PR and need to know what should never change. |
| [`docs/UPSTREAM_SYNC.md`](docs/UPSTREAM_SYNC.md) | You are reviewing the weekly upstream-sync PR. |
| [`docs/CAPABILITY_BASELINE.json`](docs/CAPABILITY_BASELINE.json) | You want the canonical list of tools and scopes. |

## Credit

Built on top of [softeria/ms-365-mcp-server](https://github.com/softeria/ms-365-mcp-server) (MIT). Most of the heavy lifting (MSAL integration, the Graph endpoint registry, the MCP plumbing) is upstream's work. Our contribution is the trimming and the guardrails.

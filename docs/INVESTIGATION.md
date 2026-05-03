# Investigation Report: softeria/ms-365-mcp-server

**Date:** 2026-05-02
**Upstream commit:** latest `main` (shallow clone)
**Analyst:** Claude (for Daniel @ Enabi)

---

## 1. Tool Inventory

The upstream server exposes **270 Graph API endpoint tools** + **9 utility/auth tools** = **279 total tools**.

Tools are registered from `src/endpoints.json` (the central manifest). Each entry defines: toolName, HTTP method, Graph API path pattern, OAuth scopes, and optional workScopes (org-mode only).

### By functional area

| Area | Count | Keep for Enabi? |
|------|-------|-----------------|
| **Mail** | 42 | YES |
| **Calendar** | 31 | YES |
| **Contacts** | 5 | YES |
| Teams | 36 | NO |
| Files/OneDrive | 27 | NO |
| SharePoint | 23 | NO |
| Excel | 15 | NO |
| Groups | 14 | NO |
| Users/People | 11 | NO |
| Planner | 11 | NO |
| ToDo | 9 | NO |
| OneNote | 10 | NO |
| Meetings/Rooms | 21 | NO |
| Subscriptions | 6 | NO |
| Search | 1 | NO |
| Outlook misc | 3 | PARTIAL (categories yes, sensitivity labels no) |
| Places | 1 | NO |
| Other | 4 | NO |

### Auth/utility tools (registered in code, not endpoints.json)

| Tool | Source | Keep? |
|------|--------|-------|
| `login` | auth-tools.ts | YES |
| `logout` | auth-tools.ts | YES |
| `verify-login` | auth-tools.ts | YES |
| `list-accounts` | auth-tools.ts | YES |
| `select-account` | auth-tools.ts | YES |
| `remove-account` | auth-tools.ts | YES |
| `parse-teams-url` | graph-tools.ts | NO |
| `search-tools` | graph-tools.ts (discovery mode) | NO |
| `get-tool-schema` | graph-tools.ts (discovery mode) | NO |
| `execute-tool` | graph-tools.ts (discovery mode) | NO |

### Tools to keep (78 endpoint tools + 6 auth tools = 84 total)

**Mail (42):** add-mail-attachment, copy-mail-message, create-draft-email, create-focused-inbox-override, create-forward-draft, create-mail-attachment-upload-session, create-mail-child-folder, create-mail-folder, create-mail-rule, create-reply-all-draft, create-reply-draft, delete-focused-inbox-override, delete-mail-attachment, delete-mail-folder, delete-mail-message, delete-mail-rule, forward-mail-message, get-mail-attachment, get-mail-message, get-mailbox-settings, list-focused-inbox-overrides, list-mail-attachments, list-mail-child-folders, list-mail-folder-messages, list-mail-folder-messages-delta, list-mail-folders, list-mail-messages, list-mail-rules, move-mail-message, reply-all-mail-message, reply-mail-message, send-draft-message, send-mail, update-focused-inbox-override, update-mail-folder, update-mail-message, update-mail-rule, update-mailbox-settings

Note: shared mailbox tools (get-shared-mailbox-message, list-shared-mailbox-messages, list-shared-mailbox-folder-messages, send-shared-mailbox-mail) are work/org-only scopes. **Decision needed:** include them or not? They require `Mail.Read.Shared` / `Mail.Send.Shared`. I recommend excluding them (adds scope surface, org-mode feature).

**Calendar (31):** All 31 calendar tools. Note: some are work/org-only (get-group-calendar-view, get-shared-calendar-view, get-virtual-event-webinar, list-group-events, list-shared-calendar-events, find-meeting-times, get-schedule, list-webinar-sessions). **Decision needed:** keep the personal calendar tools only (25), or include shared calendar access too?

**Contacts (5):** All 5 contact tools (create, delete, get, list, update).

**Outlook categories (2):** list-outlook-categories (MailboxSettings.Read) and create-outlook-category (MailboxSettings.ReadWrite). Useful for email categorization. Recommend keeping.

**User identity (1):** get-current-user (/me, User.Read). Needed for "who am I" verification. Recommend keeping.

---

## 2. OAuth Scope Inventory

### All personal (non-org) scopes requested upstream

| Scope | Used by | Needed for Enabi? |
|-------|---------|-------------------|
| `User.Read` | get-current-user, get-my-profile-photo | YES (identity) |
| `Mail.Read` | 12 mail read tools | YES |
| `Mail.ReadWrite` | 14 mail write tools | YES |
| `Mail.Send` | send-mail, forward, reply tools | YES |
| `MailboxSettings.Read` | get-mailbox-settings, list-mail-rules, list-outlook-categories | YES |
| `MailboxSettings.ReadWrite` | create/update/delete mail rules, update-mailbox-settings, create-outlook-category | YES |
| `Calendars.Read` | 11 calendar read tools | YES |
| `Calendars.ReadWrite` | 12 calendar write tools | YES |
| `Contacts.Read` | 2 contact read tools | YES |
| `Contacts.ReadWrite` | 3 contact write tools | YES |
| `Files.Read` | 12 OneDrive/Excel read tools | NO |
| `Files.ReadWrite` | 15 OneDrive/Excel write tools | NO |
| `Tasks.Read` | 7 Planner/ToDo read tools | NO |
| `Tasks.ReadWrite` | 8 Planner/ToDo write tools | NO |
| `Notes.Create` | 4 OneNote create tools | NO |
| `Notes.Read` | 4 OneNote read tools | NO |
| `Notes.ReadWrite` | 1 OneNote delete tool | NO |

### Minimum scopes for Enabi (mail + calendar + contacts)

```
User.Read
Mail.ReadWrite          (subsumes Mail.Read)
Mail.Send
MailboxSettings.ReadWrite  (subsumes MailboxSettings.Read)
Calendars.ReadWrite     (subsumes Calendars.Read)
Contacts.ReadWrite      (subsumes Contacts.Read)
offline_access          (refresh tokens — injected silently by upstream)
```

**7 scopes total.** Down from 17 personal + 45 org = 62 possible.

### Scope hierarchy (already implemented upstream)

The `SCOPE_HIERARCHY` in `auth.ts` correctly deduplicates: if both `Mail.ReadWrite` and `Mail.Read` are present, only `Mail.ReadWrite` is requested.

---

## 3. Code Structure

### Tool registration architecture

```
endpoints.json (270 entries)
    ↓ loaded by
src/generated/hack.ts (Zodios wrapper → api.endpoints)
    ↓ iterated by
src/graph-tools.ts → registerGraphTools() or registerDiscoveryTools()
    ↓ called from
src/server.ts → createMcpServer()
```

**Central manifest:** `src/endpoints.json` is the single source of truth for all Graph API tools. Each entry has `toolName`, `method`, `pathPattern`, `scopes[]`, and optional `workScopes[]`.

**Auth tools:** Registered separately in `src/auth-tools.ts`.

**Discovery mode tools:** `search-tools`, `get-tool-schema`, `execute-tool` registered in `graph-tools.ts` only when `--discovery` flag is set.

**Filtering:** The `--enabled-tools <regex>` CLI flag and `ENABLED_TOOLS` env var filter tools by regex against tool name. The `--preset` flag maps to predefined regex patterns (e.g., `mail|calendar|contacts`). This is already close to what we need, but it's a runtime filter, not a code-level removal.

### How to remove tools cleanly

1. **Delete entries from `endpoints.json`** — this is the cleanest approach. The tool won't be generated, registered, or have scopes requested.
2. **Delete `parse-teams-url`** registration block from `graph-tools.ts`.
3. **Remove discovery mode** tools (or just never enable `--discovery`).
4. Scopes auto-derive from remaining endpoints via `buildScopesFromEndpoints()`.

The build will not break from endpoint removal — tools are data-driven, not individually coded.

### Generated client

The `src/generated/` directory contains:
- `hack.ts` — A minimal Zodios-compatible wrapper. Parses path params from endpoint paths.
- `endpoint-types.ts` — TypeScript interfaces for Endpoint and Parameter.

The actual client code is generated by `bin/generate-graph-client.mjs` which downloads the Graph OpenAPI spec and produces `endpoints.json`. We should **not run the generator** in our fork — it would recreate all endpoints.

---

## 4. Telemetry and External Calls

### No telemetry found.

The codebase makes external calls **only to**:
- `graph.microsoft.com` (Graph API)
- `login.microsoftonline.com` (Azure AD OAuth)
- `login.chinacloudapi.cn` / `microsoftgraph.chinacloudapi.cn` (China cloud, only if configured)
- `localhost` (own HTTP server, if `--http` mode)

### glama.json

Contains only a schema URL (`https://glama.ai/mcp/schemas/server.json`) and maintainer field. This is a static metadata file for the Glama MCP registry — **not runtime telemetry**. Safe to delete from our fork.

### No analytics, no phone-home, no tracking.

---

## 5. Dependencies

### Runtime dependencies

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `@azure/msal-node` | ^3.8.0 | Microsoft OAuth (MSAL) | Low — official Microsoft SDK |
| `@modelcontextprotocol/sdk` | ^1.29.0 | MCP protocol | Low — official Anthropic SDK |
| `@toon-format/toon` | ^0.8.0 | Token-compressed output format | Low risk, **can remove** (only used with `--toon` flag) |
| `commander` | ^11.1.0 | CLI argument parsing | Low — standard |
| `dotenv` | ^17.0.1 | .env file loading | Low — standard |
| `express` | ^5.2.1 | HTTP server (for `--http` mode) | Medium — large surface area, but Express 5 is modern. **Not needed for stdio mode.** |
| `js-yaml` | ^4.1.0 | YAML parsing | Low — used by generator, possibly unused at runtime |
| `open` | ^11.0.0 | Opens browser for interactive auth | Low — standard |
| `winston` | ^3.17.0 | Logging | Low — standard |
| `zod` | ^3.24.2 | Schema validation | Low — standard |
| `zod-to-json-schema` | ^3.25.1 | Zod→JSON Schema conversion | Low — standard |

### Optional dependencies

| Package | Purpose | Risk |
|---------|---------|------|
| `@azure/identity` | Azure Key Vault auth | Low — only if Key Vault configured |
| `@azure/keyvault-secrets` | Key Vault secret retrieval | Low — only if Key Vault configured |
| `keytar` | OS keychain for token storage | Medium — native binary, can fail on some platforms. Falls back to file storage. |

### Assessment

No abandoned or suspicious packages. The dependency tree is reasonable for an MCP server.

Candidates for removal in our fork:
- `@toon-format/toon` — experimental feature we won't use
- `js-yaml` — check if used at runtime (may only be generator dependency)
- `express` — only needed for HTTP mode. If we're stdio-only, could remove but increases future friction.

---

## 6. Configuration and Secrets Handling

### Token storage

MSAL token cache is stored in **two locations** (newest wins):
1. **OS keychain** via `keytar` (if available) — service: `ms-365-mcp-server`, account: `msal-token-cache`
2. **File fallback:** `<project-root>/.token-cache.json` with mode `0o600`

Configurable via `MS365_MCP_TOKEN_CACHE_PATH` env var.

Selected account ID stored similarly (keychain or `.selected-account.json`).

### Secrets (app registration)

Read from environment variables:
- `MS365_MCP_CLIENT_ID` — Azure app client ID
- `MS365_MCP_TENANT_ID` — Azure AD tenant ID
- `MS365_MCP_CLIENT_SECRET` — optional, for confidential client (OBO mode)

Alternative: Azure Key Vault via `MS365_MCP_KEYVAULT_URL`.

### What's written to disk

| File | Contents | Risk |
|------|----------|------|
| `.token-cache.json` | MSAL token cache (access + refresh tokens) | **HIGH** — contains live tokens. File permissions are 0o600, but location defaults to project root. |
| `.selected-account.json` | Account ID selection | Low |
| `~/.ms-365-mcp-server/logs/mcp-server.log` | Operation logs | Medium — may contain PII (email addresses, calendar event details) |
| `~/.ms-365-mcp-server/logs/error.log` | Error logs | Low |

### Concerns

1. **Token cache in project root by default.** If someone commits `.token-cache.json`, tokens leak. Upstream has no `.gitignore` entry for it. **Must fix.**
2. **Log directory** defaults to `~/.ms-365-mcp-server/logs/` — reasonable location, but logs contain tool call parameters which may include email content.
3. **Default client ID** is hardcoded: `084a3e9f-a9f4-43f7-89f9-d229cf97853e` (Softeria's app registration). Enabi must use its own.

---

## 7. Risk Findings

### Critical

1. **Overly broad scope surface.** Upstream requests all scopes for all enabled tools. With no filtering, that's 17 personal + 45 org scopes. Even personal-only includes Files, Tasks, Notes access that Enabi employees don't need.

2. **No tool-level access control.** The `--enabled-tools` regex filter is the only gate, and it's a startup config, not an enforced allowlist. A misconfigured regex (or missing env var) exposes all 270+ tools.

3. **Token cache location.** Default is project root (`.token-cache.json`). Easy to accidentally commit. No `.gitignore` upstream.

### Medium

4. **Discovery mode bypass.** When `--discovery` is enabled, the `execute-tool` tool can invoke ANY registered endpoint by name, even if the caller doesn't have that tool directly exposed. This is an intentional feature but a security concern — we should never enable discovery mode.

5. **Default Softeria client ID.** If `MS365_MCP_CLIENT_ID` is not set, the server falls back to Softeria's public client registration (`084a3e9f...`). This means employee tokens flow through Softeria's app registration. Must always set our own.

6. **Express 5 attack surface.** HTTP mode exposes a full Express server with OAuth endpoints, CORS, dynamic client registration. We only need stdio mode for Claude Code/Desktop. Consider stripping HTTP mode entirely or ensuring it's never started.

7. **Log content.** Tool call parameters are logged verbatim (`Tool X called with params: {...}`). This includes email bodies, calendar details, contact information. The log rotation and access controls are basic.

### Low

8. **No Content-Security-Policy** on the interactive auth success/error pages (minor, user-facing only during login).

9. **`js-yaml` and `@toon-format/toon`** are included but may not be needed at runtime for our use case.

10. **The `generate` script** downloads the full Graph OpenAPI spec from Microsoft. Not a runtime risk, but running it would recreate all endpoints. Should never run in our fork.

---

## 8. Recommendations for Phase 2

1. **Delete endpoints from `endpoints.json`** for everything outside mail/calendar/contacts/identity. This is the primary scope reduction.
2. **Add a hardcoded tool allowlist** in `graph-tools.ts` that blocks registration of any tool not on the list, regardless of endpoints.json content.
3. **Set scopes explicitly** rather than relying on auto-derivation from endpoints. Belt-and-suspenders.
4. **Add `.token-cache.json` and `.selected-account.json` to `.gitignore`.**
5. **Remove `glama.json`.**
6. **Disable discovery mode** (remove the `--discovery` flag or strip the code).
7. **Remove `parse-teams-url`** tool.
8. **Pin `MS365_MCP_CLIENT_ID`** — remove the Softeria default client ID fallback entirely.

---

## 9. Tool count summary

| | Upstream | Enabi (proposed) |
|---|---------|-----------------|
| Graph API tools | 270 | ~80 |
| Auth tools | 6 | 6 |
| Utility tools | 1-3 | 0 |
| OAuth scopes (personal) | 17 | 7 |
| OAuth scopes (org) | 45 | 0 |
| **Total tools** | **~279** | **~86** |

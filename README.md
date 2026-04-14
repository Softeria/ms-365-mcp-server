# @ixtria/outlook-mcp-hardened

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/protocol-MCP-purple.svg)](https://modelcontextprotocol.io/)

A security-hardened Model Context Protocol (MCP) server for **Microsoft Outlook** (Mail + Calendar). Fork of [`@softeria/ms-365-mcp-server`](https://github.com/softeria/ms-365-mcp-server) published by [Ixtria SA](https://ixtria.ch) under Apache-2.0, aimed at Swiss SMEs with nFADP-compatible posture.

> **Not affiliated with Microsoft or Softeria.** This is an independent security hardening of the upstream project focused on a narrow Outlook-only surface.

---

## What's different from upstream

| | upstream | this fork |
|---|---|---|
| Scope | Mail, Calendar, Files, Excel, Teams, SharePoint, OneNote, Planner, Contacts, To-Do, Directory | **Mail + Calendar only** |
| Endpoints | 202 | **55** (filtered at build time) |
| Default policy | write tools registered | **read-only** — writes require explicit opt-in |
| Egress | trust the network | **hardcoded allowlist** (`login.microsoftonline.com`, `graph.microsoft.com`) |
| Audit | none | **JSON line per call** on stderr |
| Prompt injection | mail bodies returned as-is | **`<untrusted_content>` wrapper** with neutralised nested tags |
| Telemetry | none upstream too | **contractually zero** — CI blocks new deps that phone home |
| License | MIT | Apache-2.0 (MIT attribution retained) |

## Quick start

```bash
npm install -g @ixtria/outlook-mcp-hardened
outlook-mcp-hardened --login          # one-time device code flow
outlook-mcp-hardened                   # starts the MCP server on stdio (read-only)
```

Default is **read-only**. To allow writes:

```bash
outlook-mcp-hardened --enable-send     # unlocks send-mail, reply, forward, folders, rules
outlook-mcp-hardened --enable-write    # unlocks create/update/delete calendar events
outlook-mcp-hardened --enable-send --enable-write
```

## Threat model

### What this fork protects against

- **Exfiltration to rogue endpoints** — any outbound fetch to a host outside the allowlist crashes the process at request time. A compromised dependency that tries to phone home cannot reach its C2 without the guard firing.
- **Prompt injection via email content** — mail bodies, subjects, and attachment filenames are wrapped in `<untrusted_content>` tags with a do-not-follow warning before being handed to the LLM. Nested `<untrusted_content>` or `</untrusted_content>` sequences in the payload are rewritten with a full-width lookalike (`＜`) so the wrapper cannot be escaped.
- **Silent scope creep** — the token request derives scopes from the filtered `endpoints.json` and the active write policy; `Mail.Send`, `Mail.ReadWrite`, and `Calendars.ReadWrite` are not requested unless `--enable-send` / `--enable-write` was explicitly passed.
- **Opaque server behaviour** — every Graph call emits a JSON audit line to stderr with tool, method, path, scopes, hashed account, status, and duration.
- **Token leakage** — tokens are stored in the OS keychain via `keytar` when available, falling back to an encrypted file. They are never logged; error redaction strips `accessToken` fields.

### What this fork does **not** protect against

- **A malicious MCP client** — if the operator runs a compromised agent, that agent can call any registered tool. The fork shrinks the blast radius by defaulting read-only and gating writes behind explicit flags; it does not police the agent itself.
- **A malicious upstream dependency** — `npm audit` is wired into `npm run verify` and CI, but a novel vulnerability in `@azure/msal-node` or `@modelcontextprotocol/sdk` is still in scope for your own patching workflow.
- **Multi-tenant isolation** — one running instance serves one operator. Running multiple tenants in the same process is not supported.
- **Rate limiting** — Microsoft Graph enforces its own throttling. We do not add a local limiter.
- **Content policy / DLP** — what an operator sends in a reply is between them and their compliance team.

## Prerequisites

- Node.js ≥ 20 LTS
- A Microsoft Entra (Azure AD) tenant where you can register an application, or ability to use the public default client

## Azure App Registration (one-time, per tenant)

You can run with the built-in public client for quick local testing, but production SME use should register your own application so the consent screen names your organisation rather than the upstream public client.

1. In the Azure portal, go to **Microsoft Entra ID → App registrations → New registration**
2. **Name**: `outlook-mcp-hardened` (or similar). **Supported account types**: Single tenant is the typical SME choice.
3. **Redirect URI**: leave empty for device code flow, or add `http://localhost` for browser-based flow.
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID**.
5. Under **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, add:
   - `Mail.Read`
   - `Calendars.Read`
   - `User.Read`
   - `offline_access`
   - `Mail.Send` and `Mail.ReadWrite` (only if you plan to use `--enable-send`)
   - `Calendars.ReadWrite` (only if you plan to use `--enable-write`)
6. Grant admin consent if required by your tenant.
7. Under **Authentication → Advanced settings**, enable **Allow public client flows** (required for device code flow).

## Configuration

Create a `.env` in your working directory (or export the vars):

```dotenv
# Required
MS365_MCP_CLIENT_ID=<your app registration client id>
MS365_MCP_TENANT_ID=<your directory tenant id>   # use "common" for multi-tenant apps

# Optional (confidential client)
# MS365_MCP_CLIENT_SECRET=<secret value>

# Optional (China 21Vianet)
# MS365_MCP_CLOUD_TYPE=china
```

See `.env.example` for all supported variables.

## MCP client configuration

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "outlook": {
      "command": "npx",
      "args": ["-y", "@ixtria/outlook-mcp-hardened"],
      "env": {
        "MS365_MCP_CLIENT_ID": "...",
        "MS365_MCP_TENANT_ID": "..."
      }
    }
  }
}
```

To enable writes, add the appropriate flags in `args`:

```json
"args": ["-y", "@ixtria/outlook-mcp-hardened", "--enable-write"]
```

Other MCP clients (Cline, Continue, custom): run `outlook-mcp-hardened` over stdio per the MCP spec.

## CLI reference

| Flag | Purpose |
|---|---|
| `--login` | Run device code flow, cache the token, exit |
| `--logout` | Clear the cached token |
| `--verify-login` | Test the cached token against `me` and exit |
| `--list-accounts` / `--select-account <id>` / `--remove-account <id>` | Multi-account management |
| `--enable-send` | Opt in to mail writes (Mail.Send + Mail.ReadWrite) |
| `--enable-write` | Opt in to calendar writes (Calendars.ReadWrite) |
| `--read-only` | Legacy alias — read-only is the default; this blocks both opt-ins |
| `--preset mail` / `--preset calendar` / `--preset all` | Narrow to a single category |
| `--http [host:port]` | HTTP transport (off by default; defaults to 127.0.0.1:3000) |
| `--auth-browser` | Use browser-based OAuth instead of device code |

Environment variable counterparts exist for `READ_ONLY`, `OUTLOOK_MCP_ENABLE_SEND`, `OUTLOOK_MCP_ENABLE_WRITE`, `ENABLED_TOOLS`.

## Audit trail

Every Graph call emits one JSON line to stderr:

```json
{"ts":"2026-04-14T11:12:13.456Z","tool":"list-mail-messages","method":"GET","path":"/me/messages","scopes":["Mail.Read","User.Read"],"account":"sha256:abc123…","status":200,"duration_ms":142}
```

- **stderr** on purpose — MCP stdio uses stdout for the protocol frame. The audit lines will not corrupt the session.
- The `account` field is always `sha256:<hex>` (case-folded + trimmed before hashing) or `"none"`. Raw usernames never hit the log.
- The line does **not** include the request body, the response body, or the bearer token.

## Egress allowlist

Hardcoded to:

- `login.microsoftonline.com` (MSAL token flows)
- `graph.microsoft.com` (Graph API)

Any other host — including `graph.microsoft.com.evil.com`, `attacker.graph.microsoft.com`, `http://` on an allowed host, or a non-443 port — raises `EgressViolationError` before the request leaves the process. The guard is installed in `src/index.ts` before any other module loads so there is no window during which outbound fetch is unchecked.

## Development

```bash
npm install
npm run generate          # (re)builds src/generated/client.ts from the filtered endpoints.json
npm run build             # tsup → dist/
npm run dev               # watch-mode via tsx
npm test                  # vitest (138 tests)
npm run typecheck         # tsc --noEmit — strict, noUncheckedIndexedAccess
npm run lint
npm run verify            # generate + lint + typecheck + build + test
```

See `PLAN.md` for the hardening design and commit-level plan.

## Security reports

`SECURITY.md`. Preferred channels: GitHub Private Vulnerability Reporting or `security@ixtria.ch`.

## License

Apache-2.0. Derivative of [`ms-365-mcp-server`](https://github.com/softeria/ms-365-mcp-server) (MIT, © 2025 Softeria). See `LICENSE` for the full attribution.

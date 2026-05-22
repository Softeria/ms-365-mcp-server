# Areté Microsoft 365 MCP Server

Self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Microsoft Graph (Outlook mail, Outlook calendar, OneDrive, SharePoint, Teams) to Areté's LLM agents over a single multi-tenant-aware HTTP endpoint.

Originally forked from [Softeria/ms-365-mcp-server](https://github.com/Softeria/ms-365-mcp-server) and rewritten for our deployment model. Areté now owns this codebase; upstream is a reference, not a dependency.

## Status

In active rewrite. Tracking:

- **v1 (in progress)**: HTTP-only transport, per-user OAuth sessions, read-only mail/calendar/files.
- **v1.x**: write tools for email drafts and calendar events, gated by per-user policy.
- **v1.5**: SharePoint and Teams expansion.

See `/Users/sglyon/.claude/plans/sorted-swinging-wind.md` for the rewrite plan.

## Requirements

- Node.js 24+
- An Entra ID app registration in your tenant (delegated permissions only).

## Quick start (development)

```bash
# Set up secrets
cat > .env <<'EOF'
MS365_MCP_CLIENT_ID=<your Entra app client ID>
MS365_MCP_TENANT_ID=<your tenant ID>
# Optional confidential-client secret
MS365_MCP_CLIENT_SECRET=<secret if used>
EOF

# Install + run
npm install
npm run generate   # one-time: download Graph OpenAPI, generate client (removed in PR 2)
npm run dev:http   # binds 127.0.0.1:3000
```

Point an MCP client (Claude Desktop, MCP Inspector, etc.) at `http://localhost:3000/mcp`. The server handles OAuth discovery via `/.well-known/oauth-authorization-server` and `/authorize` + `/token` endpoints, then accepts `Authorization: Bearer <token>` on `/mcp`.

## Production deployment

Documented in our internal infrastructure repo. The server expects:

- `MS365_MCP_CLIENT_ID`, `MS365_MCP_TENANT_ID`, `MS365_MCP_CLIENT_SECRET` (latter required for confidential-client setups).
- `MS365_MCP_PUBLIC_URL` (or `--public-url`) when running behind a reverse proxy. Browser-facing OAuth redirects use this; internal endpoints stay on the request origin.
- `MS365_MCP_ALLOWED_REDIRECT_URIS` — explicit allowlist for OAuth `redirect_uri` values forwarded to Microsoft, to defend against CWE-601 open-redirect abuse.
- `MS365_MCP_CORS_ORIGIN` — single origin string. Defaults to `http://localhost:3000`.

## CLI options

```
-v                 Verbose logging
--http [address]   Bind Streamable HTTP transport. Format: [host:]port (e.g. "3000", ":3000", "localhost:3000"). Default: all interfaces on port 3000.
--public-url <url> Public base URL (e.g. https://mcp.example.com) used in browser-facing OAuth redirects when behind a reverse proxy.
--toon             TOON output format. ~30-60% fewer tokens than JSON for uniform array data.
```

Environment variables:

- `MS365_MCP_CLIENT_ID`, `MS365_MCP_TENANT_ID`, `MS365_MCP_CLIENT_SECRET` — Entra app credentials.
- `MS365_MCP_PUBLIC_URL` — see above.
- `MS365_MCP_CORS_ORIGIN` — see above.
- `MS365_MCP_ALLOWED_REDIRECT_URIS` — see above.
- `MS365_MCP_OUTPUT_FORMAT=toon` — alternative to `--toon`.
- `MS365_MCP_MAX_TOP=<n>` — hard cap on Graph `$top` for list requests.
- `MS365_MCP_BODY_FORMAT=html` — return email bodies as HTML instead of plain text (default: text).
- `MS365_MCP_TOKEN_CACHE_PATH`, `MS365_MCP_SELECTED_ACCOUNT_PATH` — file-based fallback locations for the MSAL token cache. Replaced by SQLite-backed per-user sessions in PR 3.
- `LOG_LEVEL`, `SILENT`.

## Output formats

JSON by default. Pass `--toon` (or `MS365_MCP_OUTPUT_FORMAT=toon`) for [Token-Oriented Object Notation](https://github.com/toon-format/toon) — 30-60% fewer tokens vs JSON, ideal for cost-sensitive batch workloads against uniform array data (lists of emails, events, files).

## Auth flow

OAuth Authorization Code + PKCE. The server is the OAuth client to Entra and the OAuth authorization server to the MCP client (two-leg PKCE).

```
MCP client ──/authorize──> us ──Microsoft authorize──> Entra ──code──> us ──code──> Entra ──token──> us ──our token──> MCP client
```

PR 3 replaces the current pass-through with SQLite-backed per-user session tokens (opaque session IDs issued to MCP clients; encrypted refresh + access tokens stored server-side). Until then, the MCP client holds Microsoft access tokens directly.

## Contributing

Internal Areté repository. Before opening a PR:

```bash
npm run verify
```

Runs lint, format check, build, and tests.

## License

MIT. See [LICENSE](./LICENSE).

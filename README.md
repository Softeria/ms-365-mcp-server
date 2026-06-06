# ms-365-mcp-server

[![build](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/build.yml)
[![integration](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/integration.yml/badge.svg?branch=main)](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/integration.yml)
[![docker](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/docker-image.yml/badge.svg?branch=main)](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/docker-image.yml)
[![codeql](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/ali205412/ms-365-mcp-server/actions/workflows/codeql.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Enterprise Microsoft 365 MCP gateway for AI assistants. The current runtime is a Docker-first, multi-tenant gateway with tenant-scoped OAuth, encrypted token storage, Redis-backed hot state, Postgres-backed tenant registry, per-tenant rate limits, observability, and a discovery-mode tool surface over a 42k+ generated Microsoft 365 catalog.

Maintained at [ali205412/ms-365-mcp-server](https://github.com/ali205412/ms-365-mcp-server). Container images are published to `ghcr.io/ali205412/ms-365-mcp-server`; use immutable `sha-<shortsha>` tags or digests for production, and reserve `:latest` for quickstarts or deployments that explicitly re-pull moving tags.

## What It Provides

- Multi-tenant MCP over Streamable HTTP at `/t/:tenantId/mcp`.
- Delegated OAuth 2.1 with PKCE, app-only client credentials, and bearer pass-through.
- Default `discovery-v1` tool surface: 12 visible meta tools that search, inspect, and execute the generated catalog on demand.
- Generated catalog across Microsoft Graph plus product admin surfaces for Power BI, Power Apps, Power Automate, Exchange Online, and SharePoint Online.
- MCP resources, prompts, completions, logging, bookmarks, recipes, and tenant-scoped facts for discovery tenants.
- AES-GCM tenant secret/token encryption using a KEK and per-tenant wrapped DEKs.
- Postgres tenant registry, Redis PKCE/session/cache/pubsub state, audit log, webhook state, delta tokens, and rate limits.
- OpenTelemetry traces and Prometheus metrics.

## Quick Start: Gateway

```bash
git clone https://github.com/ali205412/ms-365-mcp-server.git
cd ms-365-mcp-server
cp .env.example .env
```

Set at least:

```env
MS365_MCP_DATABASE_URL=postgres://mcp:<password>@postgres:5432/mcp
MS365_MCP_REDIS_URL=redis://redis:6379
MS365_MCP_KEK=<base64-32-byte-key>
MS365_MCP_PUBLIC_URL=https://mcp.example.com
MS365_MCP_CORS_ORIGINS=https://claude.ai,https://chatgpt.com,https://chat.openai.com,https://mcp.example.com
MS365_MCP_OAUTH_REDIRECT_HOSTS=claude.ai,chatgpt.com,chat.openai.com
```

Then run:

```bash
docker compose up -d
```

Or pull an image directly:

```bash
# Production: pin an immutable release from the docker-image workflow.
docker pull ghcr.io/ali205412/ms-365-mcp-server:sha-<shortsha>

# Quickstart only; moving tags require pull_policy: always in Compose/Coolify.
docker pull ghcr.io/ali205412/ms-365-mcp-server:latest
```

Health and readiness:

```bash
curl https://mcp.example.com/healthz
curl https://mcp.example.com/readyz
```

## Claude Connector URL

For Claude.ai custom connectors or any OAuth-capable Streamable HTTP MCP client, use the tenant-scoped endpoint:

```text
https://mcp.example.com/t/<tenant-route-id>/mcp
```

The server publishes tenant-aware OAuth metadata at:

```text
https://mcp.example.com/.well-known/oauth-authorization-server/t/<tenant-route-id>
https://mcp.example.com/.well-known/oauth-protected-resource/t/<tenant-route-id>
```

Validate a connector endpoint with:

```bash
npx @modelcontextprotocol/inspector \
  --url https://mcp.example.com/t/<tenant-route-id>/mcp \
  --transport streamable-http
```

Check server-owned connector metadata and hosted-name drift with:

```bash
ms-365-mcp-server \
  --connector-doctor https://mcp.example.com \
  --tenant-id <tenant-route-id> \
  --tenant-display-name Aspire \
  --observed-name "Microsoft 365 MCP Gateway - Aspire"
```

See [docs/phase-08-connector.md](docs/phase-08-connector.md) for Claude.ai, Claude Work/Cowork, Claude Code, and API tool-only connector guidance.

## Tenant Onboarding

Tenants are runtime data, not build-time config. The tenant row controls which Entra app to use, which Azure tenant to authenticate against, which scopes are allowed, and which optional product routing settings are present.

Create tenants through `/admin/tenants` when the admin API is enabled:

```http
POST /admin/tenants
Authorization: Bearer <admin-token-or-api-key>
Content-Type: application/json

{
  "mode": "delegated",
  "client_id": "00000000-0000-0000-0000-000000000000",
  "client_secret_ref": null,
  "tenant_id": "11111111-2222-3333-4444-555555555555",
  "cloud_type": "global",
  "redirect_uri_allowlist": [
    "https://claude.ai/api/mcp/auth_callback",
    "http://localhost:6274/oauth/callback",
    "http://localhost:6274/oauth/callback/debug"
  ],
  "cors_origins": ["https://claude.ai"],
  "allowed_scopes": [
    "openid",
    "offline_access",
    "profile",
    "email",
    "User.Read",
    "Mail.ReadWrite",
    "Files.ReadWrite"
  ],
  "preset_version": "discovery-v1",
  "enabled_tools": null,
  "rate_limits": {
    "request_per_min": 1000,
    "graph_points_per_min": 50000
  },
  "slug": "contoso"
}
```

For public delegated OAuth clients, keep `client_secret_ref` as `null`. For app-only or confidential delegated clients, `client_secret_ref` must be an encrypted JSON envelope that the tenant pool can unwrap with the tenant DEK. Do not send raw client secrets to the Admin API.

The Admin API is mounted only when both of these are configured:

```env
MS365_MCP_ADMIN_APP_CLIENT_ID=<admin-app-client-id>
MS365_MCP_ADMIN_GROUP_ID=<entra-security-group-object-id>
```

Automation can use rotatable admin API keys:

```http
Authorization: Bearer mcpk_...
```

Useful tenant operations:

```http
GET    /admin/tenants
GET    /admin/tenants/:id
PATCH  /admin/tenants/:id
PATCH  /admin/tenants/:id/rotate-secret
PATCH  /admin/tenants/:id/disable
DELETE /admin/tenants/:id
```

## Azure App Setup

Create one Microsoft Entra app registration per tenant or per operational boundary. Add redirect URIs for the clients you plan to support:

```text
https://claude.ai/api/mcp/auth_callback
http://localhost:6274/oauth/callback
http://localhost:6274/oauth/callback/debug
https://mcp.example.com/callback
```

Grant Microsoft 365 permissions with the bundled Azure CLI script:

```bash
az login --tenant <entra-tenant-id>
APP_ID=<app-client-id> bash bin/azure-grant-mcp-permissions.sh --with-app-only
```

If combined admin consent hits Azure CLI or tenant limits, use the per-resource helper:

```bash
APP_ID=<app-client-id> bash bin/azure-grant-consent-per-resource.sh
```

Some product surfaces require extra tenant setup after permissions are granted:

- Power BI: enable service principals in the Power BI admin portal.
- Exchange app-only tools: assign the service principal the Exchange Administrator role.
- SharePoint tenant admin tools: assign the service principal the SharePoint Administrator role.
- SharePoint tenant admin routing: patch `sharepoint_domain` to the single-label SharePoint prefix, for example `contoso` for `https://contoso-admin.sharepoint.com`.

```http
PATCH /admin/tenants/:id
Content-Type: application/json

{
  "sharepoint_domain": "contoso"
}
```

## Discovery Mode

New tenants created through supported paths default to `discovery-v1`. Instead of exposing tens of thousands of generated tools in `tools/list`, discovery mode exposes these 12 visible tools:

- `search-tools`
- `get-tool-schema`
- `execute-tool`
- `bookmark-tool`
- `list-bookmarks`
- `unbookmark-tool`
- `save-recipe`
- `list-recipes`
- `run-recipe`
- `record-fact`
- `recall-facts`
- `forget-fact`

Normal agent flow:

1. Use `search-tools` with a plain-language goal such as "find unread messages" or "list recent SharePoint files".
2. Use `get-tool-schema` on the candidate alias.
3. Use `execute-tool` with the validated parameters. Default discovery tenants can execute read-only catalog aliases; write-capable aliases require explicit tenant enablement.
4. Save useful aliases with bookmarks, recipes, or facts when the workflow should be repeatable.

Claude API and other tool-only MCP clients use the same fallback loop: `search-tools` -> `get-tool-schema` -> `execute-tool`, with portable text plus structured JSON results when supported.

Existing tenant rows should be moved to the discovery surface explicitly:

```bash
node bin/migrate-tenant-to-discovery.mjs --tenant-id <tenant-route-id> --dry-run
node bin/migrate-tenant-to-discovery.mjs --tenant-id <tenant-route-id>
```

See [docs/discovery-mode.md](docs/discovery-mode.md) for discovery behavior, MCP resources, prompts, completions, memory, and pgvector notes.

## Endpoint Reference

| Endpoint                                              | Purpose                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/t/:tenantId/mcp`                                    | Primary multi-tenant Streamable HTTP MCP endpoint and full Phase 08 connector path. |
| `/t/:tenantId/sse` + `/t/:tenantId/messages`          | Legacy SSE compatibility shim with limited/deprecated Phase 08 support.             |
| `/.well-known/oauth-authorization-server/t/:tenantId` | Tenant OAuth server metadata.                                                       |
| `/.well-known/oauth-protected-resource/t/:tenantId`   | Tenant protected-resource metadata.                                                 |
| `/t/:tenantId/authorize`                              | Tenant OAuth authorize endpoint.                                                    |
| `/t/:tenantId/token`                                  | Tenant OAuth token endpoint.                                                        |
| `/admin/tenants`                                      | Tenant CRUD.                                                                        |
| `/admin/api-keys`                                     | Admin API key lifecycle.                                                            |
| `/admin/audit`                                        | Admin audit query surface.                                                          |
| `/t/:tenantId/notifications`                          | Microsoft Graph change notification receiver.                                       |
| `/healthz`                                            | Liveness.                                                                           |
| `/readyz`                                             | Readiness.                                                                          |
| `/metrics`                                            | Prometheus metrics when enabled.                                                    |

## Observability And Limits

Enable Prometheus:

```env
MS365_MCP_PROMETHEUS_ENABLED=1
MS365_MCP_METRICS_PORT=9464
MS365_MCP_METRICS_BEARER=<optional-token>
```

Enable OTLP traces:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

Main metrics include:

- `mcp_tool_calls_total`
- `mcp_tool_duration_seconds`
- `mcp_graph_throttled_total`
- `mcp_rate_limit_blocked_total`
- `mcp_oauth_pkce_store_size`
- `mcp_token_cache_hit_ratio`
- `mcp_active_streams`

Rate limits are enforced per tenant before Graph calls:

```env
MS365_MCP_DEFAULT_REQ_PER_MIN=1000
MS365_MCP_DEFAULT_GRAPH_POINTS_PER_MIN=50000
```

Per-tenant overrides live in `tenants.rate_limits`. See [docs/observability/](docs/observability/) for the Grafana starter dashboard, runbook, and tuning notes.

## Development

Use Node 20, 21, or 22. Node 22 is recommended locally.

```bash
npm install
npm run generate
npm run build
npm test
```

Useful commands:

```bash
npm run dev
npm run dev:http
npm run lint
npm run format:check
npm run verify
npm run verify:coverage
npm run inspector
```

Regenerate the full catalog from committed snapshots:

```bash
MS365_MCP_FULL_COVERAGE=1 \
MS365_MCP_USE_SNAPSHOT=1 \
NODE_OPTIONS=--max-old-space-size=8192 \
npm run generate
```

Product codegen churn guards are intentional. Set the matching `MS365_MCP_ACCEPT_*_CHURN=1` variable only after reviewing generated diffs.

## Environment Notes

Core gateway variables:

| Variable                         | Purpose                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `MS365_MCP_DATABASE_URL`         | Postgres connection string. Required for HTTP gateway mode.                     |
| `MS365_MCP_REDIS_URL`            | Redis connection string. Required for HTTP gateway mode.                        |
| `MS365_MCP_KEK`                  | Base64 32-byte key encryption key for tenant DEKs.                              |
| `MS365_MCP_PUBLIC_URL`           | Public origin used in OAuth metadata and browser redirects.                     |
| `MS365_MCP_CORS_ORIGINS`         | Comma-separated production CORS allowlist.                                      |
| `MS365_MCP_OAUTH_REDIRECT_HOSTS` | Extra OAuth callback hosts allowed in production, for example `claude.ai`.      |
| `MS365_MCP_APP_ONLY_API_KEY`     | Required gateway secret for tenant app-only MCP calls via `X-MCP-App-Key`.      |
| `MS365_MCP_ADMIN_APP_CLIENT_ID`  | Admin Entra app client id. Required to mount `/admin/*`.                        |
| `MS365_MCP_ADMIN_GROUP_ID`       | Entra group object id allowed to call `/admin/*`. Required to mount `/admin/*`. |
| `MS365_MCP_ADMIN_ORIGINS`        | Browser origins allowed for admin UI calls.                                     |
| `MS365_MCP_REQUIRE_TLS`          | Reject plain HTTP admin requests when set.                                      |
| `MS365_MCP_TRUST_PROXY`          | Trust proxy TLS headers when behind a locked-down reverse proxy.                |
| `MS365_MCP_PGVECTOR_ENABLED`     | Optional pgvector-backed fact embeddings for discovery memory.                  |

See [.env.example](.env.example), [docs/deployment.md](docs/deployment.md), and [docs/observability/env-vars.md](docs/observability/env-vars.md) for the full operational matrix.

## Supported Clouds

| Cloud  | Auth endpoint               | API endpoint                      |
| ------ | --------------------------- | --------------------------------- |
| Global | `login.microsoftonline.com` | `graph.microsoft.com`             |
| China  | `login.chinacloudapi.cn`    | `microsoftgraph.chinacloudapi.cn` |

Set `MS365_MCP_CLOUD_TYPE=china`, pass `--cloud china`, or set `cloud_type` on the tenant row.

## Security Model

- Tenant id is part of the URL and request context for multi-tenant transports.
- Bearer pass-through validates the token `tid` against the tenant route.
- Tokens and tenant secrets are encrypted at rest with per-tenant DEKs wrapped by the KEK.
- Disabling a tenant cryptoshreds its wrapped DEK and revokes tenant-scoped API keys.
- Admin routes are disabled unless admin app and group env vars are set.
- Product admin routes require both Azure permission grants and tenant-specific routing settings where applicable.

## More Documentation

- [docs/discovery-mode.md](docs/discovery-mode.md)
- [docs/phase-08-connector.md](docs/phase-08-connector.md)
- [docs/phase-08-skills-apps.md](docs/phase-08-skills-apps.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/observability/runbook.md](docs/observability/runbook.md)
- [docs/observability/rate-limit-tuning.md](docs/observability/rate-limit-tuning.md)
- [docs/coverage-report.md](docs/coverage-report.md)
- [CLAUDE.md](CLAUDE.md)

## License

MIT. See [LICENSE](LICENSE).

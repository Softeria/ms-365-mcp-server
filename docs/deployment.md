# Production Deployment

The server can be hosted centrally so multiple organizations and users share one governed MCP gateway. Runtime tenant configuration lives in Postgres, hot OAuth/session/cache state lives in Redis, and per-tenant tokens are envelope-encrypted before persistence. Each user still authenticates with their own Microsoft account via OAuth, but production deployments must provide the state backends used by the multi-tenant gateway.

## Architecture

```
MCP Clients (Claude Desktop, Claude Code, Open WebUI, ...)
         │  Streamable HTTP + OAuth 2.1
         ▼
   ┌─────────────────────────────┐  Azure Container Apps / App Service / Docker
   │  ms-365-mcp-server --http   │
   │  multi-tenant MCP gateway   │
   └──────┬──────────────┬───────┘
          │              │
          ▼              ▼
    Postgres        Redis
  tenant/audit    PKCE/cache/session
          │
          ▼
         Microsoft Graph API
```

## Docker

A `Dockerfile` is included for containerized deployments:

```bash
# Build the image
docker build -t ms-365-mcp-server .

# Run with environment variables. For published images, prefer
# ghcr.io/ali205412/ms-365-mcp-server:sha-<shortsha> or an image digest.
docker run -p 3000:3000 \
  -e MS365_MCP_DATABASE_URL=postgres://mcp:password@postgres:5432/mcp \
  -e MS365_MCP_REDIS_URL=redis://redis:6379 \
  -e MS365_MCP_KEK=<base64-32-byte-key> \
  -e MS365_MCP_PUBLIC_URL=https://mcp.example.com \
  -e MS365_MCP_CORS_ORIGINS=https://claude.ai,https://chatgpt.com,https://mcp.example.com \
  -e MS365_MCP_OAUTH_REDIRECT_HOSTS=claude.ai,chatgpt.com \
  ms-365-mcp-server \
  --http 0.0.0.0:3000
```

For production, keep stateful secrets out of source control. Use Key Vault or your deployment platform's secret store for `MS365_MCP_KEK`, database credentials, Redis credentials, and any tenant client secrets (see [Azure Key Vault Integration](../README.md#azure-key-vault-integration)):

```bash
docker run -p 3000:3000 \
  -e MS365_MCP_KEYVAULT_URL=https://your-keyvault.vault.azure.net \
  -e MS365_MCP_DATABASE_URL=postgres://mcp:password@postgres:5432/mcp \
  -e MS365_MCP_REDIS_URL=redis://redis:6379 \
  -e MS365_MCP_PUBLIC_URL=https://mcp.example.com \
  -e MS365_MCP_CORS_ORIGINS=https://claude.ai,https://chatgpt.com,https://mcp.example.com \
  -e MS365_MCP_OAUTH_REDIRECT_HOSTS=claude.ai,chatgpt.com \
  ms-365-mcp-server \
  --http 0.0.0.0:3000
```

## Azure Container Apps

> **Azure Container Apps scaffold**: see [`examples/azure-container-apps/`](../examples/azure-container-apps/) for a Bicep template + PowerShell deploy script that provisions Log Analytics, UAMI, Key Vault (RBAC), a Container Apps Environment, and the Container App. It is not a turnkey v2 production stack: you must supply external Postgres, Redis, and an `MS365_MCP_KEK` value (or equivalent secret-management wiring) before using it for real tenants.

1. **Push the image** to Azure Container Registry:

   ```bash
   az acr build --registry yourregistry --image ms365-mcp-server:sha-<shortsha> .
   ```

2. **Create the Container App** with system-assigned managed identity:

   ```bash
   az containerapp create \
     --name mcp-server \
     --resource-group your-rg \
     --environment your-cae \
     --image yourregistry.azurecr.io/ms365-mcp-server:sha-<shortsha> \
     --target-port 3000 \
     --ingress external \
     --min-replicas 1 \
     --max-replicas 3 \
     --cpu 0.5 --memory 1Gi \
     --system-assigned \
     --secrets \
       "database-url=postgres://mcp:password@postgres:5432/mcp" \
       "redis-url=redis://redis:6379" \
       "kek=<base64-32-byte-key>" \
     --env-vars \
       "MS365_MCP_KEYVAULT_URL=https://your-keyvault.vault.azure.net" \
       "MS365_MCP_DATABASE_URL=secretref:database-url" \
       "MS365_MCP_REDIS_URL=secretref:redis-url" \
       "MS365_MCP_KEK=secretref:kek" \
       "MS365_MCP_PUBLIC_URL=https://mcp.example.com" \
       "MS365_MCP_CORS_ORIGINS=https://claude.ai,https://chatgpt.com,https://mcp.example.com" \
      "MS365_MCP_OAUTH_REDIRECT_HOSTS=claude.ai,chatgpt.com" \
      "MS365_MCP_ADMIN_APP_CLIENT_ID=<admin-app-client-id>" \
      "MS365_MCP_ADMIN_GROUP_ID=<admin-group-object-id>" \
      "MS365_MCP_ADMIN_ORIGINS=https://admin.example.com" \
     --command "node" "dist/index.js" "--http" "0.0.0.0:3000"
   ```

   The `--secrets` names must match the `secretref:*` values in `--env-vars`. For production, replace the inline sample values with Container Apps secrets backed by Key Vault or another secret-management process.

3. **Grant Key Vault access** to the managed identity:

   ```bash
   PRINCIPAL_ID=$(az containerapp show --name mcp-server --resource-group your-rg \
     --query identity.principalId -o tsv)
   az keyvault set-policy --name your-keyvault --object-id $PRINCIPAL_ID \
     --secret-permissions get list
   ```

## Azure App Service

```bash
az webapp create \
  --name mcp-server \
  --resource-group your-rg \
  --plan your-plan \
  --runtime "NODE:20-lts" \
  --assign-identity

az webapp config appsettings set --name mcp-server --resource-group your-rg \
  --settings \
    MS365_MCP_KEYVAULT_URL="https://your-keyvault.vault.azure.net" \
    MS365_MCP_DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://your-keyvault.vault.azure.net/secrets/database-url/)" \
    MS365_MCP_REDIS_URL="@Microsoft.KeyVault(SecretUri=https://your-keyvault.vault.azure.net/secrets/redis-url/)" \
    MS365_MCP_KEK="@Microsoft.KeyVault(SecretUri=https://your-keyvault.vault.azure.net/secrets/kek/)" \
    MS365_MCP_PUBLIC_URL="https://mcp-server.azurewebsites.net" \
    MS365_MCP_CORS_ORIGINS="https://claude.ai,https://chatgpt.com,https://mcp-server.azurewebsites.net" \
    MS365_MCP_OAUTH_REDIRECT_HOSTS="claude.ai,chatgpt.com" \
    MS365_MCP_ADMIN_APP_CLIENT_ID="<admin-app-client-id>" \
    MS365_MCP_ADMIN_GROUP_ID="<admin-group-object-id>" \
    MS365_MCP_ADMIN_ORIGINS="https://admin.example.com" \
    WEBSITES_PORT="3000"

az webapp config set --name mcp-server --resource-group your-rg \
  --startup-file "node dist/index.js --http 0.0.0.0:3000"
```

## Azure AD App Registration (for organizations)

When deploying for an organization, create a dedicated app registration instead of using the built-in client ID:

1. **Create the app** in [Azure Portal](https://portal.azure.com) > App registrations > New registration
   - Name: `MS365 MCP Server`
   - Supported account types: **Accounts in this organizational directory only** (single tenant)
   - Redirect URI: add the exact callback URI used by each MCP client, such as `https://claude.ai/api/mcp/auth_callback`, not a generic server `/oauth/callback` path. Hosted connector hosts such as `claude.ai` and `chatgpt.com` also need to be present in `MS365_MCP_OAUTH_REDIRECT_HOSTS`.

2. **Add API permissions** > Microsoft Graph > Delegated permissions
   Run `npx @softeria/ms-365-mcp-server --org-mode --list-permissions` to print the exact list of permissions required for your enabled tools.

3. **Grant admin consent** to skip per-user consent prompts:

   ```bash
   az ad app permission admin-consent --id your-app-client-id
   ```

4. **Create a client secret** under Certificates & secrets, then store it in Key Vault

5. **Store credentials** in Key Vault (see [Azure Key Vault Integration](../README.md#azure-key-vault-integration))

## Reverse Proxy / Custom Domain

When running behind a reverse proxy, set `MS365_MCP_PUBLIC_URL` to the externally reachable origin (scheme, host, and optional port; no tenant path) so that the OAuth authorize URL handed back to the user's browser is resolvable from outside the server's network:

```bash
# Via environment variable
MS365_MCP_PUBLIC_URL=https://mcp.example.com

# Or via CLI flag
--public-url https://mcp.example.com
```

Only browser-facing fields (`issuer`, `authorization_endpoint`, `authorization_servers`) are pinned to this URL. Server-to-server endpoints (`token_endpoint`, `registration_endpoint`, `resource`) stay on the request origin, so clients that reach the server over an internal network (e.g. another container on the same Docker network) don't have to round-trip back through the public URL. Client MCP URLs should still use the origin and tenant route that the client can actually reach, for example `https://mcp.example.com/t/<tenant-route-id>/mcp` for internet-facing clients.

Hosted MCP clients often send OAuth callbacks on their own domains. Configure `MS365_MCP_OAUTH_REDIRECT_HOSTS` with the callback hosts you trust, for example `claude.ai,chatgpt.com`. This host list is only a scheme/host policy gate: each tenant's `redirect_uri_allowlist` must still contain the full callback URI as an exact string, including path, casing, encoding, and trailing slash.

## First Tenant and Admin Bootstrap

A fresh multi-tenant deployment has no tenant rows until an administrator onboards one. Configure both `MS365_MCP_ADMIN_APP_CLIENT_ID` and `MS365_MCP_ADMIN_GROUP_ID` so the `/admin/*` API is mounted, and set `MS365_MCP_ADMIN_ORIGINS` if a browser admin UI calls it. Then create the first tenant through `POST /admin/tenants` with the tenant's Microsoft app registration, `allowed_scopes`, `enabled_tools` or `preset_version`, CORS origins, and exact `redirect_uri_allowlist` values.

If you skip the admin environment variables, health checks and OAuth metadata can still respond, but no runtime tenant can be onboarded through the gateway and `/t/<tenant-route-id>/mcp` has nothing to authenticate against.

## Client Configuration

Once deployed, users connect by pointing their MCP client to the server URL:

**Claude Desktop:**

```json
{
  "mcpServers": {
    "ms365": {
      "type": "streamable-http",
      "url": "https://mcp.example.com/t/<tenant-route-id>/mcp"
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add ms365 --transport http https://mcp.example.com/t/<tenant-route-id>/mcp
```

The client automatically discovers OAuth endpoints and opens a browser for authentication on first use.

## Security Considerations

- **State isolation**: tenant registry and audit data live in Postgres; PKCE/session/cache state lives in Redis; tenant tokens are encrypted with per-tenant DEKs wrapped by `MS365_MCP_KEK`.
- **Immutable images**: deploy pinned `sha-<shortsha>` tags or digests. If you intentionally use a moving tag such as `latest`, configure your orchestrator to re-pull it (`pull_policy: always` for Compose/Coolify).
- **Admin consent**: grant tenant-wide consent to avoid per-user consent prompts
- **Managed identity**: use managed identity for Key Vault access (no secrets in environment variables)
- **Read-only mode**: use `--read-only` to disable all write operations (send, delete, update, create)
- **Tool filtering**: use `--enabled-tools <regex>` or `--preset <names>` to restrict available tools
- **CORS**: configure `MS365_MCP_CORS_ORIGINS` to restrict allowed origins (defaults to `http://localhost:3000`); set explicitly when clients run on a different origin
- **OAuth redirects**: configure `MS365_MCP_OAUTH_REDIRECT_HOSTS` for hosted connector callback hosts, and keep each tenant `redirect_uri_allowlist` exact to the callback URI in use

## Exposed Endpoints

| Path                                      | Method          | Description                              | Auth Required |
| ----------------------------------------- | --------------- | ---------------------------------------- | ------------- |
| `/`                                       | GET             | Health check                             | No            |
| `/healthz` / `/readyz`                    | GET             | Liveness / readiness probes              | No            |
| `/t/:tenantId/mcp`                        | GET/POST/DELETE | Tenant Streamable HTTP MCP endpoint      | Bearer token  |
| `/t/:tenantId/authorize`                  | GET             | Tenant OAuth redirect to Microsoft       | No            |
| `/t/:tenantId/token`                      | POST            | Tenant OAuth authorization-code exchange | No            |
| `/register`                               | POST            | OAuth dynamic registration               | No            |
| `/.well-known/oauth-authorization-server` | GET             | Root OAuth server metadata               | No            |
| `/.well-known/oauth-protected-resource`   | GET             | Root protected-resource metadata         | No            |
| `/.well-known/*/t/:tenantId`              | GET             | Tenant OAuth/protected-resource metadata | No            |
| `/admin/*`                                | Various         | Tenant/admin API when configured         | Admin auth    |

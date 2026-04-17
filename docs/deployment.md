# Production Deployment

The server can be hosted centrally so that multiple users in an organization share a single MCP endpoint. Each user
authenticates with their own Microsoft account via OAuth — the server is stateless and does not store tokens.

## Architecture

```
MCP Clients (Claude Desktop, Claude Code, Open WebUI, ...)
         │  Streamable HTTP + OAuth 2.1
         ▼
   ┌─────────────────────────────┐
   │  ms-365-mcp-server --http   │  Azure Container Apps / App Service / Docker
   │  (stateless, no token store)│
   └─────────────┬───────────────┘
                 │  Bearer token (per-user)
                 ▼
         Microsoft Graph API
```

## Docker

A `Dockerfile` is included for containerized deployments:

```bash
# Build the image
docker build -t ms-365-mcp-server .

# Run with environment variables
docker run -p 3000:3000 \
  -e MS365_MCP_CLIENT_ID=your-client-id \
  -e MS365_MCP_TENANT_ID=your-tenant-id \
  -e MS365_MCP_CLIENT_SECRET=your-secret \
  -e MS365_MCP_ORG_MODE=true \
  ms-365-mcp-server \
  --http 3000 --org-mode
```

For production, use Azure Key Vault instead of environment variables for secrets (see [Azure Key Vault Integration](../README.md#azure-key-vault-integration)):

```bash
docker run -p 3000:3000 \
  -e MS365_MCP_KEYVAULT_URL=https://your-keyvault.vault.azure.net \
  -e MS365_MCP_ORG_MODE=true \
  -e MS365_MCP_PUBLIC_URL=https://mcp.example.com \
  ms-365-mcp-server \
  --http 3000 --org-mode
```

## Azure Container Apps

> **Turnkey Bicep example**: see [`examples/azure-container-apps/`](../examples/azure-container-apps/) for a complete Bicep template + PowerShell deploy script that provisions Log Analytics, UAMI, Key Vault (RBAC), Container Apps Environment and the Container App in one command.

1. **Push the image** to Azure Container Registry:

   ```bash
   az acr build --registry yourregistry --image ms365-mcp-server:latest .
   ```

2. **Create the Container App** with system-assigned managed identity:

   ```bash
   az containerapp create \
     --name mcp-server \
     --resource-group your-rg \
     --environment your-cae \
     --image yourregistry.azurecr.io/ms365-mcp-server:latest \
     --target-port 3000 \
     --ingress external \
     --min-replicas 1 \
     --max-replicas 3 \
     --cpu 0.5 --memory 1Gi \
     --system-assigned \
     --env-vars \
       "MS365_MCP_KEYVAULT_URL=https://your-keyvault.vault.azure.net" \
       "MS365_MCP_ORG_MODE=true" \
       "MS365_MCP_PUBLIC_URL=https://mcp.example.com" \
     --command "node" "dist/index.js" "--http" "3000" "--org-mode"
   ```

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
    MS365_MCP_ORG_MODE="true" \
    MS365_MCP_PUBLIC_URL="https://mcp-server.azurewebsites.net" \
    WEBSITES_PORT="3000"

az webapp config set --name mcp-server --resource-group your-rg \
  --startup-file "node dist/index.js --http 3000 --org-mode"
```

## Azure AD App Registration (for organizations)

When deploying for an organization, create a dedicated app registration instead of using the built-in client ID:

1. **Create the app** in [Azure Portal](https://portal.azure.com) > App registrations > New registration
   - Name: `MS365 MCP Server`
   - Supported account types: **Accounts in this organizational directory only** (single tenant)
   - Redirect URI: your server's callback URL

2. **Add API permissions** > Microsoft Graph > Delegated permissions
   Run `npx @softeria/ms-365-mcp-server --org-mode --list-permissions` to print the exact list of permissions required for your enabled tools.

3. **Grant admin consent** to skip per-user consent prompts:

   ```bash
   az ad app permission admin-consent --id your-app-client-id
   ```

4. **Create a client secret** under Certificates & secrets, then store it in Key Vault

5. **Store credentials** in Key Vault (see [Azure Key Vault Integration](../README.md#azure-key-vault-integration))

## Reverse Proxy / Custom Domain

When running behind a reverse proxy, set `MS365_MCP_PUBLIC_URL` so that the OAuth authorize URL handed back to the user's browser is resolvable from outside the server's network:

```bash
# Via environment variable
MS365_MCP_PUBLIC_URL=https://mcp.example.com

# Or via CLI flag
--public-url https://mcp.example.com
```

Only browser-facing fields (`issuer`, `authorization_endpoint`, `authorization_servers`) are pinned to this URL. Server-to-server endpoints (`token_endpoint`, `registration_endpoint`, `resource`) stay on the request origin, so clients that reach the server over an internal network (e.g. another container on the same Docker network) don't have to round-trip back through the public URL.

## Client Configuration

Once deployed, users connect by pointing their MCP client to the server URL:

**Claude Desktop:**

```json
{
  "mcpServers": {
    "ms365": {
      "type": "streamable-http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add ms365 --transport http https://mcp.example.com/mcp
```

The client automatically discovers OAuth endpoints and opens a browser for authentication on first use.

## Security Considerations

- **Stateless**: the server does not store tokens — each request carries the user's Bearer token
- **Admin consent**: grant tenant-wide consent to avoid per-user consent prompts
- **Managed identity**: use managed identity for Key Vault access (no secrets in environment variables)
- **Read-only mode**: use `--read-only` to disable all write operations (send, delete, update, create)
- **Tool filtering**: use `--enabled-tools <regex>` or `--preset <names>` to restrict available tools
- **CORS**: configure `MS365_MCP_CORS_ORIGIN` to restrict allowed origins (defaults to `http://localhost:3000`); set explicitly when clients run on a different origin

## Exposed Endpoints

| Path                                      | Method   | Description                     | Auth Required |
| ----------------------------------------- | -------- | ------------------------------- | ------------- |
| `/`                                       | GET      | Health check                    | No            |
| `/mcp`                                    | GET/POST | MCP protocol endpoint           | Bearer token  |
| `/authorize`                              | GET      | OAuth — redirect to Microsoft   | No            |
| `/token`                                  | POST     | OAuth — code exchange / refresh | No            |
| `/register`                               | POST     | OAuth — dynamic registration    | No            |
| `/.well-known/oauth-authorization-server` | GET      | OAuth server metadata           | No            |
| `/.well-known/oauth-protected-resource`   | GET      | Protected resource metadata     | No            |

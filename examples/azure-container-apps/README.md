# Azure Container Apps deployment example

> **Community-contributed example.** This is a turnkey starter — adapt it to your tenant, naming conventions, and security policies before running it in production. See [`docs/deployment.md`](../../docs/deployment.md) for the baseline deployment guide.

Deploys `ms-365-mcp-server` to Azure Container Apps in **Streamable HTTP** mode, with secrets stored in Azure Key Vault and fetched at startup by a user-assigned managed identity (UAMI). No credentials are written to environment variables.

## Contents

- `main.bicep` — full infrastructure: Log Analytics, UAMI, Key Vault (RBAC), Container Apps Environment, Container App
- `deploy.ps1` — PowerShell 7 orchestrator (login, Resource Group, deployment, outputs)

## Architecture

```
MCP client (Claude Desktop / claude.ai / ...)
         │ HTTPS + OAuth 2.0 (Dynamic Client Registration)
         ▼
   Container App  (<baseName>-app)
     - args: --http 3000 [--org-mode] [--read-only]
     - scale 0-3 on concurrent HTTP requests
         │ DefaultAzureCredential (UAMI)
         ▼
   Key Vault  (<baseName>kv<suffix>)
     - ms365-mcp-client-id
     - ms365-mcp-tenant-id
     - ms365-mcp-cloud-type
     - ms365-mcp-client-secret  (optional — confidential client)
         │
         ▼
   Microsoft Graph API  (per-user delegated token)
```

## Prerequisites

### 1. Azure
- Subscription with **Contributor** + **User Access Administrator** roles on the target Resource Group (User Access Administrator is required for the UAMI → Key Vault RBAC assignment).
- [Azure CLI 2.60+](https://learn.microsoft.com/cli/azure/install-azure-cli).
- [PowerShell 7+](https://learn.microsoft.com/powershell/scripting/install/installing-powershell).

### 2. Entra ID app registration
Create an app registration in your tenant:
- **Supported account types**: single tenant
- **Redirect URIs** (initial): `http://localhost:3000/oauth/callback` — update after the first deploy once you know the Container App FQDN
- **API permissions**: delegated scopes matching your run mode. Print the exact list with:
  ```bash
  npx @softeria/ms-365-mcp-server --list-permissions [--org-mode] [--read-only]
  ```
  Grant admin consent in Entra ID for all `*.All` scopes.
- **Authentication → Allow public client flows**: Yes (if you will not use a client secret)
- **Certificates & secrets** (optional): create a client secret for confidential-client mode

Collect `tenantId`, `clientId`, and (optionally) `clientSecret`.

### 3. Container image
Default: `ghcr.io/softeria/ms-365-mcp-server:latest`.
Pin a version with `ghcr.io/softeria/ms-365-mcp-server:<tag>`, or push to your own Azure Container Registry and pass the reference via `-ContainerImage`.

## Initial deployment

```powershell
cd examples/azure-container-apps

# Your own object ID, so you can rotate Key Vault secrets later
$myOid = az ad signed-in-user show --query id -o tsv

./deploy.ps1 `
  -ResourceGroup 'rg-ms365mcp' `
  -Location 'eastus' `
  -BaseName 'ms365mcp' `
  -TenantId '<TENANT_GUID>' `
  -McpClientId '<APP_CLIENT_ID>' `
  -KvAdminObjectIds @($myOid) `
  -OrgMode $true
```

The script prompts for the client secret (leave empty for a public client).

### Dry-run

```powershell
./deploy.ps1 ... -WhatIf
```

## Post-deployment

### 1. Update the redirect URI in Entra ID

The first deployment produces an FQDN such as `ms365mcp-app.<suffix>.<region>.azurecontainerapps.io`. Add `https://<fqdn>/oauth/callback` to your app registration → Authentication → Redirect URIs.

### 2. Redeploy with `publicBaseUrl`

So the server advertises the correct public URL in OAuth metadata:

```powershell
./deploy.ps1 ... -PublicBaseUrl 'https://<fqdn>'
```

### 3. Smoke test

```bash
# OAuth metadata (should return 200 with JSON)
curl https://<fqdn>/.well-known/oauth-authorization-server

# MCP endpoint (should return 401 without Authorization header)
curl -i https://<fqdn>/mcp
```

### 4. Connect an MCP client

See the [Client Configuration section](../../docs/deployment.md#client-configuration) in the main deployment guide.

## Operations

### Stream logs
```bash
az containerapp logs show -n <baseName>-app -g <rg> --follow
```

### Force a new revision
```bash
az containerapp update -n <baseName>-app -g <rg> --revision-suffix "manual$(date +%s)"
```

### Update the image
```bash
az containerapp update -n <baseName>-app -g <rg> \
  --image ghcr.io/softeria/ms-365-mcp-server:<new-tag>
```

### Rotate the client secret
```bash
# 1. Create a new secret in Entra ID (Certificates & secrets)
# 2. Update Key Vault
az keyvault secret set --vault-name <kv-name> --name ms365-mcp-client-secret --value "<new-secret>"
# 3. Restart to pick up the new value
az containerapp update -n <baseName>-app -g <rg> --revision-suffix "rotate$(date +%s)"
```

### Pin minimum replicas (eliminate cold start)
```bash
az containerapp update -n <baseName>-app -g <rg> --min-replicas 1 --max-replicas 5
```

## Cost (order of magnitude)

| Resource | Config | Monthly (idle) |
|---|---|---|
| Container App | Consumption, scale 0-3 | ~$0 with scale-to-zero, ~$15-25 with min=1 |
| Log Analytics | 30-day retention | ~$2-5 depending on log volume |
| Key Vault | Standard, low ops | <$1 |
| UAMI | — | free |

Regional pricing varies — consult the [Azure pricing calculator](https://azure.microsoft.com/pricing/calculator/) for your region. Scale-to-zero introduces a ~2–5 s cold start on the first request after idle.

## Security notes

- **Secrets**: never in environment variables — always via Key Vault + UAMI
- **Ingress**: external HTTPS only. To restrict by IP, add `ipSecurityRestrictions` under `configuration.ingress`
- **RBAC**: UAMI receives only `Key Vault Secrets User` (read). Rotation is done by the admin principals listed in `-KvAdminObjectIds`
- **Purge protection** is enabled on Key Vault (90-day soft-delete) — accidental deletions are recoverable
- **CORS**: defaults to `http://localhost:3000`. Set `-CorsOrigin 'https://claude.ai'` (or your client URL) for hosted clients

## Cleanup

```bash
az group delete -n <rg> --yes --no-wait
# Key Vault remains in soft-delete for 30 days. To purge immediately:
az keyvault purge --name <kv-name>
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Container restarts in a loop | UAMI can't read Key Vault secrets | Wait ~5 min for role propagation, then check `az role assignment list --assignee <uami-principal-id>` |
| 401 on `/mcp` even with a valid token | Wrong `tenantId`/`clientId` in Key Vault | `az keyvault secret show --vault-name <kv> --name ms365-mcp-client-id` |
| OAuth fails with `redirect_uri mismatch` | Redirect URI in Entra ID not updated | Add `https://<fqdn>/oauth/callback` in the app registration |
| Graph returns 403 | Missing scope / admin consent not granted | Re-run `--list-permissions` and grant admin consent |
| Cold start > 10 s | Heavy startup work in custom image | Verify the image does not run `npm install` in its ENTRYPOINT |

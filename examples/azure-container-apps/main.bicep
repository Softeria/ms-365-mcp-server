// ms-365-mcp-server — Azure Container Apps deployment (community example)
//
// Deploys an Azure Container Apps scaffold:
//   - Log Analytics workspace
//   - User-Assigned Managed Identity (UAMI)
//   - Key Vault (RBAC) with Microsoft app registration secrets
//   - Container Apps Environment (Consumption)
//   - Container App running the server in Streamable HTTP mode
//
// This template does not provision production Postgres or Redis. Supply external
// connection strings and a base64 32-byte KEK via the secure parameters below
// before using it for real tenants.
//
// The container uses DefaultAzureCredential (via the UAMI) to read Microsoft app
// secrets from Key Vault at startup. Runtime state secrets are injected as
// Container Apps secrets.

@description('Base name prefix for all resources (lowercase, 3-20 chars, e.g. ms365mcpprod)')
@minLength(3)
@maxLength(20)
param baseName string

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Container image reference (public image by default).')
param containerImage string = 'ghcr.io/softeria/ms-365-mcp-server:latest'

@description('Entra ID tenant ID (GUID).')
param tenantId string

@description('Entra ID app registration clientId used by the MCP server.')
param mcpClientId string

@secure()
@description('Client secret for the MCP app registration. Leave empty for a public client.')
param mcpClientSecret string = ''

@description('Microsoft cloud type: global or china. Defaults to global.')
@allowed([
  'global'
  'china'
])
param cloudType string = 'global'

@secure()
@description('External Postgres connection string for tenant registry and audit data.')
param databaseUrl string

@secure()
@description('External Redis connection string for PKCE, cache, and notification/session state.')
param redisUrl string

@secure()
@description('Base64-encoded 32-byte key encryption key for tenant token wrapping.')
param mcpKek string

@description('Comma-separated CORS origins for the MCP HTTP endpoint. Include hosted connector origins and your public MCP origin.')
param corsOrigins string = 'https://claude.ai,https://chatgpt.com'

@description('Comma-separated HTTPS hosts allowed for hosted MCP OAuth callbacks in addition to the public server host. Tenant redirect_uri_allowlist entries still must match exactly.')
param oauthRedirectHosts string = 'claude.ai,chatgpt.com'

@description('Public base URL advertised in OAuth metadata. Derived from ingress FQDN after first deploy — leave empty initially, then redeploy with the assigned URL.')
param publicBaseUrl string = ''

@description('Admin Entra app client ID. Required, with adminGroupId, to mount /admin routes for first-tenant onboarding.')
param adminAppClientId string = ''

@description('Entra security group object ID allowed to call /admin routes. Required, with adminAppClientId, for first-tenant onboarding.')
param adminGroupId string = ''

@description('Comma-separated browser origins allowed to call /admin routes.')
param adminOrigins string = ''

@description('Object IDs of users/groups granted Key Vault Administrator role (for rotating secrets).')
param kvAdminObjectIds array = []

@description('Enable --org-mode (Teams, SharePoint, Groups, etc.). Defaults to true.')
param orgMode bool = true

@description('Enable --read-only flag (disables write operations).')
param readOnly bool = false

@description('Min replicas for autoscale. Keep 1 for OAuth/session UX; set to 0 only for non-production scale-to-zero testing.')
param minReplicas int = 1

@description('Max replicas for autoscale.')
param maxReplicas int = 3

@description('Tags applied to all resources.')
param tags object = {
  project: 'ms-365-mcp-server'
  managedBy: 'bicep'
}

// ---------- Derived ----------
var suffix = toLower(substring(uniqueString(resourceGroup().id), 0, 5))
var logName = '${baseName}-log-${suffix}'
var uamiName = '${baseName}-uami'
var kvName = take('${baseName}kv${suffix}', 24)
var caeName = '${baseName}-cae'
var appName = '${baseName}-app'

// Built-in role definition IDs
var roleKvSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
var roleKvAdministrator = '00482a5a-887f-4fb3-b363-3b7fe8e74483'

// ---------- Log Analytics ----------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logName
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
  }
}

// ---------- User-Assigned Managed Identity ----------
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  name: uamiName
  location: location
  tags: tags
}

// ---------- Key Vault (RBAC) ----------
resource kv 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: kvName
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource secretClientId 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: kv
  name: 'ms365-mcp-client-id'
  properties: { value: mcpClientId }
}

resource secretTenantId 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: kv
  name: 'ms365-mcp-tenant-id'
  properties: { value: tenantId }
}

resource secretCloudType 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: kv
  name: 'ms365-mcp-cloud-type'
  properties: { value: cloudType }
}

resource secretClientSecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = if (!empty(mcpClientSecret)) {
  parent: kv
  name: 'ms365-mcp-client-secret'
  properties: { value: mcpClientSecret }
}

// Grant UAMI the Key Vault Secrets User role on the vault
resource roleUami 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, uami.id, roleKvSecretsUser)
  properties: {
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKvSecretsUser)
  }
}

// Grant human admins the Key Vault Administrator role (to rotate secrets)
resource roleAdmins 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for oid in kvAdminObjectIds: {
  scope: kv
  name: guid(kv.id, oid, roleKvAdministrator)
  properties: {
    principalId: oid
    principalType: 'User'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleKvAdministrator)
  }
}]

// ---------- Container Apps Environment ----------
resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: caeName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      { name: 'Consumption', workloadProfileType: 'Consumption' }
    ]
  }
}

// ---------- Container App ----------
var containerArgs = concat(['--http', '0.0.0.0:3000'], orgMode ? ['--org-mode'] : [], readOnly ? ['--read-only'] : [])

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        { name: 'database-url', value: databaseUrl }
        { name: 'redis-url', value: redisUrl }
        { name: 'mcp-kek', value: mcpKek }
      ]
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        traffic: [ { latestRevision: true, weight: 100 } ]
      }
    }
    template: {
      containers: [
        {
          name: 'mcp'
          image: containerImage
          args: containerArgs
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            { name: 'MS365_MCP_KEYVAULT_URL', value: kv.properties.vaultUri }
            { name: 'MS365_MCP_DATABASE_URL', secretRef: 'database-url' }
            { name: 'MS365_MCP_REDIS_URL', secretRef: 'redis-url' }
            { name: 'MS365_MCP_KEK', secretRef: 'mcp-kek' }
            { name: 'MS365_MCP_CORS_ORIGINS', value: corsOrigins }
            { name: 'MS365_MCP_OAUTH_REDIRECT_HOSTS', value: oauthRedirectHosts }
            { name: 'MS365_MCP_PUBLIC_URL', value: empty(publicBaseUrl) ? '' : publicBaseUrl }
            { name: 'MS365_MCP_ADMIN_APP_CLIENT_ID', value: adminAppClientId }
            { name: 'MS365_MCP_ADMIN_GROUP_ID', value: adminGroupId }
            { name: 'MS365_MCP_ADMIN_ORIGINS', value: adminOrigins }
            { name: 'AZURE_CLIENT_ID', value: uami.properties.clientId }
            { name: 'NODE_ENV', value: 'production' }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: { metadata: { concurrentRequests: '10' } }
          }
        ]
      }
    }
  }
  dependsOn: [ roleUami, secretClientId, secretTenantId, secretCloudType, secretClientSecret ]
}

// ---------- Outputs ----------
output appFqdn string = app.properties.configuration.ingress.fqdn
output appUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output keyVaultUri string = kv.properties.vaultUri
output keyVaultName string = kv.name
output uamiName string = uami.name
output uamiClientId string = uami.properties.clientId
output logAnalyticsName string = logAnalytics.name

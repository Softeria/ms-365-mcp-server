#Requires -Version 7.0
<#
.SYNOPSIS
Deploys ms-365-mcp-server to Azure Container Apps using the colocated Bicep template.

.DESCRIPTION
Creates (or updates) the target Resource Group and runs the Bicep deployment.
The Entra ID client secret is prompted interactively and stored in Key Vault.

.EXAMPLE
./deploy.ps1 -ResourceGroup rg-ms365mcp -BaseName ms365mcp `
  -TenantId "<tenant-guid>" -McpClientId "<app-guid>" `
  -KvAdminObjectIds @("<your-object-id>")

.NOTES
Requirements:
  - Azure CLI 2.60+ (az)
  - PowerShell 7+
  - Azure subscription with Contributor + User Access Administrator roles
    (User Access Administrator is needed for the UAMI -> Key Vault RBAC assignment)
  - Entra ID app registration created beforehand, with a redirect URI matching
    the Container App FQDN (update it after the first deployment).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$ResourceGroup,

  [Parameter(Mandatory)]
  [ValidatePattern('^[a-z0-9]{3,20}$')]
  [string]$BaseName,

  [Parameter(Mandatory)][string]$TenantId,
  [Parameter(Mandatory)][string]$McpClientId,

  [string]$Location = 'eastus',
  [string]$ContainerImage = 'ghcr.io/softeria/ms-365-mcp-server:latest',
  [ValidateSet('global', 'gcc-high', 'dod', 'china')]
  [string]$CloudType = 'global',
  [string]$CorsOrigin = 'http://localhost:3000',
  [string]$PublicBaseUrl = '',
  [string[]]$KvAdminObjectIds = @(),
  [bool]$OrgMode = $true,
  [bool]$ReadOnly = $false,
  [int]$MinReplicas = 0,
  [int]$MaxReplicas = 3,
  [switch]$SkipLogin,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$bicepFile = Join-Path $PSScriptRoot 'main.bicep'

if (-not (Test-Path $bicepFile)) {
  throw "Bicep file not found: $bicepFile"
}

# --- Prerequisites ---
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw 'Azure CLI not found. Install via: https://learn.microsoft.com/cli/azure/install-azure-cli'
}

Write-Host 'Checking/installing Bicep CLI...' -ForegroundColor DarkGray
az bicep install 2>$null | Out-Null
az bicep upgrade 2>$null | Out-Null

# --- Authentication ---
if (-not $SkipLogin) {
  $acct = az account show --only-show-errors 2>$null | ConvertFrom-Json
  if (-not $acct) {
    Write-Host 'No active Azure session — launching az login...' -ForegroundColor Yellow
    az login --tenant $TenantId --only-show-errors | Out-Null
    $acct = az account show | ConvertFrom-Json
  }
  Write-Host "Active subscription : $($acct.name) ($($acct.id))" -ForegroundColor Green
  Write-Host "Tenant              : $($acct.tenantId)" -ForegroundColor Green
  if ($acct.tenantId -ne $TenantId) {
    Write-Warning "Active tenant ($($acct.tenantId)) does not match target tenant ($TenantId)."
    $confirm = Read-Host 'Continue anyway? [y/N]'
    if ($confirm -ne 'y') { throw 'Cancelled by user.' }
  }
}

# --- Client secret (interactive, SecureString) ---
$secretSecure = Read-Host 'Entra ID client secret (leave empty for public client)' -AsSecureString
$secretPlain = ''
if ($secretSecure.Length -gt 0) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
  try {
    $secretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

# --- Resource Group ---
$rg = az group show -n $ResourceGroup --only-show-errors 2>$null | ConvertFrom-Json
if (-not $rg) {
  Write-Host "Creating Resource Group '$ResourceGroup' in '$Location'..." -ForegroundColor Cyan
  az group create -n $ResourceGroup -l $Location --tags project=ms-365-mcp-server managedBy=bicep -o none
} else {
  Write-Host "Resource Group '$ResourceGroup' exists ($($rg.location))" -ForegroundColor Green
}

# --- Deployment parameters ---
$deployName = "ms365mcp-$(Get-Date -Format 'yyyyMMddHHmmss')"
$params = @{
  baseName       = @{ value = $BaseName }
  tenantId       = @{ value = $TenantId }
  mcpClientId    = @{ value = $McpClientId }
  mcpClientSecret = @{ value = $secretPlain }
  cloudType      = @{ value = $CloudType }
  containerImage = @{ value = $ContainerImage }
  corsOrigin     = @{ value = $CorsOrigin }
  publicBaseUrl  = @{ value = $PublicBaseUrl }
  orgMode        = @{ value = $OrgMode }
  readOnly       = @{ value = $ReadOnly }
  minReplicas    = @{ value = $MinReplicas }
  maxReplicas    = @{ value = $MaxReplicas }
  kvAdminObjectIds = @{ value = $KvAdminObjectIds }
}
$paramsFile = New-TemporaryFile
try {
  @{
    '$schema'      = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
    contentVersion = '1.0.0.0'
    parameters     = $params
  } | ConvertTo-Json -Depth 10 | Set-Content -Path $paramsFile.FullName

  # --- Validation (what-if) ---
  if ($WhatIf) {
    Write-Host '--- what-if ---' -ForegroundColor Magenta
    az deployment group what-if `
      -g $ResourceGroup `
      -n $deployName `
      -f $bicepFile `
      -p "@$($paramsFile.FullName)"
    return
  }

  # --- Deployment ---
  Write-Host "Starting deployment '$deployName'..." -ForegroundColor Cyan
  $outputs = az deployment group create `
    -g $ResourceGroup `
    -n $deployName `
    -f $bicepFile `
    -p "@$($paramsFile.FullName)" `
    --query properties.outputs `
    -o json | ConvertFrom-Json

  # --- Summary ---
  Write-Host ''
  Write-Host 'Deployment succeeded.' -ForegroundColor Green
  Write-Host "  Public URL          : $($outputs.appUrl.value)" -ForegroundColor Yellow
  Write-Host "  Key Vault URI       : $($outputs.keyVaultUri.value)"
  Write-Host "  Key Vault name      : $($outputs.keyVaultName.value)"
  Write-Host "  Managed identity    : $($outputs.uamiName.value)"
  Write-Host "  UAMI clientId       : $($outputs.uamiClientId.value)"
  Write-Host "  Log Analytics       : $($outputs.logAnalyticsName.value)"
  Write-Host ''
  Write-Host 'Next steps:' -ForegroundColor Cyan
  Write-Host "  1. Add '$($outputs.appUrl.value)/oauth/callback' as a redirect URI in your Entra ID app."
  Write-Host "  2. Re-run with -PublicBaseUrl '$($outputs.appUrl.value)' so OAuth metadata returns the public URL."
  Write-Host "  3. Test : curl $($outputs.appUrl.value)/.well-known/oauth-authorization-server"
  Write-Host "  4. Logs : az containerapp logs show -n '$BaseName-app' -g '$ResourceGroup' --follow"
}
finally {
  Remove-Item $paramsFile.FullName -ErrorAction SilentlyContinue
  $secretPlain = $null
  [GC]::Collect()
}

# =============================================================================
# 02-deploy-app.ps1 — Deploy Rayfin app + static site to Fabric
# =============================================================================
# Prereqs: az login, rayfin login, npm install already done
# =============================================================================

param(
    [string]$WorkspaceName = $FABRIC_WORKSPACE_NAME
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n🚀 Step 2: Deploying Rayfin app to Fabric workspace '$WorkspaceName'..." -ForegroundColor Cyan

# Patch rayfin.yml with the target workspace name
$ymlPath = Join-Path $root "rayfin\rayfin.yml"
$yml = Get-Content $ymlPath -Raw
$yml = $yml -replace 'workspace: ".*"', "workspace: `"$WorkspaceName`""
$yml | Set-Content $ymlPath -Encoding UTF8
Write-Host "  📝 Set workspace to '$WorkspaceName' in rayfin.yml"

# Install npm deps if needed
if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "  📦 Installing npm dependencies..."
    Push-Location $root
    npm install --silent
    Pop-Location
}

# Rayfin login check
Write-Host "  🔑 Checking Rayfin login..."
Push-Location $root
try {
    $loginCheck = rayfin up --help 2>&1
} catch {}

# Deploy
Write-Host "  🏗️  Running rayfin up (this builds and deploys the app)..."
$result = rayfin up --yes 2>&1
Pop-Location

$result | ForEach-Object { Write-Host "    $_" }

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ rayfin up failed. Check errors above." -ForegroundColor Red
    exit 1
}

# Extract deployed URL and workspace ID from result
$urlLine = $result | Select-String "Your app is live at:"
if ($urlLine) {
    Write-Host "`n✅ App deployed!" -ForegroundColor Green
    Write-Host "   $($urlLine.Line.Trim())" -ForegroundColor Cyan
}

# Extract workspace ID for use in subsequent steps
$token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv
$workspaces = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces" -Headers @{"Authorization"="Bearer $token"}
$ws = $workspaces.value | Where-Object { $_.displayName -eq $WorkspaceName } | Select-Object -First 1
if ($ws) {
    Write-Host "   Workspace ID: $($ws.id)"
    # Save for subsequent scripts
    $ws.id | Set-Content (Join-Path $PSScriptRoot ".workspace-id.txt")
    Write-Host "   (Workspace ID saved to deploy/.workspace-id.txt)"
}

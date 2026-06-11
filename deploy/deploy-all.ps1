# =============================================================================
# deploy-all.ps1 — One-shot deployment of the World Cup 2026 Pool app
# =============================================================================
# Usage:
#   1. Edit deploy/config.ps1 with your settings
#   2. Run: az login
#   3. Run: rayfin login
#   4. Run: .\deploy\deploy-all.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host @"

  ⚽  World Cup 2026 Pool — Full Deployment
  ==========================================
"@ -ForegroundColor Cyan

# Load config
$configPath = Join-Path $root "deploy\config.ps1"
if (-not (Test-Path $configPath)) {
    Write-Error "Config not found. Copy deploy/config.ps1 and fill in your settings."
    exit 1
}
. $configPath
Write-Host "  ✅ Config loaded (workspace: $FABRIC_WORKSPACE_NAME)"

# Step 1: Prerequisites
Write-Host ""
. (Join-Path $root "deploy\01-prerequisites.ps1")

# Step 2: Deploy app
Write-Host ""
. (Join-Path $root "deploy\02-deploy-app.ps1") -WorkspaceName $FABRIC_WORKSPACE_NAME

# Step 3: Deploy notebooks
Write-Host ""
. (Join-Path $root "deploy\03-deploy-notebooks.ps1") -WorkspaceName $FABRIC_WORKSPACE_NAME

# Step 4: Admin setup + initial sync
Write-Host ""
. (Join-Path $root "deploy\04-setup-admin.ps1") -AdminEmails $ADMIN_EMAILS -AdminNames $ADMIN_NAMES

# Summary
Write-Host @"

  ✅  Deployment complete!
  ========================
  App URL will be shown above (from rayfin up output).

  Next steps:
  • Open the app and sign in
  • The Admin button appears for emails listed in ADMIN_EMAILS
  • Run the simulate_data notebook in Fabric to load test data
  • schedule sync_matches daily to keep match data fresh

"@ -ForegroundColor Green

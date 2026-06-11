# =============================================================================
# 04-setup-admin.ps1 — Insert admin users and run initial data sync
# =============================================================================

param(
    [string[]]$AdminEmails = $ADMIN_EMAILS,
    [string[]]$AdminNames  = $ADMIN_NAMES
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n👤 Step 4: Setting up admin users and syncing match data..." -ForegroundColor Cyan

$token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv

# Get workspace & DB details
$workspaceIdFile = Join-Path $PSScriptRoot ".workspace-id.txt"
if (Test-Path $workspaceIdFile) {
    $wsId = (Get-Content $workspaceIdFile -Raw).Trim()
} else {
    Write-Error "Run 02-deploy-app.ps1 first (workspace ID not found)."
    exit 1
}

$items = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$wsId/items" -Headers @{"Authorization"="Bearer $token"}
$db    = $items.value | Where-Object { $_.type -eq "SqlDatabase" } | Select-Object -First 1
if (-not $db) { Write-Error "No SQL Database found. Run 02-deploy-app.ps1 first."; exit 1 }

$dbDetails = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$wsId/SqlDatabases/$($db.id)" -Headers @{"Authorization"="Bearer $token"}
$server   = $dbDetails.properties.serverFqdn
$database = $dbDetails.properties.databaseName

Write-Host "  📊 Connected to: $server / $database"

# Insert admins via sqlcmd
for ($i = 0; $i -lt $AdminEmails.Count; $i++) {
    $email = $AdminEmails[$i]
    $name  = if ($i -lt $AdminNames.Count) { $AdminNames[$i] } else { $email.Split('@')[0] }
    $id    = [guid]::NewGuid().ToString()
    $now   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")

    $sql = "IF NOT EXISTS (SELECT 1 FROM [Admins] WHERE user_id = '$email') INSERT INTO [Admins] (id,user_id,displayName,createdAt,updatedAt) VALUES ('$id','$email','$name','$now','$now')"
    sqlcmd -S $server -d $database -G -Q $sql -W 2>&1 | Out-Null
    Write-Host "  ✅ Admin: $name ($email)"
}

# Run sync_matches notebook
$nbIdsFile = Join-Path $PSScriptRoot ".notebook-ids.json"
if (Test-Path $nbIdsFile) {
    $nbIds  = Get-Content $nbIdsFile | ConvertFrom-Json
    $syncId = $nbIds.sync_matches

    Write-Host "  🔄 Running sync_matches notebook to load WC 2026 fixtures..."
    $token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv
    $run = Invoke-WebRequest -Method POST "https://api.fabric.microsoft.com/v1/workspaces/$wsId/items/$syncId/jobs/instances?jobType=RunNotebook" `
        -Headers @{"Authorization"="Bearer $token";"Content-Type"="application/json"} -Body "{}"
    $jobUrl = $run.Headers["Location"] | Select-Object -First 1

    $start = Get-Date
    do {
        Start-Sleep 20
        $token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv
        $s = Invoke-RestMethod $jobUrl -Headers @{"Authorization"="Bearer $token"}
        Write-Host "     $([int]((Get-Date)-$start).TotalSeconds)s — $($s.status)"
    } while ($s.status -in @("NotStarted","Running","InProgress") -and ((Get-Date)-$start).TotalMinutes -lt 6)

    if ($s.status -eq "Completed") {
        Write-Host "  ✅ sync_matches completed — WC 2026 fixtures loaded!"
    } else {
        Write-Host "  ⚠️  sync_matches ended with status: $($s.status)" -ForegroundColor Yellow
        if ($s.failureReason) { $s.failureReason | ConvertTo-Json }
    }
} else {
    Write-Host "  ⚠️  Notebook IDs not found. Run 03-deploy-notebooks.ps1 first." -ForegroundColor Yellow
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green

# deploy-semantic-model.ps1
# Deploys the semantic model TMDL to the Fabric workspace.
# Run this alongside `rayfin up` whenever you change the semantic model.
#
# Usage: .\deploy-semantic-model.ps1

param(
    [string]$WorkspaceId = "ef5b019a-be38-4a30-923f-852061ab38e4",
    [string]$SemanticModelId = "8b5e8fa1-593b-4cd6-a142-f43ce966a911"
)

$ErrorActionPreference = "Stop"

Write-Host "Acquiring Fabric token..."
$token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv

$defDir = "$PSScriptRoot\semantic-model\definition"
$parts  = @()

# Collect all TMDL files
$files = Get-ChildItem -Path $defDir -Recurse -Filter "*.tmdl"
foreach ($file in $files) {
    $relativePath = "definition/" + ($file.FullName.Substring($defDir.Length + 1).Replace("\", "/"))
    $content      = Get-Content $file.FullName -Raw -Encoding UTF8
    $b64          = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
    $parts += @{ path = $relativePath; payload = $b64; payloadType = "InlineBase64" }
    Write-Host "  + $relativePath"
}

# Add definition.pbism
$pbismPath = "$PSScriptRoot\semantic-model\definition.pbism"
$pbismB64  = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content $pbismPath -Raw -Encoding UTF8)))
$parts += @{ path = "definition.pbism"; payload = $pbismB64; payloadType = "InlineBase64" }
Write-Host "  + definition.pbism"

$body = @{
    definition = @{
        format = "TMDL"
        parts  = $parts
    }
} | ConvertTo-Json -Depth 10

Write-Host "Pushing $($parts.Count) TMDL parts to Fabric..."
$resp = Invoke-WebRequest -Method POST `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/semanticModels/$SemanticModelId/updateDefinition" `
    -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
    -Body $body

if ($resp.StatusCode -eq 202) {
    $loc = ($resp.Headers["Location"] | Select-Object -First 1)
    Write-Host "Waiting for LRO..."
    do {
        Start-Sleep 3
        $r = Invoke-RestMethod -Uri $loc -Headers @{ "Authorization" = "Bearer $token" }
    } while ($r.status -in @("Running", "NotStarted"))
    if ($r.status -eq "Succeeded") {
        Write-Host "✅ Semantic model deployed successfully."
    } else {
        Write-Error "❌ Deployment failed: $($r | ConvertTo-Json)"
    }
} elseif ($resp.StatusCode -in @(200, 204)) {
    Write-Host "✅ Semantic model deployed successfully."
} else {
    Write-Error "❌ Unexpected response: $($resp.StatusCode)`n$($resp.Content)"
}

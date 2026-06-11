# =============================================================================
# populate-team.ps1 — Insert a manager + all their direct reports into UserProfiles
# =============================================================================
# Usage: .\deploy\populate-team.ps1 -ManagerEmail "leandrolopez@microsoft.com"
# Prereqs: az login (as a user with access to read Graph profiles)
# =============================================================================

param(
    [string]$ManagerEmail    = "leandrolopez@microsoft.com",
    [string]$Server          = "x6eps4xrq2xudenlfv6naeo3i4-tiavx3zyxyyever7quqgdkzy4q.msit-database.fabric.microsoft.com",
    [string]$Database        = "worldcup-pool-03225949-eab8-484f-b94c-889d4518b7ca"
)

$ErrorActionPreference = "Stop"

Write-Host "`n👥 Populating UserProfiles for $ManagerEmail and directs..." -ForegroundColor Cyan

# --- Get Graph token ---
Write-Host "  🔑 Getting Graph API token..."
$graphToken = az account get-access-token --resource "https://graph.microsoft.com" --query accessToken -o tsv
if (-not $graphToken) {
    Write-Error "Failed to get Graph token. Run: az login"
}
$headers = @{ Authorization = "Bearer $graphToken" }

# --- Look up manager ---
Write-Host "  🔍 Looking up $ManagerEmail..."
$managerUrl = "https://graph.microsoft.com/v1.0/users/$ManagerEmail" + '?$select=id,displayName,mail,userPrincipalName,country'
$manager = Invoke-RestMethod $managerUrl -Headers $headers

# --- Look up directs ---
Write-Host "  🔍 Getting direct reports..."
$directsUrl = "https://graph.microsoft.com/v1.0/users/$ManagerEmail/directReports" + '?$select=id,displayName,mail,userPrincipalName,country'
$directs = Invoke-RestMethod $directsUrl -Headers $headers

# Build full list: manager + directs
$allUsers = @($manager) + $directs.value
Write-Host "  ✅ Found $($allUsers.Count) users (1 manager + $($directs.value.Count) directs)"

# --- Map country to 3-letter FIFA code (best-effort) ---
$countryToCode = @{
    "Netherlands"     = "NED"; "NL" = "NED"
    "United States"   = "USA"; "US" = "USA"
    "Germany"         = "GER"; "DE" = "GER"
    "France"          = "FRA"; "FR" = "FRA"
    "Spain"           = "ESP"; "ES" = "ESP"
    "Brazil"          = "BRA"; "BR" = "BRA"
    "Argentina"       = "ARG"; "AR" = "ARG"
    "Portugal"        = "POR"; "PT" = "POR"
    "England"         = "ENG"; "GB" = "ENG"
    "Belgium"         = "BEL"; "BE" = "BEL"
    "Italy"           = "ITA"; "IT" = "ITA"
    "Mexico"          = "MEX"; "MX" = "MEX"
    "Australia"       = "AUS"; "AU" = "AUS"
    "Canada"          = "CAN"; "CA" = "CAN"
    "Japan"           = "JPN"; "JP" = "JPN"
    "South Korea"     = "KOR"; "KR" = "KOR"
    "Morocco"         = "MAR"; "MA" = "MAR"
    "India"           = "IND"; "IN" = "IND"
    "China"           = "CHN"; "CN" = "CHN"
    "Sweden"          = "SWE"; "SE" = "SWE"
    "Denmark"         = "DEN"; "DK" = "DEN"
    "Poland"          = "POL"; "PL" = "POL"
    "Switzerland"     = "SUI"; "CH" = "SUI"
    "Austria"         = "AUT"; "AT" = "AUT"
    "Colombia"        = "COL"; "CO" = "COL"
    "Chile"           = "CHI"; "CL" = "CHI"
    "Ecuador"         = "ECU"; "EC" = "ECU"
    "Uruguay"         = "URU"; "UY" = "URU"
}

# --- Build SQL ---
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")

$insertStatements = $allUsers | ForEach-Object {
    $email = if ($_.mail) { $_.mail } else { $_.userPrincipalName }
    $email = $email.ToLower()
    $name  = $_.displayName -replace "'", "''"
    $nationality = $countryToCode[$_.country] ?? "USA"
    $id    = [System.Guid]::NewGuid().ToString()

    "IF NOT EXISTS (SELECT 1 FROM [dbo].[UserProfiles] WHERE [user_id] = '$email')
    INSERT INTO [dbo].[UserProfiles] ([id],[user_id],[displayName],[nationality],[createdAt],[updatedAt])
    VALUES ('$id','$email','$name','$nationality','$now','$now');"
}

# Show what we're inserting
Write-Host "`n  📋 Users to insert:"
$allUsers | ForEach-Object {
    $email = if ($_.mail) { $_.mail } else { $_.userPrincipalName }
    Write-Host "     - $($_.displayName) <$email>"
}

# --- Run against Fabric SQL ---
Write-Host "`n  💾 Inserting into $Database..."

$sql = $insertStatements -join "`n"

# Write to temp file to avoid escaping issues
$tmpSql = [System.IO.Path]::GetTempFileName() + ".sql"
$sql | Set-Content $tmpSql -Encoding UTF8

sqlcmd -S $Server -d $Database -G -i $tmpSql
Remove-Item $tmpSql

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n  ✅ Done! $($allUsers.Count) users inserted into UserProfiles." -ForegroundColor Green
    Write-Host "  They can now sign in and start predicting.`n" -ForegroundColor Green
} else {
    Write-Host "`n  ❌ sqlcmd failed. Check errors above." -ForegroundColor Red
}

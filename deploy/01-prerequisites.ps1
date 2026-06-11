# =============================================================================
# 01-prerequisites.ps1 — Check and install required tools
# =============================================================================

Write-Host "`n🔧 Checking prerequisites..." -ForegroundColor Cyan

$ok = $true

# Node.js
try {
    $nodeVer = node --version 2>&1
    Write-Host "  ✅ Node.js $nodeVer"
} catch {
    Write-Host "  ❌ Node.js not found — install from https://nodejs.org" -ForegroundColor Red
    $ok = $false
}

# npm
try {
    $npmVer = npm --version 2>&1
    Write-Host "  ✅ npm $npmVer"
} catch {
    Write-Host "  ❌ npm not found" -ForegroundColor Red
    $ok = $false
}

# Azure CLI
try {
    $azVer = (az version --query '"azure-cli"' -o tsv 2>&1)
    Write-Host "  ✅ Azure CLI $azVer"
} catch {
    Write-Host "  ❌ Azure CLI not found — install from https://aka.ms/installazurecli" -ForegroundColor Red
    $ok = $false
}

# Rayfin CLI
try {
    $rfVer = (rayfin --version 2>&1)
    Write-Host "  ✅ Rayfin CLI $rfVer"
} catch {
    Write-Host "  ❌ Rayfin CLI not found — install with: npm install -g @microsoft/rayfin-cli" -ForegroundColor Red
    $ok = $false
}

# sqlcmd (Go version)
try {
    $sqlVer = (sqlcmd --version 2>&1 | Select-String "Version")
    Write-Host "  ✅ sqlcmd (Go) — $sqlVer"
} catch {
    Write-Host "  ⚠️  sqlcmd not found — install with: winget install sqlcmd  (optional, used for admin setup)" -ForegroundColor Yellow
}

# gh CLI
try {
    $ghVer = (gh --version 2>&1 | Select-Object -First 1)
    Write-Host "  ✅ GitHub CLI — $ghVer"
} catch {
    Write-Host "  ℹ️  GitHub CLI not found — optional, only needed to create GitHub repo" -ForegroundColor Gray
}

if (-not $ok) {
    Write-Host "`n❌ Please install missing prerequisites and re-run." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All required prerequisites satisfied." -ForegroundColor Green

# =============================================================================
# config.ps1 — Deployment configuration for World Cup 2026 Pool
# =============================================================================
# Copy this file or set these values before running deploy-all.ps1
# =============================================================================

# Your Fabric workspace name (will be created if it doesn't exist)
$FABRIC_WORKSPACE_NAME = "WorldCup 2026"

# Capacity name to assign the workspace to (must exist in your tenant)
# Leave empty to use the default capacity
$FABRIC_CAPACITY_NAME  = ""

# Admin email(s) — comma-separated. These users will see the Admin button in the app.
# Use the UPN (email) they log in to Fabric with.
$ADMIN_EMAILS = @("admin@yourtenant.onmicrosoft.com")

# Admin display name(s) — must match order of $ADMIN_EMAILS
$ADMIN_NAMES  = @("Your Name")

# Football-data.org API token (free at https://www.football-data.org/client/register)
$FOOTBALL_DATA_TOKEN = "a2201a54ccdf4a2b9ac1d573d26fc7d3"

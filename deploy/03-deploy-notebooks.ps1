# =============================================================================
# 03-deploy-notebooks.ps1 — Create Fabric notebooks in the workspace
# =============================================================================
# Creates: sync_matches, simulate_data, delete_user_data
# =============================================================================

param(
    [string]$WorkspaceName = $FABRIC_WORKSPACE_NAME
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n📓 Step 3: Deploying notebooks to '$WorkspaceName'..." -ForegroundColor Cyan

$token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv

# Get workspace ID
$workspaceIdFile = Join-Path $PSScriptRoot ".workspace-id.txt"
if (Test-Path $workspaceIdFile) {
    $wsId = Get-Content $workspaceIdFile -Raw -Encoding UTF8 | ForEach-Object { $_.Trim() }
} else {
    $workspaces = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces" -Headers @{"Authorization"="Bearer $token"}
    $ws = $workspaces.value | Where-Object { $_.displayName -eq $WorkspaceName } | Select-Object -First 1
    if (-not $ws) { Write-Error "Workspace '$WorkspaceName' not found. Run 02-deploy-app.ps1 first."; exit 1 }
    $wsId = $ws.id
}

# Get Rayfin SQL DB connection string
$items = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$wsId/SqlDatabases" -Headers @{"Authorization"="Bearer $token"}
$db = $items.value | Where-Object { $_.displayName -like "*worldcup*" -or $_.displayName -like "*pool*" } | Select-Object -First 1
if (-not $db) {
    # Try by listing all items
    $allItems = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$wsId/items" -Headers @{"Authorization"="Bearer $token"}
    $db = $allItems.value | Where-Object { $_.type -eq "SqlDatabase" } | Select-Object -First 1
}
if (-not $db) { Write-Error "No SQL Database found in workspace. Ensure rayfin up completed successfully."; exit 1 }

$dbDetails = Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$wsId/SqlDatabases/$($db.id)" -Headers @{"Authorization"="Bearer $token"}
$server = $dbDetails.properties.serverFqdn
$database = $dbDetails.properties.databaseName
if (-not $database) { $database = $db.displayName }

Write-Host "  📊 SQL DB: $server / $database"

function New-FabricNotebook {
    param([string]$Name, [string]$Code, [string]$WsId, [string]$Token)

    # Remove existing
    $existing = (Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$WsId/notebooks" -Headers @{"Authorization"="Bearer $Token"}).value | Where-Object { $_.displayName -eq $Name }
    foreach ($nb in $existing) {
        Invoke-RestMethod -Method DELETE "https://api.fabric.microsoft.com/v1/workspaces/$WsId/notebooks/$($nb.id)" -Headers @{"Authorization"="Bearer $Token"} | Out-Null
        Start-Sleep 12
    }

    $lines = $Code -split "`n" | ForEach-Object { $_ + "`n" }
    $lines[-1] = $lines[-1].TrimEnd("`n")
    $nb = @{ nbformat=4; nbformat_minor=5; metadata=@{language_info=@{name="python"};kernelspec=@{display_name="PySpark";language="python";name="synapse_pyspark"}}; cells=@(@{cell_type="code";source=$lines;outputs=@();execution_count=$null;metadata=@{}}) } | ConvertTo-Json -Depth 10
    $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($nb))
    $body = @{ displayName=$Name; type="Notebook"; definition=@{format="ipynb";parts=@(@{path="notebook-content.ipynb";payload=$b64;payloadType="InlineBase64"})} } | ConvertTo-Json -Depth 10

    $cr = Invoke-WebRequest -Method POST "https://api.fabric.microsoft.com/v1/workspaces/$WsId/notebooks" -Headers @{"Authorization"="Bearer $Token";"Content-Type"="application/json"} -Body $body
    $loc = $cr.Headers["Location"] | Select-Object -First 1; Start-Sleep 4
    $op = Invoke-RestMethod $loc -Headers @{"Authorization"="Bearer $Token"}
    if ($op.status -ne "Succeeded") { Write-Error "Failed to create $Name`: $($op | ConvertTo-Json)"; return $null }

    $items = (Invoke-RestMethod "https://api.fabric.microsoft.com/v1/workspaces/$WsId/notebooks" -Headers @{"Authorization"="Bearer $Token"}).value | Where-Object { $_.displayName -eq $Name } | Select-Object -First 1
    return $items.id
}

# ── sync_matches ─────────────────────────────────────────────────────────────
$syncCode = @"
import pyodbc, struct, uuid, requests
from datetime import datetime, timezone

SERVER   = '$server'
DATABASE = '$database'
API_TOKEN = '$FOOTBALL_DATA_TOKEN'

try:
    tok = mssparkutils.credentials.getToken('https://database.windows.net/')
except Exception:
    tok = notebookutils.credentials.getToken('https://database.windows.net/')

b = tok.encode('utf-16-le')
ts = struct.pack('<I' + str(len(b)) + 's', len(b), b)
conn = None
for drv in ('ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server'):
    try:
        cs = 'Driver={' + drv + '};Server=' + SERVER + ',1433;Database=' + DATABASE + ';Encrypt=yes;TrustServerCertificate=no;'
        conn = pyodbc.connect(cs, attrs_before={1256: ts})
        print('Connected via ' + drv)
        break
    except Exception as ex:
        print(drv + ' failed: ' + str(ex))
if conn is None: raise RuntimeError('Could not connect')
cur = conn.cursor()

resp = requests.get('https://api.football-data.org/v4/competitions/WC/matches?limit=999',
                    headers={'X-Auth-Token': API_TOKEN}, timeout=30)
resp.raise_for_status()
matches = resp.json().get('matches', [])
print('Fetched ' + str(len(matches)) + ' matches from API')

STATUS_MAP = {'FINISHED': 'FINISHED', 'AWARDED': 'FINISHED', 'IN_PLAY': 'IN_PLAY', 'PAUSED': 'PAUSED'}
upserted = 0
for m in matches:
    ext_id    = m['id']
    stage     = m.get('stage', '')[:50]
    matchday  = m.get('matchday') or 0
    group_key = (m.get('group') or '')[:10] or None
    home_code = (m['homeTeam'].get('tla') or m['homeTeam'].get('shortName') or '')[:10]
    away_code = (m['awayTeam'].get('tla') or m['awayTeam'].get('shortName') or '')[:10]
    home_name = (m['homeTeam'].get('name') or home_code)[:100]
    away_name = (m['awayTeam'].get('name') or away_code)[:100]
    kickoff   = m.get('utcDate', '')[:19].replace('T', ' ')
    raw_st    = m.get('status', 'TIMED')
    status    = STATUS_MAP.get(raw_st, raw_st)[:30]
    score     = m.get('score', {})
    full      = score.get('fullTime', {})
    home_sc   = full.get('home')
    away_sc   = full.get('away')
    winner    = (score.get('winner') or '')
    if winner == 'HOME_TEAM': winner = home_code
    elif winner == 'AWAY_TEAM': winner = away_code
    elif winner == 'DRAW': winner = 'DRAW'
    else: winner = None
    winner = winner[:10] if winner else None
    is_fin    = 1 if status == 'FINISHED' else 0

    cur.execute('SELECT id FROM [Matches] WHERE externalId = ?', ext_id)
    row = cur.fetchone()
    if row:
        cur.execute('''UPDATE [Matches] SET stage=?,matchday=?,groupKey=?,homeTeamCode=?,awayTeamCode=?,
            homeTeamName=?,awayTeamName=?,kickoffUtc=?,status=?,homeScore=?,awayScore=?,
            winnerTeamCode=?,isFinalized=? WHERE externalId=?''',
            stage, matchday, group_key, home_code, away_code,
            home_name, away_name, kickoff, status, home_sc, away_sc, winner, is_fin, ext_id)
    else:
        cur.execute('''INSERT INTO [Matches] (id,externalId,stage,matchday,groupKey,homeTeamCode,awayTeamCode,
            homeTeamName,awayTeamName,kickoffUtc,status,homeScore,awayScore,winnerTeamCode,isFinalized)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            str(uuid.uuid4()), ext_id, stage, matchday, group_key, home_code, away_code,
            home_name, away_name, kickoff, status, home_sc, away_sc, winner, is_fin)
    upserted += 1

conn.commit()
cur.close(); conn.close()
print('Upserted ' + str(upserted) + ' matches into [Matches]')
"@

Write-Host "  📓 Creating sync_matches notebook..."
$syncId = New-FabricNotebook -Name "sync_matches" -Code $syncCode -WsId $wsId -Token $token
Write-Host "     sync_matches ID: $syncId"

# ── simulate_data ─────────────────────────────────────────────────────────────
$simCode = @"
import pyodbc, struct, uuid, random
from datetime import datetime, timezone

SERVER   = '$server'
DATABASE = '$database'

try:
    tok = mssparkutils.credentials.getToken('https://database.windows.net/')
except Exception:
    tok = notebookutils.credentials.getToken('https://database.windows.net/')

b = tok.encode('utf-16-le')
ts = struct.pack('<I' + str(len(b)) + 's', len(b), b)
conn = None
for drv in ('ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server'):
    try:
        cs = 'Driver={' + drv + '};Server=' + SERVER + ',1433;Database=' + DATABASE + ';Encrypt=yes;TrustServerCertificate=no;'
        conn = pyodbc.connect(cs, attrs_before={1256: ts})
        break
    except: pass
if conn is None: raise RuntimeError('Could not connect')
cur = conn.cursor()

cur.execute("DELETE FROM [MatchPredictions] WHERE user_id LIKE 'sim-user-%'")
cur.execute("DELETE FROM [TournamentPredictions] WHERE user_id LIKE 'sim-user-%'")
cur.execute("DELETE FROM [UserProfiles] WHERE user_id LIKE 'sim-user-%'")
conn.commit()
print('Cleared previous sim data')

cur.execute('SELECT id FROM [Matches]')
all_matches = [r.id for r in cur.fetchall()]
print('Total matches: ' + str(len(all_matches)))
if not all_matches: raise RuntimeError('No matches found - run sync_matches first!')

NATS=['NED','BEL','GER','FRA','ESP','ENG','POR','ITA','ARG','BRA']
WINN=['BRA','FRA','ARG','ENG','ESP','GER','POR','NED','BEL','USA']
FN=['Emma','Liam','Olivia','Noah','Sophia','Lucas','Mia','Ethan','Charlotte','James']
LN=['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis']
rng=random.Random(42)
now=datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

users=[('sim-user-' + str(i).zfill(3) + '@pool.test', rng.choice(FN)+' '+rng.choice(LN), rng.choice(NATS), rng.choice(WINN)) for i in range(50)]
cur.executemany('INSERT INTO [UserProfiles] (id,user_id,displayName,nationality,expectedWinnerTeamCode,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)', [(str(uuid.uuid4()),u[0],u[1],u[2],u[3],now,now) for u in users])
conn.commit()
print('Users: ' + str(len(users)))

preds=[]
for u in users:
    for mid in all_matches:
        if rng.random()>0.15:
            preds.append((str(uuid.uuid4()),u[0],str(mid),max(0,round(rng.gauss(1.3,0.9))),max(0,round(rng.gauss(1.1,0.9))),now,now))
for i in range(0, len(preds), 500):
    cur.executemany('INSERT INTO [MatchPredictions] (id,user_id,match_id,homeGoals,awayGoals,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)', preds[i:i+500])
    conn.commit()
print('MatchPredictions: ' + str(len(preds)))

tp=[(str(uuid.uuid4()),u[0],u[3],now,now) for u in users]
cur.executemany('INSERT INTO [TournamentPredictions] (id,user_id,winnerTeamCode,createdAt,updatedAt) VALUES (?,?,?,?,?)', tp)
conn.commit()
cur.close(); conn.close()
print('TournamentPredictions: ' + str(len(tp)))
print('DONE - simulated data loaded!')
"@

Write-Host "  📓 Creating simulate_data notebook..."
$simId = New-FabricNotebook -Name "simulate_data" -Code $simCode -WsId $wsId -Token $token
Write-Host "     simulate_data ID: $simId"

# ── delete_user_data ──────────────────────────────────────────────────────────
$delCode = @"
import pyodbc, struct

SERVER   = '$server'
DATABASE = '$database'

try:
    tok = mssparkutils.credentials.getToken('https://database.windows.net/')
except Exception:
    tok = notebookutils.credentials.getToken('https://database.windows.net/')

b = tok.encode('utf-16-le')
ts = struct.pack('<I' + str(len(b)) + 's', len(b), b)
conn = None
for drv in ('ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server'):
    try:
        cs = 'Driver={' + drv + '};Server=' + SERVER + ',1433;Database=' + DATABASE + ';Encrypt=yes;TrustServerCertificate=no;'
        conn = pyodbc.connect(cs, attrs_before={1256: ts}); break
    except: pass
if conn is None: raise RuntimeError('Could not connect')
cur = conn.cursor()

# Usage: set USER_ID to the user_id to delete (email or OID)
USER_ID = 'user@example.com'

cur.execute('DELETE FROM [MatchPredictions] WHERE user_id = ?', USER_ID)
cur.execute('DELETE FROM [TournamentPredictions] WHERE user_id = ?', USER_ID)
cur.execute('DELETE FROM [UserProfiles] WHERE user_id = ?', USER_ID)
conn.commit()
cur.close(); conn.close()
print('Deleted all data for user: ' + USER_ID)
"@

Write-Host "  📓 Creating delete_user_data notebook..."
$delId = New-FabricNotebook -Name "delete_user_data" -Code $delCode -WsId $wsId -Token $token
Write-Host "     delete_user_data ID: $delId"

# Save notebook IDs
@{ sync_matches=$syncId; simulate_data=$simId; delete_user_data=$delId } | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot ".notebook-ids.json")
Write-Host "`n✅ All notebooks created. IDs saved to deploy/.notebook-ids.json" -ForegroundColor Green

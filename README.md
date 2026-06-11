# ⚽ World Cup 2026 Pool

A full-stack prediction pool app for the **FIFA World Cup 2026**, built on **Microsoft Fabric** with [Rayfin](https://rayfin.dev) as the backend.

Users sign in with their Microsoft / Entra account, pick match scores, and compete on a leaderboard. An analytics dashboard shows live stats, match results, and prediction rankings.

![Analytics Dashboard](docs/screenshot-analytics.png)

---

## ✨ Features

- 🔐 **Fabric-native auth** — sign in with your Microsoft account, no extra setup
- ⚽ **Match prediction** — predict scores for all 104 WC 2026 fixtures
- 🏆 **Tournament prediction** — pick your winner
- 📊 **Analytics dashboard** — leaderboard, match results, upcoming fixtures, stats bar
- 🔑 **Admin panel** — manage users, view all predictions
- 🤖 **Auto-sync** — `sync_matches` notebook keeps fixtures up to date from football-data.org

---

## 🚀 Quick Deploy

### Prerequisites

| Tool | Install |
|------|---------|
| [Node.js 18+](https://nodejs.org) | `winget install OpenJS.NodeJS` |
| [Azure CLI](https://aka.ms/installazurecli) | `winget install Microsoft.AzureCLI` |
| [Rayfin CLI](https://rayfin.dev/docs/cli) | `npm install -g @microsoft/rayfin-cli` |
| [sqlcmd (Go)](https://github.com/microsoft/go-sqlcmd) | `winget install sqlcmd` |

### Steps

```powershell
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/FabricWorldCup.git
cd FabricWorldCup
npm install

# 2. Configure
cp deploy/config.ps1 deploy/config.local.ps1
# Edit config.local.ps1 — set workspace name, admin emails, capacity name

# 3. Sign in
az login
rayfin login

# 4. Deploy everything
.\deploy\deploy-all.ps1
```

The script will:
1. ✅ Check prerequisites
2. 🏗️ Deploy the Rayfin app + SQL database + static site to Fabric
3. 📓 Create Fabric Spark notebooks (sync_matches, simulate_data, delete_user_data)
4. 👤 Insert admin users into the database
5. 🔄 Run `sync_matches` to load all 104 WC 2026 fixtures

---

## ⚙️ Configuration

Edit `deploy/config.ps1` before deploying:

```powershell
$FABRIC_WORKSPACE_NAME = "WorldCup 2026"          # Fabric workspace name
$FABRIC_CAPACITY_NAME  = "myCapacity"              # Optional — capacity to assign
$ADMIN_EMAILS = @("you@yourtenant.onmicrosoft.com") # Who gets the Admin button
$ADMIN_NAMES  = @("Your Name")
$FOOTBALL_DATA_TOKEN = "your-token-here"           # Free from football-data.org
```

Get a free football-data.org token at: https://www.football-data.org/client/register

---

## 📁 Project Structure

```
├── deploy/                         # Deployment scripts
│   ├── config.ps1                  # ← Edit this before deploying
│   ├── deploy-all.ps1              # One-shot full deployment
│   ├── 01-prerequisites.ps1        # Check required tools
│   ├── 02-deploy-app.ps1           # Deploy Rayfin app to Fabric
│   ├── 03-deploy-notebooks.ps1     # Create Fabric Spark notebooks
│   └── 04-setup-admin.ps1          # Insert admins + initial data sync
├── rayfin/
│   ├── rayfin.yml                  # Rayfin project config
│   └── data/
│       ├── Match.ts                # Match entity (read-only for all users)
│       ├── MatchPrediction.ts      # Predictions (read-all, write-own)
│       ├── UserProfile.ts          # User profiles
│       ├── TournamentPrediction.ts # Winner picks
│       ├── Admin.ts                # Admin list
│       └── schema.ts               # TypeScript schema export
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx            # Match list + prediction forms
│   │   ├── AnalyticsPage.tsx       # Dashboard
│   │   └── AdminPage.tsx           # Admin panel
│   ├── components/                 # Chart and UI components
│   ├── services/                   # Rayfin client wrappers
│   └── hooks/                      # Auth and data hooks
└── semantic-model/                 # Power BI semantic model (optional)
```

---

## 📓 Fabric Notebooks

| Notebook | Purpose | Schedule |
|----------|---------|---------|
| `sync_matches` | Fetch latest match data from football-data.org, upsert into `[Matches]` | Daily |
| `simulate_data` | Load 50 simulated users + predictions for demo/testing | On demand |
| `delete_user_data` | Remove all data for a specific user (GDPR) | On demand |

---

## 🗃️ Data Model

```
Matches          — 104 WC 2026 fixtures (synced from football-data.org)
UserProfiles     — one row per participant
MatchPredictions — predicted score per user per match
TournamentPredictions — predicted winner per user
Admins           — admin user list (managed directly in DB)
```

---

## 🛠️ Development

```powershell
# Local dev (uses mock backend)
npm run dev

# Lint
npm run lint

# Tests
npm run test

# Redeploy to Fabric (after code changes)
rayfin up --yes
```

---

## 📄 License

MIT


import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { TournamentStatsBar } from '@/components/tournament-stats-bar';
import { MatchResultsChart } from '@/components/match-results-chart';
import { LeaderboardChart } from '@/components/leaderboard-chart';
import { UpcomingMatchesList } from '@/components/upcoming-matches-list';

export function AnalyticsPage() {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-[#003DA5] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">World Cup 2026 Prediction</h1>
              <p className="text-xs text-blue-200">Analytics Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && <span className="hidden text-xs text-blue-200 sm:inline">{user.email}</span>}
            <Link
              to="/"
              className="rounded border border-blue-400 px-3 py-1.5 text-xs text-blue-100 hover:bg-blue-700 flex items-center gap-1"
            >
              ⚽ Pool
            </Link>
            <button
              onClick={() => void signOut()}
              className="rounded border border-blue-400 px-3 py-1.5 text-xs text-blue-100 hover:bg-blue-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="h-1 w-full bg-[#FF6600]" />

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <TournamentStatsBar />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MatchResultsChart />
          <LeaderboardChart />
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming &amp; Live Matches</h3>
          <UpcomingMatchesList />
        </div>
      </main>

      <footer className="mt-8 border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
        <span className="mr-1" style={{ color: '#FF6600' }}>●</span>
        Live data from <strong>worldcup_analytics</strong> semantic model via Microsoft Fabric
      </footer>
    </div>
  );
}

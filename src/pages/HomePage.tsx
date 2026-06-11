import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/hooks/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { getMatches, type MatchItem } from '@/services/matches';
import { getMyPredictions, upsertMatchPrediction, type MatchPredictionItem } from '@/services/predictions';

function formatKickoff(d: Date): string {
  const dt = new Date(d);
  return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    FINISHED: 'bg-gray-100 text-gray-600',
    IN_PLAY: 'bg-[#FF6600] text-white',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    SCHEDULED: 'bg-[#003DA5] text-white',
    TIMED: 'bg-[#003DA5] text-white',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status === 'FINISHED' ? 'FT' : status === 'IN_PLAY' ? 'LIVE' : status}
    </span>
  );
}

interface PredictFormProps {
  match: MatchItem;
  existing?: MatchPredictionItem;
  onSaved: () => void;
}

function PredictForm({ match, existing, onSaved }: PredictFormProps) {
  const [home, setHome] = useState<number | ''>(existing?.homeGoals ?? '');
  const [away, setAway] = useState<number | ''>(existing?.awayGoals ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (home === '' || away === '') return;
    setSaving(true);
    try {
      await upsertMatchPrediction(match.id, home, away);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-2 mt-2">
      <input
        type="number" min={0} max={20} value={home} placeholder="0"
        onChange={(e) => setHome(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-12 rounded border border-gray-300 px-2 py-1 text-center text-sm"
        aria-label={`${match.homeTeamCode} goals`}
      />
      <span className="text-xs text-gray-400">–</span>
      <input
        type="number" min={0} max={20} value={away} placeholder="0"
        onChange={(e) => setAway(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-12 rounded border border-gray-300 px-2 py-1 text-center text-sm"
        aria-label={`${match.awayTeamCode} goals`}
      />
      <button
        type="submit" disabled={saving || home === '' || away === ''}
        className="rounded bg-[#FF6600] px-3 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
      >
        {existing ? 'Update' : 'Predict'}
      </button>
    </form>
  );
}

interface MatchCardProps {
  match: MatchItem;
  prediction?: MatchPredictionItem;
  onRefresh: () => void;
}

function MatchCard({ match, prediction, onRefresh }: MatchCardProps) {
  const canPredict = match.status === 'SCHEDULED' || match.status === 'TIMED';
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${isLive ? 'border-[#FF6600]' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-gray-400">{match.stage} · {formatKickoff(match.kickoffUtc)}</div>
        <StatusBadge status={match.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-col items-center text-center w-1/3">
          <span className="text-xl font-bold text-gray-800">{match.homeTeamCode}</span>
          <span className="text-xs text-gray-500 truncate max-w-full">{match.homeTeamName}</span>
        </div>
        <div className="flex flex-col items-center">
          {match.status === 'FINISHED' || isLive ? (
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </div>
          ) : (
            <div className="text-lg font-medium text-gray-300">vs</div>
          )}
          {prediction && (
            <div className="mt-1 text-xs text-[#003DA5]">
              You: {prediction.homeGoals}–{prediction.awayGoals}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center text-center w-1/3">
          <span className="text-xl font-bold text-gray-800">{match.awayTeamCode}</span>
          <span className="text-xs text-gray-500 truncate max-w-full">{match.awayTeamName}</span>
        </div>
      </div>
      {canPredict && (
        <PredictForm match={match} existing={prediction} onSaved={onRefresh} />
      )}
    </div>
  );
}

export function HomePage() {
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [predictions, setPredictions] = useState<MatchPredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'results'>('upcoming');

  const loadData = useCallback(async () => {
    const [m, p] = await Promise.all([getMatches(), getMyPredictions()]);
    setMatches(m);
    setPredictions(p);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const predMap = Object.fromEntries(predictions.map(p => [p.match_id, p]));
  const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
  const live = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
  const results = matches.filter(m => m.status === 'FINISHED').reverse();

  const tabs = [
    { key: 'upcoming' as const, label: `Upcoming (${upcoming.length})` },
    { key: 'live' as const, label: `Live (${live.length})`, badge: live.length > 0 },
    { key: 'results' as const, label: `Results (${results.length})` },
  ];

  const visibleMatches = activeTab === 'upcoming' ? upcoming : activeTab === 'live' ? live : results;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-[#003DA5] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <h1 className="text-lg font-bold">World Cup 2026 Pool</h1>
              <p className="text-xs text-blue-200">Match Prediction App</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.email && <span className="hidden text-xs text-blue-200 sm:inline">{user.email}</span>}
            <Link
              to="/analytics"
              className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-100 hover:bg-blue-700 flex items-center gap-1"
            >
              📊 Analytics
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded border border-[#FF6600] px-3 py-1 text-xs text-[#FF6600] hover:bg-orange-900/30 flex items-center gap-1"
              >
                ⚙️ Admin
              </Link>
            )}
            <button onClick={() => void signOut()} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-100 hover:bg-blue-700">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="h-1 bg-[#FF6600]" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-[#003DA5] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {tab.label}
              {tab.badge && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-[#FF6600]" />}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />)}</div>
        ) : visibleMatches.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {activeTab === 'live' ? 'No matches live right now.' : 'No matches to show.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMatches.map(m => <MatchCard key={m.id} match={m} prediction={predMap[m.id]} onRefresh={() => void loadData()} />)}
          </div>
        )}
      </main>
    </div>
  );
}

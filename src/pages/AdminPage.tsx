import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { getAllUserProfiles, getUserPredictionCount, type UserProfileItem } from '@/services/admin';

const FLAG: Record<string, string> = {
  NL: '🇳🇱', BE: '🇧🇪', DE: '🇩🇪', FR: '🇫🇷', GB: '🇬🇧', ES: '🇪🇸',
  BR: '🇧🇷', AR: '🇦🇷', PT: '🇵🇹', US: '🇺🇸', JP: '🇯🇵', IT: '🇮🇹',
  MA: '🇲🇦', MX: '🇲🇽', CO: '🇨🇴', TR: '🇹🇷', KR: '🇰🇷', AU: '🇦🇺',
  CA: '🇨🇦', NO: '🇳🇴', SE: '🇸🇪', DK: '🇩🇰', PL: '🇵🇱', AT: '🇦🇹',
  CH: '🇨🇭',
};

interface UserRow extends UserProfileItem {
  predictionCount: number | null;
}

export function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    getAllUserProfiles()
      .then(async (profiles) => {
        const rows: UserRow[] = profiles.map((p) => ({ ...p, predictionCount: null }));
        setUsers(rows);
        setLoading(false);

        // Load prediction counts in parallel (best-effort)
        const counts = await Promise.allSettled(
          profiles.map((p) => getUserPredictionCount(p.user_id))
        );
        setUsers(
          profiles.map((p, i) => ({
            ...p,
            predictionCount: counts[i].status === 'fulfilled' ? counts[i].value : null,
          }))
        );
      })
      .catch(() => setLoading(false));
  }, [isAdmin]);

  function copyDeleteCommand(email: string) {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl mb-2">🚫</p>
          <p className="text-gray-600 font-semibold">Access denied</p>
          <p className="text-gray-400 text-sm mt-1">You are not an admin.</p>
          <Link to="/" className="mt-4 inline-block text-[#003DA5] underline text-sm">← Back to pool</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#003DA5] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">⚙️ Admin</span>
          <span className="text-sm opacity-70">World Cup 2026 Pool</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/analytics" className="opacity-80 hover:opacity-100">📊 Analytics</Link>
          <Link to="/" className="opacity-80 hover:opacity-100">⚽ Pool</Link>
          <span className="opacity-60">{user?.email}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6 p-4 rounded-lg border border-[#FF6600]/30 bg-[#FF6600]/5">
          <p className="text-sm text-gray-600">
            <strong>Deleting user data</strong> must be done via the Fabric notebook <code className="bg-gray-100 px-1 rounded">delete_user_data</code> in the <em>WorldCup</em> workspace.
            Copy the user email below and run the notebook with <code className="bg-gray-100 px-1 rounded">USER_EMAIL</code> set to that value.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Users
              {!loading && <span className="ml-2 text-sm font-normal text-gray-400">({users.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No users yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Nationality</th>
                  <th className="px-4 py-2 text-left">Winner pick</th>
                  <th className="px-4 py-2 text-right">Predictions</th>
                  <th className="px-4 py-2 text-right">Joined</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-800">{u.displayName}</div>
                      <div className="text-xs text-gray-400">{u.user_id}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {FLAG[u.nationality ?? ''] ?? ''} {u.nationality ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {u.expectedWinnerTeamCode ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {u.predictionCount === null ? '…' : u.predictionCount}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => copyDeleteCommand(u.user_id)}
                        title="Copy user ID to clipboard (use as USER_EMAIL in delete_user_data notebook)"
                        className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-red-300 hover:text-red-600 transition-colors"
                      >
                        {copiedEmail === u.user_id ? '✅ Copied' : '🗑️ Copy ID'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api/client';

interface SessionState {
  session: { id: number; state: string; locked: boolean; started_at: string } | null;
  wait_remaining_seconds: number;
  emergency_used_this_week: number;
  emergency_cap: number;
}

interface Stats {
  today: number;
  week: number;
  all_time: number;
  top_domains: { domain: string; count: number }[];
}

interface HealthState { status: string; issues: string[] }

function StatusBadge({ status }: { status: string }) {
  const color = status === 'active' ? 'bg-green-600' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-600';
  const label = status === 'active' ? 'Protected' : status === 'degraded' ? 'Degraded' : 'Broken';
  return <span className={`${color} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide`}>{label}</span>;
}

const STATE_COLORS: Record<string, string> = {
  active: 'text-green-400',
  unlock_pending: 'text-yellow-400',
  unlocked: 'text-yellow-300',
  emergency: 'text-orange-400',
};

const STATE_LABELS: Record<string, string> = {
  active: 'Blocking Active',
  unlock_pending: 'Unlock Pending',
  unlocked: 'Temporarily Unlocked',
  emergency: 'Emergency Access',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<{ date: string; total: number }[]>([]);
  const [health, setHealth] = useState<HealthState>({ status: 'active', issues: [] });
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  const load = async () => {
    const [s, st, d, h] = await Promise.all([
      api.get('/session'),
      api.get('/stats/summary'),
      api.get('/stats/daily?days=7'),
      api.get('/health'),
    ]);
    setSession(s.data);
    setStats(st.data);
    setDaily(d.data);
    setHealth(h.data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setStarting(true);
    try {
      await api.post('/session/start', {});
      await load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    setConfirmStop(false);
    try {
      await api.post('/session/stop');
      await load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to stop session');
    } finally {
      setStopping(false);
    }
  };

  const hasSession = !!session?.session;
  const state = session?.session?.state;
  const emergencyLeft = (session?.emergency_cap ?? 3) - (session?.emergency_used_this_week ?? 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <StatusBadge status={health.status} />
      </div>

      {health.issues.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
          <p className="text-yellow-300 font-semibold text-sm mb-1">Health Issues Detected</p>
          {health.issues.map((i, idx) => <p key={idx} className="text-yellow-400 text-xs">{i}</p>)}
        </div>
      )}

      {/* ── Main session card ── */}
      <div className={`rounded-2xl p-6 border ${hasSession ? 'bg-gray-900 border-gray-700' : 'bg-gray-900 border-gray-800'}`}>
        {!hasSession ? (
          /* ── No session: big START button ── */
          <div className="text-center py-4 space-y-4">
            <div className="text-5xl mb-2">🛡</div>
            <h2 className="text-xl font-bold text-white">Blocking is off</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Start a session to block social media across <strong className="text-gray-300">all your connected devices</strong> — phones, tablets, laptops, and computers simultaneously.
            </p>
            <button
              onClick={handleStart}
              disabled={starting}
              className="mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-base px-10 py-4 rounded-2xl transition-colors shadow-lg shadow-red-900/40"
            >
              {starting ? 'Starting...' : 'Start Blocking'}
            </button>
          </div>
        ) : (
          /* ── Active session ── */
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className={`text-lg font-bold ${STATE_COLORS[state!] ?? 'text-gray-400'}`}>
                  {STATE_LABELS[state!] ?? state}
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Started {new Date(session!.session!.started_at).toLocaleString()}
                </p>
              </div>
              {/* Pulsing dot when actively blocking */}
              {state === 'active' && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-red-400 font-medium mb-4">
              🔒 Locked — all {session?.session ? 'connected' : ''} devices are blocked. Blocklist &amp; schedule edits disabled.
            </p>

            {session!.wait_remaining_seconds > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl px-4 py-2 mb-4 text-sm text-yellow-400">
                Unlock wait: {Math.floor(session!.wait_remaining_seconds / 60)}m {session!.wait_remaining_seconds % 60}s remaining
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-3 mb-6">
              <Link
                to="/unlock"
                className="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-semibold px-4 py-3 rounded-xl text-center transition-colors"
              >
                🔓 Request Unlock
              </Link>
              <Link
                to="/emergency"
                className="flex-1 bg-orange-800 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-3 rounded-xl text-center transition-colors"
              >
                🆘 Emergency ({emergencyLeft} left)
              </Link>
            </div>

            {/* Stop session */}
            {!confirmStop ? (
              <button
                onClick={() => setConfirmStop(true)}
                className="w-full border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800 text-sm py-2 rounded-xl transition-colors"
              >
                Stop blocking session
              </button>
            ) : (
              <div className="bg-red-950/40 border border-red-900 rounded-xl p-4 space-y-3">
                <p className="text-sm text-red-300 font-semibold">Stop session and disable blocking on all devices?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl"
                  >
                    {stopping ? 'Stopping...' : 'Yes, stop blocking'}
                  </button>
                  <button
                    onClick={() => setConfirmStop(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Blocked Today', value: stats?.today ?? 0 },
          { label: 'Blocked This Week', value: stats?.week ?? 0 },
          { label: 'All Time', value: stats?.all_time ?? 0 },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-red-500">{card.value.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Blocked Requests (7 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daily}>
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {daily.map((_, i) => <Cell key={i} fill="#ef4444" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top blocked */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Top Blocked Domains (7 days)</h2>
        <div className="space-y-2">
          {stats?.top_domains.map((d, i) => (
            <div key={d.domain} className="flex items-center justify-between text-sm">
              <span className="text-gray-400"><span className="text-gray-600 mr-2">#{i + 1}</span>{d.domain}</span>
              <span className="text-red-400 font-mono">{d.count.toLocaleString()}</span>
            </div>
          ))}
          {!stats?.top_domains.length && <p className="text-gray-600 text-sm">No blocks recorded yet</p>}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function DashboardPage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<{ date: string; total: number }[]>([]);
  const [health, setHealth] = useState<HealthState>({ status: 'active', issues: [] });

  useEffect(() => {
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
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const stateColor = (state?: string) => {
    if (!state) return 'text-gray-500';
    if (state === 'active') return 'text-green-400';
    if (state === 'unlocked') return 'text-yellow-400';
    if (state === 'emergency') return 'text-orange-400';
    return 'text-gray-400';
  };

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

      {/* Session status */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Session Status</h2>
          {session?.session ? (
            <span className={`font-bold capitalize ${stateColor(session.session.state)}`}>
              {session.session.state.replace('_', ' ')}
            </span>
          ) : (
            <span className="text-gray-500">No active session</span>
          )}
        </div>
        {session?.session ? (
          <div className="text-sm text-gray-400 space-y-1">
            <p>Started: {new Date(session.session.started_at).toLocaleString()}</p>
            {session.session.locked && <p className="text-red-400 font-medium">Locked — edits disabled during session</p>}
            {session.wait_remaining_seconds > 0 && (
              <p className="text-yellow-400">Unlock wait: {Math.floor(session.wait_remaining_seconds / 60)}m {session.wait_remaining_seconds % 60}s remaining</p>
            )}
          </div>
        ) : (
          <Link to="/unlock" className="text-sm text-red-400 hover:text-red-300">Start a blocking session →</Link>
        )}
        <div className="mt-4 flex gap-3">
          <Link to="/unlock" className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-4 py-2 rounded-lg">Request Unlock</Link>
          <Link to="/emergency" className="bg-orange-700 hover:bg-orange-800 text-white text-sm px-4 py-2 rounded-lg">Emergency ({session?.emergency_cap ?? 3 - (session?.emergency_used_this_week ?? 0)} left)</Link>
        </div>
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

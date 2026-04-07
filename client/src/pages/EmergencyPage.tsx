import { useEffect, useState } from 'react';
import api from '../api/client';

const ESSENTIAL_DOMAINS = [
  'Google Meet / Zoom / FaceTime',
  'Google Maps / Apple Maps / Waze',
  'Banking apps (configured in Settings)',
  'Family communication apps (configured in Settings)',
];

export default function EmergencyPage() {
  const [used, setUsed] = useState(0);
  const [cap, setCap] = useState(3);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ expires_at: string; remaining_this_week: number } | null>(null);
  const [log, setLog] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/session').then(r => { setUsed(r.data.emergency_used_this_week); setCap(r.data.emergency_cap); }),
      api.get('/session/emergency-log').then(r => setLog(r.data)),
    ]);
  }, []);

  const handleEmergency = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/session/emergency', { reason, confirm });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Emergency failed');
    } finally { setLoading(false); }
  };

  const remaining = cap - used;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Emergency Access</h1>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${remaining > 0 ? 'bg-orange-700' : 'bg-red-900 text-red-300'}`}>
          {remaining} / {cap} this week
        </span>
      </div>

      <div className="bg-orange-950/40 border border-orange-800 rounded-2xl p-4 text-sm">
        <p className="text-orange-300 font-semibold mb-2">Emergency access is strictly limited</p>
        <ul className="text-orange-400 space-y-1 list-disc list-inside">
          <li>Capped at {cap} uses per week</li>
          <li>Only essential domains are unlocked (not social media)</li>
          <li>Expires automatically in 30 minutes</li>
          <li>All uses are permanently logged</li>
        </ul>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <p className="text-sm text-gray-400 font-semibold mb-2">Essential domains available:</p>
        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
          {ESSENTIAL_DOMAINS.map(d => <li key={d}>{d}</li>)}
        </ul>
      </div>

      {result ? (
        <div className="bg-gray-900 rounded-2xl p-6 border border-orange-700 space-y-2">
          <h2 className="font-semibold text-orange-400">Emergency Access Active</h2>
          <p className="text-sm text-gray-400">Expires: {new Date(result.expires_at).toLocaleTimeString()}</p>
          <p className="text-sm text-gray-500">{result.remaining_this_week} emergency uses remaining this week.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Reason for emergency access</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Describe the emergency..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Type <code className="text-orange-400">EMERGENCY</code> to confirm</label>
            <input
              type="text"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="EMERGENCY"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {remaining <= 0 ? (
            <div className="text-center text-red-400 text-sm font-semibold py-2">Emergency cap reached for this week</div>
          ) : (
            <button
              onClick={handleEmergency}
              disabled={loading || !reason || confirm !== 'EMERGENCY'}
              className="w-full bg-orange-700 hover:bg-orange-800 disabled:opacity-40 text-white font-semibold py-3 rounded-xl"
            >
              {loading ? 'Activating...' : 'Activate Emergency Access'}
            </button>
          )}
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Emergency Log</h2>
          <div className="space-y-2">
            {log.map((entry: any) => (
              <div key={entry.id} className="text-xs text-gray-500 border-b border-gray-800 pb-2">
                <span className="text-orange-400">{new Date(entry.used_at).toLocaleString()}</span> — {entry.reason}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

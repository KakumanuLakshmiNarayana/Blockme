import { useEffect, useState } from 'react';
import api from '../api/client';

interface Platform { id: number; name: string; category: string; enabled: number }
interface SessionInfo { session: { id: number; state: string } | null; wait_remaining_seconds: number }

type Step = 'select' | 'waiting' | 'phrase' | 'done';

export default function UnlockPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [unlockInfo, setUnlockInfo] = useState<{ unlocked_until: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/blocklist').then(r => setPlatforms(r.data.platforms.filter((p: Platform) => p.enabled))),
      api.get('/session').then(r => setSession(r.data)),
    ]);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (step !== 'waiting' || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { setStep('phrase'); clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step, countdown]);

  const handleRequest = async () => {
    if (!selectedPlatform) return;
    if (!session?.session) { setError('No active session. Start a session first.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/session/unlock-request', { platform_id: selectedPlatform.id });
      setWaitSeconds(res.data.wait_seconds);
      setPhrase(res.data.phrase);
      setCountdown(res.data.wait_seconds);
      setStep('waiting');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request unlock');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/session/unlock-confirm', { phrase_typed: typed });
      setUnlockInfo(res.data);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Wrong phrase');
      setTyped('');
    } finally { setLoading(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Unlock Request</h1>
      <p className="text-sm text-gray-500">Unlocks are per-platform, time-limited (15 min), and auto-relock. No global unlock exists.</p>

      {step === 'select' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <h2 className="font-semibold">Select platform to unlock</h2>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p)}
                className={`p-3 rounded-xl text-sm border transition-colors text-left ${
                  selectedPlatform?.id === p.id ? 'border-red-500 bg-red-900/30 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleRequest}
            disabled={!selectedPlatform || loading}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl"
          >
            {loading ? 'Requesting...' : `Request Unlock for ${selectedPlatform?.name || '...'}`}
          </button>
        </div>
      )}

      {step === 'waiting' && (
        <div className="bg-gray-900 rounded-2xl p-8 border border-yellow-800 text-center space-y-4">
          <div className="text-6xl font-mono font-bold text-yellow-400">{fmt(countdown)}</div>
          <p className="text-gray-400">Wait room. You must wait before unlocking.</p>
          <p className="text-xs text-gray-600">This is attempt escalation in action. The more you try to bypass, the longer the wait.</p>
          {countdown === 0 && (
            <button onClick={() => setStep('phrase')} className="bg-yellow-600 text-white px-6 py-2 rounded-xl">Continue</button>
          )}
        </div>
      )}

      {step === 'phrase' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <h2 className="font-semibold">Type the phrase exactly to continue</h2>
          <div className="bg-gray-800 rounded-xl p-4 font-mono text-sm text-yellow-300 select-all break-all">
            {phrase}
          </div>
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="Type the phrase above..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 font-mono text-sm"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={loading || !typed}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl"
          >
            {loading ? 'Confirming...' : 'Confirm Unlock'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-green-800 space-y-3">
          <h2 className="font-semibold text-green-400">Unlocked — 15 minutes</h2>
          <p className="text-sm text-gray-400">
            {selectedPlatform?.name} is unlocked until{' '}
            {unlockInfo ? new Date(unlockInfo.unlocked_until).toLocaleTimeString() : ''}.
            Other platforms remain blocked.
          </p>
          <p className="text-xs text-gray-600">Auto-relock will engage when the timer expires. No action needed.</p>
          <button onClick={() => { setStep('select'); setTyped(''); setSelectedPlatform(null); }} className="text-sm text-gray-400 hover:text-white">Request another unlock</button>
        </div>
      )}
    </div>
  );
}

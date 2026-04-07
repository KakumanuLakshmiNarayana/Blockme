import { useEffect, useState, FormEvent } from 'react';
import api from '../api/client';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);

  const load = async () => {
    const [s, sess] = await Promise.all([api.get('/settings'), api.get('/session')]);
    setSettings(s.data);
    setSession(sess.data);
  };

  useEffect(() => { load(); }, []);

  const saveSetting = async (key: string, value: string) => {
    try { await api.put('/settings', { [key]: value }); setMsg('Saved'); load(); setTimeout(() => setMsg(''), 2000); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setMsg('');
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    try {
      await api.put('/auth/password', { currentPassword: currentPwd, newPassword: newPwd });
      setMsg('Password changed'); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const clearStats = async () => {
    if (!confirm('Clear all statistics? This cannot be undone.')) return;
    try { await api.delete('/stats'); setMsg('Stats cleared'); } catch { setError('Failed'); }
  };

  const startSession = async () => {
    try { await api.post('/session/start', {}); setMsg('Session started'); load(); } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const stopSession = async () => {
    if (!confirm('Stop the current session? Blocking will disengage.')) return;
    try { await api.post('/session/stop'); setMsg('Session stopped'); load(); } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {msg && <div className="bg-green-900/30 border border-green-700 text-green-300 text-sm px-4 py-3 rounded-xl">{msg}</div>}
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl" onClick={() => setError('')}>{error}</div>}

      {/* Session control */}
      <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-3">
        <h2 className="font-semibold">Blocking Session</h2>
        <p className="text-sm text-gray-500">Sessions lock all settings. No edits allowed while a session is active.</p>
        <div className="flex gap-3">
          {session?.session ? (
            <button onClick={stopSession} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-5 py-2 rounded-xl">Stop Session</button>
          ) : (
            <button onClick={startSession} className="bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2 rounded-xl">Start Session</button>
          )}
        </div>
      </section>

      {/* Server settings */}
      <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
        <h2 className="font-semibold">Server</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Server IP (used in device configs)</label>
          <div className="flex gap-3">
            <input value={settings.server_ip || ''} onChange={e => setSettings(s => ({...s, server_ip: e.target.value}))} placeholder="e.g. 1.2.3.4" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
            <button onClick={() => saveSetting('server_ip', settings.server_ip || '')} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl">Save</button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Upstream DNS</label>
          <div className="flex gap-3">
            <input value={settings.upstream_dns || '8.8.8.8'} onChange={e => setSettings(s => ({...s, upstream_dns: e.target.value}))} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
            <button onClick={() => saveSetting('upstream_dns', settings.upstream_dns || '8.8.8.8')} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl">Save</button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Weekly Emergency Cap</label>
          <select value={settings.emergency_cap_weekly || '3'} onChange={e => saveSetting('emergency_cap_weekly', e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none">
            {[1, 2, 3, 5, 10].map(v => <option key={v} value={v}>{v} per week</option>)}
          </select>
        </div>
      </section>

      {/* Change password */}
      <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <h2 className="font-semibold mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Current password" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirm new password" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2 rounded-xl">Update Password</button>
        </form>
      </section>

      {/* Danger zone */}
      <section className="bg-gray-900 rounded-2xl p-5 border border-red-900/50 space-y-3">
        <h2 className="font-semibold text-red-400">Danger Zone</h2>
        <button onClick={clearStats} className="bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-300 text-sm px-5 py-2 rounded-xl">Clear All Statistics</button>
      </section>

      {/* Setup guide */}
      <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-sm space-y-3">
        <h2 className="font-semibold">Router DNS Setup (Home WiFi)</h2>
        <p className="text-gray-500">Optional: also set your router's DNS to <code className="text-white bg-gray-800 px-1 rounded">{settings.server_ip || 'SERVER_IP'}</code> for an extra layer of protection without VPN on home network.</p>
        <ol className="text-gray-500 list-decimal list-inside space-y-1">
          <li>Log into your router (usually 192.168.1.1)</li>
          <li>Find DHCP / DNS settings</li>
          <li>Set Primary DNS to <code className="text-white">{settings.server_ip || 'SERVER_IP'}</code></li>
          <li>Set Secondary DNS to 8.8.8.8</li>
          <li>Save and reboot</li>
        </ol>
      </section>
    </div>
  );
}

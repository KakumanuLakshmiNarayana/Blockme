import { useEffect, useState, FormEvent } from 'react';
import api from '../api/client';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const s = await api.get('/settings');
    setSettings(s.data);
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

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {msg && <div className="bg-green-900/30 border border-green-700 text-green-300 text-sm px-4 py-3 rounded-xl">{msg}</div>}
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl" onClick={() => setError('')}>{error}</div>}

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

      {/* Cross-device coverage */}
      <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-sm space-y-4">
        <h2 className="font-semibold">Cross-Device Coverage</h2>

        <div className="space-y-2">
          <p className="text-gray-400 font-medium">Method 1 — WireGuard VPN (phones, tablets, laptops)</p>
          <p className="text-gray-500">Add each device in the <strong className="text-gray-300">Devices</strong> tab. Once the WireGuard tunnel is active, blocking applies on <strong className="text-gray-300">all networks</strong> including 4G/5G.</p>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-2">
          <p className="text-gray-400 font-medium">Method 2 — Router DNS (smart TVs, consoles, all home devices)</p>
          <p className="text-gray-500">
            Point your router's DNS to <code className="text-white bg-gray-800 px-1 rounded">{settings.server_ip || 'YOUR_SERVER_IP'}</code> — every device on that network is blocked automatically, no app needed.
          </p>
          <ol className="text-gray-500 list-decimal list-inside space-y-1">
            <li>Log into your router (usually <code className="text-gray-300">192.168.1.1</code>)</li>
            <li>Find DHCP / DNS settings</li>
            <li>Set Primary DNS to <code className="text-white">{settings.server_ip || 'YOUR_SERVER_IP'}</code></li>
            <li>Set Secondary DNS to <code className="text-white">8.8.8.8</code></li>
            <li>Save and reboot the router</li>
          </ol>
          <p className="text-gray-600 text-xs">This covers: smart TVs, game consoles, tablets without WireGuard, guest devices — anything on your WiFi.</p>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-2">
          <p className="text-gray-400 font-medium">Method 3 — Individual device DNS (computers)</p>
          <p className="text-gray-500">Set DNS manually in network settings to <code className="text-white bg-gray-800 px-1 rounded">{settings.server_ip || 'YOUR_SERVER_IP'}</code> on any device for blocking without WireGuard.</p>
        </div>
      </section>
    </div>
  );
}

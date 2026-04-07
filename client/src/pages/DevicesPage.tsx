import { useEffect, useState } from 'react';
import api from '../api/client';

interface Device { id: number; name: string; public_key: string; vpn_ip: string; created_at: string; last_seen: string | null }

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [newDevice, setNewDevice] = useState<{ device: Device; config: string; qr: string } | null>(null);
  const [error, setError] = useState('');

  const load = () => api.get('/devices').then(r => setDevices(r.data));
  useEffect(() => { load(); }, []);

  const addDevice = async () => {
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/devices', { name: name.trim() });
      setNewDevice(res.data);
      setName('');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add device');
    } finally { setLoading(false); }
  };

  const removeDevice = async (id: number) => {
    try { await api.delete(`/devices/${id}`); load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const downloadConfig = (config: string, name: string) => {
    const blob = new Blob([config], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, '_')}.conf`;
    a.click();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Devices</h1>
      <p className="text-sm text-gray-500">Each device needs the WireGuard app installed. Scan the QR code or import the .conf file to connect.</p>

      {/* Setup instructions */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-sm space-y-2">
        <h2 className="font-semibold text-white">Setup Instructions</h2>
        <ol className="text-gray-400 space-y-1 list-decimal list-inside">
          <li>Install <strong className="text-white">WireGuard</strong> app (iOS App Store / Google Play / wireguard.com)</li>
          <li>Add a device below and scan the QR code with the WireGuard app</li>
          <li><strong className="text-white">iOS:</strong> Enable "On Demand" in WireGuard settings for always-on protection</li>
          <li><strong className="text-white">Android:</strong> Enable "Always-on VPN" in Android Settings → Network → VPN</li>
          <li><strong className="text-white">Desktop:</strong> Import the .conf file into WireGuard client</li>
        </ol>
      </div>

      {/* Add device */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-3">
        <h2 className="font-semibold">Add Device</h2>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDevice()}
            placeholder="Device name (e.g. iPhone, Work Laptop)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 text-sm"
          />
          <button onClick={addDevice} disabled={loading || !name.trim()} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-2 rounded-xl text-sm">
            {loading ? '...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* New device QR */}
      {newDevice && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-green-800 space-y-4">
          <h2 className="font-semibold text-green-400">Device added: {newDevice.device.name}</h2>
          <p className="text-sm text-gray-400">Scan this QR code with the WireGuard app. The private key is only shown once.</p>
          <div className="flex justify-center">
            <img src={newDevice.qr} alt="WireGuard QR Code" className="rounded-xl" style={{ maxWidth: 256 }} />
          </div>
          <button onClick={() => downloadConfig(newDevice.config, newDevice.device.name)} className="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-xl">
            Download .conf file
          </button>
          <button onClick={() => setNewDevice(null)} className="w-full text-gray-600 hover:text-white text-sm py-2">Dismiss</button>
        </div>
      )}

      {/* Device list */}
      <div className="space-y-3">
        {devices.map(d => (
          <div key={d.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{d.name}</p>
              <p className="text-xs text-gray-600 font-mono mt-1">{d.vpn_ip}</p>
              <p className="text-xs text-gray-700 mt-0.5">Added {new Date(d.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => removeDevice(d.id)} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
          </div>
        ))}
        {!devices.length && <p className="text-gray-600 text-sm">No devices added yet</p>}
      </div>
    </div>
  );
}

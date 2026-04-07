import { useEffect, useState } from 'react';
import api from '../api/client';

interface Platform { id: number; name: string; category: string; enabled: number }
interface Domain { id: number; platform_id: number | null; domain: string; is_custom: number; enabled: number }
interface UrlRule { id: number; platform_id: number; name: string; pattern: string; enabled: number }

const CATEGORIES = ['social', 'video', 'messaging', 'professional'];

export default function BlocklistPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [urlRules, setUrlRules] = useState<UrlRule[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [bl, sess] = await Promise.all([api.get('/blocklist'), api.get('/session')]);
    setPlatforms(bl.data.platforms);
    setDomains(bl.data.domains);
    setUrlRules(bl.data.url_rules);
    setLocked(!!sess.data.session?.locked);
  };

  useEffect(() => { load(); }, []);

  const togglePlatform = async (id: number, enabled: boolean) => {
    try { await api.patch(`/blocklist/platforms/${id}`, { enabled }); load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const toggleUrlRule = async (id: number, enabled: boolean) => {
    try { await api.patch(`/blocklist/url-rules/${id}`, { enabled }); load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    try { await api.post('/blocklist/domains', { domain: newDomain }); setNewDomain(''); load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const removeDomain = async (id: number) => {
    try { await api.delete(`/blocklist/domains/${id}`); load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Blocklist</h1>
        {locked && <span className="text-xs bg-red-900/50 text-red-300 border border-red-800 px-3 py-1 rounded-full">Session Locked — Unlock to edit</span>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {CATEGORIES.map(cat => {
        const catPlatforms = platforms.filter(p => p.category === cat);
        if (!catPlatforms.length) return null;
        return (
          <div key={cat} className="space-y-2">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{cat}</h2>
            {catPlatforms.map(p => (
              <div key={p.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="flex-1 text-left">
                    <span className="font-medium text-white">{p.name}</span>
                    <span className="ml-2 text-xs text-gray-600">{domains.filter(d => d.platform_id === p.id).length} domains</span>
                  </button>
                  <button
                    onClick={() => togglePlatform(p.id, !p.enabled)}
                    disabled={locked}
                    className={`relative w-12 h-6 rounded-full transition-colors ${p.enabled ? 'bg-red-600' : 'bg-gray-700'} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${p.enabled ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
                {expanded === p.id && (
                  <div className="px-5 pb-4 border-t border-gray-800 pt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {domains.filter(d => d.platform_id === p.id).map(d => (
                        <span key={d.id} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">{d.domain}</span>
                      ))}
                    </div>
                    {urlRules.filter(r => r.platform_id === p.id).map(rule => (
                      <div key={rule.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm text-white">{rule.name}</span>
                          <span className="ml-2 text-xs text-gray-600 font-mono">{rule.pattern}</span>
                        </div>
                        <button
                          onClick={() => toggleUrlRule(rule.id, !rule.enabled)}
                          disabled={locked}
                          className={`relative w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-red-600' : 'bg-gray-700'} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.enabled ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Custom domains */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
        <h2 className="font-semibold">Custom Domains</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDomain()}
            placeholder="example.com"
            disabled={locked}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 text-sm disabled:opacity-40"
          />
          <button onClick={addDomain} disabled={locked} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm">Add</button>
        </div>
        <div className="space-y-1">
          {domains.filter(d => d.is_custom).map(d => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-mono">{d.domain}</span>
              <button onClick={() => removeDomain(d.id)} disabled={locked} className="text-gray-600 hover:text-red-400 disabled:opacity-40 text-xs">Remove</button>
            </div>
          ))}
          {!domains.filter(d => d.is_custom).length && <p className="text-gray-600 text-xs">No custom domains added</p>}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../api/client';

interface Schedule { id: number; name: string; enabled: number; days_mask: number; start_time: string; end_time: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayPills(mask: number) {
  return DAYS.map((d, i) => (
    <span key={d} className={`text-xs px-2 py-0.5 rounded-full ${mask & (1 << i) ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-600'}`}>{d}</span>
  ));
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locked, setLocked] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [error, setError] = useState('');

  const load = async () => {
    const [s, sess] = await Promise.all([api.get('/schedules'), api.get('/session')]);
    setSchedules(s.data);
    setLocked(!!sess.data.session?.locked);
  };

  useEffect(() => { load(); }, []);

  const toggleDay = (i: number) => {
    setSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);
  };

  const daysMask = selectedDays.reduce((mask, d) => mask | (1 << d), 0);

  const createSchedule = async () => {
    if (!name || !selectedDays.length) { setError('Name and at least one day required'); return; }
    try {
      await api.post('/schedules', { name, days_mask: daysMask, start_time: startTime, end_time: endTime });
      setShowForm(false); setName(''); setSelectedDays([]); setError('');
      load();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  const deleteSchedule = async (id: number) => {
    try { await api.delete(`/schedules/${id}`); load(); }
    catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Schedules</h1>
        <div className="flex gap-3 items-center">
          {locked && <span className="text-xs bg-red-900/50 text-red-300 border border-red-800 px-3 py-1 rounded-full">Locked during session</span>}
          <button onClick={() => setShowForm(!showForm)} disabled={locked} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-xl">New Schedule</button>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {showForm && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <h2 className="font-semibold">New Schedule</h2>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Schedule name" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 text-sm" />
          <div>
            <p className="text-sm text-gray-400 mb-2">Days</p>
            <div className="flex gap-2">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selectedDays.includes(i) ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Start</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">End</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createSchedule} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white px-6 py-2 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {schedules.map(s => (
          <div key={s.id} className={`bg-gray-900 rounded-2xl p-5 border ${s.enabled ? 'border-gray-800' : 'border-gray-900 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="font-medium text-white">{s.name}</p>
                <div className="flex gap-1">{dayPills(s.days_mask)}</div>
                <p className="text-sm text-gray-500">{s.start_time} – {s.end_time} UTC</p>
              </div>
              <button onClick={() => deleteSchedule(s.id)} disabled={locked} className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40">Delete</button>
            </div>
          </div>
        ))}
        {!schedules.length && <p className="text-gray-600 text-sm">No schedules yet. Add one to auto-engage blocking at specific times.</p>}
      </div>
    </div>
  );
}

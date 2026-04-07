import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '🛡' },
  { to: '/blocklist', label: 'Blocklist', icon: '🚫' },
  { to: '/schedules', label: 'Schedules', icon: '🕐' },
  { to: '/devices', label: 'Devices', icon: '📱' },
  { to: '/unlock', label: 'Unlock', icon: '🔓' },
  { to: '/emergency', label: 'Emergency', icon: '🆘' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold text-red-500">Blockme</h1>
          <p className="text-xs text-gray-500 mt-1">No-turn-back blocker</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BlocklistPage from './pages/BlocklistPage';
import SchedulesPage from './pages/SchedulesPage';
import DevicesPage from './pages/DevicesPage';
import UnlockPage from './pages/UnlockPage';
import EmergencyPage from './pages/EmergencyPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/blocklist" element={<BlocklistPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/unlock" element={<UnlockPage />} />
              <Route path="/emergency" element={<EmergencyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

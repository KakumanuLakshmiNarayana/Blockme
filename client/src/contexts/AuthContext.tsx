import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('blockme_token');
    if (token) {
      api.get('/auth/status').then(r => setIsAuthenticated(r.data.authenticated)).catch(() => {});
    }
  }, []);

  const login = async (password: string) => {
    const res = await api.post('/auth/login', { password });
    localStorage.setItem('blockme_token', res.data.token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('blockme_token');
    setIsAuthenticated(false);
  };

  return <AuthContext.Provider value={{ isAuthenticated, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

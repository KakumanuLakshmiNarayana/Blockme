import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { initApi, login as apiLogin, resetApi } from '../api/client';

const TOKEN_KEY = 'blockme_jwt';
const SERVER_KEY = 'blockme_server_url';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string;
  login: (serverUrl: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  serverUrl: '',
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const [token, url] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(SERVER_KEY),
      ]);
      if (token && url) {
        await initApi(url, token);
        setServerUrl(url);
        setIsAuthenticated(true);
      }
    } catch {
      // Storage error — start fresh
    } finally {
      setIsLoading(false);
    }
  }

  async function login(url: string, password: string) {
    const token = await apiLogin(url, password);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(SERVER_KEY, url),
    ]);
    await initApi(url, token);
    setServerUrl(url);
    setIsAuthenticated(true);
  }

  async function logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(SERVER_KEY),
    ]);
    resetApi();
    setIsAuthenticated(false);
    setServerUrl('');
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, serverUrl, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import {create} from 'zustand';
import {storage, StorageKeys} from '../services/storage';
import {configureApiToken, resetApi} from '../services/api';
import type {VpnStatus} from '../services/vpn';

export interface Platform {
  id: number;
  name: string;
  category: string;
  enabled: number;
}

export interface SessionState {
  session: {id: number; state: string; locked: boolean; started_at: string} | null;
  wait_remaining_seconds: number;
  emergency_used_this_week: number;
  emergency_cap: number;
}

interface AppStore {
  // Auth
  token: string | null;
  serverUrl: string;
  isOnboarded: boolean;
  setToken: (token: string | null) => void;
  setServerUrl: (url: string) => void;
  setOnboarded: () => void;
  logout: () => void;

  // VPN
  vpnStatus: VpnStatus;
  setVpnStatus: (status: VpnStatus) => void;

  // Session
  sessionData: SessionState | null;
  setSessionData: (data: SessionState | null) => void;

  // Stats
  stats: {today: number; week: number; all_time: number} | null;
  setStats: (stats: {today: number; week: number; all_time: number}) => void;

  // Health
  healthStatus: string;
  setHealthStatus: (status: string) => void;

  // Unlock flow
  pendingUnlock: {waitSeconds: number; phrase: string; platformName: string} | null;
  setPendingUnlock: (data: {waitSeconds: number; phrase: string; platformName: string} | null) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  token: storage.getString(StorageKeys.TOKEN) ?? null,
  serverUrl: storage.getString(StorageKeys.SERVER_URL) ?? '',
  isOnboarded: storage.getBoolean(StorageKeys.ONBOARDED) ?? false,

  setToken: (token) => {
    if (token) {
      storage.set(StorageKeys.TOKEN, token);
    } else {
      storage.delete(StorageKeys.TOKEN);
    }
    set({token});
    configureApiToken(token ?? undefined);
  },

  setServerUrl: (url) => {
    storage.set(StorageKeys.SERVER_URL, url);
    resetApi(url);
    set({serverUrl: url});
  },

  setOnboarded: () => {
    storage.set(StorageKeys.ONBOARDED, true);
    set({isOnboarded: true});
  },

  logout: () => {
    storage.delete(StorageKeys.TOKEN);
    set({token: null, sessionData: null, stats: null});
    configureApiToken(undefined);
  },

  vpnStatus: 'disconnected',
  setVpnStatus: (vpnStatus) => set({vpnStatus}),

  sessionData: null,
  setSessionData: (sessionData) => set({sessionData}),

  stats: null,
  setStats: (stats) => set({stats}),

  healthStatus: 'active',
  setHealthStatus: (healthStatus) => set({healthStatus}),

  pendingUnlock: null,
  setPendingUnlock: (pendingUnlock) => set({pendingUnlock}),
}));

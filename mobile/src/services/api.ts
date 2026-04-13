import axios, {AxiosInstance} from 'axios';
import {storage} from './storage';

let instance: AxiosInstance | null = null;

export function getApi(): AxiosInstance {
  if (!instance) {
    const serverUrl = storage.getString('server_url') || 'http://localhost:3000';
    instance = axios.create({baseURL: `${serverUrl}/api`, timeout: 10000});
  }
  return instance;
}

export function resetApi(serverUrl: string): void {
  instance = axios.create({baseURL: `${serverUrl}/api`, timeout: 10000});
}

// Attach token automatically
export function configureApiToken(token: string | undefined): void {
  getApi().interceptors.request.clear?.();
  getApi().interceptors.request.use(config => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

// Auth
export const login = (password: string) =>
  getApi().post('/auth/login', {password});

// Session
export const getSession = () => getApi().get('/session');
export const startSession = () => getApi().post('/session/start', {});
export const stopSession = () => getApi().post('/session/stop');
export const requestUnlock = (platformId: number) =>
  getApi().post('/session/unlock-request', {platform_id: platformId});
export const confirmUnlock = (phraseTyped: string) =>
  getApi().post('/session/unlock-confirm', {phrase_typed: phraseTyped});
export const requestEmergency = (reason: string) =>
  getApi().post('/session/emergency', {reason, confirm: 'EMERGENCY'});
export const getUnlockLog = () => getApi().get('/session/unlock-log');
export const getEmergencyLog = () => getApi().get('/session/emergency-log');

// Stats
export const getStatsSummary = () => getApi().get('/stats/summary');
export const getDailyStats = (days = 7) =>
  getApi().get(`/stats/daily?days=${days}`);

// Blocklist
export const getBlocklist = () => getApi().get('/blocklist');
export const togglePlatform = (id: number, enabled: boolean) =>
  getApi().patch(`/blocklist/platforms/${id}`, {enabled});
export const addCustomDomain = (domain: string) =>
  getApi().post('/blocklist/domains', {domain});
export const removeCustomDomain = (id: number) =>
  getApi().delete(`/blocklist/domains/${id}`);
export const toggleUrlRule = (id: number, enabled: boolean) =>
  getApi().patch(`/blocklist/url-rules/${id}`, {enabled});

// Schedules
export const getSchedules = () => getApi().get('/schedules');
export const createSchedule = (data: object) =>
  getApi().post('/schedules', data);
export const deleteSchedule = (id: number) =>
  getApi().delete(`/schedules/${id}`);

// Settings
export const getSettings = () => getApi().get('/settings');
export const updateSettings = (data: object) =>
  getApi().put('/settings', data);
export const changePassword = (currentPassword: string, newPassword: string) =>
  getApi().put('/auth/password', {currentPassword, newPassword});

// Devices
export const getDevices = () => getApi().get('/devices');
export const addDevice = (name: string) =>
  getApi().post('/devices', {name});
export const removeDevice = (id: number) =>
  getApi().delete(`/devices/${id}`);

// Health
export const getHealth = () => getApi().get('/health');

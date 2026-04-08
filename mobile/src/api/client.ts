import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionStatus {
  session: {
    id: number;
    state: 'active' | 'unlock_pending' | 'unlocked' | 'emergency' | 'ended';
    started_at: string;
    ends_at: string | null;
    locked: number;
  } | null;
  wait_remaining_seconds: number;
  emergency_used_this_week: number;
}

export interface Platform {
  id: number;
  name: string;
  category: string;
  enabled: number;
  domains: Domain[];
  url_rules: UrlRule[];
}

export interface Domain {
  id: number;
  platform_id: number;
  domain: string;
  is_custom: number;
  enabled: number;
}

export interface UrlRule {
  id: number;
  platform_id: number;
  name: string;
  pattern: string;
  enabled: number;
}

export interface Device {
  id: number;
  name: string;
  public_key: string;
  vpn_ip: string;
  created_at: string;
  last_seen: string | null;
}

export interface DeviceCreated extends Device {
  config: string;
  qr: string; // base64 PNG
}

export interface Schedule {
  id: number;
  name: string;
  enabled: number;
  days_mask: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface StatsSummary {
  today: number;
  week: number;
  all_time: number;
}

export interface DailyStat {
  date: string;
  count: number;
}

export interface TopDomain {
  domain: string;
  count: number;
}

export interface HealthStatus {
  status: 'active' | 'degraded' | 'broken';
  issues: string[];
  last_check: string;
}

export interface Settings {
  server_ip: string;
  upstream_dns: string;
  emergency_cap_weekly: string;
  ntp_server: string;
  health_status: string;
  last_health_check: string;
  webhook_url?: string;
}

export interface UnlockRequestResponse {
  wait_seconds: number;
  phrase: string;
  attempt: number;
  platform: string;
}

export interface EmergencyLog {
  id: number;
  reason: string;
  used_at: string;
  expired_at: string;
  week_number: string;
}

export interface UnlockAttempt {
  id: number;
  platform_id: number | null;
  requested_at: string;
  wait_seconds: number;
  phrase_typed: string;
  confirmed_at: string | null;
  expires_at: string | null;
  relocked_at: string | null;
}

// ─── Axios instance factory ───────────────────────────────────────────────────

let _api: AxiosInstance | null = null;

export async function initApi(serverUrl: string, token: string): Promise<void> {
  _api = axios.create({ baseURL: serverUrl, timeout: 15000 });
  _api.interceptors.request.use((config) => {
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });
}

export async function createGuestApi(serverUrl: string): Promise<AxiosInstance> {
  return axios.create({ baseURL: serverUrl, timeout: 15000 });
}

function api(): AxiosInstance {
  if (!_api) throw new Error('API not initialized — please log in first');
  return _api;
}

export function resetApi(): void {
  _api = null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(serverUrl: string, password: string): Promise<string> {
  const instance = await createGuestApi(serverUrl);
  const res = await instance.post('/api/auth/login', { password });
  return res.data.token as string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionStatus> {
  const res = await api().get('/api/session');
  return res.data;
}

export async function startSession(ends_at?: string): Promise<void> {
  await api().post('/api/session/start', ends_at ? { ends_at } : {});
}

export async function stopSession(): Promise<void> {
  await api().post('/api/session/stop');
}

export async function requestUnlock(platform_id: number): Promise<UnlockRequestResponse> {
  const res = await api().post('/api/session/unlock-request', { platform_id });
  return res.data;
}

export async function confirmUnlock(typed_phrase: string): Promise<{ expires_at: string }> {
  const res = await api().post('/api/session/unlock-confirm', { typed_phrase });
  return res.data;
}

export async function requestEmergency(reason: string): Promise<{ expires_at: string }> {
  const res = await api().post('/api/session/emergency', { reason });
  return res.data;
}

export async function getEmergencyLog(): Promise<EmergencyLog[]> {
  const res = await api().get('/api/session/emergency-log');
  return res.data;
}

export async function getUnlockLog(): Promise<UnlockAttempt[]> {
  const res = await api().get('/api/session/unlock-log');
  return res.data;
}

// ─── Blocklist ────────────────────────────────────────────────────────────────

export async function getBlocklist(): Promise<Platform[]> {
  const res = await api().get('/api/blocklist');
  return res.data;
}

export async function togglePlatform(id: number, enabled: boolean): Promise<void> {
  await api().patch(`/api/blocklist/platforms/${id}`, { enabled: enabled ? 1 : 0 });
}

export async function toggleUrlRule(id: number, enabled: boolean): Promise<void> {
  await api().patch(`/api/blocklist/url-rules/${id}`, { enabled: enabled ? 1 : 0 });
}

export async function addCustomDomain(domain: string): Promise<void> {
  await api().post('/api/blocklist/domains', { domain });
}

export async function deleteCustomDomain(id: number): Promise<void> {
  await api().delete(`/api/blocklist/domains/${id}`);
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export async function getDevices(): Promise<Device[]> {
  const res = await api().get('/api/devices');
  return res.data;
}

export async function addDevice(name: string): Promise<DeviceCreated> {
  const res = await api().post('/api/devices', { name });
  return res.data;
}

export async function deleteDevice(id: number): Promise<void> {
  await api().delete(`/api/devices/${id}`);
}

export async function getDeviceQr(id: number): Promise<string> {
  const res = await api().get(`/api/devices/${id}/qr`);
  return res.data.qr;
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export async function getSchedules(): Promise<Schedule[]> {
  const res = await api().get('/api/schedules');
  return res.data;
}

export async function createSchedule(data: {
  name: string;
  days_mask: number;
  start_time: string;
  end_time: string;
}): Promise<void> {
  await api().post('/api/schedules', data);
}

export async function updateSchedule(id: number, data: Partial<Schedule>): Promise<void> {
  await api().put(`/api/schedules/${id}`, data);
}

export async function deleteSchedule(id: number): Promise<void> {
  await api().delete(`/api/schedules/${id}`);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStatsSummary(): Promise<StatsSummary> {
  const res = await api().get('/api/stats/summary');
  return res.data;
}

export async function getDailyStats(days = 7): Promise<DailyStat[]> {
  const res = await api().get(`/api/stats/daily?days=${days}`);
  return res.data;
}

export async function getTopDomains(): Promise<TopDomain[]> {
  const res = await api().get('/api/stats/domains');
  return res.data;
}

export async function clearStats(): Promise<void> {
  await api().delete('/api/stats');
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const res = await api().get('/api/settings');
  return res.data;
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  await api().put('/api/settings', data);
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await api().put('/api/settings/password', { current_password, new_password });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus> {
  const res = await api().get('/api/health');
  return res.data;
}

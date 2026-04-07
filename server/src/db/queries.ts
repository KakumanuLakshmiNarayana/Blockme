import { db } from './index';

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | undefined {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function getAdminHash(): string {
  const row = db.prepare(`SELECT password_hash FROM admin WHERE id = 1`).get() as { password_hash: string };
  return row.password_hash;
}

export function setAdminPassword(hash: string): void {
  db.prepare(`UPDATE admin SET password_hash = ? WHERE id = 1`).run(hash);
}

// ─── Platforms ────────────────────────────────────────────────────────────────

export interface Platform {
  id: number;
  name: string;
  category: string;
  enabled: number;
}

export function getPlatforms(): Platform[] {
  return db.prepare(`SELECT * FROM platforms ORDER BY category, name`).all() as Platform[];
}

export function togglePlatform(id: number, enabled: boolean): void {
  db.prepare(`UPDATE platforms SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

// ─── Domains ──────────────────────────────────────────────────────────────────

export interface Domain {
  id: number;
  platform_id: number | null;
  domain: string;
  is_custom: number;
  enabled: number;
}

export function getEnabledDomains(): string[] {
  const rows = db.prepare(`
    SELECT d.domain FROM domains d
    LEFT JOIN platforms p ON d.platform_id = p.id
    WHERE d.enabled = 1
      AND (d.platform_id IS NULL OR p.enabled = 1)
  `).all() as { domain: string }[];
  return rows.map(r => r.domain);
}

export function getAllDomains(): Domain[] {
  return db.prepare(`SELECT * FROM domains ORDER BY platform_id, domain`).all() as Domain[];
}

export function addCustomDomain(domain: string): void {
  db.prepare(`INSERT OR IGNORE INTO domains (domain, is_custom) VALUES (?, 1)`).run(domain);
}

export function toggleDomain(id: number, enabled: boolean): void {
  db.prepare(`UPDATE domains SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

export function removeCustomDomain(id: number): void {
  db.prepare(`DELETE FROM domains WHERE id = ? AND is_custom = 1`).run(id);
}

// ─── URL Rules ────────────────────────────────────────────────────────────────

export interface UrlRule {
  id: number;
  platform_id: number;
  name: string;
  pattern: string;
  enabled: number;
}

export function getUrlRules(): UrlRule[] {
  return db.prepare(`SELECT * FROM url_rules ORDER BY platform_id, name`).all() as UrlRule[];
}

export function getEnabledUrlRules(): UrlRule[] {
  return db.prepare(`
    SELECT ur.* FROM url_rules ur
    JOIN platforms p ON ur.platform_id = p.id
    WHERE ur.enabled = 1 AND p.enabled = 1
  `).all() as UrlRule[];
}

export function toggleUrlRule(id: number, enabled: boolean): void {
  db.prepare(`UPDATE url_rules SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export interface Device {
  id: number;
  name: string;
  public_key: string;
  vpn_ip: string;
  created_at: string;
  last_seen: string | null;
}

export function getDevices(): Device[] {
  return db.prepare(`SELECT * FROM devices ORDER BY created_at`).all() as Device[];
}

export function getDevice(id: number): Device | undefined {
  return db.prepare(`SELECT * FROM devices WHERE id = ?`).get(id) as Device | undefined;
}

export function addDevice(name: string, publicKey: string, vpnIp: string): Device {
  const result = db.prepare(`INSERT INTO devices (name, public_key, vpn_ip) VALUES (?, ?, ?)`).run(name, publicKey, vpnIp) as { lastInsertRowid: number };
  return getDevice(result.lastInsertRowid)!;
}

export function removeDevice(id: number): void {
  db.prepare(`DELETE FROM devices WHERE id = ?`).run(id);
}

export function getNextVpnIp(): string {
  const devices = db.prepare(`SELECT vpn_ip FROM devices ORDER BY vpn_ip`).all() as { vpn_ip: string }[];
  const usedLastOctets = new Set(devices.map(d => parseInt(d.vpn_ip.split('.')[3])));
  for (let i = 2; i <= 254; i++) {
    if (!usedLastOctets.has(i)) return `10.13.13.${i}`;
  }
  throw new Error('VPN IP pool exhausted');
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface Session {
  id: number;
  started_at: string;
  ends_at: string | null;
  state: string;
  locked: number;
  created_at: string;
}

export function getActiveSession(): Session | undefined {
  return db.prepare(`SELECT * FROM sessions WHERE state IN ('active','unlock_pending','unlocked','emergency') ORDER BY id DESC LIMIT 1`).get() as Session | undefined;
}

export function createSession(endsAt?: string): Session {
  const result = db.prepare(`INSERT INTO sessions (ends_at) VALUES (?)`).run(endsAt ?? null) as { lastInsertRowid: number };
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(result.lastInsertRowid) as Session;
}

export function updateSessionState(id: number, state: string): void {
  db.prepare(`UPDATE sessions SET state = ? WHERE id = ?`).run(state, id);
}

export function endSession(id: number): void {
  db.prepare(`UPDATE sessions SET state = 'ended', locked = 0 WHERE id = ?`).run(id);
}

// ─── Unlock Attempts ──────────────────────────────────────────────────────────

export interface UnlockAttempt {
  id: number;
  session_id: number;
  platform_id: number | null;
  requested_at: string;
  wait_seconds: number;
  phrase_typed: string;
  confirmed_at: string | null;
  expires_at: string | null;
  relocked_at: string | null;
}

export function getAttemptsToday(sessionId: number): number {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM unlock_attempts
    WHERE session_id = ? AND date(requested_at) = ? AND confirmed_at IS NOT NULL
  `).get(sessionId, today) as { cnt: number };
  return row.cnt;
}

export function createUnlockAttempt(sessionId: number, platformId: number | null, waitSeconds: number): UnlockAttempt {
  const result = db.prepare(`
    INSERT INTO unlock_attempts (session_id, platform_id, wait_seconds) VALUES (?, ?, ?)
  `).run(sessionId, platformId, waitSeconds) as { lastInsertRowid: number };
  return db.prepare(`SELECT * FROM unlock_attempts WHERE id = ?`).get(result.lastInsertRowid) as UnlockAttempt;
}

export function confirmUnlockAttempt(id: number, phraseTyped: string, expiresAt: string): void {
  db.prepare(`
    UPDATE unlock_attempts SET confirmed_at = datetime('now'), phrase_typed = ?, expires_at = ? WHERE id = ?
  `).run(phraseTyped, expiresAt, id);
}

export function relockAttempt(id: number): void {
  db.prepare(`UPDATE unlock_attempts SET relocked_at = datetime('now') WHERE id = ?`).run(id);
}

export function getUnlockLog(sessionId: number): UnlockAttempt[] {
  return db.prepare(`SELECT * FROM unlock_attempts WHERE session_id = ? ORDER BY requested_at DESC`).all(sessionId) as UnlockAttempt[];
}

// ─── Emergency Log ────────────────────────────────────────────────────────────

export interface EmergencyEntry {
  id: number;
  session_id: number;
  reason: string;
  used_at: string;
  expired_at: string;
  week_number: string;
}

function getWeekNumber(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getEmergencyUsedThisWeek(): number {
  const week = getWeekNumber();
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM emergency_log WHERE week_number = ?`).get(week) as { cnt: number };
  return row.cnt;
}

export function logEmergency(sessionId: number, reason: string): EmergencyEntry {
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const result = db.prepare(`
    INSERT INTO emergency_log (session_id, reason, expired_at, week_number) VALUES (?, ?, ?, ?)
  `).run(sessionId, reason, expiredAt, getWeekNumber()) as { lastInsertRowid: number };
  return db.prepare(`SELECT * FROM emergency_log WHERE id = ?`).get(result.lastInsertRowid) as EmergencyEntry;
}

export function getEmergencyLog(): EmergencyEntry[] {
  return db.prepare(`SELECT * FROM emergency_log ORDER BY used_at DESC LIMIT 50`).all() as EmergencyEntry[];
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export interface Schedule {
  id: number;
  name: string;
  enabled: number;
  days_mask: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export function getSchedules(): Schedule[] {
  return db.prepare(`SELECT * FROM schedules ORDER BY start_time`).all() as Schedule[];
}

export function getSchedule(id: number): Schedule | undefined {
  return db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as Schedule | undefined;
}

export function createSchedule(name: string, daysMask: number, startTime: string, endTime: string): Schedule {
  const result = db.prepare(`INSERT INTO schedules (name, days_mask, start_time, end_time) VALUES (?, ?, ?, ?)`).run(name, daysMask, startTime, endTime) as { lastInsertRowid: number };
  return getSchedule(result.lastInsertRowid)!;
}

export function updateSchedule(id: number, name: string, daysMask: number, startTime: string, endTime: string, enabled: boolean): void {
  db.prepare(`UPDATE schedules SET name=?, days_mask=?, start_time=?, end_time=?, enabled=? WHERE id=?`).run(name, daysMask, startTime, endTime, enabled ? 1 : 0, id);
}

export function deleteSchedule(id: number): void {
  db.prepare(`DELETE FROM schedules WHERE id = ?`).run(id);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function recordBlock(domain: string): void {
  const today = new Date().toISOString().split('T')[0];
  db.transaction(() => {
    db.prepare(`
      INSERT INTO stats_daily (date, domain, count) VALUES (?, ?, 1)
      ON CONFLICT(date, domain) DO UPDATE SET count = count + 1
    `).run(today, domain);
    db.prepare(`
      INSERT INTO stats_totals (domain, count, last_blocked) VALUES (?, 1, datetime('now'))
      ON CONFLICT(domain) DO UPDATE SET count = count + 1, last_blocked = datetime('now')
    `).run(domain);
  })();
}

export function getTopBlocked(limit: number, days?: number): { domain: string; count: number }[] {
  if (days) {
    return db.prepare(`
      SELECT domain, SUM(count) as count FROM stats_daily
      WHERE date >= date('now', ? || ' days')
      GROUP BY domain ORDER BY count DESC LIMIT ?
    `).all(`-${days}`, limit) as { domain: string; count: number }[];
  }
  return db.prepare(`SELECT domain, count FROM stats_totals ORDER BY count DESC LIMIT ?`).all(limit) as { domain: string; count: number }[];
}

export function getDailyStats(days: number): { date: string; total: number }[] {
  return db.prepare(`
    SELECT date, SUM(count) as total FROM stats_daily
    WHERE date >= date('now', ? || ' days')
    GROUP BY date ORDER BY date ASC
  `).all(`-${days}`) as { date: string; total: number }[];
}

export function getTodayTotal(): number {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`SELECT SUM(count) as total FROM stats_daily WHERE date = ?`).get(today) as { total: number | null };
  return row.total ?? 0;
}

export function getAllTimeTotal(): number {
  const row = db.prepare(`SELECT SUM(count) as total FROM stats_totals`).get() as { total: number | null };
  return row.total ?? 0;
}

export function clearStats(): void {
  db.transaction(() => {
    db.prepare(`DELETE FROM stats_daily`).run();
    db.prepare(`DELETE FROM stats_totals`).run();
  })();
}

// ─── Health Log ───────────────────────────────────────────────────────────────

export function logHealth(status: string, detail?: string): void {
  db.prepare(`INSERT INTO health_log (status, detail) VALUES (?, ?)`).run(status, detail ?? null);
  setSetting('health_status', status);
  setSetting('last_health_check', new Date().toISOString());
}

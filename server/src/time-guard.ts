import ntpClient from 'ntp-client';
import { getSetting, setSetting, logHealth } from './db/queries';

const TAMPER_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
let lastNtpTime: number | null = null;
let lastNtpFetch: number = 0;

export async function getNtpTime(): Promise<Date> {
  return new Promise((resolve, reject) => {
    const ntpServer = getSetting('ntp_server') || 'pool.ntp.org';
    ntpClient.getNetworkTime(ntpServer, 123, (err: Error | null, date: Date) => {
      if (err) reject(err);
      else resolve(date);
    });
  });
}

export async function checkForClockTamper(): Promise<boolean> {
  try {
    const ntpDate = await getNtpTime();
    const ntpMs = ntpDate.getTime();
    const systemMs = Date.now();
    const drift = systemMs - ntpMs;

    lastNtpTime = ntpMs;
    lastNtpFetch = Date.now();

    if (Math.abs(drift) > TAMPER_THRESHOLD_MS) {
      console.error(`[time-guard] Clock tamper detected! System: ${systemMs}, NTP: ${ntpMs}, drift: ${drift}ms`);
      setSetting('blocking_enabled', '1');
      logHealth('degraded', `Clock tamper detected: drift ${Math.round(drift / 1000)}s`);
      return true;
    }
    return false;
  } catch (err) {
    // NTP unreachable — don't flag as tamper, just log
    console.warn('[time-guard] NTP check failed:', err);
    return false;
  }
}

/**
 * Get current time verified against NTP cache.
 * Falls back to system time if NTP was checked recently.
 */
export function getVerifiedNow(): Date {
  if (lastNtpTime && Date.now() - lastNtpFetch < 20 * 60 * 1000) {
    const elapsed = Date.now() - lastNtpFetch;
    return new Date(lastNtpTime + elapsed);
  }
  return new Date();
}

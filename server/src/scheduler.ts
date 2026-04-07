import { getSchedules } from './db/queries';
import { getVerifiedNow } from './time-guard';

/**
 * Returns true if any enabled schedule currently dictates blocking.
 * Uses NTP-verified time to prevent clock-manipulation bypass.
 */
export function isScheduleCurrentlyBlocking(): boolean {
  const schedules = getSchedules();
  const now = getVerifiedNow();

  // Day: 0=Sun,1=Mon,...,6=Sat — matches days_mask bit positions
  const dayBit = 1 << now.getUTCDay();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    if (!(schedule.days_mask & dayBit)) continue;
    if (currentTime >= schedule.start_time && currentTime < schedule.end_time) {
      return true;
    }
  }
  return false;
}

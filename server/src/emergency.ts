import { getSetting } from './db/queries';

/**
 * Essential domains always available during emergency.
 * Does NOT include any entertainment or social media.
 */
export const ESSENTIAL_DOMAINS: string[] = [
  // VoIP / Video calls
  'meet.google.com',
  'zoom.us',
  'us04web.zoom.us',
  'facetime.apple.com',
  // Maps
  'maps.google.com',
  'maps.apple.com',
  'waze.com',
  // Banking (generic — user configures specific in settings)
  // Family communication whitelisted via settings
];

export function getEmergencyCapWeekly(): number {
  return parseInt(getSetting('emergency_cap_weekly') || '3');
}

export const EMERGENCY_DURATION_SECONDS = 30 * 60; // 30 minutes

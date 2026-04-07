const RANDOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomString(length: number): string {
  return Array.from({ length }, () => RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)]).join('');
}

/**
 * Returns wait time (seconds) and friction phrase based on how many times
 * the user has already unlocked today (escalating difficulty).
 */
export function getFrictionForAttempt(
  attemptNumberToday: number,
  platformName: string,
): { waitSeconds: number; phrase: string } {
  switch (attemptNumberToday) {
    case 0:
      return {
        waitSeconds: 10 * 60, // 10 min
        phrase: `I am choosing to unlock ${platformName}`,
      };
    case 1:
      return {
        waitSeconds: 20 * 60, // 20 min
        phrase: `I am breaking my commitment. This is attempt 2 today.`,
      };
    case 2:
      return {
        waitSeconds: 40 * 60, // 40 min
        phrase: `I have no self-control right now. I am unlocking ${platformName} for the third time today.`,
      };
    default:
      return {
        waitSeconds: 60 * 60, // 60 min
        phrase: randomString(50), // Pure friction — meaningless string to type
      };
  }
}

/** How long a successful unlock lasts before auto-relock */
export const UNLOCK_DURATION_SECONDS = 15 * 60; // 15 minutes

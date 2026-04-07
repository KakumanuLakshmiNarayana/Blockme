import { getActiveSession, updateSessionState, endSession, createSession } from './db/queries';

/**
 * Session states:
 * active         — blocking fully engaged, no edits allowed
 * unlock_pending — user requested unlock, in wait room
 * unlocked       — timed unlock active (auto-relock scheduled)
 * emergency      — emergency access active (essential apps only)
 * ended          — session over
 */

let relockTimer: ReturnType<typeof setTimeout> | null = null;

export function getSessionState(): { session: ReturnType<typeof getActiveSession>; isLocked: boolean } {
  const session = getActiveSession();
  return {
    session,
    isLocked: !!session && session.locked === 1,
  };
}

export function startNewSession(endsAt?: string): ReturnType<typeof createSession> {
  const existing = getActiveSession();
  if (existing) endSession(existing.id);
  return createSession(endsAt);
}

export function activateTimedUnlock(sessionId: number, durationSeconds: number): void {
  // Clear any existing relock timer
  if (relockTimer) clearTimeout(relockTimer);

  updateSessionState(sessionId, 'unlocked');

  relockTimer = setTimeout(() => {
    const session = getActiveSession();
    if (session && session.id === sessionId && session.state === 'unlocked') {
      updateSessionState(sessionId, 'active');
      console.log(`[session] Auto-relocked session ${sessionId}`);
    }
    relockTimer = null;
  }, durationSeconds * 1000);
}

export function activateEmergency(sessionId: number, durationSeconds: number): void {
  if (relockTimer) clearTimeout(relockTimer);
  updateSessionState(sessionId, 'emergency');

  relockTimer = setTimeout(() => {
    const session = getActiveSession();
    if (session && session.id === sessionId && session.state === 'emergency') {
      updateSessionState(sessionId, 'active');
      console.log(`[session] Emergency auto-relocked session ${sessionId}`);
    }
    relockTimer = null;
  }, durationSeconds * 1000);
}

/** Restore timers after server restart */
export function restoreSessionTimers(): void {
  const session = getActiveSession();
  if (!session) return;

  if (session.state === 'unlock_pending') {
    // Abandoned mid-wait — revert to active
    updateSessionState(session.id, 'active');
  } else if (session.state === 'unlocked' || session.state === 'emergency') {
    // Revert to active immediately on restart (conservative)
    updateSessionState(session.id, 'active');
    console.log(`[session] Reverted session ${session.id} to active after restart`);
  }
}

export function stopSession(): void {
  if (relockTimer) { clearTimeout(relockTimer); relockTimer = null; }
  const session = getActiveSession();
  if (session) endSession(session.id);
}

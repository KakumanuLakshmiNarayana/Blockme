import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import {
  getActiveSession, createUnlockAttempt, confirmUnlockAttempt,
  getAttemptsToday, updateSessionState, getUnlockLog,
  getEmergencyUsedThisWeek, logEmergency, getEmergencyLog,
  getPlatforms,
} from '../db/queries';
import {
  startNewSession, stopSession, getSessionState,
  activateTimedUnlock, activateEmergency,
} from '../session-manager';
import { getFrictionForAttempt, UNLOCK_DURATION_SECONDS } from '../friction';
import { getEmergencyCapWeekly, EMERGENCY_DURATION_SECONDS } from '../emergency';
import { refreshBlockSet } from '../blocklist';

export const sessionRouter = Router();

// Pending unlock attempts stored in memory (wait room timers)
const pendingUnlocks: Map<number, { attemptId: number; phrase: string; readyAt: number; platformId: number | null }> = new Map();

sessionRouter.get('/', (req: Request, res: Response) => {
  const session = getActiveSession();
  if (!session) { res.json({ session: null }); return; }

  const pending = session.id ? pendingUnlocks.get(session.id) : null;
  const waitRemaining = pending ? Math.max(0, Math.ceil((pending.readyAt - Date.now()) / 1000)) : 0;

  res.json({
    session: {
      id: session.id,
      state: session.state,
      locked: session.locked === 1,
      started_at: session.started_at,
      ends_at: session.ends_at,
    },
    wait_remaining_seconds: waitRemaining,
    emergency_used_this_week: getEmergencyUsedThisWeek(),
    emergency_cap: getEmergencyCapWeekly(),
  });
});

sessionRouter.post('/start', requireAuth, (req: Request, res: Response) => {
  const existing = getActiveSession();
  if (existing) { res.status(409).json({ error: 'Session already active' }); return; }

  const { ends_at } = req.body;
  const session = startNewSession(ends_at);
  refreshBlockSet();
  res.status(201).json({ session });
});

sessionRouter.post('/stop', requireAuth, (req: Request, res: Response) => {
  const session = getActiveSession();
  if (!session) { res.status(404).json({ error: 'No active session' }); return; }

  stopSession();
  pendingUnlocks.delete(session.id);
  res.json({ ok: true });
});

/**
 * Step 1 of unlock flow: request unlock for a specific platform.
 * Returns wait time and friction phrase. Client must poll /session
 * to know when wait_remaining_seconds = 0, then call /unlock-confirm.
 */
sessionRouter.post('/unlock-request', requireAuth, (req: Request, res: Response) => {
  const session = getActiveSession();
  if (!session) { res.status(404).json({ error: 'No active session' }); return; }
  if (session.state !== 'active') { res.status(409).json({ error: `Cannot request unlock in state: ${session.state}` }); return; }

  const { platform_id } = req.body;

  // Get platform name for the phrase
  const platforms = getPlatforms();
  const platform = platforms.find(p => p.id === platform_id);
  const platformName = platform?.name || 'this app';

  const attemptsToday = getAttemptsToday(session.id);
  const { waitSeconds, phrase } = getFrictionForAttempt(attemptsToday, platformName);

  const attempt = createUnlockAttempt(session.id, platform_id ?? null, waitSeconds);
  updateSessionState(session.id, 'unlock_pending');

  pendingUnlocks.set(session.id, {
    attemptId: attempt.id,
    phrase,
    readyAt: Date.now() + waitSeconds * 1000,
    platformId: platform_id ?? null,
  });

  res.json({
    attempt_id: attempt.id,
    wait_seconds: waitSeconds,
    phrase,
    platform: platformName,
  });
});

/**
 * Step 2: confirm unlock by typing the phrase exactly.
 * Only works after wait time has elapsed.
 */
sessionRouter.post('/unlock-confirm', requireAuth, (req: Request, res: Response) => {
  const session = getActiveSession();
  if (!session) { res.status(404).json({ error: 'No active session' }); return; }
  if (session.state !== 'unlock_pending') { res.status(409).json({ error: 'No pending unlock' }); return; }

  const { phrase_typed } = req.body;
  const pending = pendingUnlocks.get(session.id);
  if (!pending) { res.status(409).json({ error: 'No pending unlock found' }); return; }

  // Check wait time elapsed
  if (Date.now() < pending.readyAt) {
    const remaining = Math.ceil((pending.readyAt - Date.now()) / 1000);
    res.status(425).json({ error: 'Wait time not elapsed', wait_remaining_seconds: remaining });
    return;
  }

  // Validate phrase (exact match, trimmed)
  if (phrase_typed?.trim() !== pending.phrase) {
    res.status(422).json({ error: 'Phrase does not match. Try again.' });
    return;
  }

  const expiresAt = new Date(Date.now() + UNLOCK_DURATION_SECONDS * 1000).toISOString();
  confirmUnlockAttempt(pending.attemptId, phrase_typed.trim(), expiresAt);
  pendingUnlocks.delete(session.id);

  activateTimedUnlock(session.id, UNLOCK_DURATION_SECONDS);

  res.json({
    ok: true,
    unlocked_until: expiresAt,
    duration_seconds: UNLOCK_DURATION_SECONDS,
    platform_id: pending.platformId,
  });
});

/**
 * Emergency unlock — essential apps only, capped weekly.
 */
sessionRouter.post('/emergency', requireAuth, (req: Request, res: Response) => {
  const session = getActiveSession();
  if (!session) { res.status(404).json({ error: 'No active session' }); return; }

  const cap = getEmergencyCapWeekly();
  const used = getEmergencyUsedThisWeek();
  if (used >= cap) {
    res.status(403).json({ error: `Emergency cap reached (${cap} per week)`, used, cap });
    return;
  }

  const { reason, confirm } = req.body;
  if (confirm !== 'EMERGENCY') {
    res.status(422).json({ error: 'Must confirm with text "EMERGENCY"' });
    return;
  }
  if (!reason) { res.status(400).json({ error: 'Reason required' }); return; }

  const entry = logEmergency(session.id, reason);
  activateEmergency(session.id, EMERGENCY_DURATION_SECONDS);

  res.json({
    ok: true,
    expires_at: entry.expired_at,
    duration_seconds: EMERGENCY_DURATION_SECONDS,
    remaining_this_week: cap - used - 1,
  });
});

sessionRouter.get('/unlock-log', requireAuth, (req: Request, res: Response) => {
  const session = getActiveSession();
  if (!session) { res.json([]); return; }
  res.json(getUnlockLog(session.id));
});

sessionRouter.get('/emergency-log', requireAuth, (req: Request, res: Response) => {
  res.json(getEmergencyLog());
});

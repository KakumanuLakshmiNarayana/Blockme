import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import { getActiveSession, getSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule } from '../db/queries';

export const schedulesRouter = Router();

function checkNotLocked(res: Response): boolean {
  const session = getActiveSession();
  if (session && session.locked) {
    res.status(423).json({ error: 'Cannot edit schedules during an active locked session.' });
    return true;
  }
  return false;
}

schedulesRouter.get('/', (req: Request, res: Response) => {
  res.json(getSchedules());
});

schedulesRouter.post('/', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  const { name, days_mask, start_time, end_time } = req.body;
  if (!name || days_mask === undefined || !start_time || !end_time) {
    res.status(400).json({ error: 'name, days_mask, start_time, end_time required' });
    return;
  }
  if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
    res.status(400).json({ error: 'Times must be HH:MM format' });
    return;
  }
  const schedule = createSchedule(name, parseInt(days_mask), start_time, end_time);
  res.status(201).json(schedule);
});

schedulesRouter.put('/:id', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  const schedule = getSchedule(parseInt(req.params.id));
  if (!schedule) { res.status(404).json({ error: 'Schedule not found' }); return; }

  const { name, days_mask, start_time, end_time, enabled } = req.body;
  updateSchedule(
    schedule.id,
    name ?? schedule.name,
    days_mask !== undefined ? parseInt(days_mask) : schedule.days_mask,
    start_time ?? schedule.start_time,
    end_time ?? schedule.end_time,
    enabled !== undefined ? !!enabled : schedule.enabled === 1,
  );
  res.json({ ok: true });
});

schedulesRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  deleteSchedule(parseInt(req.params.id));
  res.json({ ok: true });
});

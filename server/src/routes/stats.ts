import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import { getTopBlocked, getDailyStats, getTodayTotal, getAllTimeTotal, clearStats } from '../db/queries';

export const statsRouter = Router();

statsRouter.get('/summary', (req: Request, res: Response) => {
  const daily = getDailyStats(7);
  const weekTotal = daily.reduce((s, d) => s + d.total, 0);
  res.json({
    today: getTodayTotal(),
    week: weekTotal,
    all_time: getAllTimeTotal(),
    top_domains: getTopBlocked(5, 7),
  });
});

statsRouter.get('/daily', (req: Request, res: Response) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 7));
  res.json(getDailyStats(days));
});

statsRouter.get('/domains', (req: Request, res: Response) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const days = req.query.days ? parseInt(req.query.days as string) : undefined;
  res.json(getTopBlocked(limit, days));
});

statsRouter.delete('/', requireAuth, (req: Request, res: Response) => {
  clearStats();
  res.json({ ok: true });
});

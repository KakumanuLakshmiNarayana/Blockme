import { Router, Request, Response } from 'express';
import { getSetting } from '../db/queries';
import { runHealthCheck_exposed } from '../health-monitor';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const { status, issues } = await runHealthCheck_exposed();
  const lastCheck = getSetting('last_health_check');
  res.json({ status, issues, last_check: lastCheck });
});

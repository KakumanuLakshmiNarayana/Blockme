import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import { getActiveSession } from '../db/queries';
import {
  getPlatforms, togglePlatform,
  getAllDomains, addCustomDomain, toggleDomain, removeCustomDomain,
  getUrlRules, toggleUrlRule,
} from '../db/queries';
import { refreshBlockSet } from '../blocklist';

export const blocklistRouter = Router();

function checkNotLocked(res: Response): boolean {
  const session = getActiveSession();
  if (session && session.locked) {
    res.status(423).json({ error: 'Session is active and locked. Use the unlock flow to make changes.' });
    return true;
  }
  return false;
}

blocklistRouter.get('/', (req: Request, res: Response) => {
  res.json({
    platforms: getPlatforms(),
    domains: getAllDomains(),
    url_rules: getUrlRules(),
  });
});

blocklistRouter.patch('/platforms/:id', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  const { enabled } = req.body;
  togglePlatform(parseInt(req.params.id), !!enabled);
  refreshBlockSet();
  res.json({ ok: true });
});

blocklistRouter.post('/domains', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  const { domain } = req.body;
  if (!domain?.trim()) { res.status(400).json({ error: 'Domain required' }); return; }
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  addCustomDomain(clean);
  refreshBlockSet();
  res.status(201).json({ ok: true });
});

blocklistRouter.patch('/domains/:id', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  const { enabled } = req.body;
  toggleDomain(parseInt(req.params.id), !!enabled);
  refreshBlockSet();
  res.json({ ok: true });
});

blocklistRouter.delete('/domains/:id', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  removeCustomDomain(parseInt(req.params.id));
  refreshBlockSet();
  res.json({ ok: true });
});

blocklistRouter.patch('/url-rules/:id', requireAuth, (req: Request, res: Response) => {
  if (checkNotLocked(res)) return;
  const { enabled } = req.body;
  toggleUrlRule(parseInt(req.params.id), !!enabled);
  res.json({ ok: true });
});

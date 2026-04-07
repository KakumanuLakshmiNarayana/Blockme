import { Router, Request, Response } from 'express';
import { requireAuth } from './auth';
import { getAllSettings, setSetting } from '../db/queries';
import { refreshBlockSet } from '../blocklist';

export const settingsRouter = Router();

const PUBLIC_KEYS = ['blocking_enabled', 'upstream_dns', 'protection_enabled', 'server_ip',
  'emergency_cap_weekly', 'ntp_server', 'health_status', 'last_health_check', 'webhook_url'];

settingsRouter.get('/', (req: Request, res: Response) => {
  const all = getAllSettings();
  const pub: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) {
    if (all[key] !== undefined) pub[key] = all[key];
  }
  res.json(pub);
});

settingsRouter.put('/', requireAuth, (req: Request, res: Response) => {
  const allowed = ['blocking_enabled', 'upstream_dns', 'protection_enabled', 'server_ip',
    'emergency_cap_weekly', 'ntp_server', 'webhook_url'];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      setSetting(key, String(req.body[key]));
    }
  }

  if (req.body.blocking_enabled !== undefined) {
    refreshBlockSet();
  }

  res.json({ ok: true });
});

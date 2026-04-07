import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getAdminHash, setAdminPassword } from '../db/queries';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'blockme-secret-change-in-production';
const TOKEN_TTL = '24h';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

export function requireAuth(req: Request, res: Response, next: Function): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) { res.status(400).json({ error: 'Password required' }); return; }

  const hash = getAdminHash();
  const valid = await bcrypt.compare(password, hash);
  if (!valid) { res.status(401).json({ error: 'Invalid password' }); return; }

  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token });
});

authRouter.get('/status', (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.json({ authenticated: false }); return; }
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

authRouter.put('/password', requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: 'Both passwords required' }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }

  const hash = getAdminHash();
  const valid = await bcrypt.compare(currentPassword, hash);
  if (!valid) { res.status(401).json({ error: 'Current password incorrect' }); return; }

  const newHash = await bcrypt.hash(newPassword, 12);
  setAdminPassword(newHash);
  res.json({ ok: true });
});

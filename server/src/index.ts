import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { runMigrations } from './db/schema';
import { refreshBlockSet } from './blocklist';
import { startDnsServer } from './dns-server';
import { restoreSessionTimers } from './session-manager';
import { startHealthMonitor } from './health-monitor';
import { checkForClockTamper } from './time-guard';

import { authRouter } from './routes/auth';
import { sessionRouter } from './routes/session';
import { devicesRouter } from './routes/devices';
import { blocklistRouter } from './routes/blocklist';
import { schedulesRouter } from './routes/schedules';
import { statsRouter } from './routes/stats';
import { healthRouter } from './routes/health';
import { settingsRouter } from './routes/settings';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/session', sessionRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/blocklist', blocklistRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/health', healthRouter);
app.use('/api/settings', settingsRouter);

// Serve React dashboard in production
const clientBuild = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuild, 'index.html'));
  }
});

async function main(): Promise<void> {
  // 1. Database
  runMigrations();
  console.log('[db] Migrations complete');

  // 2. Block set cache
  refreshBlockSet();
  console.log('[blocklist] Block set loaded');

  // 3. Restore session state (restart-safe)
  restoreSessionTimers();
  console.log('[session] Session state restored');

  // 4. DNS server
  try {
    await startDnsServer();
  } catch (err) {
    console.error('[dns] Failed to start DNS server (need root for port 53):', (err as Error).message);
    console.warn('[dns] Running in API-only mode without DNS blocking');
  }

  // 5. Initial NTP clock check
  await checkForClockTamper().catch(() => {});

  // 6. Health monitor
  startHealthMonitor();

  // 7. HTTP server
  app.listen(PORT, () => {
    console.log(`[api] Blockme server running on http://0.0.0.0:${PORT}`);
    console.log(`[api] Dashboard: http://0.0.0.0:${PORT}`);
    console.log(`[api] Default password: blockme (change immediately in Settings)`);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

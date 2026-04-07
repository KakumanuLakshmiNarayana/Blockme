import cron from 'node-cron';
import net from 'net';
import { logHealth, getSetting } from './db/queries';
import { isDnsRunning } from './dns-server';
import { isWireGuardUp } from './wireguard';
import { getBlockSet } from './blocklist';
import { checkForClockTamper } from './time-guard';
import { db } from './db/index';

export function startHealthMonitor(): void {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await runHealthCheck();
  });

  // Also run immediately at startup
  setTimeout(() => runHealthCheck(), 5000);
}

async function runHealthCheck(): Promise<void> {
  const issues: string[] = [];

  // 1. DNS server running
  if (!isDnsRunning()) {
    issues.push('DNS server not running');
  }

  // 2. WireGuard interface up
  if (!isWireGuardUp()) {
    issues.push('WireGuard interface wg0 is down');
  }

  // 3. Block set non-empty
  if (getBlockSet().size === 0) {
    issues.push('Block set is empty');
  }

  // 4. Database writable
  try {
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('_health_ping', ?)`).run(Date.now().toString());
  } catch (err) {
    issues.push('Database write failed');
  }

  // 5. Clock tamper check (every 15 min via NTP)
  try {
    await checkForClockTamper();
  } catch {}

  const status = issues.length === 0 ? 'active' : issues.length <= 2 ? 'degraded' : 'broken';
  const detail = issues.length > 0 ? issues.join('; ') : undefined;

  logHealth(status, detail);

  if (status !== 'active') {
    console.warn(`[health] Status: ${status} — ${detail}`);
    notifyWebhook(status, detail);
  } else {
    console.log(`[health] Status: active`);
  }
}

async function notifyWebhook(status: string, detail?: string): Promise<void> {
  const webhookUrl = getSetting('webhook_url');
  if (!webhookUrl) return;

  try {
    const { default: fetch } = await import('node-fetch' as any);
    await (fetch as any)(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, detail, timestamp: new Date().toISOString() }),
    });
  } catch {
    // Webhook failure is non-critical
  }
}

export async function runHealthCheck_exposed(): Promise<{ status: string; issues: string[] }> {
  const issues: string[] = [];
  if (!isDnsRunning()) issues.push('DNS server not running');
  if (!isWireGuardUp()) issues.push('WireGuard interface down');
  if (getBlockSet().size === 0) issues.push('Block set empty');
  const status = issues.length === 0 ? 'active' : issues.length <= 2 ? 'degraded' : 'broken';
  return { status, issues };
}

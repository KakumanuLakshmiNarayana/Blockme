import { db } from './index';
import bcrypt from 'bcrypt';

export function runMigrations(): void {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS admin (
      id            INTEGER PRIMARY KEY,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL,
      category TEXT NOT NULL,
      enabled  INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS domains (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER REFERENCES platforms(id),
      domain      TEXT NOT NULL UNIQUE,
      is_custom   INTEGER NOT NULL DEFAULT 0,
      enabled     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS url_rules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER REFERENCES platforms(id),
      name        TEXT NOT NULL,
      pattern     TEXT NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS devices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      public_key TEXT NOT NULL UNIQUE,
      vpn_ip     TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen  TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ends_at    TEXT,
      state      TEXT NOT NULL DEFAULT 'active',
      locked     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unlock_attempts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   INTEGER REFERENCES sessions(id),
      platform_id  INTEGER REFERENCES platforms(id),
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      wait_seconds INTEGER NOT NULL,
      phrase_typed TEXT NOT NULL DEFAULT '',
      confirmed_at TEXT,
      expires_at   TEXT,
      relocked_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS emergency_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER REFERENCES sessions(id),
      reason      TEXT NOT NULL,
      used_at     TEXT NOT NULL DEFAULT (datetime('now')),
      expired_at  TEXT NOT NULL,
      week_number TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      enabled    INTEGER NOT NULL DEFAULT 1,
      days_mask  INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stats_daily (
      date   TEXT NOT NULL,
      domain TEXT NOT NULL,
      count  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, domain)
    );

    CREATE TABLE IF NOT EXISTS stats_totals (
      domain       TEXT PRIMARY KEY,
      count        INTEGER NOT NULL DEFAULT 0,
      last_blocked TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      status     TEXT NOT NULL,
      detail     TEXT,
      checked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_stats_daily_date ON stats_daily(date);
    CREATE INDEX IF NOT EXISTS idx_domains_enabled ON domains(enabled);
    CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);
  `);

  // Seed default settings
  const seedSettings = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  const seedAll = db.transaction(() => {
    seedSettings.run('blocking_enabled', '1');
    seedSettings.run('upstream_dns', '8.8.8.8');
    seedSettings.run('protection_enabled', '1');
    seedSettings.run('server_ip', '');
    seedSettings.run('wg_server_private_key', '');
    seedSettings.run('wg_server_public_key', '');
    seedSettings.run('emergency_cap_weekly', '3');
    seedSettings.run('ntp_server', 'pool.ntp.org');
    seedSettings.run('health_status', 'active');
    seedSettings.run('last_health_check', new Date().toISOString());
    seedSettings.run('webhook_url', '');
  });
  seedAll();

  // Seed admin with default password 'blockme'
  const adminExists = db.prepare(`SELECT id FROM admin WHERE id = 1`).get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('blockme', 12);
    db.prepare(`INSERT INTO admin (id, password_hash) VALUES (1, ?)`).run(hash);
  }

  // Seed platforms
  const platformExists = db.prepare(`SELECT id FROM platforms LIMIT 1`).get();
  if (!platformExists) {
    seedPlatforms();
  }
}

function seedPlatforms(): void {
  const insertPlatform = db.prepare(`INSERT INTO platforms (name, category) VALUES (?, ?)`);
  const insertDomain = db.prepare(`INSERT OR IGNORE INTO domains (platform_id, domain) VALUES (?, ?)`);
  const insertUrlRule = db.prepare(`INSERT INTO url_rules (platform_id, name, pattern) VALUES (?, ?, ?)`);

  const platforms: { name: string; category: string; domains: string[]; rules?: { name: string; pattern: string }[] }[] = [
    {
      name: 'Twitter/X', category: 'social',
      domains: ['twitter.com', 'x.com', 't.co', 'twimg.com', 'abs.twimg.com', 'pbs.twimg.com', 'video.twimg.com', 'api.twitter.com', 'mobile.twitter.com'],
    },
    {
      name: 'Instagram', category: 'social',
      domains: ['instagram.com', 'www.instagram.com', 'cdninstagram.com', 'i.instagram.com', 'scontent.cdninstagram.com'],
    },
    {
      name: 'Facebook', category: 'social',
      domains: ['facebook.com', 'www.facebook.com', 'fb.com', 'fbcdn.net', 'messenger.com', 'connect.facebook.net', 'graph.facebook.com', 'staticxx.facebook.com'],
    },
    {
      name: 'TikTok', category: 'video',
      domains: ['tiktok.com', 'www.tiktok.com', 'musical.ly', 'tiktokcdn.com', 'tiktokv.com', 'snssdk.com', 'tiktokcdn-us.com'],
    },
    {
      name: 'YouTube', category: 'video',
      domains: ['youtube.com', 'www.youtube.com', 'youtu.be', 'ytimg.com', 'googlevideo.com', 'yt3.ggpht.com', 'youtube-nocookie.com', 'youtubei.googleapis.com'],
      rules: [
        { name: 'YouTube Shorts', pattern: '*youtube.com/shorts*' },
        { name: 'YouTube Reels', pattern: '*youtube.com/reels*' },
      ],
    },
    {
      name: 'Reddit', category: 'social',
      domains: ['reddit.com', 'www.reddit.com', 'redd.it', 'redditstatic.com', 'redditmedia.com', 'old.reddit.com', 'new.reddit.com'],
      rules: [
        { name: 'Reddit Live', pattern: '*reddit.com/live*' },
      ],
    },
    {
      name: 'Snapchat', category: 'messaging',
      domains: ['snapchat.com', 'www.snapchat.com', 'sc-cdn.net', 'snap.com', 'snapkit.com'],
    },
    {
      name: 'Discord', category: 'messaging',
      domains: ['discord.com', 'discordapp.com', 'discord.gg', 'discordapp.net', 'discord.media', 'discordcdn.com'],
    },
    {
      name: 'LinkedIn', category: 'professional',
      domains: ['linkedin.com', 'www.linkedin.com', 'licdn.com', 'lnkd.in'],
    },
    {
      name: 'Pinterest', category: 'social',
      domains: ['pinterest.com', 'www.pinterest.com', 'pinimg.com', 'pin.it'],
    },
    {
      name: 'Twitch', category: 'video',
      domains: ['twitch.tv', 'www.twitch.tv', 'twitchapps.com', 'jtvnw.net', 'twitchsvc.net', 'twitchstatic.com'],
    },
    {
      name: 'Threads', category: 'social',
      domains: ['threads.net', 'www.threads.net'],
    },
    {
      name: 'WhatsApp', category: 'messaging',
      domains: ['whatsapp.com', 'www.whatsapp.com', 'whatsapp.net', 'wa.me'],
    },
    {
      name: 'Telegram', category: 'messaging',
      domains: ['telegram.org', 'telegram.me', 't.me', 'core.telegram.org'],
    },
    {
      name: 'Bluesky', category: 'social',
      domains: ['bsky.app', 'bsky.social', 'bsky.network'],
    },
    {
      name: 'BeReal', category: 'social',
      domains: ['bereal.com', 'www.bereal.com'],
    },
    {
      name: 'Tumblr', category: 'social',
      domains: ['tumblr.com', 'www.tumblr.com', 'assets.tumblr.com'],
    },
    {
      name: 'VK', category: 'social',
      domains: ['vk.com', 'vkontakte.ru', 'vk.me'],
    },
  ];

  const seed = db.transaction(() => {
    for (const p of platforms) {
      const result = insertPlatform.run(p.name, p.category) as { lastInsertRowid: number };
      const platformId = result.lastInsertRowid;
      for (const domain of p.domains) {
        insertDomain.run(platformId, domain);
      }
      if (p.rules) {
        for (const rule of p.rules) {
          insertUrlRule.run(platformId, rule.name, rule.pattern);
        }
      }
    }
  });
  seed();
}

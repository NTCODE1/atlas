-- Atlas D1 schema — social-media follower tracking (the "Social" tab).
--
-- Server-owned, cron-driven data — NOT a synced domain. The Worker's daily
-- cron trigger (see src/index.ts's `scheduled` handler + src/social.ts) pulls
-- follower / engagement counts from the Instagram Graph API and the TikTok
-- Display API and writes one row per account per UTC day. The PWA only ever
-- READS this (GET /api/social); the same ownership model as health_days /
-- workout_days, not the last-write-wins client-push model in src/sync.ts.

-- One connected account per row. This table — not any config var — is the
-- source of truth for "which accounts the Social tab shows": a row appears
-- when you POST /api/social/connect with that account's OAuth token(s), and
-- the daily cron keeps the token fresh from then on. See docs/social-setup.md.
CREATE TABLE social_accounts (
  account TEXT PRIMARY KEY,       -- stable local key, e.g. 'ig:primary', 'ig:alt', 'tiktok:main'
  platform TEXT NOT NULL,         -- 'instagram' | 'tiktok'
  label TEXT NOT NULL,            -- card title, e.g. "@niila.photo"
  username TEXT,                  -- handle as last reported by the platform API
  external_id TEXT,               -- instagram user_id / tiktok open_id
  access_token TEXT NOT NULL,
  refresh_token TEXT,             -- tiktok only (instagram long-lived tokens self-refresh)
  token_expires_at INTEGER,       -- epoch ms; when access_token stops working
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_sync_at INTEGER,           -- epoch ms of the last successful stats fetch
  last_error TEXT,                -- last sync failure message, or null when the last run was clean
  updated_at INTEGER NOT NULL
);

-- One follower / engagement snapshot per account per UTC day. `followers` is
-- the headline number; the rest are best-effort and null when a platform or
-- token scope doesn't expose them (e.g. `likes` is TikTok-only).
CREATE TABLE social_stats (
  date TEXT NOT NULL,            -- YYYY-MM-DD, UTC (matches index.ts's todayKey())
  account TEXT NOT NULL,
  followers INTEGER,
  following INTEGER,
  posts INTEGER,                 -- media_count (Instagram) / video_count (TikTok)
  likes INTEGER,                 -- lifetime likes across all videos (TikTok); null for Instagram
  fetched_at INTEGER NOT NULL,   -- epoch ms
  PRIMARY KEY (date, account)
);
CREATE INDEX idx_social_stats_account ON social_stats(account, date);

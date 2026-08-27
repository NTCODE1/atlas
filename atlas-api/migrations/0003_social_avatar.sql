-- Store each connected account's profile picture URL, refreshed on every sync
-- (see src/social.ts). It's a time-limited signed CDN URL from Instagram/TikTok,
-- so it's only good until roughly the next daily sync — the frontend falls back
-- to a platform icon if the image fails to load.
ALTER TABLE social_accounts ADD COLUMN avatar_url TEXT;

/**
 * Social-media follower tracking for the Atlas "Social" tab.
 *
 * Server-owned and cron-driven (unlike src/sync.ts's client-pushed domains):
 * once a day the Worker's `scheduled` handler calls syncAllAccounts(), which
 * for every row in `social_accounts` refreshes the stored OAuth token if it's
 * near expiry, pulls the current follower / engagement numbers from the
 * platform's official API, and upserts one `social_stats` row for today
 * (UTC). The PWA reads the accumulated history via GET /api/social and never
 * writes here — writes happen only through POST /api/social/connect (seed a
 * token, once) and the daily cron.
 *
 * APIs used — both free, both need a one-time OAuth the account owner does by
 * hand (see docs/social-setup.md):
 *
 *   Instagram — "Instagram API with Instagram Login" (graph.instagram.com).
 *     Needs a Business or Creator account. You hand it a long-lived user token
 *     (valid 60 days); this module re-exchanges it on every run once it's
 *     within ~10 days of expiry, so it never actually expires as long as the
 *     cron keeps running. The refresh needs no app secret.
 *
 *   TikTok — Display API (open.tiktokapis.com). The access token lasts only
 *     24h, so this module refreshes it every run using the (rotating) refresh
 *     token plus the app's client key/secret — the TIKTOK_CLIENT_KEY /
 *     TIKTOK_CLIENT_SECRET Worker secrets.
 */

import { cutoffDateISO, todayUTC } from "./sync.ts";

export interface SocialEnv {
  DB: D1Database;
  /** TikTok Display API app credentials — only needed if a TikTok account is connected. */
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
}

export type SocialPlatform = "instagram" | "tiktok";

interface AccountRow {
  account: string;
  platform: SocialPlatform;
  label: string;
  username: string | null;
  external_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: number | null;
  sort_order: number;
  last_sync_at: number | null;
  last_error: string | null;
}

/** One platform read — every field null when that platform doesn't expose it. */
interface StatsSample {
  followers: number | null;
  following: number | null;
  posts: number | null;
  likes: number | null;
  username: string | null;
  externalId: string | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

// --- Instagram ------------------------------------------------------------

const IG_BASE = "https://graph.instagram.com";
/** Re-exchange the long-lived token once it's within this window of expiring. */
const IG_REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/** Returns a possibly-refreshed token + its new expiry, or the existing one if it's still fresh. */
async function ensureInstagramToken(
  row: AccountRow,
): Promise<{ token: string; expiresAt: number | null }> {
  const now = Date.now();
  const expiresAt = row.token_expires_at ?? 0;
  if (expiresAt - now > IG_REFRESH_WINDOW_MS) {
    return { token: row.access_token, expiresAt: row.token_expires_at };
  }
  const url =
    `${IG_BASE}/refresh_access_token?grant_type=ig_refresh_token` +
    `&access_token=${encodeURIComponent(row.access_token)}`;
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) throw new Error(`Instagram token refresh ${res.status}: ${body.slice(0, 200)}`);
  const json = JSON.parse(body) as { access_token: string; expires_in?: number };
  return { token: json.access_token, expiresAt: now + (json.expires_in ?? 5_184_000) * 1000 };
}

async function fetchInstagram(token: string, externalId: string | null): Promise<StatsSample> {
  const fields = "user_id,username,followers_count,follows_count,media_count";
  const res = await fetch(`${IG_BASE}/v23.0/me?fields=${fields}&access_token=${encodeURIComponent(token)}`);
  const body = await res.text();
  if (!res.ok) throw new Error(`Instagram /me ${res.status}: ${body.slice(0, 200)}`);
  const j = JSON.parse(body) as {
    user_id?: string;
    username?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
  };
  return {
    followers: num(j.followers_count),
    following: num(j.follows_count),
    posts: num(j.media_count),
    likes: null,
    username: str(j.username),
    externalId: str(j.user_id) ?? externalId,
  };
}

// --- TikTok --------------------------------------------------------------

const TT_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_USER_URL = "https://open.tiktokapis.com/v2/user/info/";

async function refreshTiktokToken(
  env: SocialEnv,
  row: AccountRow,
): Promise<{ token: string; refresh: string; expiresAt: number }> {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) {
    throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET secrets are not set");
  }
  if (!row.refresh_token) {
    throw new Error("no TikTok refresh token stored — re-run POST /api/social/connect");
  }
  const res = await fetch(TT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });
  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !j.access_token) {
    throw new Error(`TikTok token refresh: ${j.error ?? res.status} ${j.error_description ?? ""}`.trim());
  }
  return {
    token: j.access_token,
    refresh: j.refresh_token ?? row.refresh_token,
    expiresAt: Date.now() + (j.expires_in ?? 86_400) * 1000,
  };
}

async function fetchTiktok(token: string): Promise<StatsSample> {
  const fields = "open_id,display_name,follower_count,following_count,likes_count,video_count";
  const res = await fetch(`${TT_USER_URL}?fields=${fields}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = (await res.json()) as {
    data?: { user?: Record<string, unknown> };
    error?: { code?: string; message?: string };
  };
  if (!res.ok || !j.data?.user) {
    throw new Error(`TikTok user/info: ${j.error?.code ?? res.status} ${j.error?.message ?? ""}`.trim());
  }
  const u = j.data.user;
  return {
    followers: num(u.follower_count),
    following: num(u.following_count),
    posts: num(u.video_count),
    likes: num(u.likes_count),
    username: str(u.display_name),
    externalId: str(u.open_id),
  };
}

// --- Sync ---------------------------------------------------------------

export interface AccountSyncResult {
  account: string;
  ok: boolean;
  error?: string;
}

async function syncAccount(env: SocialEnv, row: AccountRow): Promise<AccountSyncResult> {
  try {
    let token = row.access_token;
    let refresh = row.refresh_token;
    let expiresAt = row.token_expires_at;

    if (row.platform === "instagram") {
      const r = await ensureInstagramToken(row);
      token = r.token;
      expiresAt = r.expiresAt;
    } else {
      const r = await refreshTiktokToken(env, row);
      token = r.token;
      refresh = r.refresh;
      expiresAt = r.expiresAt;
    }

    const sample =
      row.platform === "instagram" ? await fetchInstagram(token, row.external_id) : await fetchTiktok(token);

    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO social_stats (date, account, followers, following, posts, likes, fetched_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(date, account) DO UPDATE SET followers = excluded.followers, " +
          "following = excluded.following, posts = excluded.posts, likes = excluded.likes, " +
          "fetched_at = excluded.fetched_at",
      ).bind(todayUTC(), row.account, sample.followers, sample.following, sample.posts, sample.likes, now),
      env.DB.prepare(
        "UPDATE social_accounts SET access_token = ?, refresh_token = ?, token_expires_at = ?, " +
          "username = COALESCE(?, username), external_id = COALESCE(?, external_id), " +
          "last_sync_at = ?, last_error = NULL, updated_at = ? WHERE account = ?",
      ).bind(token, refresh, expiresAt, sample.username, sample.externalId, now, now, row.account),
    ]);
    return { account: row.account, ok: true };
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err).slice(0, 300);
    await env.DB.prepare("UPDATE social_accounts SET last_error = ?, updated_at = ? WHERE account = ?")
      .bind(msg, Date.now(), row.account)
      .run();
    return { account: row.account, ok: false, error: msg };
  }
}

/** Sync every connected account. Per-account failures are isolated (one bad token never blocks the others). */
export async function syncAllAccounts(
  env: SocialEnv,
): Promise<{ synced: number; failed: number; results: AccountSyncResult[] }> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM social_accounts ORDER BY sort_order, account",
  ).all<AccountRow>();
  const out: AccountSyncResult[] = [];
  for (const row of results) out.push(await syncAccount(env, row));
  return { synced: out.filter((r) => r.ok).length, failed: out.filter((r) => !r.ok).length, results: out };
}

// --- Read (for GET /api/social) ---------------------------------------

export interface SocialPoint {
  date: string;
  followers: number | null;
  following: number | null;
  posts: number | null;
  likes: number | null;
}

export interface SocialAccountHistory {
  account: string;
  platform: SocialPlatform;
  label: string;
  username: string | null;
  lastSyncAt: number | null;
  lastError: string | null;
  points: SocialPoint[];
}

export async function readSocialHistory(
  env: SocialEnv,
  days: number,
): Promise<{ accounts: SocialAccountHistory[] }> {
  const clamped = Math.max(1, Math.min(Math.round(days) || 90, 400));
  const cutoff = cutoffDateISO(todayUTC(), clamped);

  const accounts = await env.DB.prepare(
    "SELECT * FROM social_accounts ORDER BY sort_order, account",
  ).all<AccountRow>();
  const stats = await env.DB.prepare(
    "SELECT date, account, followers, following, posts, likes FROM social_stats " +
      "WHERE date >= ? ORDER BY date",
  )
    .bind(cutoff)
    .all<SocialPoint & { account: string }>();

  const byAccount = new Map<string, SocialPoint[]>();
  for (const s of stats.results) {
    const list = byAccount.get(s.account) ?? [];
    list.push({ date: s.date, followers: s.followers, following: s.following, posts: s.posts, likes: s.likes });
    byAccount.set(s.account, list);
  }

  return {
    accounts: accounts.results.map((a) => ({
      account: a.account,
      platform: a.platform,
      label: a.label,
      username: a.username,
      lastSyncAt: a.last_sync_at,
      lastError: a.last_error,
      points: byAccount.get(a.account) ?? [],
    })),
  };
}

// --- Connect (for POST /api/social/connect) --------------------------

export type ConnectResult = { ok: true; account: string } | { ok: false; error: string };

/**
 * Seed or replace one account's stored OAuth credentials. Called once per
 * account during setup (see docs/social-setup.md); the daily cron keeps the
 * token fresh afterwards, so this is not re-run on a normal cadence.
 */
export async function connectAccount(env: SocialEnv, body: Record<string, unknown>): Promise<ConnectResult> {
  const account = typeof body.account === "string" ? body.account.trim() : "";
  const platform = body.platform === "instagram" || body.platform === "tiktok" ? body.platform : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken =
    typeof body.refreshToken === "string" && body.refreshToken.trim() ? body.refreshToken.trim() : null;
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;

  if (!account || !platform || !label || !accessToken) {
    return { ok: false, error: "account, platform ('instagram'|'tiktok'), label and accessToken are all required" };
  }
  if (platform === "tiktok" && !refreshToken) {
    return { ok: false, error: "refreshToken is required for TikTok accounts" };
  }

  // If the caller knows the token's lifetime, honour it; otherwise assume a
  // freshly minted token (Instagram long-lived ≈ 60d, TikTok access = 24h).
  const lifetimeSec =
    typeof body.expiresInSeconds === "number" && body.expiresInSeconds > 0
      ? body.expiresInSeconds
      : platform === "instagram"
        ? 55 * 24 * 60 * 60
        : 24 * 60 * 60;
  const now = Date.now();

  await env.DB.prepare(
    "INSERT INTO social_accounts (account, platform, label, access_token, refresh_token, " +
      "token_expires_at, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(account) DO UPDATE SET platform = excluded.platform, label = excluded.label, " +
      "access_token = excluded.access_token, refresh_token = excluded.refresh_token, " +
      "token_expires_at = excluded.token_expires_at, sort_order = excluded.sort_order, " +
      "last_error = NULL, updated_at = excluded.updated_at",
  )
    .bind(account, platform, label, accessToken, refreshToken, now + lifetimeSec * 1000, sortOrder, now)
    .run();

  return { ok: true, account };
}

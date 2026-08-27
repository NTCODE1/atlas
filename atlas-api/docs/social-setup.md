# Social tab — connecting Instagram & TikTok

The **Social** tab tracks follower growth for your own Instagram and TikTok
accounts. Both platforms have **free official APIs**; the only cost is a
one-time OAuth per account, done by hand with the steps below. After that the
Worker's daily cron (`05:20 UTC`, see `wrangler.toml [triggers]`) pulls fresh
numbers into D1 and keeps the OAuth tokens alive on its own.

**What gets tracked:** followers, following, post count, and (TikTok only)
lifetime likes — one snapshot per account per day.

**Where the tokens live:** the `social_accounts` table in `atlas-db` (same
database as the rest of Apex). They're read-only profile-stats tokens.

You'll need, from the main Apex setup:

- your Worker URL — `https://<your-worker>.workers.dev`
- your `API_SECRET` (the **write** key, the one Health Auto Export uses)

Pick a stable `account` key per account — used as the DB primary key and never
shown in the UI. Suggested: `ig:primary`, `ig:secondary`, `tiktok:main`.

---

## 0. Apply the migration & deploy

```bash
cd atlas-api
npx wrangler d1 migrations apply atlas-db --remote   # creates social_accounts + social_stats
npx wrangler deploy                                  # ships the routes + registers the cron
```

---

## 1. Instagram (×2 accounts)

Uses **Instagram API with Instagram Login** (`graph.instagram.com`). No Facebook
Page needed — just a Business/Creator account. One Meta app covers both of your
IG accounts.

### 1a. One-time app setup

1. **Switch each IG account to Business or Creator** (free): Instagram app →
   *Settings → Account type and tools → Switch to professional account*.
2. Go to <https://developers.facebook.com/apps> → **Create app** → when asked
   for a use case pick **Other** → app type **Business** → create.
3. In the app dashboard: **Add product → Instagram → "API setup with Instagram
   login"**.
4. Under **"3. Set up Instagram business login" → Business login settings**:
   - **OAuth redirect URI:** add `https://atlas16474859-nt24358.netlify.app/`
     (any HTTPS URL you control — it only needs to receive the `?code=` once).
   - Save.
5. On the same page note the **Instagram app ID** and **Instagram app secret**.
6. Under **"2. Generate access tokens" → add account**, add each IG account as a
   tester, then accept the invite inside Instagram
   (*Settings → Apps and websites → Tester invites*).

### 1b. Get a long-lived token — repeat per account

Replace `IG_APP_ID`, `IG_APP_SECRET`, and keep `REDIRECT` exactly as registered.

**i. Get an authorization `code`.** Open this in a browser logged in as the IG
account, and click Allow:

```
https://www.instagram.com/oauth/authorize?client_id=IG_APP_ID&redirect_uri=https://atlas16474859-nt24358.netlify.app/&response_type=code&scope=instagram_business_basic
```

You land on `https://atlas16474859-nt24358.netlify.app/?code=AQD...#_`.
Copy the `code` value — **drop the trailing `#_`**.

**ii. Code → short-lived token (1 hour):**

```bash
curl -X POST https://api.instagram.com/oauth/access_token \
  -F client_id=IG_APP_ID \
  -F client_secret=IG_APP_SECRET \
  -F grant_type=authorization_code \
  -F redirect_uri=https://atlas16474859-nt24358.netlify.app/ \
  -F code=PASTE_CODE_HERE
# -> {"access_token":"IGAA...","user_id":178...,"permissions":[...]}
```

**iii. Short-lived → long-lived token (60 days):**

```bash
curl -s "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=IG_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
# -> {"access_token":"IGAA...","token_type":"bearer","expires_in":5183944}
```

**iv. Hand the long-lived token to the Worker:**

```bash
curl -X POST https://<your-worker>.workers.dev/api/social/connect \
  -H "x-api-key: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "ig:primary",
    "platform": "instagram",
    "label": "@your.handle",
    "accessToken": "IGAA...long-lived...",
    "expiresInSeconds": 5183944,
    "sortOrder": 1
  }'
# -> {"ok":true,"account":"ig:primary"}
```

Repeat 1b for the second account with `"account": "ig:secondary"` and
`"sortOrder": 2`.

> The Worker re-exchanges each IG token automatically once it's within ~10 days
> of expiring, so it never lapses as long as the cron keeps running. No app
> secret is needed for that refresh.

---

## 2. TikTok (×1 account)

Uses the **TikTok Display API** (`open.tiktokapis.com`). The access token only
lasts 24h, so the Worker refreshes it every run — which is why TikTok (unlike
Instagram) needs its app credentials stored as Worker secrets.

### 2a. One-time app setup

1. Go to <https://developers.tiktok.com> → **Manage apps → Create an app**.
2. **Add products: Login Kit.**
3. **Scopes:** enable `user.info.basic`, `user.info.profile`, `user.info.stats`.
4. **Redirect URI:** add `https://atlas16474859-nt24358.netlify.app/`. TikTok
   requires the redirect domain to be verified — follow their domain-verification
   prompt (DNS TXT record or hosted file). *(For a quick test without verifying a
   domain, `http://localhost:5173/` is also accepted.)*
5. Note the **Client key** and **Client secret**.
6. Store the credentials on the Worker (needed for the daily token refresh):

```bash
cd atlas-api
npx wrangler secret put TIKTOK_CLIENT_KEY
npx wrangler secret put TIKTOK_CLIENT_SECRET
npx wrangler deploy
```

### 2b. Get the tokens

**i. Get an authorization `code`.** Open in a browser logged in as the TikTok
account (any random `state` value is fine), and Authorize:

```
https://www.tiktok.com/v2/auth/authorize/?client_key=CLIENT_KEY&scope=user.info.basic,user.info.stats,user.info.profile&response_type=code&redirect_uri=https://atlas16474859-nt24358.netlify.app/&state=setup
```

You land on `...?code=XXXX&scopes=...&state=setup`. Copy `code` — **URL-decode
it** if it contains `%2A` etc. (`%2A` → `*`).

**ii. Code → tokens:**

```bash
curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_key=CLIENT_KEY" \
  -d "client_secret=CLIENT_SECRET" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://atlas16474859-nt24358.netlify.app/" \
  -d "code=PASTE_DECODED_CODE"
# -> {"access_token":"act...","expires_in":86400,
#     "refresh_token":"rft...","refresh_expires_in":31536000,
#     "open_id":"...","scope":"...","token_type":"Bearer"}
```

**iii. Hand both tokens to the Worker:**

```bash
curl -X POST https://<your-worker>.workers.dev/api/social/connect \
  -H "x-api-key: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "tiktok:main",
    "platform": "tiktok",
    "label": "@your.tiktok",
    "accessToken": "act...",
    "refreshToken": "rft...",
    "expiresInSeconds": 86400,
    "sortOrder": 3
  }'
# -> {"ok":true,"account":"tiktok:main"}
```

> TikTok rotates the refresh token on every refresh; the Worker stores the new
> one each run, so daily use keeps it alive well within its 1-year window.

---

## 3. First sync

Open the **Social** tab in the app and tap the refresh button (top-right) — that
calls `POST /api/social/refresh`, which runs the same sync the cron does. Each
account card should fill in within a few seconds. From then on the daily cron
adds one point per account per day; the follower trend chart appears once an
account has 2+ days of history.

You can also trigger it from the CLI:

```bash
curl -X POST https://<your-worker>.workers.dev/api/social/refresh \
  -H "x-api-key: YOUR_ATLAS_API_KEY" -H "Authorization: Bearer <session-token>"
```

---

## Managing accounts

**Re-connect / rename** — just POST `/api/social/connect` again with the same
`account` key; it upserts.

**Remove an account:**

```bash
npx wrangler d1 execute atlas-db --remote --command \
  "DELETE FROM social_accounts WHERE account='ig:secondary'; DELETE FROM social_stats WHERE account='ig:secondary';"
```

**Inspect what's stored:**

```bash
npx wrangler d1 execute atlas-db --remote --command \
  "SELECT account, platform, label, username, last_sync_at, last_error FROM social_accounts;"
```

---

## Troubleshooting

The account card shows `Last sync failed: <message>` when a sync errors. Common cases:

| Message | Cause & fix |
|---|---|
| IG `Invalid OAuth access token` | Token lapsed (cron didn't run for 60 days, or the token was revoked). Redo **1b**. |
| IG response missing `followers_count` | The IG account isn't Business/Creator. Switch it (**1a.1**) and refresh. |
| TikTok `invalid_grant` on refresh | Refresh token expired or was rotated away (no sync for a very long time). Redo **2b**. |
| TikTok `scope_not_authorized` | `user.info.stats` wasn't granted. Re-add the scope in the app config and redo **2b**. |
| `TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET secrets are not set` | Run the `wrangler secret put` commands in **2a.6**. |

**Rate limits / cost:** both APIs are free. IG allows ~200 calls/hour/user;
TikTok's Display API limits are comfortably above one call/account/day.

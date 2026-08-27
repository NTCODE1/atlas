# Atlas API

A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) that backs
the Atlas personal dashboard. It receives health data from the iOS app
**Health Auto Export** and stores it — along with every other data domain the PWA
tracks (nutrition, journal, and, over time, the rest — see "Data storage" below)
— in **Cloudflare D1** so a phone and a computer see the same data, not just
whichever one a given entry was logged on.

## Routes

| Method | Path                | Behavior |
|--------|---------------------|----------|
| `POST` | `/api/health`       | Ingest a JSON payload. Requires header `x-api-key: <API_SECRET>` (the **write** key, held by Health Auto Export). Stores the body verbatim in D1, keyed by today's date (UTC). Returns `201`. Wrong/missing key → `403`. |
| `GET`  | `/api/health`       | Returns the most recently stored payload. Requires `x-api-key: <ATLAS_API_KEY>` (the PWA **read** key). `{}` if nothing stored. |
| `GET`  | `/api/health/:date` | Returns the payload for `YYYY-MM-DD`. Requires `x-api-key: <ATLAS_API_KEY>`. `{}` if not found. |
| `GET`/`POST` | `/api/sync/:domain` | Pull/push a synced data domain's whole current value (meals, hydration, supplements, nutrition targets, goal history, ...) — see "Data storage" below. Requires `x-api-key: <ATLAS_API_KEY>` + passkey session. |
| `GET`/`POST` | `/api/sync/journal/:yearMonth` | Same, for one month of the Journal calendar (e.g. `2026-7`). |
| `POST` | `/api/ai/nutrition` | Estimates calories/macros from `{ "text": "..." }`. Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited to `AI_DAILY_CAP`/day → `429`. Proxies Anthropic Claude using the server-only `ANTHROPIC_API_KEY`. |
| `POST` | `/api/ai/chat`      | Free-text life-assistant chat over `{ "messages": [{ "role": "user"\|"model", "text": "..." }] }` (last turn must be `user`). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited to `AI_DAILY_CAP`/day → `429`. Returns `{ "reply": "..." }`. Proxies Anthropic Claude. |
| `POST` | `/api/chat`         | Data-grounded chat: `{ "messages": [...], "snapshot": { ...today's data... } }`. The snapshot (still assembled client-side — see "Data storage") is injected into the system prompt so the assistant answers about the user's day. Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns `{ "reply": "..." }`. Proxies Anthropic Claude. |
| `POST` | `/api/briefing`     | Terse daily health brief from `{ "metrics": { ... } }` (client-assembled — see "Data storage"). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited to `AI_DAILY_CAP`/day → `429`. Returns `{ "brief": "..." }`. Proxies Anthropic Claude. |
| `POST` | `/api/calendar-parse` | Extracts calendar events/tasks from `{ "text": "...", "today": "YYYY-MM-DD" }` (`today` = client local date, for weekday resolution). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns a JSON array `[{ "title", "date", "time", "type": "event"\|"task" }]`. Proxies Anthropic Claude. |
| `POST` | `/api/nutrition-gap` | Largest intake-vs-target gaps from `{ "nutrition": { ...today's totals/targets/micros... } }` (assembled client-side). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns `{ "gaps": [{ "nutrient", "amountShort", "foodSuggestions": [] }] }`. Proxies Anthropic Claude. |
| `POST` | `/api/update-targets` | Goal-based macro coaching from `{ "goal": "lose fat", "weightKg", "bmi", "bodyFatPercentage", "leanBodyMassKg" }` (body metrics optional). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns `{ "calorieTarget", "protein", "carbs", "fat", "reasoning", "tips": [] }`. Proxies Anthropic Claude. |
| `POST` | `/api/social/connect` | Seed/replace one social account's OAuth token (`{ account, platform, label, accessToken, refreshToken?, expiresInSeconds?, sortOrder? }`). Requires header `x-api-key: <API_SECRET>` (the **write** key — it stores credentials). Run once per account during setup — see [`docs/social-setup.md`](docs/social-setup.md). |
| `POST` | `/api/social/refresh` | Run the social follower-stats sync now (what the daily cron does). Requires `x-api-key: <ATLAS_API_KEY>` + passkey. Returns `{ synced, failed, results }`. |
| `GET`  | `/api/social`       | Follower/engagement history per connected account. `?days=` clamps the window (default 90, max 400). Requires `x-api-key: <ATLAS_API_KEY>` + passkey. Returns `{ accounts: [{ account, platform, label, username, lastSyncAt, lastError, points: [{ date, followers, following, posts, likes }] }] }`. |

### Keys & security

Two keys, by least privilege — **never put any of these in the frontend `.env`** except
the low-privilege `ATLAS_API_KEY`:

- `API_SECRET` — **write** key. Held only by Health Auto Export.
- `ATLAS_API_KEY` — **read/AI** key sent by the PWA. Rate-limited; extractable from the
  bundle, but the daily cap bounds abuse.
- `ANTHROPIC_API_KEY` — Anthropic (Claude) key. Server secret only; never leaves the Worker.
- `SESSION_SECRET` — HMAC key for signing passkey session tokens. Server secret only.
- `SETUP_CODE` — one-time code typed once per device to enroll a passkey.
- `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` — TikTok Display API app credentials,
  used by the daily social sync to refresh the (24h) TikTok access token. Only
  needed if a TikTok account is connected on the Social tab. Instagram needs no
  secret here — its long-lived token self-refreshes. See `docs/social-setup.md`.

**Passkey (WebAuthn) gate.** On top of `ATLAS_API_KEY`, all read + AI routes require a
short-lived session token that the PWA obtains by proving a device passkey (Face ID /
fingerprint) via the `POST /api/auth/*` routes (see `src/auth.ts`). So the bundle key
alone — which anyone can extract — is not enough. The Relying Party ID/origin is derived
from the request `Origin` and validated against `ALLOWED_ORIGINS`, so no extra config is
needed beyond adding your deployed origin there.

CORS is locked to the origins in `ALLOWED_ORIGINS` (`wrangler.toml [vars]`) — add your
deployed PWA origin there.

## Setup & deploy

```bash
cd atlas-api
npm install

# 1. Create the KV namespace (used for webauthn/session/rate-limit data only —
#    see "Data storage" below), then copy the printed id into
#    wrangler.toml -> [[kv_namespaces]] -> id
npx wrangler kv namespace create HEALTH_KV

# 2. Create the D1 database, then copy the printed database_id into
#    wrangler.toml -> [[d1_databases]] -> database_id
npx wrangler d1 create atlas-db

# 3. Apply the schema (migrations/0001_init.sql) — local dev DB and the real one
npx wrangler d1 migrations apply atlas-db --local
npx wrangler d1 migrations apply atlas-db --remote

# 4. Set the secrets (you'll be prompted to paste each value)
npx wrangler secret put API_SECRET      # write key for Health Auto Export
npx wrangler secret put ATLAS_API_KEY   # read/AI key for the PWA (generate a random string)
npx wrangler secret put ANTHROPIC_API_KEY  # Anthropic Claude key (console.anthropic.com)
npx wrangler secret put SESSION_SECRET  # random 32+ char string (signs passkey sessions)
npx wrangler secret put SETUP_CODE      # one-time code you type once per device to enroll

# 5. Add your deployed PWA origin to ALLOWED_ORIGINS in wrangler.toml, then deploy
npx wrangler deploy
```

> You'll be asked to log in on first use: `npx wrangler login`.

## Point Health Auto Export at it

In Health Auto Export, configure a REST API automation:

- **URL:** `https://<your-worker-url>/api/health`
- **Method:** `POST`
- **Header:** `x-api-key: <the value you set as API_SECRET>`
- **Body:** JSON

## Data storage

Two stores, split by what they hold:

- **Cloudflare KV** (`HEALTH_KV` binding) — only webauthn/passkey credentials,
  session challenges, and the AI daily rate-limit counter. Nothing "app data"
  lives here anymore.
- **Cloudflare D1** (`DB` binding, see `migrations/0001_init.sql`) — everything
  else: `health`/`workout` ingest (verbatim JSON blobs, same semantics as
  before, just moved off KV) and every synced domain (real typed columns per
  domain). **All live:** meals, hydration, supplements, nutrition targets,
  goal history, journal (calendar + today's focus), weight log, caffeine
  doses, fasting state, habit definitions + check-ins, deep work, settings
  (+ avatar), Training (exercise library, nested workout sessions, VO2max),
  Finance, Motivation (photo board + goals with milestones), and the daily
  snapshot rollup. `assistant_messages` (chat history) has a table in the
  schema but is the one domain deliberately left unsynced — lowest value of
  everything tracked, not worth the round-trip.
- **Social** (`social_accounts`, `social_stats` — migration `0002_social.sql`,
  code in `src/social.ts`) is server-owned and **cron-driven**, not a synced
  domain: a daily [cron trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
  (`wrangler.toml [triggers]`, `05:20 UTC`) pulls follower counts from the
  Instagram Graph API and TikTok Display API into one row per account per day.
  The PWA only reads it (`GET /api/social`). One-time OAuth setup per account:
  [`docs/social-setup.md`](docs/social-setup.md).

**Sync model** (`src/sync.ts`, `src/sync/*.ts`): each synced domain corresponds
to one browser localStorage key on the frontend (`src/hooks/useSyncedStorage.ts`
is the drop-in `useLocalStorage` replacement). The client pushes/pulls that
key's whole current value as one JSON blob tagged with a client timestamp;
whichever push is newest wins (last-write-wins) — the same model
`/api/health`/`/api/workouts` already used (whole-payload overwrite), just
generalized. `meals`/`hydration` are the one exception: since they're locally
pruned to a 7-day window, a push only replaces server rows *within that same
window*, so D1 quietly accumulates fuller history than the local cache without
risking deleting it on every sync (see `sync/nutritionSync.ts`'s comment for
the full reasoning). This is a deliberately simple model for a single person
on at most two devices, not a general offline-multi-writer sync engine — two
edits made offline on both devices before either syncs will have the later
one win outright for that whole domain, not merge.

Bringing a new domain online (e.g. `assistant_messages`, or anything added
later) is: write its `toRows`/`fromRows` pair in a `src/sync/*.ts` file,
register it, swap the frontend hook's `useLocalStorage` call for
`useSyncedStorage` — the same pattern every `sync/*.ts` file and its hook
call site(s) already follow, so it's mechanical, not new design work. The
one thing worth judgment per domain: whether a push should be a full
replace (most domains — local already holds everything) or scoped to a
retention window (only meals/hydration/caffeine need this, since they're
the only domains the frontend itself locally prunes — see
`sync/nutritionSync.ts`'s comment for why that distinction matters).

**Recovering data that only ever existed in one browser's localStorage**
(e.g. months of real phone data, pre-dating this sync layer): there's no
server-side migration path for this — the Worker never received it in any
form. `useSyncedStorage` handles it automatically the first time each device
opens the updated app: if that device has never synced a domain before and
its local value is genuinely non-default, it's pushed up rather than
discarded. **You have to actually open the app on each device at least once**
for that device's local data to ever reach D1 — there's no way around that.

Some data is still assembled client-side for the AI routes (`/api/briefing`,
`/api/chat`) even though it's now D1-backed — `useTodaySnapshot` reads
through the synced hooks the same as any screen would; the Worker itself
still has no single "today" view across domains to hand the model without the
client building it first. Fine for now (it's still one JSON blob either way),
worth revisiting if the client-assembly step becomes the annoying part.

## Local development

```bash
# Create .dev.vars (git-ignored) with the secrets for local runs:
cat > .dev.vars <<'EOF'
API_SECRET=test123
ATLAS_API_KEY=devkey123
ANTHROPIC_API_KEY=sk-ant-your-real-key-for-local-ai-testing
SESSION_SECRET=dev-session-secret-change-me
SETUP_CODE=dev-setup-code
EOF

npx wrangler dev
```

> **Known issue (pre-existing, unrelated to D1):** `wrangler dev` currently
> fails to start on this project — `wrangler` 4.112.0's local runtime rejects
> the module because it has plain-value named exports alongside `export
> default` (e.g. `MICRO_UNITS` in `index.ts`, present since before this D1
> work): `Uncaught TypeError: Incorrect type for map entry 'MICRO_UNITS': the
> provided value is not of type 'function or ExportedHandler'`. `wrangler
> deploy` is unaffected (verified) — only the local dev server is. Logged as
> a bug to look into separately; for now, verify Worker-side changes via
> `npm test` (which exercises real local D1 through `getPlatformProxy`, no
> dev server needed) plus a real deploy.

Then, against `http://localhost:8787`:

```bash
# Store a payload
curl -X POST localhost:8787/api/health -H "x-api-key: test123" -d '{"hr":60}'   # -> 201

# Wrong key
curl -X POST localhost:8787/api/health -H "x-api-key: nope" -d '{}'             # -> 403

# Read latest — now needs BOTH the read key AND a passkey session token, so a bare
# curl returns 401. Unlock in the PWA to mint a token; the browser sends it automatically.
curl localhost:8787/api/health -H "x-api-key: devkey123"                        # -> 401 (no session)
curl localhost:8787/api/health \
  -H "x-api-key: devkey123" -H "Authorization: Bearer <token-from-unlock>"      # -> {"hr":60}

# Missing day
curl localhost:8787/api/health/2000-01-01                                       # -> {}
```

## Notes

- The payload is stored **verbatim** as the received string, so whatever Health
  Auto Export sends round-trips exactly.
- The per-day key uses the **UTC** date. A late-night POST may land on the next
  UTC day; adjust in `src/index.ts` (`todayKey`) if you want a fixed local offset.
- `/api/ai/nutrition` grounds food estimates in real per-100g reference data
  instead of leaving portion sizes and macros to the model's guess, in two
  layers: a small hand-curated table of Finnish grocery items (e.g.
  Oltermanni, meetvursti, thin rye/oat bread — `src/finnishFoods.ts`), and,
  for anything that table doesn't cover, an automated fallback against
  ~4,050 generic + Finnish foods from Fineli's open food composition data
  (`src/fineliMatch.ts` / `src/fineliFoods.generated.ts` — see "Nutrition
  data sources" below). Deterministic in both layers: numbers are computed
  in code, not trusted from the model, whenever a food is confidently
  identified and an amount is stated.

### Nutrition data sources

The generic-food layer (`src/fineliFoods.generated.ts`) is generated from
**Fineli**, the Finnish food composition database maintained by THL
(Terveyden ja hyvinvoinnin laitos / Finnish Institute for Health and
Welfare), released under [CC-BY 4.0](https://fineli.fi/fineli/en/avoin-data).
Fineli's own site blocks scripted access, so the data is pulled from
[theel0ja/fineli-data](https://github.com/theel0ja/fineli-data), a verbatim
mirror of Fineli's official CSV package, via:

```bash
node scripts/build-fineli-data.mjs   # regenerates src/fineliFoods.generated.ts
```

This is a manually-rerun refresh script, not part of the deploy pipeline —
rerun it only when picking up a newer Fineli release. See
`src/fineliMatch.ts`'s header for how meal text is matched against it, and
`src/fineliAliases.ts` for the small hand-picked list bridging colloquial
terms Fineli's formal naming doesn't textually match.

## Tests

```bash
npm test   # node --test; no extra dependency, uses Node's built-in test runner
```

`src/finnishFoods.test.ts` checks the Finnish food-reference table and prompt
against the calorie-estimate bug it fixes, and `src/fineliMatch.test.ts`
checks the generic-food fallback (matching, ambiguity handling, precedence
over the manual table). Their deterministic checks always run; a couple of
tests also make a real call to the Anthropic API and are skipped
automatically unless `ANTHROPIC_API_KEY` is set (env var or `.dev.vars`).

`npm run test:accuracy` is a separate, opt-in benchmark
(`src/nutritionAccuracy.test.ts`) that checks estimates against known
real-world values for both layers — it costs real Anthropic API calls, so
it isn't run as part of `npm test`.

`src/sync.test.ts`, `src/sync/journalSync.test.ts`, `src/sync/phase2.test.ts`,
and `src/sync/phase3.test.ts` check the D1 sync layer (last-write-wins, the
retention-window scoping for meals/hydration/caffeine, per-month journal date
reconstruction and isolation, nested-relational round-tripping for workout
sessions/goals, and round-trip field fidelity for every live domain) against a **real
local D1 binding** — no mocking — via `wrangler`'s `getPlatformProxy()`,
reusing the same local Miniflare SQLite state `wrangler d1 migrations apply
atlas-db --local` sets up (free, no network, so these run as part of the
default `npm test` unlike the Anthropic-backed tests). `npm test` passes
`--test-concurrency=1`: these files share that one local D1 file, and Node's
test runner running them in separate concurrent processes by default caused
real file-lock races — sequencing fixed it.

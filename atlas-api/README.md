# Atlas API

A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) that backs
the Atlas personal dashboard. It receives health data from the iOS app
**Health Auto Export** and stores it in Cloudflare KV for the Atlas PWA to read.

## Routes

| Method | Path                | Behavior |
|--------|---------------------|----------|
| `POST` | `/api/health`       | Ingest a JSON payload. Requires header `x-api-key: <API_SECRET>` (the **write** key, held by Health Auto Export). Stores the body under `health:YYYY-MM-DD` (today, UTC) **and** `health:latest`. Returns `201`. Wrong/missing key → `403`. |
| `GET`  | `/api/health`       | Returns `health:latest`. Requires `x-api-key: <ATLAS_API_KEY>` (the PWA **read** key). `{}` if nothing stored. |
| `GET`  | `/api/health/:date` | Returns `health:YYYY-MM-DD`. Requires `x-api-key: <ATLAS_API_KEY>`. `{}` if not found. |
| `POST` | `/api/ai/nutrition` | Estimates calories/macros from `{ "text": "..." }`. Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited to `AI_DAILY_CAP`/day → `429`. Proxies Anthropic Claude using the server-only `ANTHROPIC_API_KEY`. |
| `POST` | `/api/ai/chat`      | Free-text life-assistant chat over `{ "messages": [{ "role": "user"\|"model", "text": "..." }] }` (last turn must be `user`). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited to `AI_DAILY_CAP`/day → `429`. Returns `{ "reply": "..." }`. Proxies Anthropic Claude. |
| `POST` | `/api/chat`         | Data-grounded chat: `{ "messages": [...], "snapshot": { ...today's data... } }`. The snapshot (assembled client-side, since it's not all in KV) is injected into the system prompt so the assistant answers about the user's day. Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns `{ "reply": "..." }`. Proxies Anthropic Claude. |
| `POST` | `/api/briefing`     | Terse daily health brief from `{ "metrics": { ... } }` (the PWA assembles today's readiness/sleep/HRV/caffeine/hydration/training/macros client-side, since those aren't all in KV). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited to `AI_DAILY_CAP`/day → `429`. Returns `{ "brief": "..." }`. Proxies Anthropic Claude. |
| `POST` | `/api/calendar-parse` | Extracts calendar events/tasks from `{ "text": "...", "today": "YYYY-MM-DD" }` (`today` = client local date, for weekday resolution). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns a JSON array `[{ "title", "date", "time", "type": "event"\|"task" }]`. Proxies Anthropic Claude. |
| `POST` | `/api/nutrition-gap` | Largest intake-vs-target gaps from `{ "nutrition": { ...today's totals/targets/micros... } }` (assembled client-side). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns `{ "gaps": [{ "nutrient", "amountShort", "foodSuggestions": [] }] }`. Proxies Anthropic Claude. |
| `POST` | `/api/update-targets` | Goal-based macro coaching from `{ "goal": "lose fat", "weightKg", "bmi", "bodyFatPercentage", "leanBodyMassKg" }` (body metrics optional). Requires `x-api-key: <ATLAS_API_KEY>`. Rate-limited → `429`. Returns `{ "calorieTarget", "protein", "carbs", "fat", "reasoning", "tips": [] }`. Proxies Anthropic Claude. |

### Keys & security

Two keys, by least privilege — **never put any of these in the frontend `.env`** except
the low-privilege `ATLAS_API_KEY`:

- `API_SECRET` — **write** key. Held only by Health Auto Export.
- `ATLAS_API_KEY` — **read/AI** key sent by the PWA. Rate-limited; extractable from the
  bundle, but the daily cap bounds abuse.
- `ANTHROPIC_API_KEY` — Anthropic (Claude) key. Server secret only; never leaves the Worker.
- `SESSION_SECRET` — HMAC key for signing passkey session tokens. Server secret only.
- `SETUP_CODE` — one-time code typed once per device to enroll a passkey.

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

# 1. Create the KV namespace, then copy the printed id into
#    wrangler.toml -> [[kv_namespaces]] -> id
npx wrangler kv namespace create HEALTH_KV

# 2. Set the secrets (you'll be prompted to paste each value)
npx wrangler secret put API_SECRET      # write key for Health Auto Export
npx wrangler secret put ATLAS_API_KEY   # read/AI key for the PWA (generate a random string)
npx wrangler secret put ANTHROPIC_API_KEY  # Anthropic Claude key (console.anthropic.com)
npx wrangler secret put SESSION_SECRET  # random 32+ char string (signs passkey sessions)
npx wrangler secret put SETUP_CODE      # one-time code you type once per device to enroll

# 3. Add your deployed PWA origin to ALLOWED_ORIGINS in wrangler.toml, then deploy
npx wrangler deploy
```

> You'll be asked to log in on first use: `npx wrangler login`.

## Point Health Auto Export at it

In Health Auto Export, configure a REST API automation:

- **URL:** `https://<your-worker-url>/api/health`
- **Method:** `POST`
- **Header:** `x-api-key: <the value you set as API_SECRET>`
- **Body:** JSON

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
- `/api/ai/nutrition` grounds Finnish grocery items (e.g. Oltermanni, meetvursti,
  thin rye/oat bread) in real per-100g reference macros — see `src/finnishFoods.ts`
  — instead of leaving portion sizes to the model's guess.

## Tests

```bash
npm test   # node --test; no extra dependency, uses Node's built-in test runner
```

`src/finnishFoods.test.ts` checks the Finnish food-reference table and prompt
against the calorie-estimate bug it fixes. Its deterministic checks always run;
one test also makes a real call to the Anthropic API and is skipped automatically
unless `ANTHROPIC_API_KEY` is set (env var or `.dev.vars`).

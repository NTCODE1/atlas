/**
 * Deterministic checks for the generic sync mechanics (sync.ts) and the
 * Nutrition domain registrations (sync/nutritionSync.ts), against a real
 * local D1 binding (via wrangler's getPlatformProxy — the same local
 * Miniflare SQLite state `npx wrangler d1 migrations apply atlas-db --local`
 * already set up, no network/cost involved, so this runs as part of the
 * default `npm test` unlike the opt-in Anthropic-API tests).
 *
 * Run with: node --test src/sync.test.ts
 * (Requires local D1 migrations to have been applied once — see README.)
 */

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPlatformProxy } from "wrangler";
import { pushDomain, pullDomain, type SyncEnv } from "./sync.ts";
import { mealsSync, hydrationSync, supplementsSync, nutritionTargetsSync, goalTargetLogSync } from "./sync/nutritionSync.ts";

let env: SyncEnv;
let dispose: () => Promise<void>;

before(async () => {
  const proxy = await getPlatformProxy<SyncEnv>({ configPath: "wrangler.toml" });
  env = proxy.env;
  dispose = proxy.dispose;
});

after(async () => {
  await dispose();
});

/** Clean slate before every test — these tables are test-only fixtures here, never real data (this hits the LOCAL D1 file only). */
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sync_meta"),
    env.DB.prepare("DELETE FROM meals"),
    env.DB.prepare("DELETE FROM hydration_entries"),
    env.DB.prepare("DELETE FROM supplements"),
    env.DB.prepare("DELETE FROM nutrition_targets"),
    env.DB.prepare("DELETE FROM goal_target_log"),
  ]);
});

// --- Generic last-write-wins mechanics --------------------------------

test("a first push is always accepted and readable back", async () => {
  const push = await pushDomain(env, "meals", mealsSync, [{ id: "m1", type: "snack", name: "Apple" }], 1000);
  assert.equal(push.accepted, true);

  const pull = await pullDomain(env, "meals", mealsSync);
  assert.equal(pull.updatedAt, 1000);
  assert.deepEqual(pull.value, [{ id: "m1", type: "snack", name: "Apple" }]);
});

test("a push with an older or equal updatedAt is rejected and leaves the stored value untouched", async () => {
  await pushDomain(env, "meals", mealsSync, [{ id: "m1", type: "snack", name: "Apple" }], 1000);

  const staleAttempt = await pushDomain(env, "meals", mealsSync, [{ id: "m2", type: "snack", name: "Banana" }], 500);
  assert.equal(staleAttempt.accepted, false);

  const equalAttempt = await pushDomain(env, "meals", mealsSync, [{ id: "m2", type: "snack", name: "Banana" }], 1000);
  assert.equal(equalAttempt.accepted, false);

  const pull = await pullDomain(env, "meals", mealsSync);
  assert.equal(pull.updatedAt, 1000, "the earlier, accepted write's timestamp must still be the one on record");
  assert.deepEqual(pull.value, [{ id: "m1", type: "snack", name: "Apple" }], "the stale/equal pushes must not overwrite it");
});

test("a push with a newer updatedAt is accepted and replaces the stored value", async () => {
  await pushDomain(env, "meals", mealsSync, [{ id: "m1", type: "snack", name: "Apple" }], 1000);
  const push = await pushDomain(env, "meals", mealsSync, [{ id: "m2", type: "snack", name: "Banana" }], 2000);
  assert.equal(push.accepted, true);

  const pull = await pullDomain(env, "meals", mealsSync);
  assert.equal(pull.updatedAt, 2000);
  assert.deepEqual(pull.value, [{ id: "m2", type: "snack", name: "Banana" }]);
});

test("pulling a domain that's never been pushed returns its declared empty value and updatedAt 0", async () => {
  const pull = await pullDomain(env, "meals", mealsSync);
  assert.equal(pull.updatedAt, 0);
  assert.deepEqual(pull.value, []);
});

// --- Meals: field round-trip + windowed retention ----------------------

test("a full meal round-trips exactly, including micros and omitting genuinely-absent optional fields", async () => {
  await pushDomain(
    env,
    "meals",
    mealsSync,
    [
      {
        id: "m1",
        type: "lunch",
        name: "Chicken & rice",
        kcal: 620,
        protein: 45,
        carbs: 60,
        fat: 12,
        micros: { iron: 3.2, potassium: 480 },
        date: "2026-08-20",
        createdAt: "2026-08-20T12:00:00.000Z",
      },
    ],
    1000,
  );
  const { value } = await pullDomain(env, "meals", mealsSync);
  assert.deepEqual(value, [
    {
      id: "m1",
      type: "lunch",
      name: "Chicken & rice",
      kcal: 620,
      protein: 45,
      carbs: 60,
      fat: 12,
      micros: { iron: 3.2, potassium: 480 },
      date: "2026-08-20",
      createdAt: "2026-08-20T12:00:00.000Z",
    },
  ]);
});

test("a minimal meal (no macros, no date — a legacy seed-style entry) round-trips without inventing fields", async () => {
  await pushDomain(env, "meals", mealsSync, [{ id: "seed1", type: "breakfast", name: "Eggs, oatmeal" }], 1000);
  const { value } = await pullDomain(env, "meals", mealsSync);
  assert.deepEqual(value, [{ id: "seed1", type: "breakfast", name: "Eggs, oatmeal" }]);
});

test("a push only replaces rows within the retention window — older server-side history survives", async () => {
  // Simulate pre-existing server history from 30 days ago (older than the
  // client's 7-day local cache would ever contain) by writing it directly,
  // bypassing the sync push path entirely.
  const old = new Date();
  old.setUTCDate(old.getUTCDate() - 30);
  const oldDate = old.toISOString().slice(0, 10);
  await env.DB.prepare(
    "INSERT INTO meals (id, type, name, date, updated_at) VALUES ('old1', 'dinner', 'Old dinner', ?, 1)",
  )
    .bind(oldDate)
    .run();

  // A push containing only today's meals must not touch that 30-day-old row.
  const today = new Date().toISOString().slice(0, 10);
  await pushDomain(
    env,
    "meals",
    mealsSync,
    [{ id: "new1", type: "dinner", name: "New dinner", date: today }],
    1000,
  );

  const { results } = await env.DB.prepare("SELECT id FROM meals ORDER BY id").all<{ id: string }>();
  assert.deepEqual(
    results.map((r) => r.id),
    ["new1", "old1"],
    "the 30-day-old row must survive a push that only mentions today's meal",
  );
});

// --- Other Nutrition domains: basic round-trip --------------------------

test("hydration entries round-trip", async () => {
  await pushDomain(
    env,
    "hydration",
    hydrationSync,
    [{ id: "d1", label: "Water", ml: 250, date: "2026-08-20", createdAt: "2026-08-20T08:00:00.000Z" }],
    1000,
  );
  const { value } = await pullDomain(env, "hydration", hydrationSync);
  assert.deepEqual(value, [
    { id: "d1", label: "Water", ml: 250, date: "2026-08-20", createdAt: "2026-08-20T08:00:00.000Z" },
  ]);
});

test("supplements round-trip and are fully replaced (no retention window)", async () => {
  await pushDomain(
    env,
    "supplements",
    supplementsSync,
    [{ id: "s1", name: "Vitamin D", dosage: "2000 IU", date: "2026-08-20", createdAt: "2026-08-20T09:00:00.000Z" }],
    1000,
  );
  await pushDomain(
    env,
    "supplements",
    supplementsSync,
    [{ id: "s2", name: "Magnesium", dosage: "400mg", date: "2026-08-20", createdAt: "2026-08-20T09:01:00.000Z" }],
    2000,
  );
  const { value } = await pullDomain(env, "supplements", supplementsSync);
  assert.deepEqual(
    value.map((s) => s.id),
    ["s2"],
    "a full replace must drop s1, unlike meals/hydration's windowed replace",
  );
});

test("nutrition targets (singleton) round-trip", async () => {
  await pushDomain(env, "nutritionTargets", nutritionTargetsSync, { kcal: 2400, protein: 180, carbs: 250, fat: 80 }, 1000);
  const { value } = await pullDomain(env, "nutritionTargets", nutritionTargetsSync);
  assert.deepEqual(value, { kcal: 2400, protein: 180, carbs: 250, fat: 80 });
});

test("goal target log entries round-trip, including the optional reasoning field", async () => {
  await pushDomain(
    env,
    "goalTargetLog",
    goalTargetLogSync,
    [{ id: "g1", date: "2026-08-01", goal: "Lose fat", kcal: 2200, protein: 180, carbs: 200, fat: 70, reasoning: "500 kcal deficit" }],
    1000,
  );
  const { value } = await pullDomain(env, "goalTargetLog", goalTargetLogSync);
  assert.deepEqual(value, [
    { id: "g1", date: "2026-08-01", goal: "Lose fat", kcal: 2200, protein: 180, carbs: 200, fat: 70, reasoning: "500 kcal deficit" },
  ]);
});

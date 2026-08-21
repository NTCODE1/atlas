/**
 * Deterministic checks for the second batch of synced domains: Weight,
 * Energy (caffeine + fasting), Habits, Deep work, Settings. Same style and
 * real-local-D1 approach as sync.test.ts / journalSync.test.ts — see that
 * file's header for why this hits a real binding instead of mocking.
 *
 * Run with: node --test src/sync/phase2.test.ts
 */

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPlatformProxy } from "wrangler";
import { pushDomain, pullDomain, type SyncEnv } from "../sync.ts";
import { weightEntriesSync } from "./weightSync.ts";
import { caffeineDosesSync, fastingStateSync } from "./energySync.ts";
import { habitDefsSync, habitChecksSync } from "./habitsSync.ts";
import { deepWorkSync } from "./deepWorkSync.ts";
import { settingsSync, settingsAvatarSync } from "./settingsSync.ts";

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

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sync_meta"),
    env.DB.prepare("DELETE FROM weight_entries"),
    env.DB.prepare("DELETE FROM caffeine_doses"),
    env.DB.prepare("DELETE FROM fasting_state"),
    env.DB.prepare("DELETE FROM habit_defs"),
    env.DB.prepare("DELETE FROM habit_checks"),
    env.DB.prepare("DELETE FROM deep_work_sessions"),
    env.DB.prepare("DELETE FROM deep_work_state"),
    env.DB.prepare("DELETE FROM settings"),
    env.DB.prepare("DELETE FROM settings_avatar"),
  ]);
});

// --- Weight ---------------------------------------------------------------

test("weight entries round-trip and a re-push fully replaces (one entry per date, never pruned)", async () => {
  await pushDomain(env, "weightEntries", weightEntriesSync, [{ date: "2026-08-01", kg: 80.5 }], 1000);
  await pushDomain(
    env,
    "weightEntries",
    weightEntriesSync,
    [
      { date: "2026-08-01", kg: 80.2 }, // corrected same-day entry
      { date: "2026-08-02", kg: 80.0 },
    ],
    2000,
  );
  const { value } = await pullDomain(env, "weightEntries", weightEntriesSync);
  assert.deepEqual(value, [
    { date: "2026-08-01", kg: 80.2 },
    { date: "2026-08-02", kg: 80.0 },
  ]);
});

// --- Energy -----------------------------------------------------------

test("caffeine doses round-trip, including the optional ml field", async () => {
  await pushDomain(
    env,
    "caffeineDoses",
    caffeineDosesSync,
    [{ id: "c1", drink: "Flat white", time: "08:30", mg: 80, ml: 180, date: "2026-08-20" }],
    1000,
  );
  const { value } = await pullDomain(env, "caffeineDoses", caffeineDosesSync);
  assert.deepEqual(value, [{ id: "c1", drink: "Flat white", time: "08:30", mg: 80, ml: 180, date: "2026-08-20" }]);
});

test("caffeine doses only replace rows in the retention window — older server history survives", async () => {
  const old = new Date();
  old.setUTCDate(old.getUTCDate() - 30);
  const oldDate = old.toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO caffeine_doses (id, drink, time, mg, date, updated_at) VALUES ('old1', 'Espresso', '07:00', 63, ?, 1)")
    .bind(oldDate)
    .run();

  const today = new Date().toISOString().slice(0, 10);
  await pushDomain(
    env,
    "caffeineDoses",
    caffeineDosesSync,
    [{ id: "new1", drink: "Latte", time: "09:00", mg: 75, date: today }],
    1000,
  );

  const { results } = await env.DB.prepare("SELECT id FROM caffeine_doses ORDER BY id").all<{ id: string }>();
  assert.deepEqual(results.map((r) => r.id), ["new1", "old1"]);
});

test("fasting state (singleton) round-trips, and pulling before any push returns the same default as the frontend's DEFAULT_FASTING", async () => {
  const empty = await pullDomain(env, "fastingState", fastingStateSync);
  assert.deepEqual(empty.value, { active: false, startMs: null, targetHours: 16 });

  await pushDomain(env, "fastingState", fastingStateSync, { active: true, startMs: 1_700_000_000_000, targetHours: 18 }, 1000);
  const { value } = await pullDomain(env, "fastingState", fastingStateSync);
  assert.deepEqual(value, { active: true, startMs: 1_700_000_000_000, targetHours: 18 });
});

// --- Habits -----------------------------------------------------------

test("habit defs round-trip, including the optional preset flag", async () => {
  await pushDomain(
    env,
    "habitDefs",
    habitDefsSync,
    [
      { id: "smoking", name: "No smoking", icon: "smoking", preset: true },
      { id: "h-custom", name: "Cold shower", icon: "mind" },
    ],
    1000,
  );
  const { value } = await pullDomain(env, "habitDefs", habitDefsSync);
  assert.deepEqual(value, [
    { id: "smoking", name: "No smoking", icon: "smoking", preset: true },
    { id: "h-custom", name: "Cold shower", icon: "mind" },
  ]);
});

test("habit checks (Record<date, habitId[]>) flatten to rows and reconstruct with the same dates/ids per day", async () => {
  // Pushed out of alphabetical order deliberately — read() orders by
  // habit_id for a deterministic result (checks are an unordered set per
  // day, not a meaningful sequence — see habitsSync.ts's comment), so the
  // expected value below is in that sorted order, not push order.
  const checks = {
    "2026-08-19": ["smoking", "exercise"],
    "2026-08-20": ["smoking"],
  };
  await pushDomain(env, "habitChecks", habitChecksSync, checks, 1000);
  const { value } = await pullDomain(env, "habitChecks", habitChecksSync);
  assert.deepEqual(value, {
    "2026-08-19": ["exercise", "smoking"],
    "2026-08-20": ["smoking"],
  });
});

test("habit checks: unchecking (removing a habit from a day) propagates on the next push", async () => {
  await pushDomain(env, "habitChecks", habitChecksSync, { "2026-08-20": ["smoking", "exercise"] }, 1000);
  await pushDomain(env, "habitChecks", habitChecksSync, { "2026-08-20": ["smoking"] }, 2000);
  const { value } = await pullDomain(env, "habitChecks", habitChecksSync);
  assert.deepEqual(value, { "2026-08-20": ["smoking"] });
});

// --- Deep work ----------------------------------------------------------

test("deep work (active timer + sessions, one combined domain) round-trips", async () => {
  await pushDomain(
    env,
    "deepWork",
    deepWorkSync,
    { active: true, startMs: 1_700_000_000_000, sessions: [{ id: "dw1", date: "2026-08-20", minutes: 45 }] },
    1000,
  );
  const { value } = await pullDomain(env, "deepWork", deepWorkSync);
  assert.deepEqual(value, {
    active: true,
    startMs: 1_700_000_000_000,
    sessions: [{ id: "dw1", date: "2026-08-20", minutes: 45 }],
  });
});

test("deep work sessions are fully replaced (never locally pruned)", async () => {
  await pushDomain(env, "deepWork", deepWorkSync, { active: false, startMs: null, sessions: [{ id: "dw1", date: "2026-08-19", minutes: 30 }] }, 1000);
  await pushDomain(env, "deepWork", deepWorkSync, { active: false, startMs: null, sessions: [{ id: "dw2", date: "2026-08-20", minutes: 60 }] }, 2000);
  const { value } = await pullDomain(env, "deepWork", deepWorkSync);
  assert.deepEqual(value.sessions, [{ id: "dw2", date: "2026-08-20", minutes: 60 }]);
});

// --- Settings -----------------------------------------------------------

test("settings (whole-blob) round-trips an arbitrary shape, including fields this server never validates", async () => {
  const settings = { name: "Niila", theme: "dark", waterGoalL: 2.5, sex: "male", newFieldAddedLater: 42 };
  await pushDomain(env, "settings", settingsSync, settings, 1000);
  const { value } = await pullDomain(env, "settings", settingsSync);
  assert.deepEqual(value, settings);
});

test("settings avatar (nullable singleton) round-trips both a set and a cleared value", async () => {
  await pushDomain(env, "settingsAvatar", settingsAvatarSync, "data:image/jpeg;base64,AAAA", 1000);
  assert.equal((await pullDomain(env, "settingsAvatar", settingsAvatarSync)).value, "data:image/jpeg;base64,AAAA");

  await pushDomain(env, "settingsAvatar", settingsAvatarSync, null, 2000);
  assert.equal((await pullDomain(env, "settingsAvatar", settingsAvatarSync)).value, null);
});

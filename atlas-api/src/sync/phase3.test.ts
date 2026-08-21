/**
 * Deterministic checks for the third and final batch of synced domains:
 * Training (exercises, nested workout sessions, VO2max), Finance, Motivation
 * (items + goals with milestones), and the daily snapshot rollup. Same
 * style and real-local-D1 approach as sync.test.ts / phase2.test.ts.
 *
 * Run with: node --test src/sync/phase3.test.ts
 */

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPlatformProxy } from "wrangler";
import { pushDomain, pullDomain, type SyncEnv } from "../sync.ts";
import { exercisesSync, workoutSessionsSync, vo2maxEntriesSync } from "./trainingSync.ts";
import { financeSync } from "./financeSync.ts";
import { motivationItemsSync, goalsSync } from "./motivationSync.ts";
import { dailySnapshotsSync } from "./snapshotSync.ts";

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
  // Children before parents throughout (FK constraints).
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sync_meta"),
    env.DB.prepare("DELETE FROM set_entries"),
    env.DB.prepare("DELETE FROM session_exercises"),
    env.DB.prepare("DELETE FROM workout_sessions"),
    env.DB.prepare("DELETE FROM exercises"),
    env.DB.prepare("DELETE FROM vo2max_entries"),
    env.DB.prepare("DELETE FROM finance_assets"),
    env.DB.prepare("DELETE FROM finance_liabilities"),
    env.DB.prepare("DELETE FROM finance_expenses"),
    env.DB.prepare("DELETE FROM finance_categories"),
    env.DB.prepare("DELETE FROM finance_savings_goal"),
    env.DB.prepare("DELETE FROM motivation_items"),
    env.DB.prepare("DELETE FROM goal_milestones"),
    env.DB.prepare("DELETE FROM goals"),
    env.DB.prepare("DELETE FROM daily_snapshots"),
  ]);
});

// --- Training -----------------------------------------------------------

test("exercise library round-trips and is fully replaced", async () => {
  await pushDomain(env, "exercises", exercisesSync, [{ id: "ex1", name: "Squat", type: "gym", createdAt: "2026-08-01T00:00:00.000Z" }], 1000);
  const { value } = await pullDomain(env, "exercises", exercisesSync);
  assert.deepEqual(value, [{ id: "ex1", name: "Squat", type: "gym", createdAt: "2026-08-01T00:00:00.000Z" }]);
});

test("a workout session with nested exercises and mixed gym/cardio sets round-trips exactly, in order", async () => {
  const session = {
    id: "sess1",
    date: "2026-08-20",
    startedAt: "2026-08-20T17:00:00.000Z",
    durationMinutes: 45,
    exercises: [
      {
        id: "sx1",
        exerciseId: "ex1",
        exerciseName: "Squat",
        exerciseType: "gym",
        sets: [
          { kind: "gym" as const, reps: 5, weight: 100, unit: "kg" },
          { kind: "gym" as const, reps: 5, weight: 105, unit: "kg" },
        ],
      },
      {
        id: "sx2",
        exerciseId: "ex2",
        exerciseName: "Row erg",
        exerciseType: "cardio",
        sets: [{ kind: "cardio" as const, distanceKm: 2, durationMinutes: 8 }],
      },
    ],
  };
  await pushDomain(env, "workoutSessions", workoutSessionsSync, [session], 1000);
  const { value } = await pullDomain(env, "workoutSessions", workoutSessionsSync);
  assert.deepEqual(value, [session]);
});

test("a session with no duration yet (in progress) round-trips null, not 0", async () => {
  const session = {
    id: "sess2",
    date: "2026-08-20",
    startedAt: "2026-08-20T18:00:00.000Z",
    durationMinutes: null,
    exercises: [],
  };
  await pushDomain(env, "workoutSessions", workoutSessionsSync, [session], 1000);
  const { value } = await pullDomain(env, "workoutSessions", workoutSessionsSync);
  assert.equal(value[0].durationMinutes, null);
});

test("re-pushing workout sessions is a full replace (never locally pruned)", async () => {
  await pushDomain(env, "workoutSessions", workoutSessionsSync, [{ id: "s1", date: "2026-08-19", startedAt: "x", durationMinutes: 30, exercises: [] }], 1000);
  await pushDomain(env, "workoutSessions", workoutSessionsSync, [{ id: "s2", date: "2026-08-20", startedAt: "y", durationMinutes: 40, exercises: [] }], 2000);
  const { value } = await pullDomain(env, "workoutSessions", workoutSessionsSync);
  assert.deepEqual(value.map((s) => s.id), ["s2"]);
});

test("vo2max entries round-trip, one per date", async () => {
  await pushDomain(env, "vo2maxEntries", vo2maxEntriesSync, [{ date: "2026-08-20", value: 48.5 }], 1000);
  const { value } = await pullDomain(env, "vo2maxEntries", vo2maxEntriesSync);
  assert.deepEqual(value, [{ date: "2026-08-20", value: 48.5 }]);
});

// --- Finance --------------------------------------------------------------

test("finance (5 tables under one domain) round-trips exactly, including the ordered category list", async () => {
  const finance = {
    assets: [{ id: "a1", label: "Savings account", amount: 10000 }],
    liabilities: [{ id: "l1", label: "Student loan", amount: 5000 }],
    expenses: [{ id: "e1", amount: 42.5, category: "Food", date: "2026-08-20", note: "Groceries" }],
    categories: ["Food", "Transport", "Housing"],
    savingsGoal: { label: "Emergency fund", target: 10000, current: 3000 },
  };
  await pushDomain(env, "finance", financeSync, finance, 1000);
  const { value } = await pullDomain(env, "finance", financeSync);
  assert.deepEqual(value, finance);
});

test("finance category order survives a round-trip even when pushed in a different order than alphabetical", async () => {
  const finance = {
    assets: [],
    liabilities: [],
    expenses: [],
    categories: ["Fun", "Other", "Food", "Health"],
    savingsGoal: { label: "Savings", target: 5000, current: 0 },
  };
  await pushDomain(env, "finance", financeSync, finance, 1000);
  const { value } = await pullDomain(env, "finance", financeSync);
  assert.deepEqual(value.categories, ["Fun", "Other", "Food", "Health"]);
});

// --- Motivation -----------------------------------------------------------

test("motivation items round-trip", async () => {
  await pushDomain(
    env,
    "motivationItems",
    motivationItemsSync,
    [{ id: "m1", imageBase64: "data:image/jpeg;base64,AAAA", caption: "Goal physique", createdAt: "2026-08-01T00:00:00.000Z" }],
    1000,
  );
  const { value } = await pullDomain(env, "motivationItems", motivationItemsSync);
  assert.deepEqual(value, [
    { id: "m1", imageBase64: "data:image/jpeg;base64,AAAA", caption: "Goal physique", createdAt: "2026-08-01T00:00:00.000Z" },
  ]);
});

test("a milestone-type goal round-trips with its ordered milestones", async () => {
  const goal = {
    id: "g1",
    title: "Run a marathon",
    icon: "run",
    type: "milestone" as const,
    milestones: [
      { id: "ms1", label: "5k", done: true },
      { id: "ms2", label: "10k", done: false },
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
  };
  await pushDomain(env, "goals", goalsSync, [goal], 1000);
  const { value } = await pullDomain(env, "goals", goalsSync);
  assert.deepEqual(value, [goal]);
});

test("a numeric-type goal round-trips without a milestones field at all", async () => {
  const goal = {
    id: "g2",
    title: "Save for a car",
    icon: "car",
    type: "numeric" as const,
    current: 2000,
    target: 15000,
    unit: "€",
    unitPosition: "prefix" as const,
    linkFinanceSavings: false,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
  await pushDomain(env, "goals", goalsSync, [goal], 1000);
  const { value } = await pullDomain(env, "goals", goalsSync);
  assert.deepEqual(value, [goal]);
  assert.ok(!("milestones" in value[0]), "a numeric goal must not gain an empty milestones array");
});

// --- Daily snapshot rollup --------------------------------------------

test("a daily snapshot round-trips, omitting fields that were never set (not a fabricated 0)", async () => {
  const snap = {
    date: "2026-08-20",
    readiness: 82,
    sleepScore: 88,
    hrv: 71,
    restingHr: 52,
    trainingLoad: 4.5,
  };
  await pushDomain(env, "dailySnapshots", dailySnapshotsSync, { "2026-08-20": snap }, 1000);
  const { value } = await pullDomain(env, "dailySnapshots", dailySnapshotsSync);
  assert.deepEqual(value, { "2026-08-20": snap });
  assert.ok(!("weightKg" in value["2026-08-20"]), "an unset field must be omitted, not 0/null");
});

test("re-pushing the snapshot store is a full replace, scoped to whatever the local (already-trimmed) store contains", async () => {
  await pushDomain(env, "dailySnapshots", dailySnapshotsSync, { "2026-08-19": { date: "2026-08-19", readiness: 70 } }, 1000);
  await pushDomain(env, "dailySnapshots", dailySnapshotsSync, { "2026-08-20": { date: "2026-08-20", readiness: 75 } }, 2000);
  const { value } = await pullDomain(env, "dailySnapshots", dailySnapshotsSync);
  assert.deepEqual(Object.keys(value), ["2026-08-20"]);
});

/**
 * Deterministic checks for the Journal sync registrations (journalSync.ts) —
 * per-month date reconstruction, day/entry round-tripping, and month
 * isolation — against the same local D1 binding sync.test.ts uses.
 *
 * Run with: node --test src/sync/journalSync.test.ts
 */

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPlatformProxy } from "wrangler";
import { pushDomain, pullDomain, type SyncEnv } from "../sync.ts";
import { journalMonthSync, homeFocusSync } from "./journalSync.ts";

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
  // Children before parents — journal_entries has a foreign key on journal_days(date).
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sync_meta"),
    env.DB.prepare("DELETE FROM journal_entries"),
    env.DB.prepare("DELETE FROM journal_days"),
    env.DB.prepare("DELETE FROM home_focus"),
  ]);
});

test("a day with an icon and entries round-trips, reconstructing real YYYY-MM-DD dates from year/monthIndex", async () => {
  const sync = journalMonthSync(2026, 7); // August (0-indexed), matching the frontend's own monthIndex convention
  const legDay = { id: "e1", text: "Leg day", time: "17:00", tag: "training", kind: "event" as const };
  const payRent = {
    id: "e2",
    text: "Pay rent",
    time: "09:00",
    tag: "finance",
    kind: "task" as const,
    done: false,
    important: true,
  };
  // Pushed out of time order deliberately — read() returns entries ordered
  // by time (the same key the app's own sortEntriesByTime uses for display),
  // not push order, so the expected value below is in that sorted order.
  const month = { 20: { icon: "gym", entries: [legDay, payRent] } };

  await pushDomain(env, "journal:2026-7", sync, month, 1000);

  const { results } = await env.DB.prepare("SELECT date FROM journal_days").all<{ date: string }>();
  assert.deepEqual(
    results.map((r) => r.date),
    ["2026-08-20"],
    "day 20 of monthIndex 7 (August) must become the real calendar date 2026-08-20",
  );

  const { value } = await pullDomain(env, "journal:2026-7", sync);
  assert.deepEqual(value, { 20: { icon: "gym", entries: [payRent, legDay] } });
});

test("an entry's absent optional fields (endTime, done, important) come back omitted, not null/false", async () => {
  const sync = journalMonthSync(2026, 0);
  const month = { 1: { entries: [{ id: "e1", text: "New Year run", time: "08:00", tag: "training" }] } };
  await pushDomain(env, "journal:2026-0", sync, month, 1000);
  const { value } = await pullDomain(env, "journal:2026-0", sync);
  assert.deepEqual(value, month);
});

test("pushing one month never touches another month's rows", async () => {
  const augSync = journalMonthSync(2026, 7);
  const sepSync = journalMonthSync(2026, 8);
  await pushDomain(env, "journal:2026-7", augSync, { 1: { entries: [{ id: "a1", text: "Aug entry", time: "10:00", tag: "x" }] } }, 1000);
  await pushDomain(env, "journal:2026-8", sepSync, { 1: { entries: [{ id: "s1", text: "Sep entry", time: "10:00", tag: "x" }] } }, 1000);

  // Re-push August with day 1 removed entirely — must not affect September.
  await pushDomain(env, "journal:2026-7", augSync, {}, 2000);

  const { value: aug } = await pullDomain(env, "journal:2026-7", augSync);
  const { value: sep } = await pullDomain(env, "journal:2026-8", sepSync);
  assert.deepEqual(aug, {});
  assert.deepEqual(sep, { 1: { entries: [{ id: "s1", text: "Sep entry", time: "10:00", tag: "x" }] } });
});

test("home focus (singleton) round-trips", async () => {
  await pushDomain(env, "homeFocus", homeFocusSync, { date: "2026-08-20", entryId: "e2" }, 1000);
  const { value } = await pullDomain(env, "homeFocus", homeFocusSync);
  assert.deepEqual(value, { date: "2026-08-20", entryId: "e2" });
});

/**
 * DomainSync registration for the daily snapshot rollup
 * (src/dailySnapshot.ts's DailySnapshot / SnapshotStore) — the
 * readiness/sleep-baseline history useReadiness.ts's rolling baselines
 * (restingHrBaseline 60d, bedtimeBaseline 30d, ACWR 28d) depend on.
 *
 * This is derived/computed data (recomputed daily by useDailySnapshot from
 * health + other now-synced local sources), not something the user directly
 * authors — but it's synced the same way as everything else rather than
 * left to rebuild per-device, because the alternative is real: a second
 * device would start every rolling baseline from zero and stay in the
 * "not enough history yet" neutral-score state for weeks. The local store's
 * own two-tier retention (full for 7 days, slimmed to just the
 * baseline-relevant fields up to 60 days — see pruneSnapshotStore in
 * dailySnapshot.ts) already IS the complete set of history worth keeping,
 * so — unlike meals/hydration/caffeine — a plain full replace scoped to
 * whatever's in the push is correct here: D1 isn't expected to hold MORE
 * than the local 60-day-trimmed store, just the same thing, elsewhere too.
 */

import { field, type DomainSync } from "../sync.ts";

interface SnapshotRow {
  date: string;
  readiness: number | null;
  sleep_score: number | null;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  bmi: number | null;
  lean_body_mass_kg: number | null;
  steps: number | null;
  active_kcal: number | null;
  hrv: number | null;
  resting_hr: number | null;
  caffeine_mg: number | null;
  hydration_litres: number | null;
  sleep_total_minutes: number | null;
  sleep_deep_minutes: number | null;
  sleep_rem_minutes: number | null;
  sleep_awake_minutes: number | null;
  bedtime_minutes: number | null;
  training_load: number | null;
}

export interface DailySnapshotValue {
  date: string;
  readiness?: number;
  sleepScore?: number;
  weightKg?: number;
  bodyFatPercentage?: number;
  bmi?: number;
  leanBodyMassKg?: number;
  steps?: number;
  activeKcal?: number;
  hrv?: number;
  restingHr?: number;
  caffeineMg?: number;
  hydrationLitres?: number;
  sleepTotalMinutes?: number;
  sleepDeepMinutes?: number;
  sleepRemMinutes?: number;
  sleepAwakeMinutes?: number;
  bedtimeMinutes?: number;
  trainingLoad?: number;
}

/** date -> snapshot, matching SnapshotStore exactly. */
export type SnapshotStoreValue = Record<string, DailySnapshotValue>;

export const dailySnapshotsSync: DomainSync<SnapshotStoreValue> = {
  empty: {},
  apply(db, store) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM daily_snapshots")];
    const now = Date.now();
    for (const snap of Object.values(store)) {
      stmts.push(
        db
          .prepare(
            "INSERT INTO daily_snapshots (date, readiness, sleep_score, weight_kg, body_fat_percentage, bmi, " +
              "lean_body_mass_kg, steps, active_kcal, hrv, resting_hr, caffeine_mg, hydration_litres, " +
              "sleep_total_minutes, sleep_deep_minutes, sleep_rem_minutes, sleep_awake_minutes, bedtime_minutes, " +
              "training_load, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            snap.date,
            snap.readiness ?? null,
            snap.sleepScore ?? null,
            snap.weightKg ?? null,
            snap.bodyFatPercentage ?? null,
            snap.bmi ?? null,
            snap.leanBodyMassKg ?? null,
            snap.steps ?? null,
            snap.activeKcal ?? null,
            snap.hrv ?? null,
            snap.restingHr ?? null,
            snap.caffeineMg ?? null,
            snap.hydrationLitres ?? null,
            snap.sleepTotalMinutes ?? null,
            snap.sleepDeepMinutes ?? null,
            snap.sleepRemMinutes ?? null,
            snap.sleepAwakeMinutes ?? null,
            snap.bedtimeMinutes ?? null,
            snap.trainingLoad ?? null,
            now,
          ),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM daily_snapshots ORDER BY date").all<SnapshotRow>();
    const store: SnapshotStoreValue = {};
    for (const r of results) {
      store[r.date] = {
        date: r.date,
        ...field("readiness", r.readiness),
        ...field("sleepScore", r.sleep_score),
        ...field("weightKg", r.weight_kg),
        ...field("bodyFatPercentage", r.body_fat_percentage),
        ...field("bmi", r.bmi),
        ...field("leanBodyMassKg", r.lean_body_mass_kg),
        ...field("steps", r.steps),
        ...field("activeKcal", r.active_kcal),
        ...field("hrv", r.hrv),
        ...field("restingHr", r.resting_hr),
        ...field("caffeineMg", r.caffeine_mg),
        ...field("hydrationLitres", r.hydration_litres),
        ...field("sleepTotalMinutes", r.sleep_total_minutes),
        ...field("sleepDeepMinutes", r.sleep_deep_minutes),
        ...field("sleepRemMinutes", r.sleep_rem_minutes),
        ...field("sleepAwakeMinutes", r.sleep_awake_minutes),
        ...field("bedtimeMinutes", r.bedtime_minutes),
        ...field("trainingLoad", r.training_load),
      };
    }
    return store;
  },
};

/** Registered under this exact name — must match the frontend's useSyncedStorage domain argument. */
export const SNAPSHOT_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  dailySnapshots: dailySnapshotsSync as DomainSync<unknown>,
};

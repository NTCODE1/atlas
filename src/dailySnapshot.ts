// --- Daily snapshots ---------------------------------------------------------
//
// One persisted record per day of the metrics the dashboard cares about, so
// history-based features (Trends, Correlations, mood history) have data to draw
// on, and so the readiness/sleep formulas (see useReadiness.ts) have a rolling
// personal baseline to compare today against. Written by useDailySnapshot.

import { sessionVolume, sessionCardioMinutes, type WorkoutSession } from './workouts'
import type { Workout } from './api/workoutMapper'

export interface DailySnapshot {
  /** YYYY-MM-DD */
  date: string
  /** Absent once a record has aged past RAW_RETENTION_DAYS and been slimmed down (see pruneSnapshotStore). */
  readiness?: number
  sleepScore?: number
  weightKg?: number
  bodyFatPercentage?: number
  bmi?: number
  leanBodyMassKg?: number
  steps?: number
  activeKcal?: number
  /** Raw live reading only — never a fallback-substituted value (needed for baselines). */
  hrv?: number
  /** Raw live reading only — never a fallback-substituted value (needed for baselines). */
  restingHr?: number
  caffeineMg?: number
  hydrationLitres?: number
  sleepTotalMinutes?: number
  sleepDeepMinutes?: number
  sleepRemMinutes?: number
  sleepAwakeMinutes?: number
  /** In-bed/sleep start time, normalized to minutes-from-noon (see `minutesFromNoon`). */
  bedtimeMinutes?: number
  /** Combined daily training load points — gym volume/100 + cardio minutes. */
  trainingLoad?: number
}

export type SnapshotStore = Record<string, DailySnapshot>

/** Drop `undefined` fields so a merge never clobbers a real value with a blank. */
function defined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

/**
 * Merge today's snapshot into the store (pure). Later writes in the same day
 * refine the record rather than replacing it, and only defined fields overwrite
 * — so a value captured earlier survives a later render where it's absent.
 */
export function upsertToday(store: SnapshotStore, snap: DailySnapshot): SnapshotStore {
  const existing = store[snap.date]
  return { ...store, [snap.date]: { ...existing, ...defined(snap) } }
}

/** Snapshots as an array, oldest first. */
export function snapshotList(store: SnapshotStore): DailySnapshot[] {
  return Object.values(store).sort((a, b) => a.date.localeCompare(b.date))
}

/** How long a full daily snapshot is kept before being slimmed down. */
export const RAW_RETENTION_DAYS = 7
/** Longest lookback any baseline needs (restingHrBaseline, below) — the outer cap for everything. */
export const BASELINE_RETENTION_DAYS = 60

/**
 * The only fields a record needs once it's past RAW_RETENTION_DAYS: restingHr/
 * bedtimeMinutes/trainingLoad feed the rolling baselines below (restingHrBaseline
 * 60d, bedtimeBaseline 30d, acwr 28d chronic); the body-comp fields feed
 * WeightSheet's "vs previous reading" delta chips, which would otherwise
 * silently stop working after a week without a fresh scale sync. HRV isn't
 * here — it's scored against a fixed personal range (see data.ts
 * rangeDeviationScore), not a rolling baseline, so no history is needed.
 */
const BASELINE_FIELDS = [
  'restingHr',
  'bedtimeMinutes',
  'trainingLoad',
  'weightKg',
  'bodyFatPercentage',
  'bmi',
  'leanBodyMassKg',
] as const

/**
 * Enforce the retention policy: records within RAW_RETENTION_DAYS are kept in
 * full; older records (up to BASELINE_RETENTION_DAYS) are slimmed to just the
 * fields the rolling baselines below actually consume; anything older than
 * that is dropped entirely. Pure — callers persist the result.
 */
export function pruneSnapshotStore(store: SnapshotStore, today: string): SnapshotStore {
  const rawCutoff = cutoffDateISO(today, RAW_RETENTION_DAYS)
  const baselineCutoff = cutoffDateISO(today, BASELINE_RETENTION_DAYS)
  const next: SnapshotStore = {}
  for (const [date, snap] of Object.entries(store)) {
    if (date >= rawCutoff) {
      next[date] = snap
      continue
    }
    if (date < baselineCutoff) continue
    const slim: DailySnapshot = { date }
    for (const field of BASELINE_FIELDS) {
      const v = snap[field]
      if (v != null) slim[field] = v
    }
    if (BASELINE_FIELDS.some((f) => slim[f] != null)) next[date] = slim
  }
  return next
}

/**
 * Normalize an "HH:MM" clock time to minutes-from-noon (noon=0, midnight=720,
 * 6am=1080), so evening/post-midnight bedtimes compare on one monotonic scale
 * without wrapping around the 24h boundary — bedtimes cluster far from noon,
 * where the scale wraps, so this stays well-behaved for realistic bedtimes.
 */
export function minutesFromNoon(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  const raw = h * 60 + m - 12 * 60
  return ((raw % 1440) + 1440) % 1440
}

/** YYYY-MM-DD `windowDays` before `today`. */
export function cutoffDateISO(today: string, windowDays: number): string {
  const cutoff = new Date(`${today}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - windowDays)
  return cutoff.toISOString().slice(0, 10)
}

/** Days strictly before `today`, most-recent-first, within the last `windowDays`. */
function recentDays(list: DailySnapshot[], today: string, windowDays: number): DailySnapshot[] {
  const cutoffIso = cutoffDateISO(today, windowDays)
  return list.filter((s) => s.date < today && s.date >= cutoffIso).sort((a, b) => b.date.localeCompare(a.date))
}

/** Mean of a numeric field over the last `windowDays` before `today`, or null if none present. */
export function rollingAverage(
  list: DailySnapshot[],
  field: keyof DailySnapshot,
  windowDays: number,
  today: string,
): number | null {
  const values = recentDays(list, today, windowDays)
    .map((s) => s[field])
    .filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Rolling resting-HR personal baseline (up to 60 days). Null if fewer than 5 real samples exist. */
export function restingHrBaseline(list: DailySnapshot[], today: string): number | null {
  const window = recentDays(list, today, 60)
  const rhrValues = window.map((s) => s.restingHr).filter((v): v is number => typeof v === 'number')
  return rhrValues.length >= 5 ? rhrValues.reduce((a, b) => a + b, 0) / rhrValues.length : null
}

/** Rolling personal-average bedtime (minutes-from-noon) over ~30 days. Null if too little history. */
export function bedtimeBaseline(list: DailySnapshot[], today: string): number | null {
  const window = recentDays(list, today, 30)
  const values = window.map((s) => s.bedtimeMinutes).filter((v): v is number => typeof v === 'number')
  if (values.length < 3) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Rolling average total sleep (minutes) over the last few nights. Null if fewer than 2 nights logged. */
export function sleepDebtAverage(
  list: DailySnapshot[],
  today: string,
  windowDays = 3,
): number | null {
  const window = recentDays(list, today, windowDays)
  const values = window.map((s) => s.sleepTotalMinutes).filter((v): v is number => typeof v === 'number')
  if (values.length < 2) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Acute:chronic training-load ratio (ACWR) — recent strain vs. long-term
 * capacity. Null (treat as neutral) when there isn't enough chronic history.
 */
export function acwr(
  list: DailySnapshot[],
  today: string,
  acuteDays = 3,
  chronicDays = 28,
): number | null {
  const acute = rollingAverage(list, 'trainingLoad', acuteDays, today)
  const chronic = rollingAverage(list, 'trainingLoad', chronicDays, today)
  if (acute === null || chronic === null || chronic === 0) return null
  return acute / chronic
}

/**
 * Combined daily training-load points for one date: gym session volume/100
 * (matches the Training tab's weekly-load bar scale) + cardio minutes (1
 * minute ≈ 1 point), from both watch-imported workouts and manually-logged
 * cardio sets — a coarse heuristic, not a precise unified load metric, but
 * sufficient to drive the ACWR activity-balance factor above.
 */
export function dailyTrainingLoad(
  sessions: WorkoutSession[],
  workouts: Workout[],
  date: string,
): number {
  const todaySessions = sessions.filter((s) => s.date === date)
  const gymLoad = todaySessions.reduce((sum, s) => sum + sessionVolume(s) / 100, 0)
  const manualCardioLoad = todaySessions.reduce((sum, s) => sum + sessionCardioMinutes(s), 0)
  const watchCardioLoad = workouts
    .filter((w) => w.date === date)
    .reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0)
  return gymLoad + manualCardioLoad + watchCardioLoad
}

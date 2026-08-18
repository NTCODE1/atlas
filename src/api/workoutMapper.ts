/**
 * Maps a raw Health Auto Export "Workouts + Routes" payload into internal
 * Workout entries for the Training tab. Distinct payload shape from the
 * `metrics` export handled by healthMapper.ts:
 *
 *   {
 *     "data": {
 *       "workouts": [
 *         { "name": "Running", "start": "2026-07-25 06:12:03 +0000",
 *           "end": "2026-07-25 06:52:11 +0000", "duration": 2408,
 *           "distance": { "qty": 8.05, "units": "km" },
 *           "avgHeartRate": { "qty": 148 }, "maxHeartRate": { "qty": 171 },
 *           "route": [ { "lat": ..., "lon": ..., "timestamp": ... }, ... ] },
 *         ...
 *       ]
 *     }
 *   }
 *
 * HAE's exact field names vary by version/source (COROS via Apple Health vs.
 * native workouts), so each field checks a couple of aliases and falls back
 * to null per-field rather than discarding the whole entry — same philosophy
 * as healthMapper.ts. A workout entry is skipped only if it has no usable
 * start timestamp, since that's needed to place it in the list.
 */

import { parseHaeDate, hhmmLocal } from './healthMapper'
import type { TrainingDay } from '../data'

export type WorkoutType = 'run' | 'bike' | 'swim' | 'hike' | 'strength' | 'other'

export interface Workout {
  id: string
  type: WorkoutType
  /** YYYY-MM-DD, local. */
  date: string
  /** Local "HH:MM", or null if unavailable. */
  startTime: string | null
  durationMinutes: number | null
  distanceKm: number | null
  paceMinPerKm: number | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  /** True when the payload included route/GPX coordinates (not mapped further here). */
  hasRoute: boolean
}

/** First present string value among the given keys, trimmed, or null. */
function firstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

/** A value that may be a bare number or an HAE `{ qty, units }` object. */
function numFromQty(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v && typeof v === 'object' && typeof (v as { qty?: unknown }).qty === 'number') {
    return (v as { qty: number }).qty
  }
  return null
}

/** First numeric (or `{qty}`) value among the given keys, or null. */
function firstQty(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = numFromQty(obj[key])
    if (n !== null) return n
  }
  return null
}

/** Classify an HAE workout name/type string into a coarse WorkoutType for icon lookup. */
function classifyType(name: string | null): WorkoutType {
  const s = (name ?? '').toLowerCase()
  if (/run/.test(s)) return 'run'
  if (/cycl|bike/.test(s)) return 'bike'
  if (/swim/.test(s)) return 'swim'
  if (/hik/.test(s)) return 'hike'
  if (/strength|weight|traditional|functional/.test(s)) return 'strength'
  return 'other'
}

function mapOneWorkout(raw: unknown): Workout | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const startRaw = firstString(r, ['start', 'startDate', 'startTime'])
  const start = startRaw ? parseHaeDate(startRaw) : null
  if (!start) return null

  const durationSeconds = firstQty(r, ['duration', 'elapsedTime'])
  const durationMinutes = durationSeconds === null ? null : Math.round(durationSeconds / 60)

  const distanceKm = firstQty(r, ['distance', 'totalDistance'])
  const paceMinPerKm =
    distanceKm && distanceKm > 0 && durationMinutes !== null ? durationMinutes / distanceKm : null

  return {
    id: `${start.toISOString()}`,
    type: classifyType(firstString(r, ['name', 'type', 'workoutActivityType'])),
    date: todayIsoLocal(start),
    startTime: hhmmLocal(start),
    durationMinutes,
    distanceKm,
    paceMinPerKm,
    avgHeartRate: firstQty(r, ['avgHeartRate', 'averageHeartRate']),
    maxHeartRate: firstQty(r, ['maxHeartRate']),
    hasRoute: Array.isArray(r.route) || Array.isArray(r.gpxRoute),
  }
}

/**
 * Maps a raw HAE "Workouts + Routes" export payload into internal Workout[].
 * Never throws. Strength-classified entries are dropped: gym training is
 * tracked manually in-app (see workouts.ts), so a strength session synced
 * from the watch (e.g. COROS) would otherwise duplicate/conflict with that
 * and skew the cardio-only weekly stats.
 */
export function mapWorkouts(payload: unknown): Workout[] {
  const workouts = (payload as { data?: { workouts?: unknown } } | null | undefined)?.data
    ?.workouts
  if (!Array.isArray(workouts)) return []
  return workouts
    .map((raw) => mapOneWorkout(raw))
    .filter((w): w is Workout => w !== null && w.type !== 'strength')
}

export interface WeeklyCardioStats {
  sessions: number
  distanceKm: number
  durationMinutes: number
}

const todayIsoLocal = (d = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Totals for this Mon–Sun week — the cardio counterpart to workouts.ts's weeklyVolume. */
export function weeklyCardioStats(workouts: Workout[], today = new Date()): WeeklyCardioStats {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const from = todayIsoLocal(monday)
  const to = todayIsoLocal(sunday)

  const inWeek = workouts.filter((w) => w.date >= from && w.date <= to)
  return {
    sessions: inWeek.length,
    distanceKm: inWeek.reduce((sum, w) => sum + (w.distanceKm ?? 0), 0),
    durationMinutes: inWeek.reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0),
  }
}

const CARDIO_DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * Mon–Sun distance (km) per day — the cardio counterpart to workouts.ts's
 * weeklyLoadDays, for the same LoadBarChart component. Unlike gym "load"
 * (an arbitrary au), distance is the standard unit for running volume, so the
 * bars plot real km directly.
 */
export function weeklyCardioDays(workouts: Workout[], today = new Date()): TrainingDay[] {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  const weekday = (monday.getDay() + 6) % 7 // Mon = 0
  monday.setDate(monday.getDate() - weekday)

  const distanceByDate = new Map<string, number>()
  for (const w of workouts) {
    distanceByDate.set(w.date, (distanceByDate.get(w.date) ?? 0) + (w.distanceKm ?? 0))
  }

  return CARDIO_DAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = todayIsoLocal(d)
    return {
      label,
      load: Math.round((distanceByDate.get(iso) ?? 0) * 10) / 10,
      isToday: i === weekday,
    }
  })
}

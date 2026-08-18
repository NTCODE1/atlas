import type { TrainingDay } from './data'
import type { WeightUnit } from './settings'

// --- Types -------------------------------------------------------------------

export type ExerciseType = 'gym' | 'cardio'

export interface Exercise {
  id: string
  name: string
  type: ExerciseType
  createdAt: string
}

export interface GymSetEntry {
  kind: 'gym'
  reps: number
  weight: number
  unit: WeightUnit
}

export interface CardioSetEntry {
  kind: 'cardio'
  distanceKm: number
  durationMinutes: number
}

export type SetEntry = GymSetEntry | CardioSetEntry

export interface SessionExercise {
  id: string
  exerciseId: string
  /** Name snapshot — history survives library renames/deletions. */
  exerciseName: string
  /** Type snapshot, same rationale as exerciseName. */
  exerciseType: ExerciseType
  sets: SetEntry[]
}

export interface WorkoutSession {
  id: string
  /** YYYY-MM-DD, derived from startedAt — kept for existing date-grouped queries. */
  date: string
  /** ISO datetime, set once when the session is started. */
  startedAt: string
  /** Manually entered total, in minutes. Null while the session is still in progress. */
  durationMinutes: number | null
  exercises: SessionExercise[]
}

export type ProgressMetric = 'top' | 'e1rm' | 'volume'
export type CardioProgressMetric = 'distance' | 'pace' | 'duration'

// --- Seed --------------------------------------------------------------------

/** No preset exercises — the user builds their own library as they log. */
export const EXERCISE_SEED: Exercise[] = []

// --- Migration -----------------------------------------------------------------
//
// Exercises/sessions/sets logged before gym-vs-cardio support existed are
// missing `type`/`exerciseType`/`kind`/`startedAt`/`durationMinutes` in
// localStorage. Rendering those fields as if they were always present throws
// (e.g. an undefined icon-by-type lookup crashes the whole tree with no error
// boundary), so every read normalizes to the current shape instead.

/** Pre-existing exercises were always gym (cardio didn't exist yet). */
export function normalizeExercise(raw: Exercise): Exercise {
  return raw.type ? raw : { ...raw, type: 'gym' }
}

function normalizeSet(raw: SetEntry): SetEntry {
  const r = raw as Partial<GymSetEntry>
  return r.kind ? raw : ({ kind: 'gym', ...r } as GymSetEntry)
}

function normalizeSessionExercise(raw: SessionExercise): SessionExercise {
  return {
    ...raw,
    exerciseType: raw.exerciseType ?? 'gym',
    sets: (raw.sets ?? []).map(normalizeSet),
  }
}

/**
 * Pre-existing sessions have no startedAt/durationMinutes. `durationMinutes`
 * defaults to 0 (a known, saved value) rather than null (in progress) — null
 * would make every old session look like it's still active and hijack
 * "resume the in-progress session" on the Log tab.
 */
export function normalizeSession(raw: WorkoutSession): WorkoutSession {
  return {
    ...raw,
    startedAt: raw.startedAt ?? `${raw.date}T12:00:00`,
    durationMinutes: raw.durationMinutes ?? 0,
    exercises: (raw.exercises ?? []).map(normalizeSessionExercise),
  }
}

// --- Math --------------------------------------------------------------------

const KG_PER_LB = 0.45359237

export const toKg = (set: GymSetEntry): number =>
  set.unit === 'kg' ? set.weight : set.weight * KG_PER_LB

/** Epley estimated one-rep max, in the set's own weight terms. */
export const estimate1RM = (weight: number, reps: number): number =>
  reps <= 1 ? weight : weight * (1 + reps / 30)

const gymSets = (sets: SetEntry[]): GymSetEntry[] =>
  sets.filter((s): s is GymSetEntry => s.kind === 'gym')

const cardioSets = (sets: SetEntry[]): CardioSetEntry[] =>
  sets.filter((s): s is CardioSetEntry => s.kind === 'cardio')

/** Total session volume: Σ reps × weight, normalized to kg (gym sets only). */
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + gymSets(ex.sets).reduce((s, set) => s + set.reps * toKg(set), 0),
    0,
  )
}

export function topSetWeightKg(sets: SetEntry[]): number {
  return gymSets(sets).reduce((best, set) => Math.max(best, toKg(set)), 0)
}

function bestE1rmKg(sets: SetEntry[]): number {
  return gymSets(sets).reduce((best, set) => Math.max(best, estimate1RM(toKg(set), set.reps)), 0)
}

function exerciseVolumeKg(sets: SetEntry[]): number {
  return gymSets(sets).reduce((s, set) => s + set.reps * toKg(set), 0)
}

/** Σ distance/duration across an exercise's cardio sets. */
export function cardioTotals(ex: SessionExercise): { distanceKm: number; durationMinutes: number } {
  return cardioSets(ex.sets).reduce(
    (t, set) => ({
      distanceKm: t.distanceKm + set.distanceKm,
      durationMinutes: t.durationMinutes + set.durationMinutes,
    }),
    { distanceKm: 0, durationMinutes: 0 },
  )
}

/** Total manually-logged cardio minutes across every exercise in a session. */
export function sessionCardioMinutes(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + cardioTotals(ex).durationMinutes, 0)
}

// --- Per-exercise history index -----------------------------------------------

export interface ExerciseHistoryEntry {
  sessionId: string
  date: string
  startedAt: string
  sets: SetEntry[]
}

export type ExerciseIndex = Map<string, ExerciseHistoryEntry[]>

/**
 * One pass over all sessions, grouping by exerciseId — oldest first per
 * exercise. Progress queries (exerciseSeries/cardioExerciseSeries) read off
 * this instead of rescanning the full session list on every call.
 */
export function buildExerciseIndex(sessions: WorkoutSession[]): ExerciseIndex {
  const sorted = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const index: ExerciseIndex = new Map()
  for (const session of sorted) {
    for (const ex of session.exercises) {
      if (ex.sets.length === 0) continue
      const entries = index.get(ex.exerciseId) ?? []
      entries.push({ sessionId: session.id, date: session.date, startedAt: session.startedAt, sets: ex.sets })
      index.set(ex.exerciseId, entries)
    }
  }
  return index
}

/**
 * Per-exercise time series across sessions (kg), oldest first — one point per
 * session that contains the exercise with at least one non-empty gym set.
 */
export function exerciseSeries(
  index: ExerciseIndex,
  exerciseId: string,
  metric: ProgressMetric,
): { t: string; v: number }[] {
  const entries = index.get(exerciseId) ?? []
  return entries.flatMap((entry) => {
    const validSets = gymSets(entry.sets).filter((s) => s.reps > 0 && s.weight > 0)
    if (validSets.length === 0) return []
    const v =
      metric === 'top'
        ? topSetWeightKg(validSets)
        : metric === 'e1rm'
          ? bestE1rmKg(validSets)
          : exerciseVolumeKg(validSets)
    return [{ t: entry.date, v: Math.round(v * 10) / 10 }]
  })
}

/** Per-exercise cardio time series across sessions, oldest first. */
export function cardioExerciseSeries(
  index: ExerciseIndex,
  exerciseId: string,
  metric: CardioProgressMetric,
): { t: string; v: number }[] {
  const entries = index.get(exerciseId) ?? []
  return entries.flatMap((entry) => {
    const sets = cardioSets(entry.sets).filter((s) => s.distanceKm > 0 || s.durationMinutes > 0)
    if (sets.length === 0) return []
    const totalDistance = sets.reduce((s, set) => s + set.distanceKm, 0)
    const totalDuration = sets.reduce((s, set) => s + set.durationMinutes, 0)
    const v =
      metric === 'distance'
        ? totalDistance
        : metric === 'duration'
          ? totalDuration
          : totalDistance > 0
            ? totalDuration / totalDistance
            : 0
    if (metric === 'pace' && totalDistance === 0) return []
    return [{ t: entry.date, v: Math.round(v * 100) / 100 }]
  })
}

// --- Weekly load -------------------------------------------------------------

export const todayISO = (d = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * Mon–Sun of the current week from real logged sessions; load = volume / 100
 * (arbitrary units) so the numbers stay in the same ballpark as before.
 * Multiple sessions on the same date are summed together.
 */
export function weeklyLoadDays(sessions: WorkoutSession[], today = new Date()): TrainingDay[] {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  const weekday = (monday.getDay() + 6) % 7 // Mon = 0
  monday.setDate(monday.getDate() - weekday)

  const volumeByDate = new Map<string, number>()
  for (const session of sessions) {
    volumeByDate.set(session.date, (volumeByDate.get(session.date) ?? 0) + sessionVolume(session))
  }

  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = todayISO(d)
    return {
      label,
      load: Math.round((volumeByDate.get(iso) ?? 0) / 100),
      isToday: i === weekday,
    }
  })
}

const LB_PER_KG = 1 / KG_PER_LB

/**
 * Total volume lifted this week (Mon–Sun) — Σ reps × weight across sessions —
 * returned in the requested unit. This is the concrete number behind the
 * weekly-load hero (kg or lb of total work), rather than an abstract "au".
 */
export function weeklyVolume(
  sessions: WorkoutSession[],
  unit: WeightUnit,
  today = new Date(),
): number {
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const from = todayISO(monday)
  const to = todayISO(sunday)

  const totalKg = sessions
    .filter((s) => s.date >= from && s.date <= to)
    .reduce((sum, s) => sum + sessionVolume(s), 0)

  return unit === 'kg' ? totalKg : totalKg * LB_PER_KG
}

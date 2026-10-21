// --- Activity sessions: skiing, trampoline, cardio ---------------------------
//
// Hand-logged sport sessions that aren't gym sets. What matters for these is
// how long and how hard — session RPE × minutes ("sRPE" load), the standard
// way coaches track on-snow and acrobatic training — plus a note on what you
// worked on. Gym stays in workouts.ts (sets/reps/volume). Pure module;
// persisted by hooks/useActivities.ts, synced as the "activitySessions" domain
// (atlas-api/src/sync/trainingSync.ts, migrations/0004).

export type ActivityKind = 'ski' | 'trampoline' | 'cardio'

export interface ActivitySession {
  id: string
  /** YYYY-MM-DD, local. */
  date: string
  kind: ActivityKind
  /** What the session was about — one of ACTIVITY_META[kind].focuses, or free text. */
  focus?: string | null
  /** Local "HH:MM" the session started, if known. */
  startTime?: string | null
  durationMinutes: number
  /** Session RPE, 1 (very easy) – 10 (max effort). */
  rpe?: number | null
  /** Ski only: runs / park laps. */
  runs?: number | null
  /** Cardio only. */
  distanceKm?: number | null
  /** Tricks landed, what to work on next time, how the body felt. */
  notes?: string | null
  /** ISO timestamp. */
  createdAt: string
}

export const ACTIVITY_META: Record<ActivityKind, { label: string; focuses: string[]; notesHint: string }> = {
  ski: {
    label: 'Skiing',
    focuses: ['Slopestyle', 'Big air', 'Halfpipe', 'Park laps', 'Rails', 'Freeride', 'Technique', 'Competition'],
    notesHint: 'Tricks landed, what to work on, conditions',
  },
  trampoline: {
    label: 'Trampoline',
    focuses: ['New tricks', 'Consistency', 'Air awareness', 'Grabs', 'Comp runs'],
    notesHint: 'Tricks worked on, what clicked',
  },
  cardio: {
    label: 'Cardio',
    focuses: ['Run', 'Bike', 'Bike intervals', 'Swim', 'Row', 'Other'],
    notesHint: 'Intervals, how it felt',
  },
}

/** What each RPE value means — shown under the picker so ratings stay consistent. */
export const RPE_LABEL: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Easy',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Somewhat hard',
  7: 'Hard',
  8: 'Very hard',
  9: 'Near max',
  10: 'Max effort',
}

/** Session load in arbitrary units: minutes × RPE (sRPE). Missing RPE counts as 5. */
export const activityLoad = (a: ActivitySession): number => a.durationMinutes * (a.rpe ?? 5)

export const newActivityId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** Minutes → "2h 15m" / "45 min". */
export function formatActivityMinutes(minutes: number): string {
  const m = Math.round(minutes)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m} min`
}

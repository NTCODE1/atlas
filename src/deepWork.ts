// --- Deep work timer ---------------------------------------------------------
//
// Tap-to-toggle timer for focused work blocks. Unlike the fasting timer (one
// continuous window), deep work happens in bursts through the day, so each
// Start→Stop is its own session and the day's total is their sum. Pure module
// (no React), persisted by useDeepWork.

export interface DeepWorkSession {
  id: string
  /** YYYY-MM-DD the session was logged on (its stop time's local date). */
  date: string
  /** Session length in minutes. */
  minutes: number
}

export interface DeepWorkState {
  active: boolean
  /** Epoch ms the current session began, or null when not running. */
  startMs: number | null
  /** Completed sessions, oldest first. */
  sessions: DeepWorkSession[]
}

export const DEFAULT_DEEP_WORK: DeepWorkState = { active: false, startMs: null, sessions: [] }

/** Default daily goal (minutes) until the user sets their own in Settings. */
export const DEFAULT_DEEP_WORK_GOAL_MINUTES = 240

const MS_PER_MIN = 60_000

/** Minutes elapsed in the currently running session (0 when inactive). */
export function activeMinutes(state: DeepWorkState, now = Date.now()): number {
  if (!state.active || state.startMs == null) return 0
  return Math.max(0, (now - state.startMs) / MS_PER_MIN)
}

/** Total minutes logged for `date`, including the live running session if any. */
export function totalMinutesFor(state: DeepWorkState, date: string, now = Date.now()): number {
  const logged = state.sessions
    .filter((s) => s.date === date)
    .reduce((sum, s) => sum + s.minutes, 0)
  return logged + activeMinutes(state, now)
}

/** Progress toward the daily goal, 0–1 (capped at 1). */
export function deepWorkProgress(minutes: number, goalMinutes: number): number {
  if (goalMinutes <= 0) return 0
  return Math.min(1, minutes / goalMinutes)
}

/** Minutes → "3h 15m" (or "45m" under an hour, "0m" at zero). */
export function formatDeepWorkMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
